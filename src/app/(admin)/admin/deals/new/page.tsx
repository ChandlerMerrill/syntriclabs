import DealForm from "@/components/admin/pipeline/DealForm"
import PageHeader from "@/components/admin/shared/PageHeader"

export default function NewDealPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Deal" description="Add a deal to the pipeline" />
      <DealForm />
    </div>
  )
}
