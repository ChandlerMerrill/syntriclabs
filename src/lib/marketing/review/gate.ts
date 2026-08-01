import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrandProfile } from '../config/brand-profile'
import { runChecks, checksPassed, type CheckResult, type VariantDraft } from './checks'

/**
 * The gate.
 *
 * Mechanical checks decide whether a variant is allowed to be *offered* for
 * approval. A human decides whether it goes out. Neither substitutes for the
 * other: passing every rule is not permission to send, and no amount of human
 * enthusiasm lets a variant with a dead proof link through.
 */

export interface GateResult {
  variantId: string
  passed: boolean
  results: CheckResult[]
  status: 'ready' | 'checks_failed'
}

export async function gateVariant(
  supabase: SupabaseClient,
  variantId: string,
  draft: VariantDraft,
  profile: BrandProfile
): Promise<GateResult> {
  const results = await runChecks(draft, profile)
  const passed = checksPassed(results)
  const status: GateResult['status'] = passed ? 'ready' : 'checks_failed'

  const { error: checkError } = await supabase.from('marketing_variant_checks').upsert(
    results.map((r) => ({
      variant_id: variantId,
      rule: r.rule,
      passed: r.passed,
      detail: r.detail,
      checked_by: 'system',
      checked_at: new Date().toISOString(),
    })),
    { onConflict: 'variant_id,rule' }
  )
  if (checkError) throw new Error(`Failed to store variant checks: ${checkError.message}`)

  const { error: statusError } = await supabase
    .from('marketing_variants')
    .update({ status })
    .eq('id', variantId)
  if (statusError) throw new Error(`Failed to update variant status: ${statusError.message}`)

  return { variantId, passed, results, status }
}

/**
 * A variant may be queued for a human only when every mechanical rule passes.
 *
 * This is checked at queue time rather than at send time on purpose: an
 * approver looking at a list should be looking at things that are actually
 * sendable, not filtering out broken ones by hand.
 */
export async function assertVariantSendable(
  supabase: SupabaseClient,
  variantId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: variant, error } = await supabase
    .from('marketing_variants')
    .select('id, status')
    .eq('id', variantId)
    .maybeSingle()

  if (error) return { ok: false, reason: `Failed to load variant: ${error.message}` }
  if (!variant) return { ok: false, reason: 'Variant not found' }
  if (variant.status === 'retired') return { ok: false, reason: 'Variant is retired' }

  const { data: failed } = await supabase
    .from('marketing_variant_checks')
    .select('rule, detail')
    .eq('variant_id', variantId)
    .eq('passed', false)

  if (failed && failed.length > 0) {
    const names = failed.map((f) => `${f.rule}${f.detail ? ` (${f.detail})` : ''}`)
    return { ok: false, reason: `Failed checks: ${names.join('; ')}` }
  }

  if (variant.status !== 'ready') {
    return { ok: false, reason: `Variant has not been checked (status: ${variant.status})` }
  }

  return { ok: true }
}
