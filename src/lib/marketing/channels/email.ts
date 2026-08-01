import { sendMessage } from '@/lib/gmail/client'
import { plainTextToHtml } from '../send/templates'
import type { ChannelAdapter, SendRequest, SendResult } from './types'

/**
 * Email, over the existing Gmail client.
 *
 * Two things the shared client does not do, added here rather than there
 * because the rest of the app depends on its current behaviour:
 *
 *   - `gmailAPI` throws `Error("Gmail API messages/send: 429 - …")`, collapsing
 *     every failure into a string. The dispatcher needs to know whether to try
 *     again, so the status is parsed back out and classified.
 *   - `buildRFC2822Message` hardcodes `Content-Type: text/html`, so a body
 *     written as plain text with blank lines would arrive as one run-on
 *     paragraph. Cold copy is written as plain text and has to look like it.
 */

/** Matches the shape gmailAPI throws: `Gmail API <path>: <status> - <message>`. */
const STATUS_RE = /:\s(\d{3})\s-\s/

export { plainTextToHtml } from '../send/templates'

export function classifyGmailError(err: unknown): { error: string; retryable: boolean; status?: number } {
  const message = err instanceof Error ? err.message : String(err)
  const status = Number(message.match(STATUS_RE)?.[1] ?? NaN)

  // No status parsed — a network failure, DNS, abort. Worth another attempt.
  if (Number.isNaN(status)) return { error: message, retryable: true }

  if (status === 429) return { error: message, retryable: true, status }
  if (status >= 500) return { error: message, retryable: true, status }

  // Gmail returns 403 both for "you may not do this" and for rate/quota
  // exhaustion. Only the latter is worth retrying.
  if (status === 403 && /rate|quota|limit/i.test(message)) {
    return { error: message, retryable: true, status }
  }

  return { error: message, retryable: false, status }
}

export const emailAdapter: ChannelAdapter = {
  channel: 'email',
  automated: true,
  manualReason: null,

  async send(req: SendRequest): Promise<SendResult> {
    try {
      const res = await sendMessage({
        to: req.to,
        subject: req.subject,
        // Whatever the outbox stored, byte for byte. Only an unrendered send
        // falls back to converting the plain text here.
        body: req.html || plainTextToHtml(req.body),
        threadId: req.threadId,
        inReplyTo: req.inReplyTo,
        references: req.references,
      })
      return {
        ok: true,
        providerMessageId: res.id,
        threadId: res.threadId ?? null,
      }
    } catch (err) {
      return { ok: false, ...classifyGmailError(err) }
    }
  },
}
