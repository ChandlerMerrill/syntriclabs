import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  upsertEmbedding,
  serializeClient,
  serializeProject,
  serializeDeal,
  serializeActivity,
  serializeEmail,
  serializeTranscript,
} from '@/lib/ai/embeddings'

export async function POST() {
  // Auth check
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceClient()
  const results = { clients: 0, projects: 0, deals: 0, activities: 0, emails: 0, transcripts: 0, errors: 0 }

  // Clients
  const { data: clients } = await supabase.from('clients').select('*, client_contacts(*)')
  if (clients) {
    for (const client of clients) {
      try {
        const text = serializeClient(client, client.client_contacts ?? [])
        await upsertEmbedding('client', client.id, text)
        results.clients++
      } catch { results.errors++ }
    }
  }

  // Projects
  const { data: projects } = await supabase.from('projects').select('*, clients(company_name)')
  if (projects) {
    for (const project of projects) {
      try {
        const clientName = (project.clients as unknown as { company_name: string })?.company_name ?? 'Unknown'
        const text = serializeProject(project, clientName)
        await upsertEmbedding('project', project.id, text)
        results.projects++
      } catch { results.errors++ }
    }
  }

  // Deals
  const { data: deals } = await supabase.from('deals').select('*, clients(company_name)')
  if (deals) {
    for (const deal of deals) {
      try {
        const clientName = (deal.clients as unknown as { company_name: string })?.company_name ?? 'Unknown'
        const text = serializeDeal(deal, clientName)
        await upsertEmbedding('deal', deal.id, text)
        results.deals++
      } catch { results.errors++ }
    }
  }

  // Activities (last 200)
  const { data: activities } = await supabase
    .from('activities')
    .select('*, clients(company_name)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (activities) {
    for (const activity of activities) {
      try {
        const clientName = (activity.clients as unknown as { company_name: string })?.company_name ?? 'Unknown'
        const text = serializeActivity(activity, clientName)
        await upsertEmbedding('activity', activity.id, text)
        results.activities++
      } catch { results.errors++ }
    }
  }

  // Emails (last 500)
  const { data: emails } = await supabase
    .from('emails')
    .select('id, subject, from_address, from_name, to_addresses, body_text, internal_date, clients(company_name)')
    .order('internal_date', { ascending: false })
    .limit(500)
  if (emails) {
    for (const email of emails) {
      try {
        const clientName = (email.clients as unknown as { company_name: string })?.company_name
        const text = serializeEmail({
          subject: email.subject,
          from: { address: email.from_address, name: email.from_name ?? '' },
          to: email.to_addresses as { address: string; name: string }[],
          bodyText: email.body_text,
          internalDate: new Date(email.internal_date),
        }, clientName)
        await upsertEmbedding('email', email.id, text)
        results.emails++
      } catch { results.errors++ }
    }
  }

  // Transcripts (completed only)
  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('*, clients(company_name)')
    .eq('processing_status', 'completed')
    .order('date', { ascending: false })
    .limit(200)
  if (transcripts) {
    for (const transcript of transcripts) {
      try {
        const clientName = (transcript.clients as unknown as { company_name: string })?.company_name
        const text = serializeTranscript(transcript, clientName)
        await upsertEmbedding('transcript', transcript.id, text)
        results.transcripts++
      } catch { results.errors++ }
    }
  }

  return NextResponse.json({ success: true, results })
}
