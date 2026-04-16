export function renderDocumentHTML(title: string, bodyHTML: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1E293B;
      font-size: 11pt;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #8B5CF6;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.5px;
    }
    .logo .dot { color: #8B5CF6; }
    .company-info {
      text-align: right;
      font-size: 9pt;
      color: #64748B;
      line-height: 1.5;
    }
    .doc-title {
      font-size: 22pt;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .doc-subtitle {
      font-size: 11pt;
      color: #64748B;
      margin-bottom: 30px;
    }
    h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #0F172A;
      margin: 28px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E2E8F0;
    }
    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #334155;
      margin: 16px 0 8px;
    }
    p { margin-bottom: 10px; }
    ul, ol { margin: 0 0 12px 20px; }
    li { margin-bottom: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px;
    }
    th {
      background: #F1F5F9;
      text-align: left;
      padding: 8px 12px;
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E2E8F0;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 10pt;
    }
    .text-right { text-align: right; }
    .text-bold { font-weight: 600; }
    .total-row td {
      font-weight: 700;
      font-size: 11pt;
      border-top: 2px solid #E2E8F0;
      border-bottom: none;
      padding-top: 12px;
    }
    .accent { color: #8B5CF6; }
    .highlight-box {
      background: #F8FAFC;
      border-left: 3px solid #8B5CF6;
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
      color: #64748B;
      margin-top: 4px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 40px;
      font-size: 8pt;
      color: #94A3B8;
      text-align: center;
      border-top: 1px solid #E2E8F0;
    }
    @page { margin: 0; }
  </style>
</head>
<body>
  <div style="padding: 40px;">
    <div class="header">
      <div>
        <div class="logo">syntric<span class="dot">.</span></div>
        <div style="font-size: 9pt; color: #64748B;">AI-Powered Business Solutions</div>
      </div>
      <div class="company-info">
        Syntric Labs LLC<br/>
        chandler@syntriclabs.com<br/>
        syntriclabs.com
      </div>
    </div>
    ${bodyHTML}
  </div>
  <div class="footer">
    Syntric Labs LLC &bull; chandler@syntriclabs.com &bull; syntriclabs.com
  </div>
</body>
</html>`
}
