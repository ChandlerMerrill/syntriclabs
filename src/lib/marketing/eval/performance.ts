import type { SupabaseClient } from '@supabase/supabase-js'
import { listVariantPerformance } from '../services'
import type { VariantPerformance } from '../types'

/**
 * Performance, with the sample size attached to every number.
 *
 * `marketing-agents.md` §3.1 is still right that the optimization signal is not
 * there at this volume. So this module's job is to make that visible rather
 * than to pick a winner: every rate carries its n, and anything under the
 * threshold is labelled as not yet meaning anything.
 *
 * The threshold is not a statistical test — with single-digit sends a test
 * would be theatre. It is a blunt line under which the UI refuses to rank.
 */

/** Below this many sends, a rate is a description of what happened, not a rate. */
export const MIN_SAMPLE_FOR_SIGNAL = 20

export interface RatedVariant extends VariantPerformance {
  /** Whether this row has enough sends to be compared to another. */
  hasSignal: boolean
  /** Human-readable n, e.g. "3 replies / 41 sent". */
  replyLabel: string
  sampleNote: string | null
}

export function rateVariant(row: VariantPerformance): RatedVariant {
  const hasSignal = row.sends >= MIN_SAMPLE_FOR_SIGNAL

  return {
    ...row,
    hasSignal,
    replyLabel: `${row.replies} / ${row.sends}`,
    sampleNote: hasSignal
      ? null
      : row.sends === 0
        ? 'Never sent'
        : `n=${row.sends} — too few to compare (needs ${MIN_SAMPLE_FOR_SIGNAL})`,
  }
}

export async function variantPerformance(
  supabase: SupabaseClient,
  opts?: { campaignId?: string }
): Promise<RatedVariant[]> {
  const rows = await listVariantPerformance(supabase, opts)
  return rows.map(rateVariant)
}

export interface PerformanceTotals {
  variants: number
  sends: number
  replies: number
  bounces: number
  scored: number
  replyRate: number | null
  bounceRate: number | null
  /** True when the whole corpus is still too small to rank anything. */
  belowSignal: boolean
}

export function totals(rows: VariantPerformance[]): PerformanceTotals {
  const sends = rows.reduce((n, r) => n + r.sends, 0)
  const replies = rows.reduce((n, r) => n + r.replies, 0)
  const bounces = rows.reduce((n, r) => n + r.bounces, 0)
  const scored = rows.reduce((n, r) => n + r.scored, 0)

  return {
    variants: rows.length,
    sends,
    replies,
    bounces,
    scored,
    // Null rather than 0 when nothing has been sent. A 0% that means "no data"
    // and a 0% that means "measured, nobody replied" are different facts.
    replyRate: sends > 0 ? replies / sends : null,
    bounceRate: sends > 0 ? bounces / sends : null,
    belowSignal: sends < MIN_SAMPLE_FOR_SIGNAL,
  }
}

/** Formats a rate with its sample size. There is no formatter that omits n. */
export function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return `— (n=0)`
  return `${((numerator / denominator) * 100).toFixed(1)}% (${numerator}/${denominator})`
}
