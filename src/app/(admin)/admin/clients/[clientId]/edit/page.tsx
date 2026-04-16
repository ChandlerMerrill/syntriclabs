import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ClientForm from "@/components/admin/clients/ClientForm"
import PageHeader from "@/components/admin/shared/PageHeader"
import type { ClientWithContacts } from "@/lib/types"

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("clients")
    .select("*, client_contacts(*)")
    .eq("id", clientId)
    .single()

  if (!client) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Client" description={client.company_name} />
      <ClientForm client={client as ClientWithContacts} />
    </div>
  )
}
