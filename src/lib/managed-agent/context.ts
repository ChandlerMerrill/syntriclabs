import { AsyncLocalStorage } from 'node:async_hooks'
import type { MessageChannel } from '@/lib/types'

export interface AgentCtx {
  conversationId: string
  channel: MessageChannel | 'playground'
}

export const agentCtxStore = new AsyncLocalStorage<AgentCtx>()

// Non-throwing accessor — returns null when called outside the dispatcher.
// Used by withAIAudit, which must survive the legacy handler path where no
// AsyncLocalStorage frame has been opened.
export function tryGetAgentCtx(): AgentCtx | null {
  return agentCtxStore.getStore() ?? null
}

// Strict accessor — throws when called outside the dispatcher. Used by
// hard-delete handlers where conversationId is mandatory for the confirm-token
// flow.
export function getAgentCtx(): AgentCtx {
  const c = agentCtxStore.getStore()
  if (!c) throw new Error('Agent context not set — runCustomTool must wrap the call')
  return c
}
