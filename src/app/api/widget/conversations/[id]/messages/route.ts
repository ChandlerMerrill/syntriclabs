import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const sessionId = req.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return Response.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Verify conversation belongs to this session
  const { data: conv } = await supabase
    .from('widget_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('session_id', sessionId)
    .single()

  if (!conv) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: messages, error } = await supabase
    .from('widget_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  return Response.json(messages ?? [])
}
