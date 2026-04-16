import type { SupabaseClient } from '@supabase/supabase-js'
import type { KnowledgebaseArticle } from '@/lib/types'
import { embedInBackground } from '@/lib/ai/embeddings'

export async function getArticles(
  supabase: SupabaseClient,
  filters?: { category?: string; search?: string }
) {
  let query = supabase
    .from('knowledgebase_articles')
    .select('*')
    .order('category')
    .order('title')

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

  return query as unknown as { data: KnowledgebaseArticle[] | null; error: unknown }
}

export async function getArticle(supabase: SupabaseClient, id: string) {
  return supabase
    .from('knowledgebase_articles')
    .select('*')
    .eq('id', id)
    .single() as unknown as { data: KnowledgebaseArticle | null; error: unknown }
}

export async function createArticle(
  supabase: SupabaseClient,
  input: Omit<KnowledgebaseArticle, 'id' | 'created_at' | 'updated_at'>
) {
  const result = await supabase
    .from('knowledgebase_articles')
    .insert(input)
    .select()
    .single() as unknown as { data: KnowledgebaseArticle | null; error: unknown }

  if (result.data && result.data.is_published) {
    embedInBackground('knowledgebase', result.data.id, result.data.title + ': ' + result.data.content)
  }

  return result
}

export async function updateArticle(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Omit<KnowledgebaseArticle, 'id' | 'created_at' | 'updated_at'>>
) {
  const result = await supabase
    .from('knowledgebase_articles')
    .update(input)
    .eq('id', id)
    .select()
    .single() as unknown as { data: KnowledgebaseArticle | null; error: unknown }

  if (result.data) {
    if (result.data.is_published) {
      embedInBackground('knowledgebase', result.data.id, result.data.title + ': ' + result.data.content)
    } else {
      // Remove embedding for unpublished articles
      await supabase
        .from('embeddings')
        .delete()
        .eq('entity_type', 'knowledgebase')
        .eq('entity_id', id)
    }
  }

  return result
}

export async function deleteArticle(supabase: SupabaseClient, id: string) {
  // Delete embedding first
  await supabase
    .from('embeddings')
    .delete()
    .eq('entity_type', 'knowledgebase')
    .eq('entity_id', id)

  return supabase.from('knowledgebase_articles').delete().eq('id', id)
}
