import { NextResponse, after } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { listPainPoints, listResearchRuns, listSources } from '@/lib/marketing/services'
import { createResearchRun, processResearchRun } from '@/lib/marketing/research/run'

export const maxDuration = 300

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const runId = url.searchParams.get('runId') ?? undefined
  const segmentId = url.searchParams.get('segmentId') ?? undefined

  try {
    if (runId) {
      const [painPoints, sources] = await Promise.all([
        listPainPoints(supabase, { runId }),
        listSources(supabase, { runId }),
      ])
      return NextResponse.json({ painPoints, sources })
    }

    const [runs, painPoints] = await Promise.all([
      listResearchRuns(supabase, { segmentId }),
      listPainPoints(supabase, { segmentId, limit: 50 }),
    ])
    return NextResponse.json({ runs, painPoints })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load research' },
      { status: 500 }
    )
  }
}

/**
 * Starts a research run and acknowledges immediately.
 *
 * The work runs in `after()` rather than a bare fire-and-forget promise: the
 * repo's existing `processTranscript(...).catch()` pattern can be killed the
 * moment the response returns, which on a 3-minute crawl means the run sits in
 * `processing` forever with nothing to show for it.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: { segmentId?: string; brandProfileId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.segmentId) {
    return NextResponse.json({ error: 'segmentId is required' }, { status: 400 })
  }

  try {
    const profile = await loadBrandProfile(supabase, { id: body.brandProfileId })
    if (!profile) {
      return NextResponse.json(
        { error: 'No brand profile. Seed one from /admin/marketing first.' },
        { status: 400 }
      )
    }

    const runId = await createResearchRun({
      brandProfileId: profile.id,
      segmentId: body.segmentId,
      trigger: 'manual',
    })

    after(async () => {
      await processResearchRun(runId)
    })

    return NextResponse.json({ runId, status: 'pending' }, { status: 202 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start research run' },
      { status: 500 }
    )
  }
}
