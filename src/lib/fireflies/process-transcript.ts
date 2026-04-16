import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServiceClient } from '@/lib/supabase/server'
import { getTranscript as fetchFirefliesTranscript } from './client'
import { embedInBackground, serializeTranscript } from '@/lib/ai/embeddings'
import { logAutoActivity } from '@/lib/services/activities'

const MAX_TRANSCRIPT_LENGTH = 50000

export async function processTranscript(firefliesId: string): Promise<void> {
  const supabase = await createServiceClient()

  // Mark as processing
  await supabase
    .from('transcripts')
    .update({ processing_status: 'processing' })
    .eq('fireflies_id', firefliesId)

  try {
    // Fetch from Fireflies
    const ff = await fetchFirefliesTranscript(firefliesId)

    // Reconstruct raw transcript with speaker attribution
    const rawTranscript = ff.sentences
      .map(s => {
        const mins = Math.floor(s.start_time / 60)
        const secs = Math.floor(s.start_time % 60)
        const time = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        return `[${s.speaker_name}] (${time}): ${s.text}`
      })
      .join('\n')
      .substring(0, 100000) // 100K for storage

    // Match to client
    const participants = ff.participants.map(p => {
      const emailMatch = p.match(/<([^>]+)>/)
      return {
        name: p.replace(/<[^>]+>/, '').trim(),
        email: emailMatch?.[1]?.toLowerCase() ?? p.toLowerCase(),
      }
    })

    const match = await matchTranscriptToClient(supabase, participants)

    // Build Claude prompt for CRM-aware extraction
    const transcriptForAI = rawTranscript.substring(0, MAX_TRANSCRIPT_LENGTH)

    const { text: analysisRaw } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are a CRM assistant analyzing meeting transcripts. Extract structured information for a consulting business CRM. Return valid JSON only — no markdown, no code fences.`,
      prompt: `Analyze this meeting transcript and extract CRM-relevant insights.

Meeting: "${ff.title}"
Date: ${new Date(ff.date).toISOString()}
Duration: ${Math.round(ff.duration / 60)} minutes
Participants: ${participants.map(p => p.name || p.email).join(', ')}

Transcript:
${transcriptForAI}

Return a JSON object with these exact fields:
{
  "summary": "2-3 paragraph business-focused summary of the meeting",
  "action_items": [{"text": "action item description", "assignee": "person name or null", "due_date": "YYYY-MM-DD or null"}],
  "key_decisions": ["decision 1", "decision 2"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "topics": ["topic1", "topic2"]
}`,
    })

    // Parse Claude's response
    let analysis: {
      summary: string
      action_items: { text: string; assignee?: string; due_date?: string }[]
      key_decisions: string[]
      sentiment: string
      topics: string[]
    }

    try {
      // Strip any markdown code fences if present
      const cleaned = analysisRaw.replace(/```json\n?|\n?```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      throw new Error(`Failed to parse Claude analysis: ${analysisRaw.substring(0, 200)}`)
    }

    // Update transcript with results
    await supabase.from('transcripts').update({
      title: ff.title,
      date: new Date(ff.date).toISOString(),
      duration_minutes: Math.round(ff.duration / 60),
      organizer_email: ff.organizer_email,
      participants,
      raw_transcript: rawTranscript,
      summary: analysis.summary,
      action_items: analysis.action_items,
      key_decisions: analysis.key_decisions,
      sentiment: analysis.sentiment,
      topics: analysis.topics,
      fireflies_url: ff.transcript_url,
      client_id: match?.clientId ?? null,
      matched_contact_ids: match?.contactIds ?? [],
      processing_status: 'completed',
      processing_error: null,
    }).eq('fireflies_id', firefliesId)

    // Get the transcript row for embedding
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('*, clients(company_name)')
      .eq('fireflies_id', firefliesId)
      .single()

    if (transcript) {
      const clientName = (transcript.clients as unknown as { company_name: string })?.company_name
      embedInBackground('transcript', transcript.id, serializeTranscript(transcript, clientName))

      // Log activity if matched
      if (match?.clientId) {
        await logAutoActivity(supabase, {
          client_id: match.clientId,
          title: `Meeting transcript processed: ${ff.title}`,
          description: analysis.summary?.substring(0, 200) ?? '',
          type: 'meeting',
          metadata: {
            transcript_id: transcript.id,
            fireflies_id: firefliesId,
            sentiment: analysis.sentiment,
            action_item_count: analysis.action_items.length,
          },
        })
      }
    }
  } catch (err) {
    // Mark as failed
    await supabase.from('transcripts').update({
      processing_status: 'failed',
      processing_error: err instanceof Error ? err.message : 'Processing failed',
    }).eq('fireflies_id', firefliesId)

    console.error(`Transcript processing failed for ${firefliesId}:`, err)
  }
}

async function matchTranscriptToClient(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  participants: { name: string; email: string }[]
): Promise<{ clientId: string; contactIds: string[] } | null> {
  const emails = participants.map(p => p.email).filter(e => e.includes('@'))
  if (emails.length === 0) return null

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('id, client_id, email')
    .in('email', emails)

  if (!contacts || contacts.length === 0) return null

  // Group by client_id, pick the client with the most matching contacts
  const clientMap = new Map<string, string[]>()
  for (const contact of contacts) {
    if (!clientMap.has(contact.client_id)) clientMap.set(contact.client_id, [])
    clientMap.get(contact.client_id)!.push(contact.id)
  }

  let bestClient = ''
  let bestContacts: string[] = []
  for (const [clientId, contactIds] of clientMap) {
    if (contactIds.length > bestContacts.length) {
      bestClient = clientId
      bestContacts = contactIds
    }
  }

  return bestClient ? { clientId: bestClient, contactIds: bestContacts } : null
}
