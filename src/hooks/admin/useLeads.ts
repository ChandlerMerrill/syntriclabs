"use client"

import useSWR from "swr"
import type { WidgetLead } from "@/lib/types"

export function useLeads(status?: string, fallbackData?: WidgetLead[]) {
  const params = new URLSearchParams()
  if (status && status !== "all") params.set("status", status)
  const qs = params.toString()
  const key = `/api/admin/leads${qs ? `?${qs}` : ""}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ leads: WidgetLead[] }>(
    key,
    { fallbackData: fallbackData ? { leads: fallbackData } : undefined }
  )
  return {
    leads: data?.leads ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
