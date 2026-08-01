"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PageHeader from "@/components/admin/shared/PageHeader"
import ProspectList from "@/components/admin/marketing/ProspectList"
import { Plus } from "lucide-react"
import type { MarketingProspect } from "@/lib/marketing/types"

interface Props {
  initialProspects: MarketingProspect[]
  segments: { id: string; name: string; slug: string }[]
}

export default function ProspectsView({ initialProspects, segments }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(initialProspects.length === 0)
  const [company, setCompany] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [segmentId, setSegmentId] = useState(segments[0]?.id ?? "")

  const { data, mutate } = useSWR<{ prospects: MarketingProspect[] }>(
    "/api/admin/marketing/prospects",
    { fallbackData: { prospects: initialProspects } }
  )
  const prospects = useMemo(() => data?.prospects ?? [], [data?.prospects])

  function revalidate() {
    mutate()
    router.refresh()
  }

  async function add() {
    if (!company.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/marketing/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          contactName: contactName.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          segmentId: segmentId || null,
          qualified: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to save")
      toast.success(`Added ${company.trim()}`)
      setCompany("")
      setContactName("")
      setEmail("")
      setWebsite("")
      revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        description="Who a variant can go to. Suppression is checked before every send and before anything is queued."
      >
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {showAdd ? "Hide form" : "Add prospect"}
        </Button>
      </PageHeader>

      {showAdd && (
        <section className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
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
              className="h-9 w-full rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
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
        </section>
      )}

      <ProspectList prospects={prospects} segments={segments} onChanged={revalidate} />
    </div>
  )
}
