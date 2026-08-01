import { notFound } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import {
  getCampaign,
  getSegment,
  listPainPoints,
  listProspects,
  listSends,
  listVariantChecks,
  listVariants,
} from "@/lib/marketing/services"
import {
  variantPerformance,
  totals,
  MIN_SAMPLE_FOR_SIGNAL,
} from "@/lib/marketing/eval/performance"
import CampaignWorkspace from "./CampaignWorkspace"
import { resolveTab } from "./tabs"

/**
 * Counts for the tab badges. `head: true` returns no rows — the badge only
 * needs to know how much is behind a tab, not what.
 */
async function headCount(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value)
  return count ?? 0
}

export default async function CampaignWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { campaignId } = await params
  const { tab: tabParam } = await searchParams
  const supabase = await createClient()

  const campaign = await getCampaign(supabase, campaignId).catch(() => null)
  if (!campaign) notFound()

  const tab = resolveTab(tabParam)

  const segmentId = campaign.segment_id

  const [segment, variantCount, sendCount, audienceCount, segmentCampaignCount] = await Promise.all([
    segmentId ? getSegment(supabase, segmentId).catch(() => null) : Promise.resolve(null),
    headCount(supabase, "marketing_variants", "campaign_id", campaign.id),
    headCount(supabase, "marketing_sends", "campaign_id", campaign.id),
    segmentId
      ? headCount(supabase, "marketing_prospects", "segment_id", segmentId)
      : Promise.resolve(0),
    segmentId
      ? headCount(supabase, "marketing_campaigns", "segment_id", segmentId)
      : Promise.resolve(1),
  ])

  // Only the tab on screen pays for its data.
  const variantsData =
    tab === "variants"
      ? await (async () => {
          const variants = await listVariants(supabase, { campaignId: campaign.id }).catch(() => [])
          const [checks, painPoints] = await Promise.all([
            listVariantChecks(
              supabase,
              variants.map((v) => v.id)
            ).catch(() => []),
            segmentId
              ? listPainPoints(supabase, { segmentId, limit: 25 }).catch(() => [])
              : listPainPoints(supabase, { limit: 25 }).catch(() => []),
          ])
          return {
            variants,
            checks,
            painPoints: painPoints.map((p) => ({
              id: p.id,
              statement: p.statement,
              frequency: p.frequency,
              rank: p.rank,
            })),
          }
        })()
      : null

  const outboxData =
    tab === "outbox"
      ? await (async () => {
          const [sends, ready] = await Promise.all([
            listSends(supabase, { campaignId: campaign.id }).catch(() => []),
            listVariants(supabase, {
              campaignId: campaign.id,
              status: "ready",
              limit: 50,
            }).catch(() => []),
          ])
          return {
            sends,
            readyVariants: ready.map((v) => ({
              id: v.id,
              label: v.label,
              subject: v.subject,
              campaignId: v.campaign_id,
            })),
          }
        })()
      : null

  const performanceData =
    tab === "performance"
      ? await (async () => {
          const rows = await variantPerformance(supabase, { campaignId: campaign.id }).catch(
            () => []
          )
          return { variants: rows, totals: totals(rows), minSample: MIN_SAMPLE_FOR_SIGNAL }
        })()
      : null

  const audienceData =
    tab === "audience" && segmentId
      ? await (async () => {
          const [painPoints, prospects] = await Promise.all([
            listPainPoints(supabase, { segmentId, limit: 50 }).catch(() => []),
            listProspects(supabase, { segmentId }).catch(() => []),
          ])
          return { painPoints, prospects }
        })()
      : null

  return (
    <CampaignWorkspace
      campaign={campaign}
      segment={segment}
      tab={tab}
      counts={{ variants: variantCount, sends: sendCount, audience: audienceCount }}
      // The audience belongs to the segment, not to this campaign. Everything
      // else drawing on it is affected by what happens on the Audience tab.
      otherCampaignsOnSegment={Math.max(0, segmentCampaignCount - 1)}
      variantsData={variantsData}
      outboxData={outboxData}
      performanceData={performanceData}
      audienceData={audienceData}
    />
  )
}
