import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SubmissionDetail from "./SubmissionDetail"
import type { Submission } from "@/lib/types"

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single()

  if (!submission) {
    notFound()
  }

  // Auto-mark as read
  if (submission.status === "unread") {
    await supabase
      .from("submissions")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", id)
    submission.status = "read"
    submission.read_at = new Date().toISOString()
  }

  return <SubmissionDetail initialSubmission={submission as Submission} />
}
