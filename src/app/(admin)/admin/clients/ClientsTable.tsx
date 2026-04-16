"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import SearchInput from "@/components/admin/shared/SearchInput"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatDate } from "@/lib/utils"
import { CLIENT_STATUSES, INDUSTRIES } from "@/lib/constants"
import type { ClientWithContacts } from "@/lib/types"

export default function ClientsTable({ clients }: { clients: ClientWithContacts[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [industryFilter, setIndustryFilter] = useState("all")

  const filtered = clients.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (industryFilter !== "all" && c.industry !== industryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.company_name.toLowerCase().includes(q) ||
        c.client_contacts?.some((cc) => cc.name.toLowerCase().includes(q) || cc.email?.toLowerCase().includes(q))
    }
    return true
  })

  const primaryContact = (c: ClientWithContacts) =>
    c.client_contacts?.find((cc) => cc.is_primary) ?? c.client_contacts?.[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients..."
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-36 border-white/8 bg-[#0B1120] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-white/8 bg-[#1E293B] text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            {CLIENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={industryFilter} onValueChange={(v) => setIndustryFilter(v ?? "all")}>
          <SelectTrigger className="w-44 border-white/8 bg-[#0B1120] text-white">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent className="border-white/8 bg-[#1E293B] text-white">
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map((ind) => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-white/8">
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
            {filtered.map((c) => {
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-[#94A3B8]">
                  No clients match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
