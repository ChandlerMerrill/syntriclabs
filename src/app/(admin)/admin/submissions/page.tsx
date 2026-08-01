import { createClient } from "@/lib/supabase/server"
import SubmissionsView from "./SubmissionsView"
import type { Submission } from "@/lib/types"

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  // Unfiltered: the status facet is computed from the rows on screen, so the
  // server handing back a pre-narrowed set would make its counts lie.
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <SubmissionsView
      initialSubmissions={(submissions ?? []) as Submission[]}
      initialStatus={status}
    />
  )
}
