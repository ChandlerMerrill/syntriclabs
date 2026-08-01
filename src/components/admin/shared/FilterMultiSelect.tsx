"use client"

// A filter that holds its own list instead of spending a row of the page on
// tabs. Tick any number of options; an empty Set means "no constraint", which
// is the same thing an "All" tab used to mean without occupying space.
//
// Counts are faceted against the *other* active filters, so the number next to
// an option is what you would actually get by picking it — an option reading 0
// tells you not to bother clicking.

import { useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Minus, Search, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  /**
   * Tailwind background class (e.g. `bg-emerald-400`) drawn as a leading dot,
   * so a status list reads as colour-coded without a legend.
   */
  dotClassName?: string
  /**
   * Renders this row — and a dot on the trigger — in a danger tone whenever its
   * count is above zero. Surfaces an attention-worthy bucket (failed sends,
   * blocked variants) without making anyone open the menu to find it.
   */
  dangerWhenNonZero?: boolean
}

/**
 * A selection with anything the current option set no longer offers removed.
 *
 * Option lists are built from the rows on screen, so a bucket can disappear —
 * approve the last pending send and "Awaiting approval" stops existing. Without
 * this the old pick keeps filtering after its control has been hidden, and the
 * list reads as empty with nothing on screen to blame. Returns the same Set
 * when nothing changed, so callers can memo on it.
 */
export function pruneSelection(
  selected: Set<string>,
  options: { value: string }[]
): Set<string> {
  if (selected.size === 0) return selected
  const available = new Set(options.map((o) => o.value))
  const next = new Set([...selected].filter((v) => available.has(v)))
  return next.size === selected.size ? selected : next
}

interface FilterMultiSelectProps {
  options: FilterOption[]
  /** Selected values. Empty = no constraint. */
  selected: Set<string>
  onChange: (next: Set<string>) => void
  /** Per-option match counts, right-aligned on each row. Missing keys read 0. */
  counts?: Record<string, number>
  /** Trigger text when nothing is selected, e.g. "All statuses". */
  allLabel: string
  /** Trigger text when more than one is selected, e.g. "Statuses". */
  manyLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  className?: string
}

export default function FilterMultiSelect({
  options,
  selected,
  onChange,
  counts,
  allLabel,
  manyLabel,
  searchable = false,
  searchPlaceholder = "Search…",
  className,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!searchable) return options
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const count = selected.size

  // One pick shows its own label; several show a generic label plus a badge.
  const soleLabel = useMemo(() => {
    if (count !== 1) return null
    const value = [...selected][0]
    return options.find((o) => o.value === value)?.label ?? value
  }, [count, selected, options])

  const label = count === 0 ? allLabel : count === 1 ? soleLabel : manyLabel

  const hasDanger = useMemo(
    () => options.some((o) => o.dangerWhenNonZero && (counts?.[o.value] ?? 0) > 0),
    [options, counts]
  )

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  // "Select all" operates on what is currently visible, so it does the
  // intuitive thing while a search is narrowing the list.
  const visibleValues = filtered.map((o) => o.value)
  const allVisibleSelected =
    visibleValues.length > 0 && visibleValues.every((v) => selected.has(v))
  const someVisibleSelected = visibleValues.some((v) => selected.has(v))

  function toggleAll() {
    const next = new Set(selected)
    if (allVisibleSelected) for (const v of visibleValues) next.delete(v)
    else for (const v of visibleValues) next.add(v)
    onChange(next)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter toggles the lone remaining match — keyboard-only filtering.
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault()
      toggle(filtered[0].value)
      setQuery("")
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        aria-label={allLabel}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border border-white/8 bg-[#0B1120] px-3 text-xs font-medium text-white transition-colors hover:border-white/16 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 data-open:border-white/16 data-popup-open:border-white/16",
          count === 0 && "text-[#94A3B8]",
          className
        )}
      >
        <span className="truncate">{label}</span>
        {count > 1 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-semibold leading-none tabular-nums text-white">
            {count}
          </span>
        )}
        {hasDanger && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"
            aria-label="Contains flagged items"
          />
        )}
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[#94A3B8]/60" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0" initialFocus={searchable ? inputRef : undefined}>
        {searchable && (
          <div className="flex items-center gap-2 border-b border-white/8 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]/60" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#94A3B8]/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
                className="text-[#94A3B8] transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2 py-1.5 text-[11px]">
          {visibleValues.length > 1 ? (
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 rounded-md px-1 py-0.5 font-medium text-[#94A3B8] transition-colors hover:text-white"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                  allVisibleSelected || someVisibleSelected
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-white/16"
                )}
              >
                {allVisibleSelected ? (
                  <Check className="h-3 w-3" />
                ) : someVisibleSelected ? (
                  <Minus className="h-3 w-3" />
                ) : null}
              </span>
              {allVisibleSelected ? "Deselect all" : "Select all"}
            </button>
          ) : (
            <span className="px-1 tabular-nums text-[#94A3B8]">
              {count > 0 ? `${count} selected` : "Showing all"}
            </span>
          )}
          <button
            type="button"
            onClick={() => count > 0 && onChange(new Set())}
            disabled={count === 0}
            className="px-1 font-medium text-[#94A3B8] transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[#94A3B8]">No matches.</p>
          ) : (
            filtered.map((o) => {
              const isSelected = selected.has(o.value)
              const optionCount = counts?.[o.value] ?? 0
              const isDanger = !!o.dangerWhenNonZero && optionCount > 0
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-white transition-colors hover:bg-white/[0.06]"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                      isSelected
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-white/16"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  {o.dotClassName && (
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", o.dotClassName)}
                      aria-hidden
                    />
                  )}
                  <span className={cn("flex-1 truncate", isDanger && "font-medium text-red-400")}>
                    {o.label}
                  </span>
                  {counts && (
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        isDanger
                          ? "font-semibold text-red-400"
                          : optionCount === 0
                            ? "text-[#94A3B8]/30"
                            : "text-[#94A3B8]"
                      )}
                    >
                      {optionCount}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
