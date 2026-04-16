"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import ConfirmDialog from "@/components/admin/shared/ConfirmDialog"
import ActivityFeed from "@/components/admin/activities/ActivityFeed"
import { ArrowLeft, Edit, Trash2, ExternalLink, Calendar, DollarSign } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { useProject, type ProjectDetailData } from "@/hooks/admin/useProject"

export default function ProjectDetail({ initialData }: { initialData: ProjectDetailData }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data } = useProject(initialData.project.id, initialData)
  const d = data ?? initialData
  const { project, activities } = d

  const handleDelete = async () => {
    const supabase = createClient()
    const { error } = await supabase.from("projects").delete().eq("id", project.id)
    if (error) {
      toast.error("Failed to delete project")
    } else {
      toast.success("Project deleted")
      router.push("/admin/projects")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/projects" className="mb-2 flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.clients && (
            <Link href={`/admin/clients/${project.clients.id}`} className="mt-0.5 text-sm text-[#60A5FA] hover:underline">
              {project.clients.company_name}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm" className="border-white/8 text-[#94A3B8] hover:text-white">
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-[#94A3B8] hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#94A3B8]">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {project.description && (
              <div>
                <p className="text-xs text-[#94A3B8]">Description</p>
                <p className="mt-1 text-white whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            {project.scope && (
              <div>
                <p className="text-xs text-[#94A3B8]">Scope</p>
                <p className="mt-1 text-white whitespace-pre-wrap">{project.scope}</p>
              </div>
            )}
            {project.tech_stack.length > 0 && (
              <div>
                <p className="text-xs text-[#94A3B8]">Tech Stack</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {project.tech_stack.map((t) => (
                    <Badge key={t} variant="secondary" className="bg-[#334155] text-white text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#94A3B8]">Timeline & Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(project.budget_min || project.budget_max) && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#94A3B8]" />
                <span className="text-white">
                  {project.budget_min ? formatCurrency(project.budget_min) : "—"} – {project.budget_max ? formatCurrency(project.budget_max) : "—"}
                </span>
              </div>
            )}
            {project.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#94A3B8]" />
                <span className="text-[#94A3B8]">Start:</span>
                <span className="text-white">{formatDate(project.start_date)}</span>
              </div>
            )}
            {project.target_end_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#94A3B8]" />
                <span className="text-[#94A3B8]">Target:</span>
                <span className="text-white">{formatDate(project.target_end_date)}</span>
              </div>
            )}
            {project.links?.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-[#94A3B8]">Links</p>
                {project.links.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#60A5FA] hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> {link.label || link.url}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#94A3B8]">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities} />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`This will permanently delete "${project.name}".`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  )
}
