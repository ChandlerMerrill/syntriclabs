import { createServiceClient } from '@/lib/supabase/server'
import { logAutoActivity } from '@/lib/services/activities'
import { tryGetAgentCtx } from '@/lib/managed-agent/context'
import type { MessageChannel } from '@/lib/types'

export interface AIAuditContext {
  conversationId?: string | null
  channel?: MessageChannel | 'playground'
  userText?: string
}

type UnknownRecord = Record<string, unknown>

function extractClientId(args: unknown, result: unknown): string | null {
  const a = (args ?? {}) as UnknownRecord
  const r = (result ?? {}) as UnknownRecord
  const candidate =
    (a.clientId as string | undefined) ??
    (a.client_id as string | undefined) ??
    (r.client_id as string | undefined) ??
    ((r.client as UnknownRecord | undefined)?.id as string | undefined)
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

/**
 * Wraps a tool's execute function so every call is logged to `ai_actions`.
 * When the tool writes user-visible state and a client_id is resolvable, also logs
 * a user-facing entry in `activities` via logAutoActivity().
 *
 * Usage:
 *   const myTool = tool({
 *     description: '...',
 *     inputSchema: ...,
 *     execute: withAIAudit('myTool', async (args, opts) => { ... }),
 *   })
 *
 * The AI SDK passes `experimental_context` to execute() as the second arg's `experimental_context`
 * field — we read conversationId/channel from there.
 */
export function withAIAudit<A, R>(
  toolName: string,
  opts: { logActivity?: boolean } = {},
  execute: (args: A, helpers: { context: AIAuditContext }) => Promise<R>
): (args: A, execOpts?: { experimental_context?: unknown }) => Promise<R> {
  return async (args: A, execOpts) => {
    // Precedence: explicit experimental_context (legacy AI SDK path) wins over
    // the ambient store. The dispatcher never sets experimental_context and
    // the legacy handler never opens an agentCtxStore frame — defensive.
    const ctxFromExperimental =
      (execOpts?.experimental_context as AIAuditContext | undefined) ?? null
    const ctxFromStore = tryGetAgentCtx()
    const ctx: AIAuditContext =
      ctxFromExperimental ??
      (ctxFromStore
        ? { conversationId: ctxFromStore.conversationId, channel: ctxFromStore.channel }
        : {})
    const startedAt = Date.now()
    let result: R | undefined
    let errorMessage: string | null = null
    let status: 'success' | 'error' = 'success'

    try {
      result = await execute(args, { context: ctx })
      // If tool itself returned a structured error, mark as error for audit purposes
      const r = result as unknown as UnknownRecord | undefined
      if (r && typeof r === 'object' && typeof r.error === 'string') {
        status = 'error'
        errorMessage = r.error
      }
      return result
    } catch (err) {
      status = 'error'
      errorMessage = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      try {
        const supabase = await createServiceClient()
        const clientId = extractClientId(args, result)
        const reversalHint =
          result && typeof result === 'object' && 'reversalHint' in (result as UnknownRecord)
            ? ((result as UnknownRecord).reversalHint as unknown)
            : null

        await supabase.from('ai_actions').insert({
          tool_name: toolName,
          args: (args ?? {}) as UnknownRecord,
          result: (result ?? null) as UnknownRecord | null,
          status,
          error_message: errorMessage,
          conversation_id: ctx.conversationId ?? null,
          channel: ctx.channel ?? null,
          client_id: clientId,
          reversal_hint: reversalHint,
        })

        if (opts.logActivity && clientId && status === 'success') {
          await logAutoActivity(supabase, {
            client_id: clientId,
            title: `AI ${toolName}`,
            description: summarizeForActivity(toolName, args, result),
            type: 'status_change',
            metadata: {
              tool_name: toolName,
              channel: ctx.channel,
              conversation_id: ctx.conversationId,
              duration_ms: Date.now() - startedAt,
            },
          })
        }
      } catch (auditErr) {
        console.error(`[withAIAudit:${toolName}] Failed to persist audit row:`, auditErr)
      }
    }
  }
}

function summarizeForActivity(toolName: string, args: unknown, result: unknown): string {
  const a = (args ?? {}) as UnknownRecord
  const r = (result ?? {}) as UnknownRecord
  if (typeof r.summary === 'string') return r.summary
  if (typeof a.reason === 'string') return `${toolName}: ${a.reason}`
  return `${toolName} executed`
}

/**
 * Counts today's web_search ai_actions rows (UTC day boundary).
 * Used by handler.ts to nudge Claude off web_search when the daily cap is hit.
 */
export async function getWebSearchCountToday(): Promise<number> {
  try {
    const supabase = await createServiceClient()
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('ai_actions')
      .select('id', { count: 'exact', head: true })
      .eq('tool_name', 'web_search')
      .gte('created_at', startOfDay.toISOString())
    return count ?? 0
  } catch (e) {
    console.error('[getWebSearchCountToday] failed:', e)
    return 0
  }
}

/**
 * Records a provider-executed tool call (e.g. web_search) to ai_actions.
 * Invoked from the streamText / generateText `onStepFinish` hook — these calls
 * don't go through withAIAudit because there's no user-defined execute() to wrap.
 */
export async function logProviderToolCall(
  toolName: string,
  args: unknown,
  result: unknown,
  ctx: AIAuditContext
): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from('ai_actions').insert({
      tool_name: toolName,
      args: (args ?? {}) as UnknownRecord,
      result: (result ?? null) as UnknownRecord | null,
      status: 'success',
      error_message: null,
      conversation_id: ctx.conversationId ?? null,
      channel: ctx.channel ?? null,
      client_id: null,
      reversal_hint: null,
    })
  } catch (e) {
    console.error(`[logProviderToolCall:${toolName}] failed:`, e)
  }
}
