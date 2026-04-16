"use client"

import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils"
import { Edit, Building2, FolderKanban, Clock, FileText } from "lucide-react"
import { STAGE_COLORS } from "@/lib/constants"
import type { DealWithClient, DocumentWithClient } from "@/lib/types"

interface DealDetailPanelProps {
  deal: DealWithClient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  documents?: DocumentWithClient[]
}

export default function DealDetailPanel({ deal, open, onOpenChange, documents = [] }: DealDetailPanelProps) {
  if (!deal) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-white/8 bg-[#1E293B] text-white w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-white">{deal.title}</SheetTitle>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={deal.stage} variant="stage" />
                {deal.value > 0 && (
                  <span className="text-sm font-medium text-[#10B981]">
                    {formatCurrency(deal.value)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Quick info */}
          <div className="space-y-2 text-sm">
            {deal.clients && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#94A3B8]" />
                <Link href={`/admin/clients/${deal.clients.id}`} className="text-[#60A5FA] hover:underline">
                  {deal.clients.company_name}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <span>Probability:</span>
              <span className="text-white">{deal.probability}%</span>
            </div>
            {deal.expected_close_date && (
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <span>Expected close:</span>
                <span className="text-white">{formatDate(deal.expected_close_date)}</span>
              </div>
            )}
            {deal.actual_close_date && (
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <span>Closed:</span>
                <span className="text-white">{formatDate(deal.actual_close_date)}</span>
              </div>
            )}
            {deal.lost_reason && (
              <div className="text-[#94A3B8]">
                <span>Lost reason:</span>
                <p className="mt-0.5 text-white">{deal.lost_reason}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {deal.notes && (
            <div>
              <p className="text-xs font-medium text-[#94A3B8]">Notes</p>
              <p className="mt-1 text-sm text-white whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}

          {/* Stage History */}
          {deal.stage_history?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#94A3B8] mb-2">Stage History</p>
              <div className="space-y-2">
                {[...deal.stage_history].reverse().map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-[#94A3B8]" />
                    <span className="text-[#94A3B8]">
                      {entry.from ? (
                        <>
                          <Badge className={`${STAGE_COLORS[entry.from]} text-[10px] px-1`} variant="secondary">
                            {entry.from}
                          </Badge>
                          {" → "}
                        </>
                      ) : "Created as "}
                      <Badge className={`${STAGE_COLORS[entry.to]} text-[10px] px-1`} variant="secondary">
                        {entry.to}
                      </Badge>
                    </span>
                    <span className="ml-auto text-[#94A3B8]">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <p className="text-xs font-medium text-[#94A3B8] mb-2">Documents</p>
            {documents.length > 0 ? (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/admin/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-lg bg-[#0B1120] p-2.5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span className="text-white">{doc.title}</span>
                    </div>
                    <StatusBadge status={doc.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No documents linked.</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <Link href={`/admin/documents/new?client_id=${deal.client_id}&deal_id=${deal.id}&type=proposal`}>
              <Button variant="outline" size="sm" className="w-full border-white/8 text-[#94A3B8] hover:text-white">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Generate Proposal
              </Button>
            </Link>
            <Link href={`/admin/deals/${deal.id}/edit`}>
              <Button size="sm" className="w-full bg-[#2563EB] text-white hover:bg-[#3B82F6]">
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Deal
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
