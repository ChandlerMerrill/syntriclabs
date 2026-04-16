import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getLead } from "@/lib/services/leads"
import LeadDetail from "./LeadDetail"

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: lead, error } = await getLead(supabase, id)

  if (error || !lead) notFound()

  let messages: { role: string; content: string; created_at: string }[] = []
  if (lead.conversation_id) {
    const { data } = await supabase
      .from("widget_messages")
      .select("role, content, created_at")
      .eq("conversation_id", lead.conversation_id)
      .order("created_at", { ascending: true })
    messages = data ?? []
  }

  return <LeadDetail initialData={{ lead, messages }} />
}
