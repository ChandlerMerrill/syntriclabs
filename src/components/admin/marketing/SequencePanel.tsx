"use client"

import { useState } from "react"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, CornerDownRight } from "lucide-react"
import type { QueueableVariant } from "./QueueVariantPanel"
import type { CampaignStep } from "@/lib/marketing/send/sequence"

/**
 * The follow-up sequence for one campaign.
 *
 * Deliberately shows what is *held* as prominently as what is due. A sequence
 * that produces nothing looks identical to a sequence with nobody due, and the
 * reason a prospect was passed over — replied, suppressed, still inside the gap
 * — is the only thing that distinguishes them.
 */

interface ScanResponse {
  steps: CampaignStep[]
  due: number
  held: { prospectId: string; stepNo: number; reason: string }[]
}

interface Props {
  campaignId: string
  readyVariants: QueueableVariant[]
  /**
   * The steps the server already loaded. Without it the first paint claims
   * "no steps yet" for a campaign that has a sequence, then corrects itself —
   * a panel whose whole job is reporting state should not begin by misreporting
   * it. The scan (`due`/`held`) is genuinely not known until the fetch lands.
   */
  initialSteps: CampaignStep[]
  onQueued: () => void
}

export default function SequencePanel({
  campaignId,
  readyVariants,
  initialSteps,
  onQueued,
}: Props) {
  const key = `/api/admin/marketing/campaigns/steps?campaignId=${campaignId}`
  const { data, mutate } = useSWR<ScanResponse>(key)

  const steps = data?.steps ?? initialSteps
  const nextStepNo = (steps.at(-1)?.step_no ?? 0) + 1

  const used = new Set(steps.map((s) => s.variant_id))
  const available = readyVariants.filter((v) => !used.has(v.id))

  const [variantId, setVariantId] = useState("")
  const [delayDays, setDelayDays] = useState(3)
  const [busy, setBusy] = useState(false)

  async function addStep() {
    if (!variantId) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/marketing/campaigns/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, stepNo: nextStepNo, delayDays, variantId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to save step")
      toast.success(`Step ${nextStepNo} added`)
      setVariantId("")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save step")
    } finally {
      setBusy(false)
    }
  }

  async function removeStep(stepNo: number) {
    try {
      const res = await fetch(
        `/api/admin/marketing/campaigns/steps?campaignId=${campaignId}&stepNo=${stepNo}`,
        { method: "DELETE" }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to delete step")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete step")
    }
  }

  async function queueDue() {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/marketing/outbox/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to queue follow-ups")
      if (json.queued > 0) toast.success(`Queued ${json.queued} follow-up(s) for approval`)
      else toast.info("Nothing due right now")
      mutate()
      onQueued()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue follow-ups")
    } finally {
      setBusy(false)
    }
  }

  const label = (id: string) =>
    readyVariants.find((v) => v.id === id)?.label ?? "(variant no longer ready)"

  return (
    <section className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-white">Follow-up sequence</h2>
        {data && (
          <span className="text-xs text-[#94A3B8]">
            {data.due} due · {data.held.length} held
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-[#94A3B8]">
        A step is queued once the one before it has sent and its gap has passed. A reply cancels
        the rest, and suppression stops everything. Every step still lands in the outbox for
        approval — this schedules drafts, not sends.
      </p>

      {steps.length === 0 ? (
        <p className="mt-4 text-xs text-[#94A3B8]/60">
          No steps yet. Add step 1 — the opener, which has no gap — then step 2 and beyond.
          Sends already queued by hand are treated as step 1 whether or not one is defined.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-white/8 overflow-hidden rounded-lg border border-white/8">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2">
              <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                step {s.step_no}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-xs text-white">
                {label(s.variant_id)}
              </span>
              <span className="shrink-0 text-xs text-[#94A3B8]">
                {s.step_no === 1 ? "opener" : `+${s.delay_days}d`}
              </span>
              <button
                onClick={() => removeStep(s.step_no)}
                className="shrink-0 text-[#94A3B8] transition-colors hover:text-red-400"
                aria-label={`Remove step ${s.step_no}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CornerDownRight className="h-3.5 w-3.5 text-[#94A3B8]/60" />
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="h-9 max-w-72 rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
        >
          <option value="">
            {available.length ? `Variant for step ${nextStepNo}…` : "No unused ready variants"}
          </option>
          {available.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label ?? v.subject ?? v.id.slice(0, 8)}
            </option>
          ))}
        </select>
        {/* Step 1's gap is measured from nothing, so it is not offered. */}
        {nextStepNo > 1 && (
          <label className="flex items-center gap-2 text-xs text-[#94A3B8]">
            wait
            <input
              type="number"
              min={0}
              max={365}
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="h-9 w-16 rounded-lg border border-white/8 bg-[#0B1120] px-2 text-sm text-white"
            />
            days after step {nextStepNo - 1}
          </label>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={addStep}
          disabled={busy || !variantId}
          className="border-white/8 text-[#94A3B8]"
        >
          Add step {nextStepNo}
        </Button>
        {steps.length > 1 && (
          <Button
            size="sm"
            onClick={queueDue}
            disabled={busy || !data?.due}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {data?.due ? `Queue ${data.due} due` : "Nothing due"}
          </Button>
        )}
      </div>

      {data && data.held.length > 0 && (
        <div className="mt-4 space-y-1 rounded-lg border border-white/8 bg-black/20 p-3">
          {data.held.map((h, i) => (
            <p key={i} className="text-xs text-[#94A3B8]">
              step {h.stepNo} held — {h.reason}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
