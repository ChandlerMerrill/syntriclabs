"use client"

import useSWR from "swr"
import type { DealWithClient } from "@/lib/types"

export function useDeals(fallbackData?: DealWithClient[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ deals: DealWithClient[] }>(
    "/api/admin/deals",
    { fallbackData: fallbackData ? { deals: fallbackData } : undefined }
  )
  return {
    deals: data?.deals ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
