"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import { Microscope, ExternalLink, AlertTriangle } from "lucide-react"
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
  const painPoints = data?.painPoints ?? []
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research"
        description="Ranked by how often the complaint actually appears — not by how good it sounds."
      >
        <Button
          size="sm"
          onClick={startRun}
          disabled={starting || running || !activeSegment}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          {running ? "Run in progress…" : starting ? "Starting…" : "Run research"}
        </Button>
      </PageHeader>

      {/* Segment tabs */}
      {segments.length > 0 && (
        <div className="flex gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
          {segments.map((s) => (
            <Link
              key={s.id}
              href={`/admin/marketing/research?segment=${s.id}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSegment === s.id
                  ? "bg-white/10 text-white"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {/* Runs */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-white">Runs</h2>
        {runs.length === 0 ? (
          <p className="rounded-lg border border-white/8 px-4 py-6 text-sm text-[#94A3B8]">
            No runs yet for this segment.
          </p>
        ) : (
          <div className="divide-y divide-white/8 rounded-lg border border-white/8">
            {runs.slice(0, 8).map((run) => (
              <div key={run.id} className="flex items-center gap-4 px-4 py-3">
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
                    <span className="text-[#94A3B8]/60">
                      {" "}(+{run.outside_source_count} outside)
                    </span>
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
      </div>

      {/* Pain points */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-white">Pain points</h2>
          <p className="text-xs text-[#94A3B8]/60">
            Every one carries at least one resolvable source link, or it is not stored.
          </p>
        </div>

        {painPoints.length === 0 ? (
          <EmptyState
            icon={Microscope}
            title="No pain points yet"
            description="Run research against this segment to build the list."
          />
        ) : (
          <div className="divide-y divide-white/8 rounded-lg border border-white/8">
            {painPoints.map((p) => (
              <div key={p.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-medium tabular-nums text-[#94A3B8]">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
