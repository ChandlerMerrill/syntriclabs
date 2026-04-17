import type { SupabaseClient } from '@supabase/supabase-js'
import type { WidgetLead, WidgetLeadWithEscalations, LeadStatus } from '@/lib/types'

export interface LeadInput {
  session_id: string
  conversation_id?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  preferred_contact?: 'phone' | 'email' | 'sms' | null
  role?: string | null
  organization?: string | null
  business_type?: string | null
  service_interest?: string | null
  request?: string | null
  summary?: string | null
  status?: LeadStatus
  metadata?: Record<string, unknown>
}

export async function getLeads(
  supabase: SupabaseClient,
  filters?: { status?: string; search?: string }
) {
  let query = supabase
    .from('widget_leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,organization.ilike.%${filters.search}%`
    )
  }

  return query as unknown as { data: WidgetLead[] | null; error: unknown }
}

export async function getLead(supabase: SupabaseClient, id: string) {
  return supabase
    .from('widget_leads')
    .select('*, widget_escalations(*)')
    .eq('id', id)
    .single() as unknown as { data: WidgetLeadWithEscalations | null; error: unknown }
}

export async function updateLeadStatus(supabase: SupabaseClient, id: string, status: LeadStatus) {
  return supabase
    .from('widget_leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single() as unknown as { data: WidgetLead | null; error: unknown }
}

export async function convertToClient(supabase: SupabaseClient, leadId: string) {
  // Fetch lead
  const { data: lead, error: leadError } = await getLead(supabase, leadId)
  if (leadError || !lead) return { data: null, error: leadError || 'Lead not found' }

  // Create client
  const companyName = lead.organization || `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || 'Unknown'
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_name: companyName,
      industry: lead.business_type,
      status: 'prospect',
      source: 'website',
      tags: ['widget-lead'],
      notes: lead.summary || '',
    })
    .select()
    .single()

  if (clientError || !client) return { data: null, error: clientError }

  // Create contact
  const contactName = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim()
  if (contactName || lead.email) {
    await supabase.from('client_contacts').insert({
      client_id: client.id,
      name: contactName || 'Unknown',
      email: lead.email,
      phone: lead.phone,
      role: lead.role,
      is_primary: true,
    })
  }

  // Mark lead as converted
  await updateLeadStatus(supabase, leadId, 'converted')

  return { data: client, error: null }
}

export async function createLead(supabase: SupabaseClient, input: LeadInput) {
  return supabase
    .from('widget_leads')
    .insert(input)
    .select()
    .single() as unknown as { data: WidgetLead | null; error: unknown }
}

export async function updateLead(supabase: SupabaseClient, id: string, input: Partial<LeadInput>) {
  return supabase
    .from('widget_leads')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single() as unknown as { data: WidgetLead | null; error: unknown }
}

export async function getNewLeadsCount(supabase: SupabaseClient) {
  const { count } = await supabase
    .from('widget_leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  return count ?? 0
}
