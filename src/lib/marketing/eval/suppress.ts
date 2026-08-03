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
