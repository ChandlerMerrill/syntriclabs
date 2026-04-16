import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processTranscript } from '@/lib/fireflies/process-transcript'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transcriptId, firefliesId } = await request.json()

  if (!firefliesId) {
    return NextResponse.json({ error: 'firefliesId is required' }, { status: 400 })
  }

  try {
    await processTranscript(firefliesId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reprocessing failed' },
      { status: 500 }
    )
  }
}
