import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'documents'

export async function uploadDocument(supabase: SupabaseClient, path: string, buffer: Buffer) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return data.path
}

export async function getDocumentURL(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600) // 1 hour expiry
  if (error) throw new Error(`Failed to create signed URL: ${error.message}`)
  return data.signedUrl
}

export async function deleteDocumentFile(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
