import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchEntropySources } from './sources'

/**
 * The entropy constraint.
 *
 * A generate-and-learn loop that only reads its own past output converges on
 * its own voice, and the decline is invisible from inside — the outputs keep
 * looking fine to the thing producing them. The fix is to inject material the
 * loop did not produce, on a schedule, and to make that a measured floor rather
 * than an intention.
 *
 * This is a standing engineering principle, not a marketing detail: it applies
 * to any Syntric agent with a generate-then-evaluate step.
 */

/** A run should read at least this share of outside-injected material. */
export const ENTROPY_FLOOR = 0.25

/** How stale outside material may be before it stops counting. */
const FRESHNESS_DAYS = 30

export interface EntropyStatus {
  segmentId: string
  freshOutsideSources: number
  totalRecentSources: number
  ratio: number
  meetsFloor: boolean
}

export async function getEntropyStatus(
  supabase: SupabaseClient,
  segmentId: string
): Promise<EntropyStatus> {
  const since = new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: outside }, { count: total }] = await Promise.all([
    supabase
      .from('marketing_sources')
      .select('id', { count: 'exact', head: true })
      .eq('segment_id', segmentId)
      .eq('is_outside_injection', true)
      .gte('fetched_at', since),
    supabase
      .from('marketing_sources')
      .select('id', { count: 'exact', head: true })
      .eq('segment_id', segmentId)
      .gte('fetched_at', since),
  ])

  const freshOutsideSources = outside ?? 0
  const totalRecentSources = total ?? 0
  const ratio = totalRecentSources > 0 ? freshOutsideSources / totalRecentSources : 0

  return {
    segmentId,
    freshOutsideSources,
    totalRecentSources,
    ratio,
    // A segment with no sources at all trivially fails — it has nothing to
    // converge on yet, but it also hasn't been fed, and reporting that as
    // healthy would hide the more common problem.
    meetsFloor: totalRecentSources > 0 && ratio >= ENTROPY_FLOOR,
  }
}

/**
 * Fetches outside material for a segment and stores it unattached to any run.
 * The next research pass reads it alongside its own sources.
 */
export async function injectEntropy(
  supabase: SupabaseClient,
  segment: { id: string; name: string },
  opts?: { resultsPerQuery?: number }
): Promise<{ inserted: number; failed: number }> {
  const fetched = await fetchEntropySources(segment.name, {
    resultsPerQuery: opts?.resultsPerQuery,
  })

  if (fetched.length === 0) return { inserted: 0, failed: 0 }

  const rows = fetched.map((s) => ({
    research_run_id: null,
    segment_id: segment.id,
    kind: s.kind,
    url: s.url,
    title: s.title,
    content: s.content,
    signal_rank: s.signalRank,
    is_outside_injection: true,
    fetch_error: s.fetchError,
  }))

  const { error } = await supabase.from('marketing_sources').insert(rows)
  if (error) throw new Error(`Failed to store entropy sources: ${error.message}`)

  return {
    inserted: rows.filter((r) => !r.fetch_error).length,
    failed: rows.filter((r) => r.fetch_error).length,
  }
}

/**
 * Recent outside material for a segment, to be read alongside a run's own
 * sources. Capped — the point is to perturb the loop, not to drown it.
 */
export async function recentOutsideSources(
  supabase: SupabaseClient,
  segmentId: string,
  limit = 6
) {
  const since = new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('marketing_sources')
    .select('id, kind, url, title, content, signal_rank')
    .eq('segment_id', segmentId)
    .eq('is_outside_injection', true)
    .is('fetch_error', null)
    .not('content', 'is', null)
    .gte('fetched_at', since)
    .order('fetched_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Failed to load outside sources: ${error.message}`)
  return data ?? []
}
