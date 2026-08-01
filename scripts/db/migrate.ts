/**
 * Applies SQL migrations against the Supabase database.
 *
 *   npm run db:migrate -- --dry-run     preflight only, writes nothing
 *   npm run db:migrate                  apply every migration file, in order
 *   npm run db:migrate -- 023 024       apply specific files by filename prefix
 *   npm run db:migrate -- --via=pg      force the direct connection
 *   npm run db:migrate -- --via=api     force the Management API
 *
 * Two transports, because the direct one has more ways to be unavailable than
 * to work — the pooler hostname, region, and database password all have to be
 * right, and `db.<ref>.supabase.co` is IPv6-only, which many home networks do
 * not route. The Management API needs only a personal access token and is
 * usually already configured.
 *
 * Both give the same guarantee: a migration file is sent as one multi-statement
 * batch, which Postgres wraps in an implicit transaction. A file lands whole or
 * not at all — verified against the API transport by deliberately failing a
 * batch and confirming its DDL did not survive.
 *
 * The preflight is not ceremony. These migration files are not self-contained:
 * `update_updated_at()` is called by 005, 007, 008 and 023-025 and defined by
 * none of them — it exists only in the live database, which also means
 * `supabase db reset` could not rebuild this schema from the repo as it stands.
 * Finding that out costs one round trip and beats discovering it with half a
 * schema written.
 *
 * Secrets are never printed. Only host and database name appear in output.
 */
import fs from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase/migrations')
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? ''

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const viaArg = args.find((a) => a.startsWith('--via='))?.split('=')[1]
const prefixes = args.filter((a) => !a.startsWith('--'))

type Row = Record<string, unknown>

interface Executor {
  label: string
  query(sql: string): Promise<Row[]>
  close(): Promise<void>
}

// ── Transport: direct Postgres connection ─────────────────────────────────

