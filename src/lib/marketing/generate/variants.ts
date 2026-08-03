import { generateObject } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { marketingModel, marketingModelId, MARKETING_MAX_OUTPUT_TOKENS } from '../model'
import { loadBrandProfile } from '../config/brand-profile'
import { getCampaign, getPainPoint, getSegment } from '../services'
import { gateVariant, type GateResult } from '../review/gate'
import {
  buildGenerationPrompt,
  buildGenerationSystemPrompt,
  selectProofAsset,
  GENERATION_PROMPT_VERSION,
  type GenerationTarget,
} from './prompt'
import { assignStyles, getStyle, measureStyle } from './style'
import { countWords } from '../review/checks'
import type { MarketingVariant } from '../types'

/**
 * Variant generation.
 *
 * The contract this module exists to keep: **every row it writes carries the
 * prompt that produced it.** `marketing_variants.generation_prompt` is NOT
 * NULL, and the insert below is the only writer. A variant that cannot be
 * traced back to its instruction cannot teach the generator anything, so it is
 * not allowed to exist.
 *
 * Generation does not decide whether a variant is usable. It writes rows and
 * hands each one to the gate, which records per-rule results and sets the
 * status. Nothing here can produce a variant that is `ready` without passing
 * the checks, and nothing here can send.
 */

const variantSchema = z.object({
  label: z
    .string()
    .describe('Short kebab-case handle for the angle, e.g. "cua-reporting". Not a title.'),
  subject: z.string().describe('The subject line.'),
  body: z
    .string()
    .describe('The email body as plain text, blank lines between paragraphs. No sign-off.'),
  icpFear: z
    .string()
    .nullable()
    .describe('The key of the ICP fear this aims at, or null. Do not force a match.'),
  angle: z
    .string()
    .describe('One sentence on what makes this different from the other variants and why it might land.'),
  styleKey: z
    .string()
    .nullable()
    .describe('The key of the style assigned to this variant, echoed back exactly as given.'),
})

const generationSchema = z.object({
  variants: z.array(variantSchema),
})

export type GeneratedVariant = z.infer<typeof variantSchema>

export interface GenerateVariantsParams {
  campaignId: string
  /** Required. See the note on `GenerationTarget.painPoint`. */
  painPointId: string
  /** Lineage — set when breeding from a variant that performed. */
  parentVariantId?: string | null
  variantCount?: number
  /**
   * Force every variant into one style instead of taking the default spread.
   * For deliberately running a batch of one kind; see `assignStyles`.
   */
  styleKey?: string | null
  guidance?: string | null
}

export interface GenerateVariantsResult {
  campaignId: string
  generated: number
  passed: number
  variants: Array<{ variant: MarketingVariant; gate: GateResult }>
}

/** Ceiling on one call. Past this the angles stop being distinct and start being rewordings. */
const MAX_VARIANTS_PER_CALL = 6
const DEFAULT_VARIANT_COUNT = 3

export async function generateVariants(
  supabase: SupabaseClient,
  params: GenerateVariantsParams
): Promise<GenerateVariantsResult> {
  const variantCount = Math.min(
    Math.max(params.variantCount ?? DEFAULT_VARIANT_COUNT, 1),
    MAX_VARIANTS_PER_CALL
  )

  const campaign = await getCampaign(supabase, params.campaignId)
  if (!campaign) throw new Error(`Campaign ${params.campaignId} not found`)

  const profile = await loadBrandProfile(supabase, { id: campaign.brand_profile_id })
  if (!profile) throw new Error(`Brand profile ${campaign.brand_profile_id} not found`)

  const segment = campaign.segment_id ? await getSegment(supabase, campaign.segment_id) : null

  const painPoint = await getPainPoint(supabase, params.painPointId)
  if (!painPoint) throw new Error(`Pain point ${params.painPointId} not found`)

  const proofAsset = selectProofAsset(profile, segment?.slug)

  // Validated rather than left to `assignStyles`, which falls back to the spread
  // on an unknown key. A caller that named a style and silently got the default
  // spread would record `styleForced` for an experiment that never ran.
  if (params.styleKey && !getStyle(params.styleKey)) {
    throw new Error(`Unknown style "${params.styleKey}"`)
  }
  const styles = assignStyles(variantCount, { styleKey: params.styleKey ?? null })

  const target: GenerationTarget = {
    profile,
    campaign: { name: campaign.name, goal: campaign.goal, channel: campaign.channel },
    segment,
    painPoint,
    proofAsset,
    variantCount,
    styles,
    guidance: params.guidance ?? null,
  }

  const prompt = buildGenerationPrompt(target)
  const system = buildGenerationSystemPrompt()
  const model = marketingModelId('generate')

  const { object } = await generateObject({
    model: marketingModel('generate'),
    schema: generationSchema,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    system,
    prompt,
  })

  const drafts = object.variants.slice(0, variantCount)
  if (drafts.length === 0) {
    return { campaignId: campaign.id, generated: 0, passed: 0, variants: [] }
  }

  // The knobs that would change the output, recorded next to the output. Read
  // together with generation_prompt this is enough to reproduce the call.
  const sharedConfig = {
    promptVersion: GENERATION_PROMPT_VERSION,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    variantCount,
    brandProfileId: profile.id,
    segmentId: segment?.id ?? null,
    segmentSlug: segment?.slug ?? null,
    painPointId: painPoint?.id ?? null,
    proofAssetKey: proofAsset?.key ?? null,
    styleKeys: styles.map((s) => s.key),
    styleForced: params.styleKey ?? null,
    guidance: params.guidance ?? null,
  }

  const { data: inserted, error } = await supabase
    .from('marketing_variants')
    .insert(
      drafts.map((d, i) => {
        // The assignment by index is what was asked for, so it is what the
        // variant is measured against. What the model echoed is recorded beside
        // it rather than trusted: a batch where the two disagree is a batch that
        // did not run the experiment it looks like it ran, and that is only
        // visible if both are on the row.
        const assigned = styles[i] ?? styles[0]
        const reported = d.styleKey ?? null

        return {
          campaign_id: campaign.id,
          pain_point_id: painPoint?.id ?? null,
          parent_variant_id: params.parentVariantId ?? null,
          label: d.label,
          subject: d.subject,
          body: d.body,
          icp_fear: d.icpFear,
          generation_prompt: prompt,
          generation_config: {
            ...sharedConfig,
            angle: d.angle,
            system,
            style: assigned.key,
            styleReported: reported,
            styleMatched: reported === assigned.key,
            // Measured against the style asked for, not the one claimed. A model
            // told to write 25–45 words routinely writes 60; without this the
            // performance view credits "terse" for copy that was never terse.
            styleMetrics: measureStyle(d.body, assigned, countWords(d.body)),
          },
          model,
          status: 'draft',
        }
      })
    )
    .select('*')
  if (error) throw new Error(`Failed to store variants: ${error.message}`)

  const rows = (inserted ?? []) as MarketingVariant[]

  // Gate each one. A failure to check is not a pass — it propagates, because a
  // variant sitting at `draft` is invisible to the approval queue anyway.
  const gated = await Promise.all(
    rows.map(async (row) => ({
      variant: row,
      gate: await gateVariant(supabase, row.id, { subject: row.subject, body: row.body }, profile),
    }))
  )

  return {
    campaignId: campaign.id,
    generated: gated.length,
    passed: gated.filter((g) => g.gate.passed).length,
    variants: gated,
  }
}
