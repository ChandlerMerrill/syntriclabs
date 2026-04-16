import { createClient } from "@/lib/supabase/server"
import DocumentsView from "./DocumentsView"
import type { DocumentWithClient } from "@/lib/types"

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: documents } = await supabase
    .from("documents")
    .select("*, clients(id, company_name)")
    .order("created_at", { ascending: false })

  return <DocumentsView initialDocuments={(documents ?? []) as DocumentWithClient[]} />
}
