import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleChatStream } from '@/lib/ai/handler'
import { getOrCreateConversation, addMessage } from '@/lib/services/messages'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, context } = await req.json()

  const result = handleChatStream({
    messages,
    context,
    channel: 'admin_chat',
    onFinish: async ({ text, steps }) => {
      try {
        const serviceClient = await createServiceClient()
        const conversation = await getOrCreateConversation(serviceClient, 'admin_chat', user.id)

        // Persist the latest user message
        const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').pop()
        if (lastUserMsg) {
          await addMessage(serviceClient, conversation.id, {
            role: 'user',
            content: typeof lastUserMsg.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg.content),
            isRead: true,
          })
        }

        // Persist assistant response
        const allToolCalls = steps.flatMap(s => s.staticToolCalls.map(tc => ({
          toolName: tc.toolName,
          args: tc.input,
        })))
        const allToolResults = steps.flatMap(s => s.staticToolResults.map(tr => ({
          toolName: tr.toolName,
          result: tr.output,
        })))
        const mergedToolCalls = allToolCalls.map((tc) => {
          const tr = allToolResults.find((r) => r.toolName === tc.toolName)
          return { toolName: tc.toolName, args: tc.args, result: tr?.result }
        })

        if (text) {
          await addMessage(serviceClient, conversation.id, {
            role: 'assistant',
            content: text,
            toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
            isRead: true,
          })
        }
      } catch (e) {
        console.error('Failed to persist chat messages:', e)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
