"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Mic, Clock, Users, Loader2, RefreshCw } from "lucide-react"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { useTranscripts } from "@/hooks/admin/useTranscripts"
import type { TranscriptWithClient } from "@/lib/types"

interface TranscriptsListProps {
  initialTranscripts: TranscriptWithClient[]
}

const sentimentStyles: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/20",
  mixed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
}

const STATUS_ORDER = ["pending", "processing", "completed", "failed"] as const
const STATUS_META: Record<string, { label: string; dotClassName: string; dangerWhenNonZero?: boolean }> = {
  pending: { label: "Pending", dotClassName: "bg-amber-400" },
  processing: { label: "Processing", dotClassName: "bg-blue-400" },
  completed: { label: "Completed", dotClassName: "bg-emerald-400" },
  failed: { label: "Failed", dotClassName: "bg-red-400", dangerWhenNonZero: true },
}

const SENTIMENT_ORDER = ["positive", "neutral", "mixed", "negative"] as const
const SENTIMENT_META: Record<string, { label: string; dotClassName: string }> = {
  positive: { label: "Positive", dotClassName: "bg-emerald-400" },
  neutral: { label: "Neutral", dotClassName: "bg-zinc-400" },
  mixed: { label: "Mixed", dotClassName: "bg-amber-400" },
  negative: { label: "Negative", dotClassName: "bg-red-400" },
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest first" },
]

export default function TranscriptsList({ initialTranscripts }: TranscriptsListProps) {
  const router = useRouter()
  const { transcripts, mutate } = useTranscripts(initialTranscripts)
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [sentimentSel, setSentimentSel] = useState<Set<string>>(new Set())
  const [topicSel, setTopicSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")
  const [backfilling, setBackfilling] = useState(false)

  const facets = useMemo<
    Record<"status" | "sentiment" | "topic", Facet<TranscriptWithClient>>
  >(
    () => ({
      status: { values: (t) => t.processing_status, order: STATUS_ORDER, meta: STATUS_META },
      sentiment: { values: (t) => t.sentiment, order: SENTIMENT_ORDER, meta: SENTIMENT_META },
      // Multi-valued: a transcript sits in every topic it mentions.
      topic: { values: (t) => t.topics ?? [] },
    }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: transcripts,
        search,
        matchesSearch: (t, q) =>
          t.title.toLowerCase().includes(q) ||
          (t.summary?.toLowerCase().includes(q) ?? false) ||
          (t.topics?.some((topic) => topic.toLowerCase().includes(q)) ?? false) ||
          (t.clients?.company_name?.toLowerCase().includes(q) ?? false),
        facets,
        selected: { status: statusSel, sentiment: sentimentSel, topic: topicSel },
      }),
    [transcripts, search, facets, statusSel, sentimentSel, topicSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "oldest":
        rows.sort((a, b) => a.date.localeCompare(b.date))
        break
      case "longest":
        rows.sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0))
        break
      default:
        rows.sort((a, b) => b.date.localeCompare(a.date))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setSentimentSel(new Set())
    setTopicSel(new Set())
  }

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const res = await fetch("/api/fireflies/backfill", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Imported ${data.imported} transcripts (${data.processing} processing)`)
      await mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backfill failed")
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transcripts"
        description="Meeting transcripts from Fireflies.ai with AI-extracted insights"
      >
        <Button
          size="sm"
          onClick={handleBackfill}
          disabled={backfilling}
          className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
        >
          {backfilling ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          {backfilling ? "Importing…" : "Backfill"}
        </Button>
      </PageHeader>

      {transcripts.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={filterSummary(visible.length, transcripts.length, "transcript")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search transcripts…" />
          {options.status.length > 1 && (
            <FilterMultiSelect
              options={options.status}
              selected={active.status}
              onChange={setStatusSel}
              counts={counts.status}
              allLabel="All statuses"
              manyLabel="Statuses"
              className="w-40"
            />
          )}
          {options.sentiment.length > 1 && (
            <FilterMultiSelect
              options={options.sentiment}
              selected={active.sentiment}
              onChange={setSentimentSel}
              counts={counts.sentiment}
              allLabel="Any sentiment"
              manyLabel="Sentiments"
              className="w-40"
            />
          )}
          {options.topic.length > 1 && (
            <FilterMultiSelect
              options={options.topic}
              selected={active.topic}
              onChange={setTopicSel}
              counts={counts.topic}
              allLabel="All topics"
              manyLabel="Topics"
              searchable={options.topic.length > 6}
              searchPlaceholder="Search topics…"
              className="w-40"
            />
          )}
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

      {sorted.length === 0 ? (
        <EmptyState
          icon={Mic}
          title={transcripts.length === 0 ? "No transcripts yet" : "Nothing matches these filters"}
          description={
            transcripts.length === 0
              ? "Configure Fireflies.ai in Settings, then run a backfill to pull meetings in."
              : "Clear the filters to see every transcript."
          }
        />
      ) : (
        <div className="grid gap-3">
          {sorted.map((t) => (
            <article
              key={t.id}
              className="cursor-pointer rounded-xl border border-white/8 bg-[#0B1120] p-4 transition-colors hover:border-white/16"
              onClick={() => router.push(`/admin/transcripts/${t.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 shrink-0 text-purple-400" />
                    <h3 className="truncate text-sm font-medium text-white">{t.title}</h3>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-[#94A3B8]">
                    <span>{formatDate(t.date)}</span>
                    {t.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t.duration_minutes} min
                      </span>
                    )}
                    {t.participants && t.participants.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {t.participants.length}
                      </span>
                    )}
                  </div>
                  {t.summary && (
                    <p className="mt-2 line-clamp-2 text-xs text-[#94A3B8]/80">{t.summary}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {t.processing_status !== "completed" && (
                    <Badge variant="secondary" className={statusStyles[t.processing_status] ?? ""}>
                      {t.processing_status}
                    </Badge>
                  )}
                  {t.sentiment && (
                    <Badge variant="secondary" className={sentimentStyles[t.sentiment] ?? ""}>
                      {t.sentiment}
                    </Badge>
                  )}
                  {t.clients && (
                    <Badge variant="secondary" className="bg-[#334155] text-[10px] text-white">
                      {t.clients.company_name}
                    </Badge>
                  )}
                </div>
              </div>
              {t.topics && t.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.topics.slice(0, 5).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-[#334155] px-2 py-0.5 text-[10px] text-[#94A3B8]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
