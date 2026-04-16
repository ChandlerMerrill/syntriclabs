"use client"

import { MessageSquare, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/lib/types"

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatRelativeTime(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "now"
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function channelIcon(channel: string) {
  if (channel === "telegram") return <Send className="h-3.5 w-3.5" />
  return <MessageSquare className="h-3.5 w-3.5" />
}

function channelLabel(channel: string) {
  if (channel === "telegram") return "Telegram"
  return "Admin Chat"
}

export default function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 px-4 py-3">
        <h2 className="text-sm font-medium text-white">Conversations</h2>
        <p className="text-xs text-[#94A3B8]">{conversations.length} total</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquare className="h-8 w-8 text-[#94A3B8]/40" />
            <p className="mt-3 text-sm text-[#94A3B8]">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors",
                selectedId === conv.id
                  ? "bg-white/10"
                  : "hover:bg-white/5"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  conv.channel === "telegram" ? "bg-[#2AABEE]/20 text-[#2AABEE]" : "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                )}
              >
                {channelIcon(conv.channel)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">
                    {conv.title || channelLabel(conv.channel)}
                  </span>
                  <span className="ml-2 shrink-0 text-[10px] text-[#94A3B8]">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#94A3B8] truncate">
                  {channelLabel(conv.channel)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
