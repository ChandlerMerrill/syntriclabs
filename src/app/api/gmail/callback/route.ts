import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/gmail/crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?gmail=error&message=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?gmail=error&message=missing_params`)
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('gmail_oauth_state')?.value
  cookieStore.delete('gmail_oauth_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?gmail=error&message=invalid_state`)
  }

  // Verify auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?gmail=error&message=unauthorized`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?gmail=error&message=token_exchange_failed`)
  }

  // Get profile email
  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await profileRes.json()

  // Encrypt and store tokens
  const serviceClient = await createServiceClient()
  await serviceClient.from('gmail_accounts').upsert({
    user_id: user.id,
    email_address: profile.emailAddress,
    access_token_encrypted: encrypt(tokens.access_token),
    refresh_token_encrypted: encrypt(tokens.refresh_token),
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    history_id: profile.historyId ? parseInt(profile.historyId, 10) : null,
    is_active: true,
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${baseUrl}/admin/settings?gmail=connected`)
}
