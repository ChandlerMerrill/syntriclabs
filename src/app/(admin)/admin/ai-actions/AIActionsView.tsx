"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/admin/shared/EmptyState"
import AIActionsTable from "./AIActionsTable"
import type { AIActionRow } from "@/lib/services/ai-actions"

const rangeTabs = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "custom", label: "Custom" },
] as const

const statusTabs = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
] as const

export default function AIActionsView({
  actions,
  totalCount,
  page,
  pageSize,
  toolNames,
  activeRange,
  activeTool,
  activeStatus,
  activeConversation,
  customFrom,
  customTo,
}: {
  actions: AIActionRow[]
  totalCount: number
  page: number
  pageSize: number
  toolNames: string[]
  activeRange: string
  activeTool: string
  activeStatus: string
  activeConversation: string
  customFrom: string
  customTo: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = actions.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.tool_name.toLowerCase().includes(q) ||
      JSON.stringify(a.args).toLowerCase().includes(q) ||
      (a.error_message ?? "").toLowerCase().includes(q)
    )
  })

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    const current: Record<string, string | undefined> = {
      range: activeRange !== "24h" ? activeRange : undefined,
      from: customFrom || undefined,
      to: customTo || undefined,
      tool: activeTool || undefined,
      status: activeStatus !== "all" ? activeStatus : undefined,
      conversation: activeConversation || undefined,
    }
    const merged = { ...current, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) sp.set(k, v)
    }
    const qs = sp.toString()
    return qs ? `/admin/ai-actions?${qs}` : "/admin/ai-actions"
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
          {rangeTabs.map((t) => (
            <Link
              key={t.value}
              href={buildHref({ range: t.value === "24h" ? undefined : t.value })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeRange === t.value ? "bg-white/10 text-white" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
          {statusTabs.map((t) => (
            <Link
              key={t.value}
              href={buildHref({ status: t.value === "all" ? undefined : t.value })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeStatus === t.value ? "bg-white/10 text-white" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <select
          value={activeTool}
          onChange={(e) => router.push(buildHref({ tool: e.target.value || undefined }))}
          className="rounded-md border border-white/8 bg-[#0B1120] px-2 py-1.5 text-xs text-white"
        >
          <option value="">All tools</option>
          {toolNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {activeConversation && (
          <Link
            href={buildHref({ conversation: undefined })}
            className="rounded-md border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-2 py-1.5 text-xs text-[#C4B5FD] hover:bg-[#8B5CF6]/20"
          >
            conversation: {activeConversation.slice(0, 8)} ✕
          </Link>
        )}

        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            placeholder="Search tool / args / error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/8 bg-[#0B1120] pl-9 text-white placeholder:text-[#94A3B8]/50"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <AIActionsTable actions={filtered} />
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>
              Showing {filtered.length} of {totalCount} action{totalCount === 1 ? "" : "s"}
              {search && " (client-filtered)"}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })}>
                  <Button variant="ghost" size="sm">
                    ← Prev
                  </Button>
                </Link>
              )}
              <span className="flex items-center px-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })}>
                  <Button variant="ghost" size="sm">
                    Next →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Activity}
          title="No AI actions in this window."
          description="Tool calls from Telegram, admin chat, and the playground will appear here."
        />
      )}
    </div>
  )
}
