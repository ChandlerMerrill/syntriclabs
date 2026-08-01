import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  findRepliesForSend,
  recordReplyEvent,
  sendsAwaitingReplies,
} from '@/lib/marketing/eval/match-replies'
import { scoreAndStore } from '@/lib/marketing/eval/score'

export const maxDuration = 300

/**
 * Walks recent sends, finds their replies, scores the new ones.
 *
 * Runs after the Gmail sync on the schedule, since it reads what that job
 * writes. Both matching and event recording are idempotent — the unique
 * (send_id, type, email_id) means a re-run cannot inflate a reply rate — so
 * overlapping with a previous invocation is harmless.
 *
 * Only newly-recorded replies are scored. Re-scoring on every pass would spend
 * a model call per reply per run and quietly overwrite a human's correction.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()
    const sends = await sendsAwaitingReplies(supabase)

    let matched = 0
    let newReplies = 0
    let scored = 0
    const errors: string[] = []

    for (const send of sends) {
      try {
        const replies = await findRepliesForSend(supabase, send)
        if (replies.length === 0) continue
        matched += replies.length

        for (const reply of replies) {
          const isNew = await recordReplyEvent(supabase, reply)
          if (!isNew) continue
          newReplies++

          try {
            const result = await scoreAndStore(supabase, reply, {
              rendered_subject: send.rendered_subject,
              rendered_body: send.rendered_body,
            })
            if (result.scored) scored++
          } catch (err) {
            errors.push(
              `score ${reply.sendId}: ${err instanceof Error ? err.message : 'failed'}`
            )
          }
        }
      } catch (err) {
        errors.push(`match ${send.id}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    return NextResponse.json({
      ok: true,
      sendsChecked: sends.length,
      matched,
      newReplies,
      scored,
      errors,
    })
  } catch (err) {
    console.error('[marketing:reply-sync] failed:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Reply sync failed' },
      { status: 500 }
    )
  }
}
