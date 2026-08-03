/**
 * Seeds enough data to walk the marketing loop end to end without spending
 * Firecrawl credits or touching a real prospect.
 *
 * Runs over HTTPS with the service key — no database connection string needed.
 * Idempotent: re-running updates in place rather than duplicating.
 *
 * SAFETY: every seeded prospect is a plus-alias of the operator's own address.
 * A test send goes to the operator's inbox, and a reply from there exercises
 * the real Gmail sync. No seeded row may ever point at a real company.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { upsertBrandProfile } from '@/lib/marketing/config/brand-profile'
import { SYNTRIC_BRAND_PROFILE, SYNTRIC_SEGMENTS } from '@/lib/marketing/config/syntric-profile'
import { upsertSegment } from '@/lib/marketing/services'

/** Every seeded prospect address must start with this local part. */
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'chandlermerrill.r@gmail.com'

function alias(tag: string): string {
  const [local, domain] = OWNER_EMAIL.split('@')
  return `${local}+${tag}@${domain}`
}

/**
 * Pain points transcribed from the hand-run research in
 * brain/wiki/domains/market/guiding-outfitters.md (§3 and §4), with their real
 * sources. These stand in for a research run so generation has sourced material
 * to work from — the automated crawl produces the same shape.
 */
const SEED_SOURCES = [
  {
    kind: 'press' as const,
    url: 'https://www.nps.gov/subjects/cua/required-cua-reports.htm',
    title: 'NPS — Required CUA Reports',
    signal_rank: 2,
    content:
      'Annual reports (NPS Form 10-660) are due February 28 for the prior calendar year, one per ' +
      'Commercial Use Authorization. The annual report requires the number of clients served in ' +
      'that park and total gross receipts for the business. Where a park requires monthly ' +
      'reporting, those are due the 15th for the prior month.',
  },
  {
    kind: 'press' as const,
    url: 'https://www.nps.gov/subjects/cua/index.htm',
    title: 'NPS — Commercial Use Authorizations',
    signal_rank: 2,
    content:
      'A Commercial Use Authorization is required to conduct commercial guided activity on ' +
      'National Park Service land, and is applied for separately for each park. An operator ' +
      'running trips across seven parks holds seven separate authorizations.',
  },
  {
    kind: 'competitor' as const,
    url: 'https://www.fareharbor.com/',
    title: 'Booking platform fee structures — comparison coverage',
    signal_rank: 3,
    content:
      "FareHarbor's multi-day support is described as bolted onto a platform designed for " +
      'single-day tours, with a calendar optimized for daily time slots rather than multi-night ' +
      'stays. Standard North America rate is reported at about 6% per booking. Checkfront is ' +
      'characterized as decent at everything, exceptional at nothing, with guide scheduling and ' +
      'waivers less developed than dedicated platforms.',
  },
]

const SEED_PAIN_POINTS = [
  {
    statement:
      'Turning booking records into per-park client counts for each CUA annual report, by hand, against a February 28 federal deadline.',
    frequency: 2,
    rank: 1,
    score: 6.0,
    icp_fear: 'wont_work_for_me',
    sourceIdx: [0, 1],
    quotes: [
      'The annual report requires the number of clients served in that park and total gross receipts for the business.',
      'A Commercial Use Authorization is required... and is applied for separately for each park.',
    ],
  },
  {
    statement:
      'Paying a percentage booking fee sized for a $150 day tour on a $3,850 multi-day trip, for a calendar built around time slots.',
    frequency: 1,
    rank: 2,
    score: 3.0,
    icp_fear: 'pay_a_lot_get_little',
    sourceIdx: [2],
    quotes: [
      'Standard North America rate is reported at about 6% per booking.',
    ],
  },
  {
    statement:
      'Reconciling what a departure actually cost — fuel, lodging, permits — from receipts that arrive from a dozen vendors weeks after the trip.',
    frequency: 1,
    rank: 3,
    score: 2.5,
    icp_fear: 'wont_work_for_me',
    sourceIdx: [2],
    quotes: [
      'Guide scheduling and waivers less developed than dedicated platforms.',
    ],
  },
]

