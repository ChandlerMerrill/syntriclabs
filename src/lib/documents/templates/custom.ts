import { marked } from 'marked'
import type { CustomDocumentData } from '@/lib/types'
import { renderDocumentHTML } from './base-layout'

marked.setOptions({
  gfm: true,
  breaks: false,
})

function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string
}

export function renderCustom(data: CustomDocumentData): string {
  const subtitleHTML = data.subtitle
    ? `<div class="custom-subtitle">${escapeHtml(data.subtitle)}</div>`
    : ''

  const bodyHTML = renderMarkdown(data.body || '')

  const sectionsHTML = (data.sections ?? [])
    .filter(s => s && (s.heading || s.body))
    .map(s => `
      <div class="custom-section">
        <h2>${escapeHtml(s.heading)}</h2>
        <div class="custom-md">${renderMarkdown(s.body || '')}</div>
      </div>
    `).join('')

  const body = `
    ${subtitleHTML}
    <div class="custom-md">
      ${bodyHTML}
    </div>
    ${sectionsHTML}
    <style>
      .custom-subtitle {
        font-family: 'Rajdhani', 'Helvetica Neue', Arial, sans-serif;
        font-size: 10pt;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--accent);
        margin: -6px 0 20px;
      }
      .custom-md h1 {
        font-family: 'Rajdhani', 'Helvetica Neue', Arial, sans-serif;
        font-size: 18pt;
        font-weight: 700;
        color: var(--primary);
        letter-spacing: -0.3px;
        margin: 24px 0 10px;
        padding-bottom: 6px;
        border-bottom: 2px solid var(--accent);
        page-break-after: avoid;
      }
      .custom-md h2 {
        font-family: 'Rajdhani', 'Helvetica Neue', Arial, sans-serif;
        font-size: 14pt;
        font-weight: 700;
        color: var(--primary);
        letter-spacing: -0.2px;
        margin: 22px 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid var(--border);
        page-break-after: avoid;
      }
      .custom-md h3 {
        font-size: 11.5pt;
        font-weight: 600;
        color: var(--primary);
        margin: 16px 0 6px;
        page-break-after: avoid;
      }
      .custom-md h4 {
        font-size: 10.5pt;
        font-weight: 600;
        color: var(--text);
        margin: 12px 0 4px;
      }
      .custom-md p {
        margin: 0 0 10px;
      }
      .custom-md ul, .custom-md ol {
        margin: 0 0 12px 22px;
      }
      .custom-md ul li::marker {
        color: var(--accent);
      }
      .custom-md ol li::marker {
        color: var(--accent);
        font-weight: 600;
      }
      .custom-md li { margin-bottom: 5px; }
      .custom-md blockquote {
        margin: 14px 0;
        padding: 10px 16px;
        border-left: 3px solid var(--accent);
        background: var(--accent-light);
        color: var(--text);
        font-style: italic;
        border-radius: 0 4px 4px 0;
      }
      .custom-md blockquote p:last-child { margin-bottom: 0; }
      .custom-md code {
        font-family: 'SFMono-Regular', 'Consolas', 'Monaco', monospace;
        font-size: 9pt;
        background: var(--bg-subtle);
        padding: 1px 5px;
        border-radius: 3px;
        color: var(--primary);
      }
      .custom-md pre {
        background: var(--primary);
        color: #E2E8F0;
        padding: 12px 14px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 9pt;
        margin: 12px 0;
        page-break-inside: avoid;
      }
      .custom-md pre code {
        background: transparent;
        color: inherit;
        padding: 0;
        font-size: inherit;
      }
      .custom-md hr {
        border: none;
        height: 1px;
        background: var(--border);
        margin: 22px 0;
      }
      .custom-md a {
        color: var(--accent);
        text-decoration: underline;
      }
      .custom-md table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0 16px;
        font-size: 9.5pt;
      }
      .custom-md thead { background: var(--primary); color: #FFFFFF; }
      .custom-md thead th {
        padding: 9px 11px;
        font-weight: 600;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: left;
      }
      .custom-md tbody tr { border-bottom: 1px solid var(--border); }
      .custom-md tbody tr:nth-child(even) { background: var(--bg-subtle); }
      .custom-md tbody td { padding: 8px 11px; }
      .custom-section { margin-top: 8px; }
    </style>
  `

  return renderDocumentHTML(data.title, body)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
