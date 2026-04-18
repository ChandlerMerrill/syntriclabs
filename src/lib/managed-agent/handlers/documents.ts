import { generateDocumentService } from '@/lib/services/document-generation'
import { withAIAudit } from '@/lib/ai/audit'
import { registerTool } from '../custom-tools'
import {
  generateDocument as generateDocumentSchema,
  generateCustomDocument as generateCustomDocumentSchema,
  sendDocumentToClient as sendDocumentToClientSchema,
} from '../schemas'
import type { DocumentType } from '@/lib/types'

export function register(): void {
  registerTool(
    'generate_document',
    generateDocumentSchema,
    withAIAudit('generate_document', { logActivity: true }, async (args) => {
      try {
        const doc = await generateDocumentService({
          type: args.type as DocumentType,
          title: args.title,
          client_id: args.client_id,
          deal_id: args.deal_id,
          content_data: args.content_data,
        })
        return {
          document: { id: doc.id, title: doc.title, type: doc.type, status: doc.status },
          client_id: args.client_id,
          viewUrl: `/admin/documents/${doc.id}`,
          summary: `Generated ${args.type}: ${doc.title}`,
        }
      } catch (err) {
        console.error('generateDocument failed:', err)
        return { error: err instanceof Error ? err.message : 'Document generation failed' }
      }
    }),
  )

  registerTool(
    'generate_custom_document',
    generateCustomDocumentSchema,
    withAIAudit('generate_custom_document', { logActivity: true }, async (args) => {
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
  )

  registerTool(
    'send_document_to_client',
    sendDocumentToClientSchema,
    withAIAudit('send_document_to_client', { logActivity: true }, async (args) => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: args.documentId,
              recipientEmail: args.recipientEmail,
              message: args.message,
            }),
          },
        )
        const data = await res.json()
        if (!res.ok) return { error: data.error || 'Failed to send document' }
        return { success: true, sentTo: data.sentTo, summary: `Sent document to ${data.sentTo ?? 'client'}` }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to send document' }
      }
    }),
  )
}
