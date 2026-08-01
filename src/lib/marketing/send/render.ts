import type { BrandProfile } from '../config/brand-profile'
import type { MarketingProspect, MarketingVariant } from '../types'

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
  body: string
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
  prospect: Pick<MarketingProspect, 'company' | 'contact_name'>,
  profile: BrandProfile
): RenderResult {
  const values = tokenValues(prospect)

  const subject = renderTemplate(variant.subject ?? '', values)
  const body = renderTemplate(variant.body ?? '', values)

  const signOff = profile.voiceRules.signOff?.trim()
  const withSignOff = signOff ? `${body.text.trim()}\n\n${signOff}` : body.text.trim()

  return {
    subject: subject.text.trim(),
    body: withSignOff,
    missing: [...new Set([...subject.missing, ...body.missing])],
  }
}
