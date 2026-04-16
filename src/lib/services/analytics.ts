import type { SupabaseClient } from '@supabase/supabase-js'
import { format, subDays, parseISO, differenceInDays } from 'date-fns'
import type {
  DateRange,
  RevenueDataPoint,
  VelocityDataPoint,
  FunnelDataPoint,
  WinLossDataPoint,
  DocumentConversionPoint,
  AcquisitionDataPoint,
  TopClientDataPoint,
  StageHistoryEntry,
} from '@/lib/types'

const STAGE_ORDER = ['lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost']

export function resolveDateRange(preset?: string, from?: string, to?: string): DateRange {
  const today = new Date()
  if (from && to) return { from, to }
  switch (preset) {
    case '30d': return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case '365d': return { from: format(subDays(today, 365), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case 'all': return { from: '2020-01-01', to: format(today, 'yyyy-MM-dd') }
    case '90d':
    default: return { from: format(subDays(today, 90), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
  }
}

export async function getRevenueOverTime(
  supabase: SupabaseClient,
  range: DateRange
): Promise<RevenueDataPoint[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('value, actual_close_date')
    .eq('stage', 'won')
    .gte('actual_close_date', range.from)
    .lte('actual_close_date', range.to)

  if (!deals?.length) return []

  const grouped = new Map<string, number>()
  for (const deal of deals) {
    const month = format(parseISO(deal.actual_close_date), 'yyyy-MM')
    grouped.set(month, (grouped.get(month) ?? 0) + deal.value)
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }))
}

export async function getPipelineVelocity(
  supabase: SupabaseClient,
  range: DateRange
): Promise<VelocityDataPoint[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('stage_history')
    .gte('updated_at', range.from)
    .lte('updated_at', range.to)

  if (!deals?.length) return []

  const stageDurations = new Map<string, number[]>()

  for (const deal of deals) {
    const history = deal.stage_history as StageHistoryEntry[]
    if (!history?.length) continue
    for (let i = 1; i < history.length; i++) {
      const from = parseISO(history[i - 1].timestamp)
      const to = parseISO(history[i].timestamp)
      const days = differenceInDays(to, from)
      const stage = history[i - 1].to
      if (!stageDurations.has(stage)) stageDurations.set(stage, [])
      stageDurations.get(stage)!.push(days)
    }
  }

  return STAGE_ORDER
    .filter(s => s !== 'won' && s !== 'lost')
    .filter(s => stageDurations.has(s))
    .map(stage => {
      const durations = stageDurations.get(stage)!
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      return { stage, avgDays: Math.round(avg * 10) / 10 }
    })
}

export async function getDealFunnel(
  supabase: SupabaseClient,
  range: DateRange
): Promise<FunnelDataPoint[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('stage_history')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (!deals?.length) return []

  const stageCounts = new Map<string, number>()
  const activeStages = STAGE_ORDER.filter(s => s !== 'lost')

  for (const deal of deals) {
    const history = deal.stage_history as StageHistoryEntry[]
    if (!history?.length) continue
    const reachedStages = new Set(history.map(h => h.to))
    // The first entry's "to" is always the initial stage
    reachedStages.add(history[0].to)
    for (const stage of activeStages) {
      if (reachedStages.has(stage)) {
        stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1)
      }
    }
  }

  const total = deals.length
  return activeStages
    .filter(s => stageCounts.has(s))
    .map(stage => {
      const count = stageCounts.get(stage) ?? 0
      return {
        stage,
        count,
        dropOff: total > 0 ? Math.round((1 - count / total) * 100) : 0,
      }
    })
}

export async function getWinLossTrend(
  supabase: SupabaseClient,
  range: DateRange
): Promise<WinLossDataPoint[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('stage, actual_close_date')
    .in('stage', ['won', 'lost'])
    .gte('actual_close_date', range.from)
    .lte('actual_close_date', range.to)

  if (!deals?.length) return []

  const grouped = new Map<string, { won: number; lost: number }>()
  for (const deal of deals) {
    const month = format(parseISO(deal.actual_close_date), 'yyyy-MM')
    if (!grouped.has(month)) grouped.set(month, { won: 0, lost: 0 })
    const entry = grouped.get(month)!
    if (deal.stage === 'won') entry.won++
    else entry.lost++
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { won, lost }]) => ({
      month,
      won,
      lost,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
    }))
}

export async function getDocumentConversion(
  supabase: SupabaseClient,
  range: DateRange
): Promise<DocumentConversionPoint[]> {
  const { data: docs } = await supabase
    .from('documents')
    .select('status')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (!docs?.length) return []

  const total = docs.length
  const counts = new Map<string, number>()
  for (const doc of docs) {
    counts.set(doc.status, (counts.get(doc.status) ?? 0) + 1)
  }

  const statusOrder = ['draft', 'final', 'sent', 'accepted', 'rejected']
  return statusOrder
    .filter(s => counts.has(s))
    .map(status => ({
      status,
      count: counts.get(status) ?? 0,
      rate: Math.round(((counts.get(status) ?? 0) / total) * 100),
    }))
}

export async function getClientAcquisition(
  supabase: SupabaseClient,
  range: DateRange
): Promise<AcquisitionDataPoint[]> {
  const { data: clients } = await supabase
    .from('clients')
    .select('source, created_at')
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (!clients?.length) return []

  const grouped = new Map<string, Record<string, number>>()
  const sources = ['website', 'referral', 'cold_outreach', 'event', 'other']

  for (const client of clients) {
    const month = format(parseISO(client.created_at), 'yyyy-MM')
    if (!grouped.has(month)) {
      grouped.set(month, Object.fromEntries(sources.map(s => [s, 0])))
    }
    const entry = grouped.get(month)!
    const src = sources.includes(client.source) ? client.source : 'other'
    entry[src]++
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data })) as AcquisitionDataPoint[]
}

export async function getTopClients(
  supabase: SupabaseClient,
  range: DateRange,
  limit = 10
): Promise<TopClientDataPoint[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('client_id, value, clients(id, company_name, industry)')
    .eq('stage', 'won')
    .gte('actual_close_date', range.from)
    .lte('actual_close_date', range.to)

  if (!deals?.length) return []

  const clientMap = new Map<string, { companyName: string; industry: string | null; totalRevenue: number; dealCount: number }>()

  for (const deal of deals) {
    const client = deal.clients as unknown as { id: string; company_name: string; industry: string | null } | null
    if (!client) continue
    if (!clientMap.has(deal.client_id)) {
      clientMap.set(deal.client_id, {
        companyName: client.company_name,
        industry: client.industry,
        totalRevenue: 0,
        dealCount: 0,
      })
    }
    const entry = clientMap.get(deal.client_id)!
    entry.totalRevenue += deal.value
    entry.dealCount++
  }

  return Array.from(clientMap.entries())
    .map(([clientId, data]) => ({ clientId, ...data }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
}
