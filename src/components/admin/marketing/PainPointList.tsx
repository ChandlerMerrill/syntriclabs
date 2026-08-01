"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import { Microscope, ExternalLink, AlertTriangle, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MarketingPainPoint } from "@/lib/marketing/types"

const SORTS = [
  { value: "rank", label: "Rank", hint: "The ordering research produced" },
  { value: "frequency", label: "Most sources", hint: "How often the complaint appears" },
  { value: "score", label: "Highest score" },
  { value: "newest", label: "Newest first" },
]

interface Props {
  painPoints: MarketingPainPoint[]
  emptyDescription?: string
}

export default function PainPointList({
  painPoints,
  emptyDescription = "Run research against this segment to build the list.",
}: Props) {
  const [search, setSearch] = useState("")
  const [fearSel, setFearSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("rank")

  const facets = useMemo<Record<"fear", Facet<MarketingPainPoint>>>(
    () => ({ fear: { values: (p) => p.icp_fear } }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: painPoints,
        search,
        matchesSearch: (p, q) =>
          p.statement.toLowerCase().includes(q) ||
          (p.icp_fear?.toLowerCase().includes(q) ?? false) ||
          p.evidence.some((e) => e.quote.toLowerCase().includes(q)),
        facets,
        selected: { fear: fearSel },
      }),
    [painPoints, search, facets, fearSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "frequency":
        rows.sort((a, b) => b.frequency - a.frequency)
        break
      case "score":
        rows.sort((a, b) => Number(b.score) - Number(a.score))
        break
      case "newest":
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      default:
        // Rank, with unranked pushed to the bottom rather than sorted as 0.
        rows.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setFearSel(new Set())
  }

  return (
    <div className="space-y-3">
      {painPoints.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={filterSummary(visible.length, painPoints.length, "pain point")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search pain points…" />
          {options.fear.length > 1 && (
            <FilterMultiSelect
              options={options.fear}
              selected={active.fear}
              onChange={setFearSel}
              counts={counts.fear}
              allLabel="All ICP fears"
              manyLabel="ICP fears"
              searchable={options.fear.length > 6}
              searchPlaceholder="Search fears…"
              className="w-44"
            />
          )}
          <FilterSelect
            options={SORTS}
            value={sort}
            onChange={setSort}
            label="Sort"
            icon={ArrowUpDown}
            className="w-48"
          />
        </FilterBar>
      )}

      {painPoints.length === 0 ? (
        <EmptyState icon={Microscope} title="No pain points yet" description={emptyDescription} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Microscope}
          title="Nothing matches these filters"
          description="Widen the search or clear the ICP fear filter."
        />
      ) : (
        <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/8">
          {sorted.map((p) => (
            <article key={p.id} className="px-4 py-4 transition-colors hover:bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                    p.rank && p.rank <= 3
                      ? "bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white"
                      : "bg-white/5 text-[#94A3B8]"
                  )}
                >
                  {p.rank ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{p.statement}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                      {p.frequency} source{p.frequency === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                      score {Number(p.score).toFixed(2)}
                    </Badge>
                    {p.icp_fear && (
                      <Badge variant="secondary" className="bg-[#8B5CF6]/10 text-[#A78BFA]">
                        {p.icp_fear}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {p.evidence.slice(0, 3).map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#94A3B8]">
                        {e.url ? (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-0.5 shrink-0 text-[#60A5FA] hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="mt-0.5 shrink-0 text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                          </span>
                        )}
                        <span className="italic">&ldquo;{e.quote}&rdquo;</span>
                      </div>
                    ))}
                    {p.evidence.length > 3 && (
                      <p className="text-xs text-[#94A3B8]/50">
                        +{p.evidence.length - 3} more quotes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
