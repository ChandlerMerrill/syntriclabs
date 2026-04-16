"use client"

import { useState, useMemo } from "react"
import type { EmailWithClient } from "@/lib/types"
import EmailThreadList from "./EmailThreadList"
import EmailThreadView from "./EmailThreadView"
import ComposeDialog from "./ComposeDialog"
import { Mail, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEmails } from "@/hooks/admin/useEmails"

interface EmailsInboxProps {
  initialEmails: EmailWithClient[]
}

export default function EmailsInbox({ initialEmails }: EmailsInboxProps) {
  const { emails } = useEmails(initialEmails)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [tab, setTab] = useState<"all" | "unlinked" | "sent">("all")
  const [composeOpen, setComposeOpen] = useState(false)

  // Group emails into threads
  const threads = useMemo(() => {
    const threadMap = new Map<string, EmailWithClient[]>()
    for (const email of emails) {
      const key = email.gmail_thread_id ?? email.id
      if (!threadMap.has(key)) threadMap.set(key, [])
      threadMap.get(key)!.push(email)
    }

    return Array.from(threadMap.entries()).map(([threadId, emails]) => {
      const sorted = emails.sort((a, b) => new Date(b.internal_date).getTime() - new Date(a.internal_date).getTime())
      const latest = sorted[0]
      return {
        threadId,
        subject: latest.subject ?? "(no subject)",
        snippet: latest.snippet ?? "",
        lastDate: latest.internal_date,
        messageCount: emails.length,
        client: latest.clients,
        direction: latest.direction,
        isRead: latest.is_read,
        fromName: latest.from_name ?? latest.from_address,
        fromAddress: latest.from_address,
      }
    })
  }, [emails])

  const filteredThreads = useMemo(() => {
    switch (tab) {
      case "unlinked":
        return threads.filter(t => !t.client)
      case "sent":
        return threads.filter(t => t.direction === "outbound")
      default:
        return threads
    }
  }, [threads, tab])

  // Auto-select first thread
  const activeThreadId = selectedThreadId ?? filteredThreads[0]?.threadId ?? null

  return (
    <>
      <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-lg border border-white/8">
        {/* Left panel — Thread list */}
        <div className="w-[360px] shrink-0 border-r border-white/8 bg-[#0B1120] flex flex-col">
          {/* Tabs + Compose */}
          <div className="flex items-center gap-1 border-b border-white/8 p-2">
            {(["all", "unlinked", "sent"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedThreadId(null) }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-white/10 text-white"
                    : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                }`}
              >
                {t === "all" ? "All" : t === "unlinked" ? "Unlinked" : "Sent"}
              </button>
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setComposeOpen(true)}
              className="h-7 w-7 p-0 text-[#94A3B8] hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Thread items */}
          <EmailThreadList
            threads={filteredThreads}
            selectedId={activeThreadId}
            onSelect={setSelectedThreadId}
          />
        </div>

        {/* Right panel — Thread view */}
        <div className="flex flex-1 flex-col bg-[#0F172A]">
          {activeThreadId ? (
            <EmailThreadView threadId={activeThreadId} onCompose={() => setComposeOpen(true)} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Mail className="mx-auto h-10 w-10 text-[#94A3B8]/40" />
                <p className="mt-4 text-sm text-[#94A3B8]">
                  {threads.length === 0 ? "No emails synced yet. Connect Gmail in Settings." : "Select an email thread"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </>
  )
}
