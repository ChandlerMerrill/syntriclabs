import { tool, zodSchema } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDocumentService } from '@/lib/services/document-generation'
import { searchSimilar, embedInBackground, serializeEmail } from '@/lib/ai/embeddings'
import { sendMessage, getMessage, parseMessage, getGmailAccount } from '@/lib/gmail/client'
import { renderBrandedEmail } from '@/lib/email/branded-template'
import { withAIAudit } from '@/lib/ai/audit'
import {
  createClient as createClientRow,
  updateClient as updateClientRow,
  getClient,
  addContact,
  updateContact as updateContactRow,
  deleteClient,
  deleteContact,
} from '@/lib/services/clients'
import {
  createLead as createLeadRow,
  updateLead as updateLeadRow,
  updateLeadStatus,
  convertToClient,
  getLead,
  type LeadInput,
} from '@/lib/services/leads'
import {
  createDeal as createDealRow,
  updateDeal as updateDealRow,
  getDeal,
} from '@/lib/services/deals'
import {
  createProject as createProjectRow,
  updateProject as updateProjectRow,
  getProject,
} from '@/lib/services/projects'
import { createActivity } from '@/lib/services/activities'
import { createPendingAction, consumeConfirmToken } from '@/lib/ai/confirm-tokens'
import {
  parseAndValidate,
  buildPreImageSelectForUpdate,
  ensureInsertReturning,
  getTargetTable,
  ALLOWED_TABLE_NAMES,
  ALLOWLISTED_TABLES,
  isColumnWritable,
} from '@/lib/ai/sql-safety'
import { executeQuery, executeInternalRead } from '@/lib/ai/sql-client'
import type { DocumentType, ClientInput, ClientContactInput, DealInput, ProjectInput } from '@/lib/types'

