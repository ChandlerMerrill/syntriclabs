import { createClient } from "@/lib/supabase/server"
import { getLeads } from "@/lib/services/leads"
import LeadsView from "./LeadsView"

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: leads } = await getLeads(supabase, {
    status: params.status,
  })

  return <LeadsView initialLeads={leads ?? []} activeStatus={params.status ?? "all"} />
}
