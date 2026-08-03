/**
 * Variant generation with the model call supplied by hand.
 *
 * Same path as `generateVariants`, minus the `generateObject` call: the prompt
 * is built by the real builder, the rows are written by the real insert, and
 * every variant goes through the real gate. Only the drafts come from a file
 * instead of the API.
 *
 * That is the point — it exercises the storage contract and the brand checks
 * without spending API credits on copy that is about to be read by a human
 * anyway. What it does NOT exercise is the AI-SDK wiring in
 * `generate/variants.ts`; a variant produced this way is marked as such in
 * `generation_config.transport` so a performance comparison can tell the two
 * apart rather than silently averaging them together.
 *
 *   tsx --env-file=.env.local scripts/db/generate-variants-manual.ts prompt \
 *     --campaign <id> --pain-point <id> --count 3
 *
 *   tsx --env-file=.env.local scripts/db/generate-variants-manual.ts insert \
 *     --campaign <id> --pain-point <id> --count 3 --drafts drafts.json
 *
 * `--style <key>` forces the whole batch into one style rather than taking the
 * default spread — for running a deliberate comparison instead of the standing
 * one. Keys are in `generate/style.ts`.
 */
import { readFileSync } from 'node:fs'
import { createServiceClient } from '@/lib/supabase/server'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { getCampaign, getPainPoint, getSegment } from '@/lib/marketing/services'
import { gateVariant } from '@/lib/marketing/review/gate'
import { marketingModelId, MARKETING_MAX_OUTPUT_TOKENS } from '@/lib/marketing/model'
import {
  buildGenerationPrompt,
  buildGenerationSystemPrompt,
  selectProofAsset,
  GENERATION_PROMPT_VERSION,
  type GenerationTarget,
} from '@/lib/marketing/generate/prompt'
import { assignStyles, getStyle, measureStyle } from '@/lib/marketing/generate/style'
import { countWords } from '@/lib/marketing/review/checks'
import type { MarketingVariant } from '@/lib/marketing/types'

