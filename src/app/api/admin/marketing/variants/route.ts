import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import {
  listVariantChecks,
  listVariantCritiques,
  listVariants,
} from '@/lib/marketing/services'

/**
 * Variants always come back with their checks and critiques.
 *
 * The reason a variant is unusable is the useful part — "checks_failed" alone
 * sends someone to the database to find out which rule fired. The UI shows the
 * failing rules by name, so the API has to carry them.
 *
 * Critiques ride along for the same reason one step further out: a critic's
 * pass/fail is a check row, but the argument behind it is what an approver
 * actually needs to decide whether to override, and it is useless a click away.
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
    const ids = variants.map((v) => v.id)
    const [checks, critiques] = await Promise.all([
      listVariantChecks(supabase, ids),
      listVariantCritiques(supabase, ids),
    ])
    return NextResponse.json({ variants, checks, critiques })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load variants' },
      { status: 500 }
    )
  }
}
