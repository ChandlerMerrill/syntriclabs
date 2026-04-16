"use client"

import useSWR from "swr"
import type { ActivityWithContext, WidgetOverview } from "@/lib/types"

export interface DashboardData {
  clientsCount: number
  activeProjectsCount: number
  pipelineDeals: { value: number | null; stage: string }[]
  wonCount: number
  lostCount: number
  recentActivities: ActivityWithContext[]
  recentSubmissions: {
    id: string
    name: string
    email: string
    service: string | null
    status: string
    created_at: string
  }[]
  widgetOverview: WidgetOverview
}

export function useDashboard(fallbackData?: DashboardData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardData>(
    "/api/admin/dashboard",
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
