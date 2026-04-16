import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProjectDetail from "./ProjectDetail"
import type { ProjectWithClient, ActivityWithContext } from "@/lib/types"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const [projectRes, activitiesRes] = await Promise.all([
    supabase.from("projects").select("*, clients(id, company_name)").eq("id", projectId).single(),
    supabase.from("activities").select("*, clients(id, company_name)").eq("project_id", projectId).order("created_at", { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  return (
    <ProjectDetail
      initialData={{
        project: projectRes.data as ProjectWithClient,
        activities: (activitiesRes.data ?? []) as ActivityWithContext[],
      }}
    />
  )
}
