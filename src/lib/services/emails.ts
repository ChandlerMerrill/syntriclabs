import type { SupabaseClient } from '@supabase/supabase-js'
import type { Email, EmailWithClient, EmailAttachment } from '@/lib/types'

export async function getEmails(
  supabase: SupabaseClient,
  filters?: {
    client_id?: string
    direction?: string
    search?: string
    is_read?: boolean
    limit?: number
    offset?: number
  }
) {
  let query = supabase
    .from('emails')
    .select('*, clients(id, company_name)')
    .order('internal_date', { ascending: false })

  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.direction) query = query.eq('direction', filters.direction)
  if (filters?.is_read !== undefined) query = query.eq('is_read', filters.is_read)
  if (filters?.search) query = query.or(`subject.ilike.%${filters.search}%,body_text.ilike.%${filters.search}%`)
  if (filters?.limit) query = query.limit(filters.limit)
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)

  return query as unknown as { data: EmailWithClient[] | null; error: unknown }
}

export async function getEmailThread(supabase: SupabaseClient, threadId: string) {
  const { data, error } = await supabase
    .from('emails')
    .select('*, clients(id, company_name)')
    .eq('gmail_thread_id', threadId)
    .order('internal_date', { ascending: true })

  return { data: data as EmailWithClient[] | null, error }
}

export async function getEmail(supabase: SupabaseClient, id: string) {
  const [emailRes, attachmentsRes] = await Promise.all([
    supabase.from('emails').select('*, clients(id, company_name)').eq('id', id).single(),
    supabase.from('email_attachments').select('*').eq('email_id', id),
  ])

  return {
    data: emailRes.data ? {
      ...(emailRes.data as EmailWithClient),
      attachments: (attachmentsRes.data ?? []) as EmailAttachment[],
    } : null,
    error: emailRes.error,
  }
}

export async function getUnmatchedEmails(
  supabase: SupabaseClient,
  filters?: { search?: string; limit?: number; offset?: number }
) {
  let query = supabase
    .from('emails')
    .select('*')
    .is('client_id', null)
    .eq('direction', 'inbound')
    .order('internal_date', { ascending: false })

  if (filters?.search) query = query.or(`subject.ilike.%${filters.search}%,from_address.ilike.%${filters.search}%`)
  if (filters?.limit) query = query.limit(filters.limit)

  return query as unknown as { data: Email[] | null; error: unknown }
}

export async function assignEmailToClient(
  supabase: SupabaseClient,
  emailId: string,
  clientId: string,
  contactId?: string
) {
  const { data, error } = await supabase
    .from('emails')
    .update({ client_id: clientId, matched_contact_id: contactId ?? null })
    .eq('id', emailId)
    .select('subject')
    .single()

  if (!error && data) {
    await supabase.from('activities').insert({
      client_id: clientId,
      type: 'email',
      title: `Email linked: ${data.subject ?? '(no subject)'}`,
      description: 'Email manually linked to client',
      metadata: { email_id: emailId },
      is_auto_generated: true,
    })
  }

  return { data, error }
}

export async function assignThreadToClient(
  supabase: SupabaseClient,
  threadId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from('emails')
    .update({ client_id: clientId })
    .eq('gmail_thread_id', threadId)
    .select('id')

  if (!error && data && data.length > 0) {
    await supabase.from('activities').insert({
      client_id: clientId,
      type: 'email',
      title: `Email thread linked (${data.length} messages)`,
      description: 'Email thread manually linked to client',
      metadata: { thread_id: threadId, email_count: data.length },
      is_auto_generated: true,
    })
  }

  return { data, error }
}

export async function getEmailStats(supabase: SupabaseClient) {
  const [totalRes, unreadRes, unmatchedRes] = await Promise.all([
    supabase.from('emails').select('id', { count: 'exact', head: true }),
    supabase.from('emails').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('emails').select('id', { count: 'exact', head: true }).is('client_id', null).eq('direction', 'inbound'),
  ])

  return {
    total: totalRes.count ?? 0,
    unread: unreadRes.count ?? 0,
    unmatched: unmatchedRes.count ?? 0,
  }
}
