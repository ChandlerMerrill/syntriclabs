import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { dispatchApprovedSends, stuckSends } from '@/lib/marketing/send/dispatch'

export const maxDuration = 300

/**
 * Sends what a human already approved. Nothing else.
 *
 * This job cannot approve, cannot generate, and cannot reach a row that a
 * person has not signed off on — it selects on `status = 'approved'`, which the
 * schema will not let a row hold without `approved_by` and `approved_at`.
 * Running it more often changes throughput, never authority.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await dispatchApprovedSends()

    // Surfaced, not repaired. A row stuck in `sending` may already have gone
    // out — Gmail's sent folder is the only thing that knows, so requeueing it
    // automatically risks a duplicate for a stranger.
    const supabase = await createServiceClient()
    const stuck = await stuckSends(supabase)

    return NextResponse.json({
      ok: true,
      ...result,
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
