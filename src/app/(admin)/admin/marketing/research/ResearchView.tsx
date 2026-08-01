"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import PainPointList from "@/components/admin/marketing/PainPointList"
import { Microscope, AlertTriangle, ChevronDown, ChevronRight, Layers } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { MarketingPainPoint, MarketingResearchRun } from "@/lib/marketing/types"

interface Props {
  segments: { id: string; name: string; slug: string }[]
  activeSegment: string | null
  initialRuns: MarketingResearchRun[]
  initialPainPoints: MarketingPainPoint[]
  hasProfile: boolean
}

const RUN_STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-500/10 text-zinc-400",
  processing: "bg-amber-500/10 text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
}

export default function ResearchView({
  segments,
  activeSegment,
  initialRuns,
  initialPainPoints,
  hasProfile,
}: Props) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [showAllRuns, setShowAllRuns] = useState(false)

  const key = activeSegment ? `/api/admin/marketing/research?segmentId=${activeSegment}` : null
  // Poll while a run is in flight; stop once nothing is moving.
  const { data, mutate } = useSWR<{
    runs: MarketingResearchRun[]
    painPoints: MarketingPainPoint[]
  }>(key, {
    fallbackData: { runs: initialRuns, painPoints: initialPainPoints },
    refreshInterval: (latest) =>
      latest?.runs.some((r) => r.status === "pending" || r.status === "processing") ? 5000 : 0,
  })

  const runs = data?.runs ?? []
  const painPoints = useMemo(() => data?.painPoints ?? [], [data?.painPoints])
  const running = runs.some((r) => r.status === "pending" || r.status === "processing")

  async function startRun() {
    if (!activeSegment) return
    setStarting(true)
    try {
      const res = await fetch("/api/admin/marketing/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId: activeSegment }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to start run")
      toast.success("Research run started")
      mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start run")
    } finally {
      setStarting(false)
    }
  }

  if (!hasProfile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Research" description="Sources in, ranked pain points out." />
        <EmptyState
          icon={Microscope}
          title="No brand profile yet"
          description="Research reads the ICP and fears from the brand profile. Seed one first."
          actionLabel="Go to Marketing"
          actionHref="/admin/marketing"
        />
      </div>
    )
  }

  const shownRuns = showAllRuns ? runs.slice(0, 20) : runs.slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research"
        description="Ranked by how often the complaint actually appears — not by how good it sounds."
      >
        {segments.length > 0 && (
          <FilterSelect
            options={segments.map((s) => ({ value: s.id, label: s.name, hint: s.slug }))}
            value={activeSegment}
            onChange={(id) => router.push(`/admin/marketing/research?segment=${id}`)}
            label="Segment"
            placeholder="Pick a segment"
            icon={Layers}
            searchable={segments.length > 6}
            searchPlaceholder="Search segments…"
            className="max-w-64"
          />
        )}
        <Button
          size="sm"
          onClick={startRun}
          disabled={starting || running || !activeSegment}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          {running ? "Run in progress…" : starting ? "Starting…" : "Run research"}
        </Button>
      </PageHeader>

      {/* Runs — the latest one is the only one that usually matters, so the
          rest stay folded away. */}
      <section className="rounded-xl border border-white/8 bg-[#0B1120]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-medium text-white">Runs</h2>
          {runs.length > 3 && (
            <button
              onClick={() => setShowAllRuns((v) => !v)}
              className="flex items-center gap-1 text-xs text-[#60A5FA] transition-colors hover:text-white"
            >
              {showAllRuns ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {showAllRuns ? "Show fewer" : `${runs.length - 3} earlier`}
            </button>
          )}
        </div>

        {runs.length === 0 ? (
          <p className="border-t border-white/8 px-4 py-6 text-sm text-[#94A3B8]">
            No runs yet for this segment.
          </p>
        ) : (
          <div className="divide-y divide-white/8 border-t border-white/8">
            {shownRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <Badge
                  variant="secondary"
                  className={RUN_STATUS_COLORS[run.status] ?? "bg-zinc-500/10 text-zinc-400"}
                >
                  {run.status}
                </Badge>
                <span className="text-xs text-[#94A3B8]">{formatDate(run.created_at)}</span>
                <span className="text-xs text-[#94A3B8]">
                  {run.source_count} sources
                  {run.outside_source_count > 0 && (
                    <span className="text-[#94A3B8]/60"> (+{run.outside_source_count} outside)</span>
                  )}
                </span>
                <span className="text-xs text-[#94A3B8]">{run.pain_point_count} pain points</span>
                <span className="ml-auto text-xs uppercase tracking-wide text-[#94A3B8]/50">
                  {run.trigger}
                </span>
                {run.processing_error && (
                  <span
                    className="flex items-center gap-1 text-xs text-red-400"
                    title={run.processing_error}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {run.processing_error.slice(0, 60)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pain points */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-white">Pain points</h2>
          <p className="text-xs text-[#94A3B8]/60">
            Every one carries at least one resolvable source link, or it is not stored.
          </p>
        </div>

        <PainPointList painPoints={painPoints} />
      </section>
    </div>
  )
}
