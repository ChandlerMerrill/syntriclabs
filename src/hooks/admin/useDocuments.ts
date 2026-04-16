"use client"

import useSWR from "swr"
import type { DocumentWithClient } from "@/lib/types"

export function useDocuments(fallbackData?: DocumentWithClient[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ documents: DocumentWithClient[] }>(
    "/api/admin/documents",
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
