/**
 * A research run with the two model calls supplied by hand.
 *
 * Same path as `processResearchRun`, minus `generateObject`: sources are fetched
 * by the real fetcher, judged by the real relevance filter, stored by the real
 * insert, ranked by the real ranking maths, and the run is completed by the real
 * completer. Only the extraction and the clustering come from files.
 *
 * That is the point — a full research pass costs one Opus call per readable
 * source plus one for clustering, and a segment run returns fifteen-odd sources.
 * Running it by hand exercises the fetch, the relevance filter, the storage
 * contract, the frequency maths and the evidence rule for the price of the
 * Firecrawl fetch alone. Runs done this way are marked `extraction_transport =
 * 'manual'` so a pain point's provenance stays legible.
 *
 * Four steps, in order:
 *
 *   tsx --env-file=.env.local scripts/db/research-manual.ts sources \
 *     --segment <id> [--from-file sources.json]
 *
 *   tsx --env-file=.env.local scripts/db/research-manual.ts prompt \
 *     --run <id> --out <dir>
 *
 *   tsx --env-file=.env.local scripts/db/research-manual.ts cluster \
 *     --run <id> --candidates candidates.json --out cluster.txt
 *
 *   tsx --env-file=.env.local scripts/db/research-manual.ts store \
 *     --run <id> --candidates candidates.json --clusters clusters.json
 *
 * `--from-file` re-uses an already-fetched source set instead of spending the
 * fetch again; the file is a `FetchedSource[]` exactly as `fetchSegmentSources`
 * returns it. Nothing else about the run changes.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServiceClient } from '@/lib/supabase/server'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { getSegment } from '@/lib/marketing/services'
import { fetchSegmentSources, type FetchedSource } from '@/lib/marketing/research/sources'
import { segmentTerms } from '@/lib/marketing/research/relevance'
import { buildExtractionPrompt } from '@/lib/marketing/research/extract'
import type { PainPointCandidate } from '@/lib/marketing/research/extract'
import {
  buildClusterPrompt,
  rankClusters,
  CLUSTER_SYSTEM_PROMPT,
  type CandidateCluster,
} from '@/lib/marketing/research/rank'
import {
  claimResearchRun,
  completeResearchRun,
  createResearchRun,
  readableSources,
  storeFetchedSources,
  storeRankedPainPoints,
  type StoredSource,
} from '@/lib/marketing/research/run'

const EXTRACTION_SYSTEM_PROMPT =
  'You extract operational pain points from source material for a B2B research loop. ' +
  'You are strict about evidence: a claim without a verbatim quote from the source is not a finding.'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

function required(name: string): string {
  const v = arg(name)
  if (!v) throw new Error(`--${name} is required`)
  return v
}

function hostOf(url: string | null): string {
  if (!url) return 'unknown'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.slice(0, 40)
  }
}

async function loadRunContext(runId: string) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('marketing_research_runs')
    .select('id, brand_profile_id, segment_id, status')
    .eq('id', runId)
    .single()
  if (error || !data) throw new Error(`Run ${runId} not found: ${error?.message ?? 'no row'}`)

  const segmentId = data.segment_id as string | null
  if (!segmentId) throw new Error('Run has no segment')

  const segment = await getSegment(supabase, segmentId)
  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const profile = await loadBrandProfile(supabase, { id: data.brand_profile_id as string })
  if (!profile) throw new Error('Brand profile not found')

  return { supabase, runId, segmentId, segment, profile, status: data.status as string }
}

/** Step 1 — fetch, judge, store. */
async function cmdSources() {
  const segmentId = required('segment')
  const fromFile = arg('from-file')

  const supabase = await createServiceClient()
  const segment = await getSegment(supabase, segmentId)
  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const { data: profileRow } = await supabase
    .from('marketing_brand_profiles')
    .select('id')
    .limit(1)
    .single()
  if (!profileRow) throw new Error('No brand profile on file')

  const runId = await createResearchRun({
    brandProfileId: profileRow.id as string,
    segmentId,
    trigger: 'manual',
  })

  const claimed = await claimResearchRun(supabase, runId)
  if (!claimed) throw new Error('Could not claim the run just created')

  await supabase
    .from('marketing_research_runs')
    .update({ extraction_transport: 'manual' })
    .eq('id', runId)

  const fetched: FetchedSource[] = fromFile
    ? (JSON.parse(readFileSync(fromFile, 'utf8')) as FetchedSource[])
    : await fetchSegmentSources(segment.name)

  console.log(`\nsegment "${segment.name}" — relevance terms ${JSON.stringify(segmentTerms(segment.name))}`)
  console.log(`${fetched.length} sources ${fromFile ? `from ${fromFile}` : 'fetched'}\n`)

  const stored = await storeFetchedSources(supabase, {
    runId,
    segmentId,
    segmentName: segment.name,
    fetched,
  })

  for (const s of stored) {
    const mark = s.relevance_skip_reason ? 'SKIP' : s.content ? 'read' : 'dead'
    console.log(`  ${mark}  r${s.signal_rank}  ${hostOf(s.url)}`)
    if (s.relevance_skip_reason) console.log(`        ${s.relevance_skip_reason}`)
  }

  const { readable, outsideCount, skippedCount } = await readableSources(supabase, {
    stored,
    segmentId,
  })

  console.log(
    `\nrun ${runId}\n  ${stored.length} stored, ${skippedCount} off-segment, ` +
      `${outsideCount} outside injected, ${readable.length} to read`
  )
  console.log(`\nnext: research-manual.ts prompt --run ${runId} --out <dir>`)
}

