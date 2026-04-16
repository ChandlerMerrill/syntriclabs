import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServiceClient } from '@/lib/supabase/server'
import type { Client, ClientContact, Project, Deal, Activity, Transcript } from '@/lib/types'

const embeddingModel = openai.embedding('text-embedding-3-small')

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text })
  return embedding
}

// ── Serialization ──

export function serializeClient(client: Client, contacts: ClientContact[]): string {
  const contactStr = contacts.map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ')
  return [
    `${client.company_name} - ${client.industry ?? 'Unknown industry'}.`,
    `Status: ${client.status}.`,
    client.tags.length > 0 ? `Tags: ${client.tags.join(', ')}.` : '',
    client.notes ? `Notes: ${client.notes}.` : '',
    contactStr ? `Contacts: ${contactStr}.` : '',
  ].filter(Boolean).join(' ')
}

export function serializeProject(project: Project, clientName: string): string {
  return [
    `Project: ${project.name} for ${clientName}.`,
    project.description ? project.description : '',
    project.scope ? `Scope: ${project.scope}.` : '',
    `Status: ${project.status}.`,
    project.tech_stack.length > 0 ? `Tech: ${project.tech_stack.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
}

export function serializeDeal(deal: Deal, clientName: string): string {
  return [
    `Deal: ${deal.title} with ${clientName}.`,
    `Stage: ${deal.stage}.`,
    `Value: $${(deal.value / 100).toLocaleString()}.`,
    deal.notes ? `Notes: ${deal.notes}.` : '',
  ].filter(Boolean).join(' ')
}

export function serializeActivity(activity: Activity, clientName: string): string {
  return [
    `Activity (${activity.type}): ${activity.title}.`,
    activity.description ? activity.description : '',
    `Client: ${clientName}.`,
  ].filter(Boolean).join(' ')
}

export function serializeEmail(
  email: { subject?: string | null; from: { address: string; name: string }; to: { address: string; name: string }[]; bodyText?: string | null; internalDate: Date },
  clientName?: string
): string {
  return [
    `Email: ${email.subject ?? '(no subject)'}.`,
    `From: ${email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address}.`,
    `To: ${email.to.map(t => t.name || t.address).join(', ')}.`,
    clientName ? `Client: ${clientName}.` : '',
    `Date: ${email.internalDate.toISOString().split('T')[0]}.`,
    email.bodyText ? email.bodyText.substring(0, 500) : '',
  ].filter(Boolean).join(' ')
}

export function serializeTranscript(transcript: Transcript, clientName?: string): string {
  return [
    `Meeting: ${transcript.title}.`,
    `Date: ${new Date(transcript.date).toISOString().split('T')[0]}.`,
    clientName ? `Client: ${clientName}.` : '',
    transcript.duration_minutes ? `Duration: ${transcript.duration_minutes} min.` : '',
    transcript.participants?.length ? `Participants: ${transcript.participants.map(p => p.name || p.email).join(', ')}.` : '',
    transcript.summary ? `Summary: ${transcript.summary}` : '',
    transcript.action_items?.length ? `Action items: ${transcript.action_items.map(a => a.text).join('; ')}.` : '',
    transcript.key_decisions?.length ? `Decisions: ${transcript.key_decisions.join('; ')}.` : '',
    transcript.topics?.length ? `Topics: ${transcript.topics.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
}

// ── Upsert ──

export async function upsertEmbedding(
  entityType: 'client' | 'project' | 'deal' | 'activity' | 'email' | 'transcript' | 'knowledgebase',
  entityId: string,
  text: string
): Promise<void> {
  const supabase = await createServiceClient()
  const embedding = await generateEmbedding(text)

  await supabase.from('embeddings').upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      content: text,
      embedding: JSON.stringify(embedding),
    },
    { onConflict: 'entity_type,entity_id' }
  )
}

// ── Search ──

export async function searchSimilar(
  query: string,
  options?: { types?: string[]; limit?: number; threshold?: number }
): Promise<{ entity_type: string; entity_id: string; content: string; similarity: number }[]> {
  const supabase = await createServiceClient()
  const embedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('search_embeddings', {
    query_embedding: JSON.stringify(embedding),
    match_count: options?.limit ?? 10,
    match_threshold: options?.threshold ?? 0.3,
    filter_types: options?.types ?? null,
  })

  if (error) {
    console.error('Semantic search error:', error)
    return []
  }

  return data ?? []
}

// ── Fire-and-forget helper ──

export function embedInBackground(
  entityType: 'client' | 'project' | 'deal' | 'activity' | 'email' | 'transcript' | 'knowledgebase',
  entityId: string,
  text: string
): void {
  upsertEmbedding(entityType, entityId, text).catch((err) =>
    console.error(`Embedding failed for ${entityType}/${entityId}:`, err)
  )
}
