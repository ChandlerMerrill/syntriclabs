import { Parser } from 'node-sql-parser'
import type { AST, Select, Update, Insert_Replace } from 'node-sql-parser'

export { Parser }

export type AllowedTable = keyof typeof ALLOWLISTED_TABLES

interface TableRule {
  read: boolean
  insert: boolean
  update: boolean
  blockedCols: string[]
}

export const ALLOWLISTED_TABLES = {
  clients:         { read: true, insert: true,  update: true,  blockedCols: ['id', 'created_at'] },
  client_contacts: { read: true, insert: true,  update: true,  blockedCols: ['id', 'created_at'] },
  deals:           { read: true, insert: true,  update: true,  blockedCols: ['id', 'created_at', 'stage_history'] },
  projects:        { read: true, insert: true,  update: true,  blockedCols: ['id', 'created_at'] },
  activities:      { read: true, insert: true,  update: false, blockedCols: ['id', 'created_at'] },
  documents:       { read: true, insert: false, update: true,  blockedCols: ['id', 'created_at', 'storage_path', 'content_data'] },
  emails:          { read: true, insert: false, update: true,  blockedCols: ['*', '!client_id', '!is_read'] },
  transcripts:     { read: true, insert: false, update: true,  blockedCols: ['*', '!client_id'] },
  widget_leads:    { read: true, insert: true,  update: true,  blockedCols: ['id', 'created_at'] },
  conversations:   { read: true, insert: false, update: false, blockedCols: [] },
  messages:        { read: true, insert: false, update: false, blockedCols: [] },
  ai_actions:      { read: true, insert: false, update: false, blockedCols: [] },
} as const satisfies Record<string, TableRule>

export const ALLOWED_TABLE_NAMES: string[] = Object.keys(ALLOWLISTED_TABLES)

export type ValidationResult =
  | { ok: true; normalized: string; targetTables: string[]; statementType: 'select' | 'insert' | 'update'; injectedLimit: boolean }
  | { ok: false; error: string }

const parser = new Parser()
const AUTO_LIMIT = 500

/**
 * Parse + validate a SQL query. Enforces:
 *   - single statement
 *   - statement type matches mode (SELECT for read; INSERT/UPDATE for write — DELETE always rejected)
 *   - all referenced tables are on the allowlist (and readable/insertable/updatable per rule)
 *   - for UPDATE/INSERT: targeted columns are not in the per-table blocklist
 *   - auto-injects LIMIT 500 onto unbounded top-level SELECTs
 */
