"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { LEAD_STATUS_COLORS } from "@/lib/constants"
import type { WidgetLead } from "@/lib/types"

const statusTabs = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "dismissed", label: "Dismissed" },
]

export default function LeadsList({
  leads,
  activeStatus,
}: {
  leads: WidgetLead[]
  activeStatus: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = leads.filter((lead) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.toLowerCase()
    return (
      name.includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.organization?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
          {statusTabs.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/admin/leads" : `/admin/leads?status=${tab.value}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeStatus === tab.value
                  ? "bg-white/10 text-white"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            placeholder="Search by name, email, org..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/8 bg-[#0B1120] pl-9 text-white placeholder:text-[#94A3B8]/50"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border border-white/8">
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
              {filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer border-white/8 transition-colors hover:bg-white/5"
                  onClick={() => router.push(`/admin/leads/${lead.id}`)}
                >
                  <TableCell className="font-medium text-white">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/8 py-16">
          <p className="text-sm text-[#94A3B8]">
            {search ? "No leads match your search." : "No leads yet."}
          </p>
        </div>
      )}
    </div>
  )
}
