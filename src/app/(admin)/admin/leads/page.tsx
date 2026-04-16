import { createClient } from "@/lib/supabase/server"
import { getLeads } from "@/lib/services/leads"
import LeadsList from "./LeadsList"

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Widget Leads</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Leads captured from the website chat widget
        </p>
      </div>
      <LeadsList leads={leads ?? []} activeStatus={params.status ?? "all"} />
    </div>
  )
}
