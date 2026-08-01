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
import { Send, ShieldCheck, AlertTriangle, ArrowUpDown } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import type { SendWithContext } from "@/lib/marketing/services"
import type { SendStatus } from "@/lib/marketing/types"

export const SEND_STATUS_META: Record<
  SendStatus,
  { label: string; badge: string; dotClassName: string; dangerWhenNonZero?: boolean }
> = {
  pending_approval: {
    label: "Awaiting approval",
    badge: "bg-amber-500/10 text-amber-400",
    dotClassName: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    badge: "bg-[#2563EB]/10 text-[#60A5FA]",
    dotClassName: "bg-[#60A5FA]",
  },
  sending: {
    label: "Sending",
    badge: "bg-violet-500/10 text-violet-400",
    dotClassName: "bg-violet-400",
  },
  sent: {
    label: "Sent",
    badge: "bg-emerald-500/10 text-emerald-400",
    dotClassName: "bg-emerald-400",
  },
  failed: {
    label: "Failed",
    badge: "bg-red-500/10 text-red-400",
    dotClassName: "bg-red-400",
    dangerWhenNonZero: true,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-white/5 text-[#94A3B8]",
    dotClassName: "bg-white/30",
  },
}

const STATUS_ORDER: SendStatus[] = [
  "pending_approval",
  "approved",
  "sending",
  "sent",
  "failed",
  "cancelled",
]

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "company", label: "Company A–Z" },
]

const NO_CAMPAIGN = "__none"

/**
 * Opens on what needs a human, but only when something actually does —
 * presetting a filter that matches nothing is an empty page with no explanation.
 * Exported so a container that controls the selection starts in the same place.
 */
export function initialSendStatusSelection(sends: SendWithContext[]): Set<string> {
  return sends.some((s) => s.status === "pending_approval")
    ? new Set(["pending_approval"])
    : new Set()
}

interface Props {
  sends: SendWithContext[]
  /** Meaningless once the list is already scoped to a single campaign. */
  showCampaignFilter?: boolean
  /** Fired after an approve/cancel so the container can revalidate. */
  onChanged: () => void
  /**
   * Controls the status filter. Containers pass this so queueing can jump the
   * list to "Awaiting approval"; omit both and the list owns the state.
   */
  statusSelection?: Set<string>
  onStatusSelectionChange?: (next: Set<string>) => void
}

