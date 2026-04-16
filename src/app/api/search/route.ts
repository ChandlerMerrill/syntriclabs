import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { searchSimilar } from '@/lib/ai/embeddings'

export async function GET(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const types = req.nextUrl.searchParams.get('types')?.split(',').filter(Boolean) ?? undefined

  const matches = await searchSimilar(q, { types, limit: 12 })

  // Enrich with entity details
  const supabase = await createServiceClient()
  const enriched = await Promise.all(
    matches.map(async (m) => {
      let details: Record<string, unknown> = {}
      switch (m.entity_type) {
        case 'client': {
          const { data } = await supabase.from('clients').select('id, company_name, industry, status').eq('id', m.entity_id).single()
          details = data ?? {}
          break
        }
        case 'project': {
          const { data } = await supabase.from('projects').select('id, name, status, clients(company_name)').eq('id', m.entity_id).single()
          details = data ?? {}
          break
        }
        case 'deal': {
          const { data } = await supabase.from('deals').select('id, title, stage, value, clients(company_name)').eq('id', m.entity_id).single()
          details = data ?? {}
          break
        }
        case 'activity': {
          const { data } = await supabase.from('activities').select('id, title, type, clients(company_name)').eq('id', m.entity_id).single()
          details = data ?? {}
          break
        }
      }
      return { ...m, details }
    })
  )

  return NextResponse.json({ results: enriched })
}
