"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import VariantList from "@/components/admin/marketing/VariantList"
import VariantGenerator, {
  type GeneratorPainPoint,
} from "@/components/admin/marketing/VariantGenerator"
import { PenLine, Megaphone, Sparkles } from "lucide-react"
import type {
  MarketingVariant,
  MarketingVariantCheck,
  MarketingVariantCritique,
} from "@/lib/marketing/types"

interface Props {
  campaigns: { id: string; name: string; channel: string; segmentId: string | null }[]
  activeCampaign: string | null
  initialVariants: MarketingVariant[]
  initialChecks: MarketingVariantCheck[]
  initialCritiques: MarketingVariantCritique[]
  painPoints: GeneratorPainPoint[]
  hasProfile: boolean
}

export default function VariantsView({
  campaigns,
  activeCampaign,
  initialVariants,
  initialChecks,
  initialCritiques,
  painPoints,
  hasProfile,
}: Props) {
  const router = useRouter()
  const [showGenerate, setShowGenerate] = useState(initialVariants.length === 0)

  const key = activeCampaign
    ? `/api/admin/marketing/variants?campaignId=${activeCampaign}`
    : null

  const { data, mutate } = useSWR<{
    variants: MarketingVariant[]
    checks: MarketingVariantCheck[]
    critiques: MarketingVariantCritique[]
  }>(key, {
    fallbackData: {
      variants: initialVariants,
      checks: initialChecks,
      critiques: initialCritiques,
    },
  })

  const variants = useMemo(() => data?.variants ?? [], [data?.variants])
  const checks = useMemo(() => data?.checks ?? [], [data?.checks])
  const critiques = useMemo(() => data?.critiques ?? [], [data?.critiques])

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
        <FilterSelect
          options={campaigns.map((c) => ({ value: c.id, label: c.name, hint: c.channel }))}
          value={activeCampaign}
          onChange={(id) => router.push(`/admin/marketing/variants?campaign=${id}`)}
          label="Campaign"
          placeholder="Pick a campaign"
          icon={Megaphone}
          searchable={campaigns.length > 6}
          searchPlaceholder="Search campaigns…"
          className="max-w-64"
        />
        <Button
          size="sm"
          onClick={() => setShowGenerate((v) => !v)}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {showGenerate ? "Hide generator" : "Generate"}
        </Button>
      </PageHeader>

      {/* Folded away by default once a campaign has variants, so the list is
          what the page opens on. */}
      {showGenerate && (
        <VariantGenerator
          campaignId={activeCampaign}
          painPoints={painPoints}
          onGenerated={() => {
            mutate()
            router.refresh()
          }}
        />
      )}

      <VariantList
        variants={variants}
        checks={checks}
        critiques={critiques}
        onCritiqued={() => {
          mutate()
          router.refresh()
        }}
      />
    </div>
  )
}
