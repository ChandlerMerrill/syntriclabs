import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { assertVariantSendable } from '@/lib/marketing/review/gate'

/**
 * The approval gate. The only place `pending_approval → approved` happens.
 *
 * `approved_by` is the authenticated user id and `approved_at` is now — both
 * written here, together, by a request that a human made. No job sets them, and
 * the schema CHECK refuses any row that reaches `approved` without them, so a
 * future code path that forgets cannot quietly become the exception.
 *
 * The transition is a compare-and-set on `pending_approval` so double-clicking
 * approve cannot re-approve something already sent, and so approval cannot
 * resurrect a cancelled row.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase, userId } = auth

  let body: { sendIds?: string[]; action?: 'approve' | 'cancel' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sendIds = body.sendIds ?? []
  if (sendIds.length === 0) {
    return NextResponse.json({ error: 'sendIds is required' }, { status: 400 })
  }

  const action = body.action ?? 'approve'

  try {
    const approved: string[] = []
    const rejected: { sendId: string; reason: string }[] = []

    for (const sendId of sendIds) {
      const { data: send, error: loadError } = await supabase
        .from('marketing_sends')
        .select('id, status, variant_id, rendered_subject, rendered_body')
        .eq('id', sendId)
        .maybeSingle()

      if (loadError || !send) {
        rejected.push({ sendId, reason: loadError?.message ?? 'Send not found' })
        continue
      }

      if (action === 'cancel') {
        const { data: cancelled } = await supabase
          .from('marketing_sends')
          .update({ status: 'cancelled' })
          .eq('id', sendId)
          .in('status', ['pending_approval', 'approved'])
          .select('id')
          .maybeSingle()

        if (cancelled) approved.push(sendId)
        else rejected.push({ sendId, reason: `Cannot cancel from status ${send.status}` })
        continue
      }

      if (!send.rendered_subject || !send.rendered_body) {
        rejected.push({ sendId, reason: 'Send has no rendered body' })
        continue
      }

      // Re-check at approval time. A variant can be retired, or fail a re-run
      // of the checks, between drafting and someone getting to the queue.
      const sendable = await assertVariantSendable(supabase, send.variant_id as string)
      if (!sendable.ok) {
        rejected.push({ sendId, reason: sendable.reason })
        continue
      }

      const { data: updated, error: updateError } = await supabase
        .from('marketing_sends')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', sendId)
        .eq('status', 'pending_approval')
        .select('id')
        .maybeSingle()

      if (updateError) {
        rejected.push({ sendId, reason: updateError.message })
      } else if (!updated) {
        rejected.push({ sendId, reason: `Not pending approval (status: ${send.status})` })
      } else {
        approved.push(sendId)
      }
    }

    return NextResponse.json({ action, updated: approved.length, approved, rejected })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to approve sends' },
      { status: 500 }
    )
  }
}
