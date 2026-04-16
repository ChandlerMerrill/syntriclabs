import { Suspense } from "react"
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
import DateRangeFilter from "@/components/admin/analytics/DateRangeFilter"
import RevenueChart from "@/components/admin/analytics/RevenueChart"
import PipelineVelocityChart from "@/components/admin/analytics/PipelineVelocityChart"
import DealFunnelChart from "@/components/admin/analytics/DealFunnelChart"
import WinLossChart from "@/components/admin/analytics/WinLossChart"
import DocumentConversionChart from "@/components/admin/analytics/DocumentConversionChart"
import ClientAcquisitionChart from "@/components/admin/analytics/ClientAcquisitionChart"
import TopClientsTable from "@/components/admin/analytics/TopClientsTable"
import WidgetConversationsChart from "@/components/admin/analytics/WidgetConversationsChart"
import WidgetConversionChart from "@/components/admin/analytics/WidgetConversionChart"

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-[#94A3B8]">
            {range.from} — {range.to}
          </p>
        </div>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue} />
        </div>
        <TopClientsTable data={topClients} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DealFunnelChart data={funnel} />
        <PipelineVelocityChart data={velocity} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WinLossChart data={winLoss} />
        <DocumentConversionChart data={docConversion} />
      </div>

      <ClientAcquisitionChart data={acquisition} />

      {/* Widget Analytics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Widget Analytics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <WidgetConversationsChart data={widgetConversations} />
          <WidgetConversionChart data={widgetConversion} />
        </div>
      </div>
    </div>
  )
}
