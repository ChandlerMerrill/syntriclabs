import { createServiceClient } from '@/lib/supabase/server'
import { searchSimilar } from '@/lib/ai/embeddings'
import { withAIAudit } from '@/lib/ai/audit'
import { registerTool } from '../custom-tools'
import { semanticSearch as semanticSearchSchema } from '../schemas'

// Cap per-row content so 8 enriched rows + metadata stay well under Anthropic's
// ~25KB custom-tool result ceiling (worst case <10KB at 800 chars x 8).
const MAX_CONTENT_CHARS = 800

export function register(): void {
  registerTool(
    'semantic_search',
    semanticSearchSchema,
    withAIAudit('semantic_search', { logActivity: false }, async (args) => {
      try {
        const results = await searchSimilar(args.query, {
          types: args.types,
          limit: args.limit,
        })
        if (results.length === 0) {
          return { results: [], message: 'No matching results found.' }
        }

        const supabase = await createServiceClient()
        const enriched = await Promise.all(
          results.map(async (r) => {
            let details: Record<string, unknown> = {}
            switch (r.entity_type) {
              case 'client': {
                const { data } = await supabase
                  .from('clients')
                  .select('id, company_name, industry, status')
                  .eq('id', r.entity_id)
                  .single()
                details = data ?? {}
                break
              }
              case 'project': {
                const { data } = await supabase
                  .from('projects')
                  .select('id, name, status, clients(company_name)')
                  .eq('id', r.entity_id)
                  .single()
                details = data ?? {}
                break
              }
              case 'deal': {
                const { data } = await supabase
                  .from('deals')
                  .select('id, title, stage, value, clients(company_name)')
                  .eq('id', r.entity_id)
                  .single()
                details = data ?? {}
                break
              }
              case 'activity': {
                const { data } = await supabase
                  .from('activities')
                  .select('id, title, type, created_at, clients(company_name)')
                  .eq('id', r.entity_id)
                  .single()
                details = data ?? {}
                break
              }
              case 'email': {
                const { data } = await supabase
                  .from('emails')
                  .select('id, subject, from_address, direction, internal_date, clients(company_name)')
                  .eq('id', r.entity_id)
                  .single()
                details = data ?? {}
                break
              }
              case 'transcript': {
                const { data } = await supabase
                  .from('transcripts')
                  .select('id, title, date, sentiment, summary, clients(company_name)')
                  .eq('id', r.entity_id)
                  .single()
                details = data ?? {}
                break
              }
            }
            return { type: r.entity_type, similarity: r.similarity, content: r.content, details }
          }),
        )

        const safe = enriched.map((r) => ({
          ...r,
          content:
            typeof r.content === 'string' && r.content.length > MAX_CONTENT_CHARS
              ? r.content.slice(0, MAX_CONTENT_CHARS) + ' …[truncated]'
              : r.content,
        }))
        return { results: safe, count: safe.length }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Semantic search failed' }
      }
    }),
  )
}
