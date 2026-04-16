import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return Response.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Get conversations with a preview from the last assistant message
  const { data: conversations, error } = await supabase
    .from('widget_conversations')
    .select('id, title, last_message_at, created_at')
    .eq('session_id', sessionId)
    .order('last_message_at', { ascending: false })
    .limit(20)

  if (error) {
    return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }

  // Fetch last assistant message for each conversation as preview
  const results = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from('widget_messages')
        .select('content')
        .eq('conversation_id', conv.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        id: conv.id,
        title: conv.title ?? 'Untitled conversation',
        lastMessageAt: conv.last_message_at,
        preview: lastMsg?.content?.slice(0, 100) ?? null,
      }
    })
  )

  return Response.json(results)
}
