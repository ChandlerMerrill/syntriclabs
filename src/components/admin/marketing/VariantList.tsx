"use client"

// The variant list, with no opinion about where it is mounted. The stage page
// scopes it with a campaign picker; the campaign workspace already knows the
// campaign. Both hand it rows.

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import { PenLine, ChevronDown, ChevronRight, ArrowUpDown, Gavel } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type {
  CheckRule,
  CriticRule,
  MarketingVariant,
  MarketingVariantCheck,
  MarketingVariantCritique,
  VariantStatus,
} from "@/lib/marketing/types"

export const VARIANT_STATUS_META: Record<
  VariantStatus,
  { label: string; badge: string; dotClassName: string; dangerWhenNonZero?: boolean }
> = {
  ready: {
    label: "Ready",
    badge: "bg-emerald-500/10 text-emerald-400",
    dotClassName: "bg-emerald-400",
  },
  draft: { label: "Draft", badge: "bg-zinc-500/10 text-zinc-400", dotClassName: "bg-zinc-400" },
  checks_failed: {
    label: "Checks failed",
    badge: "bg-red-500/10 text-red-400",
    dotClassName: "bg-red-400",
    dangerWhenNonZero: true,
  },
  retired: { label: "Retired", badge: "bg-white/5 text-[#94A3B8]", dotClassName: "bg-white/30" },
}

const STATUS_ORDER: VariantStatus[] = ["ready", "draft", "checks_failed", "retired"]

/** What each rule actually enforces — so a failure reads as a fix, not a verdict. */
const RULE_LABELS: Record<CheckRule, string> = {
  banned_words: "banned words",
  word_count: "word count",
  opens_with_i: "opening word",
  one_ask: "one ask",
  link_verified: "link resolves",
  claim_traced: "claim traced",
  qa_review: "QA review",
  devils_advocate: "devil's advocate",
  human: "human approval",
}

const CRITICS: CriticRule[] = ["qa_review", "devils_advocate"]

const SEVERITY_META: Record<
  "blocking" | "concern" | "note",
  { mark: string; className: string }
> = {
  blocking: { mark: "✗", className: "text-red-400" },
  concern: { mark: "!", className: "text-amber-400" },
  note: { mark: "·", className: "text-[#94A3B8]/70" },
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "status", label: "Status", hint: "Ready first, retired last" },
]

interface Props {
  variants: MarketingVariant[]
  checks: MarketingVariantCheck[]
  /** Critiques on file. Absent entirely when a variant has not been critiqued. */
  critiques?: MarketingVariantCritique[]
  /** Fired after a critique or override so the container can revalidate. */
  onCritiqued?: () => void
  /** Shown when the scope holds no variants at all. */
  emptyDescription?: string
}

