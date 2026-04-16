import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import TranscriptDetail from "./TranscriptDetail"
import type { TranscriptWithClient } from "@/lib/types"

export default async function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ transcriptId: string }>
}) {
  const { transcriptId } = await params
  const supabase = await createClient()

  const { data: transcript } = await supabase
    .from("transcripts")
    .select("*, clients(id, company_name)")
    .eq("id", transcriptId)
    .single()

  if (!transcript) notFound()

  return <TranscriptDetail transcript={transcript as TranscriptWithClient} />
}
