import Firecrawl from '@mendable/firecrawl-js'
import type { SourceKind } from '../types'

/**
 * Source acquisition for the research loop.
 *
 * Sources are ordered by signal quality, and the order is load-bearing —
 * `signalRank` becomes the weight in `rank.ts`. Operators complaining to each
 * other beats a trade association describing the industry as it wishes to be
 * seen, and the ranking has to encode that rather than treating every mention
 * as equal.
 */

export interface SourceStrategy {
  kind: SourceKind
  /** 1 = highest signal. Used directly as a ranking weight. */
  signalRank: 1 | 2 | 3 | 4
  label: string
  /** Search queries for a segment. `{segment}` is substituted. */
  queries: string[]
  /** Domains worth biasing toward. Empty = open web. */
  includeDomains?: string[]
}

export const SOURCE_STRATEGIES: SourceStrategy[] = [
  {
    kind: 'forum',
    signalRank: 1,
    label: 'Operator forums and subreddits',
    // People complaining to each other, not to a vendor.
    queries: [
      '{segment} owners complaining about admin work forum',
      '{segment} operators reddit "biggest headache"',
      '{segment} business owners "waste of time" paperwork discussion',
    ],
    includeDomains: ['reddit.com'],
  },
  {
    kind: 'review',
    signalRank: 2,
    label: 'Two- and three-star software reviews',
    // Where the specific failure gets named. Five-star reviews say nothing.
    queries: [
      '{segment} software 2 star review "does not"',
      '{segment} management software 3 star review problems',
      'best {segment} software alternatives complaints',
    ],
    includeDomains: ['g2.com', 'capterra.com', 'trustpilot.com', 'getapp.com'],
  },
  {
    kind: 'job_posting',
    signalRank: 3,
    label: 'Job postings in the segment',
    // What they're hiring humans to do by hand is a bottleneck with a salary
    // attached — the most under-read signal of the four.
    queries: [
      '{segment} operations coordinator job description manual data entry',
      '{segment} administrative assistant hiring scheduling bookings',
    ],
  },
  {
    kind: 'press',
    signalRank: 4,
    label: 'Trade association material and industry press',
    // Lowest signal. It describes the industry as it wishes to be seen.
    queries: [
      '{segment} industry association operational challenges report',
      '{segment} industry trends {year} operations',
    ],
  },
]

/**
 * Adjacent material the loop did not produce. Fetched on a schedule and
 * flagged `is_outside_injection`, because a generate-and-learn loop that only
 * reads its own past output converges on its own voice and the decline is
 * invisible from inside.
 */
export const ENTROPY_STRATEGIES: SourceStrategy[] = [
  {
    kind: 'competitor',
    signalRank: 3,
    label: 'Competitor and adjacent-industry messaging',
    queries: [
      '{segment} software homepage copy value proposition',
      'automation consultancy for {segment} pitch',
    ],
  },
  {
    kind: 'press',
    signalRank: 4,
    label: 'Current segment press',
    queries: ['{segment} news {year}'],
  },
]

export interface FetchedSource {
  kind: SourceKind
  signalRank: number
  url: string
  title: string | null
  content: string | null
  isOutsideInjection: boolean
  fetchError: string | null
}

export class FirecrawlNotConfiguredError extends Error {
  constructor() {
    super('FIRECRAWL_API_KEY is not set. The research loop cannot fetch sources without it.')
    this.name = 'FirecrawlNotConfiguredError'
  }
}

function client(): Firecrawl {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new FirecrawlNotConfiguredError()
  return new Firecrawl({ apiKey })
}

function expandQuery(template: string, segment: string): string {
  return template
    .replaceAll('{segment}', segment)
    .replaceAll('{year}', String(new Date().getUTCFullYear()))
}

/** Trims scraped markdown to something an extraction call can afford to read. */
const MAX_CONTENT_CHARS = 20000

/**
 * Runs one strategy against one segment.
 *
 * Failures are captured on the source row rather than thrown. A dead URL is a
 * fact about the run — swallowing it silently means the run reports fewer
 * sources than it tried with no way to tell why.
 */
