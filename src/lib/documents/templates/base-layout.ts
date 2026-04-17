import fs from 'fs'
import path from 'path'
import { FOUNDER } from '@/lib/founder-profile'

function getLogoDataUri(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'updated-logo.png')
    if (!fs.existsSync(logoPath)) return null
    const data = fs.readFileSync(logoPath).toString('base64')
    return `data:image/png;base64,${data}`
  } catch {
    return null
  }
}

export function renderDocumentHTML(title: string, bodyHTML: string): string {
  const logoDataUri = getLogoDataUri()
  const logoImg = logoDataUri
    ? `<img src="${logoDataUri}" alt="" class="cover-logo" />`
    : ''
  const dateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
      --primary: #0F172A;
      --accent: #8B5CF6;
      --accent-light: #FAF5FF;
      --text: #1F2937;
      --text-light: #64748B;
      --border: #E2E8F0;
      --bg-subtle: #F8FAFC;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: var(--text);
    }

    /* === COVER === */
    .cover {
      padding: 10px 0 24px;
      margin-bottom: 0;
      border-bottom: 2px solid var(--accent);
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 28px;
    }
    .cover-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
      display: block;
    }
    .wordmark {
      font-family: 'Rajdhani', 'Helvetica Neue', Arial, sans-serif;
      font-size: 28pt;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .cover h1 {
      font-family: 'Rajdhani', 'Helvetica Neue', Arial, sans-serif;
      font-size: 26pt;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: -0.5px;
      margin: 0 0 14px;
    }

    .meta-block {
      color: var(--text-light);
      font-size: 9.5pt;
      line-height: 1.8;
    }
    .meta-block strong { color: var(--text); font-weight: 600; }
    .meta-block div { margin-bottom: 2px; }

    /* === SECTION HEADERS === */
    h2 {
      font-family: 'Rajdhani', 'Helvetica Neue', Arial, sans-serif;
      font-size: 15pt;
      font-weight: 700;
      color: var(--primary);
      margin: 26px 0 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid var(--accent);
      letter-spacing: -0.3px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: var(--primary);
      margin: 16px 0 6px;
      page-break-after: avoid;
    }

    h4 {
      font-size: 10pt;
      font-weight: 600;
      color: var(--text);
      margin: 12px 0 4px;
    }

    /* === BODY === */
    p { margin: 0 0 8px; orphans: 3; widows: 3; }
    strong { font-weight: 600; color: var(--primary); }
    em { font-style: italic; color: var(--text-light); }

    ul, ol { margin: 0 0 10px 20px; }
    li { margin-bottom: 4px; }

    /* === TABLES === */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px;
      font-size: 9.5pt;
    }

    thead { background: var(--primary); color: #FFFFFF; }
    thead th {
      padding: 9px 11px;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }

    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:nth-child(even) { background: var(--bg-subtle); }
    tbody td { padding: 8px 11px; }

    .text-right { text-align: right; }
    .text-bold { font-weight: 600; }
    .total-row td {
      font-weight: 700;
      font-size: 11pt;
      border-top: 2px solid var(--border);
      background: var(--accent-light);
    }

    .accent { color: var(--accent); }
    .highlight-box {
      background: var(--bg-subtle);
      border-left: 3px solid var(--accent);
      padding: 16px 20px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
    }

    .signature-block {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      gap: 60px;
    }
    .signature-line {
      flex: 1;
      padding-top: 40px;
      border-top: 1px solid #CBD5E1;
    }
    .signature-label {
      font-size: 9pt;
      color: var(--text-light);
      margin-top: 4px;
    }

    hr { border: none; height: 1px; background: var(--border); margin: 20px 0; }

    /* === PAGE BREAK CONTROL === */
    h2, h3, h4 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
    ul, ol { page-break-inside: avoid; }
    h2 + p, h2 + table, h2 + ul,
    h3 + p, h3 + table, h3 + ul { page-break-before: avoid; }

    @page { margin: 0; }
  </style>
</head>
<body>
  <div style="padding: 40px 48px;">
    <div class="cover">
      <div class="brand-row">
        ${logoImg}
        <div class="wordmark">${FOUNDER.company}</div>
      </div>
      <h1>${title}</h1>
      <div class="meta-block">
        <div><strong>Prepared by:</strong> ${FOUNDER.fullName}, ${FOUNDER.title}</div>
        <div><strong>Date:</strong> ${dateLabel}</div>
      </div>
    </div>
    <div class="content" style="margin-top: 24px;">
      ${bodyHTML}
    </div>
  </div>
</body>
</html>`
}
