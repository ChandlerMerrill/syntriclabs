/**
 * Applies SQL migrations against the Supabase database.
 *
 *   npm run db:migrate -- --dry-run     preflight only, writes nothing
 *   npm run db:migrate                  apply everything not yet applied
 *   npm run db:migrate -- 023 024       apply specific files by prefix
 *
 * Why this exists: migrations here are applied by hand, and a hand-applied file
 * that fails halfway is the failure mode worth designing against. Each file
 * runs in simple-query mode, which Postgres wraps in one implicit transaction —
 * a file lands whole or not at all.
 *
 * The preflight matters because the migration files are not self-contained.
 * `update_updated_at()` is called by 005, 007, 008 and 023-025 but defined by
 * none of them; it exists only in the live database. Discovering that before
 * writing half a schema is worth one extra round trip.
 *
 * Reads SUPABASE_DB_URL (or POSTGRES_URL) via `node --env-file`. The value is
 * never printed — only host and database — so output is safe to paste.
 */
import postgres from 'postgres'
import fs from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase/migrations')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const prefixes = args.filter((a) => !a.startsWith('--'))

const url = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL
if (!url) {
  console.error('\n❌ No database URL. Add SUPABASE_DB_URL to .env.local:\n')
  console.error(
    '   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n'
  )
  console.error('   Supabase dashboard → Connect → Session pooler.\n')
  process.exit(1)
}

let label: string
try {
  const u = new URL(url)
  label = `${u.hostname}:${u.port || '5432'}${u.pathname}`
} catch {
  console.error('❌ The database URL does not parse.')
  process.exit(1)
}

// prepare:false keeps this working through either pooler — the transaction
// pooler rejects the extended (prepared-statement) protocol.
const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, onnotice: () => {} })

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

async function preflight(): Promise<string[]> {
  console.log('\n▸ Preflight')
  const blockers: string[] = []

  const [{ exists: hasFn }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'update_updated_at'
    ) as exists
  `
  console.log(`  ${hasFn ? '✅' : '❌'} function update_updated_at()`)
  if (!hasFn) blockers.push('update_updated_at() is missing — every updated_at trigger would fail')

  const prereqs = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('embeddings', 'emails', 'clients')
  `
  const found = new Set(prereqs.map((r) => r.table_name))
  for (const t of ['embeddings', 'emails', 'clients']) {
    console.log(`  ${found.has(t) ? '✅' : '❌'} table public.${t}`)
    if (!found.has(t)) blockers.push(`public.${t} is missing`)
  }

  const [{ exists: hasAuthUsers }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'auth' and table_name = 'users'
    ) as exists
  `
  console.log(`  ${hasAuthUsers ? '✅' : '❌'} table auth.users`)
  if (!hasAuthUsers) blockers.push('auth.users is missing')

  const existing = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'marketing%'
    order by table_name
  `
  console.log(
    existing.length === 0
      ? '  ▪ no marketing_* tables yet — clean apply'
      : `  ▪ already present: ${existing.map((r) => r.table_name).join(', ')}`
  )

  return blockers
}

async function verify() {
  console.log('\n▸ Verifying')

  const tables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'marketing%'
    order by table_name
  `
  for (const r of tables) console.log(`  ✅ ${r.table_name}`)

  const [{ exists: hasView }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.views
      where table_schema = 'public' and table_name = 'marketing_variant_performance'
    ) as exists
  `
  console.log(`  ${hasView ? '✅' : '❌'} view marketing_variant_performance`)

  // The two guarantees the schema is meant to enforce on its own.
  const [{ exists: hasApproval }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from pg_constraint where conname = 'marketing_sends_approval_required'
    ) as exists
  `
  console.log(`  ${hasApproval ? '✅' : '❌'} CHECK marketing_sends_approval_required`)

  const uniques = await sql<{ conname: string }[]>`
    select conname from pg_constraint
    where conrelid = 'public.marketing_sends'::regclass and contype = 'u'
  `
  console.log(
    `  ${uniques.length ? '✅' : '❌'} UNIQUE on marketing_sends (${uniques.map((u) => u.conname).join(', ') || 'none'})`
  )

  const [entity] = await sql<{ def: string }[]>`
    select pg_get_constraintdef(oid) as def
    from pg_constraint where conname = 'embeddings_entity_type_check'
  `
  const widened =
    !!entity && entity.def.includes('marketing_source') && entity.def.includes('marketing_pain_point')
  console.log(`  ${widened ? '✅' : '❌'} embeddings entity_type widened for marketing`)
}

async function main() {
  console.log(`\n▸ ${label}`)
  const [{ version }] = await sql<{ version: string }[]>`select version()`
  console.log(`  ${version.split(',')[0]}`)

  const blockers = await preflight()
  if (blockers.length) {
    console.error('\n❌ Preflight failed:')
    for (const b of blockers) console.error(`   - ${b}`)
    console.error('')
    await sql.end()
    process.exit(1)
  }

  const files = migrationFiles()
  if (files.length === 0) {
    console.error('\n❌ No migration files matched.\n')
    await sql.end()
    process.exit(1)
  }

  if (dryRun) {
    console.log('\n▸ Would apply, in order:')
    for (const f of files) console.log(`  ${f}`)
    console.log('\n✅ Preflight passed. --dry-run set, nothing written.\n')
    await sql.end()
    return
  }

  console.log('\n▸ Applying')
  for (const file of files) {
    const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    process.stdout.write(`  ${file} … `)
    try {
      await sql.unsafe(text).simple()
      console.log('✅')
    } catch (err) {
      const e = err as Error & { position?: string }
      console.log('❌')
      console.error(`\n   ${e.message}`)
      if (e.position) console.error(`   at character ${e.position}`)
      console.error('\n   Postgres rolled this file back — nothing from it was applied.\n')
      await sql.end()
      process.exit(1)
    }
  }

  await verify()
  console.log('\n✅ Done.\n')
  await sql.end()
}

main().catch(async (err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`)
  await sql.end().catch(() => {})
  process.exit(1)
})
