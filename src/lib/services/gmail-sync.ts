import { createServiceClient } from '@/lib/supabase/server'
import {
  getGmailAccount,
  listMessages,
  listHistory,
  parseMessage,
  batchFetchMessages,
  type ParsedEmail,
} from '@/lib/gmail/client'
import { embedInBackground, serializeEmail } from '@/lib/ai/embeddings'

interface SyncResult {
  synced: number
  matched: number
  errors: number
}

export async function syncEmails(options?: { fullSync?: boolean }): Promise<SyncResult> {
  const account = await getGmailAccount()
  if (!account) throw new Error('No active Gmail account')

  const supabase = await createServiceClient()
  const result: SyncResult = { synced: 0, matched: 0, errors: 0 }

  let messageIds: string[] = []

  const shouldFullSync = !account.history_id || options?.fullSync

  if (shouldFullSync) {
    // Full sync — last 30 days
    let pageToken: string | undefined
    do {
      const params: Record<string, string> = { q: 'newer_than:30d', maxResults: '100' }
      if (pageToken) params.pageToken = pageToken
      const res = await listMessages(params)
      if (res.messages) messageIds.push(...res.messages.map(m => m.id))
      pageToken = res.nextPageToken ?? undefined
    } while (messageIds.length < 500 && messageIds.length > 0)
  } else {
    // Incremental sync via history
    try {
      let pageToken: string | undefined
      do {
        const res = await listHistory(String(account.history_id))
        if (res.history) {
          for (const h of res.history) {
            if (h.messagesAdded) {
              messageIds.push(...h.messagesAdded.map(m => m.message.id))
            }
          }
        }
        pageToken = res.nextPageToken ?? undefined
      } while (pageToken)
    } catch (err) {
      // History ID stale — fall back to full sync
      if (err instanceof Error && err.message.includes('404')) {
        return syncEmails({ fullSync: true })
      }
      throw err
    }
  }

  // Deduplicate
  messageIds = [...new Set(messageIds)]

  if (messageIds.length === 0) {
    await supabase.from('gmail_accounts').update({ last_sync_at: new Date().toISOString() }).eq('id', account.id)
    return result
  }

  // Check which messages we already have
  const { data: existing } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .in('gmail_message_id', messageIds)

  const existingIds = new Set((existing ?? []).map(e => e.gmail_message_id))
  const newIds = messageIds.filter(id => !existingIds.has(id))

  if (newIds.length === 0) {
    await supabase.from('gmail_accounts').update({
      last_sync_at: new Date().toISOString(),
    }).eq('id', account.id)
    return result
  }

  // Batch fetch new messages
  const messages = await batchFetchMessages(newIds)

  for (const msg of messages) {
    try {
      const parsed = parseMessage(msg)
      const direction = determineDirection(parsed, account.email_address)
      const match = await matchEmailToClient(supabase, parsed, account.email_address)

      const { data: email } = await supabase.from('emails').upsert({
        gmail_message_id: parsed.messageId,
        gmail_thread_id: parsed.threadId,
        client_id: match?.clientId ?? null,
        from_address: parsed.from.address,
        from_name: parsed.from.name,
        to_addresses: parsed.to,
        cc_addresses: parsed.cc,
        bcc_addresses: parsed.bcc,
        subject: parsed.subject,
        body_text: parsed.bodyText,
        body_html: parsed.bodyHtml,
        snippet: parsed.snippet,
        label_ids: parsed.labelIds,
        is_read: parsed.isRead,
        is_starred: parsed.isStarred,
        is_draft: parsed.isDraft,
        has_attachments: parsed.hasAttachments,
        internal_date: parsed.internalDate.toISOString(),
        direction,
        matched_contact_id: match?.contactId ?? null,
        raw_headers: parsed.headers,
      }, { onConflict: 'gmail_message_id' }).select('id').single()

      // Store attachments
      if (parsed.attachments.length > 0 && email) {
        try {
          await supabase.from('email_attachments').insert(
            parsed.attachments.map(a => ({
              email_id: email.id,
              gmail_attachment_id: a.attachmentId,
              filename: a.filename,
              mime_type: a.mimeType,
              size_bytes: a.size,
            }))
          )
        } catch { /* ignore attachment errors */ }
      }

      if (email) {
        const clientName = match?.clientId ? 'matched' : undefined
        embedInBackground('email', email.id, serializeEmail({
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to,
          bodyText: parsed.bodyText,
          internalDate: parsed.internalDate,
        }, clientName))
      }

      result.synced++
      if (match?.clientId) result.matched++
    } catch {
      result.errors++
    }
  }

  // Update account sync state
  const profile = await import('@/lib/gmail/client').then(m => m.getProfile())
  await supabase.from('gmail_accounts').update({
    history_id: parseInt(profile.historyId, 10),
    last_sync_at: new Date().toISOString(),
  }).eq('id', account.id)

  return result
}

function determineDirection(parsed: ParsedEmail, accountEmail: string): 'inbound' | 'outbound' {
  return parsed.from.address.toLowerCase() === accountEmail.toLowerCase() ? 'outbound' : 'inbound'
}

async function matchEmailToClient(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  parsed: ParsedEmail,
  accountEmail: string
): Promise<{ clientId: string; contactId: string } | null> {
  // Collect all addresses except the account email
  const addresses = new Set<string>()
  if (parsed.from.address.toLowerCase() !== accountEmail.toLowerCase()) {
    addresses.add(parsed.from.address.toLowerCase())
  }
  for (const addr of [...parsed.to, ...parsed.cc, ...parsed.bcc]) {
    if (addr.address.toLowerCase() !== accountEmail.toLowerCase()) {
      addresses.add(addr.address.toLowerCase())
    }
  }

  if (addresses.size === 0) return null

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('id, client_id, email')
    .in('email', [...addresses])

  if (!contacts || contacts.length === 0) return null

  // Prefer from address match for inbound, to address for outbound
  const preferredAddr = parsed.from.address.toLowerCase() !== accountEmail.toLowerCase()
    ? parsed.from.address.toLowerCase()
    : [...addresses][0]

  const preferred = contacts.find(c => c.email?.toLowerCase() === preferredAddr)
  const match = preferred ?? contacts[0]

  return { clientId: match.client_id, contactId: match.id }
}
