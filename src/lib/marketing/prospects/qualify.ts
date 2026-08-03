import type { SupabaseClient } from '@supabase/supabase-js'
import { generateObject } from 'ai'
import { z } from 'zod'
import { marketingModel, marketingModelId, MARKETING_MAX_OUTPUT_TOKENS } from '../model'
import { getSegment, listProspects } from '../services'
import type { MarketingProspect, MarketingSegment } from '../types'

/**
 * Judging an imported row against the segment it was imported into.
 *
 * `marketing_segments.qualifiers` and `disqualifiers` have existed since 023 and
 * nothing has ever read them. They are written in plain language — "Runs
 * multi-day or high-ticket guided trips rather than single-day bookings",
 * "Already runs a full booking platform" — which is why this is a model call and
 * not a rule engine: the check is a judgement about a business, made against
 * criteria a person wrote for other people to read.
 *
 * Two deliberate limits:
 *
 *   - **It judges only what is on the row.** Company, contact, site, location,
 *     notes. There is no crawl behind this, so a sparse row gets a sparse
 *     answer, and the honest one is often `unclear`. Discovery (Firecrawl) is
 *     what would give it more to work with.
 *   - **`unclear` stays unreviewed.** `qualified` is left NULL and the reason
 *     is stored, so the row surfaces for a person rather than carrying a
 *     confident guess. A forced boolean on thin evidence is worse than no
 *     answer, because everything downstream treats `qualified: true` as
 *     sendable.
 */

const VERDICTS = ['qualified', 'not_qualified', 'unclear'] as const

const assessmentSchema = z.object({
  index: z.number().int().describe('The index of the prospect being judged, exactly as listed.'),
  verdict: z
    .enum(VERDICTS)
    .describe(
      'qualified when the row meets the qualifiers and trips none of the disqualifiers. ' +
        'not_qualified when it clearly trips one. unclear when the row does not say enough — ' +
        'this is the right answer more often than it feels like.'
    ),
  reason: z
    .string()
    .describe(
      'One sentence naming the qualifier or disqualifier that decided it, quoting the part ' +
        'of the row that matched. For unclear, name what is missing.'
    ),
})

const qualificationSchema = z.object({
  assessments: z.array(assessmentSchema),
})

export type Verdict = (typeof VERDICTS)[number]

/** Past this the batch stops fitting comfortably in one structured response. */
const MAX_BATCH = 20

type QualifiableProspect = Pick<
  MarketingProspect,
  'id' | 'company' | 'contact_name' | 'email' | 'website' | 'location' | 'notes'
>

type QualifiableSegment = Pick<
  MarketingSegment,
  'name' | 'description' | 'qualifiers' | 'disqualifiers'
>

export function buildQualificationPrompt(
  segment: QualifiableSegment,
  prospects: QualifiableProspect[]
): string {
  const lines: string[] = [
    `# Qualify ${prospects.length} prospect${prospects.length === 1 ? '' : 's'} for: ${segment.name}`,
    '',
  ]

  if (segment.description) lines.push(segment.description, '')

  lines.push('## Qualifies')
  lines.push(
    segment.qualifiers.length
      ? segment.qualifiers.map((q) => `- ${q}`).join('\n')
      : '- (none recorded — say so rather than inventing criteria)'
  )
  lines.push('', '## Does not qualify')
  lines.push(
    segment.disqualifiers.length
      ? segment.disqualifiers.map((d) => `- ${d}`).join('\n')
      : '- (none recorded)'
  )

  lines.push('', '## The rows', '')
  prospects.forEach((p, i) => {
    const facts = [
      `company: ${p.company}`,
      p.contact_name ? `contact: ${p.contact_name}` : null,
      p.email ? `email: ${p.email}` : null,
      p.website ? `website: ${p.website}` : null,
      p.location ? `location: ${p.location}` : null,
      p.notes ? `notes: ${p.notes}` : null,
    ].filter(Boolean)
    lines.push(`[${i}] ${facts.join(' · ')}`)
  })

  lines.push(
    '',
    '## Task',
    'Return one assessment per row, with its `index` exactly as shown in brackets.',
    '',
    'Rules:',
    '- Judge only what the row says. You have no other information about these businesses',
    '  and must not assume any — not from the company name, not from the domain.',
    '- A name that merely sounds like the industry is not evidence that it qualifies.',
    '- `unclear` is the correct answer whenever the row does not carry the fact a',
    '  qualifier turns on. Prefer it to a plausible guess: a wrong `qualified` puts a',
    '  cold email in front of someone it was never written for.',
    '- One disqualifier met is enough for `not_qualified`, however well the rest fits.'
  )

  return lines.join('\n')
}

