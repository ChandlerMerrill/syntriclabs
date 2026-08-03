import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { loadDefaultBrandProfile } from '@/lib/marketing/config/brand-profile'
import { listSegments } from '@/lib/marketing/services'
import { getEntropyStatus, injectEntropy, ENTROPY_FLOOR } from '@/lib/marketing/research/entropy'
import { autopilotBlock } from '@/lib/marketing/autopilot'

export const maxDuration = 300

/**
 * The entropy cron.
 *
 * Runs more often than the research cron and always tops up, whether or not
 * the floor is currently met — the failure this guards against is gradual, and
 * a loop that only injects outside material once it has already converged has
 * injected it too late.
 *
 * No model calls here — this is Firecrawl only. It is still gated, because it
 * still spends, and a switch that covers the model bill but not the crawl bill
 * would be the wrong shape of promise.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blocked = autopilotBlock('entropy')
  if (blocked) return NextResponse.json({ ok: true, skipped: blocked })

  const profile = await loadDefaultBrandProfile()
  if (!profile) {
    return NextResponse.json({ ok: true, skipped: 'no default brand profile' })
  }

  const supabase = await createServiceClient()
  const segments = await listSegments(supabase, profile.id)

  const results: Record<string, unknown>[] = []
  for (const segment of segments) {
    try {
      const before = await getEntropyStatus(supabase, segment.id)
      const injected = await injectEntropy(supabase, { id: segment.id, name: segment.name })
      const after = await getEntropyStatus(supabase, segment.id)
      results.push({
        segment: segment.slug,
        injected,
        ratioBefore: Number(before.ratio.toFixed(3)),
        ratioAfter: Number(after.ratio.toFixed(3)),
        floor: ENTROPY_FLOOR,
        meetsFloor: after.meetsFloor,
      })
    } catch (err) {
      results.push({
        segment: segment.slug,
        error: err instanceof Error ? err.message : 'entropy injection failed',
      })
    }
  }

  return NextResponse.json({ ok: true, results })
}
