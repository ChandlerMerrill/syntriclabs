import { createServiceClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from './crypto'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const BATCH_CONCURRENCY = 10
const BATCH_DELAY_MS = 100

// ── Types ──

interface GmailMessagePart {
  mimeType?: string
  headers?: { name: string; value: string }[]
  body?: { data?: string; attachmentId?: string; size?: number }
  parts?: GmailMessagePart[]
  filename?: string
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailMessagePart
  sizeEstimate?: number
}

export interface ParsedEmail {
  messageId: string
  threadId: string
  from: { address: string; name: string }
  to: { address: string; name: string }[]
  cc: { address: string; name: string }[]
  bcc: { address: string; name: string }[]
  subject: string
  bodyText: string
  bodyHtml: string
  snippet: string
  labelIds: string[]
  isRead: boolean
  isStarred: boolean
  isDraft: boolean
  hasAttachments: boolean
  internalDate: Date
  headers: Record<string, string>
  attachments: { attachmentId: string; filename: string; mimeType: string; size: number }[]
}

// ── Account ──

export async function getGmailAccount() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('gmail_accounts')
    .select('*')
    .eq('is_active', true)
    .single()
  return data
}

// ── Token Management ──

export async function getAccessToken(): Promise<string> {
  const account = await getGmailAccount()
  if (!account) throw new Error('No active Gmail account. Connect Gmail in Settings.')

  const expiresAt = new Date(account.token_expires_at)
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt > fiveMinFromNow) {
    return decrypt(account.access_token_encrypted)
  }

  const refreshToken = decrypt(account.refresh_token_encrypted)
  return refreshAccessToken(refreshToken, account.id)
}

async function refreshAccessToken(refreshToken: string, accountId: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    if (data.error === 'invalid_grant') {
      const supabase = await createServiceClient()
      await supabase.from('gmail_accounts').update({ is_active: false }).eq('id', accountId)
      throw new Error('Gmail refresh token revoked. Please reconnect Gmail in Settings.')
    }
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`)
  }

  const supabase = await createServiceClient()
  await supabase.from('gmail_accounts').update({
    access_token_encrypted: encrypt(data.access_token),
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('id', accountId)

  return data.access_token
}

// ── API Wrapper ──

export async function gmailAPI<T = unknown>(
  path: string,
  options?: { method?: string; body?: unknown; params?: Record<string, string> }
): Promise<T> {
  const token = await getAccessToken()
  const url = new URL(`${GMAIL_BASE}/${path}`)
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gmail API ${path}: ${res.status} - ${err.error?.message || res.statusText}`)
  }

  return res.json()
}

// ── Gmail Operations ──

export async function getProfile() {
  return gmailAPI<{ emailAddress: string; messagesTotal: number; historyId: string }>('profile')
}

export async function listMessages(params: Record<string, string>) {
  return gmailAPI<{ messages?: { id: string; threadId: string }[]; nextPageToken?: string; resultSizeEstimate?: number }>(
    'messages', { params }
  )
}

export async function getMessage(id: string, format: 'full' | 'metadata' | 'minimal' = 'full') {
  return gmailAPI<GmailMessage>(`messages/${id}`, { params: { format } })
}

export async function getThread(threadId: string) {
  return gmailAPI<{ id: string; messages: GmailMessage[] }>(`threads/${threadId}`, { params: { format: 'full' } })
}

export async function sendMessage(params: {
  to: string
  subject: string
  body: string
  cc?: string
  threadId?: string
  inReplyTo?: string
  references?: string
}) {
  const raw = buildRFC2822Message(params)
  const encoded = Buffer.from(raw).toString('base64url')
  return gmailAPI<{ id: string; threadId: string; labelIds: string[] }>(
    'messages/send', { method: 'POST', body: { raw: encoded, threadId: params.threadId } }
  )
}

export async function listHistory(startHistoryId: string) {
  return gmailAPI<{
    history?: { id: string; messagesAdded?: { message: { id: string; threadId: string } }[] }[]
    nextPageToken?: string
    historyId?: string
  }>('history', { params: { startHistoryId, historyTypes: 'messageAdded' } })
}

