import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { projectId } = await params

  const [projectRes, activitiesRes] = await Promise.all([
    supabase.from("projects").select("*, clients(id, company_name)").eq("id", projectId).single(),
    supabase.from("activities").select("*, clients(id, company_name)").eq("project_id", projectId).order("created_at", { ascending: false }),
  ])

  if (!projectRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    project: projectRes.data,
    activities: activitiesRes.data ?? [],
  })
}
