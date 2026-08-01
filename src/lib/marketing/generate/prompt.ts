import type { BrandProfile, ProofAsset } from '../config/brand-profile'
import type { MarketingChannel, MarketingPainPoint, MarketingSegment } from '../types'

/**
 * The generation prompt.
 *
 * This string is the thing the phase exists to produce. It is stored verbatim
 * on every variant row it generates (`marketing_variants.generation_prompt`,
 * NOT NULL) so that a variant which performs can be traced back to the
 * instruction that produced it. A loop that records only outputs can improve
 * selection and can never improve generation.
 *
 * It is therefore built deterministically from data — brand profile, segment,
 * pain point, proof asset — and never from ambient state. Two runs against the
 * same inputs produce the same prompt, which is what makes comparing across
 * rows mean anything.
 *
 * Bump GENERATION_PROMPT_VERSION whenever the *structure* here changes, so the
 * performance view can separate "this angle won" from "this scaffold changed
 * underneath us".
 */
// v2 — "AI front office" entered the offerings list as never-delivered, which
// adds a line to "What may be claimed". Every prompt built from here differs
// from the v1 rows by exactly that line: proof-asset selection changed in the
// same commit and moved nothing, and all six v1 prompts were checked to rebuild
// byte-identical apart from it.
export const GENERATION_PROMPT_VERSION = 'v2'

export type SegmentContext = Pick<
  MarketingSegment,
  'id' | 'slug' | 'name' | 'description' | 'qualifiers' | 'disqualifiers'
>

export type PainPointContext = Pick<
  MarketingPainPoint,
  'id' | 'statement' | 'frequency' | 'icp_fear' | 'evidence'
>

export interface GenerationTarget {
  profile: BrandProfile
  campaign: { name: string; goal: string | null; channel: MarketingChannel }
  segment: SegmentContext | null
  painPoint: PainPointContext | null
  proofAsset: ProofAsset | null
  /** How many distinct angles to produce in one call. */
  variantCount: number
  /** Free-text steer from whoever pressed the button. Optional. */
  guidance?: string | null
}

/**
 * Picks the proof asset that is credible for a segment.
 *
 * Prefers one explicitly scoped to the segment, then one scoped to nothing —
 * which is a declaration that the asset travels, not an absence of one.
 * Returns null when neither exists.
 *
 * There is deliberately no last-resort fallback to the first asset on file.
 * That fallback read as harmless and was not: it made a segment with no
 * credible proof silently inherit whichever asset happened to be first, so a
 * vet clinic would have been offered a clothing-supplier platform. A segment
 * with nothing credible on file gets an email that earns attention on the
 * observation alone, and `proofSection` says so.
 */
export function selectProofAsset(
  profile: BrandProfile,
  segmentSlug?: string | null
): ProofAsset | null {
  if (segmentSlug) {
    const scoped = profile.proofAssets.find((a) => a.segments.includes(segmentSlug))
    if (scoped) return scoped
  }
  return profile.proofAssets.find((a) => a.segments.length === 0) ?? null
}

function bullets(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join('\n') : '(none recorded)'
}

function voiceSection(profile: BrandProfile): string {
  const lines: string[] = []
  for (const c of profile.voiceRules.characteristics) {
    lines.push(`- ${c.rule}`)
    if (c.good) lines.push(`  - Like this: ${c.good}`)
    if (c.bad) lines.push(`  - Not this: ${c.bad}`)
  }
  return lines.length ? lines.join('\n') : '(none recorded)'
}

function proofSection(asset: ProofAsset | null, segmentSlug: string | null): string {
  if (!asset) {
    return [
      'None on file.',
      '',
      'Do not invent one, and do not gesture at unnamed "past clients". Without a',
      'proof asset the email has to earn attention on the observation alone.',
    ].join('\n')
  }

  // Anything not scoped to this segment is off-domain here — including an asset
  // declared usable anywhere. "Travels" means it may be named, not that it is
  // about this industry, and that difference has to be said out loud rather
  // than left for the reader to discover.
  const offDomain = !!segmentSlug && !asset.segments.includes(segmentSlug)

  return [
    `${asset.name} — ${asset.url}`,
    asset.description,
    '',
    offDomain
      ? 'This asset is not scoped to this segment. If you name it, say plainly that it is a ' +
        'different industry with the same problem shape. Pretending relevance is not credible; ' +
        'naming the difference is.'
      : 'This is the one asset you may name. Describe it as what it actually is — do not ' +
        'upgrade it into a product, a platform, or a track record it does not have.',
  ].join('\n')
}

