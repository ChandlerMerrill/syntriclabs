import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getDocumentURL } from '@/lib/documents/storage'
import { DocumentEmail } from '@/lib/email/document-email'
import { logAutoActivity } from '@/lib/services/activities'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { documentId, recipientEmail, message } = await req.json()

  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
  }

  try {
    const serviceClient = await createServiceClient()

    // Fetch document with client and contacts
    const { data: doc, error: docError } = await serviceClient
      .from('documents')
      .select('*, clients(id, company_name, client_contacts(*))')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Determine recipient
    const client = doc.clients as { id: string; company_name: string; client_contacts: { name: string; email: string | null; is_primary: boolean }[] } | null
    let sendTo = recipientEmail as string | undefined

    if (!sendTo && client?.client_contacts?.length) {
      const primary = client.client_contacts.find((c) => c.is_primary) ?? client.client_contacts[0]
      sendTo = primary?.email ?? undefined
    }

    if (!sendTo) {
      return NextResponse.json({ error: 'No recipient email found. Provide recipientEmail or add a contact with email.' }, { status: 400 })
    }

    // Fetch PDF from storage
    if (!doc.storage_path) {
      return NextResponse.json({ error: 'Document has no PDF file' }, { status: 400 })
    }

    const signedUrl = await getDocumentURL(serviceClient, doc.storage_path)
    const pdfResponse = await fetch(signedUrl)
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const docType = doc.type.replace('_', ' ')

    await resend.emails.send({
      from: 'Syntric Labs <documents@syntriclabs.com>',
      to: sendTo,
      subject: `${docType.charAt(0).toUpperCase() + docType.slice(1)}: ${doc.title}`,
      react: DocumentEmail({
        documentTitle: doc.title,
        documentType: docType,
        clientName: client?.company_name ?? 'there',
        message,
      }),
      attachments: [
        {
          filename: `${doc.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    // Update status to sent
    await serviceClient
      .from('documents')
      .update({ status: 'sent' })
      .eq('id', documentId)

    // Log activity
    await logAutoActivity(serviceClient, {
      client_id: doc.client_id,
      deal_id: doc.deal_id ?? undefined,
      project_id: doc.project_id ?? undefined,
      title: `Document sent: ${doc.title}`,
      description: `${docType} sent to ${sendTo}`,
      type: 'email',
    })

    return NextResponse.json({ success: true, sentTo: sendTo })
  } catch (err) {
    console.error('Document send failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send document' },
      { status: 500 }
    )
  }
}
