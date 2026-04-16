"use client"

import { useEffect, useState } from "react"
import type { Conversation } from "@/lib/types"
import ConversationList from "./ConversationList"
import MessageThread from "./MessageThread"
import { MessageCircle } from "lucide-react"
import { useConversations } from "@/hooks/admin/useConversations"
import { createClient } from "@/lib/supabase/client"

interface MessagesInboxProps {
  initialConversations: Conversation[]
}

export default function MessagesInbox({ initialConversations }: MessagesInboxProps) {
  const { conversations, mutate } = useConversations({ archived: false }, initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  )

  // Realtime conversation updates — invalidate SWR cache on any change
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          mutate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mutate])

  return (
    <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-lg border border-white/8">
      {/* Left panel — Conversation list */}
      <div className="w-[320px] shrink-0 border-r border-white/8 bg-[#0B1120]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Right panel — Message thread */}
      <div className="flex flex-1 flex-col bg-[#0F172A]">
        {selectedId ? (
          <MessageThread conversationId={selectedId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-[#94A3B8]/40" />
              <p className="mt-4 text-sm text-[#94A3B8]">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
