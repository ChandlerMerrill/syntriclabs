"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Clock,
  MessageSquare,
  UserPlus,
  Briefcase,
  AlertTriangle,
  Loader2,
  Bot,
  User,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { LEAD_STATUS_COLORS, ESCALATION_STATUS_COLORS } from "@/lib/constants"
import type { WidgetLeadWithEscalations, LeadStatus } from "@/lib/types"

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'dismissed']

interface LeadDetailProps {
  lead: WidgetLeadWithEscalations
  messages: { role: string; content: string; created_at: string }[]
}

export default function LeadDetail({ lead, messages }: LeadDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [converting, setConverting] = useState(false)

  const supabase = createClient()

  const handleStatusChange = async (newStatus: string) => {
    const prev = status
    setStatus(newStatus as LeadStatus)
    const { error } = await supabase
      .from("widget_leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", lead.id)

    if (error) {
      toast.error("Failed to update status")
      setStatus(prev)
    } else {
      toast.success(`Status updated to ${newStatus}`)
    }
  }

  const handleConvert = async () => {
    setConverting(true)
    try {
      const res = await fetch("/api/admin/leads/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to convert")
      toast.success("Lead converted to client!")
      router.push(`/admin/clients/${data.client.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert")
      setConverting(false)
    }
  }

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown Lead"

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/leads"
          className="flex items-center gap-1.5 text-sm text-[#94A3B8] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>
        {status !== "converted" && (
          <Button
            onClick={handleConvert}
            disabled={converting}
            size="sm"
            className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
          >
            {converting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {converting ? "Converting..." : "Convert to Client"}
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{fullName}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(lead.created_at)}
            </span>
            {lead.organization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {lead.organization}
              </span>
            )}
          </div>
        </div>
        <Select value={status} onValueChange={(v) => v && handleStatusChange(v)}>
          <SelectTrigger className="w-32 border-white/8 bg-[#0B1120] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/8 bg-[#1E293B] text-white">
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <Badge className={LEAD_STATUS_COLORS[s]} variant="secondary">{s}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact Info */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#94A3B8]">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {lead.email && (
            <InfoRow icon={Mail} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
          )}
          {lead.phone && (
            <InfoRow icon={Phone} label="Phone" value={lead.phone} href={`tel:${lead.phone}`} />
          )}
          {lead.preferred_contact && (
            <InfoRow icon={MessageSquare} label="Preferred Contact" value={lead.preferred_contact} />
          )}
          {lead.role && (
            <InfoRow icon={Briefcase} label="Role" value={lead.role} />
          )}
          {lead.organization && (
            <InfoRow icon={Building2} label="Organization" value={lead.organization} />
          )}
          {lead.business_type && (
            <InfoRow icon={Building2} label="Business Type" value={lead.business_type} />
          )}
        </CardContent>
      </Card>

      {/* Interest */}
      {(lead.service_interest || lead.request) && (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#94A3B8]">Interest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.service_interest && (
              <div>
                <p className="text-xs font-medium text-[#94A3B8]">Service Interest</p>
                <p className="mt-1 text-sm text-white">{lead.service_interest}</p>
              </div>
            )}
            {lead.request && (
              <div>
                <p className="text-xs font-medium text-[#94A3B8]">Request</p>
                <p className="mt-1 text-sm text-white">{lead.request}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {lead.summary && (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#94A3B8]">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
              {lead.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#94A3B8]">Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {msg.role !== "user" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#8B5CF6] text-white"
                          : "bg-[#0F172A] text-[#E2E8F0]"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB]">
                        <User className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escalations */}
      {lead.widget_escalations?.length > 0 && (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#94A3B8]">Escalations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.widget_escalations.map((esc) => (
              <div key={esc.id} className="flex items-start gap-3 rounded-lg border border-white/8 bg-[#0F172A] p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{esc.reason}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {esc.preferred_method && (
                      <span className="text-xs text-[#94A3B8]">Via {esc.preferred_method}</span>
                    )}
                    <Badge className={ESCALATION_STATUS_COLORS[esc.status] ?? ""} variant="secondary">
                      {esc.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-[#94A3B8]">{formatDate(esc.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#94A3B8]" />
      <div>
        <p className="text-xs text-[#94A3B8]">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="transition-colors hover:opacity-80">
        {content}
      </a>
    )
  }

  return content
}
