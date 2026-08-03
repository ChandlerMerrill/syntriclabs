import { generateObject } from 'ai'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { marketingModel, marketingModelId, MARKETING_MAX_OUTPUT_TOKENS } from '../model'
import type { ReplyMatch } from './match-replies'
import { suppressProspect } from './suppress'

/**
 * Scoring a reply.
 *
 * The model classifies what the reply *is*. It does not decide whether the
 * variant was good — at this volume that inference belongs to a person looking
 * at the reply text, which is why the rationale is stored and shown.
 *
 * The scale is deliberately coarse (numeric(4,3), five anchors). A finer one
 * would be false precision on a handful of replies, and would invite treating
 * the average as a ranking.
 */

const scoreSchema = z.object({
  sentiment: z
    .enum(['positive', 'neutral', 'negative', 'unsubscribe', 'out_of_office'])
    .describe('What the reply expresses. out_of_office and unsubscribe are not opinions about us.'),
  outcome: z
    .enum(['replied', 'meeting_booked', 'not_interested', 'wrong_person'])
    .describe('What actually happened. meeting_booked only when a call or meeting is agreed to.'),
  score: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      'Value of this reply: 1 wants to talk, 0.5 interested but not now, 0 neutral or automated, -0.5 not interested, -1 annoyed or asked to stop.'
    ),
  rationale: z
    .string()
    .describe('One sentence, quoting the part of the reply that decided it.'),
})

export type ReplyScore = z.infer<typeof scoreSchema>

export function buildScoringPrompt(params: {
  sentSubject: string
  sentBody: string
  replyFrom: string
  replyBody: string
}): string {
  return [
    '## What we sent',
    `Subject: ${params.sentSubject}`,
    '',
    params.sentBody,
    '',
    '## The reply',
    `From: ${params.replyFrom}`,
    '',
    params.replyBody,
    '',
    '## Task',
    'Classify the reply.',
    '',
    'Rules:',
    '- An auto-responder is `out_of_office` with score 0. It is not a signal about the copy.',
    '- "Take me off your list" is `unsubscribe` and scores -1, regardless of how politely it is worded.',
    '- `meeting_booked` requires an actual agreement to talk — not "sounds interesting".',
    '- A reply forwarding us to someone else is `wrong_person`, and that is neutral-to-useful, not a failure.',
    '- Judge the reply, not the email that prompted it. A short "no thanks" to good copy is still a no.',
  ].join('\n')
}

export async function scoreReply(params: {
  sentSubject: string
  sentBody: string
  replyFrom: string
  replyBody: string
}): Promise<ReplyScore> {
  const { object } = await generateObject({
    model: marketingModel('score'),
    schema: scoreSchema,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    system:
      'You classify replies to cold outreach for a B2B loop. You are literal about what the reply ' +
      'says and do not read enthusiasm into politeness.',
    prompt: buildScoringPrompt(params),
  })
  return object
}

/**
 * Scores a matched reply and stores the outcome.
 *
 * `marketing_outcomes.send_id` is unique, and a human score is never
 * overwritten by a model one — the whole point of `scored_by` is that a person
 * correcting the model is the signal worth keeping.
 *
 * An `unsubscribe` classification is the one sentiment that does something
 * besides being recorded. It used to score -1 and stop there, which meant the
 * loop understood the reply perfectly and then contacted the person again as
 * soon as the cooldown lapsed. The suppression is written here, next to the
 * classification that justifies it, rather than left to a caller to remember.
 */
export async function scoreAndStore(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  match: ReplyMatch,
  send: {
    id: string
    prospect_id: string
    rendered_subject: string | null
    rendered_body: string | null
  }
): Promise<{
  scored: boolean
  reason?: string
  score?: ReplyScore
  /** True when this reply is what suppressed the prospect. */
  suppressed?: boolean
}> {
  const { data: existing } = await supabase
    .from('marketing_outcomes')
    .select('id, scored_by')
    .eq('send_id', match.sendId)
    .maybeSingle()

  if (existing?.scored_by === 'human') {
    return { scored: false, reason: 'Already scored by a human' }
  }

  const score = await scoreReply({
    sentSubject: send.rendered_subject ?? '',
    sentBody: send.rendered_body ?? '',
    replyFrom: match.fromAddress,
    replyBody: match.bodyText,
  })

  const row = {
    send_id: match.sendId,
    reply_sentiment: score.sentiment,
    outcome: score.outcome,
    score: score.score,
    scored_by: 'llm' as const,
    rationale: score.rationale,
    scored_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await supabase.from('marketing_outcomes').update(row).eq('id', existing.id)
    : await supabase.from('marketing_outcomes').insert(row)

  if (error) throw new Error(`Failed to store outcome: ${error.message}`)

  // The outcome is stored first on purpose. If suppression fails, the reply is
  // still on record and visible; if the order were reversed, a failure here
  // would leave someone suppressed with no trace of why.
  const suppressed =
    score.sentiment === 'unsubscribe'
      ? await suppressProspect(
          supabase,
          send.prospect_id,
          `Unsubscribe reply (send ${send.id})`
        )
      : false

  return { scored: true, score, suppressed }
}

export function scoringModelId(): string {
  return marketingModelId('score')
}
