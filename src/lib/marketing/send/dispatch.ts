import { createServiceClient } from '@/lib/supabase/server'
import { channelAdapter, automatedChannels } from '../channels'
import { assertVariantSendable } from '../review/gate'
import { sendAllowance, prospectSendGate } from './throttle'
import type { MarketingChannel, MarketingSend } from '../types'

/**
 * The sender.
 *
 * Everything here exists to make two things true no matter how the process
 * dies or how many copies of it are running:
 *
 *   1. A send that was not approved by a human never goes out. The schema's
 *      CHECK already refuses the row; this refuses the code path.
 *   2. A send goes out at most once.
 *
 * (2) is the hard one, because "mark it sending, then send" and "send, then
 * mark it sent" both double-send under a crash or a concurrent worker. The
 * claim below is a compare-and-set — the same shape as
 * `src/lib/ai/confirm-tokens.ts:57` — so exactly one worker can move a row out
 * of `approved`, and a worker that dies mid-send leaves `claimed_at` stamped
 * with status `sending`, which is how a stuck row is found rather than silently
 * retried into a duplicate.
 */

/** Attempts across dispatch runs before a send is given up on. */
const MAX_ATTEMPTS = 3
/** Retries inside one attempt, for transient transport failures. */
const TRANSIENT_RETRIES = 2
const BACKOFF_MS = [1000, 4000]

export interface DispatchOutcome {
  sendId: string
  status: 'sent' | 'failed' | 'skipped' | 'requeued'
  detail: string | null
}

export interface DispatchResult {
  claimed: number
  sent: number
  failed: number
  skipped: number
  requeued: number
  allowance: number
  throttleReason: string | null
  outcomes: DispatchOutcome[]
}

interface ApprovedSendRow extends MarketingSend {
  marketing_prospects: { id: string; email: string | null; company: string } | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sends with bounded retry on transient failures only.
 *
 * The shared Gmail client has no backoff and collapses every error into a
 * string; `classifyGmailError` in the email adapter turns that back into a
 * retryable/permanent decision. A permanent failure returns immediately —
 * retrying a malformed address three times just delays the error reaching a
 * human.
 */
async function sendWithRetry(
  channel: MarketingChannel,
  req: { to: string; subject: string; body: string }
) {
  const adapter = channelAdapter(channel)
  let last = await adapter.send(req)

  for (let attempt = 0; attempt < TRANSIENT_RETRIES && !last.ok && last.retryable; attempt++) {
    await sleep(BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1])
    last = await adapter.send(req)
  }

  return last
}

export async function dispatchApprovedSends(opts?: { limit?: number }): Promise<DispatchResult> {
  const supabase = await createServiceClient()

  const allowance = await sendAllowance(supabase)
  const budget = Math.min(allowance.allowed, opts?.limit ?? allowance.allowed)

  const result: DispatchResult = {
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    requeued: 0,
    allowance: budget,
    throttleReason: allowance.reason,
    outcomes: [],
  }

  if (budget <= 0) return result

  // Only channels that can actually deliver. LinkedIn sends stay `approved`
  // for a human to send by hand — claiming them would strand them in `sending`.
  const { data: candidates, error } = await supabase
    .from('marketing_sends')
    .select('*, marketing_prospects ( id, email, company )')
    .eq('status', 'approved')
    .in('channel', automatedChannels())
    .lt('attempt_count', MAX_ATTEMPTS)
    .order('approved_at', { ascending: true })
    .limit(budget)

  if (error) throw new Error(`Failed to load approved sends: ${error.message}`)

  for (const row of (candidates ?? []) as unknown as ApprovedSendRow[]) {
    if (result.sent >= budget) break

    // Pre-claim checks. Cheap, and a failure here should not consume the claim.
    const gate = await prospectSendGate(supabase, row.prospect_id)
    if (!gate.ok) {
      result.skipped++
      result.outcomes.push({ sendId: row.id, status: 'skipped', detail: gate.reason })
      continue
    }

    const sendable = await assertVariantSendable(supabase, row.variant_id)
    if (!sendable.ok) {
      result.skipped++
      result.outcomes.push({ sendId: row.id, status: 'skipped', detail: sendable.reason })
      continue
    }

    // The claim. `.eq('status', 'approved')` makes this a compare-and-set:
    // a second worker holding the same row gets zero rows back and moves on.
    // The approval columns are re-asserted here so a row that somehow reached
    // `approved` without them cannot be claimed at all.
    const { data: claimed } = await supabase
      .from('marketing_sends')
      .update({ status: 'sending', claimed_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'approved')
      .not('approved_by', 'is', null)
      .not('approved_at', 'is', null)
      .select('*')
      .maybeSingle()

    if (!claimed) {
      result.skipped++
      result.outcomes.push({
        sendId: row.id,
        status: 'skipped',
        detail: 'Already claimed, or not approved',
      })
      continue
    }

    result.claimed++

    const claimedRow = claimed as MarketingSend
    const attempt = (claimedRow.attempt_count ?? 0) + 1
    const to = row.marketing_prospects?.email

    if (!to) {
      await supabase
        .from('marketing_sends')
        .update({ status: 'failed', error: 'Prospect has no email address', attempt_count: attempt })
        .eq('id', row.id)
      result.failed++
      result.outcomes.push({ sendId: row.id, status: 'failed', detail: 'No email address' })
      continue
    }

    if (!claimedRow.rendered_subject || !claimedRow.rendered_body) {
      await supabase
        .from('marketing_sends')
        .update({ status: 'failed', error: 'Send was never rendered', attempt_count: attempt })
        .eq('id', row.id)
      result.failed++
      result.outcomes.push({ sendId: row.id, status: 'failed', detail: 'Not rendered' })
      continue
    }

    const outcome = await sendWithRetry(claimedRow.channel, {
      to,
      subject: claimedRow.rendered_subject,
      body: claimedRow.rendered_body,
    })

    if (outcome.ok) {
      await supabase
        .from('marketing_sends')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: outcome.providerMessageId,
          gmail_thread_id: outcome.threadId,
          error: null,
          attempt_count: attempt,
        })
        .eq('id', row.id)

      result.sent++
      result.outcomes.push({ sendId: row.id, status: 'sent', detail: outcome.providerMessageId })
      continue
    }

    // Retryable and attempts left → back to `approved` so the next run picks it
    // up. Otherwise it is done, and the error stays on the row to be read.
    const exhausted = attempt >= MAX_ATTEMPTS
    const requeue = outcome.retryable && !exhausted

    await supabase
      .from('marketing_sends')
      .update({
        status: requeue ? 'approved' : 'failed',
        claimed_at: null,
        error: outcome.error,
        attempt_count: attempt,
      })
      .eq('id', row.id)

    if (requeue) {
      result.requeued++
      result.outcomes.push({ sendId: row.id, status: 'requeued', detail: outcome.error })
    } else {
      result.failed++
      result.outcomes.push({ sendId: row.id, status: 'failed', detail: outcome.error })
    }
  }

  return result
}

/**
 * Rows stuck in `sending` past a grace period.
 *
 * A worker that died between the claim and the result leaves one of these. It
 * is deliberately not auto-requeued: the send may well have gone out, and the
 * Gmail sent folder is the only place that knows. Surfaced for a human instead.
 */
export async function stuckSends(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  olderThanMinutes = 15
): Promise<MarketingSend[]> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('marketing_sends')
    .select('*')
    .eq('status', 'sending')
    .lt('claimed_at', cutoff)
  if (error) throw new Error(`Failed to load stuck sends: ${error.message}`)
  return (data ?? []) as MarketingSend[]
}
