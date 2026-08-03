import { FOUNDER } from '@/lib/founder-profile'

const BRAND_PURPLE = '#8B5CF6'
const BRAND_PURPLE_DARK = '#6D28D9'
const BRAND_TINT_BG = '#FAF5FF'
const BRAND_TINT_BORDER = '#EDE9FE'
const TEXT_DARK = '#0F172A'
const TEXT_BODY = '#334155'
const TEXT_MUTED = '#64748B'
const BORDER_LIGHT = '#E2E8F0'
const BG_LIGHT = '#F8FAFC'
const BRAND_FONT = "'Rajdhani', 'Helvetica Neue', Arial, sans-serif"

const MASCOT_BADGE = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="44" style="width:44px;background-color:#475569;background-image:linear-gradient(135deg,#475569,#1E293B);border-radius:22px;border-collapse:separate">
  <tr>
    <td align="center" valign="middle" height="44" style="height:44px;line-height:0;padding:0;text-align:center;vertical-align:middle;border-radius:22px">
      <img src="https://www.syntriclabs.com/images/syntric-mascot.png" alt="" width="33" height="44" style="display:block;margin:0 auto;width:33px;height:44px;border:0;outline:none;text-decoration:none">
    </td>
  </tr>
</table>`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineMarkdown(line: string): string {
  return line
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
      `<a href="${url}" style="color:${BRAND_PURPLE};text-decoration:underline">${text}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function markdownToHtml(md: string): string {
  const escaped = escapeHtml(md.trim())
  const paragraphs = escaped.split(/\n\s*\n/)

  return paragraphs.map(para => {
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return ''

    if (lines.every(l => /^[-*]\s+/.test(l))) {
      const items = lines.map(l => `<li style="margin:0 0 6px">${inlineMarkdown(l.replace(/^[-*]\s+/, ''))}</li>`).join('')
      return `<ul style="margin:0 0 16px;padding-left:20px;color:${TEXT_BODY};font-size:15px;line-height:1.65">${items}</ul>`
    }

    if (lines.every(l => /^\d+\.\s+/.test(l))) {
      const items = lines.map(l => `<li style="margin:0 0 6px">${inlineMarkdown(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')
      return `<ol style="margin:0 0 16px;padding-left:20px;color:${TEXT_BODY};font-size:15px;line-height:1.65">${items}</ol>`
    }

    const html = lines.map(l => inlineMarkdown(l)).join('<br>')
    return `<p style="margin:0 0 16px;color:${TEXT_BODY};font-size:15px;line-height:1.65">${html}</p>`
  }).filter(Boolean).join('')
}

export interface BrandedEmailOptions {
  /**
   * The "sent by an AI assistant" banner.
   *
   * On by default because the agent paths send without a human in the loop and
   * the disclosure is load-bearing there. Marketing turns it off: every one of
   * those messages is approved by Chandler personally before it leaves, so
   * "sent by Chandler" is the accurate description, and announcing automation
   * on a first contact undercuts the thing the email is trying to be.
   */
  assistantBanner?: boolean
  /**
   * The footer CTA button. `null` omits it.
   *
   * Marketing omits it: the brand gate allows one ask, and a calendar button on
   * top of the body's question is the second one — precisely the "proof link
   * plus a calendar link" case `checkOneAsk` exists to prevent.
   */
  ctaUrl?: string | null
  ctaLabel?: string
  /**
   * Footer unsubscribe link. Omitted when absent.
   *
   * Optional here, unlike in `renderMessage`, because this template is shared:
   * `/api/documents/send` and `/api/email-preview` use it for transactional mail
   * a person asked for, which is not something to unsubscribe from. Marketing
   * passes it on every send, and its own renderer requires it.
   */
  unsubscribeUrl?: string
  /** Footer identity. Defaults to the founder profile. */
  signature?: {
    name?: string
    title?: string
    company?: string
    email?: string
    phone?: string
  }
}

export function renderBrandedEmail(body: string, options: BrandedEmailOptions = {}): string {
  const bodyHtml = markdownToHtml(body)

  const assistantBanner = options.assistantBanner ?? true
  const ctaUrl = options.ctaUrl === undefined ? FOUNDER.calendlyUrl : options.ctaUrl
  const ctaLabel = options.ctaLabel ?? 'Schedule a call →'

  const sigName = options.signature?.name ?? FOUNDER.fullName
  const sigTitle = options.signature?.title ?? FOUNDER.title
  const sigCompany = options.signature?.company ?? FOUNDER.company
  const sigEmail = options.signature?.email ?? FOUNDER.email
  const sigPhone = options.signature?.phone ?? FOUNDER.phone
  const sigPhoneTel = sigPhone.replace(/[^\d+]/g, '')

  const bannerRow = assistantBanner
    ? `<tr><td style="padding:12px 32px;background:${BRAND_TINT_BG};border-top:1px solid ${BRAND_TINT_BORDER};border-bottom:1px solid ${BRAND_TINT_BORDER}">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;padding-right:12px">
                ${MASCOT_BADGE}
              </td>
              <td style="vertical-align:middle;color:${BRAND_PURPLE_DARK};font-size:12px;font-weight:600;letter-spacing:0.02em">
                Sent by ${FOUNDER.firstName}'s AI assistant on his behalf
              </td>
            </tr>
          </table>
        </td></tr>`
    : ''

  const ctaRow = ctaUrl
    ? `<tr><td style="padding:0 32px 28px 32px">
          <a href="${ctaUrl}" style="display:inline-block;background:${BRAND_PURPLE};color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;letter-spacing:0.01em">${escapeHtml(ctaLabel)}</a>
        </td></tr>`
    : ''

  const unsubscribeRow = options.unsubscribeUrl
    ? `<tr><td align="center" style="padding:0 32px 24px 32px;background:${BG_LIGHT}">
          <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${TEXT_MUTED};font-size:11px;text-decoration:underline">Unsubscribe</a>
        </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
  <style>@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${BG_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_LIGHT};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border:1px solid ${BORDER_LIGHT};border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.04)">

        <tr><td style="height:4px;background:${BRAND_PURPLE};line-height:4px;font-size:0">&nbsp;</td></tr>

        <tr><td style="padding:22px 32px 18px 32px">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;padding-right:12px">
                <img src="https://www.syntriclabs.com/images/updated-logo.png" alt="" height="44" style="display:block;height:44px;width:auto;border:0;outline:none">
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0;font-size:28px;font-weight:700;color:${TEXT_DARK};letter-spacing:-0.01em;font-family:${BRAND_FONT}">${FOUNDER.company}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        ${bannerRow}

        <tr><td style="padding:32px 32px 24px 32px">${bodyHtml}</td></tr>

        ${ctaRow}

        <tr><td style="padding:24px 32px 28px 32px;background:${BG_LIGHT};border-top:1px solid ${BORDER_LIGHT}">
          <p style="margin:0 0 4px;color:${TEXT_DARK};font-size:17px;font-weight:600">${escapeHtml(sigName)}</p>
          <p style="margin:0 0 14px;color:${TEXT_MUTED};font-size:13px">${escapeHtml(sigTitle)}, ${escapeHtml(sigCompany)}</p>
          <p style="margin:0 0 22px;color:${TEXT_MUTED};font-size:13px;line-height:1.7">
            <a href="mailto:${sigEmail}" style="color:${TEXT_MUTED};text-decoration:none">${escapeHtml(sigEmail)}</a>
            &nbsp;·&nbsp;
            <a href="tel:${sigPhoneTel}" style="color:${TEXT_MUTED};text-decoration:none">${escapeHtml(sigPhone)}</a>
          </p>
          <div style="text-align:center">
            <img src="https://www.syntriclabs.com/images/Syntric-logo-pill.png" alt="Syntric" width="120" style="width:120px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none">
          </div>
        </td></tr>

        ${unsubscribeRow}

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
