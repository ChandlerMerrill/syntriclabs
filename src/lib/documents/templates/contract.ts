import type { ContractData } from '@/lib/types'
import { renderDocumentHTML } from './base-layout'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function renderContract(data: ContractData): string {
  const deliverables = data.deliverables.map(d => `<li>${d}</li>`).join('')

  const body = `
    <div class="doc-title">Service Agreement</div>
    <div class="doc-subtitle">${data.projectName}</div>

    <h2>1. Parties</h2>
    <p>
      This Service Agreement ("Agreement") is entered into between:<br/><br/>
      <strong>Provider:</strong> Syntric Labs LLC ("Syntric"), represented by Chandler Forrest<br/>
      <strong>Client:</strong> ${data.clientName}, represented by ${data.clientContactName}${data.clientContactEmail ? ` (${data.clientContactEmail})` : ''}
    </p>

    <h2>2. Scope of Work</h2>
    <p>${data.scope}</p>

    <h2>3. Deliverables</h2>
    <ul>${deliverables}</ul>

    <h2>4. Timeline</h2>
    <p>
      <strong>Start date:</strong> ${data.startDate}<br/>
      <strong>Estimated completion:</strong> ${data.endDate}
    </p>

    <h2>5. Payment Terms</h2>
    <div class="highlight-box">
      <strong>Total project value:</strong> ${formatCurrency(data.totalValue)}<br/>
      <strong>Payment terms:</strong> ${data.paymentTerms}
    </div>

    <h2>6. Intellectual Property</h2>
    <p>${data.ipClause || 'Upon full payment, all deliverables created under this Agreement shall become the exclusive property of the Client. Syntric retains the right to use general knowledge, techniques, and non-confidential elements in future work.'}</p>

    <h2>7. Confidentiality</h2>
    <p>Both parties agree to keep confidential any proprietary information shared during the course of this engagement. This obligation survives termination of this Agreement.</p>

    <h2>8. Termination</h2>
    <p>${data.terminationClause || 'Either party may terminate this Agreement with 14 days written notice. In the event of termination, Client shall pay for all work completed up to the termination date.'}</p>

    <h2>9. Limitation of Liability</h2>
    <p>Syntric's total liability under this Agreement shall not exceed the total project value. Syntric shall not be liable for indirect, incidental, or consequential damages.</p>

    <div class="signature-block">
      <div class="signature-line">
        <div class="signature-label">Chandler Forrest — Syntric Labs LLC</div>
        <div class="signature-label">Date: _______________</div>
      </div>
      <div class="signature-line">
        <div class="signature-label">${data.clientContactName} — ${data.clientName}</div>
        <div class="signature-label">Date: _______________</div>
      </div>
    </div>
  `

  return renderDocumentHTML(`Contract — ${data.clientName}`, body)
}
