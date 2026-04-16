import type { SupabaseClient } from '@supabase/supabase-js'
import type { Conversation, Message, MessageChannel, MessageRole } from '@/lib/types'

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  channel: MessageChannel,
  externalId?: string
) {
  if (externalId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('channel', channel)
      .eq('external_id', externalId)
      .single() as unknown as { data: Conversation | null }

    if (existing) return existing
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      channel,
      external_id: externalId ?? null,
      title: channel === 'telegram' ? 'Telegram Chat' : 'Admin Chat',
    })
    .select()
    .single() as unknown as { data: Conversation | null; error: unknown }

  if (error) throw error
  return data!
}

export async function addMessage(
  supabase: SupabaseClient,
  conversationId: string,
  params: {
    role: MessageRole
    content: string
    toolCalls?: Array<{ toolName: string; args: unknown; result?: unknown }>
    clientId?: string
    dealId?: string
    projectId?: string
    isRead?: boolean
    metadata?: Record<string, unknown>
  }
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: params.role,
      content: params.content,
      tool_calls: params.toolCalls ?? null,
      client_id: params.clientId ?? null,
      deal_id: params.dealId ?? null,
      project_id: params.projectId ?? null,
      is_read: params.isRead ?? false,
      metadata: params.metadata ?? {},
    })
    .select()
    .single() as unknown as { data: Message | null; error: unknown }

  if (error) throw error

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data!
}

export async function getConversations(
  supabase: SupabaseClient,
  filters?: { archived?: boolean; channel?: MessageChannel }
) {
  let query = supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })

  if (filters?.archived !== undefined) {
    query = query.eq('is_archived', filters.archived)
  }
  if (filters?.channel) {
    query = query.eq('channel', filters.channel)
  }

  return query as unknown as { data: Conversation[] | null; error: unknown }
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  options?: { limit?: number; before?: string }
) {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (options?.before) {
    query = query.lt('created_at', options.before)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  return query as unknown as { data: Message[] | null; error: unknown }
}

export async function markMessagesRead(supabase: SupabaseClient, conversationId: string) {
  return supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
}

export async function getUnreadCount(supabase: SupabaseClient) {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)
    .eq('role', 'user')

  return count ?? 0
}
