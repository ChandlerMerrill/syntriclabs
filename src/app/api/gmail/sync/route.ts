import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncEmails } from '@/lib/services/gmail-sync'

export const maxDuration = 60

/**
 * The scheduled entry point.
 *
 * Vercel cron only ever issues GET, and this route was POST-only — which is
 * why nothing pulled inbound mail automatically. Reply tracing depends on the
 * `emails` table actually being populated, so the schedule is the load-bearing
 * part, not a convenience.
 *
 * Cron secret only: the POST below keeps the interactive path, where a signed-in
 * user can force a full sync.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[gmail:sync] scheduled sync failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Allow auth user OR cron secret
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = await syncEmails({ fullSync: body.fullSync })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
