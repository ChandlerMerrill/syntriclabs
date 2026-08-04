/**
 * Off-segment source rejection.
 *
 * Search substitutes the segment name into a query literally, so a segment whose
 * name is made of ordinary English words drags back documents that match the
 * words in a different sense. For "Guiding & outfitting" the first real run
 * returned a consultancy's "2026 Trends Guide", a field-service trends page, a
 * Land Cruiser intercooler thread, and an Indeed results page for "Entry Level
 * Booking Assistant" — four hosts that between them never once say "outfitter".
 *
 * Each of those would have cost an extraction call and then entered the cluster
 * as a peer of a real operator thread, which is the part that actually hurts:
 * `rank.ts` scores a pain point by how many distinct sources mention it, so an
 * off-segment source does not merely waste a call, it votes.
 *
 * ── What discriminates ────────────────────────────────────────────────────────
 * Measured against the 15 readable sources of that run, counting case-insensitive
 * substring hits for the stems "guid" and "outfit":
 *
 *     rokslide            guid×52  outfit×35      guidehouse.com   guid×60  outfit×0
 *     archerytalk         guid×74  outfit×80      fieldnation.com  guid×12  outfit×0
 *     CRS R46381          guid×64  outfit×63      youtube.com      guid×16  outfit×0
 *     guidefitter         guid×86  outfit×35      ih8mud.com       guid×1   outfit×0
 *     outfittermarketplace guid×40 outfit×12      indeed.com       guid×0   outfit×0
 *
 * The minimum across terms is 0 for every bad source and >=3 for every good one,
 * with nothing in between. The AND is what does the work, not the counts:
 * guidehouse.com says "guid" sixty times because Guidehouse is its name, so any
 * any-term or total-frequency rule keeps it. Requiring *every* segment term to
 * appear at least once drops all five and keeps all ten.
 *
 * ── Where this is fragile ─────────────────────────────────────────────────────
 * Requiring every term is right here because "guide" and "outfitter" are two
 * names for one trade and genuine material uses both. A segment named for two
 * actually-different trades — "HVAC & plumbing" — would have good plumbing
 * sources dropped for never saying HVAC. That case wants an explicit `terms`
 * override, which is why the check takes one. No column for it yet: there is one
 * segment and its name stems correctly. `relevance_skip_reason` on the row is the
 * thing that makes over-filtering visible when it happens, and it is the reason
 * this filter records rather than drops.
 *
 * The stemmer is crude on purpose and only handles inflection ("outfitting" ->
 * "outfit"). It will not connect "veterinary" to "veterinarian"; a segment that
 * needs that should pass `terms`.
 */

/** Connectives and articles. Nouns are never stripped — "services" in a segment
 *  name is a real term, and dropping it leaves something far too generic. */
const STOPWORDS = new Set(['and', 'or', 'of', 'for', 'the', 'a', 'an', 'in', 'to', 'with'])

/** Below this a stem matches too much to mean anything, so the token is kept whole. */
const MIN_STEM_LENGTH = 4

/**
 * Inflectional stem. Strips one plural/participle suffix and collapses the
 * consonant doubling that -ing/-ed introduce: "outfitting" -> "outfitt" ->
 * "outfit", which is then a substring of outfit, outfits, outfitter, outfitters
 * and outfitting alike.
 */
function stem(token: string): string {
  let s = token
  for (const suffix of ['ings', 'ing', 'ers', 'er', 'ed', 'es', 's']) {
    if (s.length - suffix.length >= MIN_STEM_LENGTH && s.endsWith(suffix)) {
      s = s.slice(0, -suffix.length)
      break
    }
  }
  // "outfitt" -> "outfit". Only for a doubled final consonant, so "class" and
  // "press" — where the doubling is part of the word — are left alone.
  if (s.length > MIN_STEM_LENGTH && /([bdfglmnprt])\1$/.test(s)) s = s.slice(0, -1)
  return s.length >= MIN_STEM_LENGTH ? s : token
}

/**
 * The terms a source must mention to count as on-segment.
 * "Guiding & outfitting" -> ["guid", "outfit"].
 */
export function segmentTerms(segmentName: string): string[] {
  const tokens = segmentName
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))

  const out: string[] = []
  for (const token of tokens) {
    const s = stem(token)
    // A stem that contains an earlier one adds no constraint the earlier one
    // did not already impose.
    if (!out.some((existing) => s.includes(existing))) out.push(s)
  }
  return out
}

export interface RelevanceVerdict {
  relevant: boolean
  /** Null when relevant. Stored verbatim on the source row. */
  reason: string | null
  hits: Record<string, number>
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    count++
    i = haystack.indexOf(needle, i + needle.length)
  }
  return count
}

/**
 * Whether a fetched source is about the segment at all.
 *
 * Fails open: a segment name that yields no usable terms passes everything,
 * because a filter that silently rejects an entire run is worse than no filter.
 */
export function assessRelevance(params: {
  segmentName: string
  content: string | null
  /** Overrides the terms derived from the name. See the module note. */
  terms?: string[]
  /** Occurrences of each term required. */
  minOccurrences?: number
}): RelevanceVerdict {
  const terms = params.terms?.length ? params.terms : segmentTerms(params.segmentName)
  if (terms.length === 0) return { relevant: true, reason: null, hits: {} }

  // Nothing to judge. Content-less rows already carry a fetch_error and are
  // filtered before extraction anyway.
  if (!params.content) return { relevant: true, reason: null, hits: {} }

  const min = params.minOccurrences ?? 1
  const haystack = params.content.toLowerCase()

  const hits: Record<string, number> = {}
  for (const term of terms) hits[term] = countOccurrences(haystack, term)

  const missing = terms.filter((t) => hits[t] < min)
  if (missing.length === 0) return { relevant: true, reason: null, hits }

  // Naming what *did* match is the useful half — "guid×60, outfit×0" is what
  // tells you the source matched the segment name in another sense, rather than
  // being merely thin.
  const present = terms
    .filter((t) => hits[t] >= min)
    .map((t) => `${t}×${hits[t]}`)
    .join(', ')

  const missingList = missing.map((t) => `"${t}"`).join(', ')
  return {
    relevant: false,
    reason: `off-segment: never mentions ${missingList}${present ? ` (matched ${present})` : ''}`,
    hits,
  }
}
