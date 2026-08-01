"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import { formatDate } from "@/lib/utils"
import { LEAD_STATUS_COLORS } from "@/lib/constants"
import type { WidgetLead } from "@/lib/types"

const STATUS_META: Record<string, { label: string; dotClassName: string }> = {
  new: { label: "New", dotClassName: "bg-blue-400" },
  contacted: { label: "Contacted", dotClassName: "bg-yellow-400" },
  qualified: { label: "Qualified", dotClassName: "bg-purple-400" },
  converted: { label: "Converted", dotClassName: "bg-emerald-400" },
  dismissed: { label: "Dismissed", dotClassName: "bg-zinc-400" },
}

const STATUS_ORDER = ["new", "contacted", "qualified", "converted", "dismissed"] as const

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
]

const leadName = (lead: WidgetLead) =>
  [lead.first_name, lead.last_name].filter(Boolean).join(" ")

export default function LeadsList({
  leads,
  initialStatus,
}: {
  leads: WidgetLead[]
  /** Seeds the status filter so an old `?status=` bookmark still lands filtered. */
  initialStatus?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(() =>
    initialStatus && initialStatus !== "all" ? new Set([initialStatus]) : new Set()
  )
  const [interestSel, setInterestSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const facets = useMemo<Record<"status" | "interest", Facet<WidgetLead>>>(
    () => ({
      status: { values: (l) => l.status, order: STATUS_ORDER, meta: STATUS_META },
      interest: { values: (l) => l.service_interest },
    }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: leads,
        search,
        matchesSearch: (lead, q) =>
          leadName(lead).toLowerCase().includes(q) ||
          (lead.email?.toLowerCase().includes(q) ?? false) ||
          (lead.organization?.toLowerCase().includes(q) ?? false),
        facets,
        selected: { status: statusSel, interest: interestSel },
      }),
    [leads, search, facets, statusSel, interestSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case "name":
        rows.sort((a, b) => leadName(a).localeCompare(leadName(b)))
        break
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setInterestSel(new Set())
  }

  return (
    <div className="space-y-4">
      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        summary={filterSummary(visible.length, leads.length, "lead")}
      >
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, org…"
        />
        {options.status.length > 1 && (
          <FilterMultiSelect
            options={options.status}
            selected={active.status}
            onChange={setStatusSel}
            counts={counts.status}
            allLabel="All statuses"
            manyLabel="Statuses"
            className="w-44"
          />
        )}
        {options.interest.length > 1 && (
          <FilterMultiSelect
            options={options.interest}
            selected={active.interest}
            onChange={setInterestSel}
            counts={counts.interest}
            allLabel="All interests"
            manyLabel="Interests"
            searchable={options.interest.length > 6}
            searchPlaceholder="Search interests…"
            className="w-48"
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
                <TableHead className="text-[#94A3B8]">Name</TableHead>
                <TableHead className="text-[#94A3B8]">Email</TableHead>
                <TableHead className="text-[#94A3B8]">Organization</TableHead>
                <TableHead className="text-[#94A3B8]">Service Interest</TableHead>
                <TableHead className="text-[#94A3B8]">Date</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer border-white/8 transition-colors hover:bg-white/5"
                  onClick={() => router.push(`/admin/leads/${lead.id}`)}
                >
                  <TableCell className="font-medium text-white">
                    {leadName(lead) || "—"}
                  </TableCell>
                  <TableCell className="text-[#94A3B8]">{lead.email ?? "—"}</TableCell>
                  <TableCell className="text-[#94A3B8]">{lead.organization ?? "—"}</TableCell>
                  <TableCell className="text-[#94A3B8]">{lead.service_interest ?? "—"}</TableCell>
                  <TableCell className="text-[#94A3B8]">{formatDate(lead.created_at)}</TableCell>
                  <TableCell>
                    <Badge className={LEAD_STATUS_COLORS[lead.status] ?? ""} variant="secondary">
                      {lead.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={UserPlus}
          title={leads.length === 0 ? "No leads yet" : "Nothing matches these filters"}
          description={
            leads.length === 0
              ? "Leads captured by the website chat widget will appear here."
              : "Clear the filters to see every lead."
          }
        />
      )}
    </div>
  )
}
