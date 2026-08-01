// The arithmetic behind every filter bar in the panel.
//
// Each list page was doing the same four things by hand — derive the options
// from the rows, prune a selection whose option has vanished, count each option
// against the *other* active filters, then apply them all. Doing it eight times
// is eight chances to get the facet counts subtly wrong, so it lives here once.
//
// Deliberately a plain function rather than a hook: call it inside one
// `useMemo` and it is trivially testable on its own.

import { pruneSelection, type FilterOption } from "./FilterMultiSelect"

const NO_SELECTION: ReadonlySet<string> = new Set<string>()

export interface Facet<T> {
  /**
   * The values this row belongs to. Return an array for facets a row can sit in
   * more than one of (tags, topics); null/undefined means the row has no value
   * and is therefore excluded whenever this facet is constraining.
   */
  values: (row: T) => string | string[] | null | undefined
  /** Preferred order. Values outside it sort alphabetically after. */
  order?: readonly string[]
  /** Per-value presentation. Anything missing falls back to the raw value. */
  meta?: Record<
    string,
    { label?: string; dotClassName?: string; dangerWhenNonZero?: boolean } | undefined
  >
  /** Last-resort label for values not covered by `meta` — e.g. title-casing. */
  label?: (value: string) => string
}

export interface FacetedResult<T, K extends string> {
  /** Rows surviving the text search alone. */
  searched: T[]
  /** Options per facet, built from the rows actually loaded. */
  options: Record<K, FilterOption[]>
  /** Per-facet, per-value counts, faceted against the other active filters. */
  counts: Record<K, Record<string, number>>
  /** Selections with vanished values dropped — pass these back to the control. */
  active: Record<K, Set<string>>
  /** Rows surviving search and every facet. Sorting is the caller's business. */
  visible: T[]
  /** Whether anything is narrowing the list — drives the Clear button. */
  filtersActive: boolean
}

function toValues(raw: string | string[] | null | undefined): string[] {
  if (raw == null) return []
  return Array.isArray(raw) ? raw.filter(Boolean) : [raw]
}

function buildOptions<T>(facet: Facet<T>, present: Set<string>): FilterOption[] {
  const make = (value: string): FilterOption => {
    const meta = facet.meta?.[value]
    return {
      value,
      label: meta?.label ?? facet.label?.(value) ?? value,
      dotClassName: meta?.dotClassName,
      dangerWhenNonZero: meta?.dangerWhenNonZero,
    }
  }

  if (facet.order) {
    const known = new Set(facet.order)
    const ordered = facet.order.filter((v) => present.has(v)).map(make)
    const extras = [...present]
      .filter((v) => !known.has(v))
      .sort()
      .map(make)
    return [...ordered, ...extras]
  }

  return [...present].map(make).sort((a, b) => a.label.localeCompare(b.label))
}

export function facetedList<T, K extends string>({
  rows,
  search,
  matchesSearch,
  facets,
  selected,
}: {
  rows: T[]
  search: string
  /** Called with the already-lowercased, trimmed query. */
  matchesSearch: (row: T, query: string) => boolean
  facets: Record<K, Facet<T>>
  selected: Record<K, Set<string>>
}): FacetedResult<T, K> {
  const query = search.trim().toLowerCase()
  const searched = query ? rows.filter((row) => matchesSearch(row, query)) : rows

  const keys = Object.keys(facets) as K[]

  // Options come from every loaded row, not the searched subset — otherwise
  // typing would make the filter you were about to use disappear.
  const options = {} as Record<K, FilterOption[]>
  for (const key of keys) {
    const present = new Set<string>()
    for (const row of rows) for (const value of toValues(facets[key].values(row))) present.add(value)
    options[key] = buildOptions(facets[key], present)
  }

  const active = {} as Record<K, Set<string>>
  for (const key of keys) {
    active[key] = pruneSelection(selected[key] ?? (NO_SELECTION as Set<string>), options[key])
  }

  const passes = (row: T, key: K) => {
    const selection = active[key]
    if (selection.size === 0) return true
    return toValues(facets[key].values(row)).some((value) => selection.has(value))
  }

  // A count is only useful if it answers "what would I get by clicking this",
  // so each facet counts with every *other* facet already applied.
  const counts = {} as Record<K, Record<string, number>>
  for (const key of keys) {
    const others = keys.filter((other) => other !== key)
    const tally: Record<string, number> = {}
    for (const row of searched) {
      if (!others.every((other) => passes(row, other))) continue
      for (const value of toValues(facets[key].values(row))) {
        tally[value] = (tally[value] ?? 0) + 1
      }
    }
    counts[key] = tally
  }

  const visible = searched.filter((row) => keys.every((key) => passes(row, key)))
  const filtersActive = query !== "" || keys.some((key) => active[key].size > 0)

  return { searched, options, counts, active, visible, filtersActive }
}

/** `12 of 40` while filtering, a plain total otherwise. */
export function filterSummary(visible: number, total: number, noun: string, plural?: string) {
  if (visible === total) return `${total} ${total === 1 ? noun : (plural ?? `${noun}s`)}`
  return `${visible} of ${total}`
}
