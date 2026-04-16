"use client"

import useSWR from "swr"
import type {
  ClientWithContacts,
  ProjectWithClient,
  ActivityWithContext,
  DocumentWithClient,
  EmailWithClient,
  TranscriptWithClient,
} from "@/lib/types"

export interface ClientDetailData {
  client: ClientWithContacts
  projects: ProjectWithClient[]
  activities: ActivityWithContext[]
  documents: DocumentWithClient[]
  emails: EmailWithClient[]
  transcripts: TranscriptWithClient[]
}

export function useClient(clientId: string, fallbackData?: ClientDetailData) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ClientDetailData>(
    `/api/admin/clients/${clientId}`,
    { fallbackData }
  )
  return { data, error, isLoading, isValidating, mutate }
}
