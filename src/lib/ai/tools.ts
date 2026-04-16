import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDocumentService } from '@/lib/services/document-generation'
import { searchSimilar } from '@/lib/ai/embeddings'
import type { DocumentType } from '@/lib/types'

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
        return { error: err instanceof Error ? err.message : 'Document generation failed' }
      }
    },
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
    description: 'Send an email via Gmail. Optionally reply to a thread by providing threadId and inReplyTo headers.',
    inputSchema: zodSchema(z.object({
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body (HTML supported)'),
      cc: z.string().optional().describe('CC recipients'),
      threadId: z.string().optional().describe('Gmail thread ID (for replies)'),
      inReplyTo: z.string().optional().describe('Message-ID header of the email being replied to'),
      references: z.string().optional().describe('References header for threading'),
    })),
    execute: async ({ to, subject, body, cc, threadId, inReplyTo, references }) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/gmail/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, body, cc, threadId, inReplyTo, references }),
        })
        const data = await res.json()
        if (!res.ok) return { error: data.error || 'Failed to send email' }
        return { success: true, messageId: data.messageId, threadId: data.threadId }
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
}
