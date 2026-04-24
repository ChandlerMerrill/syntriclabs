"use client"

import type { UIMessage } from "ai"
import { CheckCircle, Calendar } from "lucide-react"
import SyntricMascot from "./SyntricMascot"

interface WidgetMessageProps {
  message: UIMessage
  isStreaming: boolean
}

export default function WidgetMessage({ message, isStreaming }: WidgetMessageProps) {
  const isUser = message.role === "user"

  if (isUser) {
    const text = message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? ""
    if (!text) return null
    return (
      <div className="mb-3 flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-3.5 py-2 text-sm leading-relaxed text-white shadow-sm shadow-indigo-500/15">
          {text}
        </div>
      </div>
    )
  }

  // Assistant message — render parts
  const elements: React.ReactNode[] = []
  let hasContent = false
  let isFirstText = true

  for (let i = 0; i < (message.parts?.length ?? 0); i++) {
    const part = message.parts![i]

    if (part.type === "text") {
      const text = (part as { type: "text"; text: string }).text
      if (!text) continue
      hasContent = true
      const showAvatar = isFirstText
      isFirstText = false
      elements.push(
        <div key={`text-${i}`} className="mb-3 flex items-end gap-2">
          {showAvatar ? (
            <div className="shrink-0 self-end mb-0.5">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-600 to-slate-800 ring-1 ring-white/10 shadow-sm shadow-black/20">
                <SyntricMascot size={44} />
              </div>
            </div>
          ) : (
            <div className="w-11 shrink-0" />
          )}
          <div className="max-w-[80%] rounded-2xl bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-700 shadow-sm shadow-black/[0.03]">
            <div className="whitespace-pre-wrap break-words [&>p]:mb-2 [&>p:last-child]:mb-0">
              {formatWidgetContent(text)}
            </div>
          </div>
        </div>
      )
      continue
    }

    // Tool: searchKnowledgebase — hidden
    if (part.type === "tool-searchKnowledgebase") continue

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
        <ConfirmationCard key={`tool-${i}`} message="Your info has been shared with our team. We'll be in touch!" />
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
        <ConfirmationCard key={`tool-${i}`} message="A team member will reach out to you shortly." />
      )
      continue
    }

    // Any tool still loading
    if (
      part.type.startsWith("tool-") &&
      "state" in part &&
      (part as { state: string }).state !== "output-available"
    ) {
      hasContent = true
      elements.push(
        <div key={`loading-${i}`} className="mb-3 flex items-end gap-2">
          <div className="w-5 shrink-0" />
          <ThinkingDots />
        </div>
      )
      continue
    }
  }

  // Show thinking dots if assistant message has no content yet
  if (!hasContent && isStreaming) {
    return (
      <div className="mb-3 flex items-end gap-2">
        <div className="shrink-0 self-end mb-0.5">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-600 to-slate-800 ring-1 ring-white/10 shadow-sm shadow-black/20">
            <SyntricMascot size={44} />
          </div>
        </div>
        <ThinkingDots />
      </div>
    )
  }

  if (!hasContent) return null
  return <>{elements}</>
}

function ThinkingDots() {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
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
    <div className="mb-3 flex justify-start">
      <div className="ml-7 max-w-[80%] rounded-xl border border-indigo-500/20 bg-white p-3 shadow-sm shadow-black/[0.03]">
        <div className="flex items-start gap-2.5">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#6366F1]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">Book a Consultation</p>
            <p className="mt-0.5 text-xs text-slate-500">{message}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center justify-center rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4F46E5]"
        >
          Open Scheduling Page
        </a>
      </div>
    </div>
  )
}

function ConfirmationCard({ message }: { message: string }) {
  return (
    <div className="mb-3 flex justify-start">
      <div className="ml-7 max-w-[80%] rounded-xl border border-emerald-500/20 bg-white p-3 shadow-sm shadow-black/[0.03]">
        <div className="flex items-start gap-2.5">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-sm text-slate-700">{message}</p>
        </div>
      </div>
    </div>
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
