import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { listProspects, upsertProspect } from '@/lib/marketing/services'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const segmentId = url.searchParams.get('segmentId') ?? undefined
  const search = url.searchParams.get('search') ?? undefined
  const qualifiedParam = url.searchParams.get('qualified')
  const qualified =
    qualifiedParam === 'true' ? true : qualifiedParam === 'false' ? false : undefined

  try {
    const prospects = await listProspects(supabase, { segmentId, search, qualified })
    return NextResponse.json({ prospects })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load prospects' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: {
    company?: string
    contactName?: string | null
    email?: string | null
    linkedinUrl?: string | null
    website?: string | null
    location?: string | null
    notes?: string | null
    segmentId?: string | null
    qualified?: boolean | null
    qualificationReason?: string | null
    /** Set to suppress; clear to un-suppress. */
    suppress?: boolean
    suppressionReason?: string | null
    id?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.company?.trim()) {
    return NextResponse.json({ error: 'company is required' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: `Not an email address: ${email}` }, { status: 400 })
  }

  // Suppression is only touched when the caller says something about it.
  // `upsertProspect` matches an existing row by email and `update`s the whole
  // payload, so unconditional keys here mean re-adding a suppressed prospect
  // through the Add form — which never sends `suppress` — silently un-suppresses
  // someone who asked not to be contacted. Omitted keys leave the columns alone.
  const suppression =
    body.suppress === undefined
      ? {}
      : {
          suppressed_at: body.suppress ? new Date().toISOString() : null,
          suppression_reason: body.suppress
            ? body.suppressionReason?.trim() || 'Suppressed'
            : null,
        }

  try {
    const prospect = await upsertProspect(supabase, {
      ...(body.id ? { id: body.id } : {}),
      company: body.company.trim(),
      contact_name: body.contactName?.trim() || null,
      email,
      linkedin_url: body.linkedinUrl?.trim() || null,
      website: body.website?.trim() || null,
      location: body.location?.trim() || null,
      notes: body.notes?.trim() || null,
      segment_id: body.segmentId ?? null,
      qualified: body.qualified ?? null,
      qualification_reason: body.qualificationReason?.trim() || null,
      ...suppression,
    })
    return NextResponse.json({ prospect }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save prospect' },
      { status: 500 }
    )
  }
}
