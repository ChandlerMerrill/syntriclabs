/**
 * Custom-tool Zod schemas for the managed agent.
 *
 * Re-declared here (not imported from src/lib/ai/tools.ts) so the setup +
 * update scripts don't pull in the full runtime chain (Vercel AI SDK, service
 * clients, etc.). Phase 5b's dispatcher will also consume these schemas for
 * input validation, so this file has two downstream consumers.
 *
 * Source of truth for field shapes: `src/lib/ai/tools.ts` on commit 523bb67.
 * The 20 `execute_crm_write` variants mirror the B.4 list in
 * `plans/tool-inventory.md`.
 */
import { z } from 'zod'

// ──────────────────────────────────────────────────────────────────────────────
// B.1 — External-dependency tools (Puppeteer / Gmail / OpenAI embeddings)
// ──────────────────────────────────────────────────────────────────────────────

export const generateDocument = z.object({
  type: z.enum(['proposal', 'price_sheet', 'contract', 'counter_proposal']).describe('Document type'),
  title: z.string().describe('Document title'),
  client_id: z.string().uuid().describe('The client UUID'),
  deal_id: z.string().uuid().optional().describe('Optional deal UUID to link'),
  content_data: z.record(z.string(), z.unknown()).describe('Document content — structure depends on type. Proposal: { clientName, projectName, executiveSummary, scopeItems: [{title, description}], timeline: [{phase, duration, description}], pricing: [{item, description, hours, rate}], terms: [string], validUntil? }. Price sheet: { clientName, projectName?, lineItems: [{service, description, hours, rate}], discount?, notes?, validUntil? }. Contract: { clientName, clientContactName, clientContactEmail?, projectName, scope, deliverables: [string], startDate, endDate, paymentTerms, totalValue (in cents), ipClause?, terminationClause? }.'),
})

export const generateCustomDocument = z.object({
  title: z.string().min(1).describe('Document title (appears on cover)'),
  subtitle: z.string().optional().describe('Small tagline under the title (e.g. "RESEARCH BRIEF", "MEETING RECAP")'),
  body: z.string().min(1).describe('Main body in markdown. GFM supported (headings, lists, tables, quotes, code, links).'),
  sections: z.array(z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  })).optional().describe('Optional additional top-level sections, rendered after body with H2 heading + markdown.'),
  client_id: z.string().uuid().optional().describe('Attach to a client. Omit for generic artifacts.'),
  deal_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
})

export const sendDocumentToClient = z.object({
  documentId: z.string().uuid().describe('The document UUID to send'),
  recipientEmail: z.string().email().optional().describe('Override recipient email (defaults to primary contact)'),
  message: z.string().optional().describe('Optional message to include in the email'),
})

