/**
 * Finding real companies to write to.
 *
 *   tsx --env-file=.env.local scripts/db/prospects-discover.ts crawl \
 *     --segment <id> --out <dir> [--query "..."] [--limit 6]
 *
 *   tsx --env-file=.env.local scripts/db/prospects-discover.ts import \
 *     --dir <dir> --prospects prospects.json [--dry-run]
 *
 * Nothing in this codebase sources companies. `prospects/import.ts` parses a
 * paste and `prospects/qualify.ts` judges rows that are already there — its own
 * docblock says discovery is what would give it more to work with. That gap is
 * the reason no real email has ever gone out.
 *
 * ── The split ─────────────────────────────────────────────────────────────
 *
 * `crawl` does only what a machine can do without guessing: search, scrape the
 * homepage and whatever `/contact` and `/about` exist, harvest addresses with a
 * regex, and put every one of them through `verify.ts`. It writes the scraped
 * markdown to disk alongside a candidates file. It imports nothing.
 *
 * Then a person reads it, and authors `prospects.json` with the parts that are
 * judgement: whose name is on the business, and a verbatim span from that site
 * showing it fits the segment.
 *
 * `import` re-verifies every address, refuses anything `undeliverable`, and
 * checks each fit quote character-for-character against the page it was taken
 * from before writing a row. Same rule as pain point evidence, for the same
 * reason: a claim about a company that turns out to be about a different
 * company is the one mistake a cold email cannot survive.
 *
 * Every row lands `qualified: null`. Discovery is transport, not judgement —
 * `qualify-manual.ts` is the step that decides.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServiceClient } from '@/lib/supabase/server'
import { getSegment } from '@/lib/marketing/services'
import { firecrawlClient, isUnsupportedHost } from '@/lib/marketing/research/sources'
import { verifyEmails } from '@/lib/marketing/prospects/verify'
import type { EmailVerification } from '@/lib/marketing/types'

/** Same ceiling the research fetcher uses. */
const MAX_CONTENT_CHARS = 20000

/**
 * Where an operator's address actually lives. Tried in order against the site's
 * origin; whatever 404s is skipped without complaint, because most small
 * operator sites have two of these and no sitemap.
 */
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us']

/**
 * Addresses that are never a prospect. Every one of these has turned up in a
 * scrape of a small business site — theme boilerplate, the host's own support
 * address, an analytics vendor.
 */
const JUNK_LOCAL_PARTS = new Set(['example', 'youremail', 'email', 'name', 'user', 'test', 'sentry'])
const JUNK_DOMAINS = [
  'example.com',
  'example.org',
  'domain.com',
  'yourdomain.com',
  'sentry.io',
  'wixpress.com',
  'squarespace.com',
  'godaddy.com',
  'wordpress.com',
  'shopify.com',
  'sentry-next.wixpress.com',
]

const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

/**
 * Hosts that list operators rather than being one. Scraping a directory costs a
 * request and returns a page of other people's names; scraping a trade
 * association returns the industry's own press office.
 *
 * `\.org$` is not in here on purpose — plenty of small outfits are .org — but
 * the named associations are, because their `info@` address is the most
 * plausible-looking wrong answer discovery can produce.
 */
const NOT_AN_OPERATOR =
  /tripadvisor|yelp|facebook|instagram|thedyrt|guidefitter|bookyourhunt|booking\.|directory|marketplace|outfittersrating|\bwikipedia|reddit|indeed|ziprecruiter|association|outfitters?\.org$|guides?\.org$|maineguides\.com|mainehost\.com|mogamt|\.gov$|\.gov\./

/**
 * Firecrawl's free tier allows 12 requests a minute and answers the thirteenth
 * with an error, not a wait. The first run of this script fired five requests
 * per site with no pacing and lost twelve of fourteen sites to that limit —
 * silently, because the failures were swallowed. Both halves of that are fixed:
 * failures print, and requests are spaced.
 *
 * Slightly under the theoretical 5,000ms, because the limit is enforced on a
 * rolling window and the request itself takes time inside it.
 */
const MIN_REQUEST_INTERVAL_MS = Number(process.env.FIRECRAWL_MIN_INTERVAL_MS ?? 5200)

