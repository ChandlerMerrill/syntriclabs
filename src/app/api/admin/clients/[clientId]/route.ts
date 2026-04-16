import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { clientId } = await params

  const [clientRes, projectsRes, activitiesRes, documentsRes, emailsRes, transcriptsRes] = await Promise.all([
    supabase.from("clients").select("*, client_contacts(*)").eq("id", clientId).single(),
    supabase.from("projects").select("*, clients(id, company_name)").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("activities").select("*, clients(id, company_name)").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
    supabase.from("documents").select("*, clients(id, company_name)").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("emails").select("*, clients(id, company_name)").eq("client_id", clientId).order("internal_date", { ascending: false }).limit(50),
    supabase.from("transcripts").select("*, clients(id, company_name)").eq("client_id", clientId).order("date", { ascending: false }).limit(20),
  ])

  if (!clientRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    client: clientRes.data,
    projects: projectsRes.data ?? [],
    activities: activitiesRes.data ?? [],
    documents: documentsRes.data ?? [],
    emails: emailsRes.data ?? [],
    transcripts: transcriptsRes.data ?? [],
  })
}
