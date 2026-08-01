"use client"

// Undebounced on purpose: these lists are already in memory, so the results
// should move on the keystroke. `SearchInput` is the debounced one, for the
// pages that round-trip a query to the server.

import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function FilterSearch({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: FilterSearchProps) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]/60" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-white/8 bg-[#0B1120] pl-9 pr-8 text-xs text-white transition-colors outline-none placeholder:text-[#94A3B8]/50 hover:border-white/16 focus-visible:border-white/16 focus-visible:ring-2 focus-visible:ring-[#2563EB]/50"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
