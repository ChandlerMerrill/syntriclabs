import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleChatGenerate } from '@/lib/ai/handler'
import { getOrCreateConversation } from '@/lib/services/messages'
import type { ModelMessage } from 'ai'

export const maxDuration = 60

/**
 * Dry-run endpoint — authenticated admin only. Same execution path as Telegram
 * (non-streaming generate, full tool trace). Does NOT persist user/assistant messages
 * by default (persist=true opts in), but tool calls still hit the audit log and the
 * DB if the tool writes — these are real tool calls, not sandboxed.
 *
 * POST { messages: [{role, content}], channel?: 'admin_chat'|'telegram'|'playground',
 *        persist?: boolean, context?: {...} }
 * → { text, toolCalls: [{toolName, args, result}], conversationId }
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    messages?: ModelMessage[]
    channel?: 'admin_chat' | 'telegram' | 'playground'
    persist?: boolean
    context?: { clientId?: string; dealId?: string; projectId?: string; documentId?: string }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  const channel = body.channel ?? 'playground'
  const serviceClient = await createServiceClient()
  const conversation = await getOrCreateConversation(
    serviceClient,
    channel === 'playground' ? 'admin_chat' : channel,
    channel === 'playground' ? `playground:${user.id}` : user.id
  )

  try {
    const result = await handleChatGenerate({
      messages: body.messages,
      context: body.context,
      channel,
      conversationId: conversation.id,
    })

    // Merge tool calls with results for the response
    const merged = result.toolCalls.map((tc) => {
      const tr = result.toolResults.find((r) => r.toolName === tc.toolName)
      return { toolName: tc.toolName, args: tc.args, result: tr?.result }
    })

    return NextResponse.json({
      text: result.text,
      toolCalls: merged,
      conversationId: conversation.id,
    })
  } catch (err) {
    console.error('[dry-run] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
