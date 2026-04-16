import type { SupabaseClient } from '@supabase/supabase-js'
import type { Client, ClientInput, ClientWithContacts, ClientContactInput } from '@/lib/types'
import { embedInBackground, serializeClient } from '@/lib/ai/embeddings'

export async function getClients(
  supabase: SupabaseClient,
  filters?: { status?: string; search?: string; industry?: string }
) {
  let query = supabase.from('clients').select('*, client_contacts(*)').order('company_name')

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.industry) query = query.eq('industry', filters.industry)
  if (filters?.search) query = query.ilike('company_name', `%${filters.search}%`)

  return query as unknown as { data: ClientWithContacts[] | null; error: unknown }
}

export async function getClient(supabase: SupabaseClient, id: string) {
  return supabase
    .from('clients')
    .select('*, client_contacts(*)')
    .eq('id', id)
    .single() as unknown as { data: ClientWithContacts | null; error: unknown }
}

export async function createClient(supabase: SupabaseClient, input: ClientInput) {
  const result = await supabase
    .from('clients')
    .insert(input)
    .select()
    .single() as unknown as { data: Client | null; error: unknown }
  if (result.data) {
    embedInBackground('client', result.data.id, serializeClient(result.data, []))
  }
  return result
}

export async function updateClient(supabase: SupabaseClient, id: string, input: Partial<ClientInput>) {
  const result = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single() as unknown as { data: Client | null; error: unknown }
  if (result.data) {
    embedInBackground('client', result.data.id, serializeClient(result.data, []))
  }
  return result
}

export async function deleteClient(supabase: SupabaseClient, id: string) {
  return supabase.from('clients').delete().eq('id', id)
}

// ── Contacts ──
export async function addContact(supabase: SupabaseClient, input: ClientContactInput) {
  return supabase.from('client_contacts').insert(input).select().single()
}

export async function updateContact(supabase: SupabaseClient, id: string, input: Partial<ClientContactInput>) {
  return supabase.from('client_contacts').update(input).eq('id', id).select().single()
}

export async function deleteContact(supabase: SupabaseClient, id: string) {
  return supabase.from('client_contacts').delete().eq('id', id)
}
