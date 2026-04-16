"use client"

import useSWR from "swr"
import type { WidgetLeadWithEscalations } from "@/lib/types"

export interface LeadDetailData {
  lead: WidgetLeadWithEscalations
  messages: { role: string; content: string; created_at: string }[]
}

export function useLead(id: string, fallbackData?: LeadDetailData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<LeadDetailData>(
    `/api/admin/leads/${id}`,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
