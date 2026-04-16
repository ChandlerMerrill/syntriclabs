import { createClient } from "@/lib/supabase/server"
import SubmissionsList from "./SubmissionsList"

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Submissions</h1>
        <p className="text-sm text-[#94A3B8]">Contact form submissions from your website</p>
      </div>
      <SubmissionsList
        submissions={submissions ?? []}
        activeStatus={status || "all"}
      />
    </div>
  )
}
