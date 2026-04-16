import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { convertToClient } from "@/lib/services/leads"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { leadId } = await request.json()
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 })
  }

  const { data: client, error } = await convertToClient(supabase, leadId)

  if (error || !client) {
    return NextResponse.json(
      { error: typeof error === "string" ? error : "Failed to convert lead" },
      { status: 500 }
    )
  }

  return NextResponse.json({ client })
}
