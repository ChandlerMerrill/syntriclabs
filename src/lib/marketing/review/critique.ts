import { generateObject } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { marketingModel, marketingModelId, MARKETING_MAX_OUTPUT_TOKENS } from '../model'
import { loadBrandProfile, type BrandProfile, type ProofAsset } from '../config/brand-profile'
import { getCampaign, getPainPoint, getSegment, getVariant } from '../services'
import { selectProofAsset } from '../generate/prompt'
import type { MarketingPainPoint, MarketingSegment } from '../types'

/**
 * The critic gate.
 *
 * `checks.ts` states the opposing case and it is worth reading before this file:
 * mechanical rules are deterministic, and a model deciding whether copy is
 * on-brand was left to the human gate on purpose. That is now reversed. The
 * mechanical rules are untouched and still run; two model critics run beside
 * them and can block.
 *
 * The reversal is defensible only because of one constraint, enforced here in
 * code rather than asked for in the prompt: **a blocking finding must quote the
 * span of copy it objects to, and the quote must actually appear in the copy.**
 * A critic that cannot point at the words does not get to reject the variant —
 * its finding is demoted to a concern the approver reads. That turns "the model
 * didn't like it" into "the model objected to this sentence, here it is", which
 * is the difference between a gate you can argue with and a coin toss.
 *
 * Two critics, deliberately different jobs:
 *
 *   - `qa_review` judges the copy against what is on file. Does it read as
 *     typed by a person, is it specific, is every claim traceable to the
 *     evidence and the offering statuses.
 *   - `devils_advocate` argues the recipient's case for deleting it. It is
 *     adversarial by construction and blocks only where the copy could have
 *     prevented the objection — otherwise every cold email fails, which would
 *     make the critic useless rather than strict.
 *
 * Both are runnable by hand. `critiqueVariant` takes an authored critique and
 * stores it with `transport: 'manual'`, the same path
 * `generate-variants-manual.ts` takes for copy — iterating a gate should not
 * require paying for it on every pass.
 */

export const CRITICS = ['qa_review', 'devils_advocate'] as const
export type CriticKey = (typeof CRITICS)[number]

const findingSchema = z.object({
  severity: z
    .enum(['blocking', 'concern', 'note'])
    .describe(
      'blocking = this must not be sent as written. concern = a real weakness a person should ' +
        'weigh before approving. note = an observation, no action implied.'
    ),
  quote: z
    .string()
    .describe(
      'The exact span of the subject or body this is about, copied verbatim, character for ' +
        'character. A blocking finding whose quote does not appear in the copy is demoted to a ' +
        'concern, so quote precisely rather than paraphrasing.'
    ),
  problem: z.string().describe('What is wrong with that span, in one or two sentences.'),
})

const critiqueSchema = z.object({
  verdict: z
    .enum(['pass', 'fail'])
    .describe('fail only when at least one finding is blocking. Otherwise pass.'),
  summary: z
    .string()
    .describe('One or two sentences a person reads before deciding. State the verdict and why.'),
  findings: z.array(findingSchema),
})

export type CritiqueFinding = z.infer<typeof findingSchema>
export type CritiqueOutput = z.infer<typeof critiqueSchema>

export interface CritiqueTarget {
  profile: BrandProfile
  segment: Pick<MarketingSegment, 'name' | 'description'> | null
  painPoint: Pick<MarketingPainPoint, 'statement' | 'evidence' | 'icp_fear'> | null
  proofAsset: ProofAsset | null
  subject: string
  body: string
}

/**
 * Bump when the *structure* of a critique prompt changes, for the same reason
 * `GENERATION_PROMPT_VERSION` exists: a verdict that changed because the
 * instruction changed must not read as the copy having got worse.
 */
export const CRITIQUE_PROMPT_VERSION = 'v1'

function evidenceLines(target: CritiqueTarget): string {
  if (!target.painPoint) return '(no pain point on file for this variant)'
  const quotes = target.painPoint.evidence
    .slice(0, 6)
    .map((e) => `- "${e.quote}"${e.url ? ` — ${e.url}` : ''}`)
    .join('\n')
  return [
    target.painPoint.statement,
    '',
    'What operators actually said:',
    quotes || '(no quotes recorded)',
  ].join('\n')
}

function offeringLines(profile: BrandProfile): string {
  const { offerings } = profile.offerConstraints
  const line = (status: 'proven' | 'intended') =>
    offerings
      .filter((o) => o.status === status)
      .map((o) => `- ${o.name}${o.aliases.length ? ` (also: ${o.aliases.join(', ')})` : ''}`)
      .join('\n') || '(none)'

  return [
    'Results MAY be cited for these:',
    line('proven'),
    '',
    'NEVER delivered — may be described, scoped and quoted, never claimed as an outcome:',
    line('intended'),
  ].join('\n')
}

