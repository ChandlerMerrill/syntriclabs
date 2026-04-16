"use client"

import LeadsList from "./LeadsList"
import { useLeads } from "@/hooks/admin/useLeads"
import type { WidgetLead } from "@/lib/types"

export default function LeadsView({
  initialLeads,
  activeStatus,
}: {
  initialLeads: WidgetLead[]
  activeStatus: string
}) {
  const { leads } = useLeads(activeStatus, initialLeads)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Widget Leads</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Leads captured from the website chat widget
        </p>
      </div>
      <LeadsList leads={leads} activeStatus={activeStatus} />
    </div>
  )
}
