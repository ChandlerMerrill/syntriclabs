import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { getUnreadCount } from "@/lib/services/messages"
import { getNewLeadsCount } from "@/lib/services/leads"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const [{ count: unreadSubmissions }, unreadMessages, newLeads] = await Promise.all([
    supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "unread"),
    getUnreadCount(supabase),
    getNewLeadsCount(supabase),
  ])

  return NextResponse.json({
    unreadSubmissions: unreadSubmissions ?? 0,
    unreadMessages,
    newLeads,
  })
}
