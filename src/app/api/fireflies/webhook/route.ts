import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processTranscript } from '@/lib/fireflies/process-transcript'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (process.env.FIREFLIES_WEBHOOK_SECRET && secret !== process.env.FIREFLIES_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
  }

  const body = await request.json()
  const { event, data } = body

  if (event !== 'transcription_completed' || !data?.id) {
    return NextResponse.json({ ok: true, message: 'Ignored event' })
  }

  const supabase = await createServiceClient()

  // Upsert transcript row with pending status
  await supabase.from('transcripts').upsert({
    fireflies_id: data.id,
    title: data.title ?? 'Untitled Meeting',
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    processing_status: 'pending',
  }, { onConflict: 'fireflies_id' })

  // Fire processing in background (don't await)
  processTranscript(data.id).catch(err =>
    console.error(`Background transcript processing failed for ${data.id}:`, err)
  )

  return NextResponse.json({ ok: true })
}
