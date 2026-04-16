"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import SearchInput from "@/components/admin/shared/SearchInput"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { ProjectWithClient } from "@/lib/types"

export default function ProjectsTable({ projects }: { projects: ProjectWithClient[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = projects.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.clients?.company_name?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." className="w-64" />
      <div className="rounded-lg border border-white/8">
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
            {filtered.map((p) => (
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-[#94A3B8]">No projects match your search.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
