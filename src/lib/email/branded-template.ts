import { FOUNDER } from '@/lib/founder-profile'

const BRAND_PURPLE = '#8B5CF6'
const TEXT_DARK = '#0F172A'
const TEXT_BODY = '#334155'
const TEXT_MUTED = '#64748B'
const BORDER_LIGHT = '#E2E8F0'
const BG_LIGHT = '#F8FAFC'

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
      return `<ul style="margin:0 0 16px;padding-left:20px;color:${TEXT_BODY};font-size:15px;line-height:1.6">${items}</ul>`
    }

    if (lines.every(l => /^\d+\.\s+/.test(l))) {
      const items = lines.map(l => `<li style="margin:0 0 6px">${inlineMarkdown(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')
      return `<ol style="margin:0 0 16px;padding-left:20px;color:${TEXT_BODY};font-size:15px;line-height:1.6">${items}</ol>`
    }

    const html = lines.map(l => inlineMarkdown(l)).join('<br>')
    return `<p style="margin:0 0 16px;color:${TEXT_BODY};font-size:15px;line-height:1.6">${html}</p>`
  }).filter(Boolean).join('')
}

export function renderBrandedEmail(body: string): string {
  const bodyHtml = markdownToHtml(body)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${BG_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_LIGHT};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border:1px solid ${BORDER_LIGHT};border-radius:12px;overflow:hidden">
        <tr><td style="padding:24px 32px;border-bottom:1px solid ${BORDER_LIGHT}">
          <p style="margin:0;font-size:18px;font-weight:600;color:${TEXT_DARK};letter-spacing:-0.01em">${FOUNDER.company}</p>
        </td></tr>
        <tr><td style="padding:32px">${bodyHtml}</td></tr>
        <tr><td style="padding:24px 32px;background:${BG_LIGHT};border-top:1px solid ${BORDER_LIGHT}">
          <p style="margin:0 0 4px;color:${TEXT_DARK};font-size:14px;font-weight:600">${FOUNDER.fullName}</p>
          <p style="margin:0 0 12px;color:${TEXT_MUTED};font-size:13px">${FOUNDER.title}, ${FOUNDER.company}</p>
          <p style="margin:0 0 20px;color:${TEXT_MUTED};font-size:13px;line-height:1.7">
            <a href="mailto:${FOUNDER.email}" style="color:${TEXT_MUTED};text-decoration:none">${FOUNDER.email}</a>
            &nbsp;·&nbsp; ${FOUNDER.phone}
            <br>
            <a href="${FOUNDER.calendlyUrl}" style="color:${BRAND_PURPLE};text-decoration:none;font-weight:500">Schedule a call →</a>
          </p>
          <div style="text-align:center">
            <img src="https://www.syntriclabs.com/images/Syntric-logo-pill.png" alt="Syntric" width="140" style="width:140px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none">
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
