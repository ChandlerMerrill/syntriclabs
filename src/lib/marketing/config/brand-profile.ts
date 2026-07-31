import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The productization seam.
 *
 * Everything that varies between tenants lives in one row. The loop —
 * research, generation, brand QA, sending, scoring — never hard-codes a
 * Syntric fact; it reads this. For Syntric the profile is a transcription of
 * the brain's context/{voice,icp,positioning,offers}.md. For a client it comes
 * out of a Design Sprint.
 *
 * There is one tenant today. It is config-driven anyway, because this boundary
 * is what a client template would eventually be extracted along, and a
 * boundary you never exercise is a boundary you get wrong.
 */

export const voiceRulesSchema = z.object({
  /** Who is speaking. One paragraph, embedded verbatim in the prompt. */
  speaker: z.string(),
  /** Tone characteristics, each with a good and bad example. */
  characteristics: z.array(z.object({
    rule: z.string(),
    good: z.string().optional(),
    bad: z.string().optional(),
  })).default([]),
  /** Words allowed only when a concrete specific follows them. */
  useCarefully: z.array(z.string()).default([]),
  /** Standing content rules — show don't tell, never invent a number, etc. */
  contentRules: z.array(z.string()).default([]),
  /** How the first line has to behave. */
  hookRules: z.array(z.string()).default([]),
})

export const hardRulesSchema = z.object({
  /** Hard word ceiling on the body. A cold email that needs scrolling isn't read. */
  maxWords: z.number().int().positive(),
  /** Words the body may not open with. */
  bannedOpeningWords: z.array(z.string()).default([]),
  /** Phrases that fail outright regardless of position. */
  bannedPhrases: z.array(z.string()).default([]),
  /** Subject line bounds, in words. */
  subjectMinWords: z.number().int().positive().default(4),
  subjectMaxWords: z.number().int().positive().default(9),
  /** Maximum distinct asks. One link, one question, one next step. */
  maxAsks: z.number().int().positive().default(1),
  /** Every link in the body must resolve before the variant can be approved. */
  requireResolvableLinks: z.boolean().default(true),
})

export const icpSchema = z.object({
  revenueBand: z.string().optional(),
  headcount: z.string().optional(),
  decisionMaker: z.string().optional(),
  situation: z.string().optional(),
  mindset: z.string().optional(),
  /** The named fears. Variants map to one of these where possible. */
  fears: z.array(z.object({
    key: z.string(),
    statement: z.string(),
  })).default([]),
  objections: z.array(z.string()).default([]),
  disqualifiers: z.array(z.string()).default([]),
})

export const proofAssetSchema = z.object({
  key: z.string(),
  name: z.string(),
  /** Must resolve. A proof asset behind a dead link is worse than none. */
  url: z.string().url(),
  /** What it is and who it's for, in one sentence. */
  description: z.string(),
  /** Segments this asset is credible for. Empty = any. */
  segments: z.array(z.string()).default([]),
})

export const offerConstraintsSchema = z.object({
  offerings: z.array(z.object({
    key: z.string(),
    name: z.string(),
    /**
     * `proven` may be cited as a delivered result. `intended` may be described,
     * scoped, and quoted — never claimed as a track record. This distinction is
     * the single most damaging thing to get wrong, so it is data, not prose.
     */
    status: z.enum(['proven', 'intended']),
    notes: z.string().optional(),
  })).default([]),
  /** Words that must never be used for an offering, externally. */
  bannedOfferingTerms: z.array(z.string()).default([]),
})

export const brandProfileSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  voiceRules: voiceRulesSchema,
  bannedWords: z.array(z.string()),
  hardRules: hardRulesSchema,
  icp: icpSchema,
  proofAssets: z.array(proofAssetSchema),
  offerConstraints: offerConstraintsSchema,
})

export type VoiceRules = z.infer<typeof voiceRulesSchema>
export type HardRules = z.infer<typeof hardRulesSchema>
export type Icp = z.infer<typeof icpSchema>
export type ProofAsset = z.infer<typeof proofAssetSchema>
export type OfferConstraints = z.infer<typeof offerConstraintsSchema>
export type BrandProfile = z.infer<typeof brandProfileSchema>

