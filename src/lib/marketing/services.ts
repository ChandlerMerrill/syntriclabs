import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MarketingCampaign,
  MarketingPainPoint,
  MarketingProspect,
  MarketingResearchRun,
  MarketingSegment,
  MarketingSend,
  MarketingSource,
  MarketingVariant,
  MarketingVariantCheck,
  VariantPerformance,
} from './types'

/**
 * Data access for the marketing module.
 *
 * Every function takes a client rather than making one. Admin routes pass the
 * RLS-scoped client from requireAdmin(); cron jobs and workers pass a service
 * client. Nothing here decides which — that's the caller's authority level,
 * and hiding it inside the query layer is how a cron job quietly gains a user's
 * permissions or an admin route quietly loses RLS.
 */

// ── Segments ──────────────────────────────────────────────────────────────

export async function listSegments(
  supabase: SupabaseClient,
  brandProfileId?: string
): Promise<MarketingSegment[]> {
  let query = supabase.from('marketing_segments').select('*').order('name')
  if (brandProfileId) query = query.eq('brand_profile_id', brandProfileId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list segments: ${error.message}`)
  return (data ?? []) as MarketingSegment[]
}

export async function getSegment(
  supabase: SupabaseClient,
  id: string
): Promise<MarketingSegment | null> {
  const { data, error } = await supabase
    .from('marketing_segments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load segment: ${error.message}`)
  return (data as MarketingSegment | null) ?? null
}

export async function upsertSegment(
  supabase: SupabaseClient,
  segment: {
    brand_profile_id: string
    slug: string
    name: string
    description?: string | null
    qualifiers?: string[]
    disqualifiers?: string[]
  }
): Promise<MarketingSegment> {
  const { data, error } = await supabase
    .from('marketing_segments')
    .upsert(segment, { onConflict: 'brand_profile_id,slug' })
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(`Failed to upsert segment: ${error?.message ?? 'no row returned'}`)
  }
  return data as MarketingSegment
}

// ── Research ──────────────────────────────────────────────────────────────

export async function listResearchRuns(
  supabase: SupabaseClient,
  opts?: { segmentId?: string; limit?: number }
): Promise<MarketingResearchRun[]> {
  let query = supabase
    .from('marketing_research_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50)
  if (opts?.segmentId) query = query.eq('segment_id', opts.segmentId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list research runs: ${error.message}`)
  return (data ?? []) as MarketingResearchRun[]
}

export async function getResearchRun(
  supabase: SupabaseClient,
  id: string
): Promise<MarketingResearchRun | null> {
  const { data, error } = await supabase
    .from('marketing_research_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load research run: ${error.message}`)
  return (data as MarketingResearchRun | null) ?? null
}

export async function listPainPoints(
  supabase: SupabaseClient,
  opts: { runId?: string; segmentId?: string; limit?: number }
): Promise<MarketingPainPoint[]> {
  let query = supabase.from('marketing_pain_points').select('*')
  if (opts.runId) query = query.eq('research_run_id', opts.runId).order('rank')
  else if (opts.segmentId) {
    query = query.eq('segment_id', opts.segmentId).order('score', { ascending: false })
  } else query = query.order('score', { ascending: false })
  const { data, error } = await query.limit(opts.limit ?? 100)
  if (error) throw new Error(`Failed to list pain points: ${error.message}`)
  return (data ?? []) as MarketingPainPoint[]
}

export async function getPainPoint(
  supabase: SupabaseClient,
  id: string
): Promise<MarketingPainPoint | null> {
  const { data, error } = await supabase
    .from('marketing_pain_points')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load pain point: ${error.message}`)
  return (data as MarketingPainPoint | null) ?? null
}

export async function listSources(
  supabase: SupabaseClient,
  opts: { runId?: string; segmentId?: string; limit?: number }
): Promise<MarketingSource[]> {
  let query = supabase
    .from('marketing_sources')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(opts.limit ?? 200)
  if (opts.runId) query = query.eq('research_run_id', opts.runId)
  if (opts.segmentId) query = query.eq('segment_id', opts.segmentId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list sources: ${error.message}`)
  return (data ?? []) as MarketingSource[]
}

// ── Campaigns ─────────────────────────────────────────────────────────────

export async function listCampaigns(
  supabase: SupabaseClient,
  opts?: { status?: string }
): Promise<MarketingCampaign[]> {
  let query = supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list campaigns: ${error.message}`)
  return (data ?? []) as MarketingCampaign[]
}

export async function getCampaign(
  supabase: SupabaseClient,
  id: string
): Promise<MarketingCampaign | null> {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load campaign: ${error.message}`)
  return (data as MarketingCampaign | null) ?? null
}

