"use client"

import useSWR from "swr"
import type {
  DateRange,
  RevenueDataPoint,
  VelocityDataPoint,
  FunnelDataPoint,
  WinLossDataPoint,
  DocumentConversionPoint,
  AcquisitionDataPoint,
  TopClientDataPoint,
  WidgetConversationPoint,
  WidgetConversionPoint,
} from "@/lib/types"

export interface AnalyticsData {
  range: DateRange
  revenue: RevenueDataPoint[]
  velocity: VelocityDataPoint[]
  funnel: FunnelDataPoint[]
  winLoss: WinLossDataPoint[]
  docConversion: DocumentConversionPoint[]
  acquisition: AcquisitionDataPoint[]
  topClients: TopClientDataPoint[]
  widgetConversations: WidgetConversationPoint[]
  widgetConversion: WidgetConversionPoint[]
}

export function useAnalytics(
  params: { range?: string; from?: string; to?: string } = {},
  fallbackData?: AnalyticsData
) {
  const search = new URLSearchParams()
  if (params.range) search.set("range", params.range)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  const qs = search.toString()
  const key = `/api/admin/analytics${qs ? `?${qs}` : ""}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<AnalyticsData>(
    key,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
