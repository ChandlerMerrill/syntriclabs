import { createClient } from "@/lib/supabase/server"
import {
  resolveDateRange,
  getRevenueOverTime,
  getPipelineVelocity,
  getDealFunnel,
  getWinLossTrend,
  getDocumentConversion,
  getClientAcquisition,
  getTopClients,
} from "@/lib/services/analytics"
import { getWidgetConversationsOverTime, getWidgetLeadConversion } from "@/lib/services/widget-analytics"
import AnalyticsView from "./AnalyticsView"

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const range = resolveDateRange(params.range, params.from, params.to)
  const supabase = await createClient()

  const [revenue, velocity, funnel, winLoss, docConversion, acquisition, topClients, widgetConversations, widgetConversion] =
    await Promise.all([
      getRevenueOverTime(supabase, range),
      getPipelineVelocity(supabase, range),
      getDealFunnel(supabase, range),
      getWinLossTrend(supabase, range),
      getDocumentConversion(supabase, range),
      getClientAcquisition(supabase, range),
      getTopClients(supabase, range),
      getWidgetConversationsOverTime(supabase, range),
      getWidgetLeadConversion(supabase, range),
    ])

  return (
    <AnalyticsView
      initialData={{
        range,
        revenue,
        velocity,
        funnel,
        winLoss,
        docConversion,
        acquisition,
        topClients,
        widgetConversations,
        widgetConversion,
      }}
      rangeParams={params}
    />
  )
}