export default function SendList({
  sends,
  showCampaignFilter = true,
  onChanged,
  statusSelection,
  onStatusSelectionChange,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const [ownStatusSel, setOwnStatusSel] = useState<Set<string>>(() =>
    initialSendStatusSelection(sends)
  )
  const statusSel = statusSelection ?? ownStatusSel
  const setStatusSel = onStatusSelectionChange ?? setOwnStatusSel
  const [campaignSel, setCampaignSel] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("newest")

  const campaignLabels = useMemo(() => {
    const map: Record<string, { label: string }> = {}
    for (const s of sends) {
      if (s.marketing_campaigns) {
        map[s.marketing_campaigns.id] = { label: s.marketing_campaigns.name }
      }
    }
    return map
  }, [sends])

  const facets = useMemo<Record<"status" | "campaign", Facet<SendWithContext>>>(
    () => ({
      status: { values: (s) => s.status, order: STATUS_ORDER, meta: SEND_STATUS_META },
      campaign: { values: (s) => s.campaign_id ?? NO_CAMPAIGN, meta: campaignLabels },
    }),
    [campaignLabels]
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: sends,
        search,
        matchesSearch: (s, q) =>
          (s.marketing_prospects?.company?.toLowerCase().includes(q) ?? false) ||
          (s.marketing_prospects?.email?.toLowerCase().includes(q) ?? false) ||
          (s.marketing_prospects?.contact_name?.toLowerCase().includes(q) ?? false) ||
          (s.rendered_subject?.toLowerCase().includes(q) ?? false) ||
          (s.marketing_campaigns?.name?.toLowerCase().includes(q) ?? false),
        facets,
        selected: {
          status: statusSel,
          // Scoped mount: the campaign facet must not constrain at all.
          campaign: showCampaignFilter ? campaignSel : new Set<string>(),
        },
      }),
    [sends, search, facets, statusSel, campaignSel, showCampaignFilter]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case "company":
        rows.sort((a, b) =>
          (a.marketing_prospects?.company ?? "").localeCompare(
            b.marketing_prospects?.company ?? ""
          )
        )
        break
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  const selectedIds = Object.keys(selected).filter((id) => selected[id])
  const selectableVisible = sorted.filter(
    (s) => s.status === "pending_approval" || s.status === "approved"
  )
  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((s) => selected[s.id])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setCampaignSel(new Set())
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = { ...prev }
      for (const s of selectableVisible) {
        if (allVisibleSelected) delete next[s.id]
        else next[s.id] = true
      }
      return next
    })
  }

  async function act(action: "approve" | "cancel") {
    if (selectedIds.length === 0) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/marketing/outbox/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendIds: selectedIds, action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed")

      if (json.rejected?.length > 0) {
        toast.warning(
          `${json.updated} ${action}d. ${json.rejected.length} rejected: ${json.rejected
            .map((r: { reason: string }) => r.reason)
            .join("; ")}`
        )
      } else {
        toast.success(`${json.updated} ${action}d`)
      }
      setSelected({})
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {sends.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={filterSummary(visible.length, sends.length, "send")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search company…" />
          {options.status.length > 1 && (
            <FilterMultiSelect
              options={options.status}
              selected={active.status}
              onChange={setStatusSel}
              counts={counts.status}
              allLabel="All statuses"
              manyLabel="Statuses"
              className="w-44"
            />
          )}
          {showCampaignFilter && options.campaign.length > 1 && (
            <FilterMultiSelect
              options={options.campaign}
              selected={active.campaign}
              onChange={setCampaignSel}
              counts={counts.campaign}
              allLabel="All campaigns"
              manyLabel="Campaigns"
              searchable={options.campaign.length > 6}
              searchPlaceholder="Search campaigns…"
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

      {/* Bulk actions — only once there is something in view to act on. */}
      {selectableVisible.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="text-xs font-medium text-[#94A3B8] transition-colors hover:text-white"
          >
            {allVisibleSelected ? "Deselect all" : `Select all ${selectableVisible.length} in view`}
          </button>
          {selectedIds.length > 0 && (
            <>
              <span className="text-xs tabular-nums text-[#94A3B8]/60">
                {selectedIds.length} selected
              </span>
              <Button
                size="sm"
                onClick={() => act("approve")}
                disabled={busy}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                Approve {selectedIds.length}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => act("cancel")}
                disabled={busy}
                className="border-white/8 text-[#94A3B8]"
              >
                Cancel {selectedIds.length}
              </Button>
            </>
          )}
        </div>
      )}

      {sends.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nothing here"
          description="Queue a variant that passed the brand checks to put it in front of an approver."
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nothing matches these filters"
          description="Clear the status filter to see every send."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((s) => {
            const selectable = s.status === "pending_approval" || s.status === "approved"
            const meta = SEND_STATUS_META[s.status]
            const isSelected = selected[s.id] ?? false
            return (
              <article
                key={s.id}
                className={`rounded-xl border bg-[#0B1120] p-4 transition-colors ${
                  isSelected ? "border-[#2563EB]/50" : "border-white/8 hover:border-white/16"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))
                      }
                      aria-label={`Select send to ${s.marketing_prospects?.company ?? "prospect"}`}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                  )}
                  <Badge
                    variant="secondary"
                    className={meta?.badge ?? "bg-zinc-500/10 text-zinc-400"}
                  >
                    {meta?.label ?? s.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-white">
                    {s.marketing_prospects?.company ?? "Unknown company"}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {s.marketing_prospects?.email ?? "no email"}
                  </span>
                  {/* Naming the campaign on every row is noise once the whole
                      list belongs to one. */}
                  {showCampaignFilter && (
                    <span className="ml-auto text-xs text-[#94A3B8]/60">
                      {s.marketing_campaigns?.name}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs text-[#94A3B8]/60",
                      !showCampaignFilter && "ml-auto"
                    )}
                  >
                    {s.channel}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-white">{s.rendered_subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#94A3B8]">
                  {s.rendered_body}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]/60">
                  {s.approved_at && (
                    <span className="flex items-center gap-1 text-emerald-400/80">
                      <ShieldCheck className="h-3 w-3" />
                      Approved {formatDate(s.approved_at)}
                    </span>
                  )}
                  {s.sent_at && <span>Sent {formatDate(s.sent_at)}</span>}
                  {s.provider_message_id && <span>msg {s.provider_message_id.slice(0, 12)}…</span>}
                  {s.gmail_thread_id && <span>thread {s.gmail_thread_id.slice(0, 12)}…</span>}
                  {s.attempt_count > 0 && <span>{s.attempt_count} attempt(s)</span>}
                </div>

                {s.error && (
                  <p className="mt-2 flex items-start gap-1 text-xs text-red-400">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {s.error}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
