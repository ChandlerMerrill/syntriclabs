"use client"

import useSWR from "swr"
import type { Message } from "@/lib/types"

export function useConversationMessages(
  conversationId: string | null,
  fallbackData?: Message[]
) {
  const key = conversationId ? `/api/admin/conversations/${conversationId}/messages` : null
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ messages: Message[] }>(
    key,
    { fallbackData: fallbackData ? { messages: fallbackData } : undefined }
  )
  return {
    messages: data?.messages ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
