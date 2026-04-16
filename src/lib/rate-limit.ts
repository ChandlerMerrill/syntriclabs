import type { SupabaseClient } from '@supabase/supabase-js'

export async function checkWidgetRateLimit(
  supabase: SupabaseClient,
  ip: string,
  max = 20,
  windowMins = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date()
  // Bucket by 10-minute windows
  const bucketMs = 10 * 60 * 1000
  const windowStart = new Date(Math.floor(now.getTime() / bucketMs) * bucketMs)
  const windowCutoff = new Date(now.getTime() - windowMins * 60 * 1000)

  // Count messages in the rate limit window
  const { data: rows } = await supabase
    .from('widget_rate_limits')
    .select('message_count, window_start')
    .eq('ip_address', ip)
    .gte('window_start', windowCutoff.toISOString())

  const totalCount = (rows ?? []).reduce((sum, r) => sum + r.message_count, 0)

  if (totalCount >= max) {
    return { allowed: false, remaining: 0 }
  }

  // Find current bucket count
  const currentBucket = rows?.find(
    (r) => new Date(r.window_start).getTime() === windowStart.getTime()
  )

  // Upsert current bucket
  await supabase.from('widget_rate_limits').upsert(
    {
      ip_address: ip,
      window_start: windowStart.toISOString(),
      message_count: (currentBucket?.message_count ?? 0) + 1,
    },
    { onConflict: 'ip_address,window_start' }
  )

  return { allowed: true, remaining: max - totalCount - 1 }
}
