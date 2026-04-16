import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { dealId } = await params

  const { data, error } = await supabase
    .from("documents")
    .select("*, clients(id, company_name)")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}
