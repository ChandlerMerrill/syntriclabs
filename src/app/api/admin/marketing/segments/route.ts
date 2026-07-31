import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import { listSegments } from '@/lib/marketing/services'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const brandProfileId = url.searchParams.get('brandProfileId') ?? undefined

  try {
    const segments = await listSegments(auth.supabase, brandProfileId)
    return NextResponse.json({ segments })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list segments' },
      { status: 500 }
    )
  }
}
