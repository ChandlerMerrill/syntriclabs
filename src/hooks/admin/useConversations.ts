"use client"

import useSWR from "swr"
import type { Conversation, MessageChannel } from "@/lib/types"

export function useConversations(
  filters?: { archived?: boolean; channel?: MessageChannel },
  fallbackData?: Conversation[]
) {
  const params = new URLSearchParams()
  if (filters?.archived !== undefined) params.set("archived", String(filters.archived))
  if (filters?.channel) params.set("channel", filters.channel)
  const qs = params.toString()
  const key = `/api/admin/conversations${qs ? `?${qs}` : ""}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ conversations: Conversation[] }>(
    key,
    { fallbackData: fallbackData ? { conversations: fallbackData } : undefined }
  )
  return {
    conversations: data?.conversations ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