/**
 * A ceiling on any single Firecrawl call.
 *
 * The client is constructed with no timeout, so a host that accepts the
 * connection and then says nothing hangs the whole crawl — not loudly, but as
 * an absence: the last line printed stays the last line printed, and the run
 * looks the same as one that is merely slow. That happened on a real run and
 * cost twenty-five minutes before anyone could tell the difference between
 * "still working" and "stopped".
 *
 * The same failure the docblock above describes, one layer down. A timeout
 * turns it back into a printed `✗` and the next site.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.FIRECRAWL_TIMEOUT_MS ?? 45000)

let lastRequestAt = 0
async function paced<T>(fn: () => Promise<T>): Promise<T> {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestAt = Date.now()

  // Promise.race rather than an AbortSignal: the SDK does not take one, and the
  // point here is that the *loop* moves on, not that the socket closes.
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`no response in ${REQUEST_TIMEOUT_MS}ms`)),
          REQUEST_TIMEOUT_MS
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

function args(name: string): string[] {
  const out: string[] = []
  process.argv.forEach((a, i) => {
    if (a === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1])
  })
  return out
}

function required(name: string): string {
  const v = arg(name)
  if (!v) throw new Error(`--${name} is required`)
  return v
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.slice(0, 40)
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/**
 * Addresses in a page, minus the ones that are furniture.
 *
 * Deliberately mechanical. A regex over markdown finds `mailto:` links and bare
 * addresses equally well, and an address is one of the few things on a company
 * website that means exactly what it says — so reading it out is not a judgement
 * and does not need to be treated as one.
 */
function harvestEmails(markdown: string): string[] {
  const found = new Set<string>()

  for (const raw of markdown.match(EMAIL_IN_TEXT) ?? []) {
    const email = raw.toLowerCase().replace(/[.,;:)\]]+$/, '')
    const at = email.lastIndexOf('@')
    const localPart = email.slice(0, at)
    const domain = email.slice(at + 1)

    if (JUNK_LOCAL_PARTS.has(localPart)) continue
    if (JUNK_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) continue
    // `logo@2x.png` and friends: the regex cannot tell an image from an address.
    if (/\.(png|jpe?g|gif|svg|webp|css|js)$/.test(domain)) continue

    found.add(email)
  }

  return [...found]
}

interface CrawledPage {
  url: string
  title: string | null
  content: string
}

interface Candidate {
  host: string
  homepage: string
  title: string | null
  pages: CrawledPage[]
  emails: { email: string; verification: EmailVerification }[]
}

/** Default searches for a segment. Overridable, and worth overriding. */
function defaultQueries(segmentName: string): string[] {
  return [
    `${segmentName} multi-day guided trips outfitter official site contact`,
    `licensed outfitter guided multi-day trips "contact us" owner operated`,
    `guide service permits "commercial use authorization" multi-day trips contact`,
  ].map((q) => q.replace('{segment}', segmentName))
}

/**
 * Everything read so far, on disk: one markdown file per site plus the
 * candidates index. Called after every site, so an interrupted crawl leaves
 * behind exactly what it had finished reading.
 */
function flush(outDir: string, candidates: Candidate[]) {
  candidates.forEach((c, i) => {
    const slug = `${String(i).padStart(2, '0')}-${c.host.replace(/[^a-z0-9.]/gi, '_')}`
    const body = c.pages
      .map((p) => `\n\n${'='.repeat(78)}\n${p.url}\n${'='.repeat(78)}\n\n${p.content}`)
      .join('')
    writeFileSync(join(outDir, `${slug}.md`), `# ${c.title ?? c.host}\n${body}`)
  })
  writeFileSync(join(outDir, '_candidates.json'), JSON.stringify(candidates, null, 2))
}

