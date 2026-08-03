import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { dispatchApprovedSends, stuckSends } from '@/lib/marketing/send/dispatch'
import { queueFollowUps } from '@/lib/marketing/send/sequence'

export const maxDuration = 300

/**
 * Sends what a human already approved. Nothing else.
 *
 * This job cannot approve, cannot generate, and cannot reach a row that a
 * person has not signed off on — it selects on `status = 'approved'`, which the
 * schema will not let a row hold without `approved_by` and `approved_at`.
 * Running it more often changes throughput, never authority.
 *
 * It also scans for follow-ups that have come due and *drafts* them. That is
 * the one thing it creates, and it creates them at `pending_approval` like
 * everything else — a sequence with no scheduled scan is a sequence that never
 * fires, and a scan that could approve its own output would be the thing this
 * whole design refuses.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    // Drafted before dispatch so a step that comes due today can be approved
    // and go out on the same schedule, rather than waiting a full cycle.
    const followUps: Record<string, unknown>[] = []
    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('id, name')
      .eq('status', 'active')

    for (const campaign of (campaigns ?? []) as { id: string; name: string }[]) {
      try {
        const queued = await queueFollowUps(supabase, campaign.id)
        if (queued.queued > 0 || queued.skipped.length > 0) {
          followUps.push({ campaign: campaign.name, ...queued })
        }
      } catch (err) {
        followUps.push({
          campaign: campaign.name,
          error: err instanceof Error ? err.message : 'Follow-up scan failed',
        })
      }
    }

    const result = await dispatchApprovedSends()

    // Surfaced, not repaired. A row stuck in `sending` may already have gone
    // out — Gmail's sent folder is the only thing that knows, so requeueing it
    // automatically risks a duplicate for a stranger.
    const stuck = await stuckSends(supabase)

    return NextResponse.json({
      ok: true,
      ...result,
      followUps,
      stuck: stuck.map((s) => ({ id: s.id, claimedAt: s.claimed_at })),
    })
  } catch (err) {
    console.error('[marketing:send] dispatch failed:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Dispatch failed' },
      { status: 500 }
    )
  }
}
