"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/admin/shared/PageHeader"
import { Microscope, PenLine, Users, Send, BarChart3, Megaphone } from "lucide-react"

interface ProfileSummary {
  id: string
  name: string
  slug: string
  bannedWordCount: number
  proofAssetCount: number
  maxWords: number
  fearCount: number
}

interface Props {
  initialProfile: ProfileSummary | null
  segments: { id: string; name: string; slug: string }[]
  counts: {
    painPoints: number
    variants: number
    prospects: number
    pendingApproval: number
    sent: number
  }
}

const STAGES = [
  {
    href: "/admin/marketing/research",
    icon: Microscope,
    title: "Research",
    blurb: "Sources in, ranked pain points out. Every one carries an evidence link.",
    key: "painPoints" as const,
    unit: "pain points",
  },
  {
    href: "/admin/marketing/variants",
    icon: PenLine,
    title: "Variants",
    blurb: "Generated with their own prompt stored alongside, then checked against the brand profile.",
    key: "variants" as const,
    unit: "variants",
  },
  {
    href: "/admin/marketing/prospects",
    icon: Users,
    title: "Prospects",
    blurb: "Who a variant can go to, and who is suppressed.",
    key: "prospects" as const,
    unit: "prospects",
  },
  {
    href: "/admin/marketing/outbox",
    icon: Send,
    title: "Outbox",
    blurb: "The approval gate. Nothing leaves without a recorded human approval.",
    key: "pendingApproval" as const,
    unit: "awaiting approval",
  },
  {
    href: "/admin/marketing/performance",
    icon: BarChart3,
    title: "Performance",
    blurb: "Which variant — and which prompt — produced which reply. Sample size on every rate.",
    key: "sent" as const,
    unit: "sent",
  },
]

export default function MarketingOverview({ initialProfile, segments, counts }: Props) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [seeding, setSeeding] = useState(false)

  async function seed() {
    setSeeding(true)
    try {
      const res = await fetch("/api/admin/marketing/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Seed failed")
      setProfile({
        id: json.profile.id,
        name: json.profile.name,
        slug: json.profile.slug,
        bannedWordCount: json.profile.bannedWords.length,
        proofAssetCount: json.profile.proofAssets.length,
        maxWords: json.profile.hardRules.maxWords,
        fearCount: json.profile.icp.fears.length,
      })
      toast.success(`Seeded ${json.profile.name} and ${json.segments.length} segments`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed failed")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Research to reply, with a human approval gate in front of anything that publishes."
      >
        <Button
          size="sm"
          variant={profile ? "outline" : "default"}
          onClick={seed}
          disabled={seeding}
          className={profile ? "border-white/8 text-[#94A3B8]" : "bg-[#2563EB] text-white hover:bg-[#3B82F6]"}
        >
          {seeding ? "Seeding…" : profile ? "Re-seed from code" : "Seed brand profile"}
        </Button>
      </PageHeader>

      {/* Brand profile — the productization seam */}
      <div className="rounded-lg border border-white/8 bg-[#0B1120] p-5">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
          <div className="flex-1">
            <h2 className="text-sm font-medium text-white">Brand profile</h2>
            {profile ? (
              <>
                <p className="mt-1 text-sm text-[#94A3B8]">
                  Everything the loop knows about who is speaking. Voice rules, banned words,
                  ICP, proof assets. The loop code holds no brand facts of its own.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-[#2563EB]/10 text-[#60A5FA]">
                    {profile.name}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                    {profile.bannedWordCount} banned words
                  </Badge>
                  <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                    {profile.maxWords}-word ceiling
                  </Badge>
                  <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                    {profile.proofAssetCount} proof assets
                  </Badge>
                  <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                    {profile.fearCount} ICP fears
                  </Badge>
                </div>
                {segments.length > 0 && (
                  <p className="mt-3 text-xs text-[#94A3B8]">
                    Segments: {segments.map((s) => s.name).join(" · ")}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-[#94A3B8]">
                No profile yet. Seed it to write Syntric&apos;s voice rules, banned-word list, ICP,
                and proof assets into the database. Nothing else in the module works without it.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const Icon = stage.icon
          const count = counts[stage.key]
          return (
            <Link
              key={stage.href}
              href={stage.href}
              className="group rounded-lg border border-white/8 bg-[#0B1120] p-5 transition-colors hover:border-white/16"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-[#94A3B8] group-hover:text-white" />
                <span className="text-2xl font-semibold text-white tabular-nums">{count}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-white">{stage.title}</p>
              <p className="mt-0.5 text-xs text-[#94A3B8]">{count} {stage.unit}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]/70">{stage.blurb}</p>
            </Link>
          )
        })}
      </div>

      <p className="text-xs leading-relaxed text-[#94A3B8]/60">
        Reply rates here sit next to their sample size on purpose. At single-digit monthly
        conversions a two-reply winner is not a winner — the near-term job of this loop is
        traceability, not picking one.
      </p>
    </div>
  )
}
