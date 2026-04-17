import { createServiceClient } from '@/lib/supabase/server'
import { generatePDF } from '@/lib/documents/pdf'
import { uploadDocument } from '@/lib/documents/storage'
import { renderProposal } from '@/lib/documents/templates/proposal'
import { renderPriceSheet } from '@/lib/documents/templates/price-sheet'
import { renderContract } from '@/lib/documents/templates/contract'
import { renderCustom } from '@/lib/documents/templates/custom'
import { logAutoActivity } from '@/lib/services/activities'
import type { Document, DocumentType, ProposalData, PriceSheetData, ContractData, CustomDocumentData } from '@/lib/types'

const renderers: Record<DocumentType, (data: Record<string, unknown>) => string> = {
  proposal: (data) => renderProposal(data as unknown as ProposalData),
  price_sheet: (data) => renderPriceSheet(data as unknown as PriceSheetData),
  contract: (data) => renderContract(data as unknown as ContractData),
  counter_proposal: (data) => renderProposal(data as unknown as ProposalData),
  custom: (data) => renderCustom(data as unknown as CustomDocumentData),
}

export async function generateDocumentService(params: {
  type: DocumentType
  title?: string
  client_id?: string | null
  deal_id?: string
  project_id?: string
  content_data: Record<string, unknown>
}): Promise<Document> {
  const { type, title, client_id, deal_id, project_id, content_data } = params

  const renderer = renderers[type]
  if (!renderer) throw new Error(`Unknown document type: ${type}`)

  if (type !== 'custom' && !client_id) {
    throw new Error(`client_id is required for document type "${type}"`)
  }

  const html = renderer(content_data)
  const pdfBuffer = await generatePDF(html)

  const serviceClient = await createServiceClient()
  const timestamp = Date.now()
  const pathPrefix = client_id || 'general'
  const storagePath = `${pathPrefix}/${type}_${timestamp}.pdf`
  await uploadDocument(serviceClient, storagePath, pdfBuffer)

  const docTitle = title || `${type.replace('_', ' ')} — ${new Date().toLocaleDateString()}`
  const { data: doc, error: dbError } = await serviceClient
    .from('documents')
    .insert({
      client_id: client_id ?? null,
      deal_id: deal_id || null,
      project_id: project_id || null,
      type,
      title: docTitle,
      status: 'draft',
      content_data,
      storage_path: storagePath,
      notes: '',
    })
    .select()
    .single()

  if (dbError) throw dbError

  if (client_id) {
    await logAutoActivity(serviceClient, {
      client_id,
      deal_id,
      project_id,
      title: `Document generated: ${docTitle}`,
      description: `${type.replace('_', ' ')} created`,
      type: 'document',
    })
  }

  return doc as Document
}
