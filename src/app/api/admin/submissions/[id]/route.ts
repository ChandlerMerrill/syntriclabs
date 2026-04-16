import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ submission: data })
}
