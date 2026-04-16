import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DocumentDetail from "./DocumentDetail"
import type { DocumentWithClient } from "@/lib/types"

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from("documents")
    .select("*, clients(id, company_name, client_contacts(*))")
    .eq("id", documentId)
    .single()

  if (!doc) notFound()

  return <DocumentDetail initialDocument={doc as DocumentWithClient} />
}
