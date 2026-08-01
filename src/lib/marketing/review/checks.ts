import type { BrandProfile } from '../config/brand-profile'
import type { CheckRule } from '../types'
import { urlResolves } from '../research/sources'

/**
 * The mechanical half of the brand QA gate.
 *
 * These encode brain/templates/cold-email.md's hard rules and the banned list
 * in brain/context/voice.md. They are enforced, not advisory: a variant that
 * fails any of them cannot reach the approval queue, and the failure names the
 * specific rule so the generator can be corrected rather than re-rolled.
 *
 * Everything here is deterministic. A model deciding whether copy is on-brand
 * is a judgement the human gate makes; a model deciding whether the word
 * "seamless" appears is a substitute for `includes()`.
 */

export interface CheckResult {
  rule: CheckRule
  passed: boolean
  detail: string | null
}

export interface VariantDraft {
  subject?: string | null
  body?: string | null
}

const WORD_RE = /[A-Za-z0-9'’-]+/g

export function countWords(text: string): number {
  return (text.match(WORD_RE) ?? []).length
}

/** Escapes a term for use inside a RegExp. */
function escapeRe(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Word-boundary match, case-insensitive, so "unlock" fires on "Unlock" and
 * "unlocks" but not on "unlocked-door-hardware" as a substring of a longer
 * token. Multi-word terms match across a single space run.
 */
function containsTerm(haystack: string, term: string): boolean {
  const pattern = escapeRe(term.trim()).replace(/\s+/g, '\\s+')
  return new RegExp(`(^|[^A-Za-z0-9])${pattern}(s|ing|ed)?($|[^A-Za-z0-9])`, 'i').test(haystack)
}

export function checkBannedWords(draft: VariantDraft, profile: BrandProfile): CheckResult {
  const text = `${draft.subject ?? ''}\n${draft.body ?? ''}`
  const hits: string[] = []

  for (const word of profile.bannedWords) {
    if (containsTerm(text, word)) hits.push(word)
  }
  for (const phrase of profile.hardRules.bannedPhrases) {
    if (containsTerm(text, phrase)) hits.push(phrase)
  }
  // Offering terms that may never be used externally — e.g. never call a
  // Design Sprint an "audit"; it sounds like the IRS and puts a prospect on
  // the defensive exactly when you need them open.
  for (const term of profile.offerConstraints.bannedOfferingTerms) {
    if (containsTerm(text, term)) hits.push(term)
  }

  return {
    rule: 'banned_words',
    passed: hits.length === 0,
    detail: hits.length ? `Banned: ${[...new Set(hits)].join(', ')}` : null,
  }
}

export function checkWordCount(draft: VariantDraft, profile: BrandProfile): CheckResult {
  const bodyWords = countWords(draft.body ?? '')
  const { maxWords, subjectMinWords, subjectMaxWords } = profile.hardRules

  const problems: string[] = []
  if (bodyWords === 0) problems.push('body is empty')
  else if (bodyWords > maxWords) problems.push(`body is ${bodyWords} words (max ${maxWords})`)

  if (draft.subject !== undefined && draft.subject !== null) {
    const subjectWords = countWords(draft.subject)
    if (subjectWords < subjectMinWords || subjectWords > subjectMaxWords) {
      problems.push(
        `subject is ${subjectWords} words (want ${subjectMinWords}–${subjectMaxWords})`
      )
    }
  }

  return {
    rule: 'word_count',
    passed: problems.length === 0,
    detail: problems.length ? problems.join('; ') : `${bodyWords} words`,
  }
}

/**
 * The first line has to work standalone and must not open with "I" — the email
 * opens on the reader's operation, not on ours.
 */
export function checkOpensWithI(draft: VariantDraft, profile: BrandProfile): CheckResult {
  const body = (draft.body ?? '').trim()
  if (!body) return { rule: 'opens_with_i', passed: false, detail: 'body is empty' }

  const firstWord = body.match(WORD_RE)?.[0] ?? ''
  const banned = profile.hardRules.bannedOpeningWords.map((w) => w.toLowerCase())
  const hit = banned.includes(firstWord.toLowerCase())

  return {
    rule: 'opens_with_i',
    passed: !hit,
    detail: hit ? `Opens with "${firstWord}"` : null,
  }
}

/**
 * One ask. One link, one question, one next step.
 *
 * Questions and links are capped separately rather than summed. The template's
 * own worked example names the proof asset *and* closes on a question — that is
 * the intended shape, and summing them would reject it. What "one ask" forbids
 * is two questions, or a proof link plus a calendar link: two of the same kind
 * of thing, which is what actually gives the reader a way to stall.
 */
export function checkOneAsk(draft: VariantDraft, profile: BrandProfile): CheckResult {
  const body = draft.body ?? ''
  const questions = (body.match(/\?/g) ?? []).length
  const links = extractUrls(body).length
  const max = profile.hardRules.maxAsks

  const problems: string[] = []
  if (questions > max) problems.push(`${questions} questions (max ${max})`)
  if (links > max) problems.push(`${links} links (max ${max})`)
  if (questions + links === 0) problems.push('no ask — the email has no next step')

  return {
    rule: 'one_ask',
    passed: problems.length === 0,
    detail: problems.length
      ? problems.join('; ')
      : `${questions} question${questions === 1 ? '' : 's'}, ${links} link${links === 1 ? '' : 's'}`,
  }
}

/**
 * Bare domains count as links.
 *
 * Cold copy writes "live at post-trip.vercel.app", not "https://…" — a reader
 * clicks it either way, so a rule that only sees schemed URLs verifies nothing
 * on the emails actually being sent. Matches are returned normalized to an
 * absolute URL so callers can parse and fetch them.
 *
 * The bare-domain half is deliberately narrow: lowercase only, no whitespace
 * around the dot, a fixed TLD set, and not preceded by `@` or `/` — so an email
 * address and the tail of a schemed URL don't double-match, and a sentence
 * boundary ("one tap. So we…") can't be mistaken for a hostname.
 */
const SCHEMED_URL_RE = /https?:\/\/[^\s<>")\]]+/gi
const BARE_DOMAIN_RE =
  /(?<![@A-Za-z0-9._\-/])(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|ai|co|xyz)\b(?:\/[^\s<>")\]]*)?/g

export function extractUrls(text: string): string[] {
  // Trailing punctuation is nearly always sentence punctuation, not the URL.
  const trim = (u: string) => u.replace(/[.,;:!?)]+$/, '')

  const schemed = (text.match(SCHEMED_URL_RE) ?? []).map(trim)
  const bare = (text.match(BARE_DOMAIN_RE) ?? []).map(trim).map((d) => `https://${d}`)

  return [...new Set([...schemed, ...bare])]
}

/**
 * Every link must resolve. A proof asset behind a dead link is worse than no
 * proof asset — it is the exact thing an ICP who has been burned before is
 * watching for.
 */
export async function checkLinksResolve(
  draft: VariantDraft,
  profile: BrandProfile
): Promise<CheckResult> {
  if (!profile.hardRules.requireResolvableLinks) {
    return { rule: 'link_verified', passed: true, detail: 'link verification disabled' }
  }

  const urls = extractUrls(draft.body ?? '')
  if (urls.length === 0) {
    return { rule: 'link_verified', passed: true, detail: 'no links' }
  }

  const results = await Promise.all(
    urls.map(async (url) => ({ url, ok: await urlResolves(url) }))
  )
  const dead = results.filter((r) => !r.ok).map((r) => r.url)

  return {
    rule: 'link_verified',
    passed: dead.length === 0,
    detail: dead.length ? `Dead: ${dead.join(', ')}` : `${urls.length} link(s) resolve`,
  }
}

/**
 * Claims trace to something on file.
 *
 * Two failure modes, both damaging and both mechanical:
 *   - claiming a result for an offering marked never-delivered
 *   - naming a proof asset that is not in the brand profile
 *
 * Numeric claims are flagged rather than failed. "Never invent a number" is
 * the rule that does actual damage when broken, but a checker cannot tell a
 * fabricated figure from a sourced one — so it surfaces every number for the
 * human gate instead of guessing.
 */
export function checkClaimsTraced(draft: VariantDraft, profile: BrandProfile): CheckResult {
  const text = `${draft.subject ?? ''}\n${draft.body ?? ''}`
  const problems: string[] = []

  const intended = profile.offerConstraints.offerings.filter((o) => o.status === 'intended')
  for (const offering of intended) {
    if (!containsTerm(text, offering.name)) continue
    // Naming it is fine — describing, scoping, and quoting are all allowed.
    // Claiming an outcome for it is not.
    const resultLanguage =
      /\b(helped|saved|delivered|resulted in|increased|reduced|improved|clients? (?:have|has)|we've done|track record|proven)\b/i
    if (resultLanguage.test(text)) {
      problems.push(
        `"${offering.name}" is marked never-delivered but the copy reads as a claimed result`
      )
    }
  }

  const namedAssets = profile.proofAssets.filter((a) => containsTerm(text, a.name))
  const urls = extractUrls(draft.body ?? '')
  const knownHosts = new Set(
    profile.proofAssets.map((a) => {
      try {
        return new URL(a.url).host.replace(/^www\./, '')
      } catch {
        return a.url
      }
    })
  )
  for (const url of urls) {
    let host: string
    try {
      host = new URL(url).host.replace(/^www\./, '')
    } catch {
      problems.push(`Unparseable url: ${url}`)
      continue
    }
    if (!knownHosts.has(host)) {
      problems.push(`Link to ${host} is not a proof asset on file`)
    }
  }

  const numbers = text.match(/(?<![\w/])[$£€]?\d[\d,]*(?:\.\d+)?\s*(?:%|hours?|hrs?|k\b|x\b)?/gi) ?? []
  const notes: string[] = []
  if (numbers.length > 0) {
    // Trailing separators come from the surrounding sentence ("the Mighty 5, Grand…").
    const cleaned = numbers.map((n) => n.trim().replace(/[,.]+$/, '')).filter(Boolean)
    notes.push(`Numbers to verify: ${[...new Set(cleaned)].join(', ')}`)
  }
  if (namedAssets.length > 0) {
    notes.push(`Proof: ${namedAssets.map((a) => a.name).join(', ')}`)
  }

  return {
    rule: 'claim_traced',
    passed: problems.length === 0,
    detail: [...problems, ...notes].join(' · ') || null,
  }
}

/**
 * Runs every mechanical rule. The `human` check is never produced here — it is
 * written by an actual approval and is the one rule no code can pass on
 * someone's behalf.
 */
export async function runChecks(
  draft: VariantDraft,
  profile: BrandProfile
): Promise<CheckResult[]> {
  return [
    checkBannedWords(draft, profile),
    checkWordCount(draft, profile),
    checkOpensWithI(draft, profile),
    checkOneAsk(draft, profile),
    checkClaimsTraced(draft, profile),
    await checkLinksResolve(draft, profile),
  ]
}

export function checksPassed(results: CheckResult[]): boolean {
  return results.every((r) => r.passed)
}
