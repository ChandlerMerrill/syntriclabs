import puppeteer from 'puppeteer-core'
import { FOUNDER } from '@/lib/founder-profile'

export async function generatePDF(html: string): Promise<Buffer> {
  let browser

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Production: use @sparticuz/chromium bundled binary
    const chromium = (await import('@sparticuz/chromium')).default
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    // Local dev: use system Chrome
    const executablePath = process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome'

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const dateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const footerTemplate = `
      <div style="width:100%;text-align:center;font-size:8pt;color:#94A3B8;font-family:Inter,-apple-system,sans-serif;padding:0 0.5in">
        ${FOUNDER.company} &middot; ${FOUNDER.fullName} &middot; ${dateLabel}
        &nbsp;&middot;&nbsp;
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.75in', left: '0.5in' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate,
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
