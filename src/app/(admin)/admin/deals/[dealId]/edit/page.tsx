import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DealForm from "@/components/admin/pipeline/DealForm"
import PageHeader from "@/components/admin/shared/PageHeader"
import type { Deal } from "@/lib/types"

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ dealId: string }>
}) {
  const { dealId } = await params
  const supabase = await createClient()

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single()

  if (!deal) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Deal" description={deal.title} />
      <DealForm deal={deal as Deal} />
    </div>
  )
}
