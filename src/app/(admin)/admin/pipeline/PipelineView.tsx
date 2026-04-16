"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid, List } from "lucide-react"
import PageHeader from "@/components/admin/shared/PageHeader"
import PipelineKanban from "@/components/admin/pipeline/PipelineKanban"
import PipelineList from "@/components/admin/pipeline/PipelineList"
import DealDetailPanel from "@/components/admin/pipeline/DealDetailPanel"
import type { DealWithClient, DocumentWithClient } from "@/lib/types"

export default function PipelineView({ deals }: { deals: DealWithClient[] }) {
  const [view, setView] = useState<"kanban" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pipeline-view") as "kanban" | "list") ?? "kanban"
    }
    return "kanban"
  })
  const [selectedDeal, setSelectedDeal] = useState<DealWithClient | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [dealDocuments, setDealDocuments] = useState<DocumentWithClient[]>([])

  const toggleView = (v: "kanban" | "list") => {
    setView(v)
    if (typeof window !== "undefined") {
      localStorage.setItem("pipeline-view", v)
    }
  }

  useEffect(() => {
    if (!selectedDeal) {
      setDealDocuments([])
      return
    }
    const supabase = createClient()
    supabase
      .from("documents")
      .select("*, clients(id, company_name)")
      .eq("deal_id", selectedDeal.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDealDocuments((data ?? []) as DocumentWithClient[]))
  }, [selectedDeal])

  const handleDealClick = (deal: DealWithClient) => {
    setSelectedDeal(deal)
    setPanelOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pipeline" description="Track and manage your deals">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/8 bg-[#0B1120] p-0.5">
            <button
              onClick={() => toggleView("kanban")}
              className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                view === "kanban" ? "bg-white/10 text-white" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleView("list")}
              className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                view === "list" ? "bg-white/10 text-white" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link href="/admin/deals/new">
            <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
              <Plus className="mr-1.5 h-4 w-4" /> Add Deal
            </Button>
          </Link>
        </div>
      </PageHeader>

      {view === "kanban" ? (
        <PipelineKanban deals={deals} onDealClick={handleDealClick} />
      ) : (
        <PipelineList deals={deals} onDealClick={handleDealClick} />
      )}

      <DealDetailPanel
        deal={selectedDeal}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        documents={dealDocuments}
      />
    </div>
  )
}
