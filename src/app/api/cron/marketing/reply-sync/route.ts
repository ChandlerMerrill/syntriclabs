import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  findRepliesForSend,
  recordInboundEvent,
  sendsAwaitingReplies,
} from '@/lib/marketing/eval/match-replies'
import { scoreAndStore } from '@/lib/marketing/eval/score'
import { suppressProspect, looksLikeUnsubscribeRequest } from '@/lib/marketing/eval/suppress'
import { autopilotBlock } from '@/lib/marketing/autopilot'

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
 *
 * Two of the things found here stop the loop rather than just being counted: a
 * hard bounce and a reply asking to be taken off the list both suppress the
 * prospect. Recognising either and then contacting the person again in thirty
 * days is worse than not recognising it at all.
 *
 * Autopilot gates the scorer alone, not the job. Matching a reply to its send,
 * recording the event, and suppressing on a bounce or a plain "take me off your
 * list" are all free and all protective — switching off the model call must not
 * switch off the thing that stops mail going to someone who asked to be left
 * alone.
 *
 * A reply recorded while scoring was off is picked up on a later run: the loop
 * revisits already-recorded replies that carry no outcome, within the same
 * 30-day window `sendsAwaitingReplies` already walks. Beyond that window they
 * stay unscored, which is a real limit and the reason `unscored` is reported.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scoringBlocked = autopilotBlock('score')

  try {
    const supabase = await createServiceClient()
    const sends = await sendsAwaitingReplies(supabase)

    let matched = 0
    let newReplies = 0
    let bounces = 0
    let scored = 0
    let unscored = 0
    let suppressed = 0
    const errors: string[] = []

    // Which of these sends already carry an outcome. Read once rather than per
    // reply, and only used to decide whether an already-recorded reply is owed
    // a score. `scoreAndStore` still refuses to overwrite a human's correction
    // on its own, so a stale read here cannot cost one.
    const { data: outcomeRows } = await supabase
      .from('marketing_outcomes')
      .select('send_id')
      .in(
        'send_id',
        sends.map((s) => s.id)
      )
    const alreadyScored = new Set((outcomeRows ?? []).map((r) => r.send_id as string))

    for (const send of sends) {
      try {
        const replies = await findRepliesForSend(supabase, send)
        if (replies.length === 0) continue
        matched += replies.length

        for (const reply of replies) {
          const isNew = await recordInboundEvent(supabase, reply)

          // A bounce is not an answer. It never reaches the scorer — spending a
          // model call to classify a mailer-daemon message is waste, and storing
          // its verdict as an outcome would put a machine's rejection in the
          // column meant for a person's.
          if (reply.kind === 'bounce') {
            if (!isNew) continue
            bounces++
            if (reply.bounce === 'hard') {
              const did = await suppressProspect(supabase, send.prospect_id, 'Hard bounce')
              if (did) suppressed++
            }
            continue
          }

          // A reply already on file is revisited only when it never got an
          // outcome — which is what happens when scoring was switched off, or
          // the model call failed. Without this, "record now, score later" was a
          // one-way door: `recordInboundEvent` returns false forever after, so a
          // reply that arrived while autopilot excluded `score` could never be
          // scored, and turning scoring back on would silently skip the backlog.
          // Re-scoring one that already has an outcome is what this still
          // refuses — that would cost a call per reply per run.
          if (!isNew && alreadyScored.has(reply.sendId)) continue

          if (isNew) newReplies++

          // Runs before the scorer and regardless of it. An unambiguous "take
          // me off your list" is honoured even when scoring is off, the model
          // call fails, or the model reads it as merely negative.
          if (looksLikeUnsubscribeRequest(reply.bodyText)) {
            const did = await suppressProspect(
              supabase,
              send.prospect_id,
              `Unsubscribe request in reply (send ${send.id})`
            )
            if (did) suppressed++
          }

          if (scoringBlocked) {
            unscored++
            continue
          }

          try {
            const result = await scoreAndStore(supabase, reply, {
              id: send.id,
              prospect_id: send.prospect_id,
              rendered_subject: send.rendered_subject,
              rendered_body: send.rendered_body,
            })
            if (result.scored) scored++
            if (result.suppressed) suppressed++
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
      bounces,
      scored,
      unscored,
      ...(scoringBlocked ? { scoringSkipped: scoringBlocked } : {}),
      suppressed,
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
