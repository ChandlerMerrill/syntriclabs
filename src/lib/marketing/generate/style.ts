/**
 * Style as a measured dimension rather than another hard rule.
 *
 * The house style is settled: it should read like Chandler typed it between two
 * other things. Short sentences, plain words, the point arrived at early, almost
 * no em dashes. That is `plain_direct` below, and it is the default.
 *
 * It is not enforced, and that is the whole design. A loop where every email is
 * short and plain produces no evidence that short and plain is right — it just
 * produces agreement with whoever wrote the rule. So style is *assigned* per
 * variant, *recorded* on the row, and left free to vary, which makes it
 * something `marketing_variant_performance` can eventually attribute a win to.
 *
 * The line between this and `hardRules`: a hard rule protects the reader or the
 * business — an invented number, a banned word, a dead link, a missing way out.
 * A style knob is a bet about what works. Bets get measured. Protections do not
 * get gambled with, so nothing here can widen `maxWords`, permit a banned word,
 * or relax any check in `review/checks.ts`.
 *
 * Assignment is deterministic. `prompt.ts` guarantees that two runs against the
 * same inputs build the same prompt, so exploration cannot come from a random
 * number — it comes from `assignStyles`, which is a pure function of the variant
 * count and produces a stable spread.
 */

export interface StyleProfile {
  key: string
  label: string
  /** One line for a human reading the Variants tab. */
  summary: string
  /**
   * Soft target for body length, in words. Always at or under the profile's
   * `hardRules.maxWords`, which still fails the variant if exceeded.
   */
  targetWords: { min: number; max: number }
  /** Rendered into the prompt verbatim, as the instruction for this variant. */
  directives: string[]
}

/**
 * The house default and Chandler's stated spec.
 *
 * "Sounds like a real human, not a large corporation" is the requirement most at
 * risk from the prompt itself: the instructions the model reads are long,
 * carefully punctuated, and full of em dashes, and a model mirrors the register
 * it is given. The em dash line below is aimed at that specifically.
 */
export const PLAIN_DIRECT: StyleProfile = {
  key: 'plain_direct',
  label: 'Plain and direct',
  summary: 'Short sentences, plain words, point arrived at early. Almost no em dashes.',
  targetWords: { min: 45, max: 80 },
  directives: [
    'Write the way one busy person types to another. Not the way a company writes.',
    'Short sentences. Most under fifteen words. Vary a little so it does not read as a list.',
    'Plain words over precise ones where both work. "Fix" over "remediate". "Costs you" over "impacts".',
    'Get to the point by the second sentence. No throat-clearing, no scene-setting.',
    'Almost no em dashes. Use a full stop and start a new sentence instead. ' +
      'These instructions use em dashes freely; the email must not copy that habit. ' +
      'At most one in the whole body, and only if a comma genuinely will not do.',
    'No semicolons. No parentheses. Both read as written rather than typed.',
    'Contractions are fine and usually better. "Doesn\'t" over "does not".',
    'It is fine to end on a fragment if that is how someone would actually type it.',
  ],
}

/**
 * The rest of the spread. Each one deviates from the default on a *named* axis,
 * so that if it wins there is something to learn rather than a vague sense that
 * one email did better.
 */
export const STYLE_PROFILES: StyleProfile[] = [
  PLAIN_DIRECT,
  {
    key: 'terse',
    label: 'Terse',
    summary: 'Pushes the length axis hard. Three or four sentences total.',
    targetWords: { min: 25, max: 45 },
    directives: [
      'Three or four sentences. That is the whole email.',
      'Every sentence has to earn its place. If removing it loses nothing, remove it.',
      'No em dashes. No semicolons.',
      'The observation, the consequence, the ask. Nothing else fits and nothing else is needed.',
      'This is deliberately shorter than feels comfortable. Do not pad it back out.',
    ],
  },
  {
    key: 'story',
    label: 'One concrete story',
    summary: 'Tests whether a specific worked example beats a stated observation.',
    targetWords: { min: 70, max: 110 },
    directives: [
      'Open on a specific situation rather than a general observation. A moment, not a category.',
      'Longer sentences are allowed here, and so is a single em dash if the rhythm wants one.',
      'Still plain-spoken. A story told plainly, not a story told in marketing voice.',
      'The story has to be one you can actually support from the material above. ' +
        'Do not invent a customer, a scene, or a detail about the reader to make it land.',
    ],
  },
  {
    key: 'question_led',
    label: 'Question led',
    summary: 'Opens on the question instead of closing on it.',
    targetWords: { min: 40, max: 70 },
    directives: [
      'Open with the question, then earn it in the sentences after.',
      'This inverts the usual shape, where the ask comes last. That inversion is the point.',
      'Still one question total. Opening with it means not also closing with one.',
      'Not a quiz question and not rhetorical. A real question someone would answer.',
    ],
  },
]

export const DEFAULT_STYLE_KEY = PLAIN_DIRECT.key

export function getStyle(key: string): StyleProfile | null {
  return STYLE_PROFILES.find((s) => s.key === key) ?? null
}

/**
 * Which style each variant in a batch is written in.
 *
 * Deterministic, and weighted toward the default rather than spread evenly: the
 * house style is a belief worth acting on, not a coin flip. One variant in three
 * explores, which is enough to accumulate a comparison over many runs without
 * making any single run mostly experimental.
 *
 *   1 → [default]
 *   2 → [default, default]
 *   3 → [default, default, terse]
 *   4 → [default, default, terse, story]
 *   5 → [default, default, terse, story, question_led]
 *   6 → [default, default, terse, story, question_led, terse]  (explorers cycle)
 *
 * A single variant is never an experiment. When someone generates one email they
 * want the house style, and an exploratory sample of size one teaches nothing
 * anyway.
 */
export function assignStyles(count: number, opts?: { styleKey?: string | null }): StyleProfile[] {
  // An explicit choice overrides the spread entirely. Someone who picked a style
  // is running an experiment of their own.
  if (opts?.styleKey) {
    const chosen = getStyle(opts.styleKey)
    if (chosen) return Array.from({ length: count }, () => chosen)
  }

  const explorers = STYLE_PROFILES.filter((s) => s.key !== DEFAULT_STYLE_KEY)
  const out: StyleProfile[] = []

  for (let i = 0; i < count; i++) {
    if (i < 2) {
      out.push(PLAIN_DIRECT)
      continue
    }
    const explorer = explorers[(i - 2) % explorers.length]
    out.push(explorer ?? PLAIN_DIRECT)
  }

  return out
}

/** Em dashes in a body. Recorded, never failed — see the module note. */
export function countEmDashes(text: string): number {
  return (text.match(/—/g) ?? []).length
}

/**
 * How far a body sits from the style it was assigned.
 *
 * Recorded on the variant so the question "did the terse ones actually come out
 * terse?" has an answer. A model asked to write 25–45 words routinely writes 60,
 * and without this the performance view would credit the style rather than what
 * was really produced.
 */
export interface StyleMetrics {
  styleKey: string
  words: number
  emDashes: number
  /** Whether the body landed inside the style's target band. */
  inBand: boolean
}

export function measureStyle(body: string, style: StyleProfile, words: number): StyleMetrics {
  return {
    styleKey: style.key,
    words,
    emDashes: countEmDashes(body),
    inBand: words >= style.targetWords.min && words <= style.targetWords.max,
  }
}
