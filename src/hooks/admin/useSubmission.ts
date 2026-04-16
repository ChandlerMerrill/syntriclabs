"use client"

import useSWR from "swr"
import type { Submission } from "@/lib/types"

export interface SubmissionDetailData {
  submission: Submission
}

export function useSubmission(id: string, fallbackData?: SubmissionDetailData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<SubmissionDetailData>(
    `/api/admin/submissions/${id}`,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
