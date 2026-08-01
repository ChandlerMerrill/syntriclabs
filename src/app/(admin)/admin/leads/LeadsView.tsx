"use client"

import PageHeader from "@/components/admin/shared/PageHeader"
import LeadsList from "./LeadsList"
import { useLeads } from "@/hooks/admin/useLeads"
import type { WidgetLead } from "@/lib/types"

export default function LeadsView({
  initialLeads,
  initialStatus,
}: {
  initialLeads: WidgetLead[]
  initialStatus?: string
}) {
  // Every lead, filtered in the browser — the counts on each filter are only
  // honest if the whole set is in hand.
  const { leads } = useLeads(undefined, initialLeads)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Widget Leads"
        description="Leads captured from the website chat widget"
      />
      <LeadsList leads={leads} initialStatus={initialStatus} />
    </div>
  )
}
