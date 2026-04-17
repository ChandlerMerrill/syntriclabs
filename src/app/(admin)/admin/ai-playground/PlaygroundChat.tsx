"use client"

import { useRef, useEffect, useState } from "react"
import { Send, Loader2, Bot, User, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { cn, randomUUID } from "@/lib/utils"

type Role = "user" | "assistant"

interface ToolCallTrace {
  toolName: string
  args: unknown
  result?: unknown
}

interface PlaygroundMessage {
  id: string
  role: Role
  content: string
  toolCalls?: ToolCallTrace[]
}

type Channel = "playground" | "admin_chat" | "telegram"

export default function PlaygroundChat() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<Channel>("playground")
  const [conversationId, setConversationId] = useState<string | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const clear = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }

  const submit = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return

    const userMsg: PlaygroundMessage = { id: randomUUID(), role: "user", content: msg }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/ai/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          channel,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Request failed")

      setConversationId(data.conversationId ?? null)
      setMessages((prev) => [
        ...prev,
        {
          id: randomUUID(),
          role: "assistant",
          content: data.text ?? "",
          toolCalls: data.toolCalls ?? [],
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const suggestions = [
    "List all my active clients",
    "Show me pipeline summary",
    "What deals are in negotiation?",
  ]

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col overflow-hidden rounded-lg border border-white/8 bg-[#0B1120]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
        <div className="flex items-center gap-3">
          <label className="text-xs text-[#94A3B8]">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="rounded-md border border-white/8 bg-[#1E293B] px-2 py-1 text-xs text-white focus:border-[#2563EB] focus:outline-none"
          >
            <option value="playground">playground</option>
            <option value="admin_chat">admin_chat</option>
            <option value="telegram">telegram</option>
          </select>
          {conversationId && (
            <span className="truncate font-mono text-[10px] text-[#94A3B8]">
              conv: {conversationId.slice(0, 8)}
            </span>
          )}
        </div>
        <button
          onClick={clear}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#94A3B8] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[#94A3B8]">
                Runs the same path as Telegram. Tool calls and results render inline.
              </p>
              <div className="mt-3 space-y-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="block w-full rounded-md border border-white/8 px-3 py-1.5 text-left text-xs text-[#94A3B8] hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
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
            placeholder="Type a prompt to test..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-white/8 bg-[#1E293B] px-3 py-2 text-sm text-white placeholder:text-[#94A3B8]/60 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2563EB] text-white hover:bg-[#3B82F6] disabled:opacity-40 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: PlaygroundMessage }) {
  const isUser = message.role === "user"
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
      <div className="max-w-[85%] space-y-2">
        {message.content && (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm leading-relaxed",
              isUser ? "bg-[#2563EB] text-white" : "bg-[#1E293B] text-[#E2E8F0]"
            )}
          >
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolTrace key={i} call={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolTrace({ call }: { call: ToolCallTrace }) {
  const [open, setOpen] = useState(false)
  const resultIsError =
    typeof call.result === "object" &&
    call.result !== null &&
    "error" in (call.result as Record<string, unknown>)

  const tabular = extractTabular(call.toolName, call.result)

  return (
    <div
      className={cn(
        "rounded-md border text-xs",
        resultIsError
          ? "border-red-500/30 bg-red-500/5"
          : "border-white/8 bg-[#1E293B]/50"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-[#94A3B8] hover:text-white transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="font-mono">{call.toolName}</span>
        {resultIsError && <span className="text-red-400">(error)</span>}
        {tabular && !resultIsError && (
          <span className="text-[#8B5CF6]">
            ({tabular.rows.length} row{tabular.rows.length === 1 ? "" : "s"}
            {tabular.truncated ? ", capped" : ""})
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-white/5 px-2.5 py-2 space-y-2">
          <div>
            <div className="mb-0.5 text-[#94A3B8]">Args</div>
            <pre className="max-h-40 overflow-auto rounded bg-[#0B1120] p-2 text-[#E2E8F0]">
              {JSON.stringify(call.args, null, 2)}
            </pre>
          </div>
          {tabular && (
            <div>
              <div className="mb-0.5 text-[#94A3B8]">
                Rows ({tabular.rows.length}
                {tabular.truncated ? " — capped at 500" : ""})
              </div>
              <SqlRowTable columns={tabular.columns} rows={tabular.rows} />
            </div>
          )}
          {call.result !== undefined && (
            <div>
              <div className="mb-0.5 text-[#94A3B8]">Raw</div>
              <pre className="max-h-60 overflow-auto rounded bg-[#0B1120] p-2 text-[#E2E8F0]">
                {JSON.stringify(call.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type Tabular = { rows: Record<string, unknown>[]; columns: string[]; truncated: boolean }

function extractTabular(toolName: string, result: unknown): Tabular | null {
  if (!result || typeof result !== "object") return null
  const r = result as Record<string, unknown>
  if ("error" in r) return null
  const looksLikeSqlTool =
    toolName === "querySql" ||
    toolName === "describeSchema" ||
    (toolName === "writeSql" && (Array.isArray(r.inserted) || Array.isArray(r.updated)))

  if (!looksLikeSqlTool) return null

  if (Array.isArray(r.rows) && Array.isArray(r.columns)) {
    return {
      rows: r.rows as Record<string, unknown>[],
      columns: r.columns as string[],
      truncated: Boolean(r.truncated),
    }
  }
  if (Array.isArray(r.inserted)) {
    return toTabular(r.inserted as Record<string, unknown>[])
  }
  if (Array.isArray(r.updated)) {
    return toTabular(r.updated as Record<string, unknown>[])
  }
  return null
}

function toTabular(rows: Record<string, unknown>[]): Tabular {
  const cols = rows[0] ? Object.keys(rows[0]) : []
  return { rows, columns: cols, truncated: false }
}

function SqlRowTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <div className="rounded bg-[#0B1120] p-2 text-[#94A3B8]">No rows.</div>
  }
  const cols = columns.length > 0 ? columns : Object.keys(rows[0])
  return (
    <div className="max-h-72 overflow-auto rounded border border-white/5 bg-[#0B1120]">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 bg-[#1E293B]">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="border-b border-white/8 px-2 py-1.5 text-left font-mono font-semibold text-[#8B5CF6]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn(i % 2 === 1 && "bg-white/[0.02]")}>
              {cols.map((c) => (
                <td key={c} className="border-b border-white/5 px-2 py-1 align-top text-[#E2E8F0]">
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return JSON.stringify(v)
}
