import { createClient } from "@/lib/supabase/server"
import { loadBrandProfile } from "@/lib/marketing/config/brand-profile"
import { listSegments } from "@/lib/marketing/services"
import MarketingOverview from "./MarketingOverview"

async function countRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filter?: { column: string; value: string }
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true })
  if (filter) query = query.eq(filter.column, filter.value)
  const { count } = await query
  return count ?? 0
}

export default async function MarketingPage() {
  const supabase = await createClient()

  // A missing profile is the expected first-run state, not an error — the
  // overview renders a seed prompt instead.
  const profile = await loadBrandProfile(supabase, {}).catch(() => null)
  const segments = profile ? await listSegments(supabase, profile.id).catch(() => []) : []

  const [painPoints, campaigns, variants, prospects, pendingApproval, sent] = await Promise.all([
    countRows(supabase, "marketing_pain_points"),
    countRows(supabase, "marketing_campaigns"),
    countRows(supabase, "marketing_variants"),
    countRows(supabase, "marketing_prospects"),
    countRows(supabase, "marketing_sends", { column: "status", value: "pending_approval" }),
    countRows(supabase, "marketing_sends", { column: "status", value: "sent" }),
  ])

  return (
    <MarketingOverview
      initialProfile={
        profile
          ? {
              id: profile.id,
              name: profile.name,
              slug: profile.slug,
              bannedWordCount: profile.bannedWords.length,
              proofAssetCount: profile.proofAssets.length,
              maxWords: profile.hardRules.maxWords,
              fearCount: profile.icp.fears.length,
            }
          : null
      }
      segments={segments.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      counts={{ painPoints, campaigns, variants, prospects, pendingApproval, sent }}
    />
  )
}
