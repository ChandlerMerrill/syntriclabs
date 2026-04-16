import { FOUNDER } from '@/lib/founder-profile'

const BRAND_PURPLE = '#8B5CF6'
const BRAND_PURPLE_DEEP = '#7C3AED'
const BRAND_PURPLE_DARK = '#6D28D9'
const BRAND_PURPLE_LIGHT = '#A78BFA'
const BRAND_TINT_BG = '#FAF5FF'
const BRAND_TINT_BORDER = '#EDE9FE'
const TEXT_DARK = '#0F172A'
const TEXT_BODY = '#334155'
const TEXT_MUTED = '#64748B'
const BORDER_LIGHT = '#E2E8F0'
const BG_LIGHT = '#F8FAFC'

const PHONE_TEL = FOUNDER.phone.replace(/[^\d+]/g, '')

const MASCOT_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
<rect x="7.5" y="0" width="1" height="1" fill="${BRAND_PURPLE_LIGHT}"/>
<rect x="5" y="1" width="6" height="5" fill="${BRAND_PURPLE}"/>
<rect x="7" y="3" width="1" height="1" fill="#FFFFFF"/>
<rect x="9" y="3" width="1" height="1" fill="#FFFFFF"/>
<rect x="6" y="6" width="4" height="4" fill="${BRAND_PURPLE_DEEP}"/>
<rect x="4" y="7" width="2" height="1" fill="${BRAND_PURPLE_DARK}"/>
<rect x="10" y="7" width="2" height="1" fill="${BRAND_PURPLE_DARK}"/>
<rect x="6" y="10" width="2" height="2" fill="${BRAND_PURPLE_DEEP}"/>
<rect x="8" y="10" width="2" height="2" fill="${BRAND_PURPLE_DEEP}"/>
</svg>`

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

export function renderBrandedEmail(body: string): string {
  const bodyHtml = markdownToHtml(body)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_LIGHT};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border:1px solid ${BORDER_LIGHT};border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.04)">

        <tr><td style="height:4px;background:${BRAND_PURPLE};line-height:4px;font-size:0">&nbsp;</td></tr>

        <tr><td style="padding:22px 32px 18px 32px">
          <p style="margin:0;font-size:20px;font-weight:700;color:${TEXT_DARK};letter-spacing:-0.02em">${FOUNDER.company}</p>
        </td></tr>

        <tr><td style="padding:12px 32px;background:${BRAND_TINT_BG};border-top:1px solid ${BRAND_TINT_BORDER};border-bottom:1px solid ${BRAND_TINT_BORDER}">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px">
                <div style="width:28px;height:28px;background:#FFFFFF;border:1px solid ${BRAND_TINT_BORDER};border-radius:50%;text-align:center;line-height:28px">
                  ${MASCOT_SVG}
                </div>
              </td>
              <td style="vertical-align:middle;color:${BRAND_PURPLE_DARK};font-size:12px;font-weight:600;letter-spacing:0.02em">
                Sent by ${FOUNDER.firstName}'s AI assistant on his behalf
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:32px 32px 24px 32px">${bodyHtml}</td></tr>

        <tr><td style="padding:0 32px 28px 32px">
          <a href="${FOUNDER.calendlyUrl}" style="display:inline-block;background:${BRAND_PURPLE};color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;letter-spacing:0.01em">Schedule a call →</a>
        </td></tr>

        <tr><td style="padding:24px 32px 28px 32px;background:${BG_LIGHT};border-top:1px solid ${BORDER_LIGHT}">
          <p style="margin:0 0 4px;color:${TEXT_DARK};font-size:14px;font-weight:600">${FOUNDER.fullName}</p>
          <p style="margin:0 0 14px;color:${TEXT_MUTED};font-size:13px">${FOUNDER.title}, ${FOUNDER.company}</p>
          <p style="margin:0 0 22px;color:${TEXT_MUTED};font-size:13px;line-height:1.7">
            <a href="mailto:${FOUNDER.email}" style="color:${TEXT_MUTED};text-decoration:none">${FOUNDER.email}</a>
            &nbsp;·&nbsp;
            <a href="tel:${PHONE_TEL}" style="color:${TEXT_MUTED};text-decoration:none">${FOUNDER.phone}</a>
          </p>
          <div style="text-align:center">
            <img src="https://www.syntriclabs.com/images/Syntric-logo-pill.png" alt="Syntric" width="120" style="width:120px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none">
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
