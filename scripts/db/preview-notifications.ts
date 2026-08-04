/**
 * Renders the widget's three internal notification emails to files, sending
 * nothing.
 *
 * Same reasoning as `preview-templates.ts`: these are visual artifacts, so they
 * have to be looked at rather than reasoned about. The sample data is
 * deliberately realistic — a long conversation summary, a two-paragraph request,
 * a missing phone number — because the layout only breaks on real content, not
 * on "Test Test / test@test.com".
 *
 *   tsx scripts/db/preview-notifications.ts [outDir]
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  buildLeadNotificationHtml,
  buildRequestNotificationHtml,
  buildEscalationNotificationHtml,
} from '@/lib/email/lead-notification'

const outDir = process.argv[2] || '.'
mkdirSync(outDir, { recursive: true })

const files: [string, string][] = [
  [
    'notification-lead.html',
    buildLeadNotificationHtml({
      firstName: 'Marcus',
      lastName: 'Whitfield',
      email: 'marcus@whitfieldplumbing.com',
      phone: '+1-555-204-8891',
      organization: 'Whitfield Plumbing & Heating',
      role: 'Owner',
      preferredContact: 'phone',
      serviceInterest: 'Dispatch and scheduling system',
      request: 'Wants to stop running the dispatch board out of a shared spreadsheet.',
      summary:
        'Nine trucks, two dispatchers. Jobs get double-booked roughly once a week because the spreadsheet is edited by four people at once. Asked about cost twice and seems anchored around $12k. Wants it before the spring rush.',
    }),
  ],
  [
    'notification-request.html',
    buildRequestNotificationHtml({
      firstName: 'Dana',
      lastName: 'Reyes',
      email: 'dana@cascadeveterinary.com',
      phone: '+1-555-771-3320',
      organization: 'Cascade Veterinary',
      preferredContact: 'email',
      details:
        "We're a three-vet clinic and our front desk is drowning. Two staff spend most of the morning on the phone confirming appointments and answering the same questions about boarding.\n\nIs the phone agent something that could handle confirmations? And what would that run us, roughly?",
      urgency: 'this_week',
      pathname: '/services',
      sessionId: '8f2a1c44-9e07-4d3b-b6c1-0a5f7e29d1b3',
      conversationId: 'c1d9e3a0-77b2-4f18-9c55-2e6b8a04f7dd',
    }),
  ],
  [
    // No phone number and no last name — the fallbacks have to hold.
    'notification-escalation.html',
    buildEscalationNotificationHtml({
      firstName: 'Sam',
      email: 'sam.oduya@northridgesupply.co',
      organization: 'Northridge Supply',
      reason:
        'Asked whether the platform can handle split shipments across three warehouses with separate inventory counts. Nothing in the knowledge base covers multi-warehouse and I did not want to guess at it.',
      summary:
        'Distributor, roughly 40 staff, currently on an ERP they dislike. Weighing a rebuild against a layer on top of what they already have.',
      sessionId: '3b7e0d21-5a44-4c90-8e12-fd6c3a91b8e5',
      conversationId: null,
    }),
  ],
]

for (const [name, html] of files) {
  const dest = path.join(outDir, name)
  writeFileSync(dest, html)
  console.log(`wrote ${dest}`)
}
