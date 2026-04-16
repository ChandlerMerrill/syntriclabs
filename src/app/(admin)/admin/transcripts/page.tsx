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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Transcripts</h1>
        <p className="text-sm text-[#94A3B8]">Meeting transcripts from Fireflies.ai with AI-extracted insights</p>
      </div>
      <TranscriptsList initialTranscripts={(transcripts ?? []) as TranscriptWithClient[]} />
    </div>
  )
}
