import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { getLeads } from "@/lib/services/leads"

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const status = url.searchParams.get("status") ?? undefined
  const search = url.searchParams.get("search") ?? undefined

  const { data, error } = await getLeads(supabase, { status, search })
  if (error) return NextResponse.json({ error: "Failed to load leads" }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}
