"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import SearchInput from "@/components/admin/shared/SearchInput"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatDate } from "@/lib/utils"
import { DOCUMENT_TYPES, DOCUMENT_STATUSES, DOCUMENT_TYPE_COLORS } from "@/lib/constants"
import type { DocumentWithClient } from "@/lib/types"

export default function DocumentsTable({ documents }: { documents: DocumentWithClient[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = documents.filter((d) => {
    if (typeFilter !== "all" && d.type !== typeFilter) return false
    if (statusFilter !== "all" && d.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.title.toLowerCase().includes(q) ||
        d.clients?.company_name?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search documents..."
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-40 border-white/8 bg-[#0B1120] text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="border-white/8 bg-[#1E293B] text-white">
            <SelectItem value="all">All Types</SelectItem>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-36 border-white/8 bg-[#0B1120] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-white/8 bg-[#1E293B] text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            {DOCUMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-white/8">
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
            {filtered.map((doc) => (
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-[#94A3B8]">
                  No documents match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
