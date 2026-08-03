import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { qualifyProspects } from '@/lib/marketing/prospects/qualify'

export const maxDuration = 300

/**
 * Runs the segment's qualifiers over its unreviewed prospects.
 *
 * A model call, so it is a button rather than a side effect of import. Nothing
 * here can make a prospect sendable on its own either — `qualified: true` only
 * makes a row *eligible* to be queued, and the queue still goes to
 * `pending_approval` in front of a person.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: { segmentId?: string; prospectIds?: string[]; limit?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.segmentId) {
    return NextResponse.json({ error: 'segmentId is required' }, { status: 400 })
  }

  try {
    const result = await qualifyProspects(supabase, {
      segmentId: body.segmentId,
      prospectIds: body.prospectIds,
      limit: body.limit,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Qualification failed' },
      { status: 500 }
    )
  }
}
