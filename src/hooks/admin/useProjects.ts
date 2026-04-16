"use client"

import useSWR from "swr"
import type { ProjectWithClient } from "@/lib/types"

export function useProjects(fallbackData?: ProjectWithClient[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ projects: ProjectWithClient[] }>(
    "/api/admin/projects",
    { fallbackData: fallbackData ? { projects: fallbackData } : undefined }
  )
  return {
    projects: data?.projects ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
