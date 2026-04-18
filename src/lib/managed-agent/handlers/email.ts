import { createServiceClient } from '@/lib/supabase/server'
import { sendMessage, getMessage, parseMessage, getGmailAccount } from '@/lib/gmail/client'
import { renderBrandedEmail } from '@/lib/email/branded-template'
import { embedInBackground, serializeEmail } from '@/lib/ai/embeddings'
import { withAIAudit } from '@/lib/ai/audit'
import { registerTool } from '../custom-tools'
import { sendEmail as sendEmailSchema } from '../schemas'

export function register(): void {
  registerTool(
    'send_email',
    sendEmailSchema,
    withAIAudit('send_email', { logActivity: false }, async (args) => {
      try {
        const { to, subject, body, cc, threadId, inReplyTo, references } = args
        const html = renderBrandedEmail(body)
        const result = await sendMessage({ to, cc, subject, body: html, threadId, inReplyTo, references })

        const gmailMsg = await getMessage(result.id)
        const parsed = parseMessage(gmailMsg)
        const account = await getGmailAccount()

        const supabase = await createServiceClient()
        const recipientAddresses = [...parsed.to, ...parsed.cc].map((a) => a.address.toLowerCase())
        const { data: contacts } = await supabase
          .from('client_contacts')
          .select('id, client_id')
          .in('email', recipientAddresses)

        const match = contacts?.[0] ?? null

        const { data: email } = await supabase
          .from('emails')
          .upsert(
            {
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
            },
            { onConflict: 'gmail_message_id' },
          )
          .select('id')
          .single()

        if (email) {
          embedInBackground(
            'email',
            email.id,
            serializeEmail({
              subject: parsed.subject,
              from: parsed.from,
              to: parsed.to,
              bodyText: parsed.bodyText,
              internalDate: parsed.internalDate,
            }),
          )
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
    }),
  )
}
