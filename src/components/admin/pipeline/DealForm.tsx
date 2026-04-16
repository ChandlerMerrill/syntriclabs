"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import CurrencyInput from "@/components/admin/shared/CurrencyInput"
import { PIPELINE_STAGES } from "@/lib/constants"
import type { Deal, DealStage, Client, Project } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface DealFormProps {
  deal?: Deal
}

export default function DealForm({ deal }: DealFormProps) {
  const router = useRouter()
  const isEditing = !!deal
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Pick<Client, 'id' | 'company_name'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name' | 'client_id'>[]>([])

  const [form, setForm] = useState({
    client_id: deal?.client_id ?? "",
    project_id: deal?.project_id ?? "",
    title: deal?.title ?? "",
    stage: deal?.stage ?? "lead",
    value: deal?.value ?? 0,
    probability: deal?.probability ?? 10,
    expected_close_date: deal?.expected_close_date ?? "",
    lost_reason: deal?.lost_reason ?? "",
    notes: deal?.notes ?? "",
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from("clients").select("id, company_name").order("company_name").then(({ data }) => {
      if (data) setClients(data)
    })
    supabase.from("projects").select("id, name, client_id").order("name").then(({ data }) => {
      if (data) setProjects(data)
    })
  }, [])

  const filteredProjects = form.client_id
    ? projects.filter((p) => p.client_id === form.client_id)
    : projects

  const handleStageChange = (stage: DealStage) => {
    const stageConfig = PIPELINE_STAGES.find((s) => s.value === stage)
    setForm({
      ...form,
      stage,
      probability: stageConfig?.defaultProbability ?? form.probability,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.client_id) {
      toast.error("Title and client are required")
      return
    }
    setSaving(true)

    const supabase = createClient()
    const payload = {
      ...form,
      title: form.title.trim(),
      project_id: form.project_id || null,
      expected_close_date: form.expected_close_date || null,
      lost_reason: form.lost_reason.trim() || null,
    }

    if (isEditing) {
      const { error } = await supabase.from("deals").update(payload).eq("id", deal.id)
      if (error) { toast.error("Failed to update deal"); setSaving(false); return }
      toast.success("Deal updated")
    } else {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...payload,
          stage_history: [{ from: "", to: form.stage, timestamp: new Date().toISOString() }],
        })
        .select()
        .single()

      if (error || !data) { toast.error("Failed to create deal"); setSaving(false); return }

      await supabase.from("activities").insert({
        client_id: form.client_id,
        deal_id: data.id,
        type: "status_change",
        title: `Deal "${data.title}" created`,
        is_auto_generated: true,
      })

      toast.success("Deal created")
    }

    router.push("/admin/pipeline")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Deal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="border-white/8 bg-[#0B1120] text-white"
              placeholder="Website redesign proposal"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => v && setForm({ ...form, client_id: v, project_id: "" })}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Project (optional)</Label>
              <Select value={form.project_id} onValueChange={(v) => v && setForm({ ...form, project_id: v })}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  <SelectItem value="">None</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => v && handleStageChange(v as DealStage)}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Value</Label>
              <CurrencyInput value={form.value} onChange={(v) => setForm({ ...form, value: v ?? 0 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Probability (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 0 })}
                className="border-white/8 bg-[#0B1120] text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Expected Close Date</Label>
            <Input
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
              className="border-white/8 bg-[#0B1120] text-white"
            />
          </div>
          {(form.stage === "lost" || deal?.stage === "lost") && (
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Lost Reason</Label>
              <Textarea
                value={form.lost_reason}
                onChange={(e) => setForm({ ...form, lost_reason: e.target.value })}
                rows={2}
                className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-[#94A3B8]">Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Deal"}
        </Button>
      </div>
    </form>
  )
}
