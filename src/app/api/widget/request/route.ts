import { createServiceClient } from '@/lib/supabase/server'
import { checkWidgetRateLimit } from '@/lib/rate-limit'
import { sendTelegramMessage } from '@/lib/telegram'
import { buildRequestNotificationHtml } from '@/lib/email/lead-notification'
import { FOUNDER } from '@/lib/founder-profile'
import { Resend } from 'resend'
import { headers } from 'next/headers'

/**
 * A visitor filled in the request form inside the chat widget and pressed send.
 *
 * This exists as its own route rather than as another model tool because the
 * contact details must be the visitor's, verbatim. When the assistant collects
 * an address conversationally it is transcribing — and a transcribed email that
 * drops a character is a lead that can never be replied to. The form posts what
 * was typed into it.
 *
 * The write is deliberately split across the two tables that already exist:
 * `widget_leads` holds who they are (upserted per session, so a request after a
 * captured lead enriches the same row instead of creating a second one), and
 * `widget_escalations` holds the ask, which is what the admin queue watches.
 */

const URGENCY = new Set(['whenever', 'this_week', 'urgent'])
const CONTACT_METHOD = new Set(['phone', 'email', 'sms'])

const MAX_DETAILS = 2000
const MAX_FIELD = 200

function clean(value: unknown, max = MAX_FIELD): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

export async function POST(req: Request) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = await createServiceClient()

  const { allowed } = await checkWidgetRateLimit(supabase, ip)
  if (!allowed) {
    return Response.json(
      { error: 'Too many requests. Please try again in a little while.' },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const sessionId = clean(body.sessionId)
  const details = clean(body.details, MAX_DETAILS)
  const name = clean(body.name)
  const email = clean(body.email)
  const phone = clean(body.phone)

  if (!sessionId) {
    return Response.json({ error: 'Missing session.' }, { status: 400 })
  }
  if (!details) {
    return Response.json({ error: 'Tell us what you need and we’ll pass it along.' }, { status: 400 })
  }
  if (!email && !phone) {
    return Response.json(
      { error: 'Add an email or a phone number so Chandler can reply.' },
      { status: 400 }
    )
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'That email doesn’t look right.' }, { status: 400 })
  }

  const urgencyRaw = clean(body.urgency)
  const urgency = urgencyRaw && URGENCY.has(urgencyRaw)
    ? (urgencyRaw as 'whenever' | 'this_week' | 'urgent')
    : undefined
  const methodRaw = clean(body.preferredContact)
  const preferredContact = methodRaw && CONTACT_METHOD.has(methodRaw) ? methodRaw : undefined
  const pathname = clean(body.pathname)

  // Only trust a conversation id that actually belongs to this session — it
  // arrives from the browser and is written into a foreign key.
  let conversationId: string | null = null
  const requestedConversationId = clean(body.conversationId)
  if (requestedConversationId) {
    const { data: conv } = await supabase
      .from('widget_conversations')
      .select('id')
      .eq('id', requestedConversationId)
      .eq('session_id', sessionId)
      .single()
    if (conv) conversationId = conv.id
  }

  const [firstName, ...rest] = (name ?? '').split(/\s+/)
  const lastName = rest.join(' ') || undefined

  const leadData = {
    session_id: sessionId,
    conversation_id: conversationId,
    first_name: firstName || undefined,
    last_name: lastName,
    email,
    phone,
    preferred_contact: preferredContact,
    organization: clean(body.organization),
    request: details,
  }

  const { data: existingLead } = await supabase
    .from('widget_leads')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  let leadId: string | null = existingLead?.id ?? null
  if (existingLead) {
    await supabase.from('widget_leads').update(leadData).eq('id', existingLead.id)
  } else {
    const { data: inserted } = await supabase
      .from('widget_leads')
      .insert(leadData)
      .select('id')
      .single()
    leadId = inserted?.id ?? null
  }

  await supabase.from('widget_escalations').insert({
    session_id: sessionId,
    conversation_id: conversationId,
    lead_id: leadId,
    reason: details,
    preferred_method: preferredContact,
  })

  const displayName = name || 'Someone'

  // Notifications are best-effort: the request is already durable in the
  // database, so a bounced email must not fail the submission the visitor is
  // waiting on.
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: `Syntric Widget <${FOUNDER.brandFromEmail}>`,
      to: process.env.ADMIN_EMAIL || FOUNDER.email,
      replyTo: email,
      subject: `Request from ${displayName}${urgency === 'urgent' ? ' — asap' : ''}`,
      html: buildRequestNotificationHtml({
        firstName: firstName || undefined,
        lastName,
        email,
        phone,
        organization: clean(body.organization),
        preferredContact,
        details,
        urgency,
        pathname,
        sessionId,
        conversationId,
      }),
    })
  } catch (error) {
    console.error('Request notification email failed:', error)
  }

  try {
    const message = [
      '<b>New request from the site</b>',
      `From: ${displayName}`,
      email ? `Email: ${email}` : null,
      phone ? `Phone: ${phone}` : null,
      urgency ? `Timing: ${urgency.replace('_', ' ')}` : null,
      '',
      details.slice(0, 500),
    ]
      .filter((line) => line !== null)
      .join('\n')
    await sendTelegramMessage(process.env.TELEGRAM_AUTHORIZED_USER_ID!, message, 'HTML')
  } catch (error) {
    console.error('Request Telegram notification failed:', error)
  }

  return Response.json({ ok: true })
}
