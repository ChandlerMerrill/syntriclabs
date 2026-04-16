import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendMessage, parseMessage, getMessage, getGmailAccount } from '@/lib/gmail/client'
import { embedInBackground, serializeEmail } from '@/lib/ai/embeddings'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, cc, subject, body, threadId, inReplyTo, references } = await request.json()

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
  }

  try {
    const result = await sendMessage({ to, cc, subject, body, threadId, inReplyTo, references })

    // Fetch the sent message to store it
    const gmailMsg = await getMessage(result.id)
    const parsed = parseMessage(gmailMsg)
    const account = await getGmailAccount()

    // Match to client
    const serviceClient = await createServiceClient()
    const recipientAddresses = [...parsed.to, ...parsed.cc].map(a => a.address.toLowerCase())
    const { data: contacts } = await serviceClient
      .from('client_contacts')
      .select('id, client_id')
      .in('email', recipientAddresses)

    const match = contacts?.[0] ?? null

    const { data: email } = await serviceClient.from('emails').upsert({
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

    // Log activity if matched to client
    if (match?.client_id) {
      await serviceClient.from('activities').insert({
        client_id: match.client_id,
        type: 'email',
        title: `Email sent: ${subject}`,
        description: `Sent to ${to}`,
        metadata: { email_id: email?.id, gmail_message_id: result.id },
        is_auto_generated: true,
      })
    }

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
      emailId: email?.id,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
