/**
 * Internal notification emails — the ones that land in Chandler's inbox when
 * something happens on the site.
 *
 * These used to be a dark `<div>` with a bare table in it. They are the first
 * thing seen about a new lead, often on a phone, often at a bad moment, and the
 * old shape made a name, a phone number, and a paragraph of context all weigh
 * the same. This template gives them a hierarchy: who it is, how to reach them,
 * what they asked for, and one button that acts on it.
 *
 * The chrome deliberately matches `branded-template.ts` — same purple rule, same
 * logo lockup, same footer geometry — so an internal alert and an outbound email
 * read as the same system. What it does NOT share is that file's body model:
 * `renderBrandedEmail` renders markdown prose signed by Chandler, which is the
 * wrong shape for a notification *to* Chandler. Here the body is structured:
 * labelled rows, optional prose blocks, one action.
 */

const BRAND_PURPLE = '#8B5CF6'
const ACCENT_AMBER = '#D97706'
const ACCENT_EMERALD = '#059669'
const TEXT_DARK = '#0F172A'
const TEXT_BODY = '#334155'
const TEXT_MUTED = '#64748B'
const BORDER_LIGHT = '#E2E8F0'
const BG_LIGHT = '#F8FAFC'
const BRAND_FONT = "'Rajdhani', 'Helvetica Neue', Arial, sans-serif"

const LOGO_URL = 'https://www.syntriclabs.com/images/updated-logo.png'
const PILL_URL = 'https://www.syntriclabs.com/images/Syntric-logo-pill.png'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Accent colour per notification kind. The 4px rule at the top of the card. */
const KIND_ACCENT = {
  lead: BRAND_PURPLE,
  request: ACCENT_EMERALD,
  escalation: ACCENT_AMBER,
} as const

export type NotificationKind = keyof typeof KIND_ACCENT

export interface NotificationRow {
  label: string
  value: string
  /** Renders the value as a mailto/tel link. */
  href?: string
}

export interface NotificationBlock {
  label: string
  /** Rendered with newlines preserved; never parsed as HTML. */
  body: string
}

export interface InternalNotificationOptions {
  kind: NotificationKind
  /** Card heading — "New widget lead", "Request for Chandler". */
  title: string
  /** One line under the heading. Where it came from, when. */
  subtitle?: string
  /** Labelled facts. Empty values should be filtered out by the caller. */
  rows: NotificationRow[]
  /** Longer prose — the visitor's own words, a conversation summary. */
  blocks?: NotificationBlock[]
  /** The one action. Usually mailto: the person who just wrote in. */
  cta?: { url: string; label: string } | null
  /** Small print under the card. Session ids, conversation links. */
  footnote?: string
}

function renderRows(rows: NotificationRow[], accent: string): string {
  if (rows.length === 0) return ''
  const cells = rows
    .map(
      (r) => `<tr>
        <td style="padding:7px 16px 7px 0;color:${TEXT_MUTED};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;vertical-align:top;width:132px;white-space:nowrap">${escapeHtml(r.label)}</td>
        <td style="padding:7px 0;color:${TEXT_DARK};font-size:15px;line-height:1.5">${
          r.href
            ? `<a href="${escapeHtml(r.href)}" style="color:${accent};text-decoration:none;font-weight:600">${escapeHtml(r.value)}</a>`
            : escapeHtml(r.value)
        }</td>
      </tr>`
    )
    .join('')
  return `<tr><td style="padding:0 32px">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;border-collapse:collapse"><tbody>${cells}</tbody></table>
  </td></tr>`
}

function renderBlocks(blocks: NotificationBlock[], accent: string): string {
  if (blocks.length === 0) return ''
  return blocks
    .map(
      (b) => `<tr><td style="padding:20px 32px 0 32px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;background:${BG_LIGHT};border:1px solid ${BORDER_LIGHT};border-left:3px solid ${accent};border-radius:8px">
          <tr><td style="padding:14px 16px">
            <p style="margin:0 0 6px;color:${TEXT_MUTED};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${escapeHtml(b.label)}</p>
            <p style="margin:0;color:${TEXT_BODY};font-size:15px;line-height:1.65;white-space:pre-wrap">${escapeHtml(b.body)}</p>
          </td></tr>
        </table>
      </td></tr>`
    )
    .join('')
}

export function renderInternalNotification(options: InternalNotificationOptions): string {
  const accent = KIND_ACCENT[options.kind]
  const rows = options.rows.filter((r) => r.value?.trim())
  const blocks = (options.blocks ?? []).filter((b) => b.body?.trim())

  const subtitleRow = options.subtitle
    ? `<p style="margin:6px 0 0;color:${TEXT_MUTED};font-size:13px;line-height:1.5">${escapeHtml(options.subtitle)}</p>`
    : ''

  const ctaRow = options.cta
    ? `<tr><td style="padding:24px 32px 0 32px">
        <a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;letter-spacing:0.01em">${escapeHtml(options.cta.label)}</a>
      </td></tr>`
    : ''

  const footnoteRow = options.footnote
    ? `<tr><td style="padding:22px 32px 0 32px">
        <p style="margin:0;color:${TEXT_MUTED};font-size:11px;line-height:1.6;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(options.footnote)}</p>
      </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${BG_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_LIGHT};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border:1px solid ${BORDER_LIGHT};border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.04)">

        <tr><td style="height:4px;background:${accent};line-height:4px;font-size:0">&nbsp;</td></tr>

        <tr><td style="padding:22px 32px 16px 32px;border-bottom:1px solid ${BORDER_LIGHT}">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:middle;padding-right:12px;width:44px">
                <img src="${LOGO_URL}" alt="" height="36" style="display:block;height:36px;width:auto;border:0;outline:none">
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0;font-size:22px;font-weight:700;color:${TEXT_DARK};letter-spacing:-0.01em;font-family:${BRAND_FONT}">${escapeHtml(options.title)}</p>
                ${subtitleRow}
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="height:24px;line-height:24px;font-size:0">&nbsp;</td></tr>

        ${renderRows(rows, accent)}
        ${renderBlocks(blocks, accent)}
        ${ctaRow}
        ${footnoteRow}

        <tr><td style="height:28px;line-height:28px;font-size:0">&nbsp;</td></tr>

        <tr><td align="center" style="padding:18px 32px;background:${BG_LIGHT};border-top:1px solid ${BORDER_LIGHT}">
          <img src="${PILL_URL}" alt="Syntric" width="96" style="width:96px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none">
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