export const sendEmail = z.object({
  to: z.string().describe('Recipient email address'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body in plain prose / markdown. Do not include signature, contact info, or sign-off — the template adds these.'),
  cc: z.string().optional().describe('CC recipients'),
  threadId: z.string().optional().describe('Gmail thread ID (for replies)'),
  inReplyTo: z.string().optional().describe('Message-ID header of the email being replied to'),
  references: z.string().optional().describe('References header for threading'),
})

export const semanticSearch = z.object({
  query: z.string().describe('Natural language search query'),
  types: z.array(z.enum(['client', 'project', 'deal', 'activity', 'email', 'transcript'])).optional().describe('Filter to specific entity types'),
  limit: z.number().optional().default(8).describe('Max results to return'),
})

// ──────────────────────────────────────────────────────────────────────────────
// B.2 — Two-step confirm tools (hard deletes)
// ──────────────────────────────────────────────────────────────────────────────

export const hardDeleteClient = z.object({
  ids: z.array(z.string().uuid()).min(1).max(25).describe('Array of client UUIDs to delete. One ID for a single delete, many for batch cleanup.'),
  confirmToken: z.string().uuid().optional().describe('Only pass this on the second call, after the user has affirmed.'),
})

export const hardDeleteContact = z.object({
  ids: z.array(z.string().uuid()).min(1).max(25).describe('Array of contact UUIDs to delete. One ID for a single delete, many for batch cleanup.'),
  confirmToken: z.string().uuid().optional(),
})

export const hardDeleteLead = z.object({
  ids: z.array(z.string().uuid()).min(1).max(25).describe('Array of lead UUIDs to delete. One ID for a single delete, many for batch cleanup.'),
  confirmToken: z.string().uuid().optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// B.4 — `execute_crm_write` — discriminated union over the 20 CRM-write actions
// ──────────────────────────────────────────────────────────────────────────────

// Per-action param schemas, lifted from `src/lib/ai/tools.ts`. Kept flat (no
// cross-schema reuse) so the discriminated-union JSON Schema inlines cleanly.

const createClientParams = z.object({
  company_name: z.string().min(1).describe('Company name (required)'),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).default('prospect'),
  source: z.enum(['website', 'referral', 'cold_outreach', 'event', 'other']).default('other'),
  tags: z.array(z.string()).default([]),
  notes: z.string().default(''),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
})

const updateClientParams = z.object({
  clientId: z.string().uuid().describe('The client UUID'),
  company_name: z.string().min(1).optional(),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  source: z.enum(['website', 'referral', 'cold_outreach', 'event', 'other']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
})

const archiveClientParams = z.object({
  clientId: z.string().uuid().describe('The client UUID'),
  reason: z.string().min(1).describe('Why the client is being archived'),
})

const createContactParams = z.object({
  client_id: z.string().uuid().describe('The client UUID this contact belongs to'),
  name: z.string().min(1).describe('Contact full name'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional().describe('Job title / role'),
  is_primary: z.boolean().default(false),
})

const updateContactParams = z.object({
  contactId: z.string().uuid().describe('The contact UUID'),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  is_primary: z.boolean().optional(),
})

const createLeadParams = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  preferred_contact: z.enum(['phone', 'email', 'sms']).optional(),
  role: z.string().optional().describe('Their job title / role'),
  organization: z.string().optional().describe('Company they work for'),
  business_type: z.string().optional().describe('Industry / business type'),
  service_interest: z.string().optional(),
  request: z.string().optional().describe('What they want / their ask'),
  summary: z.string().optional().describe('Short summary of the lead for reference'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dismissed']).default('new'),
  source: z.string().default('telegram').describe('Where the lead came from (telegram, referral, event, etc.)'),
})

const updateLeadParams = z.object({
  leadId: z.string().uuid().describe('The lead UUID'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  preferred_contact: z.enum(['phone', 'email', 'sms']).optional(),
  role: z.string().optional(),
  organization: z.string().optional(),
  business_type: z.string().optional(),
  service_interest: z.string().optional(),
  request: z.string().optional(),
  summary: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dismissed']).optional(),
})

const convertLeadToClientParams = z.object({
  leadId: z.string().uuid().describe('The lead UUID to convert'),
})

const dismissLeadParams = z.object({
  leadId: z.string().uuid().describe('The lead UUID'),
  reason: z.string().min(1).describe('Why the lead is being dismissed (spam, duplicate, not a fit, etc.)'),
})

const createDealParams = z.object({
  client_id: z.string().uuid().describe('Owning client UUID'),
  title: z.string().min(1).describe('Deal title'),
  stage: z.enum(['lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost']).describe('Starting stage'),
  value: z.number().int().min(0).describe('Deal value in cents (e.g., $40,000 = 4000000)'),
  probability: z.number().min(0).max(100).default(25),
  expected_close_date: z.string().optional().describe('ISO yyyy-mm-dd'),
  project_id: z.string().uuid().optional(),
  notes: z.string().default(''),
})

const updateDealParams = z.object({
  dealId: z.string().uuid().describe('The deal UUID'),
  title: z.string().optional(),
  value: z.number().int().min(0).optional().describe('Value in cents'),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().optional(),
  project_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

const updateDealStageParams = z.object({
  dealId: z.string().uuid().describe('The deal UUID'),
  newStage: z.enum(['lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost']),
  lostReason: z.string().optional().describe('Required when newStage = "lost" (why the deal was lost)'),
  note: z.string().optional().describe('Optional note on this stage transition'),
})

const archiveDealParams = z.object({
  dealId: z.string().uuid().describe('The deal UUID'),
  reason: z.string().min(1).describe('Why the deal is being archived'),
})

const createProjectParams = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().default(''),
  scope: z.string().default(''),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).default('planning'),
  tech_stack: z.array(z.string()).default([]),
  budget_min: z.number().int().optional().describe('Budget min in cents'),
  budget_max: z.number().int().optional().describe('Budget max in cents'),
  start_date: z.string().optional(),
  target_end_date: z.string().optional(),
})

const updateProjectParams = z.object({
  projectId: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  budget_min: z.number().int().optional(),
  budget_max: z.number().int().optional(),
  start_date: z.string().optional(),
  target_end_date: z.string().optional(),
  actual_end_date: z.string().optional(),
})

const updateProjectStatusParams = z.object({
  projectId: z.string().uuid(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']),
  reason: z.string().optional().describe('Required when moving to "paused" or "cancelled"'),
})

const addActivityParams = z.object({
  client_id: z.string().uuid(),
  type: z.enum(['note', 'call', 'email', 'meeting', 'document']),
  title: z.string().min(1),
  description: z.string().default(''),
  deal_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

const logFollowUpParams = z.object({
  client_id: z.string().uuid(),
  due_date: z.string().describe('ISO yyyy-mm-dd or full timestamp'),
  title: z.string().min(1),
  description: z.string().default(''),
  deal_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
})

const writeSqlParams = z.object({
  query: z.string().min(1).describe('A single INSERT or UPDATE statement. No DELETE, no DDL.'),
  reason: z.string().min(1).describe('Short note on why (shown on the audit timeline).'),
})

const updateDocumentStatusParams = z.object({
  documentId: z.string().uuid().describe('The document UUID'),
  status: z.enum(['draft', 'final', 'sent', 'accepted', 'rejected']).describe('New status'),
})

export const execute_crm_write = z.discriminatedUnion('action', [
  z.object({ action: z.literal('createClient'), params: createClientParams }),
  z.object({ action: z.literal('updateClient'), params: updateClientParams }),
  z.object({ action: z.literal('archiveClient'), params: archiveClientParams }),
  z.object({ action: z.literal('createContact'), params: createContactParams }),
  z.object({ action: z.literal('updateContact'), params: updateContactParams }),
  z.object({ action: z.literal('createLead'), params: createLeadParams }),
  z.object({ action: z.literal('updateLead'), params: updateLeadParams }),
  z.object({ action: z.literal('convertLeadToClient'), params: convertLeadToClientParams }),
  z.object({ action: z.literal('dismissLead'), params: dismissLeadParams }),
  z.object({ action: z.literal('createDeal'), params: createDealParams }),
  z.object({ action: z.literal('updateDeal'), params: updateDealParams }),
  z.object({ action: z.literal('updateDealStage'), params: updateDealStageParams }),
  z.object({ action: z.literal('archiveDeal'), params: archiveDealParams }),
  z.object({ action: z.literal('createProject'), params: createProjectParams }),
  z.object({ action: z.literal('updateProject'), params: updateProjectParams }),
  z.object({ action: z.literal('updateProjectStatus'), params: updateProjectStatusParams }),
  z.object({ action: z.literal('addActivity'), params: addActivityParams }),
  z.object({ action: z.literal('logFollowUp'), params: logFollowUpParams }),
  z.object({ action: z.literal('writeSql'), params: writeSqlParams }),
  z.object({ action: z.literal('updateDocumentStatus'), params: updateDocumentStatusParams }),
])

// ──────────────────────────────────────────────────────────────────────────────
// Descriptions — one line each, fed verbatim into the Anthropic tool registration.
// ──────────────────────────────────────────────────────────────────────────────

export const descriptions: Record<string, string> = {
  generate_document:
    'Generate a document (proposal, price sheet, or contract) as a PDF for a client. Always fetch client info first to populate content_data properly.',
  generate_custom_document:
    'Generate a fully-branded PDF from freeform markdown — research briefs, meeting recaps, one-pagers, memos, client-ready deliverables that do not fit the proposal/price_sheet/contract mold. Body accepts GFM markdown. client_id is optional — omit for generic artifacts.',
  send_document_to_client:
    'Send a generated document to a client via email with PDF attachment. The document must already be generated.',
  send_email:
    'Send an email via Gmail. Write the body in plain prose (markdown supported). The tool wraps your body in a branded Syntric template; do NOT include greeting fluff, signature, or contact info.',
  semantic_search:
    'Search across all CRM data (clients, projects, deals, activities, emails, transcripts) using natural language. Vector search via OpenAI embeddings.',
  hard_delete_client:
    'PERMANENTLY delete one or many clients (cascades to contacts, deals, projects, activities, documents). Two-step confirm: call WITHOUT confirmToken first to get a preview + token, then re-call WITH confirmToken after the user affirms. Prefer archiveClient over this.',
  hard_delete_contact:
    'PERMANENTLY delete one or many contacts. Two-step confirm flow (same as hard_delete_client).',
  hard_delete_lead:
    'PERMANENTLY delete one or many widget leads. Two-step confirm flow. Prefer dismissLead for soft delete.',
  execute_crm_write:
    'Dispatch a CRM write (create/update/archive for clients, contacts, leads, deals, projects; log an activity or follow-up; run an arbitrary INSERT/UPDATE via writeSql; change a document status). Pick `action` from the allowed list; `params` must match that action\'s schema. All calls are audited via `ai_actions`. For reads, use the Supabase MCP `execute_sql` tool instead. For hard deletes, use the dedicated `hard_delete_*` tools (they require a confirmation token).',
}

// Helper for build-agent-tools.ts: the 9 schemas paired with their Anthropic
// snake_case names. Keeping this paired with the exports above avoids drift.
export const customToolSchemas: Array<{
  name: string
  schema: z.ZodTypeAny
}> = [
  { name: 'generate_document', schema: generateDocument },
  { name: 'generate_custom_document', schema: generateCustomDocument },
  { name: 'send_document_to_client', schema: sendDocumentToClient },
  { name: 'send_email', schema: sendEmail },
  { name: 'semantic_search', schema: semanticSearch },
  { name: 'hard_delete_client', schema: hardDeleteClient },
  { name: 'hard_delete_contact', schema: hardDeleteContact },
  { name: 'hard_delete_lead', schema: hardDeleteLead },
  { name: 'execute_crm_write', schema: execute_crm_write },
]
