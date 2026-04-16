import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project, ProjectInput, ProjectWithClient } from '@/lib/types'
import { embedInBackground, serializeProject } from '@/lib/ai/embeddings'

export async function getProjects(
  supabase: SupabaseClient,
  filters?: { client_id?: string; status?: string; search?: string }
) {
  let query = supabase
    .from('projects')
    .select('*, clients(id, company_name)')
    .order('created_at', { ascending: false })

  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`)

  return query as unknown as { data: ProjectWithClient[] | null; error: unknown }
}

export async function getProject(supabase: SupabaseClient, id: string) {
  return supabase
    .from('projects')
    .select('*, clients(id, company_name)')
    .eq('id', id)
    .single() as unknown as { data: ProjectWithClient | null; error: unknown }
}

export async function createProject(supabase: SupabaseClient, input: ProjectInput) {
  const result = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single() as unknown as { data: Project | null; error: unknown }
  if (result.data) {
    embedInBackground('project', result.data.id, serializeProject(result.data, 'Unknown'))
  }
  return result
}

export async function updateProject(supabase: SupabaseClient, id: string, input: Partial<ProjectInput>) {
  const result = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single() as unknown as { data: Project | null; error: unknown }
  if (result.data) {
    embedInBackground('project', result.data.id, serializeProject(result.data, 'Unknown'))
  }
  return result
}

export async function deleteProject(supabase: SupabaseClient, id: string) {
  return supabase.from('projects').delete().eq('id', id)
}
