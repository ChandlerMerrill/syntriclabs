import { createClient } from "@/lib/supabase/server"
import { loadBrandProfile } from "@/lib/marketing/config/brand-profile"
import { listProspects, listSegments } from "@/lib/marketing/services"
import ProspectsView from "./ProspectsView"

export default async function MarketingProspectsPage() {
  const supabase = await createClient()

  const profile = await loadBrandProfile(supabase, {}).catch(() => null)
  const [prospects, segments] = await Promise.all([
    listProspects(supabase).catch(() => []),
    profile ? listSegments(supabase, profile.id).catch(() => []) : Promise.resolve([]),
  ])

  return (
    <ProspectsView
      initialProspects={prospects}
      segments={segments.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
    />
  )
}
