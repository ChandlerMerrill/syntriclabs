"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import { PenLine, Megaphone, ChevronDown, ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { CheckRule, MarketingVariant, MarketingVariantCheck } from "@/lib/marketing/types"

interface Props {
  campaigns: { id: string; name: string; channel: string; segmentId: string | null }[]
  activeCampaign: string | null
  initialVariants: MarketingVariant[]
  initialChecks: MarketingVariantCheck[]
  painPoints: { id: string; statement: string; frequency: number; rank: number | null }[]
  hasProfile: boolean
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-400",
  checks_failed: "bg-red-500/10 text-red-400",
  ready: "bg-emerald-500/10 text-emerald-400",
  retired: "bg-white/5 text-[#94A3B8]",
}

/** What each rule actually enforces — so a failure reads as a fix, not a verdict. */
const RULE_LABELS: Record<CheckRule, string> = {
  banned_words: "banned words",
  word_count: "word count",
  opens_with_i: "opening word",
  one_ask: "one ask",
  link_verified: "link resolves",
  claim_traced: "claim traced",
  human: "human approval",
}

export default function VariantsView({
  campaigns,
  activeCampaign,
  initialVariants,
  initialChecks,
  painPoints,
  hasProfile,
}: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [painPointId, setPainPointId] = useState<string>("")
  const [variantCount, setVariantCount] = useState(3)
  const [guidance, setGuidance] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const key = activeCampaign
    ? `/api/admin/marketing/variants?campaignId=${activeCampaign}`
    : null

  const { data, mutate } = useSWR<{
    variants: MarketingVariant[]
    checks: MarketingVariantCheck[]
  }>(key, { fallbackData: { variants: initialVariants, checks: initialChecks } })

  const variants = data?.variants ?? []

  const checksByVariant = useMemo(() => {
    const map = new Map<string, MarketingVariantCheck[]>()
    for (const c of data?.checks ?? []) {
      const list = map.get(c.variant_id) ?? []
      list.push(c)
      map.set(c.variant_id, list)
    }
    return map
  }, [data?.checks])

  async function generate() {
    if (!activeCampaign) return
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/marketing/variants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign,
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
      mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  if (!hasProfile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Variants" description="Generated copy, checked against the brand." />
        <EmptyState
          icon={PenLine}
          title="No brand profile yet"
          description="Generation reads the voice rules and hard constraints from the brand profile."
          actionLabel="Go to Marketing"
          actionHref="/admin/marketing"
        />
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Variants" description="Generated copy, checked against the brand." />
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="A variant belongs to a campaign. Create one first."
          actionLabel="Go to Campaigns"
          actionHref="/admin/marketing/campaigns"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Variants"
        description="Every row stores the prompt that produced it. That is what lets a winner change the next prompt instead of just being reused."
      >
        <Link
          href="/admin/marketing/campaigns"
          className="text-xs text-[#60A5FA] hover:text-white"
        >
          Campaigns
        </Link>
      </PageHeader>

      {/* Campaign tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/admin/marketing/variants?campaign=${c.id}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCampaign === c.id
                ? "bg-white/10 text-white"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Generate */}
      <div className="rounded-lg border border-white/8 bg-[#0B1120] p-5">
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
              className="h-9 w-full rounded-md border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
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
              className="h-9 w-full rounded-md border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
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

        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            onClick={generate}
            disabled={generating || !activeCampaign}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {generating ? "Generating…" : "Generate variants"}
          </Button>
          {painPoints.length === 0 && (
            <span className="text-xs text-amber-400/80">
              No researched pain points yet — run research for a sourced angle.
            </span>
          )}
        </div>
      </div>

      {/* Variants */}
      {variants.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="No variants yet"
          description="Generate against a pain point above."
        />
      ) : (
        <div className="space-y-3">
          {variants.map((v) => {
            const vChecks = checksByVariant.get(v.id) ?? []
            const failed = vChecks.filter((c) => !c.passed)
            const notes = vChecks.filter((c) => c.passed && c.detail)
            const isOpen = expanded[v.id] ?? false

            return (
              <div key={v.id} className="rounded-lg border border-white/8 bg-[#0B1120] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[v.status] ?? "bg-zinc-500/10 text-zinc-400"}
                  >
                    {v.status}
                  </Badge>
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
                  <span className="ml-auto text-xs text-[#94A3B8]/60">{v.model}</span>
                  <span className="text-xs text-[#94A3B8]/60">{formatDate(v.created_at)}</span>
                </div>

                <p className="mt-3 text-sm font-medium text-white">{v.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#94A3B8]">
                  {v.body}
                </p>

                {/* Failures, by rule name. */}
                {failed.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-md border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-xs font-medium text-red-400">
                      Blocked by {failed.length} rule{failed.length === 1 ? "" : "s"}
                    </p>
                    {failed.map((c) => (
                      <p key={c.id} className="text-xs text-red-400/90">
                        <span className="font-medium">{RULE_LABELS[c.rule] ?? c.rule}</span>
                        {c.detail ? ` — ${c.detail}` : ""}
                      </p>
                    ))}
                  </div>
                )}

                {/* Passed checks that still carry something a human should read. */}
                {notes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {notes.map((c) => (
                      <p key={c.id} className="text-xs text-[#94A3B8]/70">
                        <span className="font-medium">{RULE_LABELS[c.rule] ?? c.rule}</span> —{" "}
                        {c.detail}
                      </p>
                    ))}
                  </div>
                )}

                {/* The prompt. The whole reason the row exists in this shape. */}
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [v.id]: !isOpen }))}
                  className="mt-3 flex items-center gap-1 text-xs text-[#60A5FA] hover:text-white"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {isOpen ? "Hide" : "Show"} the prompt that produced this
                </button>

                {isOpen && (
                  <div className="mt-2 space-y-2">
                    <pre className="max-h-96 overflow-auto rounded-md border border-white/8 bg-black/30 p-3 text-[11px] leading-relaxed text-[#94A3B8] whitespace-pre-wrap">
                      {v.generation_prompt}
                    </pre>
                    <pre className="overflow-auto rounded-md border border-white/8 bg-black/30 p-3 text-[11px] text-[#94A3B8]">
                      {JSON.stringify(v.generation_config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