/** Step 2 — print the real extraction prompt for each readable source. */
async function cmdPrompt() {
  const runId = required('run')
  const outDir = required('out')
  const { supabase, segmentId, segment, profile } = await loadRunContext(runId)

  const { data: rows, error } = await supabase
    .from('marketing_sources')
    .select('id, url, kind, content, signal_rank, relevance_skip_reason')
    .eq('research_run_id', runId)
    .order('signal_rank', { ascending: true })
  if (error) throw new Error(error.message)

  const stored = (rows ?? []) as {
    id: string
    url: string | null
    kind: string
    content: string | null
    signal_rank: number
    relevance_skip_reason: string | null
  }[]

  const { readable } = await readableSources(supabase, { stored, segmentId })

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, '_system.txt'), EXTRACTION_SYSTEM_PROMPT)

  const index = readable.map((s, i) => {
    const file = `${String(i).padStart(2, '0')}-${hostOf(s.url).replace(/[^a-z0-9.]/gi, '_')}.txt`
    const prompt = buildExtractionPrompt({
      segmentName: segment.name,
      profile,
      sourceKind: s.kind,
      sourceUrl: s.url,
      content: s.content as string,
    })
    writeFileSync(join(outDir, file), prompt)
    return {
      sourceId: s.id,
      sourceUrl: s.url,
      signalRank: s.signal_rank,
      kind: s.kind,
      promptFile: join(outDir, file),
    }
  })

  writeFileSync(join(outDir, '_index.json'), JSON.stringify(index, null, 2))

  console.log(`\nsystem prompt → ${join(outDir, '_system.txt')}`)
  console.log(`${index.length} extraction prompts → ${outDir}`)
  for (const e of index) console.log(`  r${e.signalRank}  ${e.promptFile}`)
  console.log(`\nindex → ${join(outDir, '_index.json')}`)
  console.log(
    '\nAuthor candidates.json as PainPointCandidate[]:\n' +
      '  { sourceId, sourceUrl, signalRank, statement, quote, icpFear, confidence }\n' +
      'quote must be verbatim from that source — it is checked on store.'
  )
}

function readCandidates(path: string): PainPointCandidate[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as PainPointCandidate[]
  if (!Array.isArray(parsed)) throw new Error('candidates file must be an array')
  return parsed
}

