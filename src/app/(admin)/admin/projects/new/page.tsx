import ProjectForm from "@/components/admin/projects/ProjectForm"
import PageHeader from "@/components/admin/shared/PageHeader"

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams

  return (
    <div className="space-y-6">
      <PageHeader title="New Project" description="Create a new project" />
      <ProjectForm defaultClientId={client_id} />
    </div>
  )
}
