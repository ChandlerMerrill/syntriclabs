"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
import { Send } from "lucide-react"
import WidgetMessage from "./WidgetMessage"
import SyntricMascot from "./SyntricMascot"

function getQuickReplies(lastAssistantText: string, messages: UIMessage[]): string[] {
  const text = lastAssistantText.toLowerCase()

  // Don't show suggestions if the bot asked a direct question
  if (text.trim().endsWith("?")) return []

  // After booking card was shown, no suggestions needed
  const hasBookingCard = messages.some((m) =>
    m.parts?.some((p) => p.type === "tool-bookConsultation")
  )
  if (hasBookingCard) return []

  // After lead capture, offer next steps
  const hasLeadCapture = messages.some((m) =>
    m.parts?.some(
      (p) =>
        p.type === "tool-captureLeadInfo" &&
        "state" in p &&
        (p as { state: string }).state === "output-available"
    )
  )
  if (hasLeadCapture) return ["What happens next?", "Book a discovery call"]

  // Service-related responses
  if (
    text.includes("service") ||
    text.includes("build") ||
    text.includes("develop") ||
    text.includes("custom")
  ) {
    return ["Book a discovery call", "What's your process?"]
  }

  // Process-related
  if (text.includes("process") || text.includes("discovery") || text.includes("step")) {
    return ["Book a discovery call", "What does it cost?"]
  }

  // General/intro responses
  if (messages.length <= 2) {
    return ["Tell me more", "Book a discovery call"]
  }

  return []
}

interface ChatViewProps {
  sessionId: string
  conversationId: string | null
  initialMessages: UIMessage[]
  starters: string[]
  onConversationCreated: (id: string) => void
  onStreamingChange?: (streaming: boolean) => void
}

export default function ChatView({
  sessionId,
  conversationId,
  initialMessages,
  starters,
  onConversationCreated,
  onStreamingChange,
}: ChatViewProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationIdRef = useRef(conversationId)

  // Custom fetch wrapper that:
  // 1. Injects the current conversationId into the request body (the transport's
  //    static `body` option is frozen at mount time, so we patch it here)
  // 2. Captures the X-Conversation-Id header from responses
  const wrappedFetch = useRef<typeof globalThis.fetch>(async (input, init) => {
    if (init?.body && typeof init.body === "string") {
      try {
        const parsed = JSON.parse(init.body)
        parsed.conversationId = conversationIdRef.current
        init = { ...init, body: JSON.stringify(parsed) }
      } catch {
        // not JSON — send as-is
      }
    }
    const response = await globalThis.fetch(input, init)
    const newConvId = response.headers.get("x-conversation-id")
    if (newConvId && newConvId !== conversationIdRef.current) {
      conversationIdRef.current = newConvId
      onConversationCreated(newConvId)
    }
    return response
  })

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/widget/chat",
      body: { sessionId, conversationId },
      fetch: wrappedFetch.current,
    })
  )

  const { messages, sendMessage, status } = useChat({
    transport: transport.current,
    messages: initialMessages.length > 0 ? initialMessages : undefined,
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    onStreamingChange?.(isLoading)
  }, [isLoading, onStreamingChange])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const submit = (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || isLoading) return
    sendMessage({ text: msg })
    setInput("")
  }

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-purple-500/30 via-indigo-500/20 to-cyan-500/30 blur-xl" />
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-800 to-slate-950 ring-1 ring-white/10 shadow-md shadow-black/20">
                  <SyntricMascot size={64} />
                </div>
              </div>
              <p className="text-center text-sm font-medium text-slate-600">
                Hi! How can I help you learn about Syntric?
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="group/starter flex w-full max-w-[260px] items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-left text-xs font-medium text-slate-600 shadow-sm shadow-black/[0.02] transition-all duration-200 hover:-translate-y-px hover:border-[#6366F1]/40 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/60 hover:text-[#4F46E5] hover:shadow-md hover:shadow-indigo-500/[0.08]"
                >
                  <span className="truncate">{s}</span>
                  <span className="text-[#6366F1]/40 transition-all duration-200 group-hover/starter:translate-x-0.5 group-hover/starter:text-[#6366F1]">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <WidgetMessage
            key={m.id}
            message={m}
            isStreaming={isLoading && m === messages[messages.length - 1]}
          />
        ))}

        {/* Quick Replies */}
        {!isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "assistant" &&
          (() => {
            const lastMsg = messages[messages.length - 1]
            const lastText =
              lastMsg.parts
                ?.filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("") ?? ""
            const replies = getQuickReplies(lastText, messages)
            if (replies.length === 0) return null
            return (
              <div className="mb-3 flex flex-wrap gap-1.5 pl-7">
                {replies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => submit(reply)}
                    className="rounded-full border border-[#6366F1]/25 bg-white px-3 py-1 text-xs text-[#6366F1] transition-all duration-200 hover:border-[#6366F1]/50 hover:bg-[#6366F1]/[0.06]"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )
          })()}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200/60 bg-white/60 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bg-transparent sm:pb-3">
        <div className="widget-input-border flex items-center gap-2 rounded-2xl px-3 py-3 transition-shadow duration-300 focus-within:shadow-md focus-within:shadow-indigo-500/[0.06] sm:rounded-xl sm:py-2.5">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px"
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
                const ta = e.target as HTMLTextAreaElement
                ta.style.height = "auto"
              }
            }}
            placeholder="Type your message..."
            className="widget-input-no-ring flex-1 resize-none bg-transparent text-base leading-5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus-visible:outline-none sm:text-sm"
            disabled={isLoading}
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || isLoading}
            className={`shrink-0 rounded-lg p-2 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:p-1.5 ${
              input.trim() && !isLoading
                ? "bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 hover:brightness-110"
                : "text-slate-400"
            }`}
          >
            <Send className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </>
  )
}
