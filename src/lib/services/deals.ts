import type { SupabaseClient } from '@supabase/supabase-js'
import type { Deal, DealInput, DealWithClient, StageHistoryEntry } from '@/lib/types'
import { embedInBackground, serializeDeal } from '@/lib/ai/embeddings'

export async function getDeals(
  supabase: SupabaseClient,
  filters?: { client_id?: string; stage?: string; search?: string }
) {
  let query = supabase
    .from('deals')
    .select('*, clients(id, company_name, industry)')
    .order('updated_at', { ascending: false })

  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.stage) query = query.eq('stage', filters.stage)
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

  return query as unknown as { data: DealWithClient[] | null; error: unknown }
}

export async function getDeal(supabase: SupabaseClient, id: string) {
  return supabase
    .from('deals')
    .select('*, clients(id, company_name, industry)')
    .eq('id', id)
    .single() as unknown as { data: DealWithClient | null; error: unknown }
}

export async function createDeal(supabase: SupabaseClient, input: DealInput) {
  const deal = {
    ...input,
    stage_history: [{ from: '', to: input.stage, timestamp: new Date().toISOString() }],
  }
  const result = await supabase
    .from('deals')
    .insert(deal)
    .select()
    .single() as unknown as { data: Deal | null; error: unknown }
  if (result.data) {
    embedInBackground('deal', result.data.id, serializeDeal(result.data, 'Unknown'))
  }
  return result
}

export async function updateDeal(supabase: SupabaseClient, id: string, input: Partial<DealInput>) {
  const result = await supabase
    .from('deals')
    .update(input)
    .eq('id', id)
    .select()
    .single() as unknown as { data: Deal | null; error: unknown }
  if (result.data) {
    embedInBackground('deal', result.data.id, serializeDeal(result.data, 'Unknown'))
  }
  return result
}

export async function updateDealStage(
  supabase: SupabaseClient,
  id: string,
  newStage: string,
  currentHistory: StageHistoryEntry[],
  currentStage: string
) {
  const historyEntry: StageHistoryEntry = {
    from: currentStage,
    to: newStage,
    timestamp: new Date().toISOString(),
  }

  return supabase
    .from('deals')
    .update({
      stage: newStage,
      stage_history: [...currentHistory, historyEntry],
      ...(newStage === 'won' || newStage === 'lost'
        ? { actual_close_date: new Date().toISOString().split('T')[0] }
        : {}),
    })
    .eq('id', id)
    .select()
    .single() as unknown as { data: Deal | null; error: unknown }
}

export async function deleteDeal(supabase: SupabaseClient, id: string) {
  return supabase.from('deals').delete().eq('id', id)
}
