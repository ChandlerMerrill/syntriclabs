"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect, {
  pruneSelection,
  type FilterOption,
} from "@/components/admin/shared/FilterMultiSelect"
import { Megaphone, ChevronRight, Plus, ArrowUpDown } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { MarketingCampaign } from "@/lib/marketing/types"

interface Props {
  initialCampaigns: MarketingCampaign[]
  segments: { id: string; name: string; slug: string }[]
  hasProfile: boolean
}

type CampaignStatus = MarketingCampaign["status"]

const STATUS_META: Record<CampaignStatus, { label: string; badge: string; dot: string }> = {
  active: { label: "Active", badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  draft: { label: "Draft", badge: "bg-zinc-500/10 text-zinc-400", dot: "bg-zinc-400" },
  paused: { label: "Paused", badge: "bg-amber-500/10 text-amber-400", dot: "bg-amber-400" },
  archived: { label: "Archived", badge: "bg-white/5 text-[#94A3B8]", dot: "bg-white/30" },
}

const STATUS_ORDER: CampaignStatus[] = ["active", "draft", "paused", "archived"]

const NO_SEGMENT = "__none"

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "status", label: "Status", hint: "Active first, archived last" },
]

export default function CampaignsView({ initialCampaigns, segments, hasProfile }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(initialCampaigns.length === 0)
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [segmentId, setSegmentId] = useState<string>(segments[0]?.id ?? "")

  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [segmentSel, setSegmentSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const { data, mutate } = useSWR<{ campaigns: MarketingCampaign[] }>(
    "/api/admin/marketing/campaigns",
    { fallbackData: { campaigns: initialCampaigns } }
  )
  const campaigns = useMemo(() => data?.campaigns ?? [], [data?.campaigns])

  const segmentName = useMemo(() => {
    const map = new Map(segments.map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? map.get(id) ?? "Unknown segment" : "No segment")
  }, [segments])

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.goal?.toLowerCase().includes(q) ?? false)
    )
  }, [campaigns, search])

  const statusOptions = useMemo<FilterOption[]>(() => {
    const present = new Set(campaigns.map((c) => c.status))
    return STATUS_ORDER.filter((s) => present.has(s)).map((s) => ({
      value: s,
      label: STATUS_META[s].label,
      dotClassName: STATUS_META[s].dot,
    }))
  }, [campaigns])

  const segmentOptions = useMemo<FilterOption[]>(() => {
    const present = new Set(campaigns.map((c) => c.segment_id ?? NO_SEGMENT))
    const options = segments
      .filter((s) => present.has(s.id))
      .map((s) => ({ value: s.id, label: s.name }))
    if (present.has(NO_SEGMENT)) options.push({ value: NO_SEGMENT, label: "No segment" })
    return options
  }, [campaigns, segments])

  // Archiving the last active campaign removes that bucket — the pick has to
  // stop constraining with it rather than emptying the list invisibly.
  const activeStatus = useMemo(
    () => pruneSelection(statusSel, statusOptions),
    [statusSel, statusOptions]
  )
  const activeSegment = useMemo(
    () => pruneSelection(segmentSel, segmentOptions),
    [segmentSel, segmentOptions]
  )

  const statusCounts = useMemo(() => {
    const pool = activeSegment.size
      ? searched.filter((c) => activeSegment.has(c.segment_id ?? NO_SEGMENT))
      : searched
    const counts: Record<string, number> = {}
    for (const c of pool) counts[c.status] = (counts[c.status] ?? 0) + 1
    return counts
  }, [searched, activeSegment])

  const segmentCounts = useMemo(() => {
    const pool = activeStatus.size ? searched.filter((c) => activeStatus.has(c.status)) : searched
    const counts: Record<string, number> = {}
    for (const c of pool) {
      const key = c.segment_id ?? NO_SEGMENT
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [searched, activeStatus])

  const visible = useMemo(() => {
    let rows = searched
    if (activeStatus.size) rows = rows.filter((c) => activeStatus.has(c.status))
    if (activeSegment.size) rows = rows.filter((c) => activeSegment.has(c.segment_id ?? NO_SEGMENT))
    const sorted = [...rows]
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "status":
        sorted.sort(
          (a, b) =>
            STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
            b.created_at.localeCompare(a.created_at)
        )
        break
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return sorted
  }, [searched, activeStatus, activeSegment, sort])

  const filtersActive = search.trim() !== "" || activeStatus.size > 0 || activeSegment.size > 0

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setSegmentSel(new Set())
  }

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || null,
          segmentId: segmentId || null,
          channel: "email",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create campaign")
      toast.success(`Created ${json.campaign.name}`)
      setName("")
      setGoal("")
      mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign")
    } finally {
      setCreating(false)
    }
  }

  if (!hasProfile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campaigns" description="What a reply is supposed to mean." />
        <EmptyState
          icon={Megaphone}
          title="No brand profile yet"
          description="A campaign belongs to a brand profile. Seed one first."
          actionLabel="Go to Marketing"
          actionHref="/admin/marketing"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="A campaign is a segment, a channel, and a stated goal. Variants hang off it."
      >
        <Button
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {showCreate ? "Hide form" : "New campaign"}
        </Button>
      </PageHeader>

      {showCreate && (
        <section className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
          <h2 className="text-sm font-medium text-white">New campaign</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8]">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guiding & outfitting — CUA reporting"
                className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8]">Segment</label>
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="h-9 w-full rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
              >
                <option value="">No segment</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-[#94A3B8]">
                Goal — what a reply to this campaign is supposed to mean
              </label>
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="A conversation about how they handle per-park client counts"
                className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={create}
              disabled={creating || !name.trim()}
              className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
            >
              {creating ? "Creating…" : "Create campaign"}
            </Button>
            <span className="text-xs text-[#94A3B8]/60">
              Channel is email. LinkedIn is queue-only.
            </span>
          </div>
        </section>
      )}

      {campaigns.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={
            filtersActive
              ? `${visible.length} of ${campaigns.length}`
              : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`
          }
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search name or goal…" />
          {statusOptions.length > 1 && (
            <FilterMultiSelect
              options={statusOptions}
              selected={activeStatus}
              onChange={setStatusSel}
              counts={statusCounts}
              allLabel="All statuses"
              manyLabel="Statuses"
              className="w-40"
            />
          )}
          {segmentOptions.length > 1 && (
            <FilterMultiSelect
              options={segmentOptions}
              selected={activeSegment}
              onChange={setSegmentSel}
              counts={segmentCounts}
              allLabel="All segments"
              manyLabel="Segments"
              searchable={segmentOptions.length > 6}
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
            className="w-44"
          />
        </FilterBar>
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create one above, then generate variants against a researched pain point."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nothing matches these filters"
          description="Widen the search or clear the status filter."
        />
      ) : (
        <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/8">
          {visible.map((c) => {
            const meta = STATUS_META[c.status]
            return (
              // The whole row opens the campaign's workspace — one campaign, end
              // to end, instead of five stage pages re-scoped by hand.
              <Link
                key={c.id}
                href={`/admin/marketing/campaigns/${c.id}`}
                className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{c.name}</p>
                  <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                    {c.goal ?? "No stated goal"}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={meta?.badge ?? "bg-zinc-500/10 text-zinc-400"}
                >
                  {meta?.label ?? c.status}
                </Badge>
                <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                  {segmentName(c.segment_id)}
                </Badge>
                <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                  {c.channel}
                </Badge>
                <span className="text-xs text-[#94A3B8]">{formatDate(c.created_at)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]/40 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
