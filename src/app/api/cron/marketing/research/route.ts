import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { loadDefaultBrandProfile } from '@/lib/marketing/config/brand-profile'
import { listSegments } from '@/lib/marketing/services'
import { createResearchRun, processResearchRun } from '@/lib/marketing/research/run'
import { autopilotBlock } from '@/lib/marketing/autopilot'

export const maxDuration = 300

/**
 * Scheduled research. One run per segment, sequentially — parallel Firecrawl
 * crawls across segments burn the rate limit for no wall-clock gain at this
 * volume.
 *
 * The most expensive job in the loop: a Firecrawl search-and-scrape per query,
 * then one extraction call per readable source, then one clustering call — all
 * of it multiplied by the segment count. Off by default under autopilot for
 * exactly that reason.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blocked = autopilotBlock('research')
  if (blocked) return NextResponse.json({ ok: true, skipped: blocked })

  const profile = await loadDefaultBrandProfile()
  if (!profile) {
    return NextResponse.json({ ok: true, skipped: 'no default brand profile' })
  }

  const supabase = await createServiceClient()
  const segments = await listSegments(supabase, profile.id)
  if (segments.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no segments' })
  }

  const results: Record<string, unknown>[] = []
  for (const segment of segments) {
    try {
      const runId = await createResearchRun({
        brandProfileId: profile.id,
        segmentId: segment.id,
        trigger: 'cron',
      })
      const result = await processResearchRun(runId)
      results.push({ segment: segment.slug, runId, result })
    } catch (err) {
      results.push({
        segment: segment.slug,
        error: err instanceof Error ? err.message : 'run failed',
      })
    }
  }

  return NextResponse.json({ ok: true, results })
}
