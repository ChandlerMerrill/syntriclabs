import { generateObject } from 'ai'
import { z } from 'zod'
import { marketingModel, marketingModelId, MARKETING_MAX_OUTPUT_TOKENS } from '../model'
import type { BrandProfile } from '../config/brand-profile'

/**
 * Structured extraction of pain points from one source.
 *
 * This is the repo's first use of `generateObject` — everything else does
 * prompt-and-parse (see fireflies/process-transcript.ts, which asks for JSON in
 * prose and then strips code fences). Validation at the tool-call layer means
 * the model retries a bad shape instead of the worker throwing on
 * `JSON.parse`.
 */

const candidateSchema = z.object({
  /**
   * The complaint in the operator's own framing, not the builder's. "Reconciling
   * a season of receipts weeks after the trip" — not "lacks expense automation".
   */
  statement: z.string().describe(
    'The pain point as the operator would describe it — a problem, not a missing feature. One sentence.'
  ),
  /**
   * The verbatim span it came from. This is what makes the pain point sourced
   * rather than assumed, and an unsourced pain point may not inform a claim to
   * a client.
   */
  quote: z.string().describe('A verbatim quote from the source that evidences this pain point.'),
  /** Which named ICP fear it maps onto, if any. */
  icpFear: z.string().nullable().describe(
    'The key of the ICP fear this maps to, or null if none of them fit. Do not force a match.'
  ),
  confidence: z.enum(['high', 'medium', 'low']).describe(
    'How clearly the source actually states this, rather than how compelling it sounds.'
  ),
})

const extractionSchema = z.object({
  candidates: z.array(candidateSchema),
})

export type PainPointCandidate = z.infer<typeof candidateSchema> & {
  sourceId: string | null
  sourceUrl: string | null
  signalRank: number
}

export function buildExtractionPrompt(params: {
  segmentName: string
  profile: BrandProfile
  sourceKind: string
  sourceUrl: string | null
  content: string
}): string {
  const fears = params.profile.icp.fears
    .map((f) => `- ${f.key}: ${f.statement}`)
    .join('\n')

  return [
    `## Segment`,
    params.segmentName,
    '',
    `## Who we sell to`,
    params.profile.icp.situation ?? '(not recorded)',
    params.profile.icp.mindset ?? '',
    '',
    `## Named fears (map to these by key, or return null)`,
    fears || '(none recorded)',
    '',
    `## Source`,
    `Kind: ${params.sourceKind}`,
    `URL: ${params.sourceUrl ?? '(unknown)'}`,
    '',
    `## Task`,
    'Extract the operational pain points this source actually evidences.',
    '',
    'Rules:',
    '- Only extract what the text supports. Every candidate needs a verbatim quote from the source.',
    '- State the pain as a problem the operator feels, not as a missing software feature.',
    '- Do not invent numbers, and do not repeat a number the source states unless the quote contains it.',
    '- If the source evidences nothing operational, return an empty list. An empty list is a correct answer.',
    '- Do not force an ICP fear match. Null is better than a stretch.',
    '',
    `## Source content`,
    params.content,
  ].join('\n')
}

export async function extractPainPoints(params: {
  segmentName: string
  profile: BrandProfile
  sourceId: string | null
  sourceKind: string
  sourceUrl: string | null
  signalRank: number
  content: string
}): Promise<PainPointCandidate[]> {
  const prompt = buildExtractionPrompt(params)

  const { object } = await generateObject({
    model: marketingModel('extract'),
    schema: extractionSchema,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    system:
      'You extract operational pain points from source material for a B2B research loop. ' +
      'You are strict about evidence: a claim without a verbatim quote from the source is not a finding.',
    prompt,
  })

  return object.candidates.map((c) => ({
    ...c,
    sourceId: params.sourceId,
    sourceUrl: params.sourceUrl,
    signalRank: params.signalRank,
  }))
}

export function extractionModelId(): string {
  return marketingModelId('extract')
}
