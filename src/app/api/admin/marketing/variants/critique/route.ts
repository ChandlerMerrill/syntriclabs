import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin-auth'
import {
  CRITICS,
  critiqueVariant,
  overrideCritic,
  type CriticKey,
} from '@/lib/marketing/review/critique'
import { assertVariantSendable } from '@/lib/marketing/review/gate'

/**
 * Runs the critics against a variant, or records an override.
 *
 * Inline like generation, and for the same reason: this is two model calls a
 * person is waiting on, and backgrounding it would leave them staring at a
 * button that appeared to work. The findings are the product here — returning
 * them is the point, not a convenience.
 */
export const maxDuration = 300

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  let body: {
    variantId?: string
    critics?: string[]
    /** Present = this is an override, not a run. */
    override?: { critic?: string; reason?: string }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.variantId) {
    return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
  }

  const isCritic = (c: string): c is CriticKey => (CRITICS as readonly string[]).includes(c)

  try {
    if (body.override) {
      const { critic, reason } = body.override
      if (!critic || !isCritic(critic)) {
        return NextResponse.json(
          { error: `override.critic must be one of: ${CRITICS.join(', ')}` },
          { status: 400 }
        )
      }
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'override.reason is required' }, { status: 400 })
      }

      await overrideCritic(supabase, body.variantId, critic, reason)
      const sendable = await assertVariantSendable(supabase, body.variantId)

      return NextResponse.json({
        variantId: body.variantId,
        overridden: critic,
        sendable: sendable.ok,
        blockedBy: sendable.ok ? null : sendable.reason,
      })
    }

    const requested = body.critics?.filter(isCritic)
    if (body.critics?.length && !requested?.length) {
      return NextResponse.json(
        { error: `critics must be from: ${CRITICS.join(', ')}` },
        { status: 400 }
      )
    }

    const results = await critiqueVariant(supabase, body.variantId, {
      critics: requested?.length ? requested : undefined,
    })
    const sendable = await assertVariantSendable(supabase, body.variantId)

    return NextResponse.json(
      {
        variantId: body.variantId,
        sendable: sendable.ok,
        blockedBy: sendable.ok ? null : sendable.reason,
        critiques: results.map((r) => ({
          critic: r.critic,
          verdict: r.verdict,
          summary: r.summary,
          findings: r.findings,
          // Surfaced rather than swallowed: a critic that tried to block on a
          // quote it could not produce is worth seeing, because it is usually a
          // sign the objection was about something the copy does not say.
          demoted: r.demoted.length,
        })),
      },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to critique variant' },
      { status: 500 }
    )
  }
}
