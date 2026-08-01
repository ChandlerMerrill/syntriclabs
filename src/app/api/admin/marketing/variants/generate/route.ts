import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { generateVariants } from '@/lib/marketing/generate/variants'

/**
 * Generation runs inline, unlike the research route.
 *
 * Research is a multi-minute crawl whose progress is recorded on a run row, so
 * `after()` costs nothing — a failure lands in `processing_error` and the UI
 * shows it. Generation has no such row: it is one model call, and if it were
 * backgrounded a failure would leave the operator staring at a button that
 * appeared to work and produced nothing. Returning the variants and their
 * per-rule check results directly is what makes the failure legible.
 */
export const maxDuration = 300

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: {
    campaignId?: string
    painPointId?: string | null
    parentVariantId?: string | null
    variantCount?: number
    guidance?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  try {
    const result = await generateVariants(supabase, {
      campaignId: body.campaignId,
      painPointId: body.painPointId ?? null,
      parentVariantId: body.parentVariantId ?? null,
      variantCount: body.variantCount,
      guidance: body.guidance ?? null,
    })

    return NextResponse.json(
      {
        campaignId: result.campaignId,
        generated: result.generated,
        passed: result.passed,
        variants: result.variants.map((v) => ({
          id: v.variant.id,
          label: v.variant.label,
          subject: v.variant.subject,
          status: v.gate.status,
          failedRules: v.gate.results
            .filter((r) => !r.passed)
            .map((r) => ({ rule: r.rule, detail: r.detail })),
        })),
      },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate variants' },
      { status: 500 }
    )
  }
}
