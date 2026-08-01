"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Building2 } from "lucide-react"
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
import { formatDate } from "@/lib/utils"
import { CLIENT_STATUSES, CLIENT_SOURCES } from "@/lib/constants"
import type { ClientWithContacts } from "@/lib/types"

const STATUS_META: Record<string, { label: string; dotClassName: string }> = {
  active: { label: "Active", dotClassName: "bg-emerald-400" },
  prospect: { label: "Prospect", dotClassName: "bg-blue-400" },
  inactive: { label: "Inactive", dotClassName: "bg-zinc-400" },
}

const STATUS_ORDER = CLIENT_STATUSES.map((s) => s.value)
const SOURCE_META = Object.fromEntries(
  CLIENT_SOURCES.map((s) => [s.value, { label: s.label }])
)

const SORTS = [
  { value: "company", label: "Company A–Z" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
]

export default function ClientsTable({ clients }: { clients: ClientWithContacts[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [industrySel, setIndustrySel] = useState<Set<string>>(new Set())
  const [sourceSel, setSourceSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("company")

  const facets = useMemo<Record<"status" | "industry" | "source", Facet<ClientWithContacts>>>(
    () => ({
      status: { values: (c) => c.status, order: STATUS_ORDER, meta: STATUS_META },
      industry: { values: (c) => c.industry },
      source: {
        values: (c) => c.source,
        meta: SOURCE_META,
        label: (v) => v.replace(/_/g, " "),
      },
    }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: clients,
        search,
        matchesSearch: (c, q) =>
          c.company_name.toLowerCase().includes(q) ||
          (c.client_contacts?.some(
            (cc) =>
              cc.name.toLowerCase().includes(q) ||
              (cc.email?.toLowerCase().includes(q) ?? false)
          ) ??
            false),
        facets,
        selected: { status: statusSel, industry: industrySel, source: sourceSel },
      }),
    [clients, search, facets, statusSel, industrySel, sourceSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "newest":
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      default:
        rows.sort((a, b) => a.company_name.localeCompare(b.company_name))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setIndustrySel(new Set())
    setSourceSel(new Set())
  }

  const primaryContact = (c: ClientWithContacts) =>
    c.client_contacts?.find((cc) => cc.is_primary) ?? c.client_contacts?.[0]

  return (
    <div className="space-y-4">
      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        summary={filterSummary(visible.length, clients.length, "client")}
      >
        <FilterSearch value={search} onChange={setSearch} placeholder="Search clients…" />
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
        {options.industry.length > 1 && (
          <FilterMultiSelect
            options={options.industry}
            selected={active.industry}
            onChange={setIndustrySel}
            counts={counts.industry}
            allLabel="All industries"
            manyLabel="Industries"
            searchable={options.industry.length > 6}
            searchPlaceholder="Search industries…"
            className="w-44"
          />
        )}
        {options.source.length > 1 && (
          <FilterMultiSelect
            options={options.source}
            selected={active.source}
            onChange={setSourceSel}
            counts={counts.source}
            allLabel="All sources"
            manyLabel="Sources"
            className="w-40"
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
                <TableHead className="text-[#94A3B8]">Company</TableHead>
                <TableHead className="text-[#94A3B8]">Industry</TableHead>
                <TableHead className="text-[#94A3B8]">Primary Contact</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
                <TableHead className="text-[#94A3B8]">Source</TableHead>
                <TableHead className="text-[#94A3B8]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const pc = primaryContact(c)
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer border-white/8 transition-colors hover:bg-white/5"
                    onClick={() => router.push(`/admin/clients/${c.id}`)}
                  >
                    <TableCell className="font-medium text-white">{c.company_name}</TableCell>
                    <TableCell className="text-[#94A3B8]">{c.industry ?? "—"}</TableCell>
                    <TableCell className="text-[#94A3B8]">{pc ? `${pc.name}${pc.email ? ` (${pc.email})` : ""}` : "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-[#94A3B8] capitalize">{c.source.replace("_", " ")}</TableCell>
                    <TableCell className="text-[#94A3B8]">{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Nothing matches these filters"
          description="Clear the filters to see every client."
        />
      )}
    </div>
  )
}
