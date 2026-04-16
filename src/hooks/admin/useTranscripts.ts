"use client"

import useSWR from "swr"
import type { TranscriptWithClient } from "@/lib/types"

export function useTranscripts(fallbackData?: TranscriptWithClient[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ transcripts: TranscriptWithClient[] }>(
    "/api/admin/transcripts",
    { fallbackData: fallbackData ? { transcripts: fallbackData } : undefined }
  )
  return {
    transcripts: data?.transcripts ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
