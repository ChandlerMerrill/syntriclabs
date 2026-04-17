import type { SupabaseClient } from '@supabase/supabase-js'

export interface AIActionRow {
  id: string
  tool_name: string
  args: Record<string, unknown>
  result: Record<string, unknown> | null
  status: 'success' | 'error'
  error_message: string | null
  conversation_id: string | null
  channel: string | null
  client_id: string | null
  reversal_hint: Record<string, unknown> | null
  created_at: string
  undone_at: string | null
  undone_by_action_id: string | null
}

export interface ListAIActionsFilters {
  from?: string // ISO timestamp inclusive
  to?: string // ISO timestamp inclusive
  toolName?: string
  status?: 'success' | 'error'
  conversationId?: string
  limit?: number
  offset?: number
}

export async function listAIActions(
  supabase: SupabaseClient,
  filters: ListAIActionsFilters = {}
): Promise<{ data: AIActionRow[]; count: number; error: unknown }> {
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  let query = supabase
    .from('ai_actions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)
  if (filters.toolName) query = query.eq('tool_name', filters.toolName)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.conversationId) query = query.eq('conversation_id', filters.conversationId)

  const { data, count, error } = await query
  return {
    data: (data ?? []) as AIActionRow[],
    count: count ?? 0,
    error,
  }
}

export async function getAIAction(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: AIActionRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('ai_actions')
    .select('*')
    .eq('id', id)
    .single()
  return { data: (data ?? null) as AIActionRow | null, error }
}

export async function markUndone(
  supabase: SupabaseClient,
  actionId: string,
  undoneByActionId: string
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('ai_actions')
    .update({
      undone_at: new Date().toISOString(),
      undone_by_action_id: undoneByActionId,
    })
    .eq('id', actionId)
  return { error }
}

export async function listDistinctToolNames(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('ai_actions')
    .select('tool_name')
    .order('tool_name')
    .limit(5000)
  const seen = new Set<string>()
  for (const row of (data ?? []) as { tool_name: string }[]) seen.add(row.tool_name)
  return Array.from(seen).sort()
}

export interface DailyDigest {
  totalCalls: number
  successCount: number
  errorCount: number
  errorRate: number
  topTools: { tool: string; count: number }[]
  webSearchCount: number
  hardDeletes: { toolName: string; displayName: string; clientId: string | null }[]
  writeSqlCalls: { reason: string; rowCount: number; table: string | null }[]
  customDocsCount: number
  createdCounts: { clients: number; leads: number; deals: number }
  errors: { toolName: string; message: string }[]
}

export async function getDailyDigest(
  supabase: SupabaseClient,
  since: string
): Promise<DailyDigest> {
  const { data } = await supabase
    .from('ai_actions')
    .select('tool_name, status, error_message, args, result, client_id')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  const rows = (data ?? []) as Array<{
    tool_name: string
    status: 'success' | 'error'
    error_message: string | null
    args: Record<string, unknown> | null
    result: Record<string, unknown> | null
    client_id: string | null
  }>

  const total = rows.length
  const errorCount = rows.filter(r => r.status === 'error').length
  const successCount = total - errorCount
  const errorRate = total > 0 ? errorCount / total : 0

  const byTool = new Map<string, number>()
  for (const r of rows) byTool.set(r.tool_name, (byTool.get(r.tool_name) ?? 0) + 1)
  const topTools = [...byTool.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, count]) => ({ tool, count }))

  const webSearchCount = byTool.get('web_search') ?? 0

  const hardDeletes = rows
    .filter(r => r.status === 'success' && r.tool_name.startsWith('hardDelete') && (r.result as { deleted?: boolean })?.deleted)
    .map(r => ({
      toolName: r.tool_name,
      displayName: (r.result as { displayName?: string } | null)?.displayName ?? '(unknown)',
      clientId: r.client_id,
    }))

  const writeSqlCalls = rows
    .filter(r => r.tool_name === 'writeSql' && r.status === 'success')
    .map(r => ({
      reason: (r.args as { reason?: string } | null)?.reason ?? '(no reason given)',
      rowCount: (r.result as { rowCount?: number } | null)?.rowCount ?? 0,
      table: (r.result as { targetTable?: string } | null)?.targetTable ?? null,
    }))

  const customDocsCount = rows.filter(r => r.tool_name === 'generateCustomDocument' && r.status === 'success').length

  const createdCounts = {
    clients: rows.filter(r => r.tool_name === 'createClient' && r.status === 'success').length,
    leads: rows.filter(r => r.tool_name === 'createLead' && r.status === 'success').length,
    deals: rows.filter(r => r.tool_name === 'createDeal' && r.status === 'success').length,
  }

  const errors = rows
    .filter(r => r.status === 'error' && r.error_message)
    .slice(0, 5)
    .map(r => ({ toolName: r.tool_name, message: r.error_message ?? '' }))

  return {
    totalCalls: total,
    successCount,
    errorCount,
    errorRate,
    topTools,
    webSearchCount,
    hardDeletes,
    writeSqlCalls,
    customDocsCount,
    createdCounts,
    errors,
  }
}
