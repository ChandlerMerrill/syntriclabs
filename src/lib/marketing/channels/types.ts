import type { MarketingChannel } from '../types'

/**
 * The channel seam.
 *
 * Every channel gets the same shape so the dispatcher never branches on which
 * one it is holding. What actually differs between them is not how you call
 * them — it is whether they can deliver at all: email can, LinkedIn cannot
 * without violating its terms, and Meta ads are a Phase 5 problem behind app
 * review. `automated` is that difference, made explicit, so a channel that
 * can't deliver is skipped by the sender rather than failing inside it.
 */

export interface SendRequest {
  to: string
  subject: string
  /** Plain text. Adapters do their own transport-specific encoding. */
  body: string
  /**
   * Pre-rendered HTML, when the caller has already chosen a presentation.
   *
   * Passed through verbatim rather than regenerated, because it is what a human
   * approved. Absent, the adapter falls back to converting `body`.
   */
  html?: string | null
  /** Set when continuing an existing thread. */
  threadId?: string
  inReplyTo?: string
  references?: string
}

export interface SendSuccess {
  ok: true
  providerMessageId: string
  threadId: string | null
}

export interface SendFailure {
  ok: false
  error: string
  /**
   * Whether trying again could plausibly work. A 429 or a 503 is retryable; a
   * malformed address or a revoked token is not, and retrying it just burns
   * quota and delays the failure showing up.
   */
  retryable: boolean
  status?: number
}

export type SendResult = SendSuccess | SendFailure

export interface ChannelAdapter {
  channel: MarketingChannel
  /** False when delivery requires a human. The dispatcher will not claim these. */
  automated: boolean
  /** Why it isn't automated, shown in the outbox. Null when it is. */
  manualReason: string | null
  send(req: SendRequest): Promise<SendResult>
}
