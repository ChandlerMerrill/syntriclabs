import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import {
  deleteCampaignStep,
  dueFollowUps,
  listCampaignSteps,
  upsertCampaignStep,
} from '@/lib/marketing/send/sequence'

/**
 * The sequence definition for one campaign.
 *
 * GET also returns the current scan — what is due and what is being held — so
 * the page showing the steps can also say why nothing has fired, which is the
 * question a sequence actually prompts.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const campaignId = new URL(req.url).searchParams.get('campaignId')
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  try {
    const steps = await listCampaignSteps(supabase, campaignId)
    const scan = await dueFollowUps(supabase, campaignId)
    return NextResponse.json({ steps, due: scan.due.length, held: scan.held })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load steps' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: { campaignId?: string; stepNo?: number; delayDays?: number; variantId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.campaignId || !body.variantId) {
    return NextResponse.json({ error: 'campaignId and variantId are required' }, { status: 400 })
  }
  if (!Number.isInteger(body.stepNo) || (body.stepNo as number) < 1) {
    return NextResponse.json({ error: 'stepNo must be an integer >= 1' }, { status: 400 })
  }
  const delayDays = body.delayDays ?? 3
  if (!Number.isInteger(delayDays) || delayDays < 0 || delayDays > 365) {
    return NextResponse.json({ error: 'delayDays must be 0–365' }, { status: 400 })
  }

  try {
    const step = await upsertCampaignStep(supabase, {
      campaignId: body.campaignId,
      stepNo: body.stepNo as number,
      delayDays,
      variantId: body.variantId,
    })
    return NextResponse.json({ step }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save step' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaignId')
  const stepNo = Number(url.searchParams.get('stepNo'))
  if (!campaignId || !Number.isInteger(stepNo)) {
    return NextResponse.json({ error: 'campaignId and stepNo are required' }, { status: 400 })
  }

  try {
    await deleteCampaignStep(supabase, campaignId, stepNo)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete step' },
      { status: 500 }
    )
  }
}
