import type { SupabaseClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import type { AIActionRow } from '@/lib/services/ai-actions'

type UnknownRecord = Record<string, unknown>

export interface UndoResult {
  ok: true
  summary: string
  warning?: string
}

export interface UndoError {
  ok: false
  error: string
}

export type UndoOutcome = UndoResult | UndoError

type ReversalHint = {
  kind: string
  [key: string]: unknown
}

function err(msg: string): UndoError {
  return { ok: false, error: msg }
}

function pickHint(row: AIActionRow): ReversalHint | null {
  if (!row.reversal_hint || typeof row.reversal_hint !== 'object') return null
  const h = row.reversal_hint as ReversalHint
  if (typeof h.kind !== 'string') return null
  return h
}

/**
 * Executes the inverse of a previously-recorded ai_actions row.
 * Every row that carries a reversalHint knows how to reverse itself; this file
 * dispatches by `kind` to the right handler.
 *
 * The caller (POST /api/ai/undo) is responsible for recording a new ai_actions
 * row for the undo itself (tool_name: 'undo') and setting `undone_at` + `undone_by_action_id`
 * on the original row.
 */
export async function executeUndo(
  supabase: SupabaseClient,
  row: AIActionRow
): Promise<UndoOutcome> {
  if (row.undone_at) return err(`Already undone at ${row.undone_at}.`)
  if (row.status !== 'success') return err('Cannot undo a failed action.')

  const hint = pickHint(row)
  if (!hint) return err('This action has no reversal hint and cannot be auto-undone.')

  try {
    switch (hint.kind) {
      case 'updateClient':
        return await undoPatch(supabase, 'clients', hint.clientId as string, hint.prev as UnknownRecord)
      case 'updateContact':
        return await undoPatch(supabase, 'client_contacts', hint.contactId as string, hint.prev as UnknownRecord)
      case 'updateDeal':
        return await undoPatch(supabase, 'deals', hint.dealId as string, hint.prev as UnknownRecord)
      case 'updateProject':
        return await undoPatch(supabase, 'projects', hint.projectId as string, hint.prev as UnknownRecord)
      case 'updateLead':
        return await undoPatch(supabase, 'widget_leads', hint.leadId as string, hint.prev as UnknownRecord)

      case 'archiveClient':
        return await undoPatch(supabase, 'clients', hint.clientId as string, (hint.prev as UnknownRecord) ?? {})
      case 'archiveDeal':
        return await undoPatch(supabase, 'deals', hint.dealId as string, {
          is_archived: false,
          archived_at: null,
          archive_reason: null,
        })
      case 'dismissLead':
        return await undoPatch(supabase, 'widget_leads', hint.leadId as string, (hint.prev as UnknownRecord) ?? {})

      case 'updateDealStage': {
        const prev = (hint.prev as UnknownRecord) ?? {}
        return await undoPatch(supabase, 'deals', hint.dealId as string, {
          stage: prev.stage,
          stage_history: prev.stage_history,
          actual_close_date: prev.actual_close_date ?? null,
          lost_reason: prev.lost_reason ?? null,
        })
      }

      case 'updateProjectStatus':
        return await undoPatch(supabase, 'projects', hint.projectId as string, (hint.prev as UnknownRecord) ?? {})

      case 'hardDeleteClient': {
        const rows = Array.isArray(hint.rows) ? (hint.rows as UnknownRecord[]) : null
        if (!rows || rows.length === 0) return err('Snapshot missing — cannot restore client(s).')
        return await restoreMany(rows, (r) => restoreClient(supabase, r), 'client')
      }
      case 'hardDeleteContact': {
        const rows = Array.isArray(hint.rows) ? (hint.rows as UnknownRecord[]) : null
        if (!rows || rows.length === 0) return err('Snapshot missing — cannot restore contact(s).')
        return await restoreMany(rows, (r) => restoreRow(supabase, 'client_contacts', r, 'contact'), 'contact')
      }
      case 'hardDeleteLead': {
        const rows = Array.isArray(hint.rows) ? (hint.rows as UnknownRecord[]) : null
        if (!rows || rows.length === 0) return err('Snapshot missing — cannot restore lead(s).')
        return await restoreMany(rows, (r) => restoreRow(supabase, 'widget_leads', r, 'lead'), 'lead')
      }

      case 'writeSql-update':
        return await undoWriteSqlUpdate(hint.table as string, (hint.pre as UnknownRecord[]) ?? [])
      case 'writeSql-insert':
        return await undoWriteSqlInsert(hint.table as string, (hint.insertedIds as unknown[]) ?? [])

      default:
        return err(`Reversal kind "${hint.kind}" is not supported for auto-undo.`)
    }
  } catch (e) {
    return err(`Undo failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function undoPatch(
  supabase: SupabaseClient,
  table: string,
  rowId: string,
  prev: UnknownRecord
): Promise<UndoOutcome> {
  if (!rowId) return err('Reversal hint missing row id.')
  const patch: UnknownRecord = {}
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) continue
    patch[k] = v
  }
  if (Object.keys(patch).length === 0) return err('No previous values captured — cannot patch.')

  const { error } = await supabase.from(table).update(patch).eq('id', rowId)
  if (error) return err(error instanceof Error ? error.message : String(error))
  return {
    ok: true,
    summary: `Reverted ${table} ${rowId}: restored ${Object.keys(patch).join(', ')}`,
  }
}

// Short-circuits on the first DB failure but still reports how many rows were
// restored before the failure, so the user knows the undo was partial.
async function restoreMany(
  rows: UnknownRecord[],
  restoreOne: (row: UnknownRecord) => Promise<UndoOutcome>,
  label: string
): Promise<UndoOutcome> {
  let restored = 0
  const warnings: string[] = []
  for (const row of rows) {
    const res = await restoreOne(row)
    if (!res.ok) {
      const prefix = restored > 0 ? `Restored ${restored} of ${rows.length} ${label}(s) before failure. ` : ''
      return err(`${prefix}${res.error}`)
    }
    restored += 1
    if (res.warning) warnings.push(res.warning)
  }
  return {
    ok: true,
    summary: `Restored ${restored} ${label}${restored === 1 ? '' : 's'}.`,
    ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
  }
}

async function restoreRow(
  supabase: SupabaseClient,
  table: string,
  snapshot: UnknownRecord,
  label: string
): Promise<UndoOutcome> {
  const insert = stripJoinedRelations(snapshot)
  const { error } = await supabase.from(table).insert(insert)
  if (error) return err(error instanceof Error ? error.message : String(error))
  return { ok: true, summary: `Restored ${label} ${snapshot.id ?? ''}`.trim() }
}

async function restoreClient(
  supabase: SupabaseClient,
  snapshot: UnknownRecord
): Promise<UndoOutcome> {
  const contacts = Array.isArray(snapshot.client_contacts) ? (snapshot.client_contacts as UnknownRecord[]) : []
  const clientRow = stripJoinedRelations(snapshot)
  const { error: clientErr } = await supabase.from('clients').insert(clientRow)
  if (clientErr) return err(clientErr instanceof Error ? clientErr.message : String(clientErr))

  if (contacts.length > 0) {
    const contactRows = contacts.map(c => stripJoinedRelations(c))
    const { error: contactErr } = await supabase.from('client_contacts').insert(contactRows)
    if (contactErr) {
      return {
        ok: true,
        summary: `Restored client ${snapshot.company_name ?? snapshot.id}; failed to restore ${contacts.length} contact(s): ${contactErr instanceof Error ? contactErr.message : String(contactErr)}`,
        warning: 'Client restored but contacts failed — inspect the original snapshot.',
      }
    }
  }

  return {
    ok: true,
    summary: `Restored client ${snapshot.company_name ?? snapshot.id}${contacts.length > 0 ? ` + ${contacts.length} contact(s)` : ''}`,
  }
}

// Supabase `.select('*, client_contacts(*)')` embeds joined relations as either
// an array of row objects or a single nested object with an `id` field. Scalar
// jsonb arrays (e.g. `tags: ['foo']`, `stage_history: [...]`) must be preserved
// — we only drop arrays whose first element looks like a row (object with `id`).
function stripJoinedRelations(row: UnknownRecord): UnknownRecord {
  const out: UnknownRecord = {}
  for (const [k, v] of Object.entries(row)) {
    if (Array.isArray(v)) {
      const first = v[0]
      const looksLikeJoinedRows =
        first !== undefined && first !== null && typeof first === 'object' && 'id' in (first as UnknownRecord)
      if (looksLikeJoinedRows) continue
      out[k] = v
      continue
    }
    if (v !== null && typeof v === 'object' && 'id' in (v as UnknownRecord)) continue
    out[k] = v
  }
  return out
}

// ── SQL-path undo ──
//
// These two handlers are the ONLY code in the entire repo that runs DELETE or a
// raw-string UPDATE via Postgres. They are deliberately not routed through
// src/lib/ai/sql-safety.ts (which blocks DELETE by design). This is the
// server-side reverse of a write we made seconds ago, and it is gated to this
// module only.

let _undoSql: ReturnType<typeof postgres> | null = null
function getUndoClient() {
  if (_undoSql) return _undoSql
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error('POSTGRES_URL not set — cannot run SQL undo.')
  _undoSql = postgres(url, {
    prepare: false,
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  })
  return _undoSql
}

const UNDO_TABLE_ALLOWLIST = new Set([
  'clients',
  'client_contacts',
  'deals',
  'projects',
  'activities',
  'documents',
  'emails',
  'transcripts',
  'widget_leads',
  'conversations',
  'messages',
  'ai_actions',
])

async function undoWriteSqlUpdate(table: string, pre: UnknownRecord[]): Promise<UndoOutcome> {
  if (!UNDO_TABLE_ALLOWLIST.has(table)) return err(`Undo blocked: table "${table}" not in allowlist.`)
  if (pre.length === 0) return err('Pre-image is empty — nothing to revert.')

  const sql = getUndoClient()
  let reverted = 0
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL statement_timeout = 10000`)
    for (const row of pre) {
      const id = row.id
      if (typeof id !== 'string' || id.length === 0) continue
      const patch: UnknownRecord = {}
      for (const [k, v] of Object.entries(row)) {
        if (k === 'id') continue
        patch[k] = v
      }
      if (Object.keys(patch).length === 0) continue
      // postgres.js: `sql(obj)` in SET context emits `"col1" = $1, "col2" = $2, ...`.
      // `sql(identifier)` emits a safely-quoted identifier.
      await tx`update ${tx(table)} set ${tx(patch)} where id = ${id}`
      reverted += 1
    }
  })
  return { ok: true, summary: `Reverted ${reverted} row(s) in ${table} to pre-image.` }
}

