"use client"

import useSWR from "swr"
import type { EmailWithClient } from "@/lib/types"

export function useEmails(fallbackData?: EmailWithClient[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ emails: EmailWithClient[] }>(
    "/api/admin/emails",
    { fallbackData: fallbackData ? { emails: fallbackData } : undefined }
  )
  return {
    emails: data?.emails ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
