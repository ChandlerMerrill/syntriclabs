import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { getCampaign, getVariant, listProspects, listSends } from '@/lib/marketing/services'
import { assertVariantSendable } from '@/lib/marketing/review/gate'
import { renderSend } from '@/lib/marketing/send/render'
import { prospectSendGate } from '@/lib/marketing/send/throttle'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const campaignId = url.searchParams.get('campaignId') ?? undefined

  try {
    const sends = await listSends(supabase, { status, campaignId })
    return NextResponse.json({ sends })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load outbox' },
      { status: 500 }
    )
  }
}

/**
 * Drafts sends. Never approves them.
 *
 * Rows are created at `pending_approval` and rendered here rather than at send
 * time, so what a human reads in the outbox is exactly the bytes that go out —
 * editing the variant afterwards cannot change an approved send.
 *
 * A prospect that fails the gate is reported back rather than silently
 * dropped: "queued 4 of 9" with no explanation is how a suppression list
 * quietly stops working.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: { variantId?: string; prospectIds?: string[]; segmentId?: string; limit?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.variantId) {
    return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
  }

  try {
    const variant = await getVariant(supabase, body.variantId)
    if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })

    // A variant that failed the brand checks may not be queued for a human at
    // all — an approver should be reading things that are actually sendable.
    const sendable = await assertVariantSendable(supabase, variant.id)
    if (!sendable.ok) {
      return NextResponse.json({ error: sendable.reason }, { status: 400 })
    }

    const campaign = await getCampaign(supabase, variant.campaign_id)
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const profile = await loadBrandProfile(supabase, { id: campaign.brand_profile_id })
    if (!profile) return NextResponse.json({ error: 'Brand profile not found' }, { status: 400 })

    // Explicit prospect list, or everyone qualified in the segment.
    let prospects
    if (body.prospectIds?.length) {
      const all = await listProspects(supabase, { limit: 1000 })
      const wanted = new Set(body.prospectIds)
      prospects = all.filter((p) => wanted.has(p.id))
    } else {
      prospects = await listProspects(supabase, {
        segmentId: body.segmentId ?? campaign.segment_id ?? undefined,
        qualified: true,
        limit: body.limit ?? 25,
      })
    }

    if (prospects.length === 0) {
      return NextResponse.json({ error: 'No prospects matched' }, { status: 400 })
    }

    const queued: string[] = []
    const skipped: { prospect: string; reason: string }[] = []

    for (const prospect of prospects) {
      const gate = await prospectSendGate(supabase, prospect.id)
      if (!gate.ok) {
        skipped.push({ prospect: prospect.company, reason: gate.reason ?? 'Blocked' })
        continue
      }

      const rendered = renderSend(variant, prospect, profile)
      if (rendered.missing.length > 0) {
        skipped.push({
          prospect: prospect.company,
          reason: `Missing ${rendered.missing.map((m) => `{{${m}}}`).join(', ')}`,
        })
        continue
      }

      const { error: insertError } = await supabase.from('marketing_sends').insert({
        campaign_id: campaign.id,
        variant_id: variant.id,
        prospect_id: prospect.id,
        channel: campaign.channel,
        status: 'pending_approval',
        rendered_subject: rendered.subject,
        rendered_body: rendered.body,
      })

      if (insertError) {
        // The unique (campaign, prospect, variant) is doing its job.
        const duplicate = insertError.code === '23505'
        skipped.push({
          prospect: prospect.company,
          reason: duplicate ? 'Already queued or sent for this variant' : insertError.message,
        })
        continue
      }

      queued.push(prospect.company)
    }

    return NextResponse.json(
      { queued: queued.length, skipped, companies: queued },
      { status: queued.length > 0 ? 201 : 200 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue sends' },
      { status: 500 }
    )
  }
}
