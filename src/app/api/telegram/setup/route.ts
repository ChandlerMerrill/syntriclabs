import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setTelegramWebhook } from '@/lib/telegram'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SITE_URL not configured' }, { status: 500 })
  }

  const webhookUrl = `${siteUrl}/api/telegram/webhook`
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET!

  const result = await setTelegramWebhook(webhookUrl, secret)

  return NextResponse.json({ webhookUrl, result })
}
