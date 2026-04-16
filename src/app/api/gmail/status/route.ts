import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: account } = await serviceClient
    .from('gmail_accounts')
    .select('email_address, last_sync_at, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return NextResponse.json({
    connected: !!account,
    email: account?.email_address ?? null,
    lastSync: account?.last_sync_at ?? null,
  })
}
