import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProjectForm from "@/components/admin/projects/ProjectForm"
import PageHeader from "@/components/admin/shared/PageHeader"
import type { Project } from "@/lib/types"

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Project" description={project.name} />
      <ProjectForm project={project as Project} />
    </div>
  )
}
