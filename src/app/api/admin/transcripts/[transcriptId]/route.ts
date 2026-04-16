import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ transcriptId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { transcriptId } = await params

  const { data, error } = await supabase
    .from("transcripts")
    .select("*, clients(id, company_name)")
    .eq("id", transcriptId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ transcript: data })
}
