"use client"

import type { UIMessage } from "ai"
import { motion } from "framer-motion"
import { Calendar, Check, CheckCircle, Loader2 } from "lucide-react"
import SyntricMascot from "./SyntricMascot"
import RequestForm from "./RequestForm"

interface WidgetMessageProps {
  message: UIMessage
  isStreaming: boolean
  sessionId: string
  conversationId: string | null
  pathname: string
}

/** Avatar column width — 28px mascot + 8px gap. Cards that sit beside a bubble
 *  rather than under one use `ml-9` to line up with the bubble's left edge. */
function Avatar() {
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-600 to-slate-800 shadow-sm shadow-black/20 ring-1 ring-white/10">
      <SyntricMascot size={28} />
    </div>
  )
}

/**
 * Every assistant element enters the same way — a short rise and fade.
 *
 * Streaming text already animates by arriving character by character; the
 * things that don't stream (tool cards, confirmations, the request form) would
 * otherwise pop in fully formed and read as a page reload inside the panel.
 */
function Enter({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function WidgetMessage({
  message,
  isStreaming,
  sessionId,
  conversationId,
  pathname,
}: WidgetMessageProps) {
  const isUser = message.role === "user"

  if (isUser) {
    const text = message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? ""
    if (!text) return null
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="mb-3 flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-3.5 py-2 text-sm leading-relaxed text-white shadow-sm shadow-indigo-500/20">
          {text}
        </div>
      </motion.div>
    )
  }

  // Assistant message — render parts
  const elements: React.ReactNode[] = []
  let hasContent = false
  let isFirstText = true

  // The knowledge-base lookup runs on almost every factual answer and used to
  // be invisible: three dots for as long as it took, then text. Showing the
  // step is the difference between a widget that seems slow and one that seems
  // to be doing something — and it's honest about where the answer came from.
  const searchParts = (message.parts ?? []).filter(
    (p) => p.type === "tool-searchKnowledgebase"
  )
  if (searchParts.length > 0) {
    const settled = searchParts.every(
      (p) => "state" in p && (p as { state: string }).state === "output-available"
    )
    hasContent = true
    elements.push(
      <Enter key="kb-status">
        <div className="mb-2 flex items-center gap-2 pl-9">
          {settled ? (
            <>
              <Check className="h-3 w-3 shrink-0 text-[#6366F1]" />
              <span className="text-[11px] font-medium text-slate-400">
                Checked our notes
              </span>
            </>
          ) : (
            <>
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#6366F1]" />
              <span className="widget-status-shimmer text-[11px] font-medium text-slate-500">
                Looking that up…
              </span>
            </>
          )}
        </div>
      </Enter>
    )
  }

  for (let i = 0; i < (message.parts?.length ?? 0); i++) {
    const part = message.parts![i]

    if (part.type === "text") {
      const text = (part as { type: "text"; text: string }).text
      if (!text) continue
      hasContent = true
      const showAvatar = isFirstText
      isFirstText = false
      elements.push(
        <div key={`text-${i}`} className="mb-3 flex items-start gap-2">
          {showAvatar ? <Avatar /> : <div className="w-7 shrink-0" />}
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-700 shadow-sm shadow-black/[0.04] ring-1 ring-slate-900/[0.03]">
            <div className="whitespace-pre-wrap break-words [&>p]:mb-2 [&>p:last-child]:mb-0">
              {formatWidgetContent(text)}
            </div>
          </div>
        </div>
      )
      continue
    }

    // Status for the knowledge-base lookup is rendered above, once per message.
    if (part.type === "tool-searchKnowledgebase") continue

    // Tool: submitRequest — the visitor fills this in themselves
    if (
      part.type === "tool-submitRequest" &&
      "state" in part &&
      (part as { state: string }).state === "output-available" &&
      "output" in part
    ) {
      const output = (part as { output: unknown }).output as { topic: string | null }
      hasContent = true
      elements.push(
        <RequestForm
          key={`tool-${i}`}
          sessionId={sessionId}
          conversationId={conversationId}
          topic={output?.topic ?? null}
          pathname={pathname}
        />
      )
      continue
    }

    // Tool: bookConsultation
    if (
      part.type === "tool-bookConsultation" &&
      "state" in part &&
      (part as { state: string }).state === "output-available" &&
      "output" in part
    ) {
      const output = (part as { output: unknown }).output as { url: string; message: string }
      hasContent = true
      elements.push(<BookingCard key={`tool-${i}`} url={output.url} message={output.message} />)
      continue
    }

    // Tool: captureLeadInfo
    if (
      part.type === "tool-captureLeadInfo" &&
      "state" in part &&
      (part as { state: string }).state === "output-available"
    ) {
      hasContent = true
      elements.push(
        <ConfirmationCard key={`tool-${i}`} message="Your details are with our team — we'll be in touch." />
      )
      continue
    }

    // Tool: escalateToHuman
    if (
      part.type === "tool-escalateToHuman" &&
      "state" in part &&
      (part as { state: string }).state === "output-available"
    ) {
      hasContent = true
      elements.push(
        <ConfirmationCard key={`tool-${i}`} message="Chandler will reach out to you shortly." />
      )
      continue
    }

    // Any other tool still loading
    if (
      part.type.startsWith("tool-") &&
      "state" in part &&
      (part as { state: string }).state !== "output-available"
    ) {
      hasContent = true
      elements.push(
        <div key={`loading-${i}`} className="mb-3 flex items-start gap-2">
          <div className="w-7 shrink-0" />
          <ThinkingDots />
        </div>
      )
      continue
    }
  }

  // Show thinking dots if assistant message has no content yet
  if (!hasContent && isStreaming) {
    return (
      <div className="mb-3 flex items-start gap-2">
        <Avatar />
        <ThinkingDots />
      </div>
    )
  }

  if (!hasContent) return null
  return <>{elements}</>
}

function ThinkingDots() {
  return (
    <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm shadow-black/[0.04] ring-1 ring-slate-900/[0.03]">
      <div className="flex items-center gap-1">
        <span className="widget-thinking-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
        <span className="widget-thinking-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
        <span className="widget-thinking-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
      </div>
    </div>
  )
}

function BookingCard({ url, message }: { url: string; message: string }) {
  return (
    <Enter>
      <div className="mb-3 ml-9 max-w-[85%] overflow-hidden rounded-2xl border border-indigo-500/20 bg-white shadow-sm shadow-black/[0.04]">
        <div className="flex items-start gap-2.5 p-3.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/10">
            <Calendar className="h-3 w-3 text-[#6366F1]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">Grab a time</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{message}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-3.5 mb-3.5 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-3 py-2 text-[13px] font-medium text-white shadow-sm shadow-indigo-500/25 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.985]"
        >
          Open the calendar
        </a>
      </div>
    </Enter>
  )
}

