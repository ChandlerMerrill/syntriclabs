"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import { Megaphone, PenLine } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { MarketingCampaign } from "@/lib/marketing/types"

interface Props {
  initialCampaigns: MarketingCampaign[]
  segments: { id: string; name: string; slug: string }[]
  hasProfile: boolean
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-400",
  active: "bg-emerald-500/10 text-emerald-400",
  paused: "bg-amber-500/10 text-amber-400",
  archived: "bg-white/5 text-[#94A3B8]",
}

export default function CampaignsView({ initialCampaigns, segments, hasProfile }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [segmentId, setSegmentId] = useState<string>(segments[0]?.id ?? "")

  const { data, mutate } = useSWR<{ campaigns: MarketingCampaign[] }>(
    "/api/admin/marketing/campaigns",
    { fallbackData: { campaigns: initialCampaigns } }
  )
  const campaigns = data?.campaigns ?? []

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || null,
          segmentId: segmentId || null,
          channel: "email",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create campaign")
      toast.success(`Created ${json.campaign.name}`)
      setName("")
      setGoal("")
      mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign")
    } finally {
      setCreating(false)
    }
  }

  if (!hasProfile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campaigns" description="What a reply is supposed to mean." />
        <EmptyState
          icon={Megaphone}
          title="No brand profile yet"
          description="A campaign belongs to a brand profile. Seed one first."
          actionLabel="Go to Marketing"
          actionHref="/admin/marketing"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="A campaign is a segment, a channel, and a stated goal. Variants hang off it."
      />

      {/* Create */}
      <div className="rounded-lg border border-white/8 bg-[#0B1120] p-5">
        <h2 className="text-sm font-medium text-white">New campaign</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guiding & outfitting — CUA reporting"
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8]">Segment</label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="h-9 w-full rounded-md border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
            >
              <option value="">No segment</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs text-[#94A3B8]">
              Goal — what a reply to this campaign is supposed to mean
            </label>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="A conversation about how they handle per-park client counts"
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            onClick={create}
            disabled={creating || !name.trim()}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {creating ? "Creating…" : "Create campaign"}
          </Button>
          <span className="text-xs text-[#94A3B8]/60">Channel is email. LinkedIn is queue-only.</span>
        </div>
      </div>

      {/* List */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create one above, then generate variants against a researched pain point."
        />
      ) : (
        <div className="divide-y divide-white/8 rounded-lg border border-white/8">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{c.name}</p>
                {c.goal && <p className="mt-0.5 truncate text-xs text-[#94A3B8]">{c.goal}</p>}
              </div>
              <Badge
                variant="secondary"
                className={STATUS_COLORS[c.status] ?? "bg-zinc-500/10 text-zinc-400"}
              >
                {c.status}
              </Badge>
              <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                {c.channel}
              </Badge>
              <span className="text-xs text-[#94A3B8]">{formatDate(c.created_at)}</span>
              <Link
                href={`/admin/marketing/variants?campaign=${c.id}`}
                className="flex items-center gap-1 text-xs text-[#60A5FA] hover:text-white"
              >
                <PenLine className="h-3 w-3" />
                Variants
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
