import { createClient } from "@/lib/supabase/server"
import ProjectsView from "./ProjectsView"
import type { ProjectWithClient } from "@/lib/types"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from("projects")
    .select("*, clients(id, company_name)")
    .order("created_at", { ascending: false })

  return <ProjectsView initialProjects={(projects ?? []) as ProjectWithClient[]} />
}
