"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface GeneratorPainPoint {
  id: string
  statement: string
  frequency: number
  rank: number | null
}

interface Props {
  campaignId: string | null
  painPoints: GeneratorPainPoint[]
  /** Fired after a successful run so the container can revalidate. */
  onGenerated: () => void
}

export default function VariantGenerator({ campaignId, painPoints, onGenerated }: Props) {
  const [generating, setGenerating] = useState(false)
  const [painPointId, setPainPointId] = useState("")
  const [variantCount, setVariantCount] = useState(3)
  const [guidance, setGuidance] = useState("")

  async function generate() {
    if (!campaignId) return
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/marketing/variants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          painPointId: painPointId || null,
          variantCount,
          guidance: guidance.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Generation failed")

      const failed = json.generated - json.passed
      if (failed > 0) {
        toast.warning(
          `${json.generated} generated, ${json.passed} passed the gate. ${failed} failed — see the rules below.`
        )
      } else {
        toast.success(`${json.generated} generated, all passed the gate.`)
      }
      setGuidance("")
      onGenerated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
      <h2 className="text-sm font-medium text-white">Generate</h2>
      <p className="mt-1 text-xs text-[#94A3B8]">
        Variants differ by angle, not by wording. Each one is checked before it can be queued —
        nothing here sends.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-[#94A3B8]">Pain point</label>
          <select
            value={painPointId}
            onChange={(e) => setPainPointId(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
          >
            <option value="">None — write from the ICP alone</option>
            {painPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rank ? `${p.rank}. ` : ""}
                {p.statement.slice(0, 90)} ({p.frequency} src)
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#94A3B8]">How many</label>
          <select
            value={variantCount}
            onChange={(e) => setVariantCount(Number(e.target.value))}
            className="h-9 w-full rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} variant{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs text-[#94A3B8]">Steer (optional) — recorded on every row</label>
          <Textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            rows={2}
            placeholder="Lead on the reporting deadline rather than the receipt pile."
            className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={generate}
          disabled={generating || !campaignId}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          {generating ? "Generating…" : "Generate variants"}
        </Button>
        {painPoints.length === 0 && (
          <span className="text-xs text-amber-400/80">
            No researched pain points yet —{" "}
            <Link href="/admin/marketing/research" className="text-[#60A5FA] hover:text-white">
              run research
            </Link>{" "}
            for a sourced angle.
          </span>
        )}
      </div>
    </section>
  )
}
