"use client"

import PageHeader from "@/components/admin/shared/PageHeader"
import SubmissionsList from "./SubmissionsList"
import { useSubmissions } from "@/hooks/admin/useSubmissions"
import type { Submission } from "@/lib/types"

export default function SubmissionsView({
  initialSubmissions,
  initialStatus,
}: {
  initialSubmissions: Submission[]
  initialStatus?: string
}) {
  // Every submission, filtered in the browser — the counts on each filter are
  // only honest if the whole set is in hand.
  const { submissions } = useSubmissions(undefined, initialSubmissions)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="Contact form submissions from your website"
      />
      <SubmissionsList submissions={submissions} initialStatus={initialStatus} />
    </div>
  )
}
