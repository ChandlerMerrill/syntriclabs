import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { embedInBackground } from '@/lib/ai/embeddings'
import { loadBrandProfile } from '../config/brand-profile'
import { getSegment } from '../services'
import { fetchSegmentSources, FirecrawlNotConfiguredError, type FetchedSource } from './sources'
import { extractPainPoints, type PainPointCandidate } from './extract'
import { assessRelevance } from './relevance'
import { clusterAndRank, type RankedPainPoint } from './rank'
import { recentOutsideSources } from './entropy'

/**
 * The research worker.
 *
 * Shape borrowed from `fireflies/process-transcript.ts`: mark processing, do
 * the work, write results, and on failure record the error on the row rather
 * than losing it. A run that dies leaves `failed` plus `processing_error`, not
 * a row stuck in `processing` with no explanation.
 *
 * The storage steps are exported separately from `processResearchRun` because
 * `scripts/db/research-manual.ts` runs the same pipeline with the two model
 * calls supplied by hand. Splitting them means the manual path writes through
 * this code rather than a second copy of it that can drift — the same reason
 * `generate-variants-manual.ts` calls the real gate.
 */

/** How many extraction calls to run at once. */
const EXTRACT_CONCURRENCY = 4

export interface ResearchRunResult {
  runId: string
  sources: number
  outsideSources: number
  /** Fetched successfully, then judged off-segment and not extracted from. */
  skippedSources: number
  candidates: number
  painPoints: number
}

