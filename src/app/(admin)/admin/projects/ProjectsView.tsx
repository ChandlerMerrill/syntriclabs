"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FolderKanban } from "lucide-react"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import ProjectsTable from "./ProjectsTable"
import { useProjects } from "@/hooks/admin/useProjects"
import type { ProjectWithClient } from "@/lib/types"

export default function ProjectsView({
  initialProjects,
}: {
  initialProjects: ProjectWithClient[]
}) {
  const { projects } = useProjects(initialProjects)

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Track project status and deliverables">
        <Link href="/admin/projects/new">
          <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
            <Plus className="mr-1.5 h-4 w-4" /> Add Project
          </Button>
        </Link>
      </PageHeader>

      {projects.length > 0 ? (
        <ProjectsTable projects={projects} />
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to start tracking work."
          actionLabel="Add Project"
          actionHref="/admin/projects/new"
        />
      )}
    </div>
  )
}