function ConfirmationCard({ message }: { message: string }) {
  return (
    <Enter>
      <div className="mb-3 ml-9 max-w-[85%] rounded-2xl border border-emerald-500/20 bg-white p-3.5 shadow-sm shadow-black/[0.04]">
        <div className="flex items-start gap-2.5">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-sm leading-relaxed text-slate-700">{message}</p>
        </div>
      </div>
    </Enter>
  )
}

function formatWidgetContent(content: string) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-semibold text-slate-800 mt-2 mb-1">{line.slice(4)}</p>)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-semibold text-slate-800 mt-2 mb-1">{line.slice(3)}</p>)
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-slate-400 shrink-0">&bull;</span>
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
  // Match bold (**text**), markdown links ([text](url)), and raw URLs
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)<>]+)/g)
  return parts.map((part, i) => {
    // Bold text — check if the inner content is a URL and make it a clickable bold link
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2)
      if (/^https?:\/\//.test(inner)) {
        return (
          <a
            key={i}
            href={inner}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#6366F1] underline underline-offset-2 hover:text-[#4F46E5]"
          >
            {inner}
          </a>
        )
      }
      return <strong key={i} className="font-semibold text-slate-800">{inner}</strong>
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6366F1] underline underline-offset-2 hover:text-[#4F46E5]"
        >
          {linkMatch[1]}
        </a>
      )
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6366F1] underline underline-offset-2 hover:text-[#4F46E5]"
        >
          {part}
        </a>
      )
    }
    return part
  })
}
