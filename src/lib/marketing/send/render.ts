import type { BrandProfile } from '../config/brand-profile'
import type { MarketingProspect, MarketingVariant } from '../types'
import { renderMessage, type SendTemplate } from './templates'

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

export function tokenValues(
  prospect: Pick<MarketingProspect, 'company' | 'contact_name' | 'found_via'>
) {
  const first = prospect.contact_name?.trim().split(/\s+/)[0] ?? ''
  return {
    company: prospect.company?.trim() ?? '',
    first_name: first,
    // Empty rather than absent when unset, so `renderTemplate` reports it as
    // missing and the outbox skips the row. A variant that says "found you
    // through" must not be able to go out with nothing after it.
    found_via: prospect.found_via?.trim() ?? '',
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
  prospect: Pick<MarketingProspect, 'id' | 'company' | 'contact_name' | 'found_via'>,
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
  // The opt-out is a reply sentence rather than a link now, so there is no URL
  // to freeze alongside them — `dispatch.ts` mints the token for the
  // `List-Unsubscribe` header at send time, which is the path a message cannot
  // leave without.
  const message = renderMessage(template, body.text, profile)

  return {
    subject: subject.text.trim(),
    body: message.text,
    html: message.html,
    template,
    missing: [...new Set([...subject.missing, ...body.missing])],
  }
}
