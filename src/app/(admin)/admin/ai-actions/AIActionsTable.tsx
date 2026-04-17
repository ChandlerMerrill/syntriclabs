"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  Copy,
  MessageSquare,
  RotateCcw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/utils"
import type { AIActionRow } from "@/lib/services/ai-actions"

// Inlined (vs imported from @/lib/ai/undo) to keep the `postgres` driver out
// of the client bundle — undo.ts pulls in node-only modules.
function buttonLabelFor(hintKind: string): string {
  switch (hintKind) {
    case "updateClient": return "Revert client update"
    case "updateContact": return "Revert contact update"
    case "updateDeal": return "Revert deal update"
    case "updateProject": return "Revert project update"
    case "updateLead": return "Revert lead update"
    case "archiveClient": return "Undo archive"
    case "archiveDeal": return "Undo archive"
    case "dismissLead": return "Restore lead"
    case "updateDealStage": return "Revert stage change"
    case "updateProjectStatus": return "Revert status change"
    case "hardDeleteClient": return "Restore client"
    case "hardDeleteContact": return "Restore contact"
    case "hardDeleteLead": return "Restore lead"
    case "writeSql-update": return "Revert SQL update"
    case "writeSql-insert": return "Delete inserted rows"
    default: return "Undo"
  }
}

