import { createServiceClient } from '@/lib/supabase/server'
import { embedInBackground } from '@/lib/ai/embeddings'
import { loadBrandProfile } from '../config/brand-profile'
import { getSegment } from '../services'
import { fetchSegmentSources, FirecrawlNotConfiguredError } from './sources'
import { extractPainPoints, type PainPointCandidate } from './extract'
import { clusterAndRank } from './rank'
import { recentOutsideSources } from './entropy'

/**
 * The research worker.
 *
 * Shape borrowed from `fireflies/process-transcript.ts`: mark processing, do
 * the work, write results, and on failure record the error on the row rather
 * than losing it. A run that dies leaves `failed` plus `processing_error`, not
 * a row stuck in `processing` with no explanation.
 */

/** How many extraction calls to run at once. */
const EXTRACT_CONCURRENCY = 4

export interface ResearchRunResult {
  runId: string
  sources: number
  outsideSources: number
  candidates: number
  painPoints: number
}

export async function createResearchRun(params: {
  brandProfileId: string
  segmentId: string
  trigger?: 'manual' | 'cron'
}): Promise<string> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('marketing_research_runs')
    .insert({
      brand_profile_id: params.brandProfileId,
      segment_id: params.segmentId,
      trigger: params.trigger ?? 'manual',
      status: 'pending',
    })
    .select('id')
    .single()
  if (error || !data) {
    throw new Error(`Failed to create research run: ${error?.message ?? 'no row returned'}`)
  }
  return data.id as string
}

export async function processResearchRun(runId: string): Promise<ResearchRunResult | null> {
  const supabase = await createServiceClient()

  // Claim the run. The `.eq('status', 'pending')` makes this a compare-and-set:
  // a second worker that picks up the same run gets zero rows and returns.
  const { data: claimed } = await supabase
    .from('marketing_research_runs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('status', 'pending')
    .select('id, brand_profile_id, segment_id')
    .maybeSingle()

  if (!claimed) return null

  const segmentId = claimed.segment_id as string | null
  const brandProfileId = claimed.brand_profile_id as string

  try {
    const profile = await loadBrandProfile(supabase, { id: brandProfileId })
    if (!profile) throw new Error(`Brand profile ${brandProfileId} not found`)
    if (!segmentId) throw new Error('Research run has no segment')

    const segment = await getSegment(supabase, segmentId)
    if (!segment) throw new Error(`Segment ${segmentId} not found`)

    // 1. Fetch. Sources land first so a later failure still leaves the run's
    //    raw material on disk to debug against.
    const fetched = await fetchSegmentSources(segment.name)

    const { data: insertedSources, error: sourceError } = await supabase
      .from('marketing_sources')
      .insert(
        fetched.map((s) => ({
          research_run_id: runId,
          segment_id: segmentId,
          kind: s.kind,
          url: s.url,
          title: s.title,
          content: s.content,
          signal_rank: s.signalRank,
          is_outside_injection: false,
          fetch_error: s.fetchError,
        }))
      )
      .select('id, url, kind, content, signal_rank')
    if (sourceError) throw new Error(`Failed to store sources: ${sourceError.message}`)

    // 2. Pull in outside-injected material so this pass reads something it did
    //    not produce. See entropy.ts.
    const outside = await recentOutsideSources(supabase, segmentId)

    const readable = [
      ...(insertedSources ?? []).filter((s) => s.content),
      ...outside.filter((s) => s.content),
    ]

    // 3. Extract, in bounded batches.
    const candidates: PainPointCandidate[] = []
    for (let i = 0; i < readable.length; i += EXTRACT_CONCURRENCY) {
      const batch = readable.slice(i, i + EXTRACT_CONCURRENCY)
      const settled = await Promise.allSettled(
        batch.map((s) =>
          extractPainPoints({
            segmentName: segment.name,
            profile,
            sourceId: s.id as string,
            sourceKind: s.kind as string,
            sourceUrl: (s.url as string | null) ?? null,
            signalRank: (s.signal_rank as number) ?? 4,
            content: s.content as string,
          })
        )
      )
      for (const result of settled) {
        if (result.status === 'fulfilled') candidates.push(...result.value)
        else console.error('[marketing:research] extraction failed:', result.reason)
      }
    }

    // 4. Cluster and rank by frequency across distinct sources.
    const ranked = await clusterAndRank(candidates)

    if (ranked.length > 0) {
      const { data: insertedPoints, error: pointError } = await supabase
        .from('marketing_pain_points')
        .insert(
          ranked.map((p) => ({
            research_run_id: runId,
            segment_id: segmentId,
            statement: p.statement,
            frequency: p.frequency,
            rank: p.rank,
            score: p.score,
            evidence: p.evidence,
            icp_fear: p.icpFear,
          }))
        )
        .select('id, statement')
      if (pointError) throw new Error(`Failed to store pain points: ${pointError.message}`)

      for (const point of insertedPoints ?? []) {
        embedInBackground(
          'marketing_pain_point',
          point.id as string,
          `${segment.name} pain point: ${point.statement as string}`
        )
      }
    }

    const outsideCount = outside.length

    await supabase
      .from('marketing_research_runs')
      .update({
        status: 'completed',
        processing_error: null,
        source_count: (insertedSources ?? []).length,
        outside_source_count: outsideCount,
        pain_point_count: ranked.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

    return {
      runId,
      sources: (insertedSources ?? []).length,
      outsideSources: outsideCount,
      candidates: candidates.length,
      painPoints: ranked.length,
    }
  } catch (err) {
    const message =
      err instanceof FirecrawlNotConfiguredError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Research run failed'

    await supabase
      .from('marketing_research_runs')
      .update({
        status: 'failed',
        processing_error: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

    console.error(`[marketing:research] run ${runId} failed:`, err)
    return null
  }
}
