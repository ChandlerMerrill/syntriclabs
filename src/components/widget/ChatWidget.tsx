"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, ArrowLeft } from "lucide-react"
import type { UIMessage } from "ai"
import SyntricMascot from "./SyntricMascot"
import ChatView from "./ChatView"
import ChatHistory from "./ChatHistory"

function getStarters(pathname: string) {
  if (pathname?.startsWith("/services")) {
    return [
      "What AI services do you offer?",
      "How can AI help my business?",
      "Tell me about your workshops",
    ]
  }
  if (pathname?.startsWith("/contact")) {
    return [
      "I'd like to book a consultation",
      "How do I get started?",
      "What's your availability?",
    ]
  }
  return [
    "Tell me about Syntric's services",
    "Help me book a consultation",
    "Tell me about your workshops",
  ]
}

function getSessionId() {
  if (typeof window === "undefined") return ""
  const stored = localStorage.getItem("syntric-widget-session")
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem("syntric-widget-session", id)
  return id
}

function getStoredConversationId() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("syntric-widget-conversation")
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
  const [sessionId] = useState(getSessionId)
  const [conversationId, setConversationId] = useState<string | null>(getStoredConversationId)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [showGreeting, setShowGreeting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [view, setView] = useState<"chat" | "history">(() =>
    getStoredConversationId() ? "history" : "chat"
  )
  const [chatKey, setChatKey] = useState(0)
  const pathname = usePathname()
  const starters = getStarters(pathname)

  const handleConversationCreated = useCallback((id: string) => {
    setConversationId(id)
    setStoredConversationId(id)
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

  // Proactive greeting — once per session
  useEffect(() => {
    if (open) return
    if (typeof window === "undefined") return
    if (sessionStorage.getItem("syntric-greeting-shown")) return

    const timer = setTimeout(() => {
      setShowGreeting(true)
      sessionStorage.setItem("syntric-greeting-shown", "1")
      setTimeout(() => setShowGreeting(false), 3000)
    }, 4000)

    return () => clearTimeout(timer)
  }, [open])

  return (
    <>
      {/* Greeting Tooltip */}
      <AnimatePresence>
        {showGreeting && !open && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-8 right-[5.5rem] z-50 rounded-full bg-[#0F172A] px-3.5 py-1.5 text-xs font-medium text-white shadow-lg border border-white/[0.08]"
          >
            Hi! Need help?
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={
              showGreeting
                ? { scale: [1, 1.15, 1], opacity: 1, transition: { duration: 0.5, ease: "easeInOut" } }
                : { scale: 1, opacity: 1 }
            }
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            className="widget-bubble-pulse fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] via-[#6366F1] to-[#4F46E5] shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/35"
            aria-label="Open chat"
          >
            <SyntricMascot size={28} variant="light" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border border-slate-200/40 bg-[#F8FAFC] shadow-2xl shadow-black/15 ring-1 ring-black/[0.03] backdrop-blur-sm transition-shadow duration-500 sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px] sm:rounded-2xl ${isStreaming ? "widget-streaming" : ""}`}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between bg-gradient-to-r from-[#0F172A] to-[#1A1F3A] px-4 py-3.5 sm:rounded-t-2xl">
              {view === "chat" ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setView("history")}
                      className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Chat history"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="font-[family-name:var(--font-rajdhani)] text-sm font-semibold tracking-wide text-white">
                      Syntric Assistant
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleNewChat}
                      className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="New chat"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Close chat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <SyntricMascot size={24} />
                    <span className="font-[family-name:var(--font-rajdhani)] text-sm font-semibold tracking-wide text-white">
                      Chat History
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
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
                  {isLoading ? (
                    <MessageSkeleton />
                  ) : (
                    <ChatView
                      key={chatKey}
                      sessionId={sessionId}
                      conversationId={conversationId}
                      initialMessages={initialMessages}
                      starters={starters}
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
