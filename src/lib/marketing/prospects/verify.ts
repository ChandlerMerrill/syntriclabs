import { resolveMx } from 'node:dns/promises'
import type { EmailVerification, VerificationVerdict } from '../types'

/**
 * Whether an address is worth sending to, decided before the send rather than
 * explained after it.
 *
 * Hard bounces are the one deliverability number that is cheap to control and
 * expensive to recover from: past roughly 2% of a batch, the receiving side
 * stops treating the domain as a good citizen, and Syntric sends its ordinary
 * client mail from that same domain. Everything here is aimed at that number.
 *
 * Three checks, in the order they get cheaper to be wrong about:
 *
 *   1. **Syntax**, using the same `EMAIL_RE` shape the CSV importer uses. A
 *      malformed address is a typo, not a bounce risk — it never had a chance.
 *   2. **MX lookup**, over DNS. Free, no account, no third party. A domain with
 *      no mail exchanger cannot accept mail from anyone, so this is a guaranteed
 *      hard bounce and the single biggest lever available without paying for a
 *      verifier.
 *   3. **What the address is** — role, free provider, disposable. None of these
 *      say anything about whether mail is accepted; they say something about
 *      who reads it, which is a different decision and is kept separate.
 *
 * What this deliberately does not do is prove the mailbox exists. That needs an
 * SMTP probe (rude, frequently blocked, and a good way to get a sending IP
 * listed) or a paid verifier. At twenty sends a day the gap is acceptable; it is
 * the first thing to buy when the list grows.
 *
 * ── Role addresses are flagged, not dropped ───────────────────────────────
 *
 * The standard advice — never mail `info@` — is written for lists of thousands
 * where a role address is a shared inbox nobody owns. For a two-person outfitter
 * whose website lists exactly one address, `info@` *is* the owner's inbox, and
 * dropping it would drop the segment. So a role address lands `risky`: it
 * imports, it sends late, it sends in small batches, and if it is going to hurt
 * the reply rate that shows up in the eval rather than in a rule nobody revisits.
 */

/** Same shape the CSV importer accepts, so a row cannot pass one and fail the other. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Local parts that usually address a function rather than a person. Matched
 * exactly against the lowercased local part — `info` is a role, `infosec` is a
 * team and `dave.info` is a person.
 */
const ROLE_LOCAL_PARTS = new Set([
  'info',
  'contact',
  'hello',
  'hi',
  'admin',
  'office',
  'bookings',
  'booking',
  'reservations',
  'reservation',
  'sales',
  'support',
  'help',
  'enquiries',
  'inquiries',
  'enquiry',
  'inquiry',
  'mail',
  'email',
  'team',
  'staff',
  'general',
  'main',
  'front desk',
  'frontdesk',
  'accounts',
  'accounting',
  'billing',
  'orders',
  'service',
  'customerservice',
  'webmaster',
  'postmaster',
  'noreply',
  'no-reply',
  'donotreply',
])

/**
 * Addresses that exist to be thrown away. Dropped outright rather than flagged:
 * unlike a role address there is no reading of a disposable inbox where a real
 * business is behind it, and mail to one is either ignored or reported.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'mailnesia.com',
  'spamgourmet.com',
  'mintemail.com',
  'moakt.com',
  'emailondeck.com',
])

/**
 * Consumer mailbox providers. Flagged, never a verdict on their own — a
 * one-truck outfitter running the business from a Gmail address is the normal
 * case in this segment, not a warning sign. Worth seeing because it means the
 * domain tells you nothing about the company, so the company has to be verified
 * some other way.
 */
const FREE_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'zoho.com',
  'comcast.net',
  'att.net',
  'verizon.net',
  'sbcglobal.net',
  'bellsouth.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
])

export interface VerifyOptions {
  /**
   * How long a single MX lookup gets. A resolver that hangs must not be able to
   * stall a discovery run, and a timeout is explicitly *not* the same as an
   * absent MX record — see `mxTimedOut` below.
   */
  timeoutMs?: number
  /** Injected in tests. Defaults to `node:dns/promises`. */
  resolve?: (domain: string) => Promise<{ exchange: string; priority: number }[]>
}

