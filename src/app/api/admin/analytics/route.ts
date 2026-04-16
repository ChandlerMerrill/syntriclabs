import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
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

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const range = resolveDateRange(
    url.searchParams.get("range") ?? undefined,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined
  )

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

  return NextResponse.json({
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
  })
}
