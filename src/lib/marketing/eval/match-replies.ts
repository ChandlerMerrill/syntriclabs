import { createServiceClient } from '@/lib/supabase/server'
import type { MarketingSend } from '../types'

/**
 * Tying a reply back to the send that caused it.
 *
 * Nothing about `emails` changes for this. The Gmail sync already writes every
 * inbound message with its `gmail_thread_id`, and a reply stays on the thread
 * it answers — so the join is a thread id and a timestamp, using the existing
 * `idx_emails_thread_date`. A tracking pixel or a rewritten link would be a
 * second, worse source of truth for something the mailbox already knows.
 *
 * `emails` is service-role only under RLS, so everything here uses a service
 * client and this module is never reachable from a user-scoped request.
 */

export interface ReplyMatch {
  sendId: string
  emailId: string
  fromAddress: string
  subject: string
  bodyText: string
  internalDate: string
  /** How the match was made. Thread id is strong; header is the fallback. */
  via: 'thread' | 'header'
}

interface EmailRow {
  id: string
  gmail_thread_id: string | null
  from_address: string | null
  subject: string | null
  body_text: string | null
  internal_date: string
  direction: string
  raw_headers: Record<string, string> | null
}

/**
 * Replies to one send.
 *
 * `internal_date > sent_at` matters: the thread contains our own outbound
 * message too, and on a reply-to-an-existing-thread it may contain older mail
 * from the same person that has nothing to do with this send.
 */
export async function findRepliesForSend(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  send: Pick<MarketingSend, 'id' | 'gmail_thread_id' | 'sent_at' | 'provider_message_id'>
): Promise<ReplyMatch[]> {
  if (!send.sent_at) return []

  const matches: ReplyMatch[] = []

  if (send.gmail_thread_id) {
    const { data, error } = await supabase
      .from('emails')
      .select('id, gmail_thread_id, from_address, subject, body_text, internal_date, direction, raw_headers')
      .eq('gmail_thread_id', send.gmail_thread_id)
      .eq('direction', 'inbound')
      .gt('internal_date', send.sent_at)
      .order('internal_date', { ascending: true })

    if (error) throw new Error(`Failed to query replies: ${error.message}`)

    for (const row of (data ?? []) as EmailRow[]) {
      matches.push({
        sendId: send.id,
        emailId: row.id,
        fromAddress: row.from_address ?? '',
        subject: row.subject ?? '',
        bodyText: row.body_text ?? '',
        internalDate: row.internal_date,
        via: 'thread',
      })
    }
  }

  // Header fallback. A reply sent from a different client, or one that broke
  // threading, still carries our Message-ID in In-Reply-To or References.
  if (matches.length === 0 && send.provider_message_id) {
    const { data } = await supabase
      .from('emails')
      .select('id, gmail_thread_id, from_address, subject, body_text, internal_date, direction, raw_headers')
      .eq('direction', 'inbound')
      .gt('internal_date', send.sent_at)
      .limit(500)

    for (const row of (data ?? []) as EmailRow[]) {
      const headers = row.raw_headers ?? {}
      const refs = `${headers['in-reply-to'] ?? ''} ${headers['references'] ?? ''}`
      if (refs.includes(send.provider_message_id)) {
        matches.push({
          sendId: send.id,
          emailId: row.id,
          fromAddress: row.from_address ?? '',
          subject: row.subject ?? '',
          bodyText: row.body_text ?? '',
          internalDate: row.internal_date,
          via: 'header',
        })
      }
    }
  }

  return matches
}

/**
 * Records a reply as an event.
 *
 * The unique (send_id, type, email_id) makes this idempotent — a re-run of the
 * sync cannot double-count a reply into the reply rate. Returns whether the
 * event was new.
 */
export async function recordReplyEvent(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  match: ReplyMatch
): Promise<boolean> {
  const { error } = await supabase.from('marketing_events').insert({
    send_id: match.sendId,
    type: 'replied',
    email_id: match.emailId,
    occurred_at: match.internalDate,
    metadata: { via: match.via, from: match.fromAddress },
  })

  if (!error) return true
  if (error.code === '23505') return false // already recorded
  throw new Error(`Failed to record reply event: ${error.message}`)
}

/** Sends worth checking: actually sent, and recent enough that a reply is plausible. */
export async function sendsAwaitingReplies(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  opts?: { windowDays?: number; limit?: number }
): Promise<MarketingSend[]> {
  const since = new Date(
    Date.now() - (opts?.windowDays ?? 30) * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('marketing_sends')
    .select('*')
    .eq('status', 'sent')
    .gte('sent_at', since)
    .order('sent_at', { ascending: false })
    .limit(opts?.limit ?? 200)

  if (error) throw new Error(`Failed to load sends: ${error.message}`)
  return (data ?? []) as MarketingSend[]
}
