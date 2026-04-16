import type { SupabaseClient } from '@supabase/supabase-js'
import type { TranscriptWithClient } from '@/lib/types'

export async function getTranscripts(
  supabase: SupabaseClient,
  filters?: {
    client_id?: string
    processing_status?: string
    search?: string
    limit?: number
    offset?: number
  }
) {
  let query = supabase
    .from('transcripts')
    .select('*, clients(id, company_name)')
    .order('date', { ascending: false })

  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.processing_status) query = query.eq('processing_status', filters.processing_status)
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`)
  if (filters?.limit) query = query.limit(filters.limit)
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)

  return query as unknown as { data: TranscriptWithClient[] | null; error: unknown }
}

export async function getTranscript(supabase: SupabaseClient, id: string) {
  return supabase
    .from('transcripts')
    .select('*, clients(id, company_name)')
    .eq('id', id)
    .single() as unknown as { data: TranscriptWithClient | null; error: unknown }
}

export async function assignTranscriptToClient(
  supabase: SupabaseClient,
  transcriptId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from('transcripts')
    .update({ client_id: clientId })
    .eq('id', transcriptId)
    .select('title')
    .single()

  if (!error && data) {
    await supabase.from('activities').insert({
      client_id: clientId,
      type: 'meeting',
      title: `Transcript linked: ${data.title}`,
      description: 'Meeting transcript manually linked to client',
      metadata: { transcript_id: transcriptId },
      is_auto_generated: true,
    })
  }

  return { data, error }
}

export async function getTranscriptStats(supabase: SupabaseClient) {
  const [totalRes, pendingRes, unmatchedRes] = await Promise.all([
    supabase.from('transcripts').select('id', { count: 'exact', head: true }),
    supabase.from('transcripts').select('id', { count: 'exact', head: true }).eq('processing_status', 'pending'),
    supabase.from('transcripts').select('id', { count: 'exact', head: true }).is('client_id', null).eq('processing_status', 'completed'),
  ])

  return {
    total: totalRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    unmatched: unmatchedRes.count ?? 0,
  }
}
