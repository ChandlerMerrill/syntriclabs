import type { ChannelAdapter, SendResult } from './types'

/**
 * LinkedIn — queue only.
 *
 * There is no sanctioned API for sending connection requests or InMail from a
 * personal account, and the automation tools that do it work by driving the
 * logged-in session, which is exactly what gets accounts restricted. The
 * downside is asymmetric: the account being throttled costs more than the
 * messages were worth.
 *
 * So the loop does the part it can defend — pick the prospect, generate the
 * copy, run the brand checks, hold it for approval — and a human sends it. The
 * send is still recorded, so LinkedIn outcomes land in the same performance
 * view as email.
 */
export const linkedinAdapter: ChannelAdapter = {
  channel: 'linkedin',
  automated: false,
  manualReason:
    'LinkedIn has no sanctioned send API. Copy it from the outbox and send it by hand, then mark it sent.',

  async send(): Promise<SendResult> {
    return {
      ok: false,
      error:
        'LinkedIn is queue-only — nothing sends automatically. Send it by hand and mark the row sent.',
      retryable: false,
    }
  },
}
