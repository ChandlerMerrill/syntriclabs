import type { ProposalData } from '@/lib/types'
import { renderDocumentHTML } from './base-layout'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function renderProposal(data: ProposalData): string {
  const lineItemsTotal = data.pricing.reduce((sum, p) => sum + p.hours * p.rate, 0)

  const pricingRows = data.pricing.map(p => `
    <tr>
      <td>${p.item}</td>
      <td>${p.description}</td>
      <td class="text-right">${p.hours}</td>
      <td class="text-right">${formatCurrency(p.rate)}/hr</td>
      <td class="text-right text-bold">${formatCurrency(p.hours * p.rate)}</td>
    </tr>
  `).join('')

  const timelineRows = data.timeline.map(t => `
    <tr>
      <td class="text-bold">${t.phase}</td>
      <td>${t.duration}</td>
      <td>${t.description}</td>
    </tr>
  `).join('')

  const scopeItems = data.scopeItems.map(s => `
    <div style="margin-bottom: 12px;">
      <h3>${s.title}</h3>
      <p>${s.description}</p>
    </div>
  `).join('')

  const terms = data.terms.map(t => `<li>${t}</li>`).join('')

  const budgetRange = data.totalMin && data.totalMax
    ? `<p style="font-size: 9pt; color: #64748B;">Budget range: ${formatCurrency(data.totalMin)} – ${formatCurrency(data.totalMax)}</p>`
    : ''

  const body = `
    <div class="doc-title">Project Proposal</div>
    <div class="doc-subtitle">Prepared for ${data.clientName}${data.clientIndustry ? ` — ${data.clientIndustry}` : ''}</div>

    <div class="highlight-box">
      <strong>Project:</strong> ${data.projectName}<br/>
      ${data.validUntil ? `<strong>Valid until:</strong> ${data.validUntil}<br/>` : ''}
      <strong>Estimated investment:</strong> ${formatCurrency(lineItemsTotal)}
      ${budgetRange}
    </div>

    <h2>Executive Summary</h2>
    <p>${data.executiveSummary}</p>

    <h2>Scope of Work</h2>
    ${scopeItems}

    <h2>Timeline</h2>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Duration</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>${timelineRows}</tbody>
    </table>

    <h2>Pricing</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Description</th>
          <th class="text-right">Hours</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${pricingRows}
        <tr class="total-row">
          <td colspan="4" class="text-right">Total</td>
          <td class="text-right accent">${formatCurrency(lineItemsTotal)}</td>
        </tr>
      </tbody>
    </table>

    <h2>Terms & Conditions</h2>
    <ul>${terms}</ul>

    <div class="signature-block">
      <div class="signature-line">
        <div class="signature-label">Chandler Forrest — Syntric Labs</div>
        <div class="signature-label">Date: _______________</div>
      </div>
      <div class="signature-line">
        <div class="signature-label">${data.clientName}</div>
        <div class="signature-label">Date: _______________</div>
      </div>
    </div>
  `

  return renderDocumentHTML(`Proposal — ${data.clientName}`, body)
}
