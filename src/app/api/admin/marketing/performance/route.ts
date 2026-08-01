import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { variantPerformance, totals, MIN_SAMPLE_FOR_SIGNAL } from '@/lib/marketing/eval/performance'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaignId') ?? undefined

  try {
    const rows = await variantPerformance(supabase, { campaignId })
    return NextResponse.json({
      variants: rows,
      totals: totals(rows),
      minSampleForSignal: MIN_SAMPLE_FOR_SIGNAL,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load performance' },
      { status: 500 }
    )
  }
}
