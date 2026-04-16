"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, User, ChevronDown, ChevronRight, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { Message } from "@/lib/types"

interface MessageThreadProps {
  conversationId: string
}

export default function MessageThread({ conversationId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load messages
  useEffect(() => {
    setLoading(true)
    const supabase = createClient()

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        setLoading(false)
      })

    // Mark as read
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .then(() => {})

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Mark new user messages as read immediately
          if (newMsg.role === "user") {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </div>
    )
  }

  // Group messages by date
  const groupedMessages = groupByDate(messages)

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-[#94A3B8]">No messages in this conversation</p>
        </div>
      ) : (
        groupedMessages.map(({ date, messages: dayMessages }) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#94A3B8]">{date}</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>
            <div className="space-y-4">
              {dayMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const time = new Date(message.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-[#2563EB]" : "bg-[#8B5CF6]"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className={cn("max-w-[75%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-[#2563EB] text-white"
              : "bg-[#1E293B] text-[#E2E8F0]"
          )}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="space-y-1">
            {message.tool_calls.map((tc, i) => (
              <ToolCallAccordion key={i} toolCall={tc} />
            ))}
          </div>
        )}

        <span className={cn("block text-[10px] text-[#94A3B8]", isUser && "text-right")}>
          {time}
        </span>
      </div>
    </div>
  )
}

function ToolCallAccordion({ toolCall }: { toolCall: { toolName: string; args: unknown; result?: unknown } }) {
  const [open, setOpen] = useState(false)

  const isDocGen = toolCall.toolName === "generateDocument"
  const docResult = isDocGen ? (toolCall.result as { document?: { id: string; title: string; type: string } } | undefined) : null

  return (
    <div className="rounded-md border border-white/8 bg-[#1E293B]/50 text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-[#94A3B8] hover:text-white transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {isDocGen && docResult?.document ? (
          <span className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Generated: {docResult.document.title}
          </span>
        ) : (
          <span>Used {toolCall.toolName}</span>
        )}
      </button>
      {open && (
        <div className="border-t border-white/5 px-2.5 py-2 space-y-1.5">
          <div>
            <span className="text-[#94A3B8]">Args: </span>
            <code className="text-[#E2E8F0]">{JSON.stringify(toolCall.args, null, 2)}</code>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <span className="text-[#94A3B8]">Result: </span>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-[#0B1120] p-2 text-[#E2E8F0]">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = []
  let currentDate = ""

  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }

  return groups
}
