import type { SupabaseClient } from '@supabase/supabase-js'
import type { Document, DocumentInput, DocumentWithClient } from '@/lib/types'

export async function getDocuments(
  supabase: SupabaseClient,
  filters?: { client_id?: string; type?: string; status?: string; deal_id?: string }
) {
  let query = supabase
    .from('documents')
    .select('*, clients(id, company_name)')
    .order('created_at', { ascending: false })

  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.deal_id) query = query.eq('deal_id', filters.deal_id)

  return query as unknown as { data: DocumentWithClient[] | null; error: unknown }
}

export async function getDocument(supabase: SupabaseClient, id: string) {
  return supabase
    .from('documents')
    .select('*, clients(id, company_name)')
    .eq('id', id)
    .single() as unknown as { data: DocumentWithClient | null; error: unknown }
}

export async function createDocument(supabase: SupabaseClient, input: DocumentInput) {
  return supabase
    .from('documents')
    .insert(input)
    .select()
    .single() as unknown as { data: Document | null; error: unknown }
}

export async function updateDocument(supabase: SupabaseClient, id: string, input: Partial<DocumentInput>) {
  return supabase
    .from('documents')
    .update(input)
    .eq('id', id)
    .select()
    .single() as unknown as { data: Document | null; error: unknown }
}

export async function deleteDocument(supabase: SupabaseClient, id: string) {
  return supabase.from('documents').delete().eq('id', id)
}
