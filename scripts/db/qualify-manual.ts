/**
 * Prospect qualification with the model call supplied by hand.
 *
 * Sibling of `generate-variants-manual.ts` and `critique-variant-manual.ts`, and
 * the same bargain: the prompt is built by the real builder over the real
 * pending set, the verdicts are matched and written by the real storage code,
 * and only the judgement comes from a file.
 *
 *   tsx --env-file=.env.local scripts/db/qualify-manual.ts prompt \
 *     --segment <id> [--limit 20] [--out prompt.txt]
 *
 *   tsx --env-file=.env.local scripts/db/qualify-manual.ts store \
 *     --segment <id> --assessments assessments.json [--limit 20]
 *
 * assessments.json is exactly what the schema in `qualify.ts` describes:
 *
 *   [{ "index": 0, "verdict": "qualified", "reason": "..." }]
 *
 * ── Why not just write `qualified: true` ──────────────────────────────────
 *
 * Because `qualification_reason` is the column that makes a send defensible
 * later. Setting the boolean by hand produces a row that says a company was
 * judged and cannot say on what — and everything downstream treats
 * `qualified: true` as licence to put a cold email in front of them.
 *
 * The other half is `unclear`. A row that does not carry the fact a qualifier
 * turns on stays NULL with the reason recorded, exactly as the API path leaves
 * it. Forcing a boolean onto thin evidence is the failure this whole step
 * exists to avoid, and it is *easier* to commit by hand than by model, because
 * the person doing it already wants the batch to be sendable.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createServiceClient } from '@/lib/supabase/server'
import { getSegment } from '@/lib/marketing/services'
import {
  applyAssessments,
  buildQualificationPrompt,
  selectPendingProspects,
  QUALIFICATION_SYSTEM_PROMPT,
  type Assessment,
} from '@/lib/marketing/prospects/qualify'

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

function required(name: string): string {
  const v = arg(name)
  if (!v) throw new Error(`--${name} is required`)
  return v
}

async function context() {
  const supabase = await createServiceClient()
  const segmentId = required('segment')

  const segment = await getSegment(supabase, segmentId)
  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const prospectIds = arg('prospects')?.split(',').map((s) => s.trim()).filter(Boolean)
  const limit = arg('limit') ? Number(arg('limit')) : undefined

  // The same selection the API path makes, in the same order. Assessments are
  // matched back by index, so this must not drift.
  const pending = await selectPendingProspects(supabase, { segmentId, prospectIds, limit })

  return { supabase, segment, pending }
}

async function cmdPrompt() {
  const { segment, pending } = await context()
  if (pending.length === 0) throw new Error('Nothing pending — every row in this segment is judged')

  const body = [
    '═══════════════════ SYSTEM ═══════════════════',
    QUALIFICATION_SYSTEM_PROMPT,
    '',
    '═══════════════════ PROMPT ═══════════════════',
    buildQualificationPrompt(segment, pending),
    '',
    '═══════════════════ ROW IDS ══════════════════',
    ...pending.map((p, i) => `[${i}] ${p.id}  ${p.company}`),
  ].join('\n')

  const outPath = arg('out')
  if (outPath) {
    writeFileSync(outPath, body)
    console.log(`${pending.length} row(s) → ${outPath}`)
  } else {
    console.log(body)
  }

  console.log(
    '\nAuthor assessments.json as:\n' +
      '  [{ "index": 0, "verdict": "qualified" | "not_qualified" | "unclear", "reason": "..." }]'
  )
}

async function cmdStore() {
  const { supabase, pending } = await context()
  const assessments = JSON.parse(readFileSync(required('assessments'), 'utf8')) as Assessment[]
  if (!Array.isArray(assessments)) throw new Error('assessments file must be an array')

  // Checked here rather than left to the index matcher, which silently drops an
  // out-of-range index. Silently dropping is the right behaviour for a model
  // that hallucinated a row; for a hand-authored file it means a company the
  // author believed they had judged goes unjudged.
  const problems: string[] = []
  const seen = new Set<number>()
  assessments.forEach((a, i) => {
    if (!Number.isInteger(a?.index) || a.index < 0 || a.index >= pending.length) {
      problems.push(`[${i}] index ${a?.index} is not a row in this batch (0-${pending.length - 1})`)
      return
    }
    if (seen.has(a.index)) problems.push(`[${i}] index ${a.index} appears twice`)
    seen.add(a.index)
    if (!['qualified', 'not_qualified', 'unclear'].includes(a.verdict)) {
      problems.push(`[${i}] verdict "${a.verdict}" is not one of qualified/not_qualified/unclear`)
    }
    if (!a.reason?.trim()) problems.push(`[${i}] no reason — the reason is the point`)
  })
  for (let i = 0; i < pending.length; i++) {
    if (!seen.has(i)) problems.push(`row [${i}] ${pending[i].company} has no assessment`)
  }

  if (problems.length > 0) {
    console.error(`\nRefusing to store — ${problems.length} problem(s):`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }

  const result = await applyAssessments(supabase, pending, assessments, 'manual')

  console.log(
    `\n${result.assessed} assessed — ${result.qualified} qualified, ` +
      `${result.notQualified} not qualified, ${result.unclear} unclear\n`
  )
  for (const row of result.rows) {
    const mark = row.verdict === 'qualified' ? '✓' : row.verdict === 'not_qualified' ? '✗' : '?'
    console.log(`  ${mark} ${row.company}`)
    console.log(`      ${row.reason}`)
  }
  if (result.unmatched.length) {
    console.log(`\n  untouched: ${result.unmatched.join(', ')}`)
  }
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'prompt') return cmdPrompt()
  if (cmd === 'store') return cmdStore()
  throw new Error('usage: qualify-manual.ts <prompt|store> --segment <id> [...]')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
