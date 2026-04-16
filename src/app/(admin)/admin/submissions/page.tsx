import { createClient } from "@/lib/supabase/server"
import SubmissionsView from "./SubmissionsView"
import type { Submission } from "@/lib/types"

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeStatus = status || "all"
  const supabase = await createClient()

  let query = supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data: submissions } = await query

  return (
    <SubmissionsView
      initialSubmissions={(submissions ?? []) as Submission[]}
      activeStatus={activeStatus}
    />
  )
}
