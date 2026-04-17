import { createServiceClient } from '@/lib/supabase/server'

export interface PendingAction {
  token: string
  tool_name: string
  args: Record<string, unknown>
  preview: Record<string, unknown>
  conversation_id: string
  expires_at: string
  consumed_at: string | null
  created_at: string
}

export type ConsumeError =
  | 'not_found'
  | 'expired'
  | 'consumed'
  | 'wrong_tool'
  | 'wrong_conversation'

export type ConsumeResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; error: ConsumeError }

export async function createPendingAction(
  toolName: string,
  args: Record<string, unknown>,
  preview: Record<string, unknown>,
  conversationId: string,
): Promise<{ token: string; expiresAt: string }> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('pending_actions')
    .insert({
      tool_name: toolName,
      args,
      preview,
      conversation_id: conversationId,
    })
    .select('token, expires_at')
    .single() as unknown as { data: { token: string; expires_at: string } | null; error: unknown }

  if (error || !data) {
    throw new Error(`Failed to create pending action: ${error instanceof Error ? error.message : String(error)}`)
  }
  return { token: data.token, expiresAt: data.expires_at }
}

export async function consumeConfirmToken(
  token: string,
  expectedToolName: string,
  conversationId: string,
): Promise<ConsumeResult> {
  const supabase = await createServiceClient()

  // Atomic compare-and-set: only consume if not yet consumed AND not expired AND matches tool+conversation.
  const { data: consumed } = await supabase
    .from('pending_actions')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token', token)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .eq('tool_name', expectedToolName)
    .eq('conversation_id', conversationId)
    .select('args')
    .maybeSingle() as unknown as { data: { args: Record<string, unknown> } | null }

  if (consumed) {
    return { ok: true, args: consumed.args }
  }

  // Diagnose why the update matched zero rows by fetching the row.
  const { data: row } = await supabase
    .from('pending_actions')
    .select('tool_name, conversation_id, expires_at, consumed_at')
    .eq('token', token)
    .maybeSingle() as unknown as {
      data: {
        tool_name: string
        conversation_id: string
        expires_at: string
        consumed_at: string | null
      } | null
    }

  if (!row) return { ok: false, error: 'not_found' }
  if (row.consumed_at) return { ok: false, error: 'consumed' }
  if (new Date(row.expires_at).getTime() <= Date.now()) return { ok: false, error: 'expired' }
  if (row.tool_name !== expectedToolName) return { ok: false, error: 'wrong_tool' }
  if (row.conversation_id !== conversationId) return { ok: false, error: 'wrong_conversation' }
  return { ok: false, error: 'not_found' }
}
