import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ClientDetail from "./ClientDetail"
import type {
  ClientWithContacts,
  ProjectWithClient,
  ActivityWithContext,
  DocumentWithClient,
  EmailWithClient,
  TranscriptWithClient,
} from "@/lib/types"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const [clientRes, projectsRes, activitiesRes, documentsRes, emailsRes, transcriptsRes] = await Promise.all([
    supabase.from("clients").select("*, client_contacts(*)").eq("id", clientId).single(),
    supabase.from("projects").select("*, clients(id, company_name)").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("activities").select("*, clients(id, company_name)").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
    supabase.from("documents").select("*, clients(id, company_name)").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("emails").select("*, clients(id, company_name)").eq("client_id", clientId).order("internal_date", { ascending: false }).limit(50),
    supabase.from("transcripts").select("*, clients(id, company_name)").eq("client_id", clientId).order("date", { ascending: false }).limit(20),
  ])

  if (!clientRes.data) notFound()

  return (
    <ClientDetail
      initialData={{
        client: clientRes.data as ClientWithContacts,
        projects: (projectsRes.data ?? []) as ProjectWithClient[],
        activities: (activitiesRes.data ?? []) as ActivityWithContext[],
        documents: (documentsRes.data ?? []) as DocumentWithClient[],
        emails: (emailsRes.data ?? []) as EmailWithClient[],
        transcripts: (transcriptsRes.data ?? []) as TranscriptWithClient[],
      }}
    />
  )
}