export const crmTools = {
  getClientInfo: tool({
    description: 'Get detailed info about a specific client including their contacts',
    inputSchema: zodSchema(z.object({
      clientId: z.string().uuid().describe('The client UUID'),
    })),
    execute: async ({ clientId }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('clients')
        .select('*, client_contacts(*)')
        .eq('id', clientId)
        .single()
      if (error) return { error: error.message }
      return data
    },
  }),

  listClients: tool({
    description: 'List all clients, optionally filtered by status, industry, or search term',
    inputSchema: zodSchema(z.object({
      status: z.enum(['active', 'inactive', 'prospect']).optional().describe('Filter by client status'),
      industry: z.string().optional().describe('Filter by industry'),
      search: z.string().optional().describe('Search by company name'),
    })),
    execute: async ({ status, industry, search }) => {
      const supabase = await createServiceClient()
      let query = supabase.from('clients').select('*, client_contacts(*)').order('company_name')
      if (status) query = query.eq('status', status)
      if (industry) query = query.eq('industry', industry)
      if (search) query = query.ilike('company_name', `%${search}%`)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { clients: data, count: data?.length ?? 0 }
    },
  }),

  getProjectInfo: tool({
    description: 'Get detailed info about a specific project',
    inputSchema: zodSchema(z.object({
      projectId: z.string().uuid().describe('The project UUID'),
    })),
    execute: async ({ projectId }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(id, company_name)')
        .eq('id', projectId)
        .single()
      if (error) return { error: error.message }
      return data
    },
  }),

  listProjects: tool({
    description: 'List all projects, optionally filtered by client, status, or search term',
    inputSchema: zodSchema(z.object({
      clientId: z.string().uuid().optional().describe('Filter by client ID'),
      status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).optional(),
      search: z.string().optional().describe('Search by project name'),
    })),
    execute: async ({ clientId, status, search }) => {
      const supabase = await createServiceClient()
      let query = supabase.from('projects').select('*, clients(id, company_name)').order('created_at', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      if (status) query = query.eq('status', status)
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { projects: data, count: data?.length ?? 0 }
    },
  }),

  getDealInfo: tool({
    description: 'Get detailed info about a specific deal including stage history',
    inputSchema: zodSchema(z.object({
      dealId: z.string().uuid().describe('The deal UUID'),
    })),
    execute: async ({ dealId }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('deals')
        .select('*, clients(id, company_name, industry)')
        .eq('id', dealId)
        .single()
      if (error) return { error: error.message }
      return data
    },
  }),

  listDeals: tool({
    description: 'List all deals in the pipeline, optionally filtered by stage, client, or search term',
    inputSchema: zodSchema(z.object({
      clientId: z.string().uuid().optional().describe('Filter by client ID'),
      stage: z.enum(['lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost']).optional(),
      search: z.string().optional().describe('Search by deal title'),
    })),
    execute: async ({ clientId, stage, search }) => {
      const supabase = await createServiceClient()
      let query = supabase.from('deals').select('*, clients(id, company_name, industry)').order('updated_at', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      if (stage) query = query.eq('stage', stage)
      if (search) query = query.ilike('title', `%${search}%`)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { deals: data, count: data?.length ?? 0 }
    },
  }),

  getClientActivities: tool({
    description: 'Get recent activity history for a client (notes, calls, emails, meetings, etc.)',
    inputSchema: zodSchema(z.object({
      clientId: z.string().uuid().describe('The client UUID'),
      limit: z.number().optional().default(20).describe('Max number of activities to return'),
    })),
    execute: async ({ clientId, limit }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('activities')
        .select('*, clients(id, company_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) return { error: error.message }
      return { activities: data, count: data?.length ?? 0 }
    },
  }),

  generateDocument: tool({
    description: 'Generate a document (proposal, price sheet, or contract) as a PDF for a client. Always fetch client info first to populate content_data properly.',
    inputSchema: zodSchema(z.object({
      type: z.enum(['proposal', 'price_sheet', 'contract', 'counter_proposal']).describe('Document type'),
      title: z.string().describe('Document title'),
      client_id: z.string().uuid().describe('The client UUID'),
      deal_id: z.string().uuid().optional().describe('Optional deal UUID to link'),
      content_data: z.record(z.string(), z.unknown()).describe('Document content — structure depends on type. Proposal: { clientName, projectName, executiveSummary, scopeItems: [{title, description}], timeline: [{phase, duration, description}], pricing: [{item, description, hours, rate}], terms: [string], validUntil? }. Price sheet: { clientName, projectName?, lineItems: [{service, description, hours, rate}], discount?, notes?, validUntil? }. Contract: { clientName, clientContactName, clientContactEmail?, projectName, scope, deliverables: [string], startDate, endDate, paymentTerms, totalValue (in cents), ipClause?, terminationClause? }.'),
    })),
    execute: async ({ type, title, client_id, deal_id, content_data }) => {
      try {
        const doc = await generateDocumentService({
          type: type as DocumentType,
          title,
          client_id,
          deal_id,
          content_data,
        })
        return {
          document: { id: doc.id, title: doc.title, type: doc.type, status: doc.status },
          viewUrl: `/admin/documents/${doc.id}`,
        }
      } catch (err) {
        console.error('generateDocument failed:', err)
        return { error: err instanceof Error ? err.message : 'Document generation failed' }
      }
    },
  }),

  generateCustomDocument: tool({
    description: 'Generate a fully-branded PDF from freeform markdown — research briefs, meeting recaps, one-pagers, memos, client-ready deliverables that do not fit the proposal/price_sheet/contract mold. Body accepts GFM markdown (headings, lists, tables, blockquotes, links, bold/italic). client_id is optional — omit it for generic artifacts like "AI for SMBs one-pager". When attached to a client, logs an activity on their timeline.',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('generateCustomDocument', { logActivity: true }, async (args: {
      title: string
      subtitle?: string
      body: string
      sections?: Array<{ heading: string; body: string }>
      client_id?: string
      deal_id?: string
      project_id?: string
    }) => {
      try {
        const content_data: Record<string, unknown> = {
          title: args.title,
          body: args.body,
          ...(args.subtitle ? { subtitle: args.subtitle } : {}),
          ...(args.sections ? { sections: args.sections } : {}),
        }
        const doc = await generateDocumentService({
          type: 'custom',
          title: args.title,
          client_id: args.client_id ?? null,
          deal_id: args.deal_id,
          project_id: args.project_id,
          content_data,
        })
        return {
          document: { id: doc.id, title: doc.title, type: doc.type, status: doc.status },
          client_id: args.client_id ?? null,
          viewUrl: `/admin/documents/${doc.id}`,
          summary: `Generated custom document: ${doc.title}`,
        }
      } catch (err) {
        console.error('generateCustomDocument failed:', err)
        return { error: err instanceof Error ? err.message : 'Custom document generation failed' }
      }
    }),
  }),

  sendDocumentToClient: tool({
    description: 'Send a generated document to a client via email with PDF attachment. The document must already be generated.',
    inputSchema: zodSchema(z.object({
      documentId: z.string().uuid().describe('The document UUID to send'),
      recipientEmail: z.string().email().optional().describe('Override recipient email (defaults to primary contact)'),
      message: z.string().optional().describe('Optional message to include in the email'),
    })),
    execute: async ({ documentId, recipientEmail, message }) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, recipientEmail, message }),
        })
        const data = await res.json()
        if (!res.ok) return { error: data.error || 'Failed to send document' }
        return { success: true, sentTo: data.sentTo }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to send document' }
      }
    },
  }),

  updateDocumentStatus: tool({
    description: 'Update the status of a document (e.g. from draft to final, or to accepted/rejected)',
    inputSchema: zodSchema(z.object({
      documentId: z.string().uuid().describe('The document UUID'),
      status: z.enum(['draft', 'final', 'sent', 'accepted', 'rejected']).describe('New status'),
    })),
    execute: async ({ documentId, status }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', documentId)
        .select()
        .single()
      if (error) return { error: error.message }
      return { document: { id: data.id, title: data.title, type: data.type, status: data.status } }
    },
  }),

  searchEmails: tool({
    description: 'Search emails by query, client, or direction. Returns matching emails with subject, from, date, snippet.',
    inputSchema: zodSchema(z.object({
      query: z.string().optional().describe('Search in subject and body'),
      clientId: z.string().uuid().optional().describe('Filter by client ID'),
      direction: z.enum(['inbound', 'outbound']).optional().describe('Filter by direction'),
      limit: z.number().optional().default(10).describe('Max results'),
    })),
    execute: async ({ query, clientId, direction, limit }) => {
      const supabase = await createServiceClient()
      let q = supabase
        .from('emails')
        .select('id, subject, from_address, from_name, to_addresses, snippet, internal_date, direction, gmail_thread_id, clients(id, company_name)')
        .order('internal_date', { ascending: false })
        .limit(limit)

      if (clientId) q = q.eq('client_id', clientId)
      if (direction) q = q.eq('direction', direction)
      if (query) q = q.or(`subject.ilike.%${query}%,body_text.ilike.%${query}%`)

      const { data, error } = await q
      if (error) return { error: error.message }
      return { emails: data, count: data?.length ?? 0 }
    },
  }),

  getEmailThread: tool({
    description: 'Get all emails in a Gmail thread, ordered chronologically, with body text and client name.',
    inputSchema: zodSchema(z.object({
      threadId: z.string().describe('The Gmail thread ID'),
    })),
    execute: async ({ threadId }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('emails')
        .select('id, subject, from_address, from_name, to_addresses, cc_addresses, body_text, internal_date, direction, gmail_thread_id, raw_headers, clients(id, company_name)')
        .eq('gmail_thread_id', threadId)
        .order('internal_date', { ascending: true })
      if (error) return { error: error.message }
      return { thread: data, messageCount: data?.length ?? 0 }
    },
  }),

  sendEmail: tool({
    description: 'Send an email via Gmail. Write the body in plain prose (markdown supported: **bold**, *italic*, [link](url), bullet lists with -, numbered lists). The tool wraps your body in a branded Syntric template with header, signature, and contact info — do NOT include greeting fluff like "Best regards, Chandler" or contact details, the template handles that. Just write the message itself.',
    inputSchema: zodSchema(z.object({
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body in plain prose / markdown. Do not include signature, contact info, or sign-off — the template adds these.'),
      cc: z.string().optional().describe('CC recipients'),
      threadId: z.string().optional().describe('Gmail thread ID (for replies)'),
      inReplyTo: z.string().optional().describe('Message-ID header of the email being replied to'),
      references: z.string().optional().describe('References header for threading'),
    })),
    execute: async ({ to, subject, body, cc, threadId, inReplyTo, references }) => {
      try {
        const html = renderBrandedEmail(body)
        const result = await sendMessage({ to, cc, subject, body: html, threadId, inReplyTo, references })

        const gmailMsg = await getMessage(result.id)
        const parsed = parseMessage(gmailMsg)
        const account = await getGmailAccount()

        const supabase = await createServiceClient()
        const recipientAddresses = [...parsed.to, ...parsed.cc].map(a => a.address.toLowerCase())
        const { data: contacts } = await supabase
          .from('client_contacts')
          .select('id, client_id')
          .in('email', recipientAddresses)

        const match = contacts?.[0] ?? null

        const { data: email } = await supabase.from('emails').upsert({
          gmail_message_id: parsed.messageId,
          gmail_thread_id: parsed.threadId,
          client_id: match?.client_id ?? null,
          from_address: account?.email_address ?? parsed.from.address,
          from_name: parsed.from.name,
          to_addresses: parsed.to,
          cc_addresses: parsed.cc,
          bcc_addresses: parsed.bcc,
          subject: parsed.subject,
          body_text: parsed.bodyText,
          body_html: parsed.bodyHtml,
          snippet: parsed.snippet,
          label_ids: parsed.labelIds,
          is_read: true,
          is_starred: false,
          is_draft: false,
          has_attachments: parsed.hasAttachments,
          internal_date: parsed.internalDate.toISOString(),
          direction: 'outbound',
          matched_contact_id: match?.id ?? null,
          raw_headers: parsed.headers,
        }, { onConflict: 'gmail_message_id' }).select('id').single()

        if (email) {
          embedInBackground('email', email.id, serializeEmail({
            subject: parsed.subject,
            from: parsed.from,
            to: parsed.to,
            bodyText: parsed.bodyText,
            internalDate: parsed.internalDate,
          }))
        }

        if (match?.client_id) {
          await supabase.from('activities').insert({
            client_id: match.client_id,
            type: 'email',
            title: `Email sent: ${subject}`,
            description: `Sent to ${to}`,
            metadata: { email_id: email?.id, gmail_message_id: result.id },
            is_auto_generated: true,
          })
        }

        return { success: true, messageId: result.id, threadId: result.threadId, emailId: email?.id }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to send email' }
      }
    },
  }),

  searchTranscripts: tool({
    description: 'Search meeting transcripts by query or client. Returns title, date, summary, sentiment.',
    inputSchema: zodSchema(z.object({
      query: z.string().optional().describe('Search in title, summary, and transcript'),
      clientId: z.string().uuid().optional().describe('Filter by client ID'),
      limit: z.number().optional().default(10).describe('Max results'),
    })),
    execute: async ({ query, clientId, limit }) => {
      const supabase = await createServiceClient()
      let q = supabase
        .from('transcripts')
        .select('id, title, date, duration_minutes, summary, sentiment, topics, action_items, key_decisions, processing_status, clients(id, company_name)')
        .eq('processing_status', 'completed')
        .order('date', { ascending: false })
        .limit(limit)

      if (clientId) q = q.eq('client_id', clientId)
      if (query) q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%,raw_transcript.ilike.%${query}%`)

      const { data, error } = await q
      if (error) return { error: error.message }
      return { transcripts: data, count: data?.length ?? 0 }
    },
  }),

  getTranscriptDetail: tool({
    description: 'Get full transcript detail including action items, key decisions, summary, and raw transcript (truncated).',
    inputSchema: zodSchema(z.object({
      transcriptId: z.string().uuid().describe('The transcript UUID'),
    })),
    execute: async ({ transcriptId }) => {
      const supabase = await createServiceClient()
      const { data, error } = await supabase
        .from('transcripts')
        .select('*, clients(id, company_name)')
        .eq('id', transcriptId)
        .single()
      if (error) return { error: error.message }
      // Truncate raw transcript to keep context reasonable
      if (data.raw_transcript && data.raw_transcript.length > 2000) {
        data.raw_transcript = data.raw_transcript.substring(0, 2000) + '... [truncated]'
      }
      return data
    },
  }),

  semanticSearch: tool({
    description: 'Search across all CRM data (clients, projects, deals, activities, emails, transcripts) using natural language.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('Natural language search query'),
      types: z.array(z.enum(['client', 'project', 'deal', 'activity', 'email', 'transcript'])).optional().describe('Filter to specific entity types'),
      limit: z.number().optional().default(8).describe('Max results to return'),
    })),
    execute: async ({ query, types, limit }) => {
      try {
        const results = await searchSimilar(query, { types, limit })
        if (results.length === 0) return { results: [], message: 'No matching results found.' }

        // Enrich with entity details
        const supabase = await createServiceClient()
        const enriched = await Promise.all(
          results.map(async (r) => {
            let details: Record<string, unknown> = {}
            switch (r.entity_type) {
              case 'client': {
                const { data } = await supabase.from('clients').select('id, company_name, industry, status').eq('id', r.entity_id).single()
                details = data ?? {}
                break
              }
              case 'project': {
                const { data } = await supabase.from('projects').select('id, name, status, clients(company_name)').eq('id', r.entity_id).single()
                details = data ?? {}
                break
              }
              case 'deal': {
                const { data } = await supabase.from('deals').select('id, title, stage, value, clients(company_name)').eq('id', r.entity_id).single()
                details = data ?? {}
                break
              }
              case 'activity': {
                const { data } = await supabase.from('activities').select('id, title, type, created_at, clients(company_name)').eq('id', r.entity_id).single()
                details = data ?? {}
                break
              }
              case 'email': {
                const { data } = await supabase.from('emails').select('id, subject, from_address, direction, internal_date, clients(company_name)').eq('id', r.entity_id).single()
                details = data ?? {}
                break
              }
              case 'transcript': {
                const { data } = await supabase.from('transcripts').select('id, title, date, sentiment, summary, clients(company_name)').eq('id', r.entity_id).single()
                details = data ?? {}
                break
              }
            }
            return { type: r.entity_type, similarity: r.similarity, content: r.content, details }
          })
        )

        return { results: enriched, count: enriched.length }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Semantic search failed' }
      }
    },
  }),

  // ── Phase 2A: Client + contact writes ──

  createClient: tool({
    description: 'Create a new client (company) record. Defaults status to "prospect" — promote to "active" only once they are a paying customer.',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('createClient', { logActivity: true }, async (args: {
      company_name: string
      industry?: string
      website?: string
      status: 'active' | 'inactive' | 'prospect'
      source: 'website' | 'referral' | 'cold_outreach' | 'event' | 'other'
      tags: string[]
      notes: string
      address_street?: string
      address_city?: string
      address_state?: string
      address_zip?: string
    }) => {
      const supabase = await createServiceClient()
      const input: ClientInput = {
        company_name: args.company_name,
        industry: args.industry ?? null,
        website: args.website ?? null,
        status: args.status,
        source: args.source,
        tags: args.tags,
        notes: args.notes,
        address_street: args.address_street ?? null,
        address_city: args.address_city ?? null,
        address_state: args.address_state ?? null,
        address_zip: args.address_zip ?? null,
        created_from_submission: null,
      }
      const { data, error } = await createClientRow(supabase, input)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create client' }
      return {
        client: data,
        client_id: data.id,
        summary: `Created client ${data.company_name}`,
      }
    }),
  }),

  updateClient: tool({
    description: 'Patch specific fields on an existing client. Only send fields that changed — do NOT re-send the whole record. For archiving, use archiveClient instead.',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('updateClient', { logActivity: true }, async (args: Record<string, unknown>) => {
      const supabase = await createServiceClient()
      const clientId = args.clientId as string
      const { data: existing, error: fetchErr } = await getClient(supabase, clientId)
      if (fetchErr || !existing) return { error: 'Client not found' }

      const patch: Partial<ClientInput> = {}
      const prev: Partial<ClientInput> = {}
      const patchableKeys = [
        'company_name', 'industry', 'website', 'status', 'source',
        'tags', 'notes', 'address_street', 'address_city', 'address_state', 'address_zip',
      ] as const
      for (const key of patchableKeys) {
        if (key in args && args[key] !== undefined) {
          ;(patch as Record<string, unknown>)[key] = args[key]
          ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
        }
      }

      const { data, error } = await updateClientRow(supabase, clientId, patch)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update client' }
      return {
        client: data,
        client_id: data.id,
        summary: `Updated client ${data.company_name}`,
        reversalHint: { kind: 'updateClient', clientId, prev },
      }
    }),
  }),

  archiveClient: tool({
    description: 'Soft-delete a client by flipping status to "inactive". Requires a short reason (if the user did not give one, ask once before calling).',
    inputSchema: zodSchema(z.object({
      clientId: z.string().uuid().describe('The client UUID'),
      reason: z.string().min(1).describe('Why the client is being archived'),
    })),
    execute: withAIAudit('archiveClient', { logActivity: true }, async ({ clientId, reason }: { clientId: string; reason: string }) => {
      const supabase = await createServiceClient()
      const { data: existing, error: fetchErr } = await getClient(supabase, clientId)
      if (fetchErr || !existing) return { error: 'Client not found' }
      if (existing.status === 'inactive') return { error: 'Client is already archived' }

      const prevStatus = existing.status
      const { data, error } = await updateClientRow(supabase, clientId, { status: 'inactive' })
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to archive client' }
      return {
        client: data,
        client_id: data.id,
        summary: `Archived client ${data.company_name}: ${reason}`,
        reversalHint: { kind: 'archiveClient', clientId, prev: { status: prevStatus } },
      }
    }),
  }),

  createContact: tool({
    description: 'Add a contact (person) to an existing client. Requires client_id and name.',
    inputSchema: zodSchema(z.object({
      client_id: z.string().uuid().describe('The client UUID this contact belongs to'),
      name: z.string().min(1).describe('Contact full name'),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.string().optional().describe('Job title / role'),
      is_primary: z.boolean().default(false),
    })),
    execute: withAIAudit('createContact', { logActivity: true }, async (args: {
      client_id: string
      name: string
      email?: string
      phone?: string
      role?: string
      is_primary: boolean
    }) => {
      const supabase = await createServiceClient()
      const input: ClientContactInput = {
        client_id: args.client_id,
        name: args.name,
        email: args.email ?? null,
        phone: args.phone ?? null,
        role: args.role ?? null,
        is_primary: args.is_primary,
      }
      const { data, error } = await addContact(supabase, input) as unknown as { data: { id: string; name: string } | null; error: unknown }
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create contact' }
      return {
        contact: data,
        client_id: args.client_id,
        summary: `Added contact ${data.name}`,
      }
    }),
  }),

  updateContact: tool({
    description: 'Patch specific fields on an existing contact. Only send fields that changed.',
    inputSchema: zodSchema(z.object({
      contactId: z.string().uuid().describe('The contact UUID'),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.string().optional(),
      is_primary: z.boolean().optional(),
    })),
    execute: withAIAudit('updateContact', { logActivity: true }, async (args: Record<string, unknown>) => {
      const supabase = await createServiceClient()
      const contactId = args.contactId as string
      const { data: existing } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('id', contactId)
        .single() as unknown as { data: (Record<string, unknown> & { client_id: string }) | null }
      if (!existing) return { error: 'Contact not found' }

      const patch: Partial<ClientContactInput> = {}
      const prev: Partial<ClientContactInput> = {}
      const patchableKeys = ['name', 'email', 'phone', 'role', 'is_primary'] as const
      for (const key of patchableKeys) {
        if (key in args && args[key] !== undefined) {
          ;(patch as Record<string, unknown>)[key] = args[key]
          ;(prev as Record<string, unknown>)[key] = existing[key]
        }
      }

      const { data, error } = await updateContactRow(supabase, contactId, patch) as unknown as { data: { id: string; name: string; client_id: string } | null; error: unknown }
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update contact' }
      return {
        contact: data,
        client_id: existing.client_id,
        summary: `Updated contact ${data.name}`,
        reversalHint: { kind: 'updateContact', contactId, prev },
      }
    }),
  }),

  // ── Phase 2B: Lead writes ──

  createLead: tool({
    description: 'Capture a new lead (unqualified contact) — use this when you meet someone but they are not yet a committed client. A lead is low-signal; a client is a committed customer. Use createClient directly only when the relationship is already qualified.',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('createLead', { logActivity: false }, async (args: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      preferred_contact?: 'phone' | 'email' | 'sms'
      role?: string
      organization?: string
      business_type?: string
      service_interest?: string
      request?: string
      summary?: string
      status: 'new' | 'contacted' | 'qualified' | 'converted' | 'dismissed'
      source: string
    }) => {
      const supabase = await createServiceClient()
      const input: LeadInput = {
        session_id: `ai:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
        first_name: args.first_name ?? null,
        last_name: args.last_name ?? null,
        email: args.email ?? null,
        phone: args.phone ?? null,
        preferred_contact: args.preferred_contact ?? null,
        role: args.role ?? null,
        organization: args.organization ?? null,
        business_type: args.business_type ?? null,
        service_interest: args.service_interest ?? null,
        request: args.request ?? null,
        summary: args.summary ?? null,
        status: args.status,
        metadata: { source: args.source },
      }
      const { data, error } = await createLeadRow(supabase, input)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create lead' }
      const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.organization || data.email || 'unknown'
      return {
        lead: data,
        summary: `Created lead ${displayName}`,
      }
    }),
  }),

  updateLead: tool({
    description: 'Patch fields on an existing lead (e.g., after web research: organization, industry, role).',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('updateLead', { logActivity: false }, async (args: Record<string, unknown>) => {
      const supabase = await createServiceClient()
      const leadId = args.leadId as string
      const { data: existing, error: fetchErr } = await getLead(supabase, leadId)
      if (fetchErr || !existing) return { error: 'Lead not found' }

      const patch: Partial<LeadInput> = {}
      const prev: Partial<LeadInput> = {}
      const patchableKeys = [
        'first_name', 'last_name', 'email', 'phone', 'preferred_contact',
        'role', 'organization', 'business_type', 'service_interest',
        'request', 'summary', 'status',
      ] as const
      for (const key of patchableKeys) {
        if (key in args && args[key] !== undefined) {
          ;(patch as Record<string, unknown>)[key] = args[key]
          ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
        }
      }

      const { data, error } = await updateLeadRow(supabase, leadId, patch)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update lead' }
      return {
        lead: data,
        summary: `Updated lead ${leadId}`,
        reversalHint: { kind: 'updateLead', leadId, prev },
      }
    }),
  }),

  convertLeadToClient: tool({
    description: 'Promote a qualified lead into a client record (also creates a primary contact). Use when the lead is ready to engage.',
    inputSchema: zodSchema(z.object({
      leadId: z.string().uuid().describe('The lead UUID to convert'),
    })),
    execute: withAIAudit('convertLeadToClient', { logActivity: true }, async ({ leadId }: { leadId: string }) => {
      const supabase = await createServiceClient()
      const { data: client, error } = await convertToClient(supabase, leadId)
      if (error || !client) {
        const errMsg = typeof error === 'string' ? error : (error instanceof Error ? error.message : 'Failed to convert lead')
        return { error: errMsg }
      }
      return {
        client,
        client_id: client.id,
        leadId,
        summary: `Converted lead → client ${client.company_name}`,
      }
    }),
  }),

  dismissLead: tool({
    description: 'Soft-delete a lead (status="dismissed"). Use for spam, duplicates, or not-a-fit leads. Requires a short reason.',
    inputSchema: zodSchema(z.object({
      leadId: z.string().uuid().describe('The lead UUID'),
      reason: z.string().min(1).describe('Why the lead is being dismissed (spam, duplicate, not a fit, etc.)'),
    })),
    execute: withAIAudit('dismissLead', { logActivity: false }, async ({ leadId, reason }: { leadId: string; reason: string }) => {
      const supabase = await createServiceClient()
      const { data: existing, error: fetchErr } = await getLead(supabase, leadId)
      if (fetchErr || !existing) return { error: 'Lead not found' }
      if (existing.status === 'dismissed') return { error: 'Lead is already dismissed' }

      const prevStatus = existing.status
      const { data, error } = await updateLeadStatus(supabase, leadId, 'dismissed')
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to dismiss lead' }
      return {
        lead: data,
        summary: `Dismissed lead: ${reason}`,
        reversalHint: { kind: 'dismissLead', leadId, prev: { status: prevStatus } },
      }
    }),
  }),

  // ── Phase 2C: Deal / project / activity writes ──

  createDeal: tool({
    description: 'Create a new deal in the pipeline. stage_history is initialized automatically. value is in CENTS. Use updateDealStage to change stage later, not updateDeal.',
    inputSchema: zodSchema(z.object({
      client_id: z.string().uuid().describe('Owning client UUID'),
      title: z.string().min(1).describe('Deal title'),
      stage: z.enum(['lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost']).describe('Starting stage'),
      value: z.number().int().min(0).describe('Deal value in cents (e.g., $40,000 = 4000000)'),
      probability: z.number().min(0).max(100).default(25),
      expected_close_date: z.string().optional().describe('ISO yyyy-mm-dd'),
      project_id: z.string().uuid().optional(),
      notes: z.string().default(''),
    })),
    execute: withAIAudit('createDeal', { logActivity: true }, async (args: {
      client_id: string
      title: string
      stage: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'
      value: number
      probability: number
      expected_close_date?: string
      project_id?: string
      notes: string
    }) => {
      const supabase = await createServiceClient()
      const input: DealInput = {
        client_id: args.client_id,
        project_id: args.project_id ?? null,
        title: args.title,
        stage: args.stage,
        value: args.value,
        probability: args.probability,
        expected_close_date: args.expected_close_date ?? null,
        actual_close_date: null,
        lost_reason: null,
        notes: args.notes,
        is_archived: false,
        archived_at: null,
        archive_reason: null,
      }
      const { data, error } = await createDealRow(supabase, input)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create deal' }
      return {
        deal: data,
        client_id: data.client_id,
        summary: `Created deal ${data.title} @ ${data.stage}`,
      }
    }),
  }),

  updateDeal: tool({
    description: 'Patch value, probability, expected_close_date, notes, or project_id on a deal. Do NOT include stage — use updateDealStage for stage changes.',
    inputSchema: zodSchema(z.object({
      dealId: z.string().uuid().describe('The deal UUID'),
      title: z.string().optional(),
      value: z.number().int().min(0).optional().describe('Value in cents'),
      probability: z.number().min(0).max(100).optional(),
      expected_close_date: z.string().optional(),
      project_id: z.string().uuid().optional(),
      notes: z.string().optional(),
    })),
    execute: withAIAudit('updateDeal', { logActivity: true }, async (args: Record<string, unknown>) => {
      const supabase = await createServiceClient()
      const dealId = args.dealId as string
      const { data: existing, error: fetchErr } = await getDeal(supabase, dealId)
      if (fetchErr || !existing) return { error: 'Deal not found' }

      const patch: Partial<DealInput> = {}
      const prev: Partial<DealInput> = {}
      const patchableKeys = ['title', 'value', 'probability', 'expected_close_date', 'project_id', 'notes'] as const
      for (const key of patchableKeys) {
        if (key in args && args[key] !== undefined) {
          ;(patch as Record<string, unknown>)[key] = args[key]
          ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
        }
      }

      const { data, error } = await updateDealRow(supabase, dealId, patch)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update deal' }
      return {
        deal: data,
        client_id: data.client_id,
        summary: `Updated deal ${data.title}`,
        reversalHint: { kind: 'updateDeal', dealId, prev },
      }
    }),
  }),

  updateDealStage: tool({
    description: 'Change a deal stage, appending to stage_history. Moving to "lost" REQUIRES lostReason. Moving to "won" or "lost" auto-sets actual_close_date.',
    inputSchema: zodSchema(z.object({
      dealId: z.string().uuid().describe('The deal UUID'),
      newStage: z.enum(['lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost']),
      lostReason: z.string().optional().describe('Required when newStage = "lost" (why the deal was lost)'),
      note: z.string().optional().describe('Optional note on this stage transition'),
    })),
    execute: withAIAudit('updateDealStage', { logActivity: true }, async ({ dealId, newStage, lostReason, note }: {
      dealId: string
      newStage: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'
      lostReason?: string
      note?: string
    }) => {
      const supabase = await createServiceClient()
      const { data: existing, error: fetchErr } = await getDeal(supabase, dealId)
      if (fetchErr || !existing) return { error: 'Deal not found' }
      if (newStage === 'lost' && !lostReason) return { error: 'lostReason required when moving to "lost"' }
      if (existing.stage === newStage) return { error: `Deal is already at stage "${newStage}"` }

      const prevStage = existing.stage
      const prevHistory = existing.stage_history ?? []
      const prevCloseDate = existing.actual_close_date
      const prevLostReason = existing.lost_reason

      const historyEntry = {
        from: prevStage,
        to: newStage,
        timestamp: new Date().toISOString(),
        ...(note ? { note } : {}),
      }

      const update: Partial<DealInput> & { stage_history: typeof prevHistory } = {
        stage: newStage,
        stage_history: [...prevHistory, historyEntry],
        ...(newStage === 'won' || newStage === 'lost'
          ? { actual_close_date: new Date().toISOString().split('T')[0] }
          : {}),
        ...(newStage === 'lost' ? { lost_reason: lostReason! } : {}),
      }

      const { data, error } = await supabase
        .from('deals')
        .update(update)
        .eq('id', dealId)
        .select()
        .single() as unknown as { data: (typeof existing) | null; error: unknown }
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update deal stage' }
      return {
        deal: data,
        client_id: data.client_id,
        summary: `Moved deal ${data.title} ${prevStage} → ${newStage}${newStage === 'lost' ? ` (${lostReason})` : ''}`,
        reversalHint: {
          kind: 'updateDealStage',
          dealId,
          prev: {
            stage: prevStage,
            stage_history: prevHistory,
            actual_close_date: prevCloseDate,
            lost_reason: prevLostReason,
          },
        },
      }
    }),
  }),

  archiveDeal: tool({
    description: 'Soft-archive a deal (is_archived=true). Use for mistakes, duplicates, or indefinitely-parked deals. DO NOT use archiveDeal for actual losses — use updateDealStage with stage="lost" and a lostReason for that.',
    inputSchema: zodSchema(z.object({
      dealId: z.string().uuid().describe('The deal UUID'),
      reason: z.string().min(1).describe('Why the deal is being archived'),
    })),
    execute: withAIAudit('archiveDeal', { logActivity: true }, async ({ dealId, reason }: { dealId: string; reason: string }) => {
      const supabase = await createServiceClient()
      const { data: existing, error: fetchErr } = await getDeal(supabase, dealId)
      if (fetchErr || !existing) return { error: 'Deal not found' }
      if (existing.is_archived) return { error: 'Deal is already archived' }

      const { data, error } = await supabase
        .from('deals')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archive_reason: reason,
        })
        .eq('id', dealId)
        .select()
        .single() as unknown as { data: (typeof existing) | null; error: unknown }
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to archive deal' }
      return {
        deal: data,
        client_id: data.client_id,
        summary: `Archived deal ${data.title}: ${reason}`,
        reversalHint: {
          kind: 'archiveDeal',
          dealId,
          prev: { is_archived: false, archived_at: null, archive_reason: null },
        },
      }
    }),
  }),

  createProject: tool({
    description: 'Create a new project for a client. Status defaults to "planning".',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('createProject', { logActivity: true }, async (args: {
      client_id: string
      name: string
      description: string
      scope: string
      status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
      tech_stack: string[]
      budget_min?: number
      budget_max?: number
      start_date?: string
      target_end_date?: string
    }) => {
      const supabase = await createServiceClient()
      const input: ProjectInput = {
        client_id: args.client_id,
        name: args.name,
        description: args.description,
        scope: args.scope,
        status: args.status,
        tech_stack: args.tech_stack,
        budget_min: args.budget_min ?? null,
        budget_max: args.budget_max ?? null,
        start_date: args.start_date ?? null,
        target_end_date: args.target_end_date ?? null,
        actual_end_date: null,
        links: [],
      }
      const { data, error } = await createProjectRow(supabase, input)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create project' }
      return {
        project: data,
        client_id: data.client_id,
        summary: `Created project ${data.name}`,
      }
    }),
  }),

  updateProject: tool({
    description: 'Patch fields on a project. Do NOT include status — use updateProjectStatus for status changes.',
    inputSchema: zodSchema(z.object({
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
    })),
    execute: withAIAudit('updateProject', { logActivity: true }, async (args: Record<string, unknown>) => {
      const supabase = await createServiceClient()
      const projectId = args.projectId as string
      const { data: existing, error: fetchErr } = await getProject(supabase, projectId)
      if (fetchErr || !existing) return { error: 'Project not found' }

      const patch: Partial<ProjectInput> = {}
      const prev: Partial<ProjectInput> = {}
      const patchableKeys = [
        'name', 'description', 'scope', 'tech_stack',
        'budget_min', 'budget_max', 'start_date', 'target_end_date', 'actual_end_date',
      ] as const
      for (const key of patchableKeys) {
        if (key in args && args[key] !== undefined) {
          ;(patch as Record<string, unknown>)[key] = args[key]
          ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
        }
      }

      const { data, error } = await updateProjectRow(supabase, projectId, patch)
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update project' }
      return {
        project: data,
        client_id: data.client_id,
        summary: `Updated project ${data.name}`,
        reversalHint: { kind: 'updateProject', projectId, prev },
      }
    }),
  }),

  updateProjectStatus: tool({
    description: 'Change a project status. Moving to "paused" or "cancelled" requires a reason.',
    inputSchema: zodSchema(z.object({
      projectId: z.string().uuid(),
      status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']),
      reason: z.string().optional().describe('Required when moving to "paused" or "cancelled"'),
    })),
    execute: withAIAudit('updateProjectStatus', { logActivity: true }, async ({ projectId, status, reason }: {
      projectId: string
      status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
      reason?: string
    }) => {
      const supabase = await createServiceClient()
      if ((status === 'paused' || status === 'cancelled') && !reason) {
        return { error: `reason required when moving to "${status}"` }
      }
      const { data: existing, error: fetchErr } = await getProject(supabase, projectId)
      if (fetchErr || !existing) return { error: 'Project not found' }
      if (existing.status === status) return { error: `Project is already at status "${status}"` }

      const prevStatus = existing.status
      const { data, error } = await updateProjectRow(supabase, projectId, { status })
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update project status' }
      return {
        project: data,
        client_id: data.client_id,
        summary: `Moved project ${data.name}: ${prevStatus} → ${status}${reason ? ` (${reason})` : ''}`,
        reversalHint: { kind: 'updateProjectStatus', projectId, prev: { status: prevStatus } },
      }
    }),
  }),

  addActivity: tool({
    description: 'Manually log a note / call / meeting / email / document activity against a client. Pick the correct type. Do NOT use this for things the system auto-logs (archives, status changes, stage transitions) — those appear automatically.',
    inputSchema: zodSchema(z.object({
      client_id: z.string().uuid(),
      type: z.enum(['note', 'call', 'email', 'meeting', 'document']),
      title: z.string().min(1),
      description: z.string().default(''),
      deal_id: z.string().uuid().optional(),
      project_id: z.string().uuid().optional(),
      metadata: z.record(z.string(), z.unknown()).default({}),
    })),
    execute: withAIAudit('addActivity', { logActivity: false }, async (args: {
      client_id: string
      type: 'note' | 'call' | 'email' | 'meeting' | 'document'
      title: string
      description: string
      deal_id?: string
      project_id?: string
      metadata: Record<string, unknown>
    }) => {
      const supabase = await createServiceClient()
      const { data, error } = await createActivity(supabase, {
        client_id: args.client_id,
        deal_id: args.deal_id ?? null,
        project_id: args.project_id ?? null,
        type: args.type,
        title: args.title,
        description: args.description,
        metadata: args.metadata,
        is_auto_generated: false,
      })
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to log activity' }
      return {
        activity: data,
        client_id: args.client_id,
        summary: `Logged ${args.type}: ${args.title}`,
      }
    }),
  }),

  logFollowUp: tool({
    description: 'Log a future-dated follow-up reminder as a note activity. Put the due date in due_date (ISO yyyy-mm-dd or full timestamp). Stored in metadata.follow_up_at.',
    inputSchema: zodSchema(z.object({
      client_id: z.string().uuid(),
      due_date: z.string().describe('ISO yyyy-mm-dd or full timestamp'),
      title: z.string().min(1),
      description: z.string().default(''),
      deal_id: z.string().uuid().optional(),
      project_id: z.string().uuid().optional(),
    })),
    execute: withAIAudit('logFollowUp', { logActivity: false }, async (args: {
      client_id: string
      due_date: string
      title: string
      description: string
      deal_id?: string
      project_id?: string
    }) => {
      const supabase = await createServiceClient()
      const { data, error } = await createActivity(supabase, {
        client_id: args.client_id,
        deal_id: args.deal_id ?? null,
        project_id: args.project_id ?? null,
        type: 'note',
        title: args.title,
        description: args.description,
        metadata: { follow_up_at: args.due_date },
        is_auto_generated: false,
      })
      if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to log follow-up' }
      return {
        activity: data,
        client_id: args.client_id,
        summary: `Follow-up scheduled for ${args.due_date}: ${args.title}`,
      }
    }),
  }),

  // ── Phase 2C: Native web search ──
  // Anthropic server-side tool. maxUses caps calls per turn. No custom wrapper —
  // the SDK executes it server-side and surfaces calls via result.steps.
  web_search: anthropic.tools.webSearch_20250305({
    maxUses: 5,
  }),

  // ── Phase 4: SQL escape hatch ──

  querySql: tool({
    description: 'Run an arbitrary SELECT against the CRM database. Use this when no existing tool covers the question (custom filters, complex joins, ad-hoc aggregations). Only SELECT is accepted. Tables are limited to the allowlist (clients, deals, projects, activities, documents, emails, transcripts, widget_leads, conversations, messages, ai_actions, client_contacts). Unbounded queries are auto-capped at 500 rows — refine the WHERE / LIMIT if truncated. 10s statement timeout.',
    inputSchema: zodSchema(z.object({
      query: z.string().min(1).describe('A single SELECT statement.'),
      reason: z.string().optional().describe('Short note on why (shown in ai_actions for auditability).'),
    })),
    execute: withAIAudit('querySql', { logActivity: false }, async ({ query }: { query: string; reason?: string }) => {
      const validation = parseAndValidate(query, 'read')
      if (!validation.ok) return { error: validation.error }
      try {
        const result = await executeQuery(validation.normalized)
        return {
          rows: result.rows,
          rowCount: result.rowCount,
          columns: result.columns,
          truncated: result.truncated,
          targetTables: validation.targetTables,
          injectedLimit: validation.injectedLimit,
          summary: `querySql → ${result.rowCount} row${result.rowCount === 1 ? '' : 's'}${result.truncated ? ' (capped)' : ''}`,
        }
      } catch (err) {
        return { error: `Query failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    }),
  }),

  writeSql: tool({
    description: 'Run an arbitrary INSERT or UPDATE against the CRM database. Use ONLY when no explicit write tool fits (prefer updateDealStage, archiveClient, createClient, etc.). DELETE is rejected — use archive* / dismiss* / hardDelete* tools. Always include a WHERE clause on UPDATE. Tables + columns are limited by the allowlist. For reversibility, UPDATE captures a pre-image snapshot and INSERT captures inserted IDs — both surface in reversal_hint.',
    inputSchema: zodSchema(z.object({
      query: z.string().min(1).describe('A single INSERT or UPDATE statement. No DELETE, no DDL.'),
      reason: z.string().min(1).describe('Short human-readable reason for the write — shown on the audit timeline.'),
    })),
    execute: withAIAudit('writeSql', { logActivity: false }, async ({ query, reason }: { query: string; reason: string }) => {
      const validation = parseAndValidate(query, 'write')
      if (!validation.ok) return { error: validation.error }
      const targetTable = getTargetTable(validation.normalized)

      // UPDATE: snapshot pre-image for reversal.
      let preImage: Record<string, unknown>[] = []
      if (validation.statementType === 'update') {
        const pre = buildPreImageSelectForUpdate(validation.normalized)
        if (pre) {
          try {
            const preResult = await executeQuery(pre.sql)
            preImage = preResult.rows
          } catch {
            // If pre-image fails we still proceed, but log it.
            preImage = []
          }
        }
      }

      // INSERT: add RETURNING id so we can report inserted row IDs.
      const execQuery = validation.statementType === 'insert'
        ? ensureInsertReturning(validation.normalized)
        : validation.normalized

      try {
        const result = await executeQuery(execQuery)

        if (validation.statementType === 'insert') {
          const insertedIds = result.rows.map(r => r.id).filter(Boolean)
          return {
            inserted: result.rows,
            rowCount: result.rowCount,
            targetTable,
            targetTables: validation.targetTables,
            summary: `writeSql INSERT → ${result.rowCount} row${result.rowCount === 1 ? '' : 's'} into ${targetTable} (${reason})`,
            reversalHint: {
              kind: 'writeSql-insert' as const,
              table: targetTable,
              insertedIds,
            },
          }
        }
        // UPDATE
        return {
          updated: result.rows,
          rowCount: result.rowCount,
          targetTable,
          targetTables: validation.targetTables,
          summary: `writeSql UPDATE → ${result.rowCount} row${result.rowCount === 1 ? '' : 's'} on ${targetTable} (${reason})`,
          reversalHint: {
            kind: 'writeSql-update' as const,
            table: targetTable,
            pre: preImage,
          },
        }
      } catch (err) {
        return { error: `Write failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    }),
  }),

  describeSchema: tool({
    description: 'Inspect the schema for one or more allowlisted tables — columns (name, type, nullable, default) and indexes. Use this when you are unsure of exact column names before writing a querySql / writeSql.',
    inputSchema: zodSchema(z.object({
      tables: z.array(z.string()).optional().describe('Subset of allowlisted tables. Omit to list all.'),
    })),
    execute: withAIAudit('describeSchema', { logActivity: false }, async ({ tables }: { tables?: string[] }) => {
      const requested = (tables && tables.length > 0) ? tables : ALLOWED_TABLE_NAMES
      const unknown = requested.filter(t => !(t in ALLOWLISTED_TABLES))
      if (unknown.length > 0) {
        return { error: `Unknown table(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_TABLE_NAMES.join(', ')}.` }
      }
      try {
        const cols = await executeInternalRead(
          `SELECT table_name, column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = ANY($1::text[])
           ORDER BY table_name, ordinal_position`,
          [requested],
        ) as Array<{ table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null }>

        const indexes = await executeInternalRead(
          `SELECT tablename, indexname, indexdef
           FROM pg_indexes
           WHERE schemaname = 'public' AND tablename = ANY($1::text[])
           ORDER BY tablename, indexname`,
          [requested],
        ) as Array<{ tablename: string; indexname: string; indexdef: string }>

        const byTable: Record<string, { columns: Array<{ name: string; type: string; nullable: boolean; default: string | null; writable: boolean }>; indexes: Array<{ name: string; definition: string }>; rules: { read: boolean; insert: boolean; update: boolean; blockedCols: readonly string[] } }> = {}
        for (const t of requested) {
          const rule = ALLOWLISTED_TABLES[t as keyof typeof ALLOWLISTED_TABLES]
          byTable[t] = {
            columns: [],
            indexes: [],
            rules: { read: rule.read, insert: rule.insert, update: rule.update, blockedCols: rule.blockedCols },
          }
        }
        for (const c of cols) {
          const rule = ALLOWLISTED_TABLES[c.table_name as keyof typeof ALLOWLISTED_TABLES]
          const writable = isColumnWritable(c.column_name, rule.blockedCols)
          byTable[c.table_name].columns.push({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === 'YES',
            default: c.column_default,
            writable,
          })
        }
        for (const i of indexes) {
          if (byTable[i.tablename]) {
            byTable[i.tablename].indexes.push({ name: i.indexname, definition: i.indexdef })
          }
        }
        return { tables: byTable }
      } catch (err) {
        return { error: `describeSchema failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    }),
  }),

  // ── Phase 2D: Hard deletes (two-step confirm) ──

  hardDeleteClient: tool({
    description: 'PERMANENTLY delete a client and all cascaded data (contacts, deals, projects, activities, documents). Irreversible. Two-step flow: first call WITHOUT confirmToken to get a preview + token; only call again WITH confirmToken after the user affirms on their next turn. Prefer archiveClient over this.',
    inputSchema: zodSchema(z.object({
      id: z.string().uuid().describe('The client UUID'),
      confirmToken: z.string().uuid().optional().describe('Only pass this on the second call, after the user has affirmed.'),
    })),
    execute: withAIAudit('hardDeleteClient', { logActivity: false }, async ({ id, confirmToken }: { id: string; confirmToken?: string }, { context }) => {
      const supabase = await createServiceClient()
      const conversationId = context.conversationId
      if (!conversationId) return { error: 'hard delete requires a conversation context' }

      if (!confirmToken) {
        // Propose: fetch + build preview
        const { data: client } = await supabase
          .from('clients')
          .select('id, company_name, status')
          .eq('id', id)
          .single() as unknown as { data: { id: string; company_name: string; status: string } | null }
        if (!client) return { error: 'Client not found' }

        const [contactsRes, dealsRes, projectsRes, activitiesRes, documentsRes] = await Promise.all([
          supabase.from('client_contacts').select('id', { count: 'exact', head: true }).eq('client_id', id),
          supabase.from('deals').select('id', { count: 'exact', head: true }).eq('client_id', id),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('client_id', id),
          supabase.from('activities').select('id', { count: 'exact', head: true }).eq('client_id', id),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('client_id', id),
        ])

        const preview = {
          kind: 'client' as const,
          id,
          displayName: client.company_name,
          linkedContacts: contactsRes.count ?? 0,
          linkedDeals: dealsRes.count ?? 0,
          linkedProjects: projectsRes.count ?? 0,
          linkedActivities: activitiesRes.count ?? 0,
          linkedDocuments: documentsRes.count ?? 0,
        }
        const { token, expiresAt } = await createPendingAction('hardDeleteClient', { id }, preview, conversationId)
        return {
          pending: true as const,
          token,
          preview,
          expiresAt,
          instruction: `Show this preview to the user. If they affirm on their next message, call hardDeleteClient again with { id: "${id}", confirmToken: "${token}" }. Do not call any other tool in this turn.`,
          client_id: id,
        }
      }

      // Confirm: consume token + delete
      const consume = await consumeConfirmToken(confirmToken, 'hardDeleteClient', conversationId)
      if (!consume.ok) return { error: mapConsumeError(consume.error) }
      if (consume.args.id !== id) return { error: 'confirmToken does not match the client id being deleted' }

      const { data: snapshot } = await supabase
        .from('clients')
        .select('*, client_contacts(*)')
        .eq('id', id)
        .single() as unknown as { data: Record<string, unknown> | null }
      if (!snapshot) return { error: 'Client not found (may have been deleted already)' }

      const { error: delErr } = await deleteClient(supabase, id) as unknown as { error: unknown }
      if (delErr) return { error: delErr instanceof Error ? delErr.message : 'Failed to delete client' }

      return {
        deleted: true as const,
        id,
        displayName: (snapshot.company_name as string) ?? id,
        summary: `Permanently deleted client ${snapshot.company_name}`,
        reversalHint: { kind: 'hardDeleteClient', row: snapshot },
      }
    }),
  }),

  hardDeleteContact: tool({
    description: 'PERMANENTLY delete a single contact. Irreversible. Two-step flow: first call WITHOUT confirmToken for preview + token, then re-call WITH confirmToken after user affirms.',
    inputSchema: zodSchema(z.object({
      id: z.string().uuid().describe('The contact UUID'),
      confirmToken: z.string().uuid().optional(),
    })),
    execute: withAIAudit('hardDeleteContact', { logActivity: false }, async ({ id, confirmToken }: { id: string; confirmToken?: string }, { context }) => {
      const supabase = await createServiceClient()
      const conversationId = context.conversationId
      if (!conversationId) return { error: 'hard delete requires a conversation context' }

      if (!confirmToken) {
        const { data: contact } = await supabase
          .from('client_contacts')
          .select('id, name, email, client_id, clients(company_name)')
          .eq('id', id)
          .single() as unknown as { data: { id: string; name: string; email: string | null; client_id: string; clients: { company_name: string } | null } | null }
        if (!contact) return { error: 'Contact not found' }

        const preview = {
          kind: 'contact' as const,
          id,
          displayName: `${contact.name}${contact.email ? ` <${contact.email}>` : ''}`,
          clientCompany: contact.clients?.company_name ?? null,
        }
        const { token, expiresAt } = await createPendingAction('hardDeleteContact', { id }, preview, conversationId)
        return {
          pending: true as const,
          token,
          preview,
          expiresAt,
          instruction: `Show this preview to the user. If they affirm, re-call hardDeleteContact with { id: "${id}", confirmToken: "${token}" }. Do not call any other tool in this turn.`,
          client_id: contact.client_id,
        }
      }

      const consume = await consumeConfirmToken(confirmToken, 'hardDeleteContact', conversationId)
      if (!consume.ok) return { error: mapConsumeError(consume.error) }
      if (consume.args.id !== id) return { error: 'confirmToken does not match the contact id being deleted' }

      const { data: snapshot } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('id', id)
        .single() as unknown as { data: Record<string, unknown> | null }
      if (!snapshot) return { error: 'Contact not found (may have been deleted already)' }

      const { error: delErr } = await deleteContact(supabase, id) as unknown as { error: unknown }
      if (delErr) return { error: delErr instanceof Error ? delErr.message : 'Failed to delete contact' }

      return {
        deleted: true as const,
        id,
        displayName: (snapshot.name as string) ?? id,
        client_id: snapshot.client_id as string,
        summary: `Permanently deleted contact ${snapshot.name}`,
        reversalHint: { kind: 'hardDeleteContact', row: snapshot },
      }
    }),
  }),

  hardDeleteLead: tool({
    description: 'PERMANENTLY delete a widget lead. Irreversible. Two-step flow: first call WITHOUT confirmToken for preview + token, then re-call WITH confirmToken after user affirms. Prefer dismissLead over this.',
    inputSchema: zodSchema(z.object({
      id: z.string().uuid().describe('The lead UUID'),
      confirmToken: z.string().uuid().optional(),
    })),
    execute: withAIAudit('hardDeleteLead', { logActivity: false }, async ({ id, confirmToken }: { id: string; confirmToken?: string }, { context }) => {
      const supabase = await createServiceClient()
      const conversationId = context.conversationId
      if (!conversationId) return { error: 'hard delete requires a conversation context' }

      if (!confirmToken) {
        const { data: lead } = await supabase
          .from('widget_leads')
          .select('id, first_name, last_name, email, organization, status')
          .eq('id', id)
          .single() as unknown as { data: { id: string; first_name: string | null; last_name: string | null; email: string | null; organization: string | null; status: string } | null }
        if (!lead) return { error: 'Lead not found' }

        const escRes = await supabase
          .from('widget_escalations')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', id)

        const displayName =
          [lead.first_name, lead.last_name].filter(Boolean).join(' ')
          || lead.organization
          || lead.email
          || id

        const preview = {
          kind: 'lead' as const,
          id,
          displayName,
          status: lead.status,
          linkedEscalations: escRes.count ?? 0,
        }
        const { token, expiresAt } = await createPendingAction('hardDeleteLead', { id }, preview, conversationId)
        return {
          pending: true as const,
          token,
          preview,
          expiresAt,
          instruction: `Show this preview to the user. If they affirm, re-call hardDeleteLead with { id: "${id}", confirmToken: "${token}" }. Do not call any other tool in this turn.`,
        }
      }

      const consume = await consumeConfirmToken(confirmToken, 'hardDeleteLead', conversationId)
      if (!consume.ok) return { error: mapConsumeError(consume.error) }
      if (consume.args.id !== id) return { error: 'confirmToken does not match the lead id being deleted' }

      const { data: snapshot } = await supabase
        .from('widget_leads')
        .select('*')
        .eq('id', id)
        .single() as unknown as { data: Record<string, unknown> | null }
      if (!snapshot) return { error: 'Lead not found (may have been deleted already)' }

      const { error: delErr } = await supabase.from('widget_leads').delete().eq('id', id)
      if (delErr) return { error: delErr instanceof Error ? delErr.message : 'Failed to delete lead' }

      const displayName =
        [snapshot.first_name, snapshot.last_name].filter(Boolean).join(' ')
        || (snapshot.organization as string)
        || (snapshot.email as string)
        || id

      return {
        deleted: true as const,
        id,
        displayName,
        summary: `Permanently deleted lead ${displayName}`,
        reversalHint: { kind: 'hardDeleteLead', row: snapshot },
      }
    }),
  }),
}

// ── Helpers ──

function mapConsumeError(err: 'not_found' | 'expired' | 'consumed' | 'wrong_tool' | 'wrong_conversation'): string {
  switch (err) {
    case 'not_found': return 'confirmToken not found — ask the user to re-initiate the delete.'
    case 'expired': return 'confirmToken expired (>5 min) — ask the user to re-initiate the delete.'
    case 'consumed': return 'confirmToken already used — re-initiate if the user wants to delete again.'
    case 'wrong_tool': return 'confirmToken was issued for a different tool — re-initiate the delete.'
    case 'wrong_conversation': return 'confirmToken belongs to a different conversation — re-initiate here.'
  }
}
