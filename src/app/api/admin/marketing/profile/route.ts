import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import {
  listBrandProfiles,
  upsertBrandProfile,
  brandProfileSeedSchema,
} from '@/lib/marketing/config/brand-profile'
import { SYNTRIC_BRAND_PROFILE, SYNTRIC_SEGMENTS } from '@/lib/marketing/config/syntric-profile'
import { upsertSegment } from '@/lib/marketing/services'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const profiles = await listBrandProfiles(auth.supabase)
    return NextResponse.json({ profiles })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load brand profiles' },
      { status: 500 }
    )
  }
}

/**
 * POST with `{ action: 'seed' }` writes the Syntric profile and its segments.
 * POST with a profile body upserts that profile.
 *
 * Seeding is idempotent — it upserts on slug — so re-running it after editing
 * `syntric-profile.ts` is the intended way to push a voice change through.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = (body as { action?: string })?.action

  try {
    if (action === 'seed') {
      const profile = await upsertBrandProfile(supabase, {
        ...SYNTRIC_BRAND_PROFILE,
        isDefault: true,
      })

      const segments = []
      for (const segment of SYNTRIC_SEGMENTS) {
        segments.push(
          await upsertSegment(supabase, {
            brand_profile_id: profile.id,
            slug: segment.slug,
            name: segment.name,
            description: segment.description,
            qualifiers: segment.qualifiers,
            disqualifiers: segment.disqualifiers,
          })
        )
      }

      return NextResponse.json({ profile, segments })
    }

    // Otherwise treat the body as a profile to write. Parsed through the same
    // schema the loader uses, so a hand-edited profile can't be saved in a
    // shape the generator will later choke on.
    const parsed = brandProfileSeedSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid brand profile', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const profile = await upsertBrandProfile(supabase, parsed.data)
    return NextResponse.json({ profile })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save brand profile' },
      { status: 500 }
    )
  }
}
