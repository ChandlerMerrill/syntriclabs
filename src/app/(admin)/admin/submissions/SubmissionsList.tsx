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

interface Submission {
  id: string
  name: string
  email: string
  company: string | null
  service: string | null
  status: string
  created_at: string
}

const statusTabs = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
]

const statusColors: Record<string, string> = {
  unread: "bg-yellow-500/10 text-yellow-400",
  read: "bg-blue-500/10 text-blue-400",
  replied: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
}

export default function SubmissionsList({
  submissions,
  activeStatus,
}: {
  submissions: Submission[]
  activeStatus: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = submissions.filter((sub) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      sub.name.toLowerCase().includes(q) ||
      sub.email.toLowerCase().includes(q) ||
      sub.company?.toLowerCase().includes(q)
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
              href={tab.value === "all" ? "/admin/submissions" : `/admin/submissions?status=${tab.value}`}
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
            placeholder="Search by name, email, company..."
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
                <TableHead className="text-[#94A3B8]">Company</TableHead>
                <TableHead className="text-[#94A3B8]">Service</TableHead>
                <TableHead className="text-[#94A3B8]">Date</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/8 py-16">
          <p className="text-sm text-[#94A3B8]">
            {search ? "No submissions match your search." : "No submissions yet."}
          </p>
        </div>
      )}
    </div>
  )
}
