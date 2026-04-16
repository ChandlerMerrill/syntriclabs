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
import TagInput from "@/components/admin/shared/TagInput"
import CurrencyInput from "@/components/admin/shared/CurrencyInput"
import { PROJECT_STATUSES } from "@/lib/constants"
import type { Project, Client } from "@/lib/types"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface ProjectFormProps {
  project?: Project
  defaultClientId?: string
}

export default function ProjectForm({ project, defaultClientId }: ProjectFormProps) {
  const router = useRouter()
  const isEditing = !!project
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Pick<Client, 'id' | 'company_name'>[]>([])

  const [form, setForm] = useState({
    client_id: project?.client_id ?? defaultClientId ?? "",
    name: project?.name ?? "",
    description: project?.description ?? "",
    scope: project?.scope ?? "",
    status: project?.status ?? "planning",
    tech_stack: project?.tech_stack ?? [],
    budget_min: project?.budget_min ?? null,
    budget_max: project?.budget_max ?? null,
    start_date: project?.start_date ?? "",
    target_end_date: project?.target_end_date ?? "",
    links: project?.links ?? [],
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from("clients").select("id, company_name").order("company_name").then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  const addLink = () => setForm({ ...form, links: [...form.links, { label: "", url: "" }] })
  const removeLink = (i: number) => setForm({ ...form, links: form.links.filter((_, idx) => idx !== i) })
  const updateLink = (i: number, field: 'label' | 'url', value: string) => {
    setForm({ ...form, links: form.links.map((l, idx) => idx === i ? { ...l, [field]: value } : l) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.client_id) {
      toast.error("Name and client are required")
      return
    }
    setSaving(true)

    const supabase = createClient()
    const payload = {
      ...form,
      name: form.name.trim(),
      start_date: form.start_date || null,
      target_end_date: form.target_end_date || null,
      links: form.links.filter((l) => l.url.trim()),
    }

    if (isEditing) {
      const { error } = await supabase.from("projects").update(payload).eq("id", project.id)
      if (error) { toast.error("Failed to update project"); setSaving(false); return }
      toast.success("Project updated")
      router.push(`/admin/projects/${project.id}`)
    } else {
      const { data, error } = await supabase.from("projects").insert(payload).select().single()
      if (error || !data) { toast.error("Failed to create project"); setSaving(false); return }

      await supabase.from("activities").insert({
        client_id: form.client_id,
        project_id: data.id,
        type: "status_change",
        title: `Project "${data.name}" created`,
        is_auto_generated: true,
      })

      toast.success("Project created")
      router.push(`/admin/projects/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Project Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="border-white/8 bg-[#0B1120] text-white"
              placeholder="Website Redesign"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => v && setForm({ ...form, client_id: v })}>
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
              <Label className="text-[#94A3B8]">Status</Label>
              <Select value={form.status} onValueChange={(v) => v && setForm({ ...form, status: v })}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Scope</Label>
            <Textarea
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              rows={2}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Tech Stack</Label>
            <TagInput value={form.tech_stack} onChange={(v) => setForm({ ...form, tech_stack: v })} placeholder="Next.js, Supabase..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Budget Min</Label>
              <CurrencyInput value={form.budget_min} onChange={(v) => setForm({ ...form, budget_min: v })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Budget Max</Label>
              <CurrencyInput value={form.budget_max} onChange={(v) => setForm({ ...form, budget_max: v })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="border-white/8 bg-[#0B1120] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Target End Date</Label>
              <Input
                type="date"
                value={form.target_end_date}
                onChange={(e) => setForm({ ...form, target_end_date: e.target.value })}
                className="border-white/8 bg-[#0B1120] text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base text-white">Links</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={addLink} className="text-[#60A5FA]">
            <Plus className="mr-1 h-4 w-4" /> Add Link
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(i, 'label', e.target.value)}
                placeholder="Label"
                className="w-1/3 border-white/8 bg-[#0B1120] text-white"
              />
              <Input
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                placeholder="https://..."
                className="flex-1 border-white/8 bg-[#0B1120] text-white"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(i)} className="text-[#94A3B8] hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {form.links.length === 0 && <p className="text-sm text-[#94A3B8]">No links added.</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-[#94A3B8]">Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Project"}
        </Button>
      </div>
    </form>
  )
}
