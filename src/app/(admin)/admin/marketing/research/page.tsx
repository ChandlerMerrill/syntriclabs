import { createClient } from "@/lib/supabase/server"
import { loadBrandProfile } from "@/lib/marketing/config/brand-profile"
import {
  listPainPoints,
  listResearchRuns,
  listSegments,
  listVariantsForPainPoints,
} from "@/lib/marketing/services"
import ResearchView from "./ResearchView"

export default async function MarketingResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const profile = await loadBrandProfile(supabase, {}).catch(() => null)
  const segments = profile ? await listSegments(supabase, profile.id).catch(() => []) : []
  const activeSegment = params.segment ?? segments[0]?.id

  const [runs, painPoints] = await Promise.all([
    listResearchRuns(supabase, { segmentId: activeSegment }).catch(() => []),
    listPainPoints(supabase, { segmentId: activeSegment, limit: 50 }).catch(() => []),
  ])

  const usage = await listVariantsForPainPoints(
    supabase,
    painPoints.map((p) => p.id)
  ).catch(() => ({}))

  return (
    <ResearchView
      segments={segments.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      activeSegment={activeSegment ?? null}
      initialRuns={runs}
      initialPainPoints={painPoints}
      initialUsage={usage}
      hasProfile={Boolean(profile)}
    />
  )
}
