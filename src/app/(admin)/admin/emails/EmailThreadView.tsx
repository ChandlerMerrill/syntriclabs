"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Reply, Forward, Link2, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react"
import { formatDate, formatRelativeTime } from "@/lib/utils"
import type { EmailWithClient } from "@/lib/types"

interface EmailThreadViewProps {
  threadId: string
  onCompose: () => void
}

export default function EmailThreadView({ threadId, onCompose }: EmailThreadViewProps) {
  const [emails, setEmails] = useState<EmailWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([])
  const [linking, setLinking] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>("")

  useEffect(() => {
    loadThread()
  }, [threadId])

  async function loadThread() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("emails")
      .select("*, clients(id, company_name)")
      .eq("gmail_thread_id", threadId)
      .order("internal_date", { ascending: true })
    setEmails((data ?? []) as EmailWithClient[])
    setLoading(false)
  }

  async function loadClients() {
    const supabase = createClient()
    const { data } = await supabase
      .from("clients")
      .select("id, company_name")
      .order("company_name")
    setClients(data ?? [])
  }

  async function handleLink() {
    if (!selectedClientId) return
    setLinking(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("emails")
        .update({ client_id: selectedClientId })
        .eq("gmail_thread_id", threadId)
      if (error) throw error
      toast.success("Thread linked to client")
      loadThread()
    } catch {
      toast.error("Failed to link thread")
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#94A3B8]" />
      </div>
    )
  }

  const isUnlinked = emails.length > 0 && !emails[0].client_id

  return (
    <div className="flex flex-1 flex-col">
      {/* Thread header */}
      <div className="border-b border-white/8 p-4">
        <h2 className="text-lg font-medium text-white">
          {emails[0]?.subject ?? "(no subject)"}
        </h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-[#94A3B8]">
          <span>{emails.length} message{emails.length !== 1 ? "s" : ""}</span>
          {emails[0]?.clients && (
            <Badge variant="secondary" className="bg-[#334155] text-white text-xs">
              {emails[0].clients.company_name}
            </Badge>
          )}
        </div>

        {/* Link to client UI for unlinked threads */}
        {isUnlinked && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <Link2 className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm text-amber-400">Unlinked thread</span>
            <Select
              value={selectedClientId}
              onValueChange={(val) => setSelectedClientId(val ?? "")}
              onOpenChange={(open) => { if (open && clients.length === 0) loadClients() }}
            >
              <SelectTrigger className="h-8 w-[200px] border-white/8 bg-[#0B1120] text-sm text-white">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleLink}
              disabled={!selectedClientId || linking}
              className="h-8 bg-amber-600 text-white hover:bg-amber-500"
            >
              {linking ? "Linking..." : "Link"}
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {emails.map((email) => (
          <div key={email.id} className="rounded-lg border border-white/8 bg-[#1E293B]">
            <div className="flex items-start justify-between border-b border-white/5 p-4">
              <div>
                <div className="flex items-center gap-2">
                  {email.direction === "outbound" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className="text-sm font-medium text-white">
                    {email.from_name || email.from_address}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    &lt;{email.from_address}&gt;
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[#94A3B8]">
                  To: {email.to_addresses?.map((a: { address: string; name: string }) => a.name || a.address).join(", ")}
                  {email.cc_addresses && email.cc_addresses.length > 0 && (
                    <> | Cc: {email.cc_addresses.map((a: { address: string; name: string }) => a.name || a.address).join(", ")}</>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-[#94A3B8]" title={formatDate(email.internal_date)}>
                {formatRelativeTime(email.internal_date)}
              </span>
            </div>
            <div className="p-4">
              {email.body_text ? (
                <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans leading-relaxed">
                  {email.body_text}
                </pre>
              ) : email.body_html ? (
                <div className="text-sm text-white/90">
                  <p className="text-xs text-[#94A3B8] italic mb-2">HTML email — showing plain text fallback</p>
                  <p>{email.snippet}</p>
                </div>
              ) : (
                <p className="text-sm text-[#94A3B8] italic">No content</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-white/8 p-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="border-white/8 text-[#94A3B8] hover:text-white" onClick={onCompose}>
          <Reply className="mr-1.5 h-3.5 w-3.5" /> Reply
        </Button>
        <Button size="sm" variant="outline" className="border-white/8 text-[#94A3B8] hover:text-white" onClick={onCompose}>
          <Forward className="mr-1.5 h-3.5 w-3.5" /> Forward
        </Button>
      </div>
    </div>
  )
}
