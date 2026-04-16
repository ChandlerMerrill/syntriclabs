"use client"

import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { DealWithClient } from "@/lib/types"

export default function PipelineList({
  deals,
  onDealClick,
}: {
  deals: DealWithClient[]
  onDealClick: (deal: DealWithClient) => void
}) {
  return (
    <div className="rounded-lg border border-white/8">
      <Table>
        <TableHeader>
          <TableRow className="border-white/8 hover:bg-transparent">
            <TableHead className="text-[#94A3B8]">Title</TableHead>
            <TableHead className="text-[#94A3B8]">Client</TableHead>
            <TableHead className="text-[#94A3B8]">Stage</TableHead>
            <TableHead className="text-[#94A3B8]">Value</TableHead>
            <TableHead className="text-[#94A3B8]">Probability</TableHead>
            <TableHead className="text-[#94A3B8]">Expected Close</TableHead>
            <TableHead className="text-[#94A3B8]">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow
              key={deal.id}
              className="cursor-pointer border-white/8 hover:bg-white/5"
              onClick={() => onDealClick(deal)}
            >
              <TableCell className="font-medium text-white">{deal.title}</TableCell>
              <TableCell className="text-[#94A3B8]">{deal.clients?.company_name ?? "—"}</TableCell>
              <TableCell><StatusBadge status={deal.stage} variant="stage" /></TableCell>
              <TableCell className="text-white">{deal.value > 0 ? formatCurrency(deal.value) : "—"}</TableCell>
              <TableCell className="text-[#94A3B8]">{deal.probability}%</TableCell>
              <TableCell className="text-[#94A3B8]">
                {deal.expected_close_date ? formatDate(deal.expected_close_date) : "—"}
              </TableCell>
              <TableCell className="text-[#94A3B8]">{formatDate(deal.updated_at)}</TableCell>
            </TableRow>
          ))}
          {deals.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-[#94A3B8]">
                No deals in the pipeline yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
