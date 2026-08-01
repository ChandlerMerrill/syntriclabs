import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { createCampaign, listCampaigns } from '@/lib/marketing/services'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined

  try {
    const campaigns = await listCampaigns(supabase, { status })
    return NextResponse.json({ campaigns })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: {
    name?: string
    segmentId?: string | null
    channel?: string
    goal?: string | null
    brandProfileId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const channel = body.channel ?? 'email'
  if (!['email', 'linkedin', 'meta_ads'].includes(channel)) {
    return NextResponse.json({ error: `Unsupported channel: ${channel}` }, { status: 400 })
  }

  try {
    const profile = await loadBrandProfile(supabase, { id: body.brandProfileId })
    if (!profile) {
      return NextResponse.json(
        { error: 'No brand profile. Seed one from /admin/marketing first.' },
        { status: 400 }
      )
    }

    const campaign = await createCampaign(supabase, {
      brand_profile_id: profile.id,
      segment_id: body.segmentId ?? null,
      name,
      channel,
      goal: body.goal?.trim() || null,
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
