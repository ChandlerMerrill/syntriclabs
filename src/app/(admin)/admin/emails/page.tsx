import { createClient } from "@/lib/supabase/server"
import EmailsInbox from "./EmailsInbox"

export default async function EmailsPage() {
  const supabase = await createClient()

  // Fetch initial threads — group by gmail_thread_id, get latest per thread
  const { data: emails } = await supabase
    .from("emails")
    .select("*, clients(id, company_name)")
    .order("internal_date", { ascending: false })
    .limit(200)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Emails</h1>
        <p className="text-sm text-[#94A3B8]">Gmail inbox synced to your CRM</p>
      </div>
      <EmailsInbox initialEmails={emails ?? []} />
    </div>
  )
}