function painPointSection(painPoint: PainPointContext | null): string {
  if (!painPoint) {
    return [
      'No researched pain point supplied.',
      '',
      'Write from the ICP situation and the named fears instead, and stay at the level of',
      'what is on file. Do not invent a specific operational detail to open on.',
    ].join('\n')
  }

  const evidence = painPoint.evidence
    .slice(0, 5)
    .map((e) => `- "${e.quote}"${e.url ? ` — ${e.url}` : ''}`)
    .join('\n')

  return [
    painPoint.statement,
    '',
    `Appears across ${painPoint.frequency} distinct source${painPoint.frequency === 1 ? '' : 's'}.` +
      (painPoint.icp_fear ? ` Maps to the fear: ${painPoint.icp_fear}.` : ''),
    '',
    'What operators actually said:',
    evidence || '(no quotes recorded)',
    '',
    'These quotes are the evidence, not copy. Do not paste one into the email and do not',
    'quote a number that does not appear in them.',
  ].join('\n')
}

function offeringsSection(profile: BrandProfile): string {
  const { offerings, bannedOfferingTerms } = profile.offerConstraints
  const proven = offerings.filter((o) => o.status === 'proven')
  const intended = offerings.filter((o) => o.status === 'intended')

  const lines: string[] = []

  lines.push('**Results may be cited for these:**')
  lines.push(bullets(proven.map((o) => `${o.name}${o.notes ? ` — ${o.notes}` : ''}`)))
  lines.push('')
  lines.push('**Never delivered. May be described, scoped, and quoted — never claimed as an outcome')
  lines.push('or a track record:**')
  lines.push(bullets(intended.map((o) => `${o.name}${o.notes ? ` — ${o.notes}` : ''}`)))

  if (bannedOfferingTerms.length) {
    lines.push('')
    lines.push(
      `Never use these words for an offering, externally: ${bannedOfferingTerms.join(', ')}.`
    )
  }

  return lines.join('\n')
}

/** The short, stable framing. The long, data-driven half goes in the user prompt. */
export function buildGenerationSystemPrompt(): string {
  return [
    'You write cold outreach for a one-person software company selling to small business owners.',
    '',
    'You are working under constraints that are mechanically enforced after you write: a checker',
    'reads every variant and rejects it by name — banned_words, word_count, opens_with_i, one_ask,',
    'link_verified, claim_traced. A rejected variant is not quietly fixed; it is a failure that',
    'someone reads. Treat the constraints as the specification, not as style advice.',
    '',
    'The single worst thing you can do is invent a fact — a number, a client, a result, a detail',
    'about the reader’s operation. Everything you assert must come from the material below.',
    'Writing less is always available to you. Making something up is not.',
  ].join('\n')
}

