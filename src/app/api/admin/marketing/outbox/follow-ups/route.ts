import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { queueFollowUps } from '@/lib/marketing/send/sequence'

export const maxDuration = 300

/**
 * Queues every follow-up that has come due, as drafts.
 *
 * Same authority as the opener path next door: it creates `pending_approval`
 * rows and nothing else. The cron calls the same function on a schedule, so
 * this exists for running the scan on demand rather than waiting for it.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: { campaignId?: string; template?: string; limit?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  try {
    const result = await queueFollowUps(supabase, body.campaignId, {
      template: body.template,
      limit: body.limit,
    })
    return NextResponse.json(result, { status: result.queued > 0 ? 201 : 200 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue follow-ups' },
      { status: 400 }
    )
  }
}
