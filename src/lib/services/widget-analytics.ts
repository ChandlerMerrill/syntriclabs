import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO } from 'date-fns'
import type {
  DateRange,
  WidgetOverview,
  WidgetConversationPoint,
  WidgetConversionPoint,
} from '@/lib/types'

export async function getWidgetOverview(
  supabase: SupabaseClient
): Promise<WidgetOverview> {
  const [convRes, msgRes, leadRes, escRes] = await Promise.all([
    supabase.from('widget_conversations').select('*', { count: 'exact', head: true }),
    supabase.from('widget_messages').select('*', { count: 'exact', head: true }),
    supabase.from('widget_leads').select('*', { count: 'exact', head: true }),
    supabase.from('widget_escalations').select('*', { count: 'exact', head: true }),
  ])

  return {
    conversations: convRes.count ?? 0,
    messages: msgRes.count ?? 0,
    leads: leadRes.count ?? 0,
    escalations: escRes.count ?? 0,
  }
}

export async function getWidgetConversationsOverTime(
  supabase: SupabaseClient,
  range: DateRange
): Promise<WidgetConversationPoint[]> {
  const { data: conversations } = await supabase
    .from('widget_conversations')
    .select('created_at')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (!conversations?.length) return []

  const grouped = new Map<string, number>()
  for (const conv of conversations) {
    const date = format(parseISO(conv.created_at), 'yyyy-MM-dd')
    grouped.set(date, (grouped.get(date) ?? 0) + 1)
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export async function getWidgetLeadConversion(
  supabase: SupabaseClient,
  range: DateRange
): Promise<WidgetConversionPoint[]> {
  const [convRes, leadRes] = await Promise.all([
    supabase
      .from('widget_conversations')
      .select('created_at')
      .gte('created_at', range.from)
      .lte('created_at', range.to),
    supabase
      .from('widget_leads')
      .select('created_at')
      .gte('created_at', range.from)
      .lte('created_at', range.to),
  ])

  const conversations = convRes.data ?? []
  const leads = leadRes.data ?? []

  if (!conversations.length) return []

  const convByMonth = new Map<string, number>()
  for (const c of conversations) {
    const month = format(parseISO(c.created_at), 'yyyy-MM')
    convByMonth.set(month, (convByMonth.get(month) ?? 0) + 1)
  }

  const leadsByMonth = new Map<string, number>()
  for (const l of leads) {
    const month = format(parseISO(l.created_at), 'yyyy-MM')
    leadsByMonth.set(month, (leadsByMonth.get(month) ?? 0) + 1)
  }

  return Array.from(convByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, convCount]) => {
      const leadCount = leadsByMonth.get(month) ?? 0
      return {
        month,
        conversations: convCount,
        leads: leadCount,
        rate: convCount > 0 ? Math.round((leadCount / convCount) * 100) : 0,
      }
    })
}