export async function createCampaign(
  supabase: SupabaseClient,
  campaign: {
    brand_profile_id: string
    segment_id?: string | null
    name: string
    channel?: string
    goal?: string | null
  }
): Promise<MarketingCampaign> {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert(campaign)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(`Failed to create campaign: ${error?.message ?? 'no row returned'}`)
  }
  return data as MarketingCampaign
}

// ── Variants ──────────────────────────────────────────────────────────────

export async function listVariants(
  supabase: SupabaseClient,
  opts?: { campaignId?: string; status?: string; limit?: number }
): Promise<MarketingVariant[]> {
  let query = supabase
    .from('marketing_variants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100)
  if (opts?.campaignId) query = query.eq('campaign_id', opts.campaignId)
  if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list variants: ${error.message}`)
  return (data ?? []) as MarketingVariant[]
}

export async function getVariant(
  supabase: SupabaseClient,
  id: string
): Promise<MarketingVariant | null> {
  const { data, error } = await supabase
    .from('marketing_variants')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load variant: ${error.message}`)
  return (data as MarketingVariant | null) ?? null
}

export async function listVariantChecks(
  supabase: SupabaseClient,
  variantIds: string[]
): Promise<MarketingVariantCheck[]> {
  if (variantIds.length === 0) return []
  const { data, error } = await supabase
    .from('marketing_variant_checks')
    .select('*')
    .in('variant_id', variantIds)
  if (error) throw new Error(`Failed to list variant checks: ${error.message}`)
  return (data ?? []) as MarketingVariantCheck[]
}

// ── Prospects ─────────────────────────────────────────────────────────────

export async function listProspects(
  supabase: SupabaseClient,
  opts?: { segmentId?: string; qualified?: boolean; search?: string; limit?: number }
): Promise<MarketingProspect[]> {
  let query = supabase
    .from('marketing_prospects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 200)
  if (opts?.segmentId) query = query.eq('segment_id', opts.segmentId)
  if (opts?.qualified !== undefined) query = query.eq('qualified', opts.qualified)
  if (opts?.search) {
    const term = `%${opts.search}%`
    query = query.or(`company.ilike.${term},contact_name.ilike.${term},email.ilike.${term}`)
  }
  const { data, error } = await query
  if (error) throw new Error(`Failed to list prospects: ${error.message}`)
  return (data ?? []) as MarketingProspect[]
}

export async function upsertProspect(
  supabase: SupabaseClient,
  prospect: Partial<MarketingProspect> & { company: string }
): Promise<MarketingProspect> {
  const { data, error } = await supabase
    .from('marketing_prospects')
    .upsert(prospect, { onConflict: 'email' })
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(`Failed to upsert prospect: ${error?.message ?? 'no row returned'}`)
  }
  return data as MarketingProspect
}

// ── Sends ─────────────────────────────────────────────────────────────────

export interface SendWithContext extends MarketingSend {
  marketing_prospects: Pick<MarketingProspect, 'id' | 'company' | 'contact_name' | 'email'> | null
  marketing_variants: Pick<MarketingVariant, 'id' | 'label' | 'subject'> | null
  marketing_campaigns: Pick<MarketingCampaign, 'id' | 'name' | 'channel'> | null
}

const SEND_CONTEXT_SELECT = `
  *,
  marketing_prospects ( id, company, contact_name, email ),
  marketing_variants ( id, label, subject ),
  marketing_campaigns ( id, name, channel )
`

export async function listSends(
  supabase: SupabaseClient,
  opts?: { status?: string; campaignId?: string; limit?: number }
): Promise<SendWithContext[]> {
  let query = supabase
    .from('marketing_sends')
    .select(SEND_CONTEXT_SELECT)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 200)
  if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status)
  if (opts?.campaignId) query = query.eq('campaign_id', opts.campaignId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list sends: ${error.message}`)
  return (data ?? []) as unknown as SendWithContext[]
}

// ── Performance ───────────────────────────────────────────────────────────

export async function listVariantPerformance(
  supabase: SupabaseClient,
  opts?: { campaignId?: string }
): Promise<VariantPerformance[]> {
  let query = supabase
    .from('marketing_variant_performance')
    .select('*')
    .order('sends', { ascending: false })
  if (opts?.campaignId) query = query.eq('campaign_id', opts.campaignId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to load variant performance: ${error.message}`)
  return (data ?? []) as VariantPerformance[]
}
