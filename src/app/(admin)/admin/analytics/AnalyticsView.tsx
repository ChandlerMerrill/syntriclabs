"use client"

import { Suspense } from "react"
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
import { useAnalytics, type AnalyticsData } from "@/hooks/admin/useAnalytics"

export default function AnalyticsView({
  initialData,
  rangeParams,
}: {
  initialData: AnalyticsData
  rangeParams: { range?: string; from?: string; to?: string }
}) {
  const { data } = useAnalytics(rangeParams, initialData)
  const d = data ?? initialData

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-[#94A3B8]">
            {d.range.from} — {d.range.to}
          </p>
        </div>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={d.revenue} />
        </div>
        <TopClientsTable data={d.topClients} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DealFunnelChart data={d.funnel} />
        <PipelineVelocityChart data={d.velocity} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WinLossChart data={d.winLoss} />
        <DocumentConversionChart data={d.docConversion} />
      </div>

      <ClientAcquisitionChart data={d.acquisition} />

      {/* Widget Analytics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Widget Analytics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <WidgetConversationsChart data={d.widgetConversations} />
          <WidgetConversionChart data={d.widgetConversion} />
        </div>
      </div>
    </div>
  )
}