export default function AIActionsTable({ actions }: { actions: AIActionRow[] }) {
  return (
    <div className="rounded-lg border border-white/8">
      <Table>
        <TableHeader>
          <TableRow className="border-white/8 hover:bg-transparent">
            <TableHead className="w-8 text-[#94A3B8]"></TableHead>
            <TableHead className="text-[#94A3B8]">When</TableHead>
            <TableHead className="text-[#94A3B8]">Tool</TableHead>
            <TableHead className="text-[#94A3B8]">Channel</TableHead>
            <TableHead className="text-[#94A3B8]">Client</TableHead>
            <TableHead className="text-[#94A3B8]">Status</TableHead>
            <TableHead className="text-[#94A3B8]">Args preview</TableHead>
            <TableHead className="text-[#94A3B8]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ActionRow({ action }: { action: AIActionRow }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isError = action.status === "error"
  const isUndone = !!action.undone_at
  const hint = action.reversal_hint as { kind?: string } | null
  const canUndo = !isError && !isUndone && !!hint?.kind && action.tool_name !== "undo"
  const argsPreview = JSON.stringify(action.args).slice(0, 80)

  const handleUndo = () => {
    if (!confirm(`${buttonLabelFor(hint?.kind ?? "")}? This cannot itself be undone.`)) return
    startTransition(async () => {
      const res = await fetch("/api/ai/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      })
      const body = await res.json()
      if (res.ok) {
        toast.success(body.summary ?? "Undone.")
        router.refresh()
      } else {
        toast.error(body.error ?? "Undo failed.")
      }
    })
  }

  const handleCopyArgs = () => {
    navigator.clipboard.writeText(JSON.stringify(action.args, null, 2))
    toast.success("Args copied")
  }

  return (
    <>
      <TableRow
        className={cn(
          "border-white/8 cursor-pointer transition-colors hover:bg-white/5",
          isError && "border-l-2 border-l-red-500/60",
          isUndone && "opacity-50"
        )}
        onClick={() => setOpen(!open)}
      >
        <TableCell>
          {open ? (
            <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
          )}
        </TableCell>
        <TableCell className="text-[#94A3B8]" title={action.created_at}>
          {formatRelativeTime(action.created_at)}
        </TableCell>
        <TableCell className="font-mono text-xs text-white">
          {action.tool_name}
          {hint?.kind && !isError && !isUndone && (
            <span className="ml-2 rounded bg-[#8B5CF6]/15 px-1.5 py-0.5 text-[10px] text-[#C4B5FD]">
              ⤺ undoable
            </span>
          )}
          {isUndone && (
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[#94A3B8]">
              ↩ undone
            </span>
          )}
        </TableCell>
        <TableCell>
          {action.channel ? (
            <Badge variant="secondary" className="bg-white/5 text-[#94A3B8]">
              {action.channel}
            </Badge>
          ) : (
            <span className="text-[#94A3B8]">—</span>
          )}
        </TableCell>
        <TableCell className="text-[#94A3B8]">
          {action.client_id ? (
            <Link
              href={`/admin/clients/${action.client_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[#60A5FA] hover:text-[#93C5FD]"
            >
              {action.client_id.slice(0, 8)}
            </Link>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              isError ? "bg-red-500" : "bg-emerald-500"
            )}
          />
        </TableCell>
        <TableCell className="max-w-[280px] truncate font-mono text-[11px] text-[#94A3B8]">
          {argsPreview}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {action.conversation_id && (
            <Link
              href={`/admin/messages?conversation=${action.conversation_id}`}
              className="text-[#94A3B8] hover:text-white"
              title="Jump to conversation"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Link>
          )}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="border-white/8 bg-[#0B1120]/50 hover:bg-[#0B1120]/50">
          <TableCell colSpan={8} className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#94A3B8]">Args</span>
                  <button
                    onClick={handleCopyArgs}
                    className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-white"
                  >
                    <Copy className="h-3 w-3" /> copy
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded bg-[#0B1120] p-3 text-[11px] text-[#E2E8F0]">
                  {JSON.stringify(action.args, null, 2)}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-[#94A3B8]">
                  {isError ? "Error" : "Result"}
                </div>
                {isError ? (
                  <pre className="max-h-72 overflow-auto rounded border border-red-500/30 bg-red-500/5 p-3 text-[11px] text-red-200">
                    {action.error_message ?? JSON.stringify(action.result, null, 2)}
                  </pre>
                ) : (
                  <ResultView result={action.result} toolName={action.tool_name} />
                )}
              </div>
            </div>

            {action.reversal_hint && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold text-[#94A3B8]">Reversal hint</div>
                <pre className="max-h-32 overflow-auto rounded bg-[#0B1120] p-3 text-[11px] text-[#94A3B8]">
                  {JSON.stringify(action.reversal_hint, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              {canUndo && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUndo}
                  disabled={isPending}
                  className="border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD] hover:bg-[#8B5CF6]/20"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {isPending ? "Undoing…" : buttonLabelFor(hint?.kind ?? "")}
                </Button>
              )}
              {isUndone && action.undone_by_action_id && (
                <span className="text-xs text-[#94A3B8]">
                  Undone {formatRelativeTime(action.undone_at ?? "")}
                </span>
              )}
              {action.conversation_id && (
                <Link
                  href={`/admin/messages?conversation=${action.conversation_id}`}
                  className="ml-auto text-xs text-[#60A5FA] hover:text-[#93C5FD]"
                >
                  Jump to conversation →
                </Link>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
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
  if (Array.isArray(r.inserted)) return toTabular(r.inserted as Record<string, unknown>[])
  if (Array.isArray(r.updated)) return toTabular(r.updated as Record<string, unknown>[])
  return null
}

function toTabular(rows: Record<string, unknown>[]): Tabular {
  const cols = rows[0] ? Object.keys(rows[0]) : []
  return { rows, columns: cols, truncated: false }
}

function ResultView({ result, toolName }: { result: unknown; toolName: string }) {
  const tabular = extractTabular(toolName, result)
  if (tabular && tabular.rows.length > 0) {
    return (
      <div className="max-h-72 overflow-auto rounded border border-white/5 bg-[#0B1120]">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 bg-[#1E293B]">
            <tr>
              {tabular.columns.map((c) => (
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
            {tabular.rows.map((row, i) => (
              <tr key={i} className={cn(i % 2 === 1 && "bg-white/[0.02]")}>
                {tabular.columns.map((c) => (
                  <td
                    key={c}
                    className="border-b border-white/5 px-2 py-1 align-top text-[#E2E8F0]"
                  >
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
  return (
    <pre className="max-h-72 overflow-auto rounded bg-[#0B1120] p-3 text-[11px] text-[#E2E8F0]">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return JSON.stringify(v)
}