function sharedContext(target: CritiqueTarget): string {
  return [
    '## The copy under review',
    `Subject: ${target.subject}`,
    '',
    target.body,
    '',
    '## Who is supposed to have written it',
    target.profile.voiceRules.speaker,
    '',
    '## Who it is going to',
    target.segment
      ? `${target.segment.name}${target.segment.description ? ` — ${target.segment.description}` : ''}`
      : '(no segment recorded)',
    `Situation: ${target.profile.icp.situation ?? '(not recorded)'}`,
    `Mindset: ${target.profile.icp.mindset ?? '(not recorded)'}`,
    '',
    '## The researched pain point it is written from',
    evidenceLines(target),
    '',
    '## What may be claimed',
    offeringLines(target.profile),
    '',
    '## The one proof asset available',
    target.proofAsset
      ? `${target.proofAsset.name} — ${target.proofAsset.url}\n${target.proofAsset.description}`
      : 'None on file for this segment. The copy is not entitled to name one.',
  ].join('\n')
}

export function buildQaPrompt(target: CritiqueTarget): string {
  return [
    '# QA review',
    '',
    sharedContext(target),
    '',
    '## Your job',
    'Decide whether this cold email should be sent as written.',
    '',
    'Block it for any of these, and only these:',
    '',
    '1. **It reads as written by a company rather than typed by a person.** Brochure',
    '   sentences, marketing cadence, a register no busy founder would use in a real email.',
    '2. **A claim is not supported by what is on file above.** A number that appears in no',
    '   quote, a result attributed to an offering marked never-delivered, a proof asset',
    '   described as something it is not.',
    '3. **The opening could be sent unchanged to any other business in the segment.** The',
    '   first line is the whole email; a generic one means the rest will not be read.',
    '4. **It condescends.** These are people who run real operations and will notice',
    '   immediately.',
    '5. **It explains a term the reader has no reason to know**, or uses one without',
    '   explaining: LLM, API, webhook, prompt, RAG, model.',
    '',
    'Everything else — a weak subject, an awkward sentence, a better angle you can imagine —',
    'is a `concern` or a `note`, not a block. You are the last gate before a stranger reads',
    'this, not an editor improving a draft.',
    '',
    '**Every blocking finding must quote the exact span it objects to, verbatim.** A block',
    'whose quote cannot be found in the copy is demoted to a concern automatically, so a',
    'paraphrase costs you the block.',
    '',
    'Judge what is written. Do not reward it for what it avoided doing.',
  ].join('\n')
}

export function buildDevilsAdvocatePrompt(target: CritiqueTarget): string {
  return [
    "# Devil's advocate",
    '',
    sharedContext(target),
    '',
    '## Your job',
    'You are the person receiving this. You did not ask for it. You get several like it a',
    'week, you have been burned by a tech promise before, and your inbox is open between two',
    'other things.',
    '',
    'Make the case for deleting it. Be specific and be cynical. What reads as automated?',
    'What sounds like it was sent to two hundred people? Where does it assume something',
    'about your business that it has no way of knowing? What would make you decide this',
    'person does not actually understand your operation?',
    '',
    '## What blocks and what does not',
    'Almost every cold email can be deleted for a reason. If you block on the mere fact of',
    'being unsolicited, you reject everything and this critic becomes noise that gets turned',
    'off. So:',
    '',
    '- **Block** only when the copy could have prevented the objection and did not — a claim',
    '  it did not have to make, an assumption it did not have to assert, a line that gives',
    '  the game away as a template.',
    '- **Concern** when the objection is real but inherent to cold outreach.',
    '- **Note** for anything you would shrug at.',
    '',
    '**Every blocking finding must quote the exact span it objects to, verbatim.** A block',
    'whose quote cannot be found in the copy is demoted to a concern automatically.',
    '',
    'Do not suggest rewrites. Say what is wrong and why you would delete it.',
  ].join('\n')
}

export function buildCritiquePrompt(critic: CriticKey, target: CritiqueTarget): string {
  return critic === 'qa_review' ? buildQaPrompt(target) : buildDevilsAdvocatePrompt(target)
}

const SYSTEM: Record<CriticKey, string> = {
  qa_review:
    'You are the final quality gate on cold outreach for a one-person software company. You ' +
    'are strict about evidence and about register, and you do not block on taste. Your ' +
    'verdict is stored and read by a person who can overrule you, so make an argument rather ' +
    'than a pronouncement.',
  devils_advocate:
    'You role-play a sceptical small-business owner receiving a cold email. You are not ' +
    'hostile for its own sake and you are not impressed easily. You block only on what the ' +
    'sender could have avoided.',
}

