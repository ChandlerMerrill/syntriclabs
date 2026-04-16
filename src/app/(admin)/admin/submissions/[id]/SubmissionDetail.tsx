"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Mail, Phone, Building2, Clock, MessageSquare, UserPlus } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useSubmission } from "@/hooks/admin/useSubmission"
import type { Submission } from "@/lib/types"

const statusColors: Record<string, string> = {
  unread: "bg-yellow-500/10 text-yellow-400",
  read: "bg-blue-500/10 text-blue-400",
  replied: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
}

export default function SubmissionDetail({ initialSubmission }: { initialSubmission: Submission }) {
  const router = useRouter()
  const { data, mutate } = useSubmission(initialSubmission.id, { submission: initialSubmission })
  const submission = data?.submission ?? initialSubmission
  const [status, setStatus] = useState(submission.status)
  const [notes, setNotes] = useState(submission.notes ?? "")
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as typeof submission.status)
    const { error } = await supabase
      .from("submissions")
      .update({ status: newStatus })
      .eq("id", submission.id)

    if (error) {
      toast.error("Failed to update status")
      setStatus(submission.status)
    } else {
      toast.success(`Status updated to ${newStatus}`)
      mutate()
    }
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    const { error } = await supabase
      .from("submissions")
      .update({ notes })
      .eq("id", submission.id)

    if (error) {
      toast.error("Failed to save notes")
    } else {
      toast.success("Notes saved")
      mutate()
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/submissions"
          className="flex items-center gap-1.5 text-sm text-[#94A3B8] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/admin/clients/new?from_submission=${submission.id}`}>
            <Button variant="outline" size="sm" className="border-white/8 text-[#94A3B8] hover:text-white">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Convert to Client
            </Button>
          </Link>
          <a href={`mailto:${submission.email}`}>
            <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Reply
            </Button>
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{submission.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(submission.created_at)}
            </span>
            {submission.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {submission.company}
              </span>
            )}
          </div>
        </div>
        <Select value={status} onValueChange={(v) => v && handleStatusChange(v)}>
          <SelectTrigger className="w-32 border-white/8 bg-[#0B1120] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/8 bg-[#1E293B] text-white">
            {["unread", "read", "replied", "archived"].map((s) => (
              <SelectItem key={s} value={s}>
                <Badge className={statusColors[s]} variant="secondary">{s}</Badge>
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
          <InfoRow icon={Mail} label="Email" value={submission.email} href={`mailto:${submission.email}`} />
          {submission.phone && <InfoRow icon={Phone} label="Phone" value={submission.phone} href={`tel:${submission.phone}`} />}
          {submission.company && <InfoRow icon={Building2} label="Company" value={submission.company} />}
          {submission.preferred_contact && <InfoRow icon={MessageSquare} label="Preferred Contact" value={submission.preferred_contact} />}
        </CardContent>
      </Card>

      {/* Service & Improvements */}
      {(submission.service || submission.improvements?.length > 0) && (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardContent className="pt-5">
            <div className="space-y-3">
              {submission.service && (
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">Service Interested In</p>
                  <p className="mt-1 text-sm text-white">{submission.service}</p>
                </div>
              )}
              {submission.improvements?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">Areas to Improve</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {submission.improvements.map((area) => (
                      <Badge key={area} variant="secondary" className="bg-[#06B6D4]/10 text-[#06B6D4]">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#94A3B8]">Message</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
            {submission.message}
          </p>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#94A3B8]">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this submission..."
            rows={3}
            className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
          />
          <Button
            onClick={handleSaveNotes}
            disabled={saving}
            size="sm"
            className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
          >
            {saving ? "Saving..." : "Save Notes"}
          </Button>
        </CardContent>
      </Card>
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