async function runStrategy(
  fc: Firecrawl,
  strategy: SourceStrategy,
  segmentName: string,
  opts: { resultsPerQuery: number; isOutsideInjection: boolean }
): Promise<FetchedSource[]> {
  const out: FetchedSource[] = []
  const seen = new Set<string>()

  for (const template of strategy.queries) {
    const query = expandQuery(template, segmentName)

    let urls: { url: string; title: string | null }[] = []
    try {
      const results = await fc.search(query, {
        limit: opts.resultsPerQuery,
        sources: ['web'],
        ...(strategy.includeDomains?.length ? { includeDomains: strategy.includeDomains } : {}),
      })
      // `search` returns SearchResultWeb | Document depending on whether
      // scrapeOptions were requested. Narrow structurally rather than by type
      // — either shape can carry the url, in a different place.
      urls = (results.web ?? [])
        .map((r) => {
          const asWeb = r as { url?: string; title?: string }
          const asDoc = r as { metadata?: { sourceURL?: string; title?: string } }
          const url = asWeb.url ?? asDoc.metadata?.sourceURL ?? null
          const title = asWeb.title ?? asDoc.metadata?.title ?? null
          return url ? { url, title } : null
        })
        .filter((r): r is { url: string; title: string | null } => r !== null)
    } catch (err) {
      out.push({
        kind: strategy.kind,
        signalRank: strategy.signalRank,
        url: `search:${query}`,
        title: null,
        content: null,
        isOutsideInjection: opts.isOutsideInjection,
        fetchError: err instanceof Error ? err.message : 'search failed',
      })
      continue
    }

    for (const { url, title } of urls) {
      if (seen.has(url)) continue
      seen.add(url)

      try {
        const doc = await fc.scrape(url, { formats: ['markdown'] })
        const markdown = doc.markdown?.trim() ?? ''
        out.push({
          kind: strategy.kind,
          signalRank: strategy.signalRank,
          url,
          title: title ?? doc.metadata?.title ?? null,
          content: markdown ? markdown.slice(0, MAX_CONTENT_CHARS) : null,
          isOutsideInjection: opts.isOutsideInjection,
          fetchError: markdown ? null : 'scrape returned no markdown',
        })
      } catch (err) {
        out.push({
          kind: strategy.kind,
          signalRank: strategy.signalRank,
          url,
          title,
          content: null,
          isOutsideInjection: opts.isOutsideInjection,
          fetchError: err instanceof Error ? err.message : 'scrape failed',
        })
      }
    }
  }

  return out
}

export async function fetchSegmentSources(
  segmentName: string,
  opts?: { resultsPerQuery?: number; strategies?: SourceStrategy[] }
): Promise<FetchedSource[]> {
  const fc = client()
  const strategies = opts?.strategies ?? SOURCE_STRATEGIES
  const resultsPerQuery = opts?.resultsPerQuery ?? 3

  const results: FetchedSource[] = []
  for (const strategy of strategies) {
    results.push(
      ...(await runStrategy(fc, strategy, segmentName, {
        resultsPerQuery,
        isOutsideInjection: false,
      }))
    )
  }
  return results
}

export async function fetchEntropySources(
  segmentName: string,
  opts?: { resultsPerQuery?: number }
): Promise<FetchedSource[]> {
  const fc = client()
  const results: FetchedSource[] = []
  for (const strategy of ENTROPY_STRATEGIES) {
    results.push(
      ...(await runStrategy(fc, strategy, segmentName, {
        resultsPerQuery: opts?.resultsPerQuery ?? 2,
        isOutsideInjection: true,
      }))
    )
  }
  return results
}

/**
 * Verifies a URL resolves. Used by the brand QA gate — a proof link that 404s
 * in a cold email is worse than no proof link.
 */
export async function urlResolves(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal })
    // Plenty of hosts reject HEAD outright; a 405 is not a dead link.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal })
    }
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