/** A stored source with enough on it to decide whether to read it. */
export interface StoredSource {
  id: string
  url: string | null
  kind: string
  content: string | null
  signal_rank: number
  relevance_skip_reason: string | null
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

/**
 * Claims a pending run. The `.eq('status', 'pending')` makes this a
 * compare-and-set: a second worker that picks up the same run gets zero rows.
 */
export async function claimResearchRun(
  supabase: SupabaseClient,
  runId: string
): Promise<{ brandProfileId: string; segmentId: string | null } | null> {
  const { data } = await supabase
    .from('marketing_research_runs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('status', 'pending')
    .select('id, brand_profile_id, segment_id')
    .maybeSingle()

  if (!data) return null
  return {
    brandProfileId: data.brand_profile_id as string,
    segmentId: data.segment_id as string | null,
  }
}

/**
 * Writes fetched sources, judging each for segment relevance on the way in.
 *
 * Relevance is decided here rather than at read time so the reason is stored
 * beside the content it was judged against, instead of being recomputed later
 * from a rule that may since have changed.
 */
export async function storeFetchedSources(
  supabase: SupabaseClient,
  params: {
    runId: string
    segmentId: string
    segmentName: string
    fetched: FetchedSource[]
  }
): Promise<StoredSource[]> {
  if (params.fetched.length === 0) return []

  const { data, error } = await supabase
    .from('marketing_sources')
    .insert(
      params.fetched.map((s) => ({
        research_run_id: params.runId,
        segment_id: params.segmentId,
        kind: s.kind,
        url: s.url,
        title: s.title,
        content: s.content,
        signal_rank: s.signalRank,
        is_outside_injection: false,
        fetch_error: s.fetchError,
        relevance_skip_reason: assessRelevance({
          segmentName: params.segmentName,
          content: s.content,
        }).reason,
      }))
    )
    .select('id, url, kind, content, signal_rank, relevance_skip_reason')

  if (error) throw new Error(`Failed to store sources: ${error.message}`)
  return (data ?? []) as StoredSource[]
}

/**
 * What a run should actually read: its own on-segment sources, plus recent
 * outside-injected material.
 *
 * Outside material is exempt from the relevance check by design — entropy
 * fetches adjacent-industry messaging on purpose, so screening it for segment
 * terms would reject precisely what it exists to inject.
 */
export async function readableSources(
  supabase: SupabaseClient,
  params: { stored: StoredSource[]; segmentId: string }
): Promise<{ readable: StoredSource[]; outsideCount: number; skippedCount: number }> {
  const outside = await recentOutsideSources(supabase, params.segmentId)

  const own = params.stored.filter((s) => s.content && !s.relevance_skip_reason)
  const skippedCount = params.stored.filter((s) => s.relevance_skip_reason).length

  // Not selected from the outside rows and not merely defaulted — never judged.
  const injected: StoredSource[] = outside
    .filter((s) => s.content)
    .map((s) => ({
      id: s.id as string,
      url: (s.url as string | null) ?? null,
      kind: s.kind as string,
      content: s.content as string,
      signal_rank: (s.signal_rank as number) ?? 4,
      relevance_skip_reason: null,
    }))

  return {
    readable: [...own, ...injected],
    outsideCount: outside.length,
    skippedCount,
  }
}

/** Stores ranked pain points and queues each for embedding. */
export async function storeRankedPainPoints(
  supabase: SupabaseClient,
  params: {
    runId: string
    segmentId: string
    segmentName: string
    ranked: RankedPainPoint[]
  }
): Promise<number> {
  if (params.ranked.length === 0) return 0

  const { data, error } = await supabase
    .from('marketing_pain_points')
    .insert(
      params.ranked.map((p) => ({
        research_run_id: params.runId,
        segment_id: params.segmentId,
        statement: p.statement,
        frequency: p.frequency,
        rank: p.rank,
        score: p.score,
        evidence: p.evidence,
        icp_fear: p.icpFear,
      }))
    )
    .select('id, statement')

  if (error) throw new Error(`Failed to store pain points: ${error.message}`)

  for (const point of data ?? []) {
    embedInBackground(
      'marketing_pain_point',
      point.id as string,
      `${params.segmentName} pain point: ${point.statement as string}`
    )
  }

  return (data ?? []).length
}

export async function completeResearchRun(
  supabase: SupabaseClient,
  runId: string,
  counts: {
    sourceCount: number
    outsideSourceCount: number
    skippedSourceCount: number
    painPointCount: number
  }
): Promise<void> {
  await supabase
    .from('marketing_research_runs')
    .update({
      status: 'completed',
      processing_error: null,
      source_count: counts.sourceCount,
      outside_source_count: counts.outsideSourceCount,
      skipped_source_count: counts.skippedSourceCount,
      pain_point_count: counts.painPointCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

export async function failResearchRun(
  supabase: SupabaseClient,
  runId: string,
  message: string
): Promise<void> {
  await supabase
    .from('marketing_research_runs')
    .update({
      status: 'failed',
      processing_error: message,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

export async function processResearchRun(runId: string): Promise<ResearchRunResult | null> {
  const supabase = await createServiceClient()

  const claimed = await claimResearchRun(supabase, runId)
  if (!claimed) return null

  const { segmentId, brandProfileId } = claimed

  try {
    const profile = await loadBrandProfile(supabase, { id: brandProfileId })
    if (!profile) throw new Error(`Brand profile ${brandProfileId} not found`)
    if (!segmentId) throw new Error('Research run has no segment')

    const segment = await getSegment(supabase, segmentId)
    if (!segment) throw new Error(`Segment ${segmentId} not found`)

    // 1. Fetch. Sources land first so a later failure still leaves the run's
    //    raw material on disk to debug against.
    const fetched = await fetchSegmentSources(segment.name)
    const stored = await storeFetchedSources(supabase, {
      runId,
      segmentId,
      segmentName: segment.name,
      fetched,
    })

    // 2. Decide what to read. See entropy.ts for why outside material is exempt.
    const { readable, outsideCount, skippedCount } = await readableSources(supabase, {
      stored,
      segmentId,
    })

    // 3. Extract, in bounded batches.
    const candidates: PainPointCandidate[] = []
    for (let i = 0; i < readable.length; i += EXTRACT_CONCURRENCY) {
      const batch = readable.slice(i, i + EXTRACT_CONCURRENCY)
      const settled = await Promise.allSettled(
        batch.map((s) =>
          extractPainPoints({
            segmentName: segment.name,
            profile,
            sourceId: s.id,
            sourceKind: s.kind,
            sourceUrl: s.url,
            signalRank: s.signal_rank ?? 4,
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

    const painPointCount = await storeRankedPainPoints(supabase, {
      runId,
      segmentId,
      segmentName: segment.name,
      ranked,
    })

    await completeResearchRun(supabase, runId, {
      sourceCount: stored.length,
      outsideSourceCount: outsideCount,
      skippedSourceCount: skippedCount,
      painPointCount,
    })

    return {
      runId,
      sources: stored.length,
      outsideSources: outsideCount,
      skippedSources: skippedCount,
      candidates: candidates.length,
      painPoints: painPointCount,
    }
  } catch (err) {
    const message =
      err instanceof FirecrawlNotConfiguredError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Research run failed'

    await failResearchRun(supabase, runId, message)
    console.error(`[marketing:research] run ${runId} failed:`, err)
    return null
  }
}
