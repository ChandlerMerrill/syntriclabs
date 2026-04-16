"use client"

import { useState, useEffect } from "react"
import { Clock, X, Plus, Sparkles } from "lucide-react"
import { isYesterday, format, differenceInMinutes, differenceInHours } from "date-fns"

interface Conversation {
  id: string
  title: string
  preview: string | null
  lastMessageAt: string
}

interface ChatHistoryProps {
  sessionId: string
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onConversationDeleted: (id: string) => void
  onNewChat: () => void
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const mins = differenceInMinutes(now, date)
  if (mins < 1) return "Just now"
  const hours = differenceInHours(now, date)
  if (hours < 1) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d")
}

export default function ChatHistory({
  sessionId,
  currentConversationId,
  onSelectConversation,
  onConversationDeleted,
  onNewChat,
}: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [error, setError] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setError(false)
    setConversations(null)
    fetch(`/api/widget/conversations?sessionId=${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data) => setConversations(data))
      .catch(() => setError(true))
  }, [sessionId, fetchKey])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/widget/conversations/${id}?sessionId=${sessionId}`,
        { method: "DELETE" }
      )
      if (res.ok || res.status === 404) {
        setConversations((prev) => prev?.filter((c) => c.id !== id) ?? null)
        onConversationDeleted(id)
      }
    } catch {
      // Silently fail — conversation stays in list
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-slate-500">Couldn&apos;t load history</p>
        <button
          onClick={() => setFetchKey((k) => k + 1)}
          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
        >
          Try again
        </button>
      </div>
    )
  }

  // Loading skeleton
  if (conversations === null) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start justify-between px-3 py-3">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-[55%] animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-[80%] animate-pulse rounded bg-slate-200" />
            </div>
            <div className="ml-3 h-3 w-[48px] animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Clock className="h-5 w-5 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">No conversations yet</p>
          <p className="mt-1 text-xs text-slate-400">Start chatting to see your history here</p>
        </div>
        <button
          onClick={onNewChat}
          className="group/btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#4F46E5] px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.97]"
        >
          <Sparkles className="h-4 w-4 transition-transform duration-200 group-hover/btn:rotate-12" />
          Start a new chat
        </button>
      </div>
    )
  }

  // Conversation list
  return (
    <div className="relative flex-1 overflow-y-auto px-3 py-2">
      <button
        onClick={onNewChat}
        className="group/btn mb-1 flex w-full items-center gap-2.5 rounded-lg border border-dashed border-indigo-300/60 px-3 py-2.5 text-left transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] via-[#6366F1] to-[#4F46E5] shadow-sm shadow-indigo-500/20 transition-transform duration-200 group-hover/btn:scale-110">
          <Plus className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-medium text-indigo-600">New chat</span>
      </button>
      {conversations.map((conv) => {
        const isActive = conv.id === currentConversationId
        return (
          <div
            key={conv.id}
            className={`group flex w-full items-start rounded-lg transition-colors ${
              isActive
                ? "border border-indigo-200/50 bg-indigo-50"
                : "border border-transparent hover:bg-slate-100"
            }`}
          >
            <button
              onClick={() => onSelectConversation(conv.id)}
              className="flex min-w-0 flex-1 items-start justify-between px-3 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">
                  {conv.title || "New conversation"}
                </p>
                {conv.preview && (
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {conv.preview}
                  </p>
                )}
              </div>
              <span className="ml-3 shrink-0 text-[11px] text-slate-400">
                {relativeTime(conv.lastMessageAt)}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDeleteId(conv.id)
              }}
              className="mr-2 mt-3 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
              aria-label="Delete conversation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}

      {/* Delete confirmation overlay */}
      {confirmDeleteId && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
          <div className="mx-6 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-sm font-medium text-slate-700">Delete this conversation?</p>
            <p className="mt-1 text-xs text-slate-400">This can&apos;t be undone.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
