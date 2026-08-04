"use client"

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
import { motion } from "framer-motion"
import { AlertCircle, RotateCw, Send } from "lucide-react"
import WidgetMessage from "./WidgetMessage"
import SyntricMascot from "./SyntricMascot"

/** Auto-grow ceiling for the composer. Past this the textarea scrolls rather
 *  than pushing the transcript further off screen. */
const INPUT_MAX_HEIGHT = 120

function getQuickReplies(lastAssistantText: string, messages: UIMessage[]): string[] {
  const text = lastAssistantText.toLowerCase()

  // Don't show suggestions if the bot asked a direct question
  if (text.trim().endsWith("?")) return []

  // A form or a booking card is already the next step — don't compete with it
  const hasCard = messages.some((m) =>
    m.parts?.some(
      (p) => p.type === "tool-bookConsultation" || p.type === "tool-submitRequest"
    )
  )
  if (hasCard) return []

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
  pathname: string
  onConversationCreated: (id: string) => void
  onStreamingChange?: (streaming: boolean) => void
}

export default function ChatView({
  sessionId,
  conversationId,
  initialMessages,
  starters,
  pathname,
  onConversationCreated,
  onStreamingChange,
}: ChatViewProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const conversationIdRef = useRef(conversationId)
  const [activeConversationId, setActiveConversationId] = useState(conversationId)

  // Two things the transport can't do on its own. It patches the current
  // conversation id into every outgoing body — the transport's static `body` is
  // frozen at construction, so a conversation created mid-session would never
  // reach the server — and it reads the id the server assigns back off the
  // response header.
  const patchAndTrackConversation = useCallback<typeof globalThis.fetch>(
    async (input, init) => {
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
        setActiveConversationId(newConvId)
      }
      return response
    },
    [onConversationCreated]
  )

  // Built once, in a lazy initializer: `useChat` holds onto the transport it is
  // handed, so handing it a new one each render would restart the stream.
  //
  // The lint rule follows `patchAndTrackConversation` to the ref it reads and
  // calls that a render-time ref access. It isn't — the initializer only stores
  // the function, and the ref is read when a fetch actually runs.
  const [transport] = useState(
    // eslint-disable-next-line react-hooks/refs
    () =>
      new DefaultChatTransport({
        api: "/api/widget/chat",
        body: { sessionId, conversationId },
        fetch: patchAndTrackConversation,
      })
  )

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport,
    messages: initialMessages.length > 0 ? initialMessages : undefined,
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    onStreamingChange?.(isLoading)
  }, [isLoading, onStreamingChange])

  // Pin to the bottom on new content. Assigning scrollTop keeps the scroll
  // inside the transcript — scrollIntoView would drag the page behind the panel
  // on mobile, which is why the project bans it inside scroll containers.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isLoading])

  // Grow the composer to fit, up to a ceiling. Runs after layout so clearing
  // the field on submit snaps it back in the same frame rather than leaving a
  // three-line-tall empty box behind.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > INPUT_MAX_HEIGHT ? "auto" : "hidden"
  }, [input])

  const submit = useCallback(
    (text?: string) => {
      const msg = text ?? input.trim()
      if (!msg || isLoading) return
      sendMessage({ text: msg })
      setInput("")
    },
    [input, isLoading, sendMessage]
  )

  const lastMessage = messages[messages.length - 1]
  const quickReplies =
    !isLoading && !error && lastMessage?.role === "assistant"
      ? getQuickReplies(
          lastMessage.parts
            ?.filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("") ?? "",
          messages
        )
      : []

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 py-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-purple-500/30 via-indigo-500/20 to-cyan-500/30 blur-xl" />
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-800 to-slate-950 shadow-md shadow-black/20 ring-1 ring-white/10">
                  <SyntricMascot size={64} />
                </div>
              </div>
              <div className="text-center">
                <p className="font-[family-name:var(--font-rajdhani)] text-lg font-semibold tracking-wide text-slate-800">
                  Ask us anything
                </p>
                <p className="mt-0.5 max-w-[15rem] text-xs leading-relaxed text-slate-500">
                  What we build, what it costs, whether it&apos;s worth it for a
                  business your size.
                </p>
              </div>
            </motion.div>

            <div className="flex w-full flex-col items-center gap-2">
              {starters.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => submit(s)}
                  className="group/starter flex w-full max-w-[270px] items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 shadow-sm shadow-black/[0.02] transition-all duration-200 hover:-translate-y-px hover:border-[#6366F1]/40 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/60 hover:text-[#4F46E5] hover:shadow-md hover:shadow-indigo-500/[0.08]"
                >
                  <span className="truncate">{s}</span>
                  <span className="text-[#6366F1]/40 transition-all duration-200 group-hover/starter:translate-x-0.5 group-hover/starter:text-[#6366F1]">
                    →
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <WidgetMessage
            key={m.id}
            message={m}
            isStreaming={isLoading && m === lastMessage}
            sessionId={sessionId}
            conversationId={activeConversationId}
            pathname={pathname}
          />
        ))}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 ml-9 flex max-w-[85%] items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-50/60 px-3.5 py-2.5"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-xs leading-relaxed text-slate-600">
                That didn&apos;t go through.
              </p>
              <button
                onClick={() => regenerate()}
                className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#4F46E5] hover:ring-[#6366F1]/40"
              >
                <RotateCw className="h-2.5 w-2.5" />
                Try again
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Replies */}
        {quickReplies.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5 pl-9">
            {quickReplies.map((reply, i) => (
              <motion.button
                key={reply}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                onClick={() => submit(reply)}
                className="rounded-full border border-[#6366F1]/25 bg-white px-3 py-1 text-xs text-[#6366F1] transition-all duration-200 hover:border-[#6366F1]/50 hover:bg-[#6366F1]/[0.06]"
              >
                {reply}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200/60 bg-white/60 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bg-transparent sm:pb-3">
        <div className="widget-input-border flex items-end gap-2 rounded-2xl px-3 py-2.5 transition-shadow duration-300 focus-within:shadow-md focus-within:shadow-indigo-500/[0.06] sm:rounded-xl">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Type your message…"
            aria-label="Message"
            className="widget-input-no-ring flex-1 resize-none self-center bg-transparent py-1 text-base leading-5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus-visible:outline-none sm:text-sm"
            style={{ maxHeight: `${INPUT_MAX_HEIGHT}px` }}
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
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
