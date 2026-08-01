"use client"

// The one surface every marketing list filters from. Controls on the left, what
// the filters did to the list on the right — a count that moves is the fastest
// way to tell a filter is on without hunting for which control is lit.

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  children: React.ReactNode
  /** Right-aligned result count, e.g. "12 of 40 variants". */
  summary?: React.ReactNode
  /** Whether any filter is narrowing the list — reveals Clear. */
  active?: boolean
  onClear?: () => void
  className?: string
}

export default function FilterBar({
  children,
  summary,
  active = false,
  onClear,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-[#0B1120] p-3",
        className
      )}
    >
      {children}

      <div className="ml-auto flex items-center gap-2">
        {summary && (
          <span className="whitespace-nowrap text-xs tabular-nums text-[#94A3B8]">
            {summary}
          </span>
        )}
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
