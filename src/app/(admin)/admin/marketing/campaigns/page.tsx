import { createClient } from "@/lib/supabase/server"
import { loadBrandProfile } from "@/lib/marketing/config/brand-profile"
import { listCampaigns, listSegments } from "@/lib/marketing/services"
import CampaignsView from "./CampaignsView"

export default async function MarketingCampaignsPage() {
  const supabase = await createClient()

  const profile = await loadBrandProfile(supabase, {}).catch(() => null)
  const [campaigns, segments] = await Promise.all([
    listCampaigns(supabase).catch(() => []),
    profile ? listSegments(supabase, profile.id).catch(() => []) : Promise.resolve([]),
  ])

  return (
    <CampaignsView
      initialCampaigns={campaigns}
      segments={segments.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      hasProfile={Boolean(profile)}
    />
  )
}
