import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { searchSimilar } from '@/lib/ai/embeddings'
import { Resend } from 'resend'
import { sendTelegramMessage } from '@/lib/telegram'
import { buildLeadNotificationHtml } from '@/lib/email/lead-notification'

export function createWidgetTools(sessionId: string, conversationId: string | null) {
  return {
    searchKnowledgebase: tool({
      description: "Search Syntric's knowledge base to answer visitor questions about services, process, pricing approach, team, and company info. Always use this before answering factual questions.",
      inputSchema: zodSchema(z.object({
        query: z.string().describe('Natural language search query'),
      })),
      execute: async ({ query }) => {
        const results = await searchSimilar(query, { types: ['knowledgebase'], limit: 5, threshold: 0.3 })
        if (results.length === 0) {
          return { results: [], message: 'No matching information found.' }
        }
        return {
          results: results.map(r => ({ content: r.content, similarity: r.similarity })),
          count: results.length,
        }
      },
    }),

    captureLeadInfo: tool({
      description: "Save visitor contact information to the CRM. Use when the visitor shares their name, email, phone, or expresses interest in services. Always disclose to the visitor that their information will be shared with the Syntric team for follow-up.",
      inputSchema: zodSchema(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        preferredContact: z.enum(['phone', 'email', 'sms']).optional(),
        role: z.string().optional(),
        organization: z.string().optional(),
        businessType: z.string().optional(),
        serviceInterest: z.string().optional(),
        request: z.string().optional(),
        summary: z.string().describe('Concise summary of the conversation and visitor needs'),
      })),
      execute: async ({ firstName, lastName, email, phone, preferredContact, role, organization, businessType, serviceInterest, request, summary }) => {
        const supabase = await createServiceClient()

        // Upsert lead (match on session_id)
        const { data: existing } = await supabase
          .from('widget_leads')
          .select('id')
          .eq('session_id', sessionId)
          .single()

        const leadData = {
          session_id: sessionId,
          conversation_id: conversationId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          preferred_contact: preferredContact,
          role,
          organization,
          business_type: businessType,
          service_interest: serviceInterest,
          request,
          summary,
        }

        if (existing) {
          await supabase
            .from('widget_leads')
            .update(leadData)
            .eq('id', existing.id)
        } else {
          await supabase.from('widget_leads').insert(leadData)
        }

        const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

        // Send email notification
        try {
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: 'Syntric Widget <contact@syntriclabs.com>',
            to: process.env.ADMIN_EMAIL || 'chandler@syntriclabs.com',
            subject: `New widget lead: ${name}${organization ? ` (${organization})` : ''}`,
            html: buildLeadNotificationHtml({
              firstName,
              lastName,
              email,
              phone,
              organization,
              role,
              serviceInterest,
              request,
              summary,
              preferredContact,
            }),
          })
        } catch (emailError) {
          console.error('Lead notification email failed:', emailError)
        }

        // Send Telegram notification
        try {
          const message = [
            '<b>New Widget Lead</b>',
            name !== 'Unknown' ? `Name: ${name}` : null,
            email ? `Email: ${email}` : null,
            organization ? `Org: ${organization}` : null,
            serviceInterest ? `Interest: ${serviceInterest}` : null,
            summary ? `Summary: ${summary}` : null,
          ].filter(Boolean).join('\n')

          await sendTelegramMessage(process.env.TELEGRAM_AUTHORIZED_USER_ID!, message, 'HTML')
        } catch (telegramError) {
          console.error('Lead Telegram notification failed:', telegramError)
        }

        return { success: true, message: 'Contact info saved. The Syntric team will follow up.' }
      },
    }),

    bookConsultation: tool({
      description: "Provide the visitor with a link to book a discovery call. Use when they express interest in scheduling a consultation, want to discuss a project, or are ready to take the next step.",
      inputSchema: zodSchema(z.object({
        context: z.string().optional().describe('What the visitor wants to discuss'),
      })),
      execute: async () => {
        return {
          url: 'https://calendly.com/chandler-syntriclabs/30min',
          message: 'Book a free 30-minute discovery call to discuss your project.',
        }
      },
    }),

    escalateToHuman: tool({
      description: "Create a support ticket for the Syntric team when the visitor has a complex question, requests human contact, or needs help beyond what the knowledge base covers. Always capture lead info first before escalating.",
      inputSchema: zodSchema(z.object({
        reason: z.string().describe('Why the visitor needs human follow-up'),
        preferredMethod: z.enum(['phone', 'email', 'sms']).optional(),
      })),
      execute: async ({ reason, preferredMethod }) => {
        const supabase = await createServiceClient()

        // Look up existing lead for this session
        const { data: lead } = await supabase
          .from('widget_leads')
          .select('id, first_name, last_name, email')
          .eq('session_id', sessionId)
          .single()

        // Insert escalation
        await supabase.from('widget_escalations').insert({
          session_id: sessionId,
          conversation_id: conversationId,
          lead_id: lead?.id ?? null,
          reason,
          preferred_method: preferredMethod,
        })

        const leadName = lead ? [lead.first_name, lead.last_name].filter(Boolean).join(' ') : null

        // Send Telegram notification (urgent)
        try {
          const message = [
            '<b>ESCALATION</b>',
            `Reason: ${reason}`,
            preferredMethod ? `Preferred: ${preferredMethod}` : null,
            leadName ? `Lead: ${leadName}` : null,
            lead?.email ? `Email: ${lead.email}` : null,
          ].filter(Boolean).join('\n')

          await sendTelegramMessage(process.env.TELEGRAM_AUTHORIZED_USER_ID!, message, 'HTML')
        } catch (telegramError) {
          console.error('Escalation Telegram notification failed:', telegramError)
        }

        // Send email notification
        try {
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: 'Syntric Widget <contact@syntriclabs.com>',
            to: process.env.ADMIN_EMAIL || 'chandler@syntriclabs.com',
            subject: `Widget escalation: ${reason.substring(0, 60)}`,
            html: buildLeadNotificationHtml({
              firstName: lead?.first_name ?? undefined,
              lastName: lead?.last_name ?? undefined,
              email: lead?.email ?? undefined,
              summary: `ESCALATION: ${reason}`,
              preferredContact: preferredMethod,
            }),
          })
        } catch (emailError) {
          console.error('Escalation email notification failed:', emailError)
        }

        return { success: true, message: 'A team member will reach out to you shortly.' }
      },
    }),
  }
}