/** Node's DNS errors carry the useful part in `code`, not in `message`. */
function dnsCode(err: unknown): string | null {
  const code = (err as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : null
}

async function lookupMx(
  domain: string,
  opts: VerifyOptions
): Promise<{ mx: string[]; error: string | null; timedOut: boolean }> {
  const resolve = opts.resolve ?? ((d: string) => resolveMx(d))
  const timeoutMs = opts.timeoutMs ?? 5000

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((res) => {
    timer = setTimeout(() => res('timeout'), timeoutMs)
  })

  try {
    const result = await Promise.race([resolve(domain), timeout])
    if (result === 'timeout') return { mx: [], error: 'lookup timed out', timedOut: true }

    const mx = [...result]
      .filter((r) => r.exchange && r.exchange !== '.')
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange.toLowerCase())

    return { mx, error: mx.length ? null : 'no usable MX records', timedOut: false }
  } catch (err) {
    const code = dnsCode(err)
    // NXDOMAIN and NODATA are answers: the domain does not exist, or it exists
    // and publishes no mail exchanger. Anything else is the resolver failing,
    // which is a fact about this machine and not about the address.
    const answered = code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN'
    return {
      mx: [],
      error: code ?? (err instanceof Error ? err.message : 'lookup failed'),
      timedOut: !answered,
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

type MxResult = { mx: string[]; error: string | null; timedOut: boolean }

/** The syntax and address-shape half — everything decidable without the network. */
function parse(rawEmail: string): { email: string; localPart: string; domain: string } | string {
  const email = rawEmail.trim().toLowerCase()
  if (!email) return 'empty address'
  if (!EMAIL_RE.test(email)) return `not an email address — "${rawEmail.trim()}"`

  const at = email.lastIndexOf('@')
  const domain = email.slice(at + 1)
  if (DISPOSABLE_DOMAINS.has(domain)) return `${domain} is a disposable-address service`

  return { email, localPart: email.slice(0, at), domain }
}

/**
 * The verdict, given a parsed address and whatever DNS said. Split out from the
 * lookup so a batch can answer one domain once and still put every address on
 * it through exactly this reasoning — a cached result must not produce a
 * different verdict, or a thinner reason, than a fresh one.
 */
function judge(
  parsed: { localPart: string; domain: string },
  { mx, error, timedOut }: MxResult,
  checkedAt: string
): EmailVerification {
  const { localPart, domain } = parsed

  // A domain that answers DNS with "no mail here" is a certain bounce. A
  // resolver that could not get an answer is not, and calling it one would
  // quietly delete good rows on a flaky network.
  if (mx.length === 0 && !timedOut) {
    return {
      verdict: 'undeliverable',
      checkedAt,
      domain,
      mx: [],
      reasons: [`${domain} has no mail exchanger (${error ?? 'no MX records'})`],
      flags: [],
    }
  }

  const reasons: string[] = []
  const flags: string[] = []
  let verdict: VerificationVerdict = 'deliverable'

  if (mx.length === 0) {
    verdict = 'risky'
    reasons.push(`MX lookup for ${domain} did not complete (${error ?? 'unknown'}) — unverified`)
  } else {
    reasons.push(`${domain} accepts mail via ${mx[0]}${mx.length > 1 ? ` (+${mx.length - 1})` : ''}`)
  }

  if (ROLE_LOCAL_PARTS.has(localPart)) {
    verdict = 'risky'
    reasons.push(
      `${localPart}@ is a role address — for an owner-operated business it is often the owner, ` +
        'which is why it is not dropped, but it may also be a shared inbox'
    )
  }

  if (FREE_PROVIDERS.has(domain)) {
    flags.push(`${domain} is a consumer mailbox provider — the domain says nothing about the company`)
  }

  // A plus-alias is how the seeded test rows addressed the operator's own inbox.
  // Worth surfacing so a test address cannot slip into a real batch unremarked.
  if (localPart.includes('+')) {
    flags.push('address carries a plus-alias — check this is not a test address')
  }

  return { verdict, checkedAt, domain, mx, reasons, flags }
}

/**
 * Verifies one address.
 *
 * Never throws. A verification that cannot complete returns `risky` with the
 * reason on the record, because the alternative — a thrown error somewhere in a
 * discovery loop — is a list that silently skips whatever it could not check.
 */
export async function verifyEmail(
  rawEmail: string,
  opts: VerifyOptions = {}
): Promise<EmailVerification> {
  const checkedAt = new Date().toISOString()
  const parsed = parse(rawEmail)

  if (typeof parsed === 'string') {
    const at = rawEmail.trim().toLowerCase().lastIndexOf('@')
    return {
      verdict: 'undeliverable',
      checkedAt,
      domain: at > -1 ? rawEmail.trim().toLowerCase().slice(at + 1) : null,
      mx: [],
      reasons: [parsed],
      flags: [],
    }
  }

  return judge(parsed, await lookupMx(parsed.domain, opts), checkedAt)
}

export interface VerifiedAddress {
  email: string
  verification: EmailVerification
}

/**
 * Verifies a list, one DNS answer per domain.
 *
 * Discovery routinely returns several addresses on one domain, and asking the
 * resolver the same question ten times is both slower and a good way to get
 * rate-limited by it.
 */
export async function verifyEmails(
  emails: string[],
  opts: VerifyOptions = {}
): Promise<VerifiedAddress[]> {
  const byDomain = new Map<string, Promise<MxResult>>()
  const out: VerifiedAddress[] = []

  for (const raw of emails) {
    const checkedAt = new Date().toISOString()
    const email = raw.trim().toLowerCase()
    const parsed = parse(raw)

    if (typeof parsed === 'string') {
      const at = email.lastIndexOf('@')
      out.push({
        email,
        verification: {
          verdict: 'undeliverable',
          checkedAt,
          domain: at > -1 ? email.slice(at + 1) : null,
          mx: [],
          reasons: [parsed],
          flags: [],
        },
      })
      continue
    }

    let pending = byDomain.get(parsed.domain)
    if (!pending) {
      pending = lookupMx(parsed.domain, opts)
      byDomain.set(parsed.domain, pending)
    }

    out.push({ email: parsed.email, verification: judge(parsed, await pending, checkedAt) })
  }

  return out
}

/**
 * Send order. `deliverable` first, `risky` last, `undeliverable` never — the
 * batch shape the 2026 cold-email guidance describes for catch-all and role
 * handling, expressed as an ordering rather than a filter so a risky address
 * still gets its chance, just not first and not in a crowd.
 */
export function sendOrder(a: VerificationVerdict, b: VerificationVerdict): number {
  const weight: Record<VerificationVerdict, number> = {
    deliverable: 0,
    risky: 1,
    undeliverable: 2,
  }
  return weight[a] - weight[b]
}
