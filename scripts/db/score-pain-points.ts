/**
 * Scoring a pain point on what it is worth writing about, not on how many
 * people mentioned it.
 *
 *   tsx --env-file=.env.local scripts/db/score-pain-points.ts prompt \
 *     --segment <id> [--run <id>] [--unscored] [--out rubric.txt]
 *
 *   tsx --env-file=.env.local scripts/db/score-pain-points.ts store \
 *     --scores scores.json
 *
 *   tsx --env-file=.env.local scripts/db/score-pain-points.ts list --segment <id>
 *
 * `frequency`, `score` and `rank` already answer "how much corroboration is
 * there", and they answer it well. They cannot answer "should the next email be
 * about this", because corroboration is only one of the things that decides it.
 * A complaint six operators make in passing loses to one two operators make with
 * a federal deadline attached — and both lose to a complaint Syntric cannot
 * build for, however loudly it is made.
 *
 * Four dimensions, 1–5, added and not weighted. Added because Smaply's writeup
 * of pain-point prioritisation does the same and says plainly that inventing
 * multipliers reads as precision nobody has earned; four rather than three
 * because outbound has a constraint product research does not — the problem has
 * to be one this business can actually solve.
 *
 * ── What this script does and does not decide ─────────────────────────────
 *
 * `reach` is computed here, from the `score` the ranking maths already produced,
 * and a scores file may not supply it. There is exactly one right answer for how
 * much corroboration a pain point has and it is already in the row; letting it
 * be re-typed by hand would let the two disagree, and the whole reason the
 * existing columns are left alone is so that comparison across runs keeps
 * working.
 *
 * `severity`, `urgency` and `addressability` are judgements, authored against
 * the rubric `prompt` prints.
 *
 * `cost_evidence` is the part with teeth. It may only be stored when its quote
 * appears verbatim in the cited source's stored content — the same rule
 * `research-manual.ts` enforces on pain point evidence, for a stronger reason: a
 * figure is the single most quotable thing in a cold email and the single
 * easiest thing to have slightly wrong. A quote that does not match is a hard
 * refusal, not a warning.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createServiceClient } from '@/lib/supabase/server'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { getSegment } from '@/lib/marketing/services'
import type { PainPointEvidence } from '@/lib/marketing/types'

interface PainPointRow {
  id: string
  research_run_id: string
  segment_id: string | null
  statement: string
  frequency: number
  rank: number | null
  score: number
  evidence: PainPointEvidence[]
  icp_fear: string | null
  reach: number | null
  severity: number | null
  urgency: number | null
  addressability: number | null
  priority_score: number | null
  cost_evidence: Record<string, unknown> | null
  scored_at: string | null
  scored_by: string | null
  created_at: string
}

interface AuthoredScore {
  painPointId: string
  severity: number
  urgency: number
  addressability: number
  /** Null is the common and correct answer. */
  costEvidence: {
    amount: number | null
    unit: string
    period: string | null
    quote: string
    sourceId: string
    url?: string | null
  } | null
}

const COLUMNS =
  'id, research_run_id, segment_id, statement, frequency, rank, score, evidence, icp_fear, ' +
  'reach, severity, urgency, addressability, priority_score, cost_evidence, scored_at, scored_by, created_at'

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

function required(name: string): string {
  const v = arg(name)
  if (!v) throw new Error(`--${name} is required`)
  return v
}

/**
 * `score` → `reach`, 1–5.
 *
 * `score` is frequency weighted by source signal rank (1.0 for an operator
 * forum down to 0.3 for trade press), so it is already the right quantity — it
 * is just on an open-ended scale, and adding an open-ended number to three
 * bounded ones would let one dimension swamp the other three. The bands are cut
 * against what the ranking actually produces: a run's top pain point lands
 * between 2 and 6, its tail between 0.7 and 1.5.
 *
 * A band, not a formula, because the cut points are a judgement about this
 * corpus and should look like one.
 */
export function bandReach(score: number): number {
  if (score >= 5) return 5 // several rank-1 sources, or a lot of everything
  if (score >= 3) return 4
  if (score >= 2) return 3
  if (score >= 1) return 2
  return 1 // a single mention, or several from the weakest tier
}

