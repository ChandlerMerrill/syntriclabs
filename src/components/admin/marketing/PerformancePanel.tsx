"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import { filterSummary } from "@/components/admin/shared/faceted"
import { BarChart3, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react"
import type { RatedVariant, PerformanceTotals } from "@/lib/marketing/eval/performance"

const SORTS = [
  { value: "sends", label: "Most sent" },
  { value: "reply", label: "Reply rate", hint: "Zero-send variants last" },
  { value: "score", label: "Avg score" },
  { value: "bounce", label: "Bounce rate" },
]

/**
 * Every rate is rendered through this. There is no path that draws a percentage
 * without the counts that produced it.
 */
function Rate({ numerator, denominator }: { numerator: number; denominator: number }) {
  if (denominator === 0) {
    return <span className="text-[#94A3B8]/50">— (n=0)</span>
  }
  return (
    <span className="tabular-nums">
      <span className="text-white">{((numerator / denominator) * 100).toFixed(1)}%</span>{" "}
      <span className="text-[#94A3B8]/60">
        ({numerator}/{denominator})
      </span>
    </span>
  )
}

interface Props {
  variants: RatedVariant[]
  totals: PerformanceTotals
  minSample: number
  /** Naming the campaign per row is noise when the panel is already scoped. */
  showCampaignName?: boolean
}

export default function PerformancePanel({
  variants,
  totals: t,
  minSample,
  showCampaignName = true,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("sends")

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q
      ? variants.filter(
          (v) =>
            (v.subject?.toLowerCase().includes(q) ?? false) ||
            (v.label?.toLowerCase().includes(q) ?? false) ||
            (v.icp_fear?.toLowerCase().includes(q) ?? false) ||
            (v.campaign_name?.toLowerCase().includes(q) ?? false)
        )
      : variants
    const sorted = [...rows]
    // A rate with no sends behind it isn't a low rate, it's an absence — those
    // rows sort to the bottom rather than reading as a 0% loser.
    const rate = (n: number, d: number) => (d === 0 ? -1 : n / d)
    const score = (v: RatedVariant) => (v.avg_score === null ? -1 : Number(v.avg_score))
    switch (sort) {
      case "reply":
        sorted.sort((a, b) => rate(b.replies, b.sends) - rate(a.replies, a.sends))
        break
      case "bounce":
        sorted.sort((a, b) => rate(b.bounces, b.sends) - rate(a.bounces, a.sends))
        break
      case "score":
        sorted.sort((a, b) => score(b) - score(a))
        break
      default:
        sorted.sort((a, b) => b.sends - a.sends)
    }
    return sorted
  }, [variants, search, sort])

  return (
    <div className="space-y-6">
      {/* The standing caveat, not a footnote. */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs leading-relaxed text-amber-200/80">
          {t.belowSignal ? (
            <>
              <span className="font-medium">Nothing here is a winner yet.</span> {t.sends} send
              {t.sends === 1 ? "" : "s"} in total — below {minSample}, a difference between two
              variants is noise. The job of this page right now is traceability: knowing which
              prompt produced which reply, so the next prompt can be better than the last one.
            </>
          ) : (
            <>
              Sample size sits next to every rate on purpose. A variant with a higher percentage and
              a smaller n has not beaten anything.
            </>
          )}
        </p>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sent", value: t.sends, sub: `${t.variants} variants` },
          { label: "Replies", value: t.replies, sub: null, rate: [t.replies, t.sends] as const },
          { label: "Bounces", value: t.bounces, sub: null, rate: [t.bounces, t.sends] as const },
          { label: "Scored", value: t.scored, sub: `of ${t.replies} replies` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
            <p className="text-xs text-[#94A3B8]">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{card.value}</p>
            <p className="mt-1 text-xs text-[#94A3B8]/60">
              {card.rate ? <Rate numerator={card.rate[0]} denominator={card.rate[1]} /> : card.sub}
            </p>
          </div>
        ))}
      </div>

      {variants.length > 0 && (
        <FilterBar
          active={search.trim() !== ""}
          onClear={() => setSearch("")}
          summary={filterSummary(visible.length, variants.length, "variant")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search subject or label…" />
          <FilterSelect
            options={SORTS}
            value={sort}
            onChange={setSort}
            label="Sort"
            icon={ArrowUpDown}
            className="w-44"
          />
        </FilterBar>
      )}

      {/* Per variant */}
      {variants.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing sent yet"
          description="Once a send goes out and a reply comes back, it lands here against the prompt that produced it."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing matches this search"
          description="Clear the search to see every variant with sends behind it."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((v) => {
            const isOpen = expanded[v.variant_id] ?? false
            return (
              <article
                key={v.variant_id}
                className="rounded-xl border border-white/8 bg-[#0B1120] p-4 transition-colors hover:border-white/16"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {v.label && (
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                      {v.label}
                    </Badge>
                  )}
                  {v.icp_fear && (
                    <Badge variant="secondary" className="bg-[#8B5CF6]/10 text-[#A78BFA]">
                      {v.icp_fear}
                    </Badge>
                  )}
                  {v.parent_variant_id && (
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                      bred from a parent
                    </Badge>
                  )}
                  {showCampaignName && (
                    <span className="ml-auto text-xs text-[#94A3B8]/60">{v.campaign_name}</span>
                  )}
                  <span
                    className={
                      showCampaignName
                        ? "text-xs text-[#94A3B8]/60"
                        : "ml-auto text-xs text-[#94A3B8]/60"
                    }
                  >
                    {v.model}
                  </span>
                </div>

                <p className="mt-2 text-sm text-white">{v.subject}</p>

                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-[#94A3B8]/60">Sent</p>
                    <p className="mt-0.5 tabular-nums text-white">{v.sends}</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8]/60">Reply rate</p>
                    <p className="mt-0.5">
                      <Rate numerator={v.replies} denominator={v.sends} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8]/60">Bounce rate</p>
                    <p className="mt-0.5">
                      <Rate numerator={v.bounces} denominator={v.sends} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8]/60">Avg score</p>
                    <p className="mt-0.5 tabular-nums text-white">
                      {v.avg_score === null ? (
                        <span className="text-[#94A3B8]/50">— (n=0)</span>
                      ) : (
                        <>
                          {Number(v.avg_score).toFixed(2)}{" "}
                          <span className="text-[#94A3B8]/60">(n={v.scored})</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {v.sampleNote && <p className="mt-3 text-xs text-amber-400/70">{v.sampleNote}</p>}

                <button
                  onClick={() => setExpanded((e) => ({ ...e, [v.variant_id]: !isOpen }))}
                  className="mt-3 flex items-center gap-1 text-xs text-[#60A5FA] transition-colors hover:text-white"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {isOpen ? "Hide" : "Show"} the prompt behind this result
                </button>

                {isOpen && (
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-white/8 bg-black/30 p-3 text-[11px] leading-relaxed text-[#94A3B8]">
                    {v.generation_prompt}
                  </pre>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
