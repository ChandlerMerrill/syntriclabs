import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { listVariantChecks, listVariants } from '@/lib/marketing/services'

/**
 * Variants always come back with their checks.
 *
 * The reason a variant is unusable is the useful part — "checks_failed" alone
 * sends someone to the database to find out which rule fired. The UI shows the
 * failing rules by name, so the API has to carry them.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaignId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  try {
    const variants = await listVariants(supabase, { campaignId, status })
    const checks = await listVariantChecks(
      supabase,
      variants.map((v) => v.id)
    )
    return NextResponse.json({ variants, checks })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load variants' },
      { status: 500 }
    )
  }
}
