import type { SupabaseClient } from '@supabase/supabase-js'
import { anthropicClient, AGENT_ID, AGENT_VERSION, ENV_ID, VAULT_ID } from './client'

export async function getOrCreateSession(
  supabase: SupabaseClient,
  conversationId: string,
  chatId: string,
): Promise<string> {
  const { data: row } = await supabase
    .from('conversations')
    .select('metadata')
    .eq('id', conversationId)
    .single()

  const existing = (row?.metadata as Record<string, unknown> | null)?.agent_session_id
  if (typeof existing === 'string' && existing.length > 0) return existing

  const session = await anthropicClient.beta.sessions.create({
    agent: { type: 'agent', id: AGENT_ID(), version: AGENT_VERSION() },
    environment_id: ENV_ID(),
    vault_ids: [VAULT_ID()],
    title: `telegram-${chatId}`,
    metadata: { conversation_id: conversationId, channel: 'telegram' },
  })

  const sessionId = session.id

  await supabase
    .from('conversations')
    .update({
      metadata: { ...(row?.metadata ?? {}), agent_session_id: sessionId },
    })
    .eq('id', conversationId)

  return sessionId
}
