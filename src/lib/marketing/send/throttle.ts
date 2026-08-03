import type { SupabaseClient } from '@supabase/supabase-js'
import { unsubscribeConfigError } from './unsubscribe-token'

/**
 * Send throttling.
 *
 * Deliberately not `src/lib/rate-limit.ts`. That one is keyed on `ip_address`
 * for the public widget and does a read-then-upsert with a gap between the two,
 * which is fine when the cost of a miscount is one extra chat message. Here a
 * miscount is an extra cold email from a domain whose reputation is the whole
 * asset.
 *
 * There is also no counter table, on purpose: `marketing_sends` already records
 * every send with a timestamp, so the limit is derived from the ledger rather
 * than tracked beside it. A counter that can drift from the thing it counts is
 * a worse guarantee than a slightly more expensive query.
 *
 * The residual race — two dispatch runs overlapping and both reading the same
 * count — is bounded by the per-run cap and is not defended against here. The
 * per-send claim in `dispatch.ts` is what prevents the same row going twice;
 * this only shapes volume, and at single-digit daily sends an overlap costs at
 * most one extra email.
 */

export interface ThrottleLimits {
  perRun: number
  perHour: number
  perDay: number
  /** Don't email the same prospect again inside this window, on any campaign. */
  prospectCooldownDays: number
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/**
 * Low by default and meant to stay low. This is one person's Gmail account, not
 * a sending platform — volume is not the constraint the loop is short of.
 */
export function sendLimits(): ThrottleLimits {
  return {
    perRun: envInt('MARKETING_SENDS_PER_RUN', 5),
    perHour: envInt('MARKETING_SENDS_PER_HOUR', 8),
    perDay: envInt('MARKETING_SENDS_PER_DAY', 20),
    prospectCooldownDays: envInt('MARKETING_PROSPECT_COOLDOWN_DAYS', 30),
  }
}

async function countSentSince(supabase: SupabaseClient, since: Date): Promise<number> {
  const { count, error } = await supabase
    .from('marketing_sends')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', since.toISOString())
  if (error) throw new Error(`Failed to count recent sends: ${error.message}`)
  return count ?? 0
}

export interface Allowance {
  allowed: number
  limits: ThrottleLimits
  sentLastHour: number
  sentLastDay: number
  /** Which limit is doing the binding, when allowed is 0. */
  reason: string | null
}

export async function sendAllowance(supabase: SupabaseClient): Promise<Allowance> {
  const limits = sendLimits()
  const now = Date.now()

  const [sentLastHour, sentLastDay] = await Promise.all([
    countSentSince(supabase, new Date(now - 60 * 60 * 1000)),
    countSentSince(supabase, new Date(now - 24 * 60 * 60 * 1000)),
  ])

  const hourRoom = Math.max(0, limits.perHour - sentLastHour)
  const dayRoom = Math.max(0, limits.perDay - sentLastDay)
  const allowed = Math.min(limits.perRun, hourRoom, dayRoom)

  let reason: string | null = null
  if (allowed === 0) {
    if (dayRoom === 0) reason = `Daily cap reached (${sentLastDay}/${limits.perDay} in 24h)`
    else if (hourRoom === 0) reason = `Hourly cap reached (${sentLastHour}/${limits.perHour} in 1h)`
    else reason = 'Per-run cap is zero'
  }

  return { allowed, limits, sentLastHour, sentLastDay, reason }
}

export interface ProspectGate {
  ok: boolean
  reason: string | null
}

/**
 * Whether this prospect may be contacted at all right now.
 *
 * Ordered by how absolute each answer is. Whether an unsubscribe link can be
 * built is a property of the deployment, not of anyone in it, so it is asked
 * before the database is touched. Suppression is next and is absolute — someone
 * who asked not to be contacted is not subject to a cooldown, they are done.
 * The cooldown then
 * covers the ordinary case: a prospect who was emailed recently on some other
 * campaign should not hear from us again this month.
 */
export async function prospectSendGate(
  supabase: SupabaseClient,
  prospectId: string
): Promise<ProspectGate> {
  // Before anything about this particular prospect: can a recipient get out at
  // all? A missing signing key or site URL means the unsubscribe link cannot be
  // built, and marketing mail with no way out of it is the thing this whole
  // phase exists to prevent. Fail closed, so it cannot happen by misconfiguration
  // rather than by decision.
  const unsubscribeProblem = unsubscribeConfigError()
  if (unsubscribeProblem) {
    return { ok: false, reason: `Unsubscribe link unavailable — ${unsubscribeProblem}` }
  }

  const { data: prospect, error } = await supabase
    .from('marketing_prospects')
    .select('id, email, suppressed_at, suppression_reason')
    .eq('id', prospectId)
    .maybeSingle()

  if (error) return { ok: false, reason: `Failed to load prospect: ${error.message}` }
  if (!prospect) return { ok: false, reason: 'Prospect not found' }
  if (!prospect.email) return { ok: false, reason: 'Prospect has no email address' }
  if (prospect.suppressed_at) {
    return {
      ok: false,
      reason: `Suppressed${prospect.suppression_reason ? `: ${prospect.suppression_reason}` : ''}`,
    }
  }

  const { prospectCooldownDays } = sendLimits()
  if (prospectCooldownDays > 0) {
    const since = new Date(Date.now() - prospectCooldownDays * 24 * 60 * 60 * 1000)
    const { data: recent, error: recentError } = await supabase
      .from('marketing_sends')
      .select('sent_at')
      .eq('prospect_id', prospectId)
      .eq('status', 'sent')
      .gte('sent_at', since.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentError) {
      return { ok: false, reason: `Failed to check cooldown: ${recentError.message}` }
    }
    if (recent) {
      return {
        ok: false,
        reason: `Contacted ${new Date(recent.sent_at as string).toISOString().slice(0, 10)} — inside the ${prospectCooldownDays}-day cooldown`,
      }
    }
  }

  return { ok: true, reason: null }
}
