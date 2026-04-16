"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import TagInput from "@/components/admin/shared/TagInput"
import { CLIENT_STATUSES, CLIENT_SOURCES, INDUSTRIES } from "@/lib/constants"
import type { ClientWithContacts, ClientContactInput } from "@/lib/types"
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react"

interface ClientFormProps {
  client?: ClientWithContacts
  defaultValues?: {
    company_name?: string
    contacts?: Partial<ClientContactInput>[]
    created_from_submission?: string
  }
}

interface ContactFormData {
  name: string
  email: string
  phone: string
  role: string
  is_primary: boolean
}

export default function ClientForm({ client, defaultValues }: ClientFormProps) {
  const router = useRouter()
  const isEditing = !!client
  const [saving, setSaving] = useState(false)
  const [showAddress, setShowAddress] = useState(
    !!(client?.address_street || client?.address_city)
  )

  const [form, setForm] = useState({
    company_name: client?.company_name ?? defaultValues?.company_name ?? "",
    industry: client?.industry ?? "",
    website: client?.website ?? "",
    status: client?.status ?? "prospect",
    source: client?.source ?? "other",
    tags: client?.tags ?? [],
    notes: client?.notes ?? "",
    address_street: client?.address_street ?? "",
    address_city: client?.address_city ?? "",
    address_state: client?.address_state ?? "",
    address_zip: client?.address_zip ?? "",
    created_from_submission: client?.created_from_submission ?? defaultValues?.created_from_submission ?? null,
  })

  const [contacts, setContacts] = useState<ContactFormData[]>(
    client?.client_contacts?.map((c) => ({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      role: c.role ?? "",
      is_primary: c.is_primary,
    })) ??
    defaultValues?.contacts?.map((c) => ({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      role: c.role ?? "",
      is_primary: c.is_primary ?? false,
    })) ?? []
  )

  const addContact = () => {
    setContacts([...contacts, { name: "", email: "", phone: "", role: "", is_primary: contacts.length === 0 }])
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: keyof ContactFormData, value: string | boolean) => {
    setContacts(contacts.map((c, i) => {
      if (i !== index) return field === "is_primary" && value === true ? { ...c, is_primary: false } : c
      return { ...c, [field]: value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) {
      toast.error("Company name is required")
      return
    }
    setSaving(true)

    const supabase = createClient()

    const clientData = {
      company_name: form.company_name.trim(),
      industry: form.industry || null,
      website: form.website.trim() || null,
      status: form.status,
      source: form.source,
      tags: form.tags,
      notes: form.notes,
      address_street: form.address_street.trim() || null,
      address_city: form.address_city.trim() || null,
      address_state: form.address_state.trim() || null,
      address_zip: form.address_zip.trim() || null,
      created_from_submission: form.created_from_submission,
    }

    if (isEditing) {
      const { error } = await supabase.from("clients").update(clientData).eq("id", client.id)
      if (error) {
        toast.error("Failed to update client")
        setSaving(false)
        return
      }

      // Delete existing contacts and re-insert
      await supabase.from("client_contacts").delete().eq("client_id", client.id)
      if (contacts.length > 0) {
        await supabase.from("client_contacts").insert(
          contacts.filter((c) => c.name.trim()).map((c) => ({
            client_id: client.id,
            name: c.name.trim(),
            email: c.email.trim() || null,
            phone: c.phone.trim() || null,
            role: c.role.trim() || null,
            is_primary: c.is_primary,
          }))
        )
      }

      toast.success("Client updated")
      router.push(`/admin/clients/${client.id}`)
    } else {
      const { data, error } = await supabase.from("clients").insert(clientData).select().single()
      if (error || !data) {
        toast.error("Failed to create client")
        setSaving(false)
        return
      }

      if (contacts.length > 0) {
        await supabase.from("client_contacts").insert(
          contacts.filter((c) => c.name.trim()).map((c) => ({
            client_id: data.id,
            name: c.name.trim(),
            email: c.email.trim() || null,
            phone: c.phone.trim() || null,
            role: c.role.trim() || null,
            is_primary: c.is_primary,
          }))
        )
      }

      // Auto-create activity
      await supabase.from("activities").insert({
        client_id: data.id,
        type: "status_change",
        title: `Client "${data.company_name}" created`,
        description: form.created_from_submission ? "Converted from contact form submission" : "",
        is_auto_generated: true,
      })

      toast.success("Client created")
      router.push(`/admin/clients/${data.id}`)
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {/* Basic Info */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Company Name *</Label>
            <Input
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              required
              className="border-white/8 bg-[#0B1120] text-white"
              placeholder="Acme Inc."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Industry</Label>
              <Select value={form.industry} onValueChange={(v) => v && setForm({ ...form, industry: v })}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="border-white/8 bg-[#0B1120] text-white"
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Status</Label>
              <Select value={form.status} onValueChange={(v) => v && setForm({ ...form, status: v })}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Source</Label>
              <Select value={form.source} onValueChange={(v) => v && setForm({ ...form, source: v })}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {CLIENT_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Tags</Label>
            <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} placeholder="Add tags..." />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
              placeholder="Internal notes..."
            />
          </div>

          {/* Collapsible address */}
          <button
            type="button"
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center gap-1 text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showAddress ? "rotate-180" : ""}`} />
            Address
          </button>
          {showAddress && (
            <div className="space-y-3 pl-5">
              <Input
                value={form.address_street}
                onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                className="border-white/8 bg-[#0B1120] text-white"
                placeholder="Street address"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={form.address_city}
                  onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                  className="border-white/8 bg-[#0B1120] text-white"
                  placeholder="City"
                />
                <Input
                  value={form.address_state}
                  onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                  className="border-white/8 bg-[#0B1120] text-white"
                  placeholder="State"
                />
                <Input
                  value={form.address_zip}
                  onChange={(e) => setForm({ ...form, address_zip: e.target.value })}
                  className="border-white/8 bg-[#0B1120] text-white"
                  placeholder="ZIP"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base text-white">Contacts</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={addContact} className="text-[#60A5FA] hover:text-[#3B82F6]">
            <Plus className="mr-1 h-4 w-4" /> Add Contact
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contacts.length === 0 && (
            <p className="text-sm text-[#94A3B8]">No contacts yet. Click &quot;Add Contact&quot; to add one.</p>
          )}
          {contacts.map((contact, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-white/8 bg-[#0B1120] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                    <input
                      type="radio"
                      checked={contact.is_primary}
                      onChange={() => updateContact(i, "is_primary", true)}
                      className="accent-[#2563EB]"
                    />
                    Primary
                  </label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContact(i)}
                  className="h-7 w-7 text-[#94A3B8] hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={contact.name}
                  onChange={(e) => updateContact(i, "name", e.target.value)}
                  placeholder="Name"
                  className="border-white/8 bg-[#1E293B] text-white"
                />
                <Input
                  value={contact.email}
                  onChange={(e) => updateContact(i, "email", e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="border-white/8 bg-[#1E293B] text-white"
                />
                <Input
                  value={contact.phone}
                  onChange={(e) => updateContact(i, "phone", e.target.value)}
                  placeholder="Phone"
                  className="border-white/8 bg-[#1E293B] text-white"
                />
                <Input
                  value={contact.role}
                  onChange={(e) => updateContact(i, "role", e.target.value)}
                  placeholder="Role"
                  className="border-white/8 bg-[#1E293B] text-white"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-[#94A3B8]">
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Client"}
        </Button>
      </div>
    </form>
  )
}
