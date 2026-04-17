import type { SupabaseClient } from '@supabase/supabase-js'
import type { Activity, ActivityInput, ActivityWithContext } from '@/lib/types'
import { embedInBackground, serializeActivity } from '@/lib/ai/embeddings'

export async function getActivities(
  supabase: SupabaseClient,
  filters?: {
    client_id?: string
    deal_id?: string
    project_id?: string
    type?: string
    limit?: number
  }
) {
  let query = supabase
    .from('activities')
    .select('*, clients(id, company_name)')
    .order('created_at', { ascending: false })

  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.deal_id) query = query.eq('deal_id', filters.deal_id)
  if (filters?.project_id) query = query.eq('project_id', filters.project_id)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.limit) query = query.limit(filters.limit)

  return query as unknown as { data: ActivityWithContext[] | null; error: unknown }
}

export async function createActivity(
  supabase: SupabaseClient,
  input: ActivityInput,
  opts: { skipEmbedding?: boolean } = {},
) {
  const result = await supabase
    .from('activities')
    .insert(input)
    .select()
    .single() as unknown as { data: Activity | null; error: unknown }
  if (result.data && !opts.skipEmbedding) {
    embedInBackground('activity', result.data.id, serializeActivity(result.data, 'Unknown'))
  }
  return result
}

export async function logAutoActivity(
  supabase: SupabaseClient,
  params: {
    client_id: string
    title: string
    description?: string
    type?: string
    deal_id?: string
    project_id?: string
    metadata?: Record<string, unknown>
  }
) {
  return createActivity(
    supabase,
    {
      client_id: params.client_id,
      deal_id: params.deal_id ?? null,
      project_id: params.project_id ?? null,
      type: (params.type as ActivityInput['type']) ?? 'status_change',
      title: params.title,
      description: params.description ?? '',
      metadata: params.metadata ?? {},
      is_auto_generated: true,
    },
    { skipEmbedding: true },
  )
}
