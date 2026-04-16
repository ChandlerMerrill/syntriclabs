"use client"

import useSWR from "swr"
import type { DocumentWithClient } from "@/lib/types"

export function useDealDocuments(
  dealId: string | null,
  fallbackData?: DocumentWithClient[]
) {
  const key = dealId ? `/api/admin/deals/${dealId}/documents` : null
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ documents: DocumentWithClient[] }>(
    key,
    { fallbackData: fallbackData ? { documents: fallbackData } : undefined }
  )
  return {
    documents: data?.documents ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
