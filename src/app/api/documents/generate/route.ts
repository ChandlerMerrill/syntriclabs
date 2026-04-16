import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDocumentService } from '@/lib/services/document-generation'
import type { DocumentType } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, title, client_id, deal_id, project_id, content_data } = await req.json()

  if (!type || !client_id || !content_data) {
    return NextResponse.json({ error: 'Missing required fields: type, client_id, content_data' }, { status: 400 })
  }

  try {
    const doc = await generateDocumentService({
      type: type as DocumentType,
      title,
      client_id,
      deal_id,
      project_id,
      content_data,
    })

    return NextResponse.json({ document: doc })
  } catch (err) {
    console.error('Document generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Document generation failed' },
      { status: 500 }
    )
  }
}
