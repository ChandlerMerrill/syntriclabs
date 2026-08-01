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
  // Unfiltered: the status facet is computed from the rows on screen, so the
  // server handing back a pre-narrowed set would make its counts lie.
  const { data: leads } = await getLeads(supabase, {})

  return <LeadsView initialLeads={leads ?? []} initialStatus={params.status} />
}
