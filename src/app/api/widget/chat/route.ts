import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServiceClient } from '@/lib/supabase/server'
import { WIDGET_SYSTEM_PROMPT } from '@/lib/ai/widget-system-prompt'
import { createWidgetTools } from '@/lib/ai/widget-tools'
import { checkWidgetRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const WIDGET_MODEL = process.env.WIDGET_CHAT_MODEL || 'claude-haiku-4-5-20251001'

export const maxDuration = 30

export async function POST(req: Request) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = await createServiceClient()

  // Rate limit check
  const { allowed } = await checkWidgetRateLimit(supabase, ip)
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages, sessionId, conversationId: requestedConversationId } = await req.json()

  // Resolve or create conversation
  let conversationId: string | null = null
  if (sessionId) {
    if (requestedConversationId) {
      // Verify conversation belongs to this session
      const { data: existing } = await supabase
        .from('widget_conversations')
        .select('id')
        .eq('id', requestedConversationId)
        .eq('session_id', sessionId)
        .single()

      if (existing) {
        conversationId = existing.id
        await supabase
          .from('widget_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)
      }
    }

    // No valid conversationId — create a new conversation
    if (!conversationId) {
      // Extract title from first user message
      const lastUserMsg = messages.findLast((m: { role: string }) => m.role === 'user')
      const titleText = lastUserMsg?.parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { text: string }) => p.text)
        .join('') ?? lastUserMsg?.content ?? ''
      const title = typeof titleText === 'string'
        ? titleText.slice(0, 80) || null
        : null

      const { data: newConv } = await supabase
        .from('widget_conversations')
        .insert({
          session_id: sessionId,
          ip_address: ip,
          user_agent: headersList.get('user-agent') ?? null,
          title,
        })
        .select('id')
        .single()

      if (newConv) conversationId = newConv.id
    }
  }

  // Fetch prior conversation context for returning visitors
  let systemPrompt = WIDGET_SYSTEM_PROMPT
  if (sessionId && messages.length <= 1) {
    const { data: priorConv } = await supabase
      .from('widget_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .neq('id', conversationId ?? '')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single()

    if (priorConv) {
      const { data: priorMessages } = await supabase
        .from('widget_messages')
        .select('role, content')
        .eq('conversation_id', priorConv.id)
        .order('created_at', { ascending: true })
        .limit(10)

      if (priorMessages?.length) {
        const priorContext = priorMessages
          .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
          .join('\n')
        systemPrompt += '\n\n## Prior Conversation Context\n' + priorContext
      }
    }
  }

  // Convert UIMessages (parts format) to CoreMessages (content format) for the AI SDK
  const modelMessages = await convertToModelMessages(messages)

  // Store user message
  if (conversationId && messages.length > 0) {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === 'user') {
      const textContent = lastMsg.parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { text: string }) => p.text)
        .join('') ?? lastMsg.content ?? ''
      await supabase.from('widget_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: typeof textContent === 'string' ? textContent : JSON.stringify(textContent),
      })
    }
  }

  const result = streamText({
    model: anthropic(WIDGET_MODEL),
    system: systemPrompt,
    messages: modelMessages,
    tools: createWidgetTools(sessionId, conversationId),
    stopWhen: stepCountIs(3),
    maxOutputTokens: 1000,
    onFinish: async ({ text }) => {
      // Store assistant response
      if (conversationId) {
        await supabase.from('widget_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: text,
        })
      }
    },
  })

  return result.toUIMessageStreamResponse({
    headers: conversationId
      ? { 'X-Conversation-Id': conversationId }
      : undefined,
  })
}
