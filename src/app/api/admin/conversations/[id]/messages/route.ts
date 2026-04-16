import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { getMessages } from "@/lib/services/messages"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth
  const { id } = await params

  const { data, error } = await getMessages(supabase, id)
  if (error) return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}
