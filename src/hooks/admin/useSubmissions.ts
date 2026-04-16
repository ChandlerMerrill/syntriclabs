"use client"

import useSWR from "swr"
import type { Submission } from "@/lib/types"

export function useSubmissions(status?: string, fallbackData?: Submission[]) {
  const params = new URLSearchParams()
  if (status && status !== "all") params.set("status", status)
  const qs = params.toString()
  const key = `/api/admin/submissions${qs ? `?${qs}` : ""}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ submissions: Submission[] }>(
    key,
    { fallbackData: fallbackData ? { submissions: fallbackData } : undefined }
  )
  return {
    submissions: data?.submissions ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
