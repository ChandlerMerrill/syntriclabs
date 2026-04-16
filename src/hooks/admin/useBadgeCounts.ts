"use client"

import useSWR from "swr"

export interface BadgeCounts {
  unreadSubmissions: number
  unreadMessages: number
  newLeads: number
}

export function useBadgeCounts(fallbackData?: BadgeCounts) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BadgeCounts>(
    "/api/admin/badge-counts",
    {
      fallbackData,
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    }
  )
  return {
    counts: data ?? { unreadSubmissions: 0, unreadMessages: 0, newLeads: 0 },
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
