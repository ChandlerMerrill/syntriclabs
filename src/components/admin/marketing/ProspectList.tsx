"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import { Users, Ban, Undo2, ArrowUpDown } from "lucide-react"
import type { MarketingProspect } from "@/lib/marketing/types"

/** Mutually exclusive buckets, so the state filter can't return a row twice. */
type ProspectState = "qualified" | "unreviewed" | "unqualified" | "suppressed"

function stateOf(p: MarketingProspect): ProspectState {
  if (p.suppressed_at) return "suppressed"
  if (p.qualified === true) return "qualified"
  if (p.qualified === false) return "unqualified"
  return "unreviewed"
}

const STATE_META: Record<string, { label: string; dotClassName: string }> = {
  qualified: { label: "Qualified", dotClassName: "bg-emerald-400" },
  unreviewed: { label: "Unreviewed", dotClassName: "bg-zinc-400" },
  unqualified: { label: "Not qualified", dotClassName: "bg-amber-400" },
  suppressed: { label: "Suppressed", dotClassName: "bg-red-400" },
}

const STATE_ORDER: ProspectState[] = ["qualified", "unreviewed", "unqualified", "suppressed"]

export const NO_SEGMENT = "__none"

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "company", label: "Company A–Z" },
  { value: "updated", label: "Recently updated" },
]

interface Props {
  prospects: MarketingProspect[]
  segments: { id: string; name: string }[]
  /** Meaningless once the list is already scoped to a single segment. */
  showSegmentFilter?: boolean
  /**
   * Rendered above the list. The campaign workspace uses it to say out loud that
   * this audience is shared, because suppressing here silences the prospect for
   * every campaign on the segment.
   */
  sharedNote?: React.ReactNode
  /** Fired after a suppression toggle so the container can revalidate. */
  onChanged: () => void
  emptyDescription?: string
}

export default function ProspectList({
  prospects,
  segments,
  showSegmentFilter = true,
  sharedNote,
  onChanged,
  emptyDescription = "Add one above, or qualify them from a research run.",
}: Props) {
  const [search, setSearch] = useState("")
  const [stateSel, setStateSel] = useState<Set<string>>(new Set())
  const [segmentSel, setSegmentSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const segmentName = useMemo(() => {
    const map = new Map(segments.map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? (map.get(id) ?? "Unknown segment") : "No segment")
  }, [segments])

  const segmentLabels = useMemo(() => {
    const map: Record<string, { label: string }> = {}
    for (const s of segments) map[s.id] = { label: s.name }
    map[NO_SEGMENT] = { label: "No segment" }
    return map
  }, [segments])

  const facets = useMemo<Record<"state" | "segment", Facet<MarketingProspect>>>(
    () => ({
      state: { values: stateOf, order: STATE_ORDER, meta: STATE_META },
      segment: { values: (p) => p.segment_id ?? NO_SEGMENT, meta: segmentLabels },
    }),
    [segmentLabels]
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: prospects,
        search,
        matchesSearch: (p, q) =>
          p.company.toLowerCase().includes(q) ||
          (p.contact_name?.toLowerCase().includes(q) ?? false) ||
          (p.email?.toLowerCase().includes(q) ?? false) ||
          (p.website?.toLowerCase().includes(q) ?? false),
        facets,
        selected: {
          state: stateSel,
          segment: showSegmentFilter ? segmentSel : new Set<string>(),
        },
      }),
    [prospects, search, facets, stateSel, segmentSel, showSegmentFilter]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "company":
        rows.sort((a, b) => a.company.localeCompare(b.company))
        break
      case "updated":
        rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        break
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStateSel(new Set())
    setSegmentSel(new Set())
  }

  async function toggleSuppression(p: MarketingProspect) {
    try {
      const res = await fetch("/api/admin/marketing/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          company: p.company,
          contactName: p.contact_name,
          email: p.email,
          website: p.website,
          segmentId: p.segment_id,
          qualified: p.qualified,
          suppress: !p.suppressed_at,
          suppressionReason: p.suppressed_at ? null : "Manually suppressed",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to save")
      toast.success(p.suppressed_at ? `Un-suppressed ${p.company}` : `Suppressed ${p.company}`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    }
  }

  return (
    <div className="space-y-4">
      {sharedNote}

      {prospects.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={filterSummary(visible.length, prospects.length, "prospect")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search company or email…" />
          {options.state.length > 1 && (
            <FilterMultiSelect
              options={options.state}
              selected={active.state}
              onChange={setStateSel}
              counts={counts.state}
              allLabel="Any state"
              manyLabel="States"
              className="w-40"
            />
          )}
          {showSegmentFilter && options.segment.length > 1 && (
            <FilterMultiSelect
              options={options.segment}
              selected={active.segment}
              onChange={setSegmentSel}
              counts={counts.segment}
              allLabel="All segments"
              manyLabel="Segments"
              searchable={options.segment.length > 6}
              searchPlaceholder="Search segments…"
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

      {prospects.length === 0 ? (
        <EmptyState icon={Users} title="No prospects yet" description={emptyDescription} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nothing matches these filters"
          description="Widen the search or clear the state filter."
        />
      ) : (
        <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/8">
          {sorted.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm text-white">{p.company}</p>
                  {p.suppressed_at && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-400">
                      suppressed
                    </Badge>
                  )}
                  {p.qualified === false && (
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                      not qualified
                    </Badge>
                  )}
                  {showSegmentFilter && (
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]/80">
                      {segmentName(p.segment_id)}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                  {[p.contact_name, p.email].filter(Boolean).join(" · ") || "No contact on file"}
                  {p.suppression_reason ? ` — ${p.suppression_reason}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleSuppression(p)}
                className="shrink-0 border-white/8 text-xs text-[#94A3B8]"
              >
                {p.suppressed_at ? (
                  <>
                    <Undo2 className="mr-1 h-3 w-3" /> Un-suppress
                  </>
                ) : (
                  <>
                    <Ban className="mr-1 h-3 w-3" /> Suppress
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
