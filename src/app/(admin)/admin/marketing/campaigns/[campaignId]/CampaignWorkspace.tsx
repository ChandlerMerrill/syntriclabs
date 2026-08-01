"use client"

// One campaign, end to end. The stage pages still exist and still answer "show
// me every variant" — this answers "run this campaign" without hopping between
// five of them.
//
// Tabs live in the URL rather than in state, so they deep-link and the browser
// back button steps through them. They are plain pills, deliberately not
// numbered: the 1–6 strip in MarketingNav stays the single global "where am I
// in the loop" device, and a second numbered row would compete with it.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/admin/shared/EmptyState"
import VariantList from "@/components/admin/marketing/VariantList"
import VariantGenerator, {
  type GeneratorPainPoint,
} from "@/components/admin/marketing/VariantGenerator"
import SendList, { initialSendStatusSelection } from "@/components/admin/marketing/SendList"
import QueueVariantPanel, {
  type QueueableVariant,
} from "@/components/admin/marketing/QueueVariantPanel"
import PerformancePanel from "@/components/admin/marketing/PerformancePanel"
import ProspectList from "@/components/admin/marketing/ProspectList"
import PainPointList from "@/components/admin/marketing/PainPointList"
import { cn, formatDate } from "@/lib/utils"
import type {
  MarketingCampaign,
  MarketingPainPoint,
  MarketingProspect,
  MarketingSegment,
  MarketingVariant,
  MarketingVariantCheck,
} from "@/lib/marketing/types"
import type { SendWithContext } from "@/lib/marketing/services"
import type { PerformanceTotals, RatedVariant } from "@/lib/marketing/eval/performance"
import { WORKSPACE_TABS, TAB_LABELS, type WorkspaceTab } from "./tabs"

const STATUS_BADGES: Record<MarketingCampaign["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  draft: "bg-zinc-500/10 text-zinc-400",
  paused: "bg-amber-500/10 text-amber-400",
  archived: "bg-white/5 text-[#94A3B8]",
}

interface Props {
  campaign: MarketingCampaign
  segment: MarketingSegment | null
  tab: WorkspaceTab
  counts: { variants: number; sends: number; audience: number }
  otherCampaignsOnSegment: number
  variantsData: {
    variants: MarketingVariant[]
    checks: MarketingVariantCheck[]
    painPoints: GeneratorPainPoint[]
  } | null
  outboxData: { sends: SendWithContext[]; readyVariants: QueueableVariant[] } | null
  performanceData: {
    variants: RatedVariant[]
    totals: PerformanceTotals
    minSample: number
  } | null
  audienceData: { painPoints: MarketingPainPoint[]; prospects: MarketingProspect[] } | null
}