interface Draft {
  label: string
  subject: string
  body: string
  icpFear: string | null
  angle: string
  /** Echoed back from the prompt's per-variant assignment. Optional. */
  styleKey?: string | null
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

async function buildTarget() {
  const supabase = await createServiceClient()

  const campaignId = arg('campaign')
  if (!campaignId) throw new Error('--campaign is required')

  const campaign = await getCampaign(supabase, campaignId)
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const profile = await loadBrandProfile(supabase, { id: campaign.brand_profile_id })
  if (!profile) throw new Error(`Brand profile ${campaign.brand_profile_id} not found`)

  const segment = campaign.segment_id ? await getSegment(supabase, campaign.segment_id) : null

  // Required alongside --campaign, matching the API and the UI. This script
  // exists to build the *real* prompt without paying for a model call; a prompt
  // it could build and the route could not would defeat the point of it.
  const painPointId = arg('pain-point')
  if (!painPointId) throw new Error('--pain-point is required')
  const painPoint = await getPainPoint(supabase, painPointId)
  if (!painPoint) throw new Error(`Pain point ${painPointId} not found`)

  const variantCount = Number(arg('count') ?? 3)
  const guidance = arg('guidance')

  // `selectProofAsset` now returns null for a segment with nothing credible on
  // file, so `--no-proof` is no longer the workaround for that — it is the way
  // to suppress an asset that would otherwise be selected legitimately, e.g. to
  // see what the copy looks like standing on the observation alone.
  const proofAsset = process.argv.includes('--no-proof')
    ? null
    : selectProofAsset(profile, segment?.slug)

  // `--style <key>` forces the whole batch into one style instead of taking the
  // default spread. Same validation as the API path, so a typo here fails rather
  // than quietly producing the default spread under a `styleForced` label.
  const styleKey = arg('style')
  if (styleKey && !getStyle(styleKey)) throw new Error(`Unknown style "${styleKey}"`)
  const styles = assignStyles(variantCount, { styleKey })

  const target: GenerationTarget = {
    profile,
    campaign: { name: campaign.name, goal: campaign.goal, channel: campaign.channel },
    segment,
    painPoint,
    proofAsset,
    variantCount,
    styles,
    guidance,
  }

  return {
    supabase,
    campaign,
    profile,
    segment,
    painPoint,
    proofAsset,
    variantCount,
    styles,
    styleKey,
    guidance,
    target,
  }
}

async function printPrompt() {
  const { target } = await buildTarget()
  console.log('═══════════════════ SYSTEM ═══════════════════')
  console.log(buildGenerationSystemPrompt())
  console.log('\n═══════════════════ PROMPT ═══════════════════')
  console.log(buildGenerationPrompt(target))
}

async function insertDrafts() {
  const ctx = await buildTarget()
  const {
    supabase,
    campaign,
    profile,
    segment,
    painPoint,
    proofAsset,
    variantCount,
    styles,
    styleKey,
    guidance,
    target,
  } = ctx

  const draftsPath = arg('drafts')
  if (!draftsPath) throw new Error('--drafts <file.json> is required')
  const drafts: Draft[] = JSON.parse(readFileSync(draftsPath, 'utf8'))

  const prompt = buildGenerationPrompt(target)
  const system = buildGenerationSystemPrompt()
  const model = marketingModelId('generate')

  // Identical to generate/variants.ts, plus the transport marker.
  const sharedConfig = {
    promptVersion: GENERATION_PROMPT_VERSION,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    variantCount,
    brandProfileId: profile.id,
    segmentId: segment?.id ?? null,
    segmentSlug: segment?.slug ?? null,
    painPointId: painPoint.id,
    proofAssetKey: proofAsset?.key ?? null,
    styleKeys: styles.map((s) => s.key),
    styleForced: styleKey ?? null,
    guidance: guidance ?? null,
    transport: 'manual' as const,
    transportNote:
      'Drafts authored by claude-opus-5 in a Claude Code session against this exact prompt, ' +
      'not via the generateObject API call. Storage and gate paths are unchanged.',
  }

  const { data: inserted, error } = await supabase
    .from('marketing_variants')
    .insert(
      drafts.map((d, i) => {
        const assigned = styles[i] ?? styles[0]
        const reported = d.styleKey ?? null

        return {
          campaign_id: campaign.id,
          pain_point_id: painPoint.id,
          parent_variant_id: null,
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

  for (const [i, row] of rows.entries()) {
    const gate = await gateVariant(
      supabase,
      row.id,
      { subject: row.subject, body: row.body },
      profile
    )
    const assigned = styles[i] ?? styles[0]
    const storedBody = row.body ?? ''
    const m = measureStyle(storedBody, assigned, countWords(storedBody))

    console.log(`\n── ${row.label} — ${gate.status} ──`)
    console.log(`   ${row.subject}`)
    for (const r of gate.results) {
      console.log(`   ${r.passed ? '✓' : '✗'} ${r.rule}${r.detail ? ` — ${r.detail}` : ''}`)
    }
    // Reported, never enforced. Landing outside the band is a fact about the
    // draft worth seeing while iterating, not a reason to reject it.
    console.log(
      `   · style ${assigned.key} — ${m.words}w ` +
        `(target ${assigned.targetWords.min}–${assigned.targetWords.max}${m.inBand ? ', in band' : ', OUT of band'})` +
        `, ${m.emDashes} em dash${m.emDashes === 1 ? '' : 'es'}`
    )
  }

  const passed = rows.length
    ? (
        await supabase
          .from('marketing_variants')
          .select('id', { count: 'exact', head: true })
          .in(
            'id',
            rows.map((r) => r.id)
          )
          .eq('status', 'ready')
      ).count ?? 0
    : 0

  console.log(`\n${rows.length} generated, ${passed} passed the gate.`)
}

const mode = process.argv[2]
const run = mode === 'prompt' ? printPrompt : mode === 'insert' ? insertDrafts : null

if (!run) {
  console.error('Usage: generate-variants-manual.ts <prompt|insert> --campaign <id> [...]')
  process.exit(1)
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
