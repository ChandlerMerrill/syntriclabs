/**
 * Removes the seeded test prospects and everything that hangs off them.
 *
 *   tsx --env-file=.env.local scripts/db/clear-test-data.ts --dry-run
 *   tsx --env-file=.env.local scripts/db/clear-test-data.ts
 *   tsx --env-file=.env.local scripts/db/clear-test-data.ts --rename-campaign <id>
 *
 * Every prospect on file is a plus-alias of the operator's own inbox, put there
 * by `seed-marketing.ts` so the loop could be walked end to end without touching
 * a real company. They have done that job. Leaving them in place while real
 * prospects arrive means a batch queued by segment picks up four addresses that
 * deliver to the sender, which is exactly the sort of thing that reads as a
 * working send until someone checks who got it.
 *
 * ── Why ids and not a name pattern ────────────────────────────────────────
 *
 * The obvious implementation is `delete where company like '%(TEST)%'`, and it
 * is wrong in the one way that matters: it is a rule about a string, applied to
 * a table that is about to fill with company names nobody here chose. An
 * outfitter that puts "(TEST)" in its trading name is not a hypothetical worth
 * betting a real prospect on, and the pattern would also happily match a row
 * added next month by someone testing something else.
 *
 * So the ids are literal, read from the database in the session that wrote this
 * file, and every one of them is re-checked before deletion against the same
 * invariant `seed-marketing.ts` enforces on the way in: the address must be a
 * plus-alias of the operator's own. A row whose email has changed is left alone
 * and reported, because that means the id no longer identifies what this script
 * thinks it does.
 *
 * Campaigns are kept. All three carry real goals and real copy, and the segment
 * work is about to reuse one of them — `--rename-campaign` drops the "(TEST)"
 * suffix from whichever the scoring picks, once it has picked.
 */
import { createServiceClient } from '@/lib/supabase/server'

/** The same default `seed-marketing.ts` aliases from. */
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'chandlermerrill.r@gmail.com'

/**
 * The four seeded rows, by id. Three from `SEED_PROSPECTS` in
 * `seed-marketing.ts`; the fourth ("Sawtooth Basin Outfitters") was added by
 * hand during the plain-template walk on 2026-08-01 and is suppressed.
 */
const SEEDED_PROSPECT_IDS = [
  '77b27ed0-9f12-4286-b867-e2de98def75b', // Redrock Trail Company (TEST)
  '84d67a23-0ddf-4b09-b319-acd985baeb74', // High Basin Guides (TEST)
  'd292f48c-234a-4eaf-bb6d-a2c91f1dff0c', // Canyon Light Outfitters (TEST)
  '2753fabe-fc27-4688-bacc-319ef3bd9b36', // Sawtooth Basin Outfitters (TEST), suppressed
]

