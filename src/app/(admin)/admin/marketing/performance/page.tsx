import { createClient } from "@/lib/supabase/server"
import { listCampaigns } from "@/lib/marketing/services"
import {
  variantPerformance,
  totals,
  MIN_SAMPLE_FOR_SIGNAL,
} from "@/lib/marketing/eval/performance"
import PerformanceView from "./PerformanceView"

export default async function MarketingPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const campaigns = await listCampaigns(supabase).catch(() => [])
  const campaignId = params.campaign

  const rows = await variantPerformance(supabase, { campaignId }).catch(() => [])

  return (
    <PerformanceView
      campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      activeCampaign={campaignId ?? null}
      initialVariants={rows}
      initialTotals={totals(rows)}
      minSample={MIN_SAMPLE_FOR_SIGNAL}
    />
  )
}
