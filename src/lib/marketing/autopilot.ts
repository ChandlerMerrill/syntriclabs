/**
 * What the loop is allowed to do on its own.
 *
 * Every paid step in the marketing loop has two possible triggers: a person
 * pressing a button in the admin panel, or a cron. This module governs the
 * second one only. Pressing a button is consent; a schedule firing at 07:00 on a
 * Monday is not, and the two should not be gated by the same rule.
 *
 * The reason this exists as a chokepoint rather than an `if` in each cron: the
 * research cron fans out one extraction call per fetched source across every
 * segment, and it has been failing on a missing FIRECRAWL_API_KEY since it was
 * wired up. The moment that key lands, a job nobody is watching starts spending
 * on a weekly schedule. A switch that has to be remembered at that moment is a
 * switch that will not be.
 *
 * Manual paths deliberately do not consult this. Turning autopilot off must not
 * disable the admin panel — the whole point is to run the loop by hand instead.
 */

export type MarketingStage =
  /** Firecrawl fetch + one extraction call per source + one clustering call. */
  | 'research'
  /** Firecrawl fetch only. No model calls, but it does spend. */
  | 'entropy'
  /** Variant generation. No cron triggers this today. */
  | 'generate'
  /** Prospect qualification. No cron triggers this today. */
  | 'qualify'
  /** One call per newly-recorded reply. */
  | 'score'
  /** The critic gate. No cron triggers this today. */
  | 'critique'
  /** Not a model call — sending already-approved mail to real people. */
  | 'dispatch'

/**
 * What runs automatically when `MARKETING_AUTOPILOT` is unset.
 *
 * `score` and `dispatch` are on because both are reactive and bounded: scoring
 * costs one call per reply a human actually received, and dispatch can only ship
 * rows a human already approved — the schema will not let a row reach `approved`
 * without `approved_by` and `approved_at`.
 *
 * `research` and `entropy` are off because both are generative and unbounded:
 * they fan out across every segment on a timer, and neither is a response to
 * anything a person did.
 */
const DEFAULT_ENABLED: MarketingStage[] = ['score', 'dispatch']

const ALL_STAGES: MarketingStage[] = [
  'research',
  'entropy',
  'generate',
  'qualify',
  'score',
  'critique',
  'dispatch',
]

export interface AutopilotSettings {
  /** The raw env value, for surfacing in a cron response. */
  raw: string | null
  enabled: Set<MarketingStage>
  /** True when nothing was configured and the defaults are in force. */
  isDefault: boolean
}

/**
 * Parses `MARKETING_AUTOPILOT`.
 *
 *   unset            → the defaults above
 *   `off` / `none`   → nothing runs automatically
 *   `all`            → everything runs automatically
 *   `research,score` → exactly those stages
 *
 * An unrecognised stage name is ignored rather than throwing. A typo in an env
 * var should narrow what the loop may do on its own, never crash a cron — and
 * `unknownStages` below is how the typo gets surfaced instead of swallowed.
 */
export function autopilotSettings(): AutopilotSettings {
  const raw = process.env.MARKETING_AUTOPILOT?.trim() ?? null

  if (!raw) {
    return { raw: null, enabled: new Set(DEFAULT_ENABLED), isDefault: true }
  }

  const normalized = raw.toLowerCase()
  if (normalized === 'off' || normalized === 'none' || normalized === 'false') {
    return { raw, enabled: new Set(), isDefault: false }
  }
  if (normalized === 'all' || normalized === 'on' || normalized === 'true') {
    return { raw, enabled: new Set(ALL_STAGES), isDefault: false }
  }

  const named = normalized
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const enabled = new Set<MarketingStage>(
    named.filter((s): s is MarketingStage => (ALL_STAGES as string[]).includes(s))
  )

  return { raw, enabled, isDefault: false }
}

/** Stage names in the env var that aren't real stages. Surfaced, not thrown. */
export function unknownStages(): string[] {
  const raw = process.env.MARKETING_AUTOPILOT?.trim()
  if (!raw) return []
  const normalized = raw.toLowerCase()
  if (['off', 'none', 'false', 'all', 'on', 'true'].includes(normalized)) return []
  return normalized
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !(ALL_STAGES as string[]).includes(s))
}

export function autopilotAllows(stage: MarketingStage): boolean {
  return autopilotSettings().enabled.has(stage)
}

/**
 * The reason a stage may not run automatically, or null if it may.
 *
 * Crons use this to skip, not to fail. A 500 from a cron gets retried and looks
 * like an outage; `{ ok: true, skipped: ... }` is what a deliberate no-op looks
 * like, and it says on the response how to turn the stage back on.
 */
export function autopilotBlock(stage: MarketingStage): string | null {
  const settings = autopilotSettings()
  if (settings.enabled.has(stage)) return null

  const current = settings.isDefault
    ? `unset (default: ${DEFAULT_ENABLED.join(', ')})`
    : `"${settings.raw}"`

  return (
    `Autopilot does not include "${stage}". MARKETING_AUTOPILOT is ${current}. ` +
    `Set it to "all", or to a list including "${stage}", to run this on a schedule. ` +
    `The admin panel can still run this step by hand.`
  )
}
