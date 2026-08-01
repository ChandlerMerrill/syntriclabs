import { createClient } from "@/lib/supabase/server"
import TranscriptsList from "./TranscriptsList"
import type { TranscriptWithClient } from "@/lib/types"

export default async function TranscriptsPage() {
  const supabase = await createClient()

  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("*, clients(id, company_name)")
    .order("date", { ascending: false })
    .limit(100)

  // The header lives inside the list — it owns the Backfill action.
  return <TranscriptsList initialTranscripts={(transcripts ?? []) as TranscriptWithClient[]} />
}