export default function VariantList({
  variants,
  checks,
  critiques = [],
  onCritiqued,
  emptyDescription = "Generate against a pain point above.",
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [running, setRunning] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [fearSel, setFearSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const checksByVariant = useMemo(() => {
    const map = new Map<string, MarketingVariantCheck[]>()
    for (const c of checks) {
      const list = map.get(c.variant_id) ?? []
      list.push(c)
      map.set(c.variant_id, list)
    }
    return map
  }, [checks])

  const critiquesByVariant = useMemo(() => {
    const map = new Map<string, MarketingVariantCritique[]>()
    for (const c of critiques) {
      const list = map.get(c.variant_id) ?? []
      list.push(c)
      map.set(c.variant_id, list)
    }
    return map
  }, [critiques])

  async function runCritics(variantId: string) {
    setRunning(variantId)
    try {
      const res = await fetch("/api/admin/marketing/variants/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Critique failed")

      const failed = (json.critiques ?? []).filter(
        (c: { verdict: string }) => c.verdict === "fail"
      )
      if (failed.length > 0) {
        toast.warning(
          `Blocked by ${failed.map((c: { critic: string }) => RULE_LABELS[c.critic as CheckRule]).join(" and ")}. Read the findings below.`
        )
      } else {
        toast.success("Both critics passed.")
      }
      onCritiqued?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Critique failed")
    } finally {
      setRunning(null)
    }
  }

  async function override(variantId: string, critic: CriticRule) {
    // A reason is required by the API, and required here rather than defaulted,
    // because an override with nothing attached is indistinguishable from
    // clicking through a warning — which is the behaviour the critic exists to
    // interrupt.
    const reason = window.prompt(
      `Send anyway, against the ${RULE_LABELS[critic]} verdict?\n\nWhy is it wrong?`
    )
    if (!reason?.trim()) return

    try {
      const res = await fetch("/api/admin/marketing/variants/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, override: { critic, reason } }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Override failed")

      toast.success(
        json.sendable ? "Overridden. The variant is now sendable." : `Overridden. ${json.blockedBy}`
      )
      onCritiqued?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed")
    }
  }

  const facets = useMemo<Record<"status" | "fear", Facet<MarketingVariant>>>(
    () => ({
      status: { values: (v) => v.status, order: STATUS_ORDER, meta: VARIANT_STATUS_META },
      fear: { values: (v) => v.icp_fear },
    }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: variants,
        search,
        matchesSearch: (v, q) =>
          (v.subject?.toLowerCase().includes(q) ?? false) ||
          (v.body?.toLowerCase().includes(q) ?? false) ||
          (v.label?.toLowerCase().includes(q) ?? false) ||
          (v.icp_fear?.toLowerCase().includes(q) ?? false),
        facets,
        selected: { status: statusSel, fear: fearSel },
      }),
    [variants, search, facets, statusSel, fearSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case "status":
        rows.sort(
          (a, b) =>
            STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
            b.created_at.localeCompare(a.created_at)
        )
        break
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setFearSel(new Set())
  }

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={filterSummary(visible.length, variants.length, "variant")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search subject or body…" />
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
          {options.fear.length > 1 && (
            <FilterMultiSelect
              options={options.fear}
              selected={active.fear}
              onChange={setFearSel}
              counts={counts.fear}
              allLabel="All ICP fears"
              manyLabel="ICP fears"
              searchable={options.fear.length > 6}
              searchPlaceholder="Search fears…"
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

      {variants.length === 0 ? (
        <EmptyState icon={PenLine} title="No variants yet" description={emptyDescription} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="Nothing matches these filters"
          description="Widen the search or clear the status filter."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((v) => {
            const vChecks = checksByVariant.get(v.id) ?? []
            const failed = vChecks.filter((c) => !c.passed)
            // Critic rows are rendered in their own block below, with findings
            // and an override. Showing them twice would read as two problems.
            const failedRules = failed.filter((c) => !CRITICS.includes(c.rule as CriticRule))
            const notes = vChecks.filter(
              (c) => c.passed && c.detail && !CRITICS.includes(c.rule as CriticRule)
            )
            const isOpen = expanded[v.id] ?? false
            const meta = VARIANT_STATUS_META[v.status]

            const vCritiques = critiquesByVariant.get(v.id) ?? []
            const ruled = new Set(vChecks.map((c) => c.rule))
            const uncritiqued = CRITICS.filter((c) => !ruled.has(c))
            // A critic can only be reached once the mechanical rules pass —
            // spending two model calls on copy that is already blocked for being
            // 140 words teaches nobody anything.
            const canCritique = failedRules.length === 0 && v.status === "ready"

            return (
              <article
                key={v.id}
                className="rounded-xl border border-white/8 bg-[#0B1120] p-4 transition-colors hover:border-white/16"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={meta?.badge ?? "bg-zinc-500/10 text-zinc-400"}
                  >
                    {meta?.label ?? v.status}
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
                {failedRules.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-xs font-medium text-red-400">
                      Blocked by {failedRules.length} rule{failedRules.length === 1 ? "" : "s"}
                    </p>
                    {failedRules.map((c) => (
                      <p key={c.id} className="text-xs text-red-400/90">
                        <span className="font-medium">{RULE_LABELS[c.rule] ?? c.rule}</span>
                        {c.detail ? ` — ${c.detail}` : ""}
                      </p>
                    ))}
                  </div>
                )}

                {/* The critic gate. Both must have ruled before this can queue. */}
                {canCritique && (
                  <div className="mt-3 space-y-2">
                    {uncritiqued.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <Gavel className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <p className="text-xs text-amber-400/90">
                          Not critiqued yet —{" "}
                          {uncritiqued.map((c) => RULE_LABELS[c]).join(" and ")}. Cannot be
                          queued until both have ruled.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="ml-auto h-7 text-xs"
                          disabled={running === v.id}
                          onClick={() => runCritics(v.id)}
                        >
                          {running === v.id ? "Running…" : "Run critics"}
                        </Button>
                      </div>
                    )}

                    {vCritiques.map((crit) => {
                      const check = vChecks.find((c) => c.rule === crit.critic)
                      const overridden = check?.checked_by === "human" && check.passed
                      const blocking = crit.verdict === "fail" && !overridden

                      return (
                        <div
                          key={crit.id}
                          className={`space-y-1 rounded-lg border p-3 ${
                            blocking
                              ? "border-red-500/20 bg-red-500/5"
                              : "border-white/8 bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-white">
                              {RULE_LABELS[crit.critic]}
                            </span>
                            <Badge
                              variant="secondary"
                              className={
                                crit.verdict === "pass"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              }
                            >
                              {crit.verdict}
                            </Badge>
                            {overridden && (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-400">
                                overridden
                              </Badge>
                            )}
                            {crit.transport !== "model" && (
                              <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                                {crit.transport}
                              </Badge>
                            )}
                            {blocking && (
                              <button
                                onClick={() => override(v.id, crit.critic)}
                                className="ml-auto text-xs text-[#60A5FA] transition-colors hover:text-white"
                              >
                                Send anyway…
                              </button>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed text-[#94A3B8]">{crit.summary}</p>

                          {crit.findings.map((f, fi) => {
                            const sev = SEVERITY_META[f.severity]
                            return (
                              <div key={fi} className="pt-1 text-xs">
                                <p className={sev.className}>
                                  <span className="font-medium">{sev.mark}</span> {f.problem}
                                </p>
                                {/* The quote is the whole reason a model is allowed
                                    to block. Always shown with the objection. */}
                                <p className="mt-0.5 border-l border-white/10 pl-2 italic text-[#94A3B8]/60">
                                  {f.quote}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
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
                  className="mt-3 flex items-center gap-1 text-xs text-[#60A5FA] transition-colors hover:text-white"
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
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-white/8 bg-black/30 p-3 text-[11px] leading-relaxed text-[#94A3B8]">
                      {v.generation_prompt}
                    </pre>
                    <pre className="overflow-auto rounded-lg border border-white/8 bg-black/30 p-3 text-[11px] text-[#94A3B8]">
                      {JSON.stringify(v.generation_config, null, 2)}
                    </pre>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
