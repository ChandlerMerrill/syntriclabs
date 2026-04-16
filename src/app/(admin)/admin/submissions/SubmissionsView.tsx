"use client"

import SubmissionsList from "./SubmissionsList"
import { useSubmissions } from "@/hooks/admin/useSubmissions"
import type { Submission } from "@/lib/types"

export default function SubmissionsView({
  initialSubmissions,
  activeStatus,
}: {
  initialSubmissions: Submission[]
  activeStatus: string
}) {
  const { submissions } = useSubmissions(activeStatus, initialSubmissions)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Submissions</h1>
        <p className="text-sm text-[#94A3B8]">Contact form submissions from your website</p>
      </div>
      <SubmissionsList submissions={submissions} activeStatus={activeStatus} />
    </div>
  )
}
