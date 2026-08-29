import { renderBrandedEmail } from '@/lib/email/branded-template'
import type { BrandProfile } from '../config/brand-profile'
import type { SendTemplate } from '../types'

/**
 * The two presentations a send can take, and the experiment between them.
 *
 * `plain` is the message as a person would have typed it: no wrapper, no
 * colour, no images, a `--` delimiter and the same signature block that ends a
 * reply Chandler writes by hand. `branded` is the organisation talking — the
 * Syntric shell, logo, and a formatted footer.
 *
 * Which one lands better is an open question, so it is recorded on the send
 * rather than decided once in code. Holding the copy constant and varying only
 * the presentation is the whole point: template is stored per send, so the same
 * variant can go out both ways and `marketing_template_performance` can compare
 * them without the copy being a confound.
 *
 * Two things the branded template gives up, deliberately, and the plain one
 * does not:
 *
 *   - **The logo is a remote image, which is an open-tracker.** Fetching it
 *     tells us the message was opened, roughly from where, in which client.
 *     `dispatch.ts` has never carried a tracking pixel on purpose; this is the
 *     same mechanism arriving as a side effect of wanting a logo. Worth knowing
 *     it is the branded arm's cost, not a free upgrade.
 *   - **Images-off is the common case.** Many clients block remote images by
 *     default, so the branded arm is frequently read as a logo-shaped hole. The
 *     plain arm has nothing to block.
 */

export type { SendTemplate }

export const SEND_TEMPLATES: SendTemplate[] = ['plain', 'branded']

export function isSendTemplate(value: unknown): value is SendTemplate {
  return typeof value === 'string' && (SEND_TEMPLATES as string[]).includes(value)
}

export interface RenderedMessage {
  /** Plain text, signature included. What a human reads in the outbox. */
  text: string
  /** Exactly what ships. Stored on the send so approval is byte-for-byte. */
  html: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type Signature = NonNullable<BrandProfile['voiceRules']['signature']>

/**
 * The signature as plain lines.
 *
 * `--` is the standard delimiter (RFC 3676): mail clients use it to fold the
 * signature away from the message, and its absence is one of the things that
 * makes bulk mail read as bulk mail.
 */
export function signatureText(sig: Signature): string {
  return [
    '--',
    sig.name,
    sig.title,
    sig.phone,
    sig.email,
    sig.website,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * The signature block, shaped like the one Chandler's Gmail appends.
 *
 * Deliberately styled as little as possible — bold name, default link colour,
 * a small logo — because the whole claim of the plain arm is that it looks like
 * a message a person typed. Every additional style is a tell.
 */
function signatureHtml(sig: Signature): string {
  // The name is the one line given its own size. Everything below it stays at
  // body size, which is what keeps the block reading as a signature rather than
  // as a second heading.
  const lines: string[] = [
    `<span style="font-size:17px;font-weight:bold">${escapeHtml(sig.name)}</span>`,
  ]
  if (sig.title) lines.push(escapeHtml(sig.title))
  if (sig.phone) lines.push(escapeHtml(sig.phone))
  if (sig.email) {
    lines.push(`<a href="mailto:${escapeHtml(sig.email)}">${escapeHtml(sig.email)}</a>`)
  }
  if (sig.website) {
    const href = sig.website.startsWith('http') ? sig.website : `https://${sig.website}`
    lines.push(`<a href="${escapeHtml(href)}">${escapeHtml(sig.website)}</a>`)
  }

  // Sized down hard. The asset is a full-resolution logo; left unconstrained it
  // arrives as a banner across the message rather than a signature mark.
  const logo = sig.logoUrl
    ? `<br><img src="${escapeHtml(sig.logoUrl)}" alt="Syntric" width="110" style="width:110px;height:auto;border:0;outline:none;text-decoration:none;margin-top:6px">`
    : ''

  return lines.join('<br>') + logo
}

/**
 * Plain text to the least HTML that still renders it faithfully.
 *
 * No styling, no wrapper table, no tracking pixel. A cold email that looks like
 * a newsletter gets read like one.
 */
export function plainTextToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

/**
 * No opt-out line in the body, by explicit instruction.
 *
 * This footer has now been a tracked link, then a reply sentence, then nothing.
 * Recording why, because "there used to be one" is the sort of thing that gets
 * quietly restored by someone who assumes it was an oversight:
 *
 *   - These are one-shot sends. Nothing follows unless the recipient replies, so
 *     an opt-out stops a sequence that was never going to run.
 *   - The first preflight landed in Gmail's Promotions tab. An opt-out notice in
 *     the body is one of the signals that puts it there, and the whole premise of
 *     the plain arm is that it reads as correspondence rather than as a mailing.
 *   - Chandler handles "do not contact me" by hand — a reply gets the prospect
 *     suppressed. See `eval/suppress.ts`.
 *
 * KNOWN AND ACCEPTED: CAN-SPAM requires a commercial email to carry a clear
 * opt-out mechanism and a physical postal address. Neither is present now. This
 * was raised and is the sender's call, not an oversight. Nothing here should be
 * read as advice that it is compliant. Reinstating it is two lines — put the
 * sentence back in `renderPlain` and the `footerNote` back in `renderBranded`.
 */

/** The plain arm: body, delimiter, signature. Nothing else. */
function renderPlain(body: string, sig: Signature | null): RenderedMessage {
  const trimmed = body.trim()
  const signed = sig ? `${trimmed}\n\n${signatureText(sig)}` : trimmed
  const text = signed

  const html =
    (sig
      ? `${plainTextToHtml(trimmed)}\n<p>--<br>${signatureHtml(sig)}</p>`
      : plainTextToHtml(trimmed))

  return { text, html }
}

/**
 * The branded arm.
 *
 * The assistant banner and the calendar CTA are both switched off: every
 * marketing send is approved by a person before it leaves, and the CTA button
 * would be a second ask on top of the one the body already carries — which is
 * what `checkOneAsk` exists to prevent.
 */
function renderBranded(body: string, sig: Signature | null): RenderedMessage {
  const trimmed = body.trim()
  const signed = sig ? `${trimmed}\n\n${signatureText(sig)}` : trimmed
  const text = signed

  const html = renderBrandedEmail(trimmed, {
    assistantBanner: false,
    ctaUrl: null,
    signature: sig
      ? {
          name: sig.name,
          title: sig.title,
          email: sig.email,
          phone: sig.phone,
        }
      : undefined,
  })

  return { text, html }
}

/**
 * Renders a body in the requested treatment.
 *
 * Falls back to the profile's legacy `signOff` string when no structured
 * signature is on file, so a profile that predates this still signs its mail.
 *
 * This used to take an `unsubscribeUrl` and print it. It no longer does, so it no
 * longer asks for one — a required parameter that nothing reads is a guard that
 * has stopped guarding. See the note above `renderPlain` for where the opt-out
 * went and why.
 */
export function renderMessage(
  template: SendTemplate,
  body: string,
  profile: BrandProfile
): RenderedMessage {
  const sig = profile.voiceRules.signature ?? null

  if (!sig) {
    const signOff = profile.voiceRules.signOff?.trim()
    const trimmed = body.trim()
    const signed = signOff ? `${trimmed}\n\n${signOff}` : trimmed
    return {
      text: signed,
      html:
        template === 'branded'
          ? renderBrandedEmail(signed, {
              assistantBanner: false,
              ctaUrl: null,
            })
          : plainTextToHtml(signed),
    }
  }

  return template === 'branded'
    ? renderBranded(body, sig)
    : renderPlain(body, sig)
}
