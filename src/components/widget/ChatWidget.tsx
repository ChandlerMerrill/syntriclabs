"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { X, MessageSquarePlus, History, ArrowLeft } from "lucide-react"
import type { UIMessage } from "ai"
import { randomUUID } from "@/lib/utils"
import SyntricMascot from "./SyntricMascot"
import ChatView from "./ChatView"
import ChatHistory from "./ChatHistory"

function getStarters(pathname: string) {
  if (pathname?.startsWith("/services")) {
    return [
      "What could you build for my business?",
      "Do you train teams, or just build?",
      "How do the chat and voice agents work?",
    ]
  }
  if (pathname?.startsWith("/contact")) {
    return [
      "I'd like to book a discovery call",
      "What happens on the first call?",
      "Send a message to Chandler",
    ]
  }
  if (pathname?.startsWith("/about")) {
    return [
      "Who is Chandler?",
      "Why one person and not an agency?",
      "What have you actually built?",
    ]
  }
  return [
    "What does something like this cost?",
    "What have you actually built?",
    "Is this worth it for a business my size?",
  ]
}

function getSessionId() {
  const stored = localStorage.getItem("syntric-widget-session")
  if (stored) return stored
  const id = randomUUID()
  localStorage.setItem("syntric-widget-session", id)
  return id
}

function setStoredConversationId(id: string | null) {
  if (typeof window === "undefined") return
  if (id) {
    localStorage.setItem("syntric-widget-conversation", id)
  } else {
    localStorage.removeItem("syntric-widget-conversation")
  }
}

function toUIMessages(
  msgs: { id: string; role: string; content: string; created_at: string }[]
): UIMessage[] {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    parts: [{ type: "text" as const, text: m.content }],
    createdAt: new Date(m.created_at),
  }))
}

function MessageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6">
      {/* User message - right aligned */}
      <div className="flex justify-end">
        <div className="h-8 w-[65%] animate-pulse rounded-2xl rounded-br-md bg-indigo-100" />
      </div>
      {/* Assistant message - left aligned with avatar */}
      <div className="flex items-start gap-2">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-[90%] animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-[70%] animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      {/* User message - right aligned */}
      <div className="flex justify-end">
        <div className="h-8 w-[45%] animate-pulse rounded-2xl rounded-br-md bg-indigo-100" />
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  // Everything below is read from storage after mount, not during render: the
  // server has no localStorage, so seeding state from it directly makes the
  // first client render disagree with the HTML it's hydrating.
  const [sessionId, setSessionId] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [showGreeting, setShowGreeting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [view, setView] = useState<"chat" | "history">("chat")
  const [chatKey, setChatKey] = useState(0)
  const pathname = usePathname()
  const starters = getStarters(pathname)
  const reduceMotion = useReducedMotion()

  // Whether this visitor has past conversations. Prefetched on mount so the
  // first open can land on the right view without a loading flash.
  const hasHistoryRef = useRef(false)

  useEffect(() => {
    setSessionId(getSessionId())
    setConversationId(localStorage.getItem("syntric-widget-conversation"))
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    fetch(`/api/widget/conversations?sessionId=${sessionId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) hasHistoryRef.current = Array.isArray(data) && data.length > 0
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const handleConversationCreated = useCallback((id: string) => {
    setConversationId(id)
    setStoredConversationId(id)
    hasHistoryRef.current = true
  }, [])

  const handleStreamingChange = useCallback((s: boolean) => setIsStreaming(s), [])

  const handleNewChat = useCallback(() => {
    setConversationId(null)
    setStoredConversationId(null)
    setInitialMessages([])
    setChatKey((k) => k + 1)
    setView("chat")
  }, [])

  const handleConversationDeleted = useCallback(
    (id: string) => {
      // If the deleted conversation is the active one, reset to new chat
      if (id === conversationId) {
        setConversationId(null)
        setStoredConversationId(null)
        setInitialMessages([])
      }
    },
    [conversationId]
  )

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setIsLoading(true)
      setView("chat")
      try {
        const res = await fetch(
          `/api/widget/conversations/${id}/messages?sessionId=${sessionId}`
        )
        if (!res.ok) {
          // Conversation deleted — fall back to new chat
          setConversationId(null)
          setStoredConversationId(null)
          setInitialMessages([])
          return
        }
        const msgs = await res.json()
        setConversationId(id)
        setStoredConversationId(id)
        setInitialMessages(msgs.length > 0 ? toUIMessages(msgs) : [])
        setChatKey((k) => k + 1)
      } catch {
        setConversationId(null)
        setStoredConversationId(null)
        setInitialMessages([])
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId]
  )

  // Where the panel lands depends on what the visitor already has going. A
  // returning visitor with saved chats gets the list; a first-timer gets the
  // starter chips rather than an empty history screen.
  const openWidget = useCallback(() => {
    setShowGreeting(false)
    setView(conversationId || hasHistoryRef.current ? "history" : "chat")
    setOpen(true)
  }, [conversationId])

  // Esc closes. The body lock is mobile-only: the panel is a full-height sheet
  // there and the page behind it would otherwise scroll under the fingers.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    const isMobile = window.matchMedia("(max-width: 639px)").matches
    const previousOverflow = document.body.style.overflow
    if (isMobile) document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      if (isMobile) document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Proactive greeting — once per session
  useEffect(() => {
    if (open) return
    if (typeof window === "undefined") return
    if (sessionStorage.getItem("syntric-greeting-shown")) return

    const timer = setTimeout(() => {
      setShowGreeting(true)
      sessionStorage.setItem("syntric-greeting-shown", "1")
      setTimeout(() => setShowGreeting(false), 4500)
    }, 4000)

    return () => clearTimeout(timer)
  }, [open])

  const springIn = reduceMotion
    ? { duration: 0.2 }
    : { type: "spring" as const, stiffness: 260, damping: 20 }

  return (
    <>
      {/* Greeting Tooltip */}
      <AnimatePresence>
        {showGreeting && !open && (
          <motion.button
            initial={{ opacity: 0, x: 8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={openWidget}
            className="fixed bottom-8 right-[5.5rem] z-50 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0F172A] px-3.5 py-1.5 text-xs font-medium text-white shadow-lg transition-transform hover:-translate-y-px"
          >
            Questions? Ask away
            <span aria-hidden className="text-[#818CF8]">
              →
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bubble */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={
              showGreeting && !reduceMotion
                ? {
                    scale: [1, 1.15, 1],
                    opacity: 1,
                    transition: { duration: 0.5, ease: "easeInOut" },
                  }
                : { scale: 1, opacity: 1 }
            }
            exit={{ scale: 0, opacity: 0 }}
            transition={springIn}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={openWidget}
            className="widget-bubble-pulse fixed bottom-6 right-6 z-50 flex h-[65px] w-[65px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7C3AED] via-[#6366F1] to-[#4F46E5] p-2.5 shadow-[0_10px_32px_-6px_rgba(99,102,241,0.55),0_4px_12px_-2px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-200 hover:shadow-[0_14px_40px_-6px_rgba(99,102,241,0.65),0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            aria-label="Open chat"
          >
            <SyntricMascot size={65} variant="light" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop — mobile only */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] sm:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Chat with Syntric"
            initial={{ opacity: 0, y: 40, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.985 }}
            transition={reduceMotion ? { duration: 0.15 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-0 left-0 right-0 z-50 flex h-[88dvh] max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#F8FAFC] shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:bottom-6 sm:left-auto sm:right-6 sm:h-[560px] sm:max-h-none sm:w-[390px] sm:rounded-2xl sm:border sm:border-slate-200/40 sm:shadow-2xl sm:shadow-black/15 sm:ring-black/[0.03] ${isStreaming ? "widget-streaming" : ""}`}
          >
            {/* Header */}
            <div className="relative flex items-center gap-2.5 bg-gradient-to-r from-[#0F172A] to-[#1A1F3A] px-4 py-3 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-purple-400/40 after:to-cyan-400/30">
              {view === "history" ? (
                <button
                  onClick={() => setView("chat")}
                  className="-ml-1 rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 sm:p-1.5"
                  aria-label="Back to chat"
                >
                  <ArrowLeft className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                </button>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-600 to-slate-800 shadow-sm shadow-black/20 ring-1 ring-white/10">
                  <SyntricMascot size={36} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-[family-name:var(--font-rajdhani)] text-base font-semibold leading-tight tracking-wide text-white">
                  {view === "history" ? "Past chats" : "Syntric"}
                </p>
                {view === "chat" && (
                  <p className="mt-px flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#94A3B8]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Usually replies instantly
                  </p>
                )}
              </div>

              {view === "chat" && (
                <>
                  <button
                    onClick={handleNewChat}
                    title="New chat"
                    className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 sm:p-1.5"
                    aria-label="New chat"
                  >
                    <MessageSquarePlus className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => setView("history")}
                    title="Past chats"
                    className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 sm:p-1.5"
                    aria-label="Past chats"
                  >
                    <History className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 sm:p-1.5"
                aria-label="Close chat"
              >
                <X className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
              </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait" initial={false}>
              {view === "chat" ? (
                <motion.div
                  key="chat"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex flex-1 flex-col overflow-hidden"
                >
                  {isLoading || !sessionId ? (
                    <MessageSkeleton />
                  ) : (
                    <ChatView
                      key={chatKey}
                      sessionId={sessionId}
                      conversationId={conversationId}
                      initialMessages={initialMessages}
                      starters={starters}
                      pathname={pathname}
                      onConversationCreated={handleConversationCreated}
                      onStreamingChange={handleStreamingChange}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex flex-1 flex-col overflow-hidden"
                >
                  <ChatHistory
                    sessionId={sessionId}
                    currentConversationId={conversationId}
                    onSelectConversation={handleSelectConversation}
                    onConversationDeleted={handleConversationDeleted}
                    onNewChat={handleNewChat}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