/** Whitespace only. Anything more would let a rewritten quote pass. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

const RUBRIC = `
Score each pain point on three dimensions, 1-5. \`reach\` is not yours to set —
it is banded from the corroboration the ranking already measured, and is shown
per pain point below so you can see what it contributes.

## severity — how badly does it hurt when it lands?

  1  An irritation. Absorbed without comment, mentioned only when asked.
  2  Annoying. Costs an hour here and there; nobody has done anything about it.
  3  Real friction. Costs a recurring, noticeable amount of time or attention.
  4  Expensive. Costs money directly, or costs enough time to have displaced
     work the operator would rather be doing.
  5  Existential in kind if not in scale — a lost client, a lost season, a
     licence at risk, a number the business cannot produce when asked for it.

  Judge from the evidence, not from how bad it could theoretically be. An
  operator describing something as "a pain" is a 2 or 3; an operator describing
  what it cost them is a 4 or 5.

## urgency — is there a clock on it?

  1  Can be ignored indefinitely and has been.
  2  Comes up eventually. No trigger, no deadline.
  3  Recurs on a rhythm — every season, every trip, every month.
  4  Recurs on a rhythm that falls inside the next quarter, or has a soft
     deadline the operator is already thinking about.
  5  A dated deadline, or a trigger that lands inside the sending window.

  This is the dimension that decays, and it is scored as of today, not in the
  abstract. A February filing is a 5 in January and a 2 in August. That is the
  correct behaviour: it is the reason to write about a different problem in
  August, not a flaw in the scale.

## addressability — can Syntric build for it, and prove it?

  1  Outside what software touches. Insurance markets, weather, the supply of
     people willing to guide for a season.
  2  Software could help at the edges, but the core of the problem is not a
     software problem.
  3  Buildable, and nothing on file speaks to it. The email would stand on the
     observation alone.
  4  Buildable, squarely in what this business does, and there is a named
     offering for it — but the offering is \`intended\`, not \`proven\`, so it may
     be described and quoted and never claimed as a track record.
  5  Buildable, and there is a proof asset on the brand profile that is credible
     for this segment — something real that shipped and can be linked.

  This is the dimension that stops the rubric ranking a genuine, urgent, widely
  felt problem that nobody here can do anything about. Be strict: the question
  is not "could this be automated in principle" but "would the reply to this
  email be a conversation Syntric can carry".

## cost_evidence — the number, if a source names one

  Optional, and null is the common answer. Fill it in only when a source in the
  evidence below states a figure, and only by quoting that source verbatim.

  { "amount": 3850, "unit": "usd", "period": "per trip",
    "quote": "<exact span from the source>", "sourceId": "<the source's id>" }

  \`amount\` may be null when the source quantifies without a number ("most of
  the off-season"). \`unit\` is what the number counts — usd, hours, days,
  clients, trips. \`period\` is what it is per, or null for a one-off.

  The quote is checked against the source's stored content on store, character
  for character after whitespace normalisation, and a mismatch refuses the whole
  file. That check is the only reason a number from here is safe to put in front
  of a client.
`.trimEnd()

async function loadPainPoints(opts: {
  segmentId?: string | null
  runId?: string | null
  unscoredOnly: boolean
}): Promise<PainPointRow[]> {
  const supabase = await createServiceClient()
  let query = supabase.from('marketing_pain_points').select(COLUMNS)

  if (opts.runId) query = query.eq('research_run_id', opts.runId)
  if (opts.segmentId) query = query.eq('segment_id', opts.segmentId)
  if (opts.unscoredOnly) query = query.is('priority_score', null)

  const { data, error } = await query.order('score', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PainPointRow[]
}

async function cmdPrompt() {
  const segmentId = arg('segment')
  const runId = arg('run')
  if (!segmentId && !runId) throw new Error('--segment or --run is required')

  const supabase = await createServiceClient()
  const rows = await loadPainPoints({
    segmentId,
    runId,
    unscoredOnly: process.argv.includes('--unscored'),
  })
  if (rows.length === 0) throw new Error('No pain points matched')

  const segment = segmentId ? await getSegment(supabase, segmentId) : null
  const profile = await loadBrandProfile(supabase)
  if (!profile) throw new Error('No brand profile on file')

  // Which run each pain point came from, so corroboration across runs is
  // visible while scoring rather than something to go and look up.
  const { data: runs } = await supabase
    .from('marketing_research_runs')
    .select('id, created_at, extraction_transport, source_count')
  const runById = new Map(
    (runs ?? []).map((r) => [
      r.id as string,
      `${String(r.created_at).slice(0, 10)} · ${r.source_count} sources · ${r.extraction_transport}`,
    ])
  )

  const lines: string[] = []
  lines.push(`# Score pain points — ${segment?.name ?? 'run ' + runId}`)
  lines.push('')
  lines.push(`Scored as of ${new Date().toISOString().slice(0, 10)}. Urgency is a claim about today.`)
  lines.push('')
  lines.push(RUBRIC)

  lines.push('', '## What Syntric can actually build', '')
  lines.push('Offerings on the brand profile — `proven` may be cited as a result,')
  lines.push('`intended` may be described and quoted but never claimed as a track record:')
  lines.push('')
  for (const o of profile.offerConstraints.offerings) {
    lines.push(`- [${o.status}] ${o.name}${o.notes ? ` — ${o.notes}` : ''}`)
  }

  lines.push('', 'Proof assets:', '')
  for (const a of profile.proofAssets) {
    const scope = a.segments.length ? a.segments.join(', ') : 'any segment'
    const credible = segment && a.segments.length && !a.segments.includes(segment.slug)
    lines.push(`- ${a.name} (${scope})${credible ? ' — OFF-DOMAIN for this segment' : ''}`)
    lines.push(`  ${a.description}`)
  }

  lines.push('', '## The pain points', '')

  for (const p of rows) {
    lines.push('─'.repeat(78))
    lines.push(`id: ${p.id}`)
    lines.push(`run: ${runById.get(p.research_run_id) ?? p.research_run_id}`)
    lines.push(
      `score ${p.score} · frequency ${p.frequency} · rank ${p.rank ?? '—'} → reach ${bandReach(p.score)}`
    )
    if (p.priority_score !== null) {
      lines.push(
        `ALREADY SCORED: ${p.reach}+${p.severity}+${p.urgency}+${p.addressability} = ${p.priority_score} ` +
          `(${p.scored_by}, ${String(p.scored_at).slice(0, 10)})`
      )
    }
    lines.push(`icp fear: ${p.icp_fear ?? '—'}`)
    lines.push('')
    lines.push(p.statement)
    lines.push('')
    lines.push('evidence:')
    for (const e of p.evidence) {
      lines.push(`  · sourceId ${e.source_id ?? '—'}  ${e.url ?? ''}`)
      lines.push(`    “${e.quote}”`)
    }
    lines.push('')
  }
  lines.push('─'.repeat(78))

  lines.push('')
  lines.push('Author scores.json as:')
  lines.push('  [{ "painPointId": "...", "severity": 4, "urgency": 2,')
  lines.push('     "addressability": 5, "costEvidence": null }]')
  lines.push('`reach` is computed on store and must not appear in the file.')

  const body = lines.join('\n')
  const outPath = arg('out')
  if (outPath) {
    writeFileSync(outPath, body)
    console.log(`rubric + ${rows.length} pain points → ${outPath}`)
  } else {
    console.log(body)
  }
}

function checkDimension(name: string, value: unknown, at: number, problems: string[]) {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
    problems.push(`[${at}] ${name} must be an integer 1-5, got ${JSON.stringify(value)}`)
  }
}

async function cmdStore() {
  const supabase = await createServiceClient()
  const authored = JSON.parse(readFileSync(required('scores'), 'utf8')) as AuthoredScore[]
  if (!Array.isArray(authored)) throw new Error('scores file must be an array')

  const ids = authored.map((a) => a?.painPointId).filter(Boolean)
  const { data: rows, error } = await supabase
    .from('marketing_pain_points')
    .select(COLUMNS)
    .in('id', ids)
  if (error) throw new Error(error.message)
  const byId = new Map((rows ?? []).map((r) => [(r as unknown as PainPointRow).id, r as unknown as PainPointRow]))

  const problems: string[] = []

  authored.forEach((a, i) => {
    if (!a?.painPointId) {
      problems.push(`[${i}] no painPointId`)
      return
    }
    if (!byId.has(a.painPointId)) {
      problems.push(`[${i}] pain point ${a.painPointId} not found`)
      return
    }
    if ('reach' in a) {
      problems.push(
        `[${i}] scores file supplies \`reach\` — it is banded from \`score\` on store and must ` +
          'not be authored, or the two can disagree'
      )
    }
    checkDimension('severity', a.severity, i, problems)
    checkDimension('urgency', a.urgency, i, problems)
    checkDimension('addressability', a.addressability, i, problems)
  })

  // ── The verbatim check ──────────────────────────────────────────────────
  //
  // Every cited source is loaded and every quote re-read against its stored
  // content. A figure is what a client would check first, and the only thing
  // standing between "quoted from a source" and "roughly what a source said" is
  // this comparison.
  const citedSourceIds = authored
    .map((a) => a?.costEvidence?.sourceId)
    .filter((id): id is string => typeof id === 'string')

  const sourceById = new Map<string, { id: string; url: string | null; content: string | null }>()
  if (citedSourceIds.length > 0) {
    const { data: sources, error: sourceError } = await supabase
      .from('marketing_sources')
      .select('id, url, content')
      .in('id', citedSourceIds)
    if (sourceError) throw new Error(sourceError.message)
    for (const s of sources ?? []) {
      sourceById.set(s.id as string, s as { id: string; url: string | null; content: string | null })
    }
  }

  authored.forEach((a, i) => {
    const ce = a?.costEvidence
    if (!ce) return

    if (typeof ce.quote !== 'string' || ce.quote.trim() === '') {
      problems.push(`[${i}] costEvidence has no quote`)
      return
    }
    if (typeof ce.unit !== 'string' || ce.unit.trim() === '') {
      problems.push(`[${i}] costEvidence has no unit — say what the number counts`)
    }
    if (ce.amount !== null && typeof ce.amount !== 'number') {
      problems.push(`[${i}] costEvidence.amount must be a number or null`)
    }

    const source = sourceById.get(ce.sourceId)
    if (!source) {
      problems.push(`[${i}] costEvidence.sourceId ${ce.sourceId} is not a source on file`)
      return
    }

    // The pain point has to actually cite the source the figure comes from.
    // Otherwise a real quote from an unrelated document could be attached to a
    // pain point it says nothing about, and every individual check would pass.
    const painPoint = byId.get(a.painPointId)
    if (painPoint && !painPoint.evidence.some((e) => e.source_id === ce.sourceId)) {
      problems.push(
        `[${i}] costEvidence cites ${source.url ?? ce.sourceId}, which is not among this pain ` +
          "point's evidence sources"
      )
    }

    if (!source.content) {
      problems.push(`[${i}] source ${source.url ?? ce.sourceId} has no stored content to check against`)
      return
    }
    if (!norm(source.content).includes(norm(ce.quote))) {
      problems.push(
        `[${i}] quote is NOT verbatim in ${source.url ?? ce.sourceId}: "${ce.quote.slice(0, 80)}"`
      )
    }
  })

  if (problems.length > 0) {
    console.error(`\nRefusing to store — ${problems.length} problem(s):`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }

  const scoredAt = new Date().toISOString()

  for (const a of authored) {
    const row = byId.get(a.painPointId)!
    const reach = bandReach(row.score)

    const { error: updateError } = await supabase
      .from('marketing_pain_points')
      .update({
        reach,
        severity: a.severity,
        urgency: a.urgency,
        addressability: a.addressability,
        cost_evidence: a.costEvidence
          ? {
              amount: a.costEvidence.amount,
              unit: a.costEvidence.unit,
              period: a.costEvidence.period ?? null,
              quote: a.costEvidence.quote,
              source_id: a.costEvidence.sourceId,
              url: a.costEvidence.url ?? sourceById.get(a.costEvidence.sourceId)?.url ?? null,
            }
          : null,
        scored_at: scoredAt,
        scored_by: 'human',
      })
      .eq('id', a.painPointId)
    if (updateError) throw new Error(`Failed to score ${a.painPointId}: ${updateError.message}`)
  }

  console.log(`\n${authored.length} pain point(s) scored.\n`)
  await printTable(await loadPainPoints({ segmentId: null, runId: null, unscoredOnly: false }))
}

async function printTable(rows: PainPointRow[]) {
  const scored = rows.filter((r) => r.priority_score !== null)
  scored.sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))

  console.log('  pri  r s u a   cost              statement')
  for (const p of scored) {
    const cost = p.cost_evidence
      ? `${p.cost_evidence.amount ?? '—'} ${p.cost_evidence.unit ?? ''} ${p.cost_evidence.period ?? ''}`.trim()
      : '—'
    console.log(
      `  ${String(p.priority_score).padStart(3)}  ${p.reach} ${p.severity} ${p.urgency} ${p.addressability}   ` +
        `${cost.slice(0, 16).padEnd(16)}  ${p.statement.slice(0, 88)}`
    )
  }

  const unscored = rows.length - scored.length
  if (unscored > 0) console.log(`\n  (${unscored} unscored)`)
}

async function cmdList() {
  const rows = await loadPainPoints({
    segmentId: arg('segment'),
    runId: arg('run'),
    unscoredOnly: false,
  })
  await printTable(rows)
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'prompt') return cmdPrompt()
  if (cmd === 'store') return cmdStore()
  if (cmd === 'list') return cmdList()
  throw new Error('usage: score-pain-points.ts <prompt|store|list> [...]')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
