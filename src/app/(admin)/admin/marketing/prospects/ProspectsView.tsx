"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import PageHeader from "@/components/admin/shared/PageHeader"
import ProspectList from "@/components/admin/marketing/ProspectList"
import { Plus, ClipboardPaste, Sparkles } from "lucide-react"
import type { MarketingProspect } from "@/lib/marketing/types"

interface Props {
  initialProspects: MarketingProspect[]
  segments: { id: string; name: string; slug: string }[]
}

interface ImportReport {
  imported: number
  companies: string[]
  skipped: { company: string; email: string; reason: string }[]
  errors: { line: number; reason: string }[]
  mapping: Record<string, string>
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

  const [showImport, setShowImport] = useState(false)
  const [paste, setPaste] = useState("")
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [qualifying, setQualifying] = useState(false)

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

  async function runImport() {
    if (!paste.trim()) return
    setImporting(true)
    setImportReport(null)
    try {
      const res = await fetch("/api/admin/marketing/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: paste, segmentId: segmentId || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Import failed")

      setImportReport(json)
      if (json.imported > 0) {
        setPaste("")
        toast.success(`Imported ${json.imported} prospect${json.imported === 1 ? "" : "s"}`)
      } else {
        toast.warning("Nothing imported — see the report below")
      }
      revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  async function qualify() {
    if (!segmentId) return
    setQualifying(true)
    try {
      const res = await fetch("/api/admin/marketing/prospects/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Qualification failed")

      if (json.assessed === 0) toast.info("Nothing unreviewed in this segment")
      else {
        toast.success(
          `${json.assessed} assessed — ${json.qualified} qualified, ` +
            `${json.notQualified} not, ${json.unclear} still unclear`
        )
      }
      revalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Qualification failed")
    } finally {
      setQualifying(false)
    }
  }

  const unreviewed = prospects.filter(
    (p) => p.qualified === null && !p.suppressed_at && (!segmentId || p.segment_id === segmentId)
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        description="Who a variant can go to. Suppression is checked before every send and before anything is queued."
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowImport((v) => !v)}
          className="border-white/8 text-[#94A3B8]"
        >
          <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
          {showImport ? "Hide import" : "Import list"}
        </Button>
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {showAdd ? "Hide form" : "Add prospect"}
        </Button>
      </PageHeader>

      {showImport && (
        <section className="rounded-xl border border-white/8 bg-[#0B1120] p-5">
          <h2 className="text-sm font-medium text-white">Import a list</h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Paste CSV or straight from a spreadsheet. A header row is required, and it must
            contain a company and an email column — <code className="text-[#94A3B8]">Business</code>,{" "}
            <code className="text-[#94A3B8]">Contact Name</code>,{" "}
            <code className="text-[#94A3B8]">Website</code> and friends are all recognised.
            Rows already on file are skipped, never overwritten.
          </p>

          <Textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={"company,contact name,email,website,location\nRedrock Trail Co,Dana Whitmore,dana@redrock.example,redrock.example,Moab UT"}
            className="mt-4 border-white/8 bg-[#0B1120] font-mono text-xs text-white placeholder:text-[#94A3B8]/40"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="h-9 rounded-lg border border-white/8 bg-[#0B1120] px-3 text-sm text-white"
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
              onClick={runImport}
              disabled={importing || !paste.trim()}
              className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
            >
              {importing ? "Importing…" : "Import"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={qualify}
              disabled={qualifying || !segmentId || unreviewed === 0}
              className="border-white/8 text-[#94A3B8]"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {qualifying ? "Qualifying…" : `Qualify ${unreviewed} unreviewed`}
            </Button>
          </div>

          <p className="mt-3 text-xs text-[#94A3B8]/60">
            Imported rows land unreviewed. Qualifying reads them against the segment&rsquo;s
            qualifiers and disqualifiers and writes a reason — a row it cannot judge stays
            unreviewed rather than guessing.
          </p>

          {importReport && (
            <div className="mt-4 space-y-2 rounded-lg border border-white/8 bg-black/20 p-3 text-xs">
              <p className="text-white">
                {importReport.imported} imported
                {importReport.skipped.length > 0 && `, ${importReport.skipped.length} skipped`}
                {importReport.errors.length > 0 &&
                  `, ${importReport.errors.length} row${importReport.errors.length === 1 ? "" : "s"} unreadable`}
              </p>
              {Object.keys(importReport.mapping).length > 0 && (
                <p className="text-[#94A3B8]/60">
                  Columns read:{" "}
                  {Object.entries(importReport.mapping)
                    .map(([field, header]) => `${header} → ${field}`)
                    .join(" · ")}
                </p>
              )}
              {importReport.errors.map((e, i) => (
                <p key={`e${i}`} className="text-amber-400/80">
                  Line {e.line}: {e.reason}
                </p>
              ))}
              {importReport.skipped.map((s, i) => (
                <p key={`s${i}`} className="text-[#94A3B8]">
                  {s.company} — {s.reason}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

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
