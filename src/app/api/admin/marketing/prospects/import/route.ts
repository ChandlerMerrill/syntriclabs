import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { importProspects } from '@/lib/marketing/prospects/import'

/**
 * Bulk prospect import from a pasted spreadsheet.
 *
 * Separate from the single-prospect POST next door because the two mean
 * different things about existing rows: that one is an edit and updates, this
 * one is an addition and skips. Folding them together is how an import ends up
 * silently rewriting a prospect somebody had already curated.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: { text?: string; segmentId?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const result = await importProspects(supabase, body.text, { segmentId: body.segmentId ?? null })
    return NextResponse.json({
      imported: result.imported.length,
      companies: result.imported.map((p) => p.company),
      skipped: result.skipped,
      errors: result.errors,
      mapping: result.mapping,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    )
  }
}