/** The shape without an id — what a seed provides before it is written. */
export const brandProfileSeedSchema = brandProfileSchema.omit({ id: true, isDefault: true })
export type BrandProfileSeed = z.infer<typeof brandProfileSeedSchema>

type BrandProfileRow = {
  id: string
  slug: string
  name: string
  is_default: boolean
  voice_rules: unknown
  banned_words: string[] | null
  hard_rules: unknown
  icp: unknown
  proof_assets: unknown
  offer_constraints: unknown
}

/**
 * Parses a database row into a validated profile.
 *
 * Throws on a malformed row rather than degrading. A generator running against
 * a half-parsed brand profile produces copy that looks fine and violates rules
 * nobody notices until it's in a prospect's inbox.
 */
export function parseBrandProfile(row: BrandProfileRow): BrandProfile {
  return brandProfileSchema.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    isDefault: row.is_default,
    voiceRules: row.voice_rules,
    bannedWords: row.banned_words ?? [],
    hardRules: row.hard_rules,
    icp: row.icp,
    proofAssets: row.proof_assets,
    offerConstraints: row.offer_constraints,
  })
}

/** Serializes a profile back into column values. */
export function serializeBrandProfile(profile: BrandProfileSeed & { isDefault?: boolean }) {
  return {
    slug: profile.slug,
    name: profile.name,
    is_default: profile.isDefault ?? false,
    voice_rules: profile.voiceRules,
    banned_words: profile.bannedWords,
    hard_rules: profile.hardRules,
    icp: profile.icp,
    proof_assets: profile.proofAssets,
    offer_constraints: profile.offerConstraints,
  }
}

const PROFILE_COLUMNS =
  'id, slug, name, is_default, voice_rules, banned_words, hard_rules, icp, proof_assets, offer_constraints'

export async function loadBrandProfile(
  supabase: SupabaseClient,
  opts?: { id?: string; slug?: string }
): Promise<BrandProfile | null> {
  let query = supabase.from('marketing_brand_profiles').select(PROFILE_COLUMNS)

  if (opts?.id) query = query.eq('id', opts.id)
  else if (opts?.slug) query = query.eq('slug', opts.slug)
  else query = query.eq('is_default', true)

  const { data, error } = await query.maybeSingle<BrandProfileRow>()
  if (error) throw new Error(`Failed to load brand profile: ${error.message}`)
  if (!data) return null
  return parseBrandProfile(data)
}

/**
 * Loads the default profile with a service client. For cron jobs, which have no
 * authenticated user.
 */
export async function loadDefaultBrandProfile(): Promise<BrandProfile | null> {
  const supabase = await createServiceClient()
  return loadBrandProfile(supabase, {})
}

export async function listBrandProfiles(supabase: SupabaseClient): Promise<BrandProfile[]> {
  const { data, error } = await supabase
    .from('marketing_brand_profiles')
    .select(PROFILE_COLUMNS)
    .order('is_default', { ascending: false })
    .order('name')
  if (error) throw new Error(`Failed to list brand profiles: ${error.message}`)
  return (data ?? []).map((row) => parseBrandProfile(row as BrandProfileRow))
}

/** Upserts a profile by slug. Used by the seed route and by profile editing. */
export async function upsertBrandProfile(
  supabase: SupabaseClient,
  profile: BrandProfileSeed & { isDefault?: boolean }
): Promise<BrandProfile> {
  const { data, error } = await supabase
    .from('marketing_brand_profiles')
    .upsert(serializeBrandProfile(profile), { onConflict: 'slug' })
    .select(PROFILE_COLUMNS)
    .single<BrandProfileRow>()
  if (error || !data) {
    throw new Error(`Failed to upsert brand profile: ${error?.message ?? 'no row returned'}`)
  }
  return parseBrandProfile(data)
}
