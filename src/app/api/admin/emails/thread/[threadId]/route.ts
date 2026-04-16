import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { threadId } = await params

  const { data, error } = await supabase
    .from("emails")
    .select("*, clients(id, company_name)")
    .eq("gmail_thread_id", threadId)
    .order("internal_date", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ emails: data ?? [] })
}
