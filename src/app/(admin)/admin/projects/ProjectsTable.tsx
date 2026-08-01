"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, FolderKanban } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatDate, formatCurrency } from "@/lib/utils"
import { PROJECT_STATUSES } from "@/lib/constants"
import type { ProjectWithClient } from "@/lib/types"

const STATUS_ORDER = PROJECT_STATUSES.map((s) => s.value)
const STATUS_META: Record<string, { label: string; dotClassName: string }> = {
  planning: { label: "Planning", dotClassName: "bg-blue-400" },
  active: { label: "Active", dotClassName: "bg-emerald-400" },
  paused: { label: "Paused", dotClassName: "bg-amber-400" },
  completed: { label: "Completed", dotClassName: "bg-slate-400" },
  cancelled: { label: "Cancelled", dotClassName: "bg-red-400" },
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Project A–Z" },
  { value: "budget", label: "Budget high–low" },
]

export default function ProjectsTable({ projects }: { projects: ProjectWithClient[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [clientSel, setClientSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const clientLabels = useMemo(() => {
    const map: Record<string, { label: string }> = {}
    for (const p of projects) {
      if (p.clients?.id && p.clients.company_name) {
        map[p.clients.id] = { label: p.clients.company_name }
      }
    }
    return map
  }, [projects])

  const facets = useMemo<Record<"status" | "client", Facet<ProjectWithClient>>>(
    () => ({
      status: { values: (p) => p.status, order: STATUS_ORDER, meta: STATUS_META },
      client: { values: (p) => p.clients?.id ?? null, meta: clientLabels },
    }),
    [clientLabels]
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: projects,
        search,
        matchesSearch: (p, q) =>
          p.name.toLowerCase().includes(q) ||
          (p.clients?.company_name?.toLowerCase().includes(q) ?? false),
        facets,
        selected: { status: statusSel, client: clientSel },
      }),
    [projects, search, facets, statusSel, clientSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case "name":
        rows.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "budget":
        rows.sort((a, b) => (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0))
        break
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setClientSel(new Set())
  }

  return (
    <div className="space-y-4">
      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        summary={filterSummary(visible.length, projects.length, "project")}
      >
        <FilterSearch value={search} onChange={setSearch} placeholder="Search projects…" />
        {options.status.length > 1 && (
          <FilterMultiSelect
            options={options.status}
            selected={active.status}
            onChange={setStatusSel}
            counts={counts.status}
            allLabel="All statuses"
            manyLabel="Statuses"
            className="w-40"
          />
        )}
        {options.client.length > 1 && (
          <FilterMultiSelect
            options={options.client}
            selected={active.client}
            onChange={setClientSel}
            counts={counts.client}
            allLabel="All clients"
            manyLabel="Clients"
            searchable={options.client.length > 6}
            searchPlaceholder="Search clients…"
            className="w-44"
          />
        )}
        <FilterSelect
          options={SORTS}
          value={sort}
          onChange={setSort}
          label="Sort"
          icon={ArrowUpDown}
          className="w-48"
        />
      </FilterBar>

      {sorted.length > 0 ? (
        <div className="rounded-xl border border-white/8">
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-[#94A3B8]">Project</TableHead>
                <TableHead className="text-[#94A3B8]">Client</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
                <TableHead className="text-[#94A3B8]">Budget</TableHead>
                <TableHead className="text-[#94A3B8]">Start</TableHead>
                <TableHead className="text-[#94A3B8]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer border-white/8 hover:bg-white/5"
                  onClick={() => router.push(`/admin/projects/${p.id}`)}
                >
                  <TableCell className="font-medium text-white">{p.name}</TableCell>
                  <TableCell className="text-[#94A3B8]">{p.clients?.company_name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-[#94A3B8]">
                    {p.budget_min || p.budget_max
                      ? `${p.budget_min ? formatCurrency(p.budget_min) : "—"} – ${p.budget_max ? formatCurrency(p.budget_max) : "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-[#94A3B8]">{p.start_date ? formatDate(p.start_date) : "—"}</TableCell>
                  <TableCell className="text-[#94A3B8]">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Nothing matches these filters"
          description="Clear the filters to see every project."
        />
      )}
    </div>
  )
}
