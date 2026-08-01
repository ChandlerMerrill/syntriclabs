"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, ArrowUpDown, CalendarRange, Wrench, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import AIActionsTable from "./AIActionsTable"
import type { AIActionRow } from "@/lib/services/ai-actions"

// Unlike every other list in the panel these filters run on the server, because
// the table is paginated — facet counts drawn from one page of 50 would be a
// lie. Same controls, same chrome; the state just lives in the URL.
const RANGES = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

const STATUSES = [
  { value: "all", label: "Any outcome" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
]

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      (a) =>
        a.tool_name.toLowerCase().includes(q) ||
        JSON.stringify(a.args).toLowerCase().includes(q) ||
        (a.error_message ?? "").toLowerCase().includes(q)
    )
  }, [actions, search])

  const toolOptions = useMemo(
    () => [
      { value: "", label: "All tools" },
      ...toolNames.map((n) => ({ value: n, label: n })),
    ],
    [toolNames]
  )

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
  const serverFiltersActive =
    activeRange !== "24h" || !!activeTool || activeStatus !== "all" || !!activeConversation
  const filtersActive = serverFiltersActive || search.trim() !== ""

  return (
    <div className="space-y-4">
      <FilterBar
        active={filtersActive}
        onClear={() => {
          setSearch("")
          router.push("/admin/ai-actions")
        }}
        summary={
          search.trim()
            ? `${filtered.length} of ${actions.length} on this page`
            : `${actions.length} of ${totalCount}`
        }
      >
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Search tool / args / error…"
        />
        <FilterSelect
          options={RANGES}
          value={RANGES.some((r) => r.value === activeRange) ? activeRange : "24h"}
          onChange={(v) => router.push(buildHref({ range: v === "24h" ? undefined : v }))}
          icon={CalendarRange}
          className="w-44"
        />
        <FilterSelect
          options={STATUSES}
          value={activeStatus || "all"}
          onChange={(v) => router.push(buildHref({ status: v === "all" ? undefined : v }))}
          icon={ArrowUpDown}
          className="w-40"
        />
        {toolNames.length > 0 && (
          <FilterSelect
            options={toolOptions}
            value={activeTool}
            onChange={(v) => router.push(buildHref({ tool: v || undefined }))}
            icon={Wrench}
            placeholder="All tools"
            searchable={toolNames.length > 6}
            searchPlaceholder="Search tools…"
            className="w-48"
          />
        )}
        {activeConversation && (
          <Link
            href={buildHref({ conversation: undefined })}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-2.5 text-xs font-medium text-[#C4B5FD] transition-colors hover:bg-[#8B5CF6]/20"
          >
            conversation {activeConversation.slice(0, 8)}
            <X className="h-3 w-3" />
          </Link>
        )}
      </FilterBar>

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
          title={
            actions.length === 0
              ? "No AI actions in this window."
              : "Nothing matches this search."
          }
          description={
            actions.length === 0
              ? "Tool calls from Telegram, admin chat, and the playground will appear here."
              : "Clear the search to see every action in this window."
          }
        />
      )}
    </div>
  )
}
