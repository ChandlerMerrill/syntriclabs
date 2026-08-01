"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import { Users, Ban, Undo2 } from "lucide-react"
import type { MarketingProspect } from "@/lib/marketing/types"

interface Props {
  initialProspects: MarketingProspect[]
  segments: { id: string; name: string; slug: string }[]
}

export default function ProspectsView({ initialProspects, segments }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [segmentId, setSegmentId] = useState(segments[0]?.id ?? "")

  const { data, mutate } = useSWR<{ prospects: MarketingProspect[] }>(
    "/api/admin/marketing/prospects",
    { fallbackData: { prospects: initialProspects } }
  )
  const prospects = data?.prospects ?? []

  async function save(payload: Record<string, unknown>, successMessage: string) {
    const res = await fetch("/api/admin/marketing/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "Failed to save")
    toast.success(successMessage)
    mutate()
    router.refresh()
  }

  async function add() {
    if (!company.trim()) return
    setSaving(true)
    try {
      await save(
        {
          company: company.trim(),
          contactName: contactName.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          segmentId: segmentId || null,
          qualified: true,
        },
        `Added ${company.trim()}`
      )
      setCompany("")
      setContactName("")
      setEmail("")
      setWebsite("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function toggleSuppression(p: MarketingProspect) {
    try {
      await save(
        {
          id: p.id,
          company: p.company,
          contactName: p.contact_name,
          email: p.email,
          website: p.website,
          segmentId: p.segment_id,
          qualified: p.qualified,
          suppress: !p.suppressed_at,
          suppressionReason: p.suppressed_at ? null : "Manually suppressed",
        },
        p.suppressed_at ? `Un-suppressed ${p.company}` : `Suppressed ${p.company}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        description="Who a variant can go to. Suppression is checked before every send and before anything is queued."
      />

      <div className="rounded-lg border border-white/8 bg-[#0B1120] p-5">
        <h2 className="text-sm font-medium text-white">Add a prospect</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
          />
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact name (optional)"
            className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
          />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
          />
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website (optional)"
            className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/40"
          />
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
          <Button
            size="sm"
            onClick={add}
            disabled={saving || !company.trim()}
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {saving ? "Saving…" : "Add prospect"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-[#94A3B8]/60">
          A contact name is what makes <code className="text-[#94A3B8]">{"{{first_name}}"}</code>{" "}
          resolvable. Variants using it can only be queued for prospects that have one.
        </p>
      </div>

      {prospects.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No prospects yet"
          description="Add one above, or qualify them from a research run."
        />
      ) : (
        <div className="divide-y divide-white/8 rounded-lg border border-white/8">
          {prospects.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-white">{p.company}</p>
                  {p.suppressed_at && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-400">
                      suppressed
                    </Badge>
                  )}
                  {p.qualified === false && (
                    <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
                      not qualified
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                  {[p.contact_name, p.email].filter(Boolean).join(" · ") || "No contact on file"}
                  {p.suppression_reason ? ` — ${p.suppression_reason}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleSuppression(p)}
                className="border-white/8 text-xs text-[#94A3B8]"
              >
                {p.suppressed_at ? (
                  <>
                    <Undo2 className="mr-1 h-3 w-3" /> Un-suppress
                  </>
                ) : (
                  <>
                    <Ban className="mr-1 h-3 w-3" /> Suppress
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
