/**
 * Imports the brain's LinkedIn ledger into the marketing_* tables.
 *
 *   npx tsx --env-file=.env.local scripts/db/import-linkedin-ledger.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/db/import-linkedin-ledger.ts
 *   npx tsx --env-file=.env.local scripts/db/import-linkedin-ledger.ts \
 *       [--ledger ../brain/projects/linkedin-agent/ledger.jsonl] \
 *       [--approver chandler@syntriclabs.com] [--dry-run]
 *
 * One-shot and idempotent. Run it twice and the second run inserts nothing —
 * that is the check, and it is printed at the end of every run.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * `/linkedin-run` in the brain repo has written every connection request,
 * first message, and outcome since 2026-08-06 to a staging file,
 * `projects/linkedin-agent/ledger.jsonl`, whose own brief said it would import
 * here in "Phase 2" and named the risk that it never would: *"the staging file
 * quietly becomes the permanent store."* Day 27. The signal-outreach project
 * (brain, 2026-09-02) needs the LinkedIn rows and the email rows for one
 * person in one place — `marketing_prospect_channels`, migration 037 — and
 * this is the import that puts them there.
 *
 * ── What maps to what ─────────────────────────────────────────────────────
 *
 *   ledger `send` (connection_request | first_message)  → marketing_sends
 *     id            the ledger id, LOWERCASED, IS the primary key. No external_id
 *                   column: the ledger's uuid is a uuid and re-running upserts
 *                   on it with ignoreDuplicates, which is the whole idempotency.
 *     status        'sent'. Both approval columns are set — the ledger's
 *                   approved_by is a label ('chandler', 'chandler-blanket-…'),
 *                   which goes to metadata; the uuid column gets the approver
 *                   resolved from auth.users by email.
 *     step_no       1 for a connection request, 2 for a first message.
 *     metadata      everything the ledger knew: action, segment, campaign_key,
 *                   variant_key, disclosure, generator, sourcing (and
 *                   sourcing_kind hoisted for the 037 index — 'unknown' on
 *                   every row that predates the field), note_features, notes,
 *                   in_reply_to_send_id, approved_by_label, prospect_snapshot.
 *   ledger `outcome`                                    → marketing_outcomes
 *     upsert on send_id (unique). scored_by 'human', rationale = detail.
 *     accepted | ignored | replied land as themselves — 037 widened the check.
 *   ledger `prospect` (inside each send)                → marketing_prospects
 *     keyed on the normalised LinkedIn URL. Inserted only when absent, NEVER
 *     updated — same rule as prospects/import.ts. company falls back to the
 *     person's name (154 requests have no company; the column is NOT NULL).
 *     source 'linkedin_ledger', qualified null.
 *   ledger `campaign` string                            → marketing_campaigns
 *     one per distinct value, channel 'linkedin', matched by name first.
 *   ledger (campaign, action, variant_key)              → marketing_variants
 *     status 'retired' so the outreach agent's gate can never deal one into an
 *     email queue. generation_prompt and model are NOT NULL and describe the
 *     import, because the real prompt was a Claude Code session and the real
 *     model was whichever one ran it.
 *
 * ── What is skipped, on purpose ───────────────────────────────────────────
 *
 *   follow   no outcome to chase, no invitation spent; the brain's own quota
 *            script already treats them as inert.
 *   note     provenance notes, not sends.
 *   halt     a stop record, not a send.
 *   post     `marketing_sends.prospect_id` is NOT NULL and a post has no
 *            prospect. Posts stay in the ledger until a posts table exists.
 *            Say so; do not fake a prospect to fit the schema.
 *
 * ── What is NOT written ───────────────────────────────────────────────────
 *
 *   marketing_events. Its unique key is (send_id, type, email_id) and email_id
 *   is null for every LinkedIn row; nulls are distinct under a unique
 *   constraint, so a re-run would insert a second 'replied' event per reply
 *   and `marketing_variant_performance.replies` would inflate on every run.
 *   Outcomes carry the same fact with a real unique on send_id.
 *
 * ── Preflight (also under --dry-run) ──────────────────────────────────────
 *
 *   Parses every line (a malformed one aborts — the ledger is the only record
 *   there is), resolves the approver uuid, the default brand profile, and the
 *   segment slugs, checks that 037 is applied (the metadata column), and
 *   checks the live table for duplicate LinkedIn URLs. It prints what every
 *   table would gain. --dry-run stops there.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}
const DRY_RUN = process.argv.includes('--dry-run')
const LEDGER = path.resolve(
  arg('ledger') ?? path.join(process.cwd(), '../brain/projects/linkedin-agent/ledger.jsonl')
)
const APPROVER_EMAIL = arg('approver') ?? 'chandler@syntriclabs.com'
const SOURCE = 'linkedin_ledger'
const MODEL = 'claude-code-session'
const CHUNK = 100

// ── Ledger shapes (only what this script reads) ───────────────────────────

interface LedgerProspect {
  name?: string | null
  profile_url?: string | null
  company?: string | null
  title?: string | null
  location?: string | null
}
interface LedgerEngagement {
  post_url?: string
  seed_account?: string
  action?: string
  comment_text?: string | null
  observed_at?: string
}
interface LedgerSend {
  type: 'send'
  id: string
  ts: string
  sent_at?: string
  channel?: string
  action: string
  segment?: string
  campaign?: string
  variant_key?: string
  disclosure?: string
  generator?: string
  prospect?: LedgerProspect
  rendered_body?: string | null
  status?: string
  approved_by?: string
  approved_at?: string
  note_features?: Record<string, unknown>
  sourcing?: { kind?: string; engagement?: LedgerEngagement } & Record<string, unknown>
  notes?: string
  in_reply_to_send_id?: string
  drafted_but_unsent_body?: string
  drafted_but_unsent_features?: Record<string, unknown>
}
interface LedgerOutcome {
  type: 'outcome'
  send_id: string
  ts: string
  outcome: string
  detail?: string
  scored_by?: string
}
type LedgerRow = LedgerSend | LedgerOutcome | { type: string; [k: string]: unknown }

const IMPORTED_ACTIONS = new Set(['connection_request', 'first_message'])
const SOURCING_KINDS = new Set([
  'engagement',
  'search',
  'pymk',
  'school',
  'mutual',
  'manual',
  'offsite_signal',
])
const OUTCOME_VALUES = new Set([
  'no_reply',
  'replied',
  'meeting_booked',
  'not_interested',
  'wrong_person',
  'won',
  'lost',
  'accepted',
  'ignored',
  'withdrawn',
  'declined',
])

/** Brain segment tag → marketing_segments.slug. Unmapped tags keep the tag in metadata and get no segment. */
const SEGMENT_SLUGS: Record<string, string> = {
  suppliers: 'suppliers',
  'suppliers-oob': 'suppliers',
  trades: 'service-trades',
  clinics: 'vet-clinics',
  'guiding-outfitting': 'guiding-outfitting',
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Same rule as the brain's linkedin-quota.mjs (lowercase, strip scheme and
 * www., strip query, strip trailing slash) and the outreach agent's
 * linkedin-url.ts, re-prefixed to the canonical stored form.
 */
