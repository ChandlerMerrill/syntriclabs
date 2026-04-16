import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getDocumentURL } from '@/lib/documents/storage'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()
  const { data: doc, error } = await serviceClient
    .from('documents')
    .select('storage_path, title')
    .eq('id', id)
    .single()

  if (error || !doc?.storage_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const signedUrl = await getDocumentURL(serviceClient, doc.storage_path)
  return NextResponse.redirect(signedUrl)
}
