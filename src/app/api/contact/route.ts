import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { ContactNotificationEmail } from '@/lib/email/contact-notification'
import { FOUNDER } from '@/lib/founder-profile'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
  rateLimitMap.set(ip, recent)
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return false
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, phone, company, preferredContact, service, improvements, message } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
    }

    // Insert into Supabase
    const supabase = await createServiceClient()
    const { error: dbError } = await supabase.from('submissions').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      preferred_contact: preferredContact || null,
      service: service || null,
      improvements: Array.isArray(improvements) ? improvements : [],
      message: message.trim(),
    })

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Send notification email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: `Syntric Contact <${FOUNDER.brandFromEmail}>`,
        to: process.env.ADMIN_EMAIL || FOUNDER.email,
        subject: `New contact: ${name.trim()} ${company ? `(${company.trim()})` : ''}`,
        react: ContactNotificationEmail({
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim(),
          company: company?.trim(),
          preferredContact,
          service,
          improvements,
          message: message.trim(),
        }),
      })
    } catch (emailError) {
      // Log but don't fail — submission is already saved
      console.error('Email send error:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
