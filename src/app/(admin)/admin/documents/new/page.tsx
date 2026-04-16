import PageHeader from "@/components/admin/shared/PageHeader"
import DocumentForm from "@/components/admin/documents/DocumentForm"

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; deal_id?: string; type?: string }>
}) {
  const { client_id, deal_id, type } = await searchParams

  return (
    <div className="space-y-6">
      <PageHeader title="New Document" description="Generate a proposal, price sheet, or contract" />
      <DocumentForm
        defaultClientId={client_id}
        defaultDealId={deal_id}
        defaultType={type}
      />
    </div>
  )
}
