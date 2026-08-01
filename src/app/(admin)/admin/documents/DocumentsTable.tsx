"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, FileText } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatDate } from "@/lib/utils"
import { DOCUMENT_TYPES, DOCUMENT_STATUSES, DOCUMENT_TYPE_COLORS } from "@/lib/constants"
import type { DocumentWithClient } from "@/lib/types"

const TYPE_ORDER = DOCUMENT_TYPES.map((t) => t.value)
const TYPE_META: Record<string, { label: string; dotClassName: string }> = {
  proposal: { label: "Proposal", dotClassName: "bg-purple-400" },
  price_sheet: { label: "Price Sheet", dotClassName: "bg-blue-400" },
  contract: { label: "Contract", dotClassName: "bg-emerald-400" },
  counter_proposal: { label: "Counter-Proposal", dotClassName: "bg-amber-400" },
}

const STATUS_ORDER = DOCUMENT_STATUSES.map((s) => s.value)
const STATUS_META: Record<string, { label: string; dotClassName: string; dangerWhenNonZero?: boolean }> = {
  draft: { label: "Draft", dotClassName: "bg-slate-400" },
  final: { label: "Final", dotClassName: "bg-blue-400" },
  sent: { label: "Sent", dotClassName: "bg-purple-400" },
  accepted: { label: "Accepted", dotClassName: "bg-emerald-400" },
  rejected: { label: "Rejected", dotClassName: "bg-red-400", dangerWhenNonZero: true },
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
]

export default function DocumentsTable({ documents }: { documents: DocumentWithClient[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [typeSel, setTypeSel] = useState<Set<string>>(new Set())
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [clientSel, setClientSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const clientLabels = useMemo(() => {
    const map: Record<string, { label: string }> = {}
    for (const d of documents) {
      if (d.clients?.id && d.clients.company_name) {
        map[d.clients.id] = { label: d.clients.company_name }
      }
    }
    return map
  }, [documents])

  const facets = useMemo<Record<"type" | "status" | "client", Facet<DocumentWithClient>>>(
    () => ({
      type: { values: (d) => d.type, order: TYPE_ORDER, meta: TYPE_META },
      status: { values: (d) => d.status, order: STATUS_ORDER, meta: STATUS_META },
      client: { values: (d) => d.clients?.id ?? null, meta: clientLabels },
    }),
    [clientLabels]
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: documents,
        search,
        matchesSearch: (d, q) =>
          d.title.toLowerCase().includes(q) ||
          (d.clients?.company_name?.toLowerCase().includes(q) ?? false),
        facets,
        selected: { type: typeSel, status: statusSel, client: clientSel },
      }),
    [documents, search, facets, typeSel, statusSel, clientSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case "title":
        rows.sort((a, b) => a.title.localeCompare(b.title))
        break
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setTypeSel(new Set())
    setStatusSel(new Set())
    setClientSel(new Set())
  }

  return (
    <div className="space-y-4">
      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        summary={filterSummary(visible.length, documents.length, "document")}
      >
        <FilterSearch value={search} onChange={setSearch} placeholder="Search documents…" />
        {options.type.length > 1 && (
          <FilterMultiSelect
            options={options.type}
            selected={active.type}
            onChange={setTypeSel}
            counts={counts.type}
            allLabel="All types"
            manyLabel="Types"
            className="w-44"
          />
        )}
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
          className="w-44"
        />
      </FilterBar>

      {sorted.length > 0 ? (
        <div className="rounded-xl border border-white/8">
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-[#94A3B8]">Title</TableHead>
                <TableHead className="text-[#94A3B8]">Type</TableHead>
                <TableHead className="text-[#94A3B8]">Client</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
                <TableHead className="text-[#94A3B8]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer border-white/8 transition-colors hover:bg-white/5"
                  onClick={() => router.push(`/admin/documents/${doc.id}`)}
                >
                  <TableCell className="font-medium text-white">{doc.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={DOCUMENT_TYPE_COLORS[doc.type]}>
                      {doc.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#94A3B8]">{doc.clients?.company_name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={doc.status} /></TableCell>
                  <TableCell className="text-[#94A3B8]">{formatDate(doc.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nothing matches these filters"
          description="Clear the filters to see every document."
        />
      )}
    </div>
  )
}
