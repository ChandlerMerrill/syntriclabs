"use client"

import useSWR from "swr"
import type { ProjectWithClient, ActivityWithContext } from "@/lib/types"

export interface ProjectDetailData {
  project: ProjectWithClient
  activities: ActivityWithContext[]
}

export function useProject(projectId: string, fallbackData?: ProjectDetailData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectDetailData>(
    `/api/admin/projects/${projectId}`,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
