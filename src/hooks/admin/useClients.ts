"use client"

import useSWR from "swr"
import type { ClientWithContacts } from "@/lib/types"

export function useClients(fallbackData?: ClientWithContacts[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ clients: ClientWithContacts[] }>(
    "/api/admin/clients",
    { fallbackData: fallbackData ? { clients: fallbackData } : undefined }
  )
  return {
    clients: data?.clients ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