export default function CampaignWorkspace({
  campaign,
  segment,
  tab,
  counts,
  otherCampaignsOnSegment,
  variantsData,
  outboxData,
  performanceData,
  audienceData,
}: Props) {
  const badges: Partial<Record<WorkspaceTab, number>> = {
    variants: counts.variants,
    outbox: counts.sends,
    audience: counts.audience,
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/admin/marketing/campaigns"
          className="group -ml-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          All campaigns
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{campaign.name}</h1>
          <Badge variant="secondary" className={STATUS_BADGES[campaign.status]}>
            {campaign.status}
          </Badge>
          <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
            {campaign.channel}
          </Badge>
          <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
            {segment?.name ?? "No segment"}
          </Badge>
          <span className="text-xs text-[#94A3B8]/60">
            created {formatDate(campaign.created_at)}
          </span>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-[#94A3B8]">
          {campaign.goal ?? "No stated goal — a reply to this campaign has nothing to mean yet."}
        </p>
      </header>

      <nav
        aria-label="Campaign sections"
        className="flex items-center gap-1 overflow-x-auto border-b border-white/8 pb-px"
      >
        {WORKSPACE_TABS.map((t) => {
          const active = t === tab
          const badge = badges[t]
          return (
            <Link
              key={t}
              href={`/admin/marketing/campaigns/${campaign.id}?tab=${t}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-white/[0.07] text-white"
                  : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {TAB_LABELS[t]}
              {badge !== undefined && badge > 0 && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums",
                    active ? "bg-[#2563EB] text-white" : "bg-white/8 text-[#94A3B8]"
                  )}
                >
                  {badge}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]" />
              )}
            </Link>
          )
        })}
      </nav>

      {tab === "variants" && variantsData && (
        <VariantsTab campaignId={campaign.id} initial={variantsData} />
      )}
      {tab === "outbox" && outboxData && (
        <OutboxTab campaignId={campaign.id} initial={outboxData} />
      )}
      {tab === "performance" && performanceData && (
        <PerformanceTab campaignId={campaign.id} initial={performanceData} />
      )}
      {tab === "audience" &&
        (audienceData && segment ? (
          <AudienceTab
            segment={segment}
            initial={audienceData}
            otherCampaigns={otherCampaignsOnSegment}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="This campaign has no segment"
            description="The audience is drawn from a segment. Until one is set there is nobody to send to."
            actionLabel="Go to Prospects"
            actionHref="/admin/marketing/prospects"
          />
        ))}
    </div>
  )
}

/**
 * A tab's own strapline plus its one action. Without it the action button
 * floats against nothing — the page header belongs to the campaign, not to the
 * tab, so each tab has to say what it is.
 */
function TabHeader({ note, action }: { note: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <p className="max-w-2xl text-xs leading-relaxed text-[#94A3B8]">{note}</p>
      {action}
    </div>
  )
}

function VariantsTab({
  campaignId,
  initial,
}: {
  campaignId: string
  initial: {
    variants: MarketingVariant[]
    checks: MarketingVariantCheck[]
    painPoints: GeneratorPainPoint[]
  }
}) {
  const router = useRouter()
  const [showGenerate, setShowGenerate] = useState(initial.variants.length === 0)

  const { data, mutate } = useSWR<{
    variants: MarketingVariant[]
    checks: MarketingVariantCheck[]
  }>(`/api/admin/marketing/variants?campaignId=${campaignId}`, {
    fallbackData: { variants: initial.variants, checks: initial.checks },
  })

  const variants = useMemo(() => data?.variants ?? [], [data?.variants])
  const checks = useMemo(() => data?.checks ?? [], [data?.checks])

  return (
    <div className="space-y-6">
      <TabHeader
        note="Copy for this campaign. Every row stores the prompt that produced it, so a winner can change the next prompt instead of just being reused."
        action={
          <Button
            size="sm"
            onClick={() => setShowGenerate((v) => !v)}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {showGenerate ? "Hide generator" : "Generate"}
          </Button>
        }
      />

      {showGenerate && (
        <VariantGenerator
          campaignId={campaignId}
          painPoints={initial.painPoints}
          onGenerated={() => {
            mutate()
            router.refresh()
          }}
        />
      )}

      <VariantList
        variants={variants}
        checks={checks}
        emptyDescription="Generate against a pain point to give this campaign something to send."
      />
    </div>
  )
}

function OutboxTab({
  campaignId,
  initial,
}: {
  campaignId: string
  initial: { sends: SendWithContext[]; readyVariants: QueueableVariant[] }
}) {
  const router = useRouter()
  const [showQueue, setShowQueue] = useState(initial.sends.length === 0)
  const [statusSel, setStatusSel] = useState<Set<string>>(() =>
    initialSendStatusSelection(initial.sends)
  )

  const { data, mutate } = useSWR<{ sends: SendWithContext[] }>(
    `/api/admin/marketing/outbox?status=all&campaignId=${campaignId}`,
    {
      fallbackData: { sends: initial.sends },
      refreshInterval: (latest) =>
        latest?.sends.some((s) => s.status === "sending" || s.status === "approved") ? 10000 : 0,
    }
  )

  const sends = useMemo(() => data?.sends ?? [], [data?.sends])

  function revalidate() {
    mutate()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <TabHeader
        note="Nothing leaves without a recorded human approval. The schema refuses it, not just the code."
        action={
          <Button
            size="sm"
            onClick={() => setShowQueue((v) => !v)}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {showQueue ? "Hide queue panel" : "Queue a variant"}
          </Button>
        }
      />

      {showQueue && (
        <QueueVariantPanel
          readyVariants={initial.readyVariants}
          onQueued={() => {
            setStatusSel(new Set(["pending_approval"]))
            revalidate()
          }}
        />
      )}

      {/* Already scoped to one campaign, so the campaign facet would only ever
          offer the campaign you are standing in. */}
      <SendList
        sends={sends}
        showCampaignFilter={false}
        onChanged={revalidate}
        statusSelection={statusSel}
        onStatusSelectionChange={setStatusSel}
      />
    </div>
  )
}

function PerformanceTab({
  campaignId,
  initial,
}: {
  campaignId: string
  initial: { variants: RatedVariant[]; totals: PerformanceTotals; minSample: number }
}) {
  const { data } = useSWR<{ variants: RatedVariant[]; totals: PerformanceTotals }>(
    `/api/admin/marketing/performance?campaignId=${campaignId}`,
    { fallbackData: { variants: initial.variants, totals: initial.totals } }
  )

  return (
    <PerformancePanel
      variants={data?.variants ?? initial.variants}
      totals={data?.totals ?? initial.totals}
      minSample={initial.minSample}
      showCampaignName={false}
    />
  )
}

function AudienceTab({
  segment,
  initial,
  otherCampaigns,
}: {
  segment: MarketingSegment
  initial: { painPoints: MarketingPainPoint[]; prospects: MarketingProspect[] }
  otherCampaigns: number
}) {
  const router = useRouter()

  const { data, mutate } = useSWR<{ prospects: MarketingProspect[] }>(
    `/api/admin/marketing/prospects?segmentId=${segment.id}`,
    { fallbackData: { prospects: initial.prospects } }
  )

  const prospects = useMemo(() => data?.prospects ?? [], [data?.prospects])

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-white">Pain points</h2>
          <p className="text-xs text-[#94A3B8]/60">
            Researched against {segment.name}. Generation on the Variants tab draws on these.
          </p>
        </div>
        <PainPointList
          painPoints={initial.painPoints}
          emptyDescription={`No research has been run against ${segment.name} yet.`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-white">Prospects</h2>
        <ProspectList
          prospects={prospects}
          segments={[{ id: segment.id, name: segment.name }]}
          showSegmentFilter={false}
          emptyDescription={`No prospects in ${segment.name} yet. Add them on the Prospects page.`}
          sharedNote={
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs leading-relaxed text-amber-200/80">
                <span className="font-medium">This audience is shared.</span> Prospects belong to
                the <span className="font-medium">{segment.name}</span> segment, not to this
                campaign
                {otherCampaigns > 0 && (
                  <>
                    {" "}
                    — {otherCampaigns} other campaign{otherCampaigns === 1 ? "" : "s"} draw
                    {otherCampaigns === 1 ? "s" : ""} on the same pool
                  </>
                )}
                . Suppressing someone here silences them everywhere.
              </p>
            </div>
          }
          onChanged={() => {
            mutate()
            router.refresh()
          }}
        />
      </section>
    </div>
  )
}