/**
 * Normalises quotes before comparing.
 *
 * Models reproduce a span faithfully and still miss on whitespace, smart quotes
 * and dashes — none of which mean the finding was invented. Punctuation that
 * carries meaning is preserved; only the characters that get silently
 * transliterated are folded.
 */
function normalizeForQuoteMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Demotes blocking findings whose quote is not in the copy.
 *
 * This is the whole reason a model is allowed to block at all. It runs on the
 * model path and the manual path alike — a critique authored by hand is held to
 * the same standard, because the point is that the verdict is checkable, not
 * that the model in particular is distrusted.
 */
export function verifyFindings(
  output: CritiqueOutput,
  copy: { subject: string; body: string }
): { findings: CritiqueFinding[]; demoted: CritiqueFinding[] } {
  const haystack = normalizeForQuoteMatch(`${copy.subject}\n${copy.body}`)
  const findings: CritiqueFinding[] = []
  const demoted: CritiqueFinding[] = []

  for (const f of output.findings) {
    if (f.severity !== 'blocking') {
      findings.push(f)
      continue
    }
    const needle = normalizeForQuoteMatch(f.quote)
    if (needle && haystack.includes(needle)) {
      findings.push(f)
    } else {
      const down: CritiqueFinding = { ...f, severity: 'concern' }
      findings.push(down)
      demoted.push(f)
    }
  }

  return { findings, demoted }
}

export interface StoredCritique {
  critic: CriticKey
  verdict: 'pass' | 'fail'
  summary: string
  findings: CritiqueFinding[]
  demoted: CritiqueFinding[]
  transport: 'model' | 'manual' | 'human'
  model: string | null
}

/**
 * Derives the verdict from the findings that survived verification.
 *
 * Not taken from the model. A critique that lists a blocking finding and then
 * says "pass", or says "fail" while listing nothing blocking, is internally
 * inconsistent — and the copy is what gets sent, so the findings win.
 */
function deriveVerdict(findings: CritiqueFinding[]): 'pass' | 'fail' {
  return findings.some((f) => f.severity === 'blocking') ? 'fail' : 'pass'
}

export async function runCritic(
  critic: CriticKey,
  target: CritiqueTarget
): Promise<StoredCritique & { prompt: string }> {
  const prompt = buildCritiquePrompt(critic, target)
  const model = marketingModelId('score')

  const { object } = await generateObject({
    model: marketingModel('score'),
    schema: critiqueSchema,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    system: SYSTEM[critic],
    prompt,
  })

  const { findings, demoted } = verifyFindings(object, {
    subject: target.subject,
    body: target.body,
  })

  return {
    critic,
    verdict: deriveVerdict(findings),
    summary: object.summary,
    findings,
    demoted,
    transport: 'model',
    model,
    prompt,
  }
}

/**
 * Stores a critique and writes the matching check row.
 *
 * The check row is what the existing gate machinery reads, so a failing critique
 * makes the variant unsendable through exactly the same path a failing
 * mechanical rule does. Nothing new had to be taught about how a variant becomes
 * blocked.
 */
export async function storeCritique(
  supabase: SupabaseClient,
  variantId: string,
  critique: StoredCritique & { prompt: string }
): Promise<void> {
  const { error } = await supabase.from('marketing_variant_critiques').upsert(
    {
      variant_id: variantId,
      critic: critique.critic,
      verdict: critique.verdict,
      summary: critique.summary,
      findings: critique.findings,
      critique_prompt: critique.prompt,
      model: critique.model,
      transport: critique.transport,
    },
    { onConflict: 'variant_id,critic' }
  )
  if (error) throw new Error(`Failed to store critique: ${error.message}`)

  const blocking = critique.findings.filter((f) => f.severity === 'blocking')
  const detail = blocking.length
    ? `${critique.summary} · Blocking: ${blocking.map((f) => f.problem).join(' · ')}`
    : critique.summary

  // A person who has already ruled on this critic keeps their ruling. Same
  // precedent as `scoreAndStore`, which never lets a model score overwrite a
  // human one: the correction is the signal worth keeping, and a critic re-run
  // silently reinstating a verdict someone had deliberately overruled is the
  // behaviour that would make people stop overruling it.
  //
  // The critique row above is still written, so the argument is on file either
  // way — it is the gate-facing verdict that a human keeps.
  const { data: existingCheck } = await supabase
    .from('marketing_variant_checks')
    .select('checked_by')
    .eq('variant_id', variantId)
    .eq('rule', critique.critic)
    .maybeSingle()

  if (existingCheck?.checked_by === 'human') return

  const { error: checkError } = await supabase.from('marketing_variant_checks').upsert(
    {
      variant_id: variantId,
      rule: critique.critic,
      passed: critique.verdict === 'pass',
      detail: detail.slice(0, 2000),
      checked_by: 'system',
      checked_at: new Date().toISOString(),
    },
    { onConflict: 'variant_id,rule' }
  )
  if (checkError) throw new Error(`Failed to store critique check: ${checkError.message}`)
}