export function parseAndValidate(query: string, mode: 'read' | 'write'): ValidationResult {
  const trimmed = query.trim().replace(/;+\s*$/, '')
  if (!trimmed) return { ok: false, error: 'Empty query.' }

  let astRaw: AST | AST[]
  try {
    astRaw = parser.astify(trimmed, { database: 'postgresql' })
  } catch (err) {
    return { ok: false, error: `SQL parse error: ${err instanceof Error ? err.message : String(err)}` }
  }

  const asts = Array.isArray(astRaw) ? astRaw : [astRaw]
  if (asts.length === 0) return { ok: false, error: 'No parseable statement.' }
  if (asts.length > 1) return { ok: false, error: 'Only one statement is allowed per call.' }

  const ast = asts[0]
  const type = ast.type

  if (type === 'delete') {
    return {
      ok: false,
      error: 'DELETE is not allowed via SQL tools. Use archiveClient / dismissLead / archiveDeal for soft-deletes, or hardDeleteClient / hardDeleteContact / hardDeleteLead (confirm-token flow) for permanent removal.',
    }
  }
  if (type === 'drop' || type === 'alter' || type === 'create' || type === 'use') {
    return { ok: false, error: `Schema changes (${type.toUpperCase()}) are not allowed.` }
  }

  if (mode === 'read' && type !== 'select') {
    return { ok: false, error: `querySql only accepts SELECT statements (got ${type.toUpperCase()}).` }
  }
  if (mode === 'write' && type !== 'insert' && type !== 'update') {
    return { ok: false, error: `writeSql only accepts INSERT or UPDATE (got ${type.toUpperCase()}). Use querySql for reads.` }
  }

  // Gather referenced tables via the parser's helper (includes CTEs, joins).
  let tableRefs: string[]
  try {
    tableRefs = parser.tableList(trimmed, { database: 'postgresql' })
  } catch (err) {
    return { ok: false, error: `Unable to resolve tables: ${err instanceof Error ? err.message : String(err)}` }
  }

  // tableList entries look like: "{select|insert|update|delete}::{db}::{table}"
  const tablesReferenced: { op: string; schema: string; table: string }[] = []
  for (const entry of tableRefs) {
    const [op, schema, table] = entry.split('::')
    tablesReferenced.push({ op: (op ?? '').toLowerCase(), schema: schema ?? 'null', table: table ?? '' })
  }

  for (const t of tablesReferenced) {
    if (t.schema !== 'null' && t.schema !== 'public') {
      return {
        ok: false,
        error: `Schema '${t.schema}' is not allowed. Only the 'public' schema is accessible. Allowed tables: ${ALLOWED_TABLE_NAMES.join(', ')}.`,
      }
    }
    const rule = ALLOWLISTED_TABLES[t.table as AllowedTable]
    if (!rule) {
      return {
        ok: false,
        error: `Table '${t.table}' is not in the allowlist. Allowed tables: ${ALLOWED_TABLE_NAMES.join(', ')}.`,
      }
    }
    if (t.op === 'select' && !rule.read) {
      return { ok: false, error: `Table '${t.table}' is not readable.` }
    }
    if (t.op === 'insert' && !rule.insert) {
      return { ok: false, error: `INSERT into '${t.table}' is not allowed via SQL. Use a typed tool instead.` }
    }
    if (t.op === 'update' && !rule.update) {
      return { ok: false, error: `UPDATE on '${t.table}' is not allowed via SQL. Use a typed tool instead.` }
    }
  }

  // Column blocklist for INSERT / UPDATE.
  if (type === 'update') {
    const u = ast as Update
    const tableName = getPrimaryTableName(u.table) ?? ''
    const rule = ALLOWLISTED_TABLES[tableName as AllowedTable]
    if (!rule) return { ok: false, error: `Unknown UPDATE target '${tableName}'.` }
    const touched = (u.set ?? []).map(s => s.column).filter(Boolean) as string[]
    const colCheck = checkColumnBlocklist(touched, rule.blockedCols, tableName, 'update')
    if (!colCheck.ok) return colCheck
  }
  if (type === 'insert') {
    const i = ast as Insert_Replace
    const tableEntry = Array.isArray(i.table) ? i.table[0] : i.table
    const tableName = (tableEntry && typeof tableEntry === 'object' && 'table' in tableEntry ? (tableEntry as { table: string }).table : '') ?? ''
    const rule = ALLOWLISTED_TABLES[tableName as AllowedTable]
    if (!rule) return { ok: false, error: `Unknown INSERT target '${tableName}'.` }
    const touched = (i.columns ?? []) as string[]
    if (touched.length === 0) {
      return { ok: false, error: `INSERT must specify explicit columns (INSERT INTO ${tableName} (col1, col2, ...) VALUES ...).` }
    }
    const colCheck = checkColumnBlocklist(touched, rule.blockedCols, tableName, 'insert')
    if (!colCheck.ok) return colCheck
  }

  // Auto-inject LIMIT for unbounded SELECT.
  let normalized = trimmed
  let injectedLimit = false
  if (type === 'select') {
    const s = ast as Select
    if (!s.limit || !s.limit.value || s.limit.value.length === 0) {
      normalized = `${normalized} LIMIT ${AUTO_LIMIT}`
      injectedLimit = true
    }
  }

  const targetTables = Array.from(new Set(tablesReferenced.map(t => t.table)))
  return {
    ok: true,
    normalized,
    targetTables,
    statementType: type as 'select' | 'insert' | 'update',
    injectedLimit,
  }
}

/**
 * Given a validated UPDATE query, build the equivalent `SELECT * FROM <table> WHERE <where>`
 * that matches the rows this UPDATE will modify. Used to snapshot a pre-image for reversalHint.
 * Returns null if we cannot cleanly reconstruct.
 */
