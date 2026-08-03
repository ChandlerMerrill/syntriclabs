/**
 * The critic gate with the model call supplied by hand.
 *
 * Sibling of `generate-variants-manual.ts`, and the same bargain: the prompt is
 * built by the real builder, the findings are verified by the real verifier, the
 * verdict is derived by the real rule, and the rows are written by the real
 * writer. Only the judgement comes from a file instead of the API.
 *
 * This matters more here than it does for generation. The critics can block a
 * send, so the thing most worth iterating is the critique prompt itself — and
 * iterating a gate by paying for it on every pass is how a gate ends up
 * unexamined.
 *
 * A hand-authored critique is held to exactly the same standard as a model one:
 * a blocking finding whose quote is not in the copy is demoted to a concern here
 * too. The point of that rule is that a verdict is checkable, not that the model
 * in particular is distrusted.
 *
 *   # print the prompt for one critic, to answer by hand
 *   tsx --env-file=.env.local scripts/db/critique-variant-manual.ts prompt \
 *     --variant <id> --critic qa_review
 *
 *   # store an authored critique
 *   tsx --env-file=.env.local scripts/db/critique-variant-manual.ts store \
 *     --variant <id> --critic qa_review --critique critique.json
 *
 *   # what the gate currently thinks
 *   tsx --env-file=.env.local scripts/db/critique-variant-manual.ts status --variant <id>
 *
 *   # send anyway, on the record
 *   tsx --env-file=.env.local scripts/db/critique-variant-manual.ts override \
 *     --variant <id> --critic devils_advocate --reason "..."
 *
 * critique.json shape:
 *   {
 *     "verdict": "fail",
 *     "summary": "...",
 *     "findings": [
 *       { "severity": "blocking", "quote": "<verbatim span>", "problem": "..." }
 *     ]
 *   }
 *
 * `verdict` in the file is advisory — the stored verdict is derived from the
 * findings that survive verification, so a file claiming "pass" while listing a
 * blocking finding stores a fail.
 */
import { readFileSync } from 'node:fs'
import { createServiceClient } from '@/lib/supabase/server'
import { assertVariantSendable } from '@/lib/marketing/review/gate'
import {
  CRITICS,
  buildCritiquePrompt,
  loadCritiqueTarget,
  manualCritique,
  overrideCritic,
  storeCritique,
  type CriticKey,
  type CritiqueOutput,
} from '@/lib/marketing/review/critique'

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

function requireArg(name: string): string {
  const v = arg(name)
  if (!v) throw new Error(`--${name} is required`)
  return v
}

function requireCritic(): CriticKey {
  const critic = requireArg('critic')
  if (!(CRITICS as readonly string[]).includes(critic)) {
    throw new Error(`--critic must be one of: ${CRITICS.join(', ')}`)
  }
  return critic as CriticKey
}

async function printPrompt() {
  const supabase = await createServiceClient()
  const target = await loadCritiqueTarget(supabase, requireArg('variant'))
  const critic = requireCritic()

  console.log(`═══════════════════ ${critic.toUpperCase()} ═══════════════════`)
  console.log(buildCritiquePrompt(critic, target))
}

async function store() {
  const supabase = await createServiceClient()
  const variantId = requireArg('variant')
  const critic = requireCritic()
  const target = await loadCritiqueTarget(supabase, variantId)

  const authored: CritiqueOutput = JSON.parse(readFileSync(requireArg('critique'), 'utf8'))
  const critique = manualCritique(critic, target, authored)

  await storeCritique(supabase, variantId, critique)

  console.log(`\n── ${critic} — ${critique.verdict.toUpperCase()} ──`)
  console.log(`   ${critique.summary}\n`)
  for (const f of critique.findings) {
    const mark = f.severity === 'blocking' ? '✗' : f.severity === 'concern' ? '!' : '·'
    console.log(`   ${mark} [${f.severity}] ${f.problem}`)
    console.log(`      “${f.quote}”`)
  }
  if (critique.demoted.length) {
    console.log(
      `\n   ${critique.demoted.length} blocking finding(s) demoted to concern — quote not ` +
        `found in the copy:`
    )
    for (const d of critique.demoted) console.log(`      “${d.quote}”`)
  }
}

async function status() {
  const supabase = await createServiceClient()
  const variantId = requireArg('variant')

  const { data: checks } = await supabase
    .from('marketing_variant_checks')
    .select('rule, passed, detail, checked_by')
    .eq('variant_id', variantId)
    .order('rule')

  console.log('Checks:')
  for (const c of checks ?? []) {
    console.log(
      `  ${c.passed ? '✓' : '✗'} ${String(c.rule).padEnd(16)} ${c.checked_by === 'human' ? '(human) ' : ''}${c.detail ?? ''}`
    )
  }

  const missing = CRITICS.filter((c) => !(checks ?? []).some((r) => r.rule === c))
  if (missing.length) console.log(`  … not yet critiqued: ${missing.join(', ')}`)

  const sendable = await assertVariantSendable(supabase, variantId)
  console.log(`\nSendable: ${sendable.ok ? 'yes' : `no — ${sendable.reason}`}`)
}

async function override() {
  const supabase = await createServiceClient()
  const variantId = requireArg('variant')
  const critic = requireCritic()
  const reason = requireArg('reason')

  await overrideCritic(supabase, variantId, critic, reason)
  console.log(`${critic} overridden on ${variantId}.`)

  const sendable = await assertVariantSendable(supabase, variantId)
  console.log(`Sendable: ${sendable.ok ? 'yes' : `no — ${sendable.reason}`}`)
}

const mode = process.argv[2]
const run =
  mode === 'prompt'
    ? printPrompt
    : mode === 'store'
      ? store
      : mode === 'status'
        ? status
        : mode === 'override'
          ? override
          : null

if (!run) {
  console.error(
    'Usage: critique-variant-manual.ts <prompt|store|status|override> --variant <id> [...]'
  )
  process.exit(1)
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