export async function modifyMessage(id: string, addLabels?: string[], removeLabels?: string[]) {
  return gmailAPI(`messages/${id}/modify`, {
    method: 'POST',
    body: { addLabelIds: addLabels ?? [], removeLabelIds: removeLabels ?? [] },
  })
}

// ── Message Parsing ──

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8')
}

function parseAddress(raw: string): { address: string; name: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].replace(/"/g, '').trim(), address: match[2].toLowerCase() }
  return { name: '', address: raw.toLowerCase().trim() }
}

function parseAddressList(raw: string | undefined): { address: string; name: string }[] {
  if (!raw) return []
  return raw.split(',').map(s => parseAddress(s.trim())).filter(a => a.address)
}

function extractBody(part: GmailMessagePart, targetMime: string): string {
  if (part.mimeType === targetMime && part.body?.data) {
    return decodeBase64Url(part.body.data)
  }
  if (part.parts) {
    for (const child of part.parts) {
      const found = extractBody(child, targetMime)
      if (found) return found
    }
  }
  return ''
}

function extractAttachments(part: GmailMessagePart): { attachmentId: string; filename: string; mimeType: string; size: number }[] {
  const attachments: { attachmentId: string; filename: string; mimeType: string; size: number }[] = []
  if (part.body?.attachmentId && part.filename) {
    attachments.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType ?? 'application/octet-stream',
      size: part.body.size ?? 0,
    })
  }
  if (part.parts) {
    for (const child of part.parts) {
      attachments.push(...extractAttachments(child))
    }
  }
  return attachments
}

export function parseMessage(msg: GmailMessage): ParsedEmail {
  const payload = msg.payload!
  const headers: Record<string, string> = {}
  for (const h of payload.headers ?? []) {
    headers[h.name.toLowerCase()] = h.value
  }

  const from = parseAddress(headers['from'] ?? '')
  const to = parseAddressList(headers['to'])
  const cc = parseAddressList(headers['cc'])
  const bcc = parseAddressList(headers['bcc'])
  const subject = headers['subject'] ?? '(no subject)'

  const bodyText = extractBody(payload, 'text/plain').substring(0, 50000)
  const bodyHtml = extractBody(payload, 'text/html').substring(0, 50000)
  const attachments = extractAttachments(payload)

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    from,
    to,
    cc,
    bcc,
    subject,
    bodyText,
    bodyHtml,
    snippet: msg.snippet ?? '',
    labelIds: msg.labelIds ?? [],
    isRead: !(msg.labelIds ?? []).includes('UNREAD'),
    isStarred: (msg.labelIds ?? []).includes('STARRED'),
    isDraft: (msg.labelIds ?? []).includes('DRAFT'),
    hasAttachments: attachments.length > 0,
    internalDate: new Date(parseInt(msg.internalDate ?? '0', 10)),
    headers,
    attachments,
  }
}

// ── RFC 2822 Builder ──

export function buildRFC2822Message(params: {
  to: string
  subject: string
  body: string
  cc?: string
  from?: string
  inReplyTo?: string
  references?: string
}): string {
  const lines: string[] = []
  if (params.from) lines.push(`From: ${params.from}`)
  lines.push(`To: ${params.to}`)
  if (params.cc) lines.push(`Cc: ${params.cc}`)
  lines.push(`Subject: ${params.subject}`)
  lines.push('MIME-Version: 1.0')
  lines.push('Content-Type: text/html; charset=UTF-8')
  if (params.inReplyTo) lines.push(`In-Reply-To: ${params.inReplyTo}`)
  if (params.references) lines.push(`References: ${params.references}`)
  lines.push('')
  lines.push(params.body)
  return lines.join('\r\n')
}

// ── Batch Helpers ──

export async function batchFetchMessages(ids: string[]): Promise<GmailMessage[]> {
  const results: GmailMessage[] = []
  for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
    const batch = ids.slice(i, i + BATCH_CONCURRENCY)
    const messages = await Promise.all(batch.map(id => getMessage(id)))
    results.push(...messages)
    if (i + BATCH_CONCURRENCY < ids.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }
  return results
}
