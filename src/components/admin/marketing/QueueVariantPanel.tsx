"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export interface QueueableVariant {
  id: string
  label: string | null
  subject: string | null
  campaignId: string
}

interface Props {
  readyVariants: QueueableVariant[]
  /** Fired after a successful queue so the container can revalidate. */
  onQueued: () => void
}

export default function QueueVariantPanel({ readyVariants, onQueued }: Props) {
  const [queueVariant, setQueueVariant] = useState(readyVariants[0]?.id ?? "")
  const [busy, setBusy] = useState(false)

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

      onQueued()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
      <h2 className="text-sm font-medium text-white">Queue a variant</h2>
      <p className="mt-1 text-xs text-[#94A3B8]">
        Renders the copy for every qualified prospect in the campaign&apos;s segment and holds it
        here. Suppressed and recently-contacted prospects are skipped, and it says which.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={queueVariant}
          onChange={(e) => setQueueVariant(e.target.value)}
          className="h-9 min-w-64 rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
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
    </section>
  )
}
