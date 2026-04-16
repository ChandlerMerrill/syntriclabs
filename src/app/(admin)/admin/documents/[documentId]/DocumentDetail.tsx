"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import ConfirmDialog from "@/components/admin/shared/ConfirmDialog"
import {
  ArrowLeft, Download, Send, Trash2, Building2, Calendar, FileText, Hash,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { DOCUMENT_STATUSES, DOCUMENT_TYPE_COLORS } from "@/lib/constants"
import type { DocumentWithClient } from "@/lib/types"

export default function DocumentDetail({ document: doc }: { document: DocumentWithClient }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(doc.status)

  const handleStatusChange = async (newStatus: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("documents")
      .update({ status: newStatus })
      .eq("id", doc.id)

    if (error) {
      toast.error("Failed to update status")
    } else {
      setStatus(newStatus as typeof doc.status)
      toast.success(`Status updated to ${newStatus}`)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    const supabase = createClient()

    // Delete storage file if exists
    if (doc.storage_path) {
      await supabase.storage.from("documents").remove([doc.storage_path])
    }

    const { error } = await supabase.from("documents").delete().eq("id", doc.id)
    if (error) {
      toast.error("Failed to delete document")
    } else {
      toast.success("Document deleted")
      router.push("/admin/documents")
      router.refresh()
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/documents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send")
      toast.success(`Document sent to ${data.sentTo}`)
      setStatus("sent")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send document")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/documents" className="mb-2 flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Documents
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{doc.title}</h1>
            <Badge variant="secondary" className={DOCUMENT_TYPE_COLORS[doc.type]}>
              {doc.type.replace("_", " ")}
            </Badge>
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => v && handleStatusChange(v)}>
            <SelectTrigger className="w-32 border-white/8 bg-[#0B1120] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/8 bg-[#1E293B] text-white">
              {DOCUMENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a href={`/api/documents/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-white/8 text-[#94A3B8] hover:text-white">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSend}
            disabled={sending}
            className="border-white/8 text-[#94A3B8] hover:text-white"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> {sending ? "Sending..." : "Send to Client"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-[#94A3B8] hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* PDF Preview */}
        <div className="md:col-span-2">
          <iframe
            src={`/api/documents/${doc.id}/pdf`}
            className="w-full h-[600px] rounded-lg border border-white/8"
          />
        </div>

        {/* Info Card */}
        <Card className="border-white/8 bg-[#1E293B] h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#94A3B8]">Document Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {doc.clients && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#94A3B8]" />
                <Link href={`/admin/clients/${doc.clients.id}`} className="text-[#60A5FA] hover:underline">
                  {doc.clients.company_name}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <FileText className="h-4 w-4" />
              <span className="capitalize">{doc.type.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Hash className="h-4 w-4" />
              <span>Version {doc.version}</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(doc.created_at)}</span>
            </div>
            {doc.notes && (
              <div className="pt-2 border-t border-white/8">
                <p className="text-xs font-medium text-[#94A3B8] mb-1">Notes</p>
                <p className="text-white whitespace-pre-wrap">{doc.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete document"
        description={`This will permanently delete "${doc.title}" and its PDF file.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  )
}
