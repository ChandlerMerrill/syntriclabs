import type { createServiceClient } from '@/lib/supabase/server'

/**
 * Writing suppression from an automated signal.
 *
 * Two callers, one shape: an `unsubscribe` reply and a hard bounce. Both are the
 * mailbox telling us to stop, and both need to survive whatever else touches the
 * prospect afterwards — which is what `prospectSendGate` reads and refuses on.
 *
 * `.is('suppressed_at', null)` is the important part. A prospect Chandler
 * suppressed by hand with a specific reason must not have that reason replaced
 * by a generic one, and a second bounce on the same address must not move the
 * timestamp forward. First writer wins; everyone after is a no-op.
 */
export async function suppressProspect(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  prospectId: string,
  reason: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('marketing_prospects')
    .update({
      suppressed_at: new Date().toISOString(),
      suppression_reason: reason,
    })
    .eq('id', prospectId)
    .is('suppressed_at', null)
    .select('id')

  if (error) throw new Error(`Failed to suppress prospect: ${error.message}`)
  return (data ?? []).length > 0
}

/**
 * Does this reply plainly ask to be left alone?
 *
 * A deterministic floor beneath the model scorer, not a replacement for it. The
 * scorer reads intent and catches the polite, indirect refusals this cannot;
 * this catches the unambiguous ones without a model call, and it runs whether or
 * not scoring does.
 *
 * It exists because honouring an unsubscribe was reachable only through
 * `scoreAndStore` — so a failed model call, a misclassification, or scoring
 * switched off for cost all had the same consequence: the request understood by
 * nobody and the person mailed again once the cooldown lapsed. Recognising the
 * request is an obligation; spending a model call to recognise it is a choice.
 *
 * Deliberately narrow. False positives cost one prospect who could have been
 * kept and can be un-suppressed by hand; false negatives mail someone who asked
 * twice. Phrases are matched against the reply's own text only — quoted original
 * message included, which is the one real source of noise here, and the reason
 * every phrase below is an imperative a sender would not have written to
 * themselves.
 */
const UNSUBSCRIBE_PHRASES = [
  'unsubscribe',
  'take me off',
  'remove me from',
  'take my name off',
  'stop emailing me',
  'stop contacting me',
  'do not contact me',
  "don't contact me",
  'do not email me',
  "don't email me",
  'no longer wish to receive',
  'opt me out',
  'leave me alone',
]

export function looksLikeUnsubscribeRequest(replyText: string): boolean {
  if (!replyText) return false
  const text = replyText.toLowerCase()
  return UNSUBSCRIBE_PHRASES.some((phrase) => text.includes(phrase))
}