async function undoWriteSqlInsert(table: string, insertedIds: unknown[]): Promise<UndoOutcome> {
  if (!UNDO_TABLE_ALLOWLIST.has(table)) return err(`Undo blocked: table "${table}" not in allowlist.`)
  const ids = insertedIds.filter((x): x is string => typeof x === 'string' && x.length > 0)
  if (ids.length === 0) return err('No inserted IDs captured — cannot delete.')

  const sql = getUndoClient()
  let deleted = 0
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL statement_timeout = 10000`)
    // NOTE: the ONLY DELETE in the non-service-layer code. Scoped to ids we
    // ourselves inserted moments ago, inside a short-timeout tx, gated to this
    // module. See plan: ai-os/plans/crm-write-tools-plan.md Phase 5.
    const res = await tx`delete from ${tx(table)} where id = any(${ids}::uuid[])`
    const count = (res as unknown as { count?: number }).count
    deleted = typeof count === 'number' ? count : (Array.isArray(res) ? res.length : 0)
  })
  return { ok: true, summary: `Deleted ${deleted} inserted row(s) from ${table}.` }
}

export function buttonLabelFor(hintKind: string): string {
  switch (hintKind) {
    case 'updateClient': return 'Revert client update'
    case 'updateContact': return 'Revert contact update'
    case 'updateDeal': return 'Revert deal update'
    case 'updateProject': return 'Revert project update'
    case 'updateLead': return 'Revert lead update'
    case 'archiveClient': return 'Undo archive'
    case 'archiveDeal': return 'Undo archive'
    case 'dismissLead': return 'Restore lead'
    case 'updateDealStage': return 'Revert stage change'
    case 'updateProjectStatus': return 'Revert status change'
    case 'hardDeleteClient': return 'Restore client'
    case 'hardDeleteContact': return 'Restore contact'
    case 'hardDeleteLead': return 'Restore lead'
    case 'writeSql-update': return 'Revert SQL update'
    case 'writeSql-insert': return 'Delete inserted rows'
    default: return 'Undo'
  }
}