/**
 * Records a person's decision to send copy a critic rejected.
 *
 * Writes the check row as `checked_by: 'human'`, which both unblocks the gate
 * and makes the override durable against a later critic re-run. The reason is
 * required and stored: an override with no argument attached is
 * indistinguishable from clicking through a warning, and the whole point of
 * letting a model block was to produce arguments worth having.
 */
export async function overrideCritic(
  supabase: SupabaseClient,
  variantId: string,
  critic: CriticKey,
  reason: string
): Promise<void> {
  if (!reason.trim()) throw new Error('An override needs a reason')

  const { error } = await supabase.from('marketing_variant_checks').upsert(
    {
      variant_id: variantId,
      rule: critic,
      passed: true,
      detail: `Overridden by a human: ${reason.trim()}`.slice(0, 2000),
      checked_by: 'human',
      checked_at: new Date().toISOString(),
    },
    { onConflict: 'variant_id,rule' }
  )
  if (error) throw new Error(`Failed to record override: ${error.message}`)
}

/**
 * Builds a critique from findings authored by hand.
 *
 * Same verification, same verdict derivation, same storage. Only the source of
 * the findings differs, and `transport` records which — so a performance
 * comparison can tell a critic that ran from one that was written, rather than
 * averaging them.
 */
/**
 * Assembles everything a critic needs to judge a variant.
 *
 * The critics read the same material the generator was given — pain point,
 * evidence quotes, proof asset, offering statuses — because a critic judging
 * copy against less than the writer had would reject it for omitting things it
 * was never told, and pass claims it has no way to check.
 */
export async function loadCritiqueTarget(
  supabase: SupabaseClient,
  variantId: string
): Promise<CritiqueTarget & { variantId: string }> {
  const variant = await getVariant(supabase, variantId)
  if (!variant) throw new Error(`Variant ${variantId} not found`)

  const campaign = await getCampaign(supabase, variant.campaign_id)
  if (!campaign) throw new Error(`Campaign ${variant.campaign_id} not found`)

  const profile = await loadBrandProfile(supabase, { id: campaign.brand_profile_id })
  if (!profile) throw new Error(`Brand profile ${campaign.brand_profile_id} not found`)

  const segment = campaign.segment_id ? await getSegment(supabase, campaign.segment_id) : null
  const painPoint = variant.pain_point_id
    ? await getPainPoint(supabase, variant.pain_point_id)
    : null

  return {
    variantId,
    profile,
    segment,
    painPoint,
    proofAsset: selectProofAsset(profile, segment?.slug),
    subject: variant.subject ?? '',
    body: variant.body ?? '',
  }
}

/**
 * Runs both critics against a variant and stores the results.
 *
 * Sequential rather than parallel: two Opus 5 calls with a shared rate limit
 * gain nothing from overlapping at this volume, and a failure part-way through
 * leaves the first critique on file rather than losing both.
 */
export async function critiqueVariant(
  supabase: SupabaseClient,
  variantId: string,
  opts?: { critics?: CriticKey[] }
): Promise<StoredCritique[]> {
  const target = await loadCritiqueTarget(supabase, variantId)
  const out: StoredCritique[] = []

  for (const critic of opts?.critics ?? CRITICS) {
    const critique = await runCritic(critic, target)
    await storeCritique(supabase, variantId, critique)
    out.push(critique)
  }

  return out
}

export function manualCritique(
  critic: CriticKey,
  target: CritiqueTarget,
  authored: CritiqueOutput,
  opts?: { transport?: 'manual' | 'human' }
): StoredCritique & { prompt: string } {
  const prompt = buildCritiquePrompt(critic, target)
  const { findings, demoted } = verifyFindings(authored, {
    subject: target.subject,
    body: target.body,
  })

  return {
    critic,
    verdict: deriveVerdict(findings),
    summary: authored.summary,
    findings,
    demoted,
    transport: opts?.transport ?? 'manual',
    model: null,
    prompt,
  }
}
