import { createClient } from "@/lib/supabase/server"
import { getConversations } from "@/lib/services/messages"
import PageHeader from "@/components/admin/shared/PageHeader"
import MessagesInbox from "./MessagesInbox"

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: conversations } = await getConversations(supabase, { archived: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="All conversations across admin chat and Telegram"
      />
      <MessagesInbox initialConversations={conversations ?? []} />
    </div>
  )
}
