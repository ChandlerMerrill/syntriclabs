import type { MessageChannel } from '@/lib/types'

export interface Ctx {
  conversationId: string
  channel: MessageChannel | 'playground'
}

export async function runCustomTool(
  name: string,
  _input: unknown,
  _ctx: Ctx,
): Promise<unknown> {
  return { error: `Tool '${name}' not yet implemented (Phase 5b pending)` }
}
