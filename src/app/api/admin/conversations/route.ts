import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { getConversations } from "@/lib/services/messages"
import type { MessageChannel } from "@/lib/types"

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const archivedParam = url.searchParams.get("archived")
  const channelParam = url.searchParams.get("channel")

  const filters: { archived?: boolean; channel?: MessageChannel } = {}
  if (archivedParam !== null) filters.archived = archivedParam === "true"
  if (channelParam) filters.channel = channelParam as MessageChannel

  const { data, error } = await getConversations(supabase, filters)
  if (error) return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  return NextResponse.json({ conversations: data ?? [] })
}
