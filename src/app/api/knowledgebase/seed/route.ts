import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { upsertEmbedding } from '@/lib/ai/embeddings'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  // Allow auth user OR cron secret
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    const { data: articles, error } = await supabase
      .from('knowledgebase_articles')
      .select('id, title, content')
      .eq('is_published', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let embedded = 0
    let errors = 0

    for (const article of articles ?? []) {
      try {
        await upsertEmbedding('knowledgebase', article.id, `${article.title}: ${article.content}`)
        embedded++
      } catch (err) {
        console.error(`Failed to embed article ${article.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({ success: true, embedded, errors })
  } catch (err) {
    console.error('Knowledgebase seed error:', err)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
