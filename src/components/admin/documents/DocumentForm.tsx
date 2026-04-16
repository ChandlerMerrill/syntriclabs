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
import { DOCUMENT_TYPES } from "@/lib/constants"
import type { Client, ClientContact } from "@/lib/types"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface DocumentFormProps {
  defaultClientId?: string
  defaultDealId?: string
  defaultType?: string
}

export default function DocumentForm({ defaultClientId, defaultDealId, defaultType }: DocumentFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<(Pick<Client, 'id' | 'company_name'> & { client_contacts?: ClientContact[] })[]>([])

  const [type, setType] = useState(defaultType ?? "proposal")
  const [clientId, setClientId] = useState(defaultClientId ?? "")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")

  // Proposal fields
  const [projectName, setProjectName] = useState("")
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [scopeItems, setScopeItems] = useState<{ title: string; description: string }[]>([
    { title: "", description: "" },
  ])
  const [timeline, setTimeline] = useState<{ phase: string; duration: string; description: string }[]>([
    { phase: "", duration: "", description: "" },
  ])
  const [pricing, setPricing] = useState<{ item: string; description: string; hours: number; rate: number }[]>([
    { item: "", description: "", hours: 0, rate: 0 },
  ])
  const [terms, setTerms] = useState<string[]>([""])
  const [validUntil, setValidUntil] = useState("")

  // Price sheet fields
  const [lineItems, setLineItems] = useState<{ service: string; description: string; hours: number; rate: number }[]>([
    { service: "", description: "", hours: 0, rate: 0 },
  ])
  const [discount, setDiscount] = useState<number>(0)
  const [priceSheetNotes, setPriceSheetNotes] = useState("")

  // Contract fields
  const [clientContactName, setClientContactName] = useState("")
  const [clientContactEmail, setClientContactEmail] = useState("")
  const [scope, setScope] = useState("")
  const [deliverables, setDeliverables] = useState<string[]>([""])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [totalValue, setTotalValue] = useState<number>(0)
  const [ipClause, setIpClause] = useState("")
  const [terminationClause, setTerminationClause] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("clients").select("id, company_name, client_contacts(*)").order("company_name").then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  // Auto-fill primary contact when client changes
  useEffect(() => {
    if (!clientId) return
    const client = clients.find((c) => c.id === clientId)
    if (!client?.client_contacts?.length) return
    const primary = client.client_contacts.find((c) => c.is_primary) ?? client.client_contacts[0]
    if (primary && type === "contract") {
      setClientContactName(primary.name)
      setClientContactEmail(primary.email ?? "")
    }
  }, [clientId, clients, type])

  const getClientName = () => clients.find((c) => c.id === clientId)?.company_name ?? ""

  const buildContentData = (): Record<string, unknown> => {
    const clientName = getClientName()

    if (type === "proposal") {
      return {
        clientName,
        projectName,
        executiveSummary,
        scopeItems: scopeItems.filter((s) => s.title.trim()),
        timeline: timeline.filter((t) => t.phase.trim()),
        pricing: pricing.filter((p) => p.item.trim()),
        terms: terms.filter((t) => t.trim()),
        validUntil: validUntil || undefined,
      }
    }

    if (type === "price_sheet") {
      return {
        clientName,
        projectName: projectName || undefined,
        lineItems: lineItems.filter((l) => l.service.trim()),
        discount: discount || undefined,
        notes: priceSheetNotes || undefined,
        validUntil: validUntil || undefined,
      }
    }

    if (type === "contract") {
      return {
        clientName,
        clientContactName,
        clientContactEmail: clientContactEmail || undefined,
        projectName,
        scope,
        deliverables: deliverables.filter((d) => d.trim()),
        startDate,
        endDate,
        paymentTerms,
        totalValue: totalValue * 100, // convert dollars to cents
        ipClause: ipClause || undefined,
        terminationClause: terminationClause || undefined,
      }
    }

    // counter_proposal uses same as proposal
    return {
      clientName,
      projectName,
      executiveSummary,
      scopeItems: scopeItems.filter((s) => s.title.trim()),
      timeline: timeline.filter((t) => t.phase.trim()),
      pricing: pricing.filter((p) => p.item.trim()),
      terms: terms.filter((t) => t.trim()),
      validUntil: validUntil || undefined,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !clientId) {
      toast.error("Title and client are required")
      return
    }
    setSaving(true)

    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          client_id: clientId,
          deal_id: defaultDealId || null,
          content_data: buildContentData(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate document")

      toast.success("Document generated")
      router.push(`/admin/documents/${data.document.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate document")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {/* Document Info */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Document Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Type *</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="border-white/8 bg-[#0B1120] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Client *</Label>
              <Select value={clientId} onValueChange={(v) => v && setClientId(v)}>
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
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border-white/8 bg-[#0B1120] text-white"
              placeholder="Website Redesign Proposal"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
              placeholder="Internal notes..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Content — Proposal / Counter-Proposal */}
      {(type === "proposal" || type === "counter_proposal") && (
        <>
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">Proposal Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="border-white/8 bg-[#0B1120] text-white"
                  placeholder="Website Redesign"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Executive Summary</Label>
                <Textarea
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  rows={3}
                  className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="border-white/8 bg-[#0B1120] text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Scope Items */}
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Scope Items</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setScopeItems([...scopeItems, { title: "", description: "" }])} className="text-[#60A5FA]">
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {scopeItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-white/8 bg-[#0B1120] p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.title}
                      onChange={(e) => setScopeItems(scopeItems.map((s, idx) => idx === i ? { ...s, title: e.target.value } : s))}
                      placeholder="Title"
                      className="border-white/8 bg-[#0B1120] text-white"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setScopeItems(scopeItems.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={item.description}
                    onChange={(e) => setScopeItems(scopeItems.map((s, idx) => idx === i ? { ...s, description: e.target.value } : s))}
                    placeholder="Description"
                    rows={2}
                    className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                  />
                </div>
              ))}
              {scopeItems.length === 0 && <p className="text-sm text-[#94A3B8]">No scope items added.</p>}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Timeline</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTimeline([...timeline, { phase: "", duration: "", description: "" }])} className="text-[#60A5FA]">
                <Plus className="mr-1 h-4 w-4" /> Add Phase
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.map((item, i) => (
                <div key={i} className="rounded-lg border border-white/8 bg-[#0B1120] p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.phase}
                      onChange={(e) => setTimeline(timeline.map((t, idx) => idx === i ? { ...t, phase: e.target.value } : t))}
                      placeholder="Phase name"
                      className="flex-1 border-white/8 bg-[#0B1120] text-white"
                    />
                    <Input
                      value={item.duration}
                      onChange={(e) => setTimeline(timeline.map((t, idx) => idx === i ? { ...t, duration: e.target.value } : t))}
                      placeholder="Duration (e.g. 2 weeks)"
                      className="w-40 border-white/8 bg-[#0B1120] text-white"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setTimeline(timeline.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={item.description}
                    onChange={(e) => setTimeline(timeline.map((t, idx) => idx === i ? { ...t, description: e.target.value } : t))}
                    placeholder="Description"
                    rows={2}
                    className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                  />
                </div>
              ))}
              {timeline.length === 0 && <p className="text-sm text-[#94A3B8]">No timeline phases added.</p>}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Pricing</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPricing([...pricing, { item: "", description: "", hours: 0, rate: 0 }])} className="text-[#60A5FA]">
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {pricing.map((item, i) => (
                <div key={i} className="rounded-lg border border-white/8 bg-[#0B1120] p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.item}
                      onChange={(e) => setPricing(pricing.map((p, idx) => idx === i ? { ...p, item: e.target.value } : p))}
                      placeholder="Item name"
                      className="flex-1 border-white/8 bg-[#0B1120] text-white"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPricing(pricing.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.description}
                    onChange={(e) => setPricing(pricing.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p))}
                    placeholder="Description"
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                  <div className="flex gap-2">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-[#94A3B8]">Hours</Label>
                      <Input
                        type="number"
                        value={item.hours || ""}
                        onChange={(e) => setPricing(pricing.map((p, idx) => idx === i ? { ...p, hours: Number(e.target.value) } : p))}
                        className="border-white/8 bg-[#0B1120] text-white"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-[#94A3B8]">Rate ($/hr)</Label>
                      <Input
                        type="number"
                        value={item.rate || ""}
                        onChange={(e) => setPricing(pricing.map((p, idx) => idx === i ? { ...p, rate: Number(e.target.value) } : p))}
                        className="border-white/8 bg-[#0B1120] text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {pricing.length === 0 && <p className="text-sm text-[#94A3B8]">No pricing items added.</p>}
            </CardContent>
          </Card>

          {/* Terms */}
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Terms</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTerms([...terms, ""])} className="text-[#60A5FA]">
                <Plus className="mr-1 h-4 w-4" /> Add Term
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {terms.map((term, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={term}
                    onChange={(e) => setTerms(terms.map((t, idx) => idx === i ? e.target.value : t))}
                    placeholder="e.g. 50% deposit required"
                    className="flex-1 border-white/8 bg-[#0B1120] text-white"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setTerms(terms.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {terms.length === 0 && <p className="text-sm text-[#94A3B8]">No terms added.</p>}
            </CardContent>
          </Card>
        </>
      )}

      {/* Content — Price Sheet */}
      {type === "price_sheet" && (
        <>
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">Price Sheet Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="border-white/8 bg-[#0B1120] text-white"
                  placeholder="Optional project name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Discount (%)</Label>
                  <Input
                    type="number"
                    value={discount || ""}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Valid Until</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Notes</Label>
                <Textarea
                  value={priceSheetNotes}
                  onChange={(e) => setPriceSheetNotes(e.target.value)}
                  rows={2}
                  className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Line Items</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLineItems([...lineItems, { service: "", description: "", hours: 0, rate: 0 }])} className="text-[#60A5FA]">
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-white/8 bg-[#0B1120] p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.service}
                      onChange={(e) => setLineItems(lineItems.map((l, idx) => idx === i ? { ...l, service: e.target.value } : l))}
                      placeholder="Service name"
                      className="flex-1 border-white/8 bg-[#0B1120] text-white"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.description}
                    onChange={(e) => setLineItems(lineItems.map((l, idx) => idx === i ? { ...l, description: e.target.value } : l))}
                    placeholder="Description"
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                  <div className="flex gap-2">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-[#94A3B8]">Hours</Label>
                      <Input
                        type="number"
                        value={item.hours || ""}
                        onChange={(e) => setLineItems(lineItems.map((l, idx) => idx === i ? { ...l, hours: Number(e.target.value) } : l))}
                        className="border-white/8 bg-[#0B1120] text-white"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-[#94A3B8]">Rate ($/hr)</Label>
                      <Input
                        type="number"
                        value={item.rate || ""}
                        onChange={(e) => setLineItems(lineItems.map((l, idx) => idx === i ? { ...l, rate: Number(e.target.value) } : l))}
                        className="border-white/8 bg-[#0B1120] text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {lineItems.length === 0 && <p className="text-sm text-[#94A3B8]">No line items added.</p>}
            </CardContent>
          </Card>
        </>
      )}

      {/* Content — Contract */}
      {type === "contract" && (
        <>
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">Contract Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Client Contact Name</Label>
                  <Input
                    value={clientContactName}
                    onChange={(e) => setClientContactName(e.target.value)}
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Client Contact Email</Label>
                  <Input
                    type="email"
                    value={clientContactEmail}
                    onChange={(e) => setClientContactEmail(e.target.value)}
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="border-white/8 bg-[#0B1120] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Scope of Work</Label>
                <Textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={3}
                  className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-white/8 bg-[#0B1120] text-white"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Total Value ($)</Label>
                  <Input
                    type="number"
                    value={totalValue || ""}
                    onChange={(e) => setTotalValue(Number(e.target.value))}
                    className="border-white/8 bg-[#0B1120] text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Payment Terms</Label>
                <Textarea
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  rows={2}
                  className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                  placeholder="e.g. 50% upfront, 50% on delivery"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">IP Clause</Label>
                <Textarea
                  value={ipClause}
                  onChange={(e) => setIpClause(e.target.value)}
                  rows={2}
                  className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Termination Clause</Label>
                <Textarea
                  value={terminationClause}
                  onChange={(e) => setTerminationClause(e.target.value)}
                  rows={2}
                  className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Deliverables */}
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Deliverables</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDeliverables([...deliverables, ""])} className="text-[#60A5FA]">
                <Plus className="mr-1 h-4 w-4" /> Add Deliverable
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliverables.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={d}
                    onChange={(e) => setDeliverables(deliverables.map((v, idx) => idx === i ? e.target.value : v))}
                    placeholder="e.g. Responsive website with 10 pages"
                    className="flex-1 border-white/8 bg-[#0B1120] text-white"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDeliverables(deliverables.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {deliverables.length === 0 && <p className="text-sm text-[#94A3B8]">No deliverables added.</p>}
            </CardContent>
          </Card>
        </>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-[#94A3B8]">Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Document
        </Button>
      </div>
    </form>
  )
}
