"use client"

import { useState } from "react"
import type { UIMessage } from "ai"
import Link from "next/link"
import { Bot, User, FileText, Send, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { DOCUMENT_TYPE_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DocResult {
  document?: { id: string; title: string; type: string; status: string }
  viewUrl?: string
}

export default function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"

  // Extract text content from parts
  const textContent = message.parts
    ?.filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("") ?? ""

  // Extract document generation results from tool parts
  const documentResults: DocResult[] = []
  for (const part of message.parts ?? []) {
    // Tool parts have type "tool-generateDocument" with state/output fields
    if (part.type === "tool-generateDocument" && "state" in part && (part as { state: string }).state === "output-available" && "output" in part) {
      const output = (part as { output: unknown }).output as DocResult | undefined
      if (output?.document) {
        documentResults.push(output)
      }
    }
  }

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
        {textContent && (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm leading-relaxed",
              isUser
                ? "bg-[#2563EB] text-white"
                : "bg-[#1E293B] text-[#E2E8F0]"
            )}
          >
            <div className="whitespace-pre-wrap break-words [&>p]:mb-2 [&>p:last-child]:mb-0">
              {formatContent(textContent)}
            </div>
          </div>
        )}

        {documentResults.map((result, i) => {
          if (!result.document) return null
          return (
            <DocumentCard
              key={i}
              document={result.document}
              viewUrl={result.viewUrl}
            />
          )
        })}
      </div>
    </div>
  )
}

function DocumentCard({ document: doc, viewUrl }: {
  document: { id: string; title: string; type: string; status: string }
  viewUrl?: string
}) {
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/documents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send")
      toast.success(`Sent to ${data.sentTo}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/8 bg-[#1E293B] p-3">
      <div className="flex items-start gap-2.5">
        <FileText className="mt-0.5 h-4 w-4 text-[#94A3B8]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{doc.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="secondary" className={`text-[10px] ${DOCUMENT_TYPE_COLORS[doc.type] ?? ''}`}>
              {doc.type.replace("_", " ")}
            </Badge>
            <StatusBadge status={doc.status} />
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {viewUrl && (
          <Link href={viewUrl}>
            <Button variant="outline" size="sm" className="h-7 text-xs border-white/8 text-[#94A3B8] hover:text-white">
              View Document
            </Button>
          </Link>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSend}
          disabled={sending}
          className="h-7 text-xs border-white/8 text-[#94A3B8] hover:text-white"
        >
          {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
          {sending ? "Sending..." : "Send to Client"}
        </Button>
      </div>
    </div>
  )
}

function formatContent(content: string) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-semibold text-white mt-2 mb-1">{line.slice(4)}</p>)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-semibold text-white mt-2 mb-1">{line.slice(3)}</p>)
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-[#94A3B8] shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
      continue
    }

    elements.push(<p key={i}>{renderInline(line)}</p>)
  }

  return elements
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    return part
  })
}
