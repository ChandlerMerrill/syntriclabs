import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAIAction, markUndone } from '@/lib/services/ai-actions'
import { executeUndo } from '@/lib/ai/undo'

export const maxDuration = 30

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { actionId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const actionId = body.actionId
  if (!actionId || typeof actionId !== 'string') {
    return NextResponse.json({ error: 'actionId (uuid) is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: row, error: fetchErr } = await getAIAction(supabase, actionId)
  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 })
  }
  if (row.undone_at) {
    return NextResponse.json(
      { error: `Already undone at ${row.undone_at}.` },
      { status: 409 }
    )
  }

  const outcome = await executeUndo(supabase, row)

  // Record the undo itself as its own ai_actions row — so undos are auditable too.
  const { data: undoRowIns } = await supabase
    .from('ai_actions')
    .insert({
      tool_name: 'undo',
      args: { originalActionId: actionId, originalToolName: row.tool_name },
      result: outcome,
      status: outcome.ok ? 'success' : 'error',
      error_message: outcome.ok ? null : outcome.error,
      conversation_id: row.conversation_id,
      channel: row.channel,
      client_id: row.client_id,
      reversal_hint: null,
    })
    .select('id')
    .single() as unknown as { data: { id: string } | null }

  if (outcome.ok && undoRowIns) {
    await markUndone(supabase, actionId, undoRowIns.id)
  }

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 400 })
  }
  return NextResponse.json({
    ok: true,
    summary: outcome.summary,
    warning: outcome.warning ?? null,
    undoActionId: undoRowIns?.id ?? null,
  })
}
