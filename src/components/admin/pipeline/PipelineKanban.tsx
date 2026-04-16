"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"
import type { DealWithClient, DealStage } from "@/lib/types"

interface PipelineKanbanProps {
  deals: DealWithClient[]
  onDealClick: (deal: DealWithClient) => void
}

export default function PipelineKanban({ deals, onDealClick }: PipelineKanbanProps) {
  const router = useRouter()
  const [localDeals, setLocalDeals] = useState(deals)

  const dealsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.value] = localDeals.filter((d) => d.stage === stage.value)
    return acc
  }, {} as Record<string, DealWithClient[]>)

  const stageTotal = (stage: string) =>
    dealsByStage[stage]?.reduce((sum, d) => sum + d.value, 0) ?? 0

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return

    const dealId = result.draggableId
    const newStage = result.destination.droppableId as DealStage
    const deal = localDeals.find((d) => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    const oldStage = deal.stage

    // Optimistic update
    setLocalDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    )

    const supabase = createClient()
    const historyEntry = {
      from: oldStage,
      to: newStage,
      timestamp: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("deals")
      .update({
        stage: newStage,
        stage_history: [...(deal.stage_history ?? []), historyEntry],
        ...(newStage === "won" || newStage === "lost"
          ? { actual_close_date: new Date().toISOString().split("T")[0] }
          : {}),
      })
      .eq("id", dealId)

    if (error) {
      // Revert
      setLocalDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: oldStage } : d))
      )
      toast.error("Failed to update deal stage")
      return
    }

    // Auto-create activity
    await supabase.from("activities").insert({
      client_id: deal.client_id,
      deal_id: deal.id,
      type: "status_change",
      title: `Deal moved from ${oldStage} to ${newStage}`,
      description: `"${deal.title}" stage changed`,
      is_auto_generated: true,
    })

    toast.success(`Moved to ${newStage}`)
    router.refresh()
  }, [localDeals, router])

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const isTerminal = stage.value === "won" || stage.value === "lost"
          return (
            <div
              key={stage.value}
              className={`flex w-[280px] shrink-0 flex-col rounded-lg border border-white/8 bg-[#0B1120] ${
                isTerminal ? "opacity-70" : ""
              }`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Badge className={STAGE_COLORS[stage.value]} variant="secondary">
                    {stage.label}
                  </Badge>
                  <span className="text-xs text-[#94A3B8]">{dealsByStage[stage.value]?.length ?? 0}</span>
                </div>
                {stageTotal(stage.value) > 0 && (
                  <span className="text-xs font-medium text-[#94A3B8]">
                    {formatCurrency(stageTotal(stage.value))}
                  </span>
                )}
              </div>

              {/* Cards */}
              <Droppable droppableId={stage.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 p-2 min-h-[80px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-white/5" : ""
                    }`}
                  >
                    {dealsByStage[stage.value]?.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onDealClick(deal)}
                            className={`cursor-pointer rounded-lg border border-white/8 bg-[#1E293B] p-3 transition-shadow ${
                              snapshot.isDragging ? "shadow-lg shadow-black/30" : "hover:border-white/15"
                            }`}
                          >
                            <p className="text-sm font-medium text-white">{deal.title}</p>
                            <p className="mt-0.5 text-xs text-[#94A3B8]">
                              {deal.clients?.company_name ?? "—"}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              {deal.value > 0 && (
                                <span className="text-xs font-medium text-[#10B981]">
                                  {formatCurrency(deal.value)}
                                </span>
                              )}
                              {deal.probability > 0 && (
                                <span className="text-[10px] text-[#94A3B8]">
                                  {deal.probability}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
