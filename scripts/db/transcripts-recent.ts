/**
 * Lists recent Fireflies transcripts, or prints one in full. Read-only.
 *
 *   tsx --env-file=.env.local scripts/db/transcripts-recent.ts               # newest 10
 *   tsx --env-file=.env.local scripts/db/transcripts-recent.ts --limit 25
 *   tsx --env-file=.env.local scripts/db/transcripts-recent.ts --id <uuid>   # one, in full
 *
 * Exists for `/linkedin-post` Step 1b in the brain repo: a post is supposed to
 * come from recorded human conversation before it comes from the brain's own
 * pages, and until now the only way to read a transcript was the admin UI at
 * /admin/transcripts, which a Claude Code session cannot drive. This prints
 * the same rows through the service client (the table is service-role-only
 * by RLS, migration 008) and writes nothing.
 *
 * What it deliberately does not do: filter by client, or decide what is safe
 * to quote. A transcript is a client's words. Whether any of it can appear in
 * a public post is the permission check in the skill, made by a person, per
 * post — not something this script can know.
 */
import { createServiceClient } from '@/lib/supabase/server'

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

interface TranscriptRow {
  id: string
  title: string
  date: string
  duration_minutes: number | null
  summary: string | null
  key_decisions: unknown
  action_items: unknown
  topics: string[]
  fireflies_url: string | null
  participants: unknown
  raw_transcript: string | null
}

function list(items: unknown, label: string) {
  if (!Array.isArray(items) || items.length === 0) return
  console.log(`\n${label}`)
  for (const item of items) {
    const text = typeof item === 'string' ? item : JSON.stringify(item)
    console.log(`  - ${text}`)
  }
}

async function main() {
  const sb = await createServiceClient()
  const id = arg('id')

  if (id) {
    const { data, error } = await sb
      .from('transcripts')
      .select(
        'id,title,date,duration_minutes,summary,key_decisions,action_items,topics,fireflies_url,participants,raw_transcript'
      )
      .eq('id', id)
      .maybeSingle<TranscriptRow>()
    if (error) throw new Error(error.message)
    if (!data) {
      console.error(`no transcript with id ${id}`)
      process.exitCode = 1
      return
    }
    console.log(`${data.title}`)
    console.log(`${data.date.slice(0, 10)} · ${data.duration_minutes ?? '?'} min · ${data.id}`)
    if (data.fireflies_url) console.log(data.fireflies_url)
    if (data.topics?.length) console.log(`topics: ${data.topics.join(', ')}`)
    if (data.summary) console.log(`\nSummary\n${data.summary}`)
    list(data.key_decisions, 'Key decisions')
    list(data.action_items, 'Action items')
    if (data.raw_transcript) console.log(`\nTranscript\n${data.raw_transcript}`)
    return
  }

  const limit = Math.max(1, Number.parseInt(arg('limit') ?? '10', 10) || 10)
  const { data, error } = await sb
    .from('transcripts')
    .select('id,title,date,duration_minutes,summary,key_decisions,topics')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Pick<
    TranscriptRow,
    'id' | 'title' | 'date' | 'duration_minutes' | 'summary' | 'key_decisions' | 'topics'
  >[]
  if (rows.length === 0) {
    console.log('no transcripts on file')
    return
  }

  for (const t of rows) {
    console.log(`\n${t.date.slice(0, 10)}  ${t.title}  (${t.duration_minutes ?? '?'} min)`)
    console.log(`  id ${t.id}`)
    if (t.topics?.length) console.log(`  topics: ${t.topics.join(', ')}`)
    if (t.summary) {
      const oneLine = t.summary.replace(/\s+/g, ' ').trim()
      console.log(`  ${oneLine.length > 240 ? oneLine.slice(0, 240) + '…' : oneLine}`)
    }
    const decisions = Array.isArray(t.key_decisions) ? t.key_decisions : []
    if (decisions.length) console.log(`  ${decisions.length} key decision(s) — --id for the full record`)
  }
  console.log(`\n${rows.length} shown, newest first. --id <uuid> prints one in full.`)
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
