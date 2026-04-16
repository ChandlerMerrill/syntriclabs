import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Building2 } from "lucide-react"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import ClientsTable from "./ClientsTable"

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from("clients")
    .select("*, client_contacts(*)")
    .order("company_name")

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your client relationships">
        <Link href="/admin/clients/new">
          <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
            <Plus className="mr-1.5 h-4 w-4" /> Add Client
          </Button>
        </Link>
      </PageHeader>

      {clients && clients.length > 0 ? (
        <ClientsTable clients={clients} />
      ) : (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add your first client to start tracking relationships."
          actionLabel="Add Client"
          actionHref="/admin/clients/new"
        />
      )}
    </div>
  )
}