export function buildPreImageSelectForUpdate(query: string): { sql: string; table: string } | null {
  try {
    const astRaw = parser.astify(query.trim().replace(/;+\s*$/, ''), { database: 'postgresql' })
    const ast = Array.isArray(astRaw) ? astRaw[0] : astRaw
    if (!ast || ast.type !== 'update') return null
    const u = ast as Update
    const tableName = getPrimaryTableName(u.table)
    if (!tableName) return null
    const selectAst = {
      with: null,
      type: 'select',
      options: null,
      distinct: null,
      columns: [{ expr: { type: 'column_ref', table: null, column: '*' }, as: null }],
      from: [{ db: null, table: tableName, as: null }],
      where: u.where,
      groupby: { columns: null, modifiers: [] },
      having: null,
      orderby: null,
      limit: { seperator: '', value: [{ type: 'number', value: 500 }] },
    } as unknown as AST
    const sql = parser.sqlify(selectAst, { database: 'postgresql' })
    return { sql, table: tableName }
  } catch {
    return null
  }
}

/**
 * Given a validated INSERT query, return the INSERT with a `RETURNING id` appended if not present.
 * Used to capture inserted row IDs for reversalHint.
 */
export function ensureInsertReturning(query: string): string {
  const trimmed = query.trim().replace(/;+\s*$/, '')
  if (/\breturning\b/i.test(trimmed)) return trimmed
  return `${trimmed} RETURNING id`
}

/**
 * Get the primary target table name for INSERT or UPDATE (used by tools for logging).
 */
export function getTargetTable(query: string): string | null {
  try {
    const astRaw = parser.astify(query.trim().replace(/;+\s*$/, ''), { database: 'postgresql' })
    const ast = Array.isArray(astRaw) ? astRaw[0] : astRaw
    if (!ast) return null
    if (ast.type === 'update') return getPrimaryTableName((ast as Update).table)
    if (ast.type === 'insert') {
      const i = ast as Insert_Replace
      const entry = Array.isArray(i.table) ? i.table[0] : i.table
      return (entry && typeof entry === 'object' && 'table' in entry ? (entry as { table: string }).table : null) ?? null
    }
    return null
  } catch {
    return null
  }
}

function getPrimaryTableName(table: unknown): string | null {
  if (!table) return null
  if (Array.isArray(table) && table.length > 0) {
    const first = table[0] as { table?: string }
    return first.table ?? null
  }
  if (typeof table === 'object' && 'table' in (table as Record<string, unknown>)) {
    return (table as { table: string }).table
  }
  return null
}

export function isColumnWritable(column: string, blocked: readonly string[]): boolean {
  if (blocked.includes('*')) {
    const allowed = blocked.filter(c => c.startsWith('!')).map(c => c.slice(1))
    return allowed.includes(column)
  }
  return !blocked.includes(column)
}

function checkColumnBlocklist(
  touchedColumns: string[],
  blocked: readonly string[],
  tableName: string,
  op: 'insert' | 'update',
): { ok: true } | { ok: false; error: string } {
  const hasWildcard = blocked.includes('*')
  if (hasWildcard) {
    // Whitelist mode: only columns explicitly listed with '!' prefix are allowed.
    const allowed = blocked.filter(c => c.startsWith('!')).map(c => c.slice(1))
    for (const col of touchedColumns) {
      if (!allowed.includes(col)) {
        return {
          ok: false,
          error: `Column '${col}' on '${tableName}' cannot be ${op === 'insert' ? 'inserted' : 'updated'} via SQL. Allowed columns: ${allowed.join(', ') || '(none)'}.`,
        }
      }
    }
    return { ok: true }
  }
  for (const col of touchedColumns) {
    if (blocked.includes(col)) {
      return {
        ok: false,
        error: `Column '${col}' on '${tableName}' cannot be ${op === 'insert' ? 'inserted' : 'updated'} via SQL. Use the appropriate typed tool instead.`,
      }
    }
  }
  return { ok: true }
}