const SEED_PROSPECTS = [
  {
    company: 'Redrock Trail Company (TEST)',
    contact_name: 'Dana Whitmore',
    tag: 'redrock',
    location: 'Moab, UT',
    notes: 'SEEDED TEST RECORD — not a real company. Delivers to the operator inbox.',
  },
  {
    company: 'High Basin Guides (TEST)',
    contact_name: 'Sam Ortiz',
    tag: 'highbasin',
    location: 'Bozeman, MT',
    notes: 'SEEDED TEST RECORD — not a real company. Delivers to the operator inbox.',
  },
  {
    company: 'Canyon Light Outfitters (TEST)',
    contact_name: null, // deliberately null: proves {{first_name}} blocks the send
    tag: 'canyonlight',
    location: 'Flagstaff, AZ',
    notes:
      'SEEDED TEST RECORD — no contact name on purpose, so a variant using {{first_name}} is ' +
      'correctly refused at queue time.',
  },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const supabase = await createServiceClient()

  console.log(`\n▸ Seeding marketing test data${dryRun ? ' (DRY RUN)' : ''}`)
  console.log(`  Test sends will deliver to: ${OWNER_EMAIL}`)

  // Guard: refuse to seed a prospect that is not operator-controlled.
  for (const p of SEED_PROSPECTS) {
    const email = alias(p.tag)
    if (!email.startsWith(OWNER_EMAIL.split('@')[0] + '+')) {
      throw new Error(`Refusing to seed a non-operator address: ${email}`)
    }
  }
  console.log(`  ✅ all ${SEED_PROSPECTS.length} prospect addresses are operator aliases`)

  if (dryRun) {
    console.log('\n  Would seed:')
    console.log(`    brand profile: ${SYNTRIC_BRAND_PROFILE.slug}`)
    console.log(`    segments:      ${SYNTRIC_SEGMENTS.map((s) => s.slug).join(', ')}`)
    console.log(`    sources:       ${SEED_SOURCES.length}`)
    console.log(`    pain points:   ${SEED_PAIN_POINTS.length}`)
    console.log(`    prospects:     ${SEED_PROSPECTS.map((p) => alias(p.tag)).join('\n                   ')}`)
    console.log('\n  --dry-run set, nothing written.\n')
    return
  }

  // ── 1. Brand profile + segments ──
  const profile = await upsertBrandProfile(supabase, { ...SYNTRIC_BRAND_PROFILE, isDefault: true })
  console.log(`\n  ✅ brand profile: ${profile.name} (${profile.bannedWords.length} banned words)`)

  const segments = []
  for (const seg of SYNTRIC_SEGMENTS) {
    segments.push(await upsertSegment(supabase, { brand_profile_id: profile.id, ...seg }))
  }
  console.log(`  ✅ segments: ${segments.map((s) => s.slug).join(', ')}`)

  const guiding = segments.find((s) => s.slug === 'guiding-outfitting')!

  // ── 2. A completed research run standing in for a real crawl ──
  const { data: existingRun } = await supabase
    .from('marketing_research_runs')
    .select('id')
    .eq('segment_id', guiding.id)
    .eq('trigger', 'manual')
    .limit(1)
    .maybeSingle()

  let runId: string
  if (existingRun) {
    runId = existingRun.id
    console.log(`  ▪ reusing research run ${runId.slice(0, 8)}`)
  } else {
    const { data, error } = await supabase
      .from('marketing_research_runs')
      .insert({
        brand_profile_id: profile.id,
        segment_id: guiding.id,
        status: 'completed',
        trigger: 'manual',
        source_count: SEED_SOURCES.length,
        pain_point_count: SEED_PAIN_POINTS.length,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) throw new Error(`research run: ${error.message}`)
    runId = data.id
    console.log(`  ✅ research run ${runId.slice(0, 8)} (seeded, marked completed)`)
  }

  // ── 3. Sources, matched on url within the run so ids survive a re-run ──
  const sourceIds: string[] = []
  for (const s of SEED_SOURCES) {
    const payload = {
      research_run_id: runId,
      segment_id: guiding.id,
      kind: s.kind,
      url: s.url,
      title: s.title,
      content: s.content,
      signal_rank: s.signal_rank,
    }
    const { data: existing } = await supabase
      .from('marketing_sources')
      .select('id')
      .eq('research_run_id', runId)
      .eq('url', s.url)
      .maybeSingle()

    const { data, error } = existing
      ? await supabase
          .from('marketing_sources')
          .update(payload)
          .eq('id', existing.id)
          .select('id')
          .single()
      : await supabase.from('marketing_sources').insert(payload).select('id').single()
    if (error) throw new Error(`source ${s.url}: ${error.message}`)
    sourceIds.push(data.id)
  }
  console.log(`  ✅ ${sourceIds.length} sources`)

  // ── 4. Pain points, each carrying evidence that links to a real source ──
  //
  // Matched on statement, and updated rather than replaced. Deleting these on a
  // re-run would null `pain_point_id` on every variant already generated from
  // them — the fk is `on delete set null` — silently cutting the trace from a
  // variant back to the research that produced it. The trace is the point.
  for (const p of SEED_PAIN_POINTS) {
    const payload = {
      research_run_id: runId,
      segment_id: guiding.id,
      statement: p.statement,
      frequency: p.frequency,
      rank: p.rank,
      score: p.score,
      icp_fear: p.icp_fear,
      evidence: p.sourceIdx.map((i, n) => ({
        source_id: sourceIds[i],
        quote: p.quotes[n],
        url: SEED_SOURCES[i].url,
      })),
    }
    const { data: existing } = await supabase
      .from('marketing_pain_points')
      .select('id')
      .eq('research_run_id', runId)
      .eq('statement', p.statement)
      .maybeSingle()

    const { error } = existing
      ? await supabase.from('marketing_pain_points').update(payload).eq('id', existing.id)
      : await supabase.from('marketing_pain_points').insert(payload)
    if (error) throw new Error(`pain point: ${error.message}`)
  }
  console.log(`  ✅ ${SEED_PAIN_POINTS.length} pain points, each with a resolvable evidence link`)

  // ── 5. A campaign ──
  const { data: existingCampaign } = await supabase
    .from('marketing_campaigns')
    .select('id')
    .eq('name', 'Guiding & outfitting — CUA reporting (TEST)')
    .maybeSingle()

  let campaignId: string
  if (existingCampaign) {
    campaignId = existingCampaign.id
    console.log(`  ▪ campaign already exists (${campaignId.slice(0, 8)})`)
  } else {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        brand_profile_id: profile.id,
        segment_id: guiding.id,
        name: 'Guiding & outfitting — CUA reporting (TEST)',
        channel: 'email',
        goal: 'A conversation about how they handle per-park client counts before the February deadline.',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(`campaign: ${error.message}`)
    campaignId = data.id
    console.log(`  ✅ campaign ${campaignId.slice(0, 8)}`)
  }

  // ── 6. Test prospects ──
  for (const p of SEED_PROSPECTS) {
    const email = alias(p.tag).toLowerCase()

    // Identity is the company, not the address. Keying on email meant that
    // editing a tag here inserted a second row for the same company and left
    // the old one behind — the exact opposite of the idempotency this script
    // claims at the top. Two duplicates had to be deleted by hand once already.
    const { data: matches, error: lookupErr } = await supabase
      .from('marketing_prospects')
      .select('id, email')
      .eq('company', p.company)
    if (lookupErr) throw new Error(`prospect lookup ${p.company}: ${lookupErr.message}`)
    if (matches.length > 1) {
      throw new Error(
        `${matches.length} rows already exist for "${p.company}" ` +
          `(${matches.map((m) => m.email ?? 'no email').join(', ')}). ` +
          'Delete all but one by hand — this script will not guess which is current.'
      )
    }
    const existing = matches[0] ?? null

    // marketing_prospects has a unique index on lower(email). A row for some
    // other company already holding this address would fail the write with a
    // constraint message that names the index and nothing else.
    const { data: emailHolder } = await supabase
      .from('marketing_prospects')
      .select('id, company')
      .eq('email', email)
      .maybeSingle()
    if (emailHolder && emailHolder.id !== existing?.id) {
      throw new Error(
        `${email} already belongs to "${emailHolder.company}". ` +
          `Free that address or change the tag for "${p.company}".`
      )
    }

    // No suppression keys. This payload is an `update` on a re-run, so writing
    // `suppressed_at: null` here would un-suppress anyone who had unsubscribed
    // since the last seed — a re-seed of test data quietly undoing a person's
    // decision. Absent, the column keeps whatever it holds.
    const payload = {
      segment_id: guiding.id,
      company: p.company,
      contact_name: p.contact_name,
      email,
      location: p.location,
      notes: p.notes,
      qualified: true,
      qualification_reason: 'Seeded test record.',
    }

    const { error } = existing
      ? await supabase.from('marketing_prospects').update(payload).eq('id', existing.id)
      : await supabase.from('marketing_prospects').insert(payload)
    if (error) throw new Error(`prospect ${p.company}: ${error.message}`)
    console.log(`  ✅ prospect ${p.company} → ${email}`)
  }

  console.log('\n▸ Next: /admin/marketing/variants → pick the CUA pain point → Generate.\n')
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`)
  process.exit(1)
})
