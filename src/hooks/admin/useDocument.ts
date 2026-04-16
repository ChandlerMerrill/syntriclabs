"use client"

import useSWR from "swr"
import type { DocumentWithClient } from "@/lib/types"

export interface DocumentDetailData {
  document: DocumentWithClient
}

export function useDocument(documentId: string, fallbackData?: DocumentDetailData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<DocumentDetailData>(
    `/api/admin/documents/${documentId}`,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