function normaliseLinkedinUrl(raw: string | null | undefined): string | null {
  const stripped = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/^https?:\/\/(www\.)?/, '')
  if (!stripped.startsWith('linkedin.com/')) return null
  const p = stripped.slice('linkedin.com/'.length)
  return p ? `https://www.linkedin.com/${p}/` : null
}

function readLedger(file: string): LedgerRow[] {
  if (!fs.existsSync(file)) throw new Error(`ledger not found: ${file}`)
  const rows: LedgerRow[] = []
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return
      try {
        rows.push(JSON.parse(trimmed) as LedgerRow)
      } catch {
        throw new Error(`${file}:${i + 1} is not valid JSON — refusing to guess`)
      }
    })
  return rows
}

function variantLabel(action: string, variantKey: string | undefined): string {
  const key = variantKey && variantKey.trim() ? variantKey.trim() : 'unrecorded'
  return action === 'first_message' ? `first-message/${key}` : key
}

function pad(n: number | string, w = 5): string {
  return String(n).padStart(w)
}

async function selectAll<T>(
  sb: SupabaseClient,
  table: string,
  columns: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: (q: any) => any = (q) => q
): Promise<T[]> {
  const page = 1000
  const out: T[] = []
  for (let from = 0; ; from += page) {
    const { data, error } = await apply(sb.from(table).select(columns).range(from, from + page - 1))
    if (error) throw new Error(`${table}: ${error.message}`)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < page) return out
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n▸ ${DRY_RUN ? 'DRY RUN — ' : ''}import-linkedin-ledger`)
  console.log(`  ledger   ${LEDGER}`)

  // 1. Read ------------------------------------------------------------------
  const rows = readLedger(LEDGER)
  const byType = new Map<string, number>()
  for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + 1)
  console.log(`  rows     ${rows.length}  (${[...byType].map(([t, n]) => `${t} ${n}`).join(', ')})`)

  const sends = rows.filter((r): r is LedgerSend => r.type === 'send')
  const outcomes = rows.filter((r): r is LedgerOutcome => r.type === 'outcome')

  const skippedByAction = new Map<string, number>()
  const noUrl: string[] = []
  const toImport: LedgerSend[] = []
  for (const s of sends) {
    if (!IMPORTED_ACTIONS.has(s.action)) {
      skippedByAction.set(s.action, (skippedByAction.get(s.action) ?? 0) + 1)
      continue
    }
    if (!normaliseLinkedinUrl(s.prospect?.profile_url)) {
      noUrl.push(`${s.id} ${s.action} ${s.prospect?.name ?? '(no name)'}`)
      continue
    }
    toImport.push(s)
  }
  const skippedPosts = byType.get('post') ?? 0
  const skippedNotes = byType.get('note') ?? 0
  const skippedHalts = byType.get('halt') ?? 0

  // Duplicate ledger ids would make the upsert silently keep one; say so.
  const seenIds = new Set<string>()
  const dupIds = toImport.filter((s) => {
    const id = s.id.toLowerCase()
    if (seenIds.has(id)) return true
    seenIds.add(id)
    return false
  })
  if (dupIds.length) throw new Error(`duplicate send ids in ledger: ${dupIds.map((s) => s.id).join(', ')}`)

  const badOutcomes = outcomes.filter((o) => !OUTCOME_VALUES.has(o.outcome))
  if (badOutcomes.length) {
    throw new Error(
      `outcome values not in the 037 check: ${[...new Set(badOutcomes.map((o) => o.outcome))].join(', ')}`
    )
  }

  // 2. Preflight ---------------------------------------------------------------
  console.log('\n▸ Preflight')
  const sb = await createServiceClient()

  const { data: users, error: usersError } = await sb.auth.admin.listUsers({ perPage: 200 })
  if (usersError) throw new Error(`auth.admin.listUsers: ${usersError.message}`)
  const approver = users.users.find((u) => u.email?.toLowerCase() === APPROVER_EMAIL.toLowerCase())
  if (!approver) throw new Error(`no auth user with email ${APPROVER_EMAIL}`)
  console.log(`  ✅ approver ${APPROVER_EMAIL} → ${approver.id}`)

  const { data: brand, error: brandError } = await sb
    .from('marketing_brand_profiles')
    .select('id,slug')
    .eq('is_default', true)
    .maybeSingle<{ id: string; slug: string }>()
  if (brandError) throw new Error(`brand profile: ${brandError.message}`)
  if (!brand) throw new Error('no default brand profile (is_default = true)')
  console.log(`  ✅ brand profile ${brand.slug} → ${brand.id}`)

  const { data: segments, error: segError } = await sb.from('marketing_segments').select('id,slug')
  if (segError) throw new Error(`segments: ${segError.message}`)
  const segmentIdBySlug = new Map((segments ?? []).map((s) => [s.slug as string, s.id as string]))
  const segmentIdForTag = (tag: string | undefined): string | null => {
    const slug = tag ? SEGMENT_SLUGS[tag] : undefined
    return slug ? (segmentIdBySlug.get(slug) ?? null) : null
  }
  const tagsSeen = [...new Set(toImport.map((s) => s.segment ?? 'untagged'))]
  console.log(
    `  ✅ segments: ${tagsSeen
      .map((t) => {
        const slug = SEGMENT_SLUGS[t]
        if (!slug) return `${t} → null`
        return `${t} → ${segmentIdBySlug.has(slug) ? slug : `${slug} (MISSING)`}`
      })
      .join(', ')}`
  )

  const { error: metaError } = await sb.from('marketing_sends').select('metadata').limit(1)
  const has037 = !metaError
  console.log(`  ${has037 ? '✅' : '❌'} migration 037 (marketing_sends.metadata)`)
  if (!has037 && !DRY_RUN) throw new Error('apply migration 037 first: npm run db:migrate -- 037')

  const existingProspects = await selectAll<{ id: string; linkedin_url: string | null; email: string | null }>(
    sb,
    'marketing_prospects',
    'id,linkedin_url,email'
  )
  const prospectIdByUrl = new Map<string, string>()
  const dupUrls: string[] = []
  for (const p of existingProspects) {
    const url = normaliseLinkedinUrl(p.linkedin_url)
    if (!url) continue
    if (prospectIdByUrl.has(url)) dupUrls.push(url)
    prospectIdByUrl.set(url, p.id)
  }
  console.log(
    `  ${dupUrls.length ? '⚠' : '✅'} live linkedin_url duplicates: ${dupUrls.length}` +
      (dupUrls.length ? ` — ${dupUrls.slice(0, 5).join(', ')}` : '')
  )

  // 3. Prospects ---------------------------------------------------------------
  // One prospect per normalised URL, from the EARLIEST send that names it — the
  // connection request, which is the row with the segment tag.
  const prospectsByUrl = new Map<string, Record<string, unknown>>()
  const sorted = [...toImport].sort(
    (a, b) => Date.parse(a.sent_at ?? a.ts) - Date.parse(b.sent_at ?? b.ts)
  )
  for (const s of sorted) {
    const url = normaliseLinkedinUrl(s.prospect?.profile_url)
    if (!url || prospectsByUrl.has(url)) continue
    const p = s.prospect ?? {}
    const name = (p.name ?? '').trim()
    const company = (p.company ?? '').trim()
    const title = (p.title ?? '').trim()
    const eng = s.sourcing?.kind === 'engagement' ? s.sourcing.engagement : undefined
    const signals = eng
      ? [
          {
            kind: 'linkedin_engagement',
            observed_at: eng.observed_at ?? s.sent_at ?? s.ts,
            evidence: `${eng.action ?? 'engaged'} on ${eng.post_url ?? '?'}`,
            url: eng.post_url ?? null,
          },
        ]
      : []
    prospectsByUrl.set(url, {
      segment_id: segmentIdForTag(s.segment),
      company: company || name || url,
      contact_name: name || null,
      linkedin_url: url,
      location: (p.location ?? '').trim() || null,
      notes: title ? `LinkedIn title: ${title}` : null,
      source: SOURCE,
      signals,
      qualified: null,
    })
  }
  const prospectsToInsert = [...prospectsByUrl.entries()].filter(([url]) => !prospectIdByUrl.has(url))
  const prospectsExisting = prospectsByUrl.size - prospectsToInsert.length

  // 4. Campaigns ---------------------------------------------------------------
  const campaignKeys = [...new Set(toImport.map((s) => s.campaign ?? 'untagged'))]
  const { data: liveCampaigns, error: campError } = await sb
    .from('marketing_campaigns')
    .select('id,name')
    .eq('channel', 'linkedin')
  if (campError) throw new Error(`campaigns: ${campError.message}`)
  const campaignIdByName = new Map((liveCampaigns ?? []).map((c) => [c.name as string, c.id as string]))
  const campaignsToInsert = campaignKeys.filter((k) => !campaignIdByName.has(k))

  // 5. Variants ----------------------------------------------------------------
  const variantKeys = new Map<
    string,
    { campaign: string; action: string; variant_key: string | undefined; label: string }
  >()
  for (const s of toImport) {
    const campaign = s.campaign ?? 'untagged'
    const label = variantLabel(s.action, s.variant_key)
    variantKeys.set(`${campaign} ${label}`, { campaign, action: s.action, variant_key: s.variant_key, label })
  }
  const liveVariants = campaignIdByName.size
    ? await selectAll<{ id: string; campaign_id: string; label: string | null }>(
        sb,
        'marketing_variants',
        'id,campaign_id,label',
        (q) => q.in('campaign_id', [...campaignIdByName.values()])
      )
    : []
  const variantIdByKey = new Map<string, string>()
  for (const v of liveVariants) {
    const name = [...campaignIdByName].find(([, id]) => id === v.campaign_id)?.[0]
    if (name && v.label) variantIdByKey.set(`${name} ${v.label}`, v.id)
  }
  const variantsToInsert = [...variantKeys.entries()].filter(([k]) => !variantIdByKey.has(k))

  // 6. Sends -------------------------------------------------------------------
  const liveSendIds = new Set(
    (await selectAll<{ id: string }>(sb, 'marketing_sends', 'id', (q) => q.eq('channel', 'linkedin'))).map(
      (s) => s.id
    )
  )
  const sendsNew = toImport.filter((s) => !liveSendIds.has(s.id.toLowerCase()))
  const sendsExisting = toImport.length - sendsNew.length

  // 7. Outcomes ----------------------------------------------------------------
  const importedSendIds = new Set(toImport.map((s) => s.id.toLowerCase()))
  const outcomesForImported = outcomes.filter((o) => importedSendIds.has(o.send_id.toLowerCase()))
  const outcomesOrphan = outcomes.length - outcomesForImported.length
  const liveOutcomeSendIds = new Set(
    importedSendIds.size
      ? (
          await selectAll<{ send_id: string }>(sb, 'marketing_outcomes', 'send_id', (q) =>
            q.in('send_id', [...importedSendIds])
          )
        ).map((o) => o.send_id)
      : []
  )
  const outcomesNew = outcomesForImported.filter((o) => !liveOutcomeSendIds.has(o.send_id.toLowerCase()))

  // Plan -----------------------------------------------------------------------
  console.log('\n▸ Plan')
  console.log(
    `  sends       ${pad(toImport.length)} to import  (${pad(sendsNew.length)} new, ${pad(sendsExisting)} already on file)`
  )
  console.log(
    `  skipped     ${[...skippedByAction].map(([a, n]) => `${n} ${a}`).join(', ')}` +
      `, ${skippedPosts} post, ${skippedNotes} note, ${skippedHalts} halt` +
      (noUrl.length ? `, ${noUrl.length} without a profile URL` : '')
  )
  for (const n of noUrl) console.log(`                ${n}`)
  console.log(
    `  prospects   ${pad(prospectsByUrl.size)} distinct   (${pad(prospectsToInsert.length)} new, ${pad(prospectsExisting)} already on file)`
  )
  console.log(`  campaigns   ${pad(campaignKeys.length)} distinct   (${pad(campaignsToInsert.length)} new)`)
  console.log(
    `  variants    ${pad(variantKeys.size)} distinct   (${pad(variantsToInsert.length)} new, all status retired)`
  )
  console.log(
    `  outcomes    ${pad(outcomesForImported.length)} on imported sends (${pad(outcomesNew.length)} new, ${pad(
      outcomesForImported.length - outcomesNew.length
    )} already on file` + (outcomesOrphan ? `, ${outcomesOrphan} orphan — no imported send)` : ')')
  )

  if (DRY_RUN) {
    console.log('\n✅ --dry-run set, nothing written.\n')
    return
  }
  if (!has037) throw new Error('unreachable')

  // Write ----------------------------------------------------------------------
  console.log('\n▸ Writing')

  // Prospects
  let prospectsInserted = 0
  for (let i = 0; i < prospectsToInsert.length; i += CHUNK) {
    const chunk = prospectsToInsert.slice(i, i + CHUNK).map(([, row]) => row)
    const { data, error } = await sb.from('marketing_prospects').insert(chunk).select('id,linkedin_url')
    if (error) throw new Error(`prospects insert at ${i}: ${error.message}`)
    for (const p of data ?? []) {
      const url = normaliseLinkedinUrl(p.linkedin_url as string)
      if (url) prospectIdByUrl.set(url, p.id as string)
    }
    prospectsInserted += chunk.length
  }
  console.log(`  prospects   +${prospectsInserted}`)

  // Campaigns
  for (const name of campaignsToInsert) {
    const { data, error } = await sb
      .from('marketing_campaigns')
      .insert({
        brand_profile_id: brand.id,
        name,
        channel: 'linkedin',
        goal:
          'Imported from the brain LinkedIn ledger (projects/linkedin-agent/ledger.jsonl). ' +
          'Connections, not sales — see the brain decision of 2026-08-06.',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(`campaign insert ${name}: ${error.message}`)
    campaignIdByName.set(name, data.id as string)
  }
  console.log(`  campaigns   +${campaignsToInsert.length}`)

  // Variants
  for (const [key, v] of variantsToInsert) {
    const campaignId = campaignIdByName.get(v.campaign)
    if (!campaignId) throw new Error(`no campaign id for ${v.campaign}`)
    const { data, error } = await sb
      .from('marketing_variants')
      .insert({
        campaign_id: campaignId,
        label: v.label,
        subject: null,
        body: null,
        generation_prompt:
          `Imported from the brain LinkedIn ledger on ${new Date().toISOString().slice(0, 10)}. ` +
          `One variant per (campaign, action, variant_key): this row is ${v.action} / ${v.variant_key ?? 'unrecorded'}. ` +
          'The copy was drafted per prospect by a Claude Code session running .claude/skills/linkedin-run/SKILL.md ' +
          "against the prospect's own profile, so there is no template body — each send's rendered_body is the note as sent. " +
          "Retired on import so the outreach agent's gate can never deal it into an email queue.",
        generation_config: {
          transport: 'ledger-import',
          channel: 'linkedin',
          action: v.action,
          variant_key: v.variant_key ?? null,
        },
        model: MODEL,
        status: 'retired',
      })
      .select('id')
      .single()
    if (error) throw new Error(`variant insert ${v.campaign}/${v.label}: ${error.message}`)
    variantIdByKey.set(key, data.id as string)
  }
  console.log(`  variants    +${variantsToInsert.length}`)

  // Sends — upsert on the ledger id. A (campaign, prospect, variant) collision
  // with a DIFFERENT id is the unique constraint from 025 doing its job; it is
  // reported and skipped rather than worked around.
  const liveTriples = new Set(
    (
      await selectAll<{ campaign_id: string; prospect_id: string; variant_id: string }>(
        sb,
        'marketing_sends',
        'campaign_id,prospect_id,variant_id',
        (q) => q.eq('channel', 'linkedin')
      )
    ).map((s) => `${s.campaign_id}/${s.prospect_id}/${s.variant_id}`)
  )
  const sendRows: Record<string, unknown>[] = []
  const collisions: string[] = []
  for (const s of sendsNew) {
    const url = normaliseLinkedinUrl(s.prospect?.profile_url)
    const prospectId = url ? prospectIdByUrl.get(url) : undefined
    const campaignId = campaignIdByName.get(s.campaign ?? 'untagged')
    const variantId = variantIdByKey.get(`${s.campaign ?? 'untagged'} ${variantLabel(s.action, s.variant_key)}`)
    if (!prospectId || !campaignId || !variantId) {
      throw new Error(
        `unresolved ids for send ${s.id}: prospect=${prospectId} campaign=${campaignId} variant=${variantId}`
      )
    }
    const triple = `${campaignId}/${prospectId}/${variantId}`
    if (liveTriples.has(triple)) {
      collisions.push(`${s.id} ${s.action} ${s.prospect?.name ?? ''} — (campaign, prospect, variant) already has a send`)
      continue
    }
    liveTriples.add(triple)
    const sentAt = s.sent_at ?? s.ts
    const kind = s.sourcing?.kind && SOURCING_KINDS.has(s.sourcing.kind) ? s.sourcing.kind : 'unknown'
    sendRows.push({
      id: s.id.toLowerCase(),
      campaign_id: campaignId,
      variant_id: variantId,
      prospect_id: prospectId,
      channel: 'linkedin',
      status: 'sent',
      rendered_subject: null,
      rendered_body: s.rendered_body ?? null,
      template: 'plain',
      approved_by: approver.id,
      approved_at: s.approved_at ?? sentAt,
      sent_at: sentAt,
      step_no: s.action === 'first_message' ? 2 : 1,
      metadata: {
        ledger_id: s.id,
        action: s.action,
        segment: s.segment ?? null,
        campaign_key: s.campaign ?? null,
        variant_key: s.variant_key ?? null,
        disclosure: s.disclosure ?? null,
        generator: s.generator ?? null,
        sourcing_kind: kind,
        sourcing: s.sourcing ?? null,
        note_features: s.note_features ?? null,
        notes: s.notes ?? null,
        in_reply_to_send_id: s.in_reply_to_send_id ?? null,
        drafted_but_unsent_body: s.drafted_but_unsent_body ?? null,
        drafted_but_unsent_features: s.drafted_but_unsent_features ?? null,
        approved_by_label: s.approved_by ?? null,
        approved_at_source: s.approved_at ? 'ledger' : 'sent_at',
        prospect_snapshot: s.prospect ?? null,
        imported_at: new Date().toISOString(),
      },
    })
  }
  let sendsInserted = 0
  for (let i = 0; i < sendRows.length; i += CHUNK) {
    const chunk = sendRows.slice(i, i + CHUNK)
    const { error } = await sb.from('marketing_sends').upsert(chunk, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`sends upsert at ${i}: ${error.message}`)
    sendsInserted += chunk.length
  }
  console.log(
    `  sends       +${sendsInserted}${collisions.length ? `   (${collisions.length} skipped on (campaign, prospect, variant) collision)` : ''}`
  )
  for (const c of collisions) console.log(`                ${c}`)

  // Outcomes — only for sends that are now on file.
  const importedNow = new Set([...liveSendIds, ...sendRows.map((r) => r.id as string)])
  const outcomeRows = outcomesNew
    .filter((o) => importedNow.has(o.send_id.toLowerCase()))
    .map((o) => ({
      send_id: o.send_id.toLowerCase(),
      outcome: o.outcome,
      scored_by: 'human',
      rationale: o.detail ?? null,
      scored_at: o.ts,
    }))
  let outcomesInserted = 0
  for (let i = 0; i < outcomeRows.length; i += CHUNK) {
    const chunk = outcomeRows.slice(i, i + CHUNK)
    const { error } = await sb
      .from('marketing_outcomes')
      .upsert(chunk, { onConflict: 'send_id', ignoreDuplicates: true })
    if (error) throw new Error(`outcomes upsert at ${i}: ${error.message}`)
    outcomesInserted += chunk.length
  }
  console.log(`  outcomes    +${outcomesInserted}`)

  // Verify ---------------------------------------------------------------------
  console.log('\n▸ Verify')
  const { data: perf, error: perfError } = await sb
    .from('marketing_sourcing_performance')
    .select('*')
    .eq('channel', 'linkedin')
  if (perfError) {
    console.log(`  ⚠ marketing_sourcing_performance: ${perfError.message}`)
  } else {
    for (const r of perf ?? []) {
      console.log(
        `  linkedin / ${String(r.sourcing_kind).padEnd(15)} sends ${pad(r.sends, 4)}  resolved ${pad(r.resolved, 4)}  accepted ${pad(r.accepted, 4)}  rate ${r.acceptance_rate ?? '—'}`
      )
    }
    console.log('  → compare resolved/accepted with `node scripts/linkedin-quota.mjs` health in the brain repo')
  }
  console.log('\n✅ Done. Run again with --dry-run: every "new" count should be 0.\n')
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
