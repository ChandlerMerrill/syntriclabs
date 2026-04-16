import type { PriceSheetData } from '@/lib/types'
import { renderDocumentHTML } from './base-layout'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function renderPriceSheet(data: PriceSheetData): string {
  const subtotal = data.lineItems.reduce((sum, li) => sum + li.hours * li.rate, 0)
  const discountAmount = data.discount ? Math.round(subtotal * data.discount / 100) : 0
  const total = subtotal - discountAmount

  const rows = data.lineItems.map(li => `
    <tr>
      <td class="text-bold">${li.service}</td>
      <td>${li.description}</td>
      <td class="text-right">${li.hours}</td>
      <td class="text-right">${formatCurrency(li.rate)}/hr</td>
      <td class="text-right text-bold">${formatCurrency(li.hours * li.rate)}</td>
    </tr>
  `).join('')

  const body = `
    <div class="doc-title">Price Sheet</div>
    <div class="doc-subtitle">Prepared for ${data.clientName}${data.projectName ? ` — ${data.projectName}` : ''}</div>

    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Description</th>
          <th class="text-right">Hours</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="4" class="text-right">Subtotal</td>
          <td class="text-right">${formatCurrency(subtotal)}</td>
        </tr>
        ${data.discount ? `
        <tr>
          <td colspan="4" class="text-right" style="color: #10B981;">Discount (${data.discount}%)</td>
          <td class="text-right" style="color: #10B981;">-${formatCurrency(discountAmount)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="4" class="text-right">Total</td>
          <td class="text-right accent" style="font-size: 13pt;">${formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>

    ${data.notes ? `
    <div class="highlight-box">
      <strong>Notes:</strong> ${data.notes}
    </div>
    ` : ''}

    ${data.validUntil ? `
    <p style="font-size: 9pt; color: #64748B; margin-top: 20px;">
      This price sheet is valid until ${data.validUntil}. Prices may change after this date.
    </p>
    ` : ''}
  `

  return renderDocumentHTML(`Price Sheet — ${data.clientName}`, body)
}
