import { createClient } from "@/lib/supabase/server"
import ClientsView from "./ClientsView"
import type { ClientWithContacts } from "@/lib/types"

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from("clients")
    .select("*, client_contacts(*)")
    .order("company_name")

  return <ClientsView initialClients={(clients ?? []) as ClientWithContacts[]} />
}
