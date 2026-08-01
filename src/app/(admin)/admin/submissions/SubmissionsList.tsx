"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Inbox } from "lucide-react"
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

interface Submission {
  id: string
  name: string
  email: string
  company: string | null
  service: string | null
  status: string
  created_at: string
}

const STATUS_META: Record<string, { label: string; dotClassName: string }> = {
  unread: { label: "Unread", dotClassName: "bg-yellow-400" },
  read: { label: "Read", dotClassName: "bg-blue-400" },
  replied: { label: "Replied", dotClassName: "bg-emerald-400" },
  archived: { label: "Archived", dotClassName: "bg-zinc-400" },
}

const STATUS_ORDER = ["unread", "read", "replied", "archived"] as const

const statusColors: Record<string, string> = {
  unread: "bg-yellow-500/10 text-yellow-400",
  read: "bg-blue-500/10 text-blue-400",
  replied: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
]

export default function SubmissionsList({
  submissions,
  initialStatus,
}: {
  submissions: Submission[]
  /** Seeds the status filter so an old `?status=` bookmark still lands filtered. */
  initialStatus?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusSel, setStatusSel] = useState<Set<string>>(() =>
    initialStatus && initialStatus !== "all" ? new Set([initialStatus]) : new Set()
  )
  const [serviceSel, setServiceSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("newest")

  const facets = useMemo<Record<"status" | "service", Facet<Submission>>>(
    () => ({
      status: { values: (s) => s.status, order: STATUS_ORDER, meta: STATUS_META },
      service: { values: (s) => s.service },
    }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: submissions,
        search,
        matchesSearch: (sub, q) =>
          sub.name.toLowerCase().includes(q) ||
          sub.email.toLowerCase().includes(q) ||
          (sub.company?.toLowerCase().includes(q) ?? false),
        facets,
        selected: { status: statusSel, service: serviceSel },
      }),
    [submissions, search, facets, statusSel, serviceSel]
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
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setStatusSel(new Set())
    setServiceSel(new Set())
  }

  return (
    <div className="space-y-4">
      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        summary={filterSummary(visible.length, submissions.length, "submission")}
      >
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, company…"
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
        {options.service.length > 1 && (
          <FilterMultiSelect
            options={options.service}
            selected={active.service}
            onChange={setServiceSel}
            counts={counts.service}
            allLabel="All services"
            manyLabel="Services"
            searchable={options.service.length > 6}
            searchPlaceholder="Search services…"
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
                <TableHead className="text-[#94A3B8]">Company</TableHead>
                <TableHead className="text-[#94A3B8]">Service</TableHead>
                <TableHead className="text-[#94A3B8]">Date</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="cursor-pointer border-white/8 transition-colors hover:bg-white/5"
                  onClick={() => router.push(`/admin/submissions/${sub.id}`)}
                >
                  <TableCell className="font-medium text-white">{sub.name}</TableCell>
                  <TableCell className="text-[#94A3B8]">{sub.email}</TableCell>
                  <TableCell className="text-[#94A3B8]">{sub.company ?? "—"}</TableCell>
                  <TableCell className="text-[#94A3B8]">{sub.service ?? "—"}</TableCell>
                  <TableCell className="text-[#94A3B8]">{formatDate(sub.created_at)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[sub.status] ?? ""} variant="secondary">
                      {sub.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title={submissions.length === 0 ? "No submissions yet" : "Nothing matches these filters"}
          description={
            submissions.length === 0
              ? "Contact form submissions from your website will appear here."
              : "Clear the filters to see every submission."
          }
        />
      )}
    </div>
  )
}