async function pgExecutor(): Promise<Executor | null> {
  const url = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL
  if (!url) return null

  let host: string
  try {
    const u = new URL(url)
    host = `${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return null
  }

  const { default: postgres } = await import('postgres')
  // prepare:false keeps this working through either pooler — the transaction
  // pooler rejects the extended (prepared-statement) protocol.
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, onnotice: () => {} })

  // Prove the connection before claiming it.
  await sql`select 1`

  return {
    label: `postgres ${host}`,
    async query(text: string) {
      return (await sql.unsafe(text).simple()) as unknown as Row[]
    },
    async close() {
      await sql.end()
    },
  }
}

// ── Transport: Supabase Management API ────────────────────────────────────

async function apiExecutor(): Promise<Executor | null> {
  const token =
    process.env.SUPABASE_MCP_PAT ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_MCP_ACCESS_TOKEN
  if (!token || !PROJECT_REF) return null

  const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

  async function query(text: string): Promise<Row[]> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text }),
    })
    const body = await res.text()
    if (!res.ok) {
      let message = body
      try {
        message = (JSON.parse(body) as { message?: string }).message ?? body
      } catch {
        /* keep the raw body */
      }
      throw new Error(message)
    }
    try {
      const parsed: unknown = JSON.parse(body)
      return Array.isArray(parsed) ? (parsed as Row[]) : []
    } catch {
      return []
    }
  }

  await query('select 1')

  return {
    label: `management API (project ${PROJECT_REF})`,
    query,
    async close() {},
  }
}

async function connect(): Promise<Executor> {
  const attempts: string[] = []

  if (viaArg !== 'api') {
    try {
      const pg = await pgExecutor()
      if (pg) return pg
      attempts.push('direct connection: no usable SUPABASE_DB_URL')
    } catch (err) {
      attempts.push(`direct connection: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (viaArg !== 'pg') {
    try {
      const api = await apiExecutor()
      if (api) {
        if (attempts.length) console.log(`  ▪ ${attempts[0]} — falling back to the Management API`)
        return api
      }
      attempts.push('management API: no access token or project ref')
    } catch (err) {
      attempts.push(`management API: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.error('\n❌ No usable connection:')
  for (const a of attempts) console.error(`   - ${a}`)
  console.error('')
  process.exit(1)
}

// ── Migration files ───────────────────────────────────────────────────────

function migrationFiles(): string[] {
  const all = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    // Skip the " 2.sql" iCloud duplicates.
    .filter((f) => !/ \d+\.sql$/.test(f))
    .sort()
  if (prefixes.length === 0) return all
  return all.filter((f) => prefixes.some((p) => f.startsWith(p)))
}

// ── Preflight / verify ────────────────────────────────────────────────────

async function preflight(db: Executor): Promise<string[]> {
  console.log('\n▸ Preflight')
  const blockers: string[] = []

  const [fn] = await db.query(`
    select exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'update_updated_at'
    ) as present
  `)
  const hasFn = Boolean(fn?.present)
  console.log(`  ${hasFn ? '✅' : '❌'} function update_updated_at()`)
  if (!hasFn) blockers.push('update_updated_at() is missing — every updated_at trigger would fail')

  const prereqs = await db.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('embeddings', 'emails', 'clients')
  `)
  const found = new Set(prereqs.map((r) => String(r.table_name)))
  for (const t of ['embeddings', 'emails', 'clients']) {
    console.log(`  ${found.has(t) ? '✅' : '❌'} table public.${t}`)
    if (!found.has(t)) blockers.push(`public.${t} is missing`)
  }

  const [authUsers] = await db.query(`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'auth' and table_name = 'users'
    ) as present
  `)
  const hasAuthUsers = Boolean(authUsers?.present)
  console.log(`  ${hasAuthUsers ? '✅' : '❌'} table auth.users`)
  if (!hasAuthUsers) blockers.push('auth.users is missing')

  const existing = await db.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'marketing%'
    order by table_name
  `)
  console.log(
    existing.length === 0
      ? '  ▪ no marketing_* tables yet — clean apply'
      : `  ▪ already present: ${existing.map((r) => r.table_name).join(', ')}`
  )

  return blockers
}

async function verify(db: Executor) {
  console.log('\n▸ Verifying')

  const tables = await db.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'marketing%'
    order by table_name
  `)
  for (const r of tables) console.log(`  ✅ ${r.table_name}`)

  const [view] = await db.query(`
    select exists (
      select 1 from information_schema.views
      where table_schema = 'public' and table_name = 'marketing_variant_performance'
    ) as present
  `)
  console.log(`  ${view?.present ? '✅' : '❌'} view marketing_variant_performance`)

  // The two guarantees the schema is meant to enforce on its own.
  const [approval] = await db.query(`
    select exists (
      select 1 from pg_constraint where conname = 'marketing_sends_approval_required'
    ) as present
  `)
  console.log(`  ${approval?.present ? '✅' : '❌'} CHECK marketing_sends_approval_required`)

  const uniques = await db.query(`
    select conname from pg_constraint
    where conrelid = 'public.marketing_sends'::regclass and contype = 'u'
  `)
  console.log(
    `  ${uniques.length ? '✅' : '❌'} UNIQUE on marketing_sends (${uniques.map((u) => u.conname).join(', ') || 'none'})`
  )

  const [entity] = await db.query(`
    select pg_get_constraintdef(oid) as def
    from pg_constraint where conname = 'embeddings_entity_type_check'
  `)
  const def = String(entity?.def ?? '')
  const widened = def.includes('marketing_source') && def.includes('marketing_pain_point')
  console.log(`  ${widened ? '✅' : '❌'} embeddings entity_type widened for marketing`)
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const db = await connect()
  console.log(`\n▸ ${db.label}`)

  const [v] = await db.query('select version() as version')
  console.log(`  ${String(v?.version ?? '').split(',')[0]}`)

  const blockers = await preflight(db)
  if (blockers.length) {
    console.error('\n❌ Preflight failed:')
    for (const b of blockers) console.error(`   - ${b}`)
    console.error('')
    await db.close()
    process.exit(1)
  }

  const files = migrationFiles()
  if (files.length === 0) {
    console.error('\n❌ No migration files matched.\n')
    await db.close()
    process.exit(1)
  }

  if (dryRun) {
    console.log('\n▸ Would apply, in order:')
    for (const f of files) console.log(`  ${f}`)
    console.log('\n✅ Preflight passed. --dry-run set, nothing written.\n')
    await db.close()
    return
  }

  console.log('\n▸ Applying')
  for (const file of files) {
    const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    process.stdout.write(`  ${file} … `)
    try {
      await db.query(text)
      console.log('✅')
    } catch (err) {
      console.log('❌')
      console.error(`\n   ${err instanceof Error ? err.message : String(err)}`)
      console.error('\n   Postgres rolled this file back — nothing from it was applied.\n')
      await db.close()
      process.exit(1)
    }
  }

  await verify(db)
  console.log('\n✅ Done.\n')
  await db.close()
}

main().catch(async (err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
