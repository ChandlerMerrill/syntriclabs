import { createClient } from "@/lib/supabase/server"
import { listSends, listVariants } from "@/lib/marketing/services"
import OutboxView from "./OutboxView"

export default async function MarketingOutboxPage() {
  const supabase = await createClient()

  const [sends, readyVariants] = await Promise.all([
    listSends(supabase).catch(() => []),
    listVariants(supabase, { status: "ready", limit: 50 }).catch(() => []),
  ])

  return (
    <OutboxView
      initialSends={sends}
      readyVariants={readyVariants.map((v) => ({
        id: v.id,
        label: v.label,
        subject: v.subject,
        campaignId: v.campaign_id,
      }))}
    />
  )
}
