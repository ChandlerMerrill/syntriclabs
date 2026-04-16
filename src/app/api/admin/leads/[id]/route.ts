import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { getLead } from "@/lib/services/leads"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { id } = await params

  const { data: lead, error } = await getLead(supabase, id)
  if (error || !lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let messages: { role: string; content: string; created_at: string }[] = []
  if (lead.conversation_id) {
    const { data } = await supabase
      .from("widget_messages")
      .select("role, content, created_at")
      .eq("conversation_id", lead.conversation_id)
      .order("created_at", { ascending: true })
    messages = data ?? []
  }

  return NextResponse.json({ lead, messages })
}
