import type { BrandProfile } from '../config/brand-profile'
import type { MarketingProspect, MarketingVariant } from '../types'
import { renderMessage, type SendTemplate } from './templates'
import { unsubscribeUrl } from './unsubscribe-token'

/**
 * Rendering a variant for one prospect.
 *
 * The result is stored on the send row rather than recomputed at send time, so
 * what a human approved is byte-for-byte what goes out. Editing the variant
 * afterwards cannot change an already-approved send.
 *
 * An unresolved token is a hard failure, never a silent blank. "Hi ," in a cold
 * email is worse than not sending — it tells the reader exactly how the message
 * was produced.
 */

const TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/g

export interface RenderResult {
  subject: string
  /** Plain text, signature included. What a human reads in the outbox. */
  body: string
  /** Exactly what ships, in the chosen treatment. */
  html: string
  /** Which presentation produced `html`. Recorded so the arms can be compared. */
  template: SendTemplate
  /** Token names that had no value. Non-empty means this must not be sent. */
  missing: string[]
}

export function tokenValues(prospect: Pick<MarketingProspect, 'company' | 'contact_name'>) {
  const first = prospect.contact_name?.trim().split(/\s+/)[0] ?? ''
  return {
    company: prospect.company?.trim() ?? '',
    first_name: first,
  }
}

export function renderTemplate(
  text: string,
  values: Record<string, string>
): { text: string; missing: string[] } {
  const missing: string[] = []
  const rendered = text.replace(TOKEN_RE, (_match, name: string) => {
    const value = values[name]
    if (!value) {
      missing.push(name)
      return ''
    }
    return value
  })
  return { text: rendered, missing: [...new Set(missing)] }
}

export function renderSend(
  variant: Pick<MarketingVariant, 'subject' | 'body'>,
  prospect: Pick<MarketingProspect, 'id' | 'company' | 'contact_name'>,
  profile: BrandProfile,
  template: SendTemplate = 'plain'
): RenderResult {
  const values = tokenValues(prospect)

  const subject = renderTemplate(variant.subject ?? '', values)
  const body = renderTemplate(variant.body ?? '', values)

  // Both forms are produced here, at queue time, and both are stored. Deriving
  // the HTML later would mean a profile edit between approval and send could
  // change what goes out after a human signed off on it.
  //
  // The unsubscribe link is frozen with them. It has to be: the same freeze that
  // makes approval byte-for-byte would otherwise leave the one part of the
  // message a recipient acts on out of what was approved.
  const message = renderMessage(template, body.text, profile, unsubscribeUrl(prospect.id))

  return {
    subject: subject.text.trim(),
    body: message.text,
    html: message.html,
    template,
    missing: [...new Set([...subject.missing, ...body.missing])],
  }
}
