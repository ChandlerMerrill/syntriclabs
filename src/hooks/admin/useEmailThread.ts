"use client"

import useSWR from "swr"
import type { EmailWithClient } from "@/lib/types"

export function useEmailThread(threadId: string | null, fallbackData?: EmailWithClient[]) {
  const key = threadId ? `/api/admin/emails/thread/${threadId}` : null
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ emails: EmailWithClient[] }>(
    key,
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
