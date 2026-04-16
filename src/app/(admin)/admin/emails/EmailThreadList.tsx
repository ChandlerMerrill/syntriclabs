"use client"

import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface ThreadItem {
  threadId: string
  subject: string
  snippet: string
  lastDate: string
  messageCount: number
  client: { id: string; company_name: string } | null
  direction: string
  isRead: boolean
  fromName: string
  fromAddress: string
}

interface EmailThreadListProps {
  threads: ThreadItem[]
  selectedId: string | null
  onSelect: (threadId: string) => void
}

export default function EmailThreadList({ threads, selectedId, onSelect }: EmailThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-[#94A3B8]">No emails in this view</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread) => (
        <button
          key={thread.threadId}
          onClick={() => onSelect(thread.threadId)}
          className={cn(
            "w-full border-b border-white/5 px-4 py-3 text-left transition-colors",
            selectedId === thread.threadId
              ? "bg-white/10"
              : "hover:bg-white/5",
            !thread.isRead && "border-l-2 border-l-blue-500"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={cn(
              "text-sm truncate",
              !thread.isRead ? "font-semibold text-white" : "text-white/90"
            )}>
              {thread.direction === "outbound" ? `To: ${thread.fromName}` : thread.fromName}
            </span>
            <span className="shrink-0 text-xs text-[#94A3B8]">
              {formatRelativeTime(thread.lastDate)}
            </span>
          </div>
          <p className={cn(
            "mt-0.5 text-sm truncate",
            !thread.isRead ? "font-medium text-white/80" : "text-[#94A3B8]"
          )}>
            {thread.subject}
          </p>
          <p className="mt-0.5 text-xs text-[#94A3B8]/70 truncate">
            {thread.snippet}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {thread.client && (
              <Badge variant="secondary" className="bg-[#334155] text-white text-[10px] px-1.5 py-0">
                {thread.client.company_name}
              </Badge>
            )}
            {thread.messageCount > 1 && (
              <span className="text-[10px] text-[#94A3B8]">{thread.messageCount} messages</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
