"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import { Send, ShieldCheck, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { SendWithContext } from "@/lib/marketing/services"

interface Props {
  initialSends: SendWithContext[]
  readyVariants: { id: string; label: string | null; subject: string | null; campaignId: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  pending_approval: "bg-amber-500/10 text-amber-400",
  approved: "bg-[#2563EB]/10 text-[#60A5FA]",
  sending: "bg-violet-500/10 text-violet-400",
  sent: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  cancelled: "bg-white/5 text-[#94A3B8]",
}

const FILTERS = [
  { key: "pending_approval", label: "Awaiting approval" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
  { key: "all", label: "All" },
]

export default function OutboxView({ initialSends, readyVariants }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState("pending_approval")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [queueVariant, setQueueVariant] = useState(readyVariants[0]?.id ?? "")

  const { data, mutate } = useSWR<{ sends: SendWithContext[] }>(
    `/api/admin/marketing/outbox?status=${filter}`,
    {
      fallbackData: { sends: initialSends },
      refreshInterval: (latest) =>
        latest?.sends.some((s) => s.status === "sending" || s.status === "approved") ? 10000 : 0,
    }
  )

  const sends = data?.sends ?? []
  const selectedIds = Object.keys(selected).filter((id) => selected[id])

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
      mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  async function queue() {
    if (!queueVariant) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/marketing/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: queueVariant }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to queue")

      const skippedNote = json.skipped?.length
        ? ` ${json.skipped.length} skipped: ${json.skipped
            .map((s: { prospect: string; reason: string }) => `${s.prospect} (${s.reason})`)
            .join("; ")}`
        : ""
      if (json.queued > 0) toast.success(`Queued ${json.queued} for approval.${skippedNote}`)
      else toast.warning(`Nothing queued.${skippedNote}`)

      setFilter("pending_approval")
      mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbox"
        description="Nothing leaves without a recorded human approval. The schema refuses it, not just the code."
      />

      {/* Queue */}
      <div className="rounded-lg border border-white/8 bg-[#0B1120] p-5">
        <h2 className="text-sm font-medium text-white">Queue a variant</h2>
        <p className="mt-1 text-xs text-[#94A3B8]">
          Renders the copy for every qualified prospect in the campaign&apos;s segment and holds it
          here. Suppressed and recently-contacted prospects are skipped, and it says which.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={queueVariant}
            onChange={(e) => setQueueVariant(e.target.value)}
            className="h-9 min-w-64 rounded-md border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
          >
            {readyVariants.length === 0 && <option value="">No variants have passed the gate</option>}
            {readyVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label ? `${v.label} — ` : ""}
                {v.subject}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={queue}
            disabled={busy || !queueVariant}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            Queue for approval
          </Button>
        </div>
      </div>

      {/* Filters + bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key)
                setSelected({})
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-white/10 text-white" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      {sends.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nothing here"
          description="Queue a variant that passed the brand checks to put it in front of an approver."
        />
      ) : (
        <div className="space-y-3">
          {sends.map((s) => {
            const selectable = s.status === "pending_approval" || s.status === "approved"
            return (
              <div key={s.id} className="rounded-lg border border-white/8 bg-[#0B1120] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={selected[s.id] ?? false}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                  )}
                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[s.status] ?? "bg-zinc-500/10 text-zinc-400"}
                  >
                    {s.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-white">
                    {s.marketing_prospects?.company ?? "Unknown company"}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {s.marketing_prospects?.email ?? "no email"}
                  </span>
                  <span className="ml-auto text-xs text-[#94A3B8]/60">
                    {s.marketing_campaigns?.name}
                  </span>
                  <span className="text-xs text-[#94A3B8]/60">{s.channel}</span>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
