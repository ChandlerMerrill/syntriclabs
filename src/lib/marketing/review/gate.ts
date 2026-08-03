import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrandProfile } from '../config/brand-profile'
import { runChecks, checksPassed, type CheckResult, type VariantDraft } from './checks'
import { CRITICS } from './critique'

/**
 * The gate.
 *
 * Three layers, and none substitutes for another. Mechanical checks decide
 * whether a variant is well-formed. Two model critics decide whether it is worth
 * sending. A human decides whether it goes out. Passing everything is not
 * permission to send, and no amount of human enthusiasm lets a variant with a
 * dead proof link through.
 *
 * The critics were added after the fact and deliberately reuse the check-row
 * machinery rather than introducing a parallel one, so "how does a variant
 * become unsendable" still has exactly one answer: a row in
 * `marketing_variant_checks` with `passed = false`.
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
 * A variant may be queued for a human only when every rule passes and both
 * critics have actually run.
 *
 * This is checked at queue time rather than at send time on purpose: an
 * approver looking at a list should be looking at things that are actually
 * sendable, not filtering out broken ones by hand.
 *
 * The presence requirement is the part worth stating. Without it the critic gate
 * would be skippable by simply never invoking it — no critique row means no
 * failing check row means sendable, so the strictest gate in the system would be
 * the one easiest to bypass, and it would bypass silently. A variant that has
 * not been critiqued is not "provisionally fine"; it is unreviewed, and it says
 * so with the command that fixes it.
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

  const { data: checks } = await supabase
    .from('marketing_variant_checks')
    .select('rule, passed, detail')
    .eq('variant_id', variantId)

  const rows = checks ?? []

  const failed = rows.filter((c) => !c.passed)
  if (failed.length > 0) {
    const names = failed.map((f) => `${f.rule}${f.detail ? ` (${f.detail})` : ''}`)
    return { ok: false, reason: `Failed checks: ${names.join('; ')}` }
  }

  if (variant.status !== 'ready') {
    return { ok: false, reason: `Variant has not been checked (status: ${variant.status})` }
  }

  const ruled = new Set(rows.map((c) => c.rule as string))
  const missing = CRITICS.filter((c) => !ruled.has(c))
  if (missing.length > 0) {
    return {
      ok: false,
      reason:
        `Not critiqued yet: ${missing.join(', ')}. Run the critics from the Variants tab, ` +
        `or by hand with scripts/db/critique-variant-manual.ts.`,
    }
  }

  return { ok: true }
}
