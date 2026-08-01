"use client"

// Single-value sibling of FilterMultiSelect — for the one choice a page is
// scoped by (which segment, which campaign) and for sort order. Same surface,
// same search, radio semantics: picking closes the menu.

import { useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  /** Secondary line under the label — a goal, a segment name, a count. */
  hint?: string
  dotClassName?: string
}

interface FilterSelectProps {
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  /** Muted prefix inside the trigger, e.g. "Segment". Names what is being scoped. */
  label?: string
  /** Trigger text when `value` matches no option. */
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  className?: string
  contentClassName?: string
}

export default function FilterSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Select…",
  searchable = false,
  searchPlaceholder = "Search…",
  icon: Icon,
  disabled = false,
  className,
  contentClassName,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!searchable) return options
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false)
    )
  }, [options, query, searchable])

  const current = options.find((o) => o.value === value) ?? null

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        aria-label={label ?? placeholder}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border border-white/8 bg-[#0B1120] px-3 text-xs font-medium transition-colors hover:border-white/16 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 disabled:pointer-events-none disabled:opacity-50 data-open:border-white/16 data-popup-open:border-white/16",
          className
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />}
        {label && <span className="shrink-0 text-[#94A3B8]">{label}</span>}
        <span className={cn("truncate", current ? "text-white" : "text-[#94A3B8]")}>
          {current?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[#94A3B8]/60" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn("w-64 p-0", contentClassName)}
        initialFocus={searchable ? inputRef : undefined}
      >
        {searchable && (
          <div className="flex items-center gap-2 border-b border-white/8 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]/60" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[#94A3B8]">No matches.</p>
          ) : (
            filtered.map((o) => {
              const isSelected = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0 text-[#60A5FA]",
                      !isSelected && "opacity-0"
                    )}
                  />
                  {o.dotClassName && (
                    <span
                      className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", o.dotClassName)}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-white">{o.label}</span>
                    {o.hint && (
                      <span className="mt-0.5 block truncate text-[11px] text-[#94A3B8]">
                        {o.hint}
                      </span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