function isOperatorAlias(email: string | null): boolean {
  if (!email) return false
  const [local, domain] = OWNER_EMAIL.toLowerCase().split('@')
  const [gotLocal, gotDomain] = email.toLowerCase().split('@')
  return gotDomain === domain && (gotLocal === local || gotLocal.startsWith(`${local}+`))
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

async function renameCampaign(campaignId: string, dryRun: boolean) {
  const supabase = await createServiceClient()

  const { data: campaign, error } = await supabase
    .from('marketing_campaigns')
    .select('id, name')
    .eq('id', campaignId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const name = (campaign.name as string).replace(/\s*\(TEST\)\s*$/, '').trim()
  if (name === campaign.name) {
    console.log(`Campaign "${campaign.name}" has no (TEST) suffix — nothing to do.`)
    return
  }

  console.log(`  "${campaign.name}"\n→ "${name}"`)
  if (dryRun) return

  const { error: updateError } = await supabase
    .from('marketing_campaigns')
    .update({ name })
    .eq('id', campaignId)
  if (updateError) throw new Error(updateError.message)
  console.log('✅ renamed')
}

/**
 * Removes the preflight row and its send once it has been read.
 *
 * Every batch should start with one send to the operator's own inbox, and every
 * one of those lands in `marketing_sends` as a real `sent` row. Left in place it
 * counts toward whichever experiment arm its variant belongs to — the first
 * batch showed 3 sends against `observation` and 2 against `personal` for a
 * batch that was deliberately 2 and 2, because a self-send was sitting in the
 * numerator's denominator.
 *
 * A preflight is not a prospect and its non-reply is not a signal. Delete it
 * once it has done its job, before reading any performance view.
 *
 * Guarded the same way as the seeded rows: the address must be an alias of the
 * operator's own, so this can never reach a real company however a row is named.
 */
async function clearPreflight(dryRun: boolean) {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('marketing_prospects')
    .select('id, company, email')
    .ilike('company', 'Preflight%')
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as { id: string; company: string; email: string | null }[]
  const safe = rows.filter((r) => isOperatorAlias(r.email))

  for (const r of rows.filter((r) => !isOperatorAlias(r.email))) {
    console.log(`  ⚠️  ${r.company} <${r.email ?? 'no email'}> — NOT an operator alias, leaving it`)
  }
  if (safe.length === 0) {
    console.log('No preflight rows to clear.')
    return
  }

  const { count } = await supabase
    .from('marketing_sends')
    .select('id', { count: 'exact', head: true })
    .in('prospect_id', safe.map((r) => r.id))

  for (const r of safe) console.log(`  ✓ ${r.company} <${r.email}>`)
  console.log(`\n  ${safe.length} preflight prospect(s), ${count ?? 0} send(s)`)

  if (dryRun) {
    console.log('\nDRY RUN — nothing deleted.')
    return
  }

  const { error: delError } = await supabase
    .from('marketing_prospects')
    .delete()
    .in('id', safe.map((r) => r.id))
  if (delError) throw new Error(delError.message)
  console.log('\n✅ Cleared. Performance views now read the real batch only.')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (process.argv.includes('--preflight')) return clearPreflight(dryRun)
  const rename = arg('rename-campaign')
  if (rename) return renameCampaign(rename, dryRun)

  const supabase = await createServiceClient()

  console.log(`\n▸ Clearing seeded test prospects${dryRun ? ' (DRY RUN)' : ''}`)
  console.log(`  Operator address: ${OWNER_EMAIL}\n`)

  const { data: rows, error } = await supabase
    .from('marketing_prospects')
    .select('id, company, email, suppressed_at')
    .in('id', SEEDED_PROSPECT_IDS)
  if (error) throw new Error(`Failed to load prospects: ${error.message}`)

  const found = (rows ?? []) as { id: string; company: string; email: string | null }[]

  const missing = SEEDED_PROSPECT_IDS.filter((id) => !found.some((r) => r.id === id))
  for (const id of missing) console.log(`  ▪ ${id} — already gone`)

  const safe = found.filter((r) => isOperatorAlias(r.email))
  const unsafe = found.filter((r) => !isOperatorAlias(r.email))

  for (const r of unsafe) {
    console.log(`  ⚠️  ${r.company} <${r.email ?? 'no email'}> — NOT an operator alias, leaving it`)
  }
  if (unsafe.length > 0) {
    console.error(
      '\nRefusing to continue. One of the seeded ids now points at a row that is not a test ' +
        'record. Check it by hand before running this again.'
    )
    process.exit(1)
  }

  if (safe.length === 0) {
    console.log('\nNothing to delete.')
    return
  }

  const ids = safe.map((r) => r.id)

  // Counted before the delete so the report says what actually went, rather
  // than what the cascade was assumed to take.
  const { data: sends } = await supabase
    .from('marketing_sends')
    .select('id, status')
    .in('prospect_id', ids)
  const sendIds = (sends ?? []).map((s) => s.id as string)

  const { count: eventCount } = sendIds.length
    ? await supabase
        .from('marketing_events')
        .select('id', { count: 'exact', head: true })
        .in('send_id', sendIds)
    : { count: 0 }

  const { count: outcomeCount } = sendIds.length
    ? await supabase
        .from('marketing_outcomes')
        .select('id', { count: 'exact', head: true })
        .in('send_id', sendIds)
    : { count: 0 }

  for (const r of safe) console.log(`  ✓ ${r.company} <${r.email}>`)
  console.log(
    `\n  ${safe.length} prospect(s), ${sendIds.length} send(s), ` +
      `${eventCount ?? 0} event(s), ${outcomeCount ?? 0} outcome(s)`
  )

  if (dryRun) {
    console.log('\nDRY RUN — nothing deleted.')
    return
  }

  // Sends cascade from the prospect (025: `prospect_id ... on delete cascade`),
  // and events and outcomes cascade from the send. One delete is enough, and
  // doing it in one statement is what makes it atomic.
  const { error: deleteError } = await supabase.from('marketing_prospects').delete().in('id', ids)
  if (deleteError) throw new Error(`Failed to delete prospects: ${deleteError.message}`)

  const { count: leftover } = await supabase
    .from('marketing_sends')
    .select('id', { count: 'exact', head: true })
    .in('prospect_id', ids)

  console.log(`\n✅ Deleted. ${leftover ?? 0} send(s) still referencing those prospects.`)

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, name')
    .order('name')
  console.log('\nCampaigns kept:')
  for (const c of campaigns ?? []) console.log(`  ${c.id}  ${c.name}`)
  console.log(
    '\nDrop the (TEST) suffix from the one the scoring picks:\n' +
      '  clear-test-data.ts --rename-campaign <id>'
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