export function buildGenerationPrompt(target: GenerationTarget): string {
  const { profile, campaign, segment, painPoint, proofAsset, variantCount, guidance } = target
  const { voiceRules, hardRules, icp } = profile
  const segmentSlug = segment?.slug ?? null

  const sections: string[] = []

  sections.push(`# Cold ${campaign.channel === 'email' ? 'email' : campaign.channel} — ${variantCount} variant${variantCount === 1 ? '' : 's'}`)

  sections.push(
    [
      '## Campaign',
      `Name: ${campaign.name}`,
      `Channel: ${campaign.channel}`,
      `Goal: ${campaign.goal ?? '(not stated)'}`,
    ].join('\n')
  )

  sections.push(['## Who is writing', voiceRules.speaker].join('\n'))

  sections.push(['## Voice', voiceSection(profile)].join('\n'))

  if (voiceRules.useCarefully.length) {
    sections.push(
      [
        '## Words to use carefully',
        `${voiceRules.useCarefully.join(', ')}`,
        '',
        'Allowed only when an immediate concrete specific follows. "Saves time" is not a specific.',
        '"Cuts the February client-count reconciliation from a weekend to a tap" is.',
      ].join('\n')
    )
  }

  sections.push(['## Content rules', bullets(voiceRules.contentRules)].join('\n'))

  sections.push(
    [
      '## The first line',
      bullets(voiceRules.hookRules),
      '',
      'This is the whole email. Everything after it is supporting material. If line 1 could be',
      'sent to a different company in the same segment without editing, it has failed and the',
      'rest does not matter.',
    ].join('\n')
  )

  sections.push(
    [
      '## Who you are writing to',
      `Revenue: ${icp.revenueBand ?? '(not recorded)'}`,
      `Headcount: ${icp.headcount ?? '(not recorded)'}`,
      `Decision maker: ${icp.decisionMaker ?? '(not recorded)'}`,
      '',
      `Situation: ${icp.situation ?? '(not recorded)'}`,
      `Mindset: ${icp.mindset ?? '(not recorded)'}`,
      '',
      '**Named fears** — aim each variant at one of these, by key:',
      bullets(icp.fears.map((f) => `${f.key}: ${f.statement}`)),
      '',
      '**Objections already in their head:**',
      bullets(icp.objections),
      '',
      'Acknowledging an objection plainly beats pre-empting it with reassurance. These are people',
      'who have been sold to before.',
    ].join('\n')
  )

  if (segment) {
    sections.push(
      [
        '## Segment',
        `${segment.name}${segment.description ? ` — ${segment.description}` : ''}`,
        '',
        '**Qualifies:**',
        bullets(segment.qualifiers),
        '',
        '**Does not qualify** (do not write to these):',
        bullets(segment.disqualifiers),
      ].join('\n')
    )
  }

  sections.push(['## The pain point', painPointSection(painPoint)].join('\n'))

  sections.push(['## Proof asset', proofSection(proofAsset, segmentSlug)].join('\n'))

  sections.push(['## What may be claimed', offeringsSection(profile)].join('\n'))

  sections.push(
    [
      '## Banned words — these fail the check outright',
      profile.bannedWords.join(', ') || '(none)',
      '',
      '**Banned phrases:**',
      hardRules.bannedPhrases.map((p) => `"${p}"`).join(', ') || '(none)',
      '',
      `**The body may not open with:** ${hardRules.bannedOpeningWords.join(', ') || '(none)'}`,
    ].join('\n')
  )

  sections.push(
    [
      '## Hard constraints',
      `- Body is under ${hardRules.maxWords} words. Not approximately — the checker counts.`,
      `- Subject is ${hardRules.subjectMinWords}–${hardRules.subjectMaxWords} words, specific to them, no colon-y marketing construction.`,
      `- At most ${hardRules.maxAsks} question mark and at most ${hardRules.maxAsks} link in the body. At least one of the two.`,
      '  A question outperforms a calendar link in a first email.',
      proofAsset
        ? `- The only URL you may write is ${proofAsset.url}. Any other link fails claim_traced.`
        : '- Do not include a URL. There is no proof asset on file to link to.',
      hardRules.requireResolvableLinks
        ? '- Every link is fetched and must resolve before the variant can be approved.'
        : '',
      '- Never write a number that does not appear in the material above. Not theirs, not ours.',
      '- No sign-off, no signature, no contact details. The body is the message only; the sign-off',
      '  is appended when the email is rendered for a specific prospect.',
      '- No greeting line ("Hi there,"). Open on the observation.',
    ]
      .filter(Boolean)
      .join('\n')
  )

  sections.push(
    [
      '## Personalization',
      'A variant is written once and sent to many prospects in this segment. Two tokens are',
      'substituted at send time:',
      '',
      '- `{{company}}` — the prospect company name',
      '- `{{first_name}}` — the contact’s first name, when one is known',
      '',
      'Use them only where a real detail belongs. `{{company}}` dropped into a generic sentence is',
      'mail-merge, and reads as mail-merge. A line that is specific about the *segment’s* operation',
      'is stronger than a generic line with a name glued into it. Prefer no token to a decorative one.',
      '',
      '`{{first_name}}` is not always available — a variant that depends on it can only be sent to',
      'prospects with a named contact.',
    ].join('\n')
  )

  sections.push(
    [
      '## Shape',
      '```',
      'Line 1 — an observation about THEIR operation, specific enough that it could not be sent',
      'to anyone else in the segment.',
      '',
      'Lines 2–3 — the pattern. What this costs an operation like theirs, stated plainly.',
      '',
      'Lines 4–5 — the proof. One asset, named, described in one sentence: what it is and who',
      'it was built for.',
      '',
      'Line 6 — the ask. Low friction.',
      '```',
    ].join('\n')
  )

  if (guidance) {
    sections.push(['## Additional steer for this run', guidance].join('\n'))
  }

  sections.push(
    [
      '## Task',
      `Write ${variantCount} variant${variantCount === 1 ? '' : 's'}.`,
      '',
      variantCount > 1
        ? [
            'They must differ in **angle**, not in wording. Rewriting the same email with different',
            'adjectives produces two rows that teach nothing when one of them wins. A different angle',
            'means a different entry point into the same pain — a different fear addressed, a',
            'different consequence named, a different question asked.',
            '',
            'For each variant give a short `label` naming the angle ("cua-reporting", "cost-per-departure"),',
            'and `angle` — one sentence on what makes it different from the others and why it might land.',
          ].join('\n')
        : 'Give it a short `label` naming the angle, and `angle` — one sentence on why it might land.',
      '',
      'Set `icpFear` to the key of the fear the variant aims at, or null if none of them fit. Do not',
      'force a match.',
      '',
      'Write the body as plain text with blank lines between paragraphs. No markdown, no bullets,',
      'no bold.',
    ].join('\n')
  )

  return sections.join('\n\n')
}
