"use client"

import useSWR from "swr"
import type { TranscriptWithClient } from "@/lib/types"

export interface TranscriptDetailData {
  transcript: TranscriptWithClient
}

export function useTranscript(transcriptId: string, fallbackData?: TranscriptDetailData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<TranscriptDetailData>(
    `/api/admin/transcripts/${transcriptId}`,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
