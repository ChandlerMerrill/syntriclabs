"use client"

import { useRef, useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { X, Send, Loader2 } from "lucide-react"
import ChatMessage from "./ChatMessage"

interface ChatContext {
  clientId?: string
  dealId?: string
  projectId?: string
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  context?: ChatContext
}

export default function ChatPanel({ open, onClose, context }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { context },
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const submit = (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || isLoading) return
    sendMessage({ text: msg })
    setInput("")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col border-l border-white/8 bg-[#0B1120] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#10B981]" />
          <span className="text-sm font-medium text-white">Syntric AI</span>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#94A3B8] hover:bg-white/5 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[#94A3B8]">Ask me anything about your CRM data.</p>
              <div className="mt-3 space-y-1.5">
                {[
                  "List all my active clients",
                  "Show me the pipeline summary",
                  "What deals are in negotiation?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => submit(suggestion)}
                    className="block w-full rounded-md border border-white/8 px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            Something went wrong. Please try again.
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/8 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about clients, deals, projects..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-white/8 bg-[#1E293B] px-3 py-2 text-sm text-white placeholder:text-[#94A3B8]/60 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2563EB] text-white hover:bg-[#3B82F6] disabled:opacity-40 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
