import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createArticle } from '@/lib/services/knowledgebase'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await createArticle(supabase, {
    title: body.title,
    category: body.category,
    content: body.content,
    is_published: body.is_published ?? true,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