async function cmdCrawl() {
  const segmentId = required('segment')
  const outDir = required('out')
  const limit = Number(arg('limit') ?? 6)

  const supabase = await createServiceClient()
  const segment = await getSegment(supabase, segmentId)
  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const queries = args('query').length ? args('query') : defaultQueries(segment.name)
  const fc = firecrawlClient()

  mkdirSync(outDir, { recursive: true })
  console.log(`\nsegment "${segment.name}"`)
  for (const q of queries) console.log(`  query: ${q}`)
  console.log('')

  // One `seen` for the whole crawl, keyed by host rather than URL — two search
  // results on the same operator are one prospect, and scraping both would pay
  // twice to write a duplicate.
  const seenHosts = new Set<string>()
  const candidates: Candidate[] = []

  for (const query of queries) {
    let results: { url: string; title: string | null }[] = []
    try {
      const found = await paced(() => fc.search(query, { limit, sources: ['web'] }))
      results = (found.web ?? [])
        .map((r) => {
          const asWeb = r as { url?: string; title?: string }
          const asDoc = r as { metadata?: { sourceURL?: string; title?: string } }
          const url = asWeb.url ?? asDoc.metadata?.sourceURL ?? null
          return url ? { url, title: asWeb.title ?? asDoc.metadata?.title ?? null } : null
        })
        .filter((r): r is { url: string; title: string | null } => r !== null)
    } catch (err) {
      console.log(`  ✗ search failed — ${err instanceof Error ? err.message : 'unknown'}`)
      continue
    }

    for (const { url, title } of results) {
      const host = hostOf(url)
      if (seenHosts.has(host)) continue
      if (isUnsupportedHost(url)) continue

      if (NOT_AN_OPERATOR.test(host)) {
        console.log(`  ▪ ${host} — directory or association, skipped`)
        continue
      }

      seenHosts.add(host)

      const origin = originOf(url)
      const pages: CrawledPage[] = []

      // The landing URL first, on its own. A host that will not serve its own
      // homepage will not serve /contact either, and firing five requests at it
      // to find that out burns the request budget the good hosts need.
      //
      // Its failure is *printed*, not swallowed. The first version of this
      // reported a bare "nothing scraped" for twelve of fourteen sites, which
      // is indistinguishable from "these companies have no websites" — the same
      // class of silent failure that let reddit sit unsupported in the research
      // fetcher for its whole existence.
      const scrape = async (target: string): Promise<string | null> => {
        try {
          const doc = await paced(() => fc.scrape(target, { formats: ['markdown'] }))
          const markdown = doc.markdown?.trim() ?? ''
          if (!markdown) return 'scrape returned no markdown'
          pages.push({
            url: target,
            title: doc.metadata?.title ?? null,
            content: markdown.slice(0, MAX_CONTENT_CHARS),
          })
          return null
        } catch (err) {
          return err instanceof Error ? err.message : 'scrape failed'
        }
      }

      const landingError = await scrape(url)
      if (landingError) {
        console.log(`  ✗ ${host} — ${landingError.slice(0, 120)}`)
        continue
      }

      // Only now, and only the paths that are worth a request.
      if (origin) {
        for (const path of CONTACT_PATHS) await scrape(origin + path)
      }

      if (pages.length === 0) {
        console.log(`  ✗ ${host} — nothing scraped`)
        continue
      }

      const harvested = [...new Set(pages.flatMap((p) => harvestEmails(p.content)))]
      const verified = await verifyEmails(harvested)

      candidates.push({
        host,
        homepage: origin ?? url,
        title: title ?? pages[0].title,
        pages,
        emails: verified.map((v) => ({ email: v.email, verification: v.verification })),
      })

      // Written now rather than at the end. A crawl is minutes of paid requests
      // and it can be interrupted — by a hang, by a rate limit, by someone
      // stopping it — and a run that only writes on the last line loses every
      // site it did read. Same reasoning as printing failures instead of
      // swallowing them: partial work is still work, and it should be on disk.
      flush(outDir, candidates)

      const summary = verified.length
        ? verified.map((v) => `${v.email} [${v.verification.verdict}]`).join(', ')
        : 'no address found'
      console.log(`  ✓ ${host} — ${pages.length} page(s) — ${summary}`)
    }
  }

  const withAddress = candidates.filter((c) => c.emails.some((e) => e.verification.verdict !== 'undeliverable'))
  console.log(`\n${candidates.length} site(s) crawled, ${withAddress.length} with a usable address`)
  console.log(`  → ${join(outDir, '_candidates.json')}`)
  console.log(`  → ${outDir}/NN-host.md (what was read)`)
  console.log(
    '\nRead them, then author prospects.json as:\n' +
      '  [{ "host": "...", "company": "...", "contactName": null, "email": "...",\n' +
      '     "location": "...", "fitEvidence": ["<verbatim span from that site>"],\n' +
      '     "notes": "..." }]\n' +
      'Every fitEvidence span is checked against the scraped pages on import.'
  )
}

interface AuthoredProspect {
  host: string
  company: string
  contactName: string | null
  email: string
  website?: string | null
  location: string | null
  /** Verbatim spans from that site showing it fits the segment. */
  fitEvidence: string[]
  notes?: string | null
}