export interface QualifyResult {
  assessed: number
  qualified: number
  notQualified: number
  unclear: number
  model: string
  rows: { id: string; company: string; verdict: Verdict; reason: string }[]
  /** Prospects the model returned nothing usable for. Left untouched. */
  unmatched: string[]
}

export async function qualifyProspects(
  supabase: SupabaseClient,
  opts: { segmentId: string; prospectIds?: string[]; limit?: number }
): Promise<QualifyResult> {
  const segment = await getSegment(supabase, opts.segmentId)
  if (!segment) throw new Error(`Segment ${opts.segmentId} not found`)

  const all = await listProspects(supabase, { segmentId: opts.segmentId, limit: 500 })

  const wanted = opts.prospectIds?.length ? new Set(opts.prospectIds) : null
  const pending = all
    .filter((p) => (wanted ? wanted.has(p.id) : p.qualified === null))
    .filter((p) => !p.suppressed_at)
    .slice(0, Math.min(opts.limit ?? MAX_BATCH, MAX_BATCH))

  const empty: QualifyResult = {
    assessed: 0,
    qualified: 0,
    notQualified: 0,
    unclear: 0,
    model: marketingModelId('extract'),
    rows: [],
    unmatched: [],
  }
  if (pending.length === 0) return empty

  const { object } = await generateObject({
    model: marketingModel('extract'),
    schema: qualificationSchema,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    system:
      'You qualify inbound prospect rows for a one-person software company. You are strict ' +
      'about the difference between what a row states and what it suggests, and you say ' +
      'when you cannot tell.',
    prompt: buildQualificationPrompt(segment, pending),
  })

  // Matched by index, and every index is bounds-checked. A model that returns a
  // stray or duplicate index must not be able to write a verdict onto the wrong
  // company — the row it would land on is a real business about to be emailed.
  const byIndex = new Map<number, (typeof object.assessments)[number]>()
  for (const a of object.assessments) {
    if (!Number.isInteger(a.index) || a.index < 0 || a.index >= pending.length) continue
    if (!byIndex.has(a.index)) byIndex.set(a.index, a)
  }

  const result: QualifyResult = { ...empty, rows: [], unmatched: [] }

  for (const [i, prospect] of pending.entries()) {
    const assessment = byIndex.get(i)
    if (!assessment) {
      result.unmatched.push(prospect.company)
      continue
    }

    // `unclear` writes the reason and leaves `qualified` NULL, which is the
    // "unreviewed" bucket the prospect list already renders.
    const qualified =
      assessment.verdict === 'qualified' ? true : assessment.verdict === 'not_qualified' ? false : null

    const { error } = await supabase
      .from('marketing_prospects')
      .update({ qualified, qualification_reason: assessment.reason })
      .eq('id', prospect.id)
    if (error) throw new Error(`Failed to store qualification: ${error.message}`)

    result.assessed++
    if (assessment.verdict === 'qualified') result.qualified++
    else if (assessment.verdict === 'not_qualified') result.notQualified++
    else result.unclear++

    result.rows.push({
      id: prospect.id,
      company: prospect.company,
      verdict: assessment.verdict,
      reason: assessment.reason,
    })
  }

  return result
}
