import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import DocumentsTable from "./DocumentsTable"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import type { DocumentWithClient } from "@/lib/types"

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: documents } = await supabase
    .from("documents")
    .select("*, clients(id, company_name)")
    .order("created_at", { ascending: false })

  const docs = (documents ?? []) as DocumentWithClient[]

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Manage proposals, contracts, and price sheets">
        <Link href="/admin/documents/new">
          <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
            <Plus className="mr-1.5 h-4 w-4" /> New Document
          </Button>
        </Link>
      </PageHeader>

      {docs.length > 0 ? (
        <DocumentsTable documents={docs} />
      ) : (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Create your first proposal, price sheet, or contract."
          actionLabel="New Document"
          actionHref="/admin/documents/new"
        />
      )}
    </div>
  )
}