/** Whitespace only — the same normalisation the evidence checks use. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

async function cmdImport() {
  const dir = required('dir')
  const dryRun = process.argv.includes('--dry-run')
  const authored = JSON.parse(readFileSync(required('prospects'), 'utf8')) as AuthoredProspect[]
  if (!Array.isArray(authored)) throw new Error('prospects file must be an array')

  const candidates = JSON.parse(
    readFileSync(join(dir, '_candidates.json'), 'utf8')
  ) as Candidate[]
  const byHost = new Map(candidates.map((c) => [c.host, c]))

  const supabase = await createServiceClient()
  const segmentId = required('segment')
  const segment = await getSegment(supabase, segmentId)
  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const problems: string[] = []

  // Re-verified rather than trusted from the crawl file. The crawl may have run
  // days ago, and the file is hand-edited between the two steps.
  const verifications = await verifyEmails(authored.map((a) => a?.email ?? ''))

  authored.forEach((a, i) => {
    const label = a?.company ?? `[${i}]`

    if (!a?.company) problems.push(`[${i}] no company`)
    if (!a?.email) problems.push(`[${i}] ${label}: no email`)
    if (!a?.host) problems.push(`[${i}] ${label}: no host — needed to check the fit evidence`)

    const candidate = byHost.get(a?.host ?? '')
    if (a?.host && !candidate) {
      problems.push(`[${i}] ${label}: host "${a.host}" was not crawled into ${dir}`)
    }

    const verification = verifications[i]?.verification
    if (verification?.verdict === 'undeliverable') {
      problems.push(`[${i}] ${label}: ${a.email} is undeliverable — ${verification.reasons[0]}`)
    }

    if (!Array.isArray(a?.fitEvidence) || a.fitEvidence.length === 0) {
      problems.push(
        `[${i}] ${label}: no fitEvidence. A prospect with nothing quotable behind it is a guess, ` +
          'and qualification has nothing to read.'
      )
    } else if (candidate) {
      const haystack = norm(candidate.pages.map((p) => p.content).join('\n'))
      for (const span of a.fitEvidence) {
        if (!haystack.includes(norm(span))) {
          problems.push(`[${i}] ${label}: fit evidence not verbatim on ${a.host}: "${span.slice(0, 70)}"`)
        }
      }
    }
  })

  // Against the partial unique index on lower(email), checked up front so a
  // collision reads as a skip rather than a constraint error naming an index.
  const emails = authored.map((a) => a?.email?.toLowerCase()).filter(Boolean) as string[]
  const { data: existing } = emails.length
    ? await supabase.from('marketing_prospects').select('company, email').in('email', emails)
    : { data: [] }
  const onFile = new Map(
    ((existing ?? []) as { company: string; email: string | null }[])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase(), e.company])
  )

  if (problems.length > 0) {
    console.error(`\nRefusing to import — ${problems.length} problem(s):`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }

  console.log(`\n▸ Importing ${authored.length} prospect(s) into "${segment.name}"${dryRun ? ' (DRY RUN)' : ''}\n`)

  let imported = 0
  for (const [i, a] of authored.entries()) {
    const verification = verifications[i].verification
    const holder = onFile.get(a.email.toLowerCase())

    if (holder) {
      console.log(`  ▪ ${a.company} — already on file as "${holder}", left untouched`)
      continue
    }

    const mark = verification.verdict === 'deliverable' ? '✓' : '!'
    console.log(`  ${mark} ${a.company} <${a.email}> — ${verification.verdict}`)
    for (const r of verification.reasons) console.log(`      · ${r}`)
    for (const f of verification.flags) console.log(`      ⚑ ${f}`)
    for (const span of a.fitEvidence) console.log(`      “${span.slice(0, 96)}”`)

    if (dryRun) continue

    // The fit evidence goes into `notes`, which is what `qualify.ts` reads. A
    // prospect row is the only thing qualification sees, so evidence that stayed
    // in a file on disk may as well not exist.
    const notes = [
      a.notes ?? null,
      ...a.fitEvidence.map((s) => `“${s}”`),
      `Discovered from ${a.host} on ${new Date().toISOString().slice(0, 10)}.`,
    ]
      .filter(Boolean)
      .join(' ')

    const { error } = await supabase.from('marketing_prospects').insert({
      segment_id: segmentId,
      company: a.company,
      contact_name: a.contactName,
      email: a.email.toLowerCase(),
      website: a.website ?? byHost.get(a.host)?.homepage ?? null,
      location: a.location,
      notes,
      email_verification: verification,
      verification_status: verification.verdict,
      // Unreviewed. Qualification is a separate, deliberate step.
      qualified: null,
      qualification_reason: null,
    })
    if (error) throw new Error(`Failed to import ${a.company}: ${error.message}`)
    imported++
  }

  console.log(
    `\n${dryRun ? 'Would import' : 'Imported'} ${dryRun ? authored.length - onFile.size : imported} row(s). ` +
      'All land qualified: null — run qualify-manual.ts next.'
  )
}

/** Prints what a crawl found, without re-fetching. */
async function cmdReview() {
  const dir = required('dir')
  const candidates = JSON.parse(readFileSync(join(dir, '_candidates.json'), 'utf8')) as Candidate[]

  const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  console.log(`\n${candidates.length} site(s), ${files.length} markdown file(s) in ${dir}\n`)

  for (const c of candidates) {
    console.log(`── ${c.host} ${c.title ? `— ${c.title.slice(0, 60)}` : ''}`)
    if (c.emails.length === 0) console.log('     no address found')
    for (const e of c.emails) {
      console.log(`     ${e.verification.verdict.padEnd(14)} ${e.email}`)
      for (const f of e.verification.flags) console.log(`         ⚑ ${f}`)
    }
  }
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'crawl') return cmdCrawl()
  if (cmd === 'import') return cmdImport()
  if (cmd === 'review') return cmdReview()
  throw new Error('usage: prospects-discover.ts <crawl|review|import> [...]')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
