import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { listTranscripts } from '@/lib/fireflies/client'
import { processTranscript } from '@/lib/fireflies/process-transcript'

export const maxDuration = 300

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const serviceClient = await createServiceClient()
    let imported = 0
    let processing = 0
    let skip = 0
    const batchSize = 50

    // Paginate through all transcripts
    while (true) {
      const transcripts = await listTranscripts({ limit: batchSize, skip })
      if (!transcripts || transcripts.length === 0) break

      for (const ff of transcripts) {
        // Check if we already have this transcript
        const { data: existing } = await serviceClient
          .from('transcripts')
          .select('id, processing_status')
          .eq('fireflies_id', ff.id)
          .single()

        if (existing) continue

        // Insert new transcript
        await serviceClient.from('transcripts').upsert({
          fireflies_id: ff.id,
          title: ff.title,
          date: new Date(ff.date).toISOString(),
          duration_minutes: Math.round(ff.duration / 60),
          organizer_email: ff.organizer_email,
          processing_status: 'pending',
        }, { onConflict: 'fireflies_id' })

        imported++

        // Fire processing in background
        processTranscript(ff.id).catch(err =>
          console.error(`Backfill processing failed for ${ff.id}:`, err)
        )
        processing++
      }

      skip += batchSize
      if (transcripts.length < batchSize) break
    }

    return NextResponse.json({ success: true, imported, processing })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backfill failed' },
      { status: 500 }
    )
  }
}
