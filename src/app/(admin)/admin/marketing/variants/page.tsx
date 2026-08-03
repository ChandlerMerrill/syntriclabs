import { createClient } from "@/lib/supabase/server"
import { loadBrandProfile } from "@/lib/marketing/config/brand-profile"
import {
  listCampaigns,
  listPainPoints,
  listVariantChecks,
  listVariants,
} from "@/lib/marketing/services"
import VariantsView from "./VariantsView"

export default async function MarketingVariantsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const profile = await loadBrandProfile(supabase, {}).catch(() => null)
  const campaigns = await listCampaigns(supabase).catch(() => [])
  const activeCampaign =
    params.campaign ?? campaigns.find((c) => c.status !== "archived")?.id ?? campaigns[0]?.id

  const campaign = campaigns.find((c) => c.id === activeCampaign) ?? null

  // A campaign with no segment offers nothing rather than everything. The old
  // fallback listed pain points across all segments, which — now that picking one
  // is mandatory — would make the required choice a cross-segment one: copy for
  // plumbers opening on a complaint researched from veterinary clinics. The
  // generator already tells you to run research when the list is empty.
  const [variants, painPoints] = await Promise.all([
    activeCampaign
      ? listVariants(supabase, { campaignId: activeCampaign }).catch(() => [])
      : Promise.resolve([]),
    campaign?.segment_id
      ? listPainPoints(supabase, { segmentId: campaign.segment_id, limit: 25 }).catch(() => [])
      : Promise.resolve([]),
  ])

  const checks = await listVariantChecks(
    supabase,
    variants.map((v) => v.id)
  ).catch(() => [])

  return (
    <VariantsView
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        segmentId: c.segment_id,
      }))}
      activeCampaign={activeCampaign ?? null}
      initialVariants={variants}
      initialChecks={checks}
      painPoints={painPoints.map((p) => ({
        id: p.id,
        statement: p.statement,
        frequency: p.frequency,
        rank: p.rank,
      }))}
      hasProfile={Boolean(profile)}
    />
  )
}