/** Step 3 — print the real clustering prompt. */
async function cmdCluster() {
  const runId = required('run')
  const candidates = readCandidates(required('candidates'))
  const outPath = arg('out')
  await loadRunContext(runId)

  const prompt = buildClusterPrompt(candidates)
  const body = `### SYSTEM\n${CLUSTER_SYSTEM_PROMPT}\n\n### PROMPT\n${prompt}\n`

  if (outPath) {
    writeFileSync(outPath, body)
    console.log(`cluster prompt → ${outPath}`)
  } else {
    console.log(body)
  }
  console.log(
    '\nAuthor clusters.json as { statement, memberIndices, icpFear }[].\n' +
      'Every candidate index must appear exactly once.'
  )
}

/**
 * Step 4 — rank and store.
 *
 * The verbatim check is the reason this step can be trusted at all. `rank.ts`
 * drops a pain point with no resolvable source link, but nothing downstream ever
 * re-reads a quote against the source it claims to come from, so a hand-authored
 * candidate could carry a paraphrase and it would look exactly like evidence.
 * That is the same failure the critic gate guards against in `review/critique.ts`
 * by verifying a blocking quote against the copy, and it applies with more force
 * here: a pain point quote is what licenses a claim to a client.
 */
async function cmdStore() {
  const runId = required('run')
  const candidates = readCandidates(required('candidates'))
  const clusters = JSON.parse(readFileSync(required('clusters'), 'utf8')) as CandidateCluster[]
  const { supabase, segmentId, segment } = await loadRunContext(runId)

  const { data: rows } = await supabase
    .from('marketing_sources')
    .select('id, url, kind, content, signal_rank, relevance_skip_reason')
    .eq('research_run_id', runId)

  const stored = (rows ?? []) as StoredSource[]
  const byId = new Map(stored.map((r) => [r.id, r]))

  // Normalising whitespace only. Anything more would let a rewritten quote pass.
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

  const problems: string[] = []
  candidates.forEach((c, i) => {
    const source = byId.get(c.sourceId ?? '')
    if (!source) {
      problems.push(`[${i}] sourceId ${c.sourceId} is not a source on this run`)
      return
    }
    if (source.relevance_skip_reason) {
      problems.push(`[${i}] cites ${hostOf(source.url)}, which was skipped as off-segment`)
      return
    }
    if (!source.content || !norm(source.content).includes(norm(c.quote))) {
      problems.push(`[${i}] quote is not verbatim in ${hostOf(source.url)}: "${c.quote.slice(0, 70)}"`)
    }
  })

  const seen = new Set<number>()
  for (const cluster of clusters) {
    for (const i of cluster.memberIndices) {
      if (i < 0 || i >= candidates.length) problems.push(`cluster index ${i} out of range`)
      else if (seen.has(i)) problems.push(`candidate ${i} appears in more than one cluster`)
      else seen.add(i)
    }
  }
  for (let i = 0; i < candidates.length; i++) {
    if (!seen.has(i)) problems.push(`candidate ${i} is in no cluster`)
  }

  if (problems.length > 0) {
    console.error(`\nRefusing to store — ${problems.length} problem(s):`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }

  const ranked = rankClusters(candidates, clusters)

  console.log(`\n${candidates.length} candidates → ${clusters.length} clusters → ${ranked.length} stored\n`)
  for (const p of ranked) {
    console.log(`  #${p.rank}  score ${p.score}  freq ${p.frequency}  ${p.icpFear ?? '—'}`)
    console.log(`      ${p.statement}`)
  }

  const painPointCount = await storeRankedPainPoints(supabase, {
    runId,
    segmentId,
    segmentName: segment.name,
    ranked,
  })

  const { outsideCount, skippedCount } = await readableSources(supabase, { stored, segmentId })

  await completeResearchRun(supabase, runId, {
    sourceCount: stored.length,
    outsideSourceCount: outsideCount,
    skippedSourceCount: skippedCount,
    painPointCount,
  })

  console.log(`\nrun ${runId} completed — ${painPointCount} pain points stored`)
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'sources') return cmdSources()
  if (cmd === 'prompt') return cmdPrompt()
  if (cmd === 'cluster') return cmdCluster()
  if (cmd === 'store') return cmdStore()
  throw new Error('usage: research-manual.ts <sources|prompt|cluster|store> [...]')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
