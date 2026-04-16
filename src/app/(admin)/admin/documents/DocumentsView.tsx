"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Plus } from "lucide-react"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import DocumentsTable from "./DocumentsTable"
import { useDocuments } from "@/hooks/admin/useDocuments"
import type { DocumentWithClient } from "@/lib/types"

export default function DocumentsView({
  initialDocuments,
}: {
  initialDocuments: DocumentWithClient[]
}) {
  const { documents } = useDocuments(initialDocuments)

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Manage proposals, contracts, and price sheets">
        <Link href="/admin/documents/new">
          <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
            <Plus className="mr-1.5 h-4 w-4" /> New Document
          </Button>
        </Link>
      </PageHeader>

      {documents.length > 0 ? (
        <DocumentsTable documents={documents} />
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
