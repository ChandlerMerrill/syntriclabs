"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import PageHeader from "@/components/admin/shared/PageHeader"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import PerformancePanel from "@/components/admin/marketing/PerformancePanel"
import { Megaphone } from "lucide-react"
import type { RatedVariant, PerformanceTotals } from "@/lib/marketing/eval/performance"

interface Props {
  campaigns: { id: string; name: string }[]
  activeCampaign: string | null
  initialVariants: RatedVariant[]
  initialTotals: PerformanceTotals
  minSample: number
}

const ALL_CAMPAIGNS = "__all"

export default function PerformanceView({
  campaigns,
  activeCampaign,
  initialVariants,
  initialTotals,
  minSample,
}: Props) {
  const router = useRouter()

  const key = activeCampaign
    ? `/api/admin/marketing/performance?campaignId=${activeCampaign}`
    : "/api/admin/marketing/performance"

  const { data } = useSWR<{ variants: RatedVariant[]; totals: PerformanceTotals }>(key, {
    fallbackData: { variants: initialVariants, totals: initialTotals },
  })

  const variants = useMemo(() => data?.variants ?? [], [data?.variants])
  const totals = data?.totals ?? initialTotals

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Which variant — and which prompt — produced which reply."
      >
        {campaigns.length > 0 && (
          <FilterSelect
            options={[
              { value: ALL_CAMPAIGNS, label: "All campaigns" },
              ...campaigns.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={activeCampaign ?? ALL_CAMPAIGNS}
            onChange={(id) =>
              router.push(
                id === ALL_CAMPAIGNS
                  ? "/admin/marketing/performance"
                  : `/admin/marketing/performance?campaign=${id}`
              )
            }
            label="Campaign"
            icon={Megaphone}
            searchable={campaigns.length > 6}
            searchPlaceholder="Search campaigns…"
            className="max-w-64"
          />
        )}
      </PageHeader>

      <PerformancePanel variants={variants} totals={totals} minSample={minSample} />
    </div>
  )
}
