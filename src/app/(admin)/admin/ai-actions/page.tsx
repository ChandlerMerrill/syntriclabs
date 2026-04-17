import { createServiceClient } from "@/lib/supabase/server"
import { listAIActions, listDistinctToolNames } from "@/lib/services/ai-actions"
import PageHeader from "@/components/admin/shared/PageHeader"
import AIActionsView from "./AIActionsView"

export const dynamic = "force-dynamic"

type SearchParams = {
  range?: string
  from?: string
  to?: string
  tool?: string
  status?: string
  conversation?: string
  page?: string
}

function resolveRange(range: string | undefined, from?: string, to?: string) {
  const now = new Date()
  if (range === "custom" && from && to) return { from, to }
  const ms: Record<string, number> = { "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000 }
  const key = range && ms[range] ? range : "24h"
  const start = new Date(now.getTime() - ms[key])
  return { from: start.toISOString(), to: now.toISOString() }
}

export default async function AIActionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { from, to } = resolveRange(params.range, params.from, params.to)
  const supabase = await createServiceClient()
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const pageSize = 50

  const [{ data: actions, count }, toolNames] = await Promise.all([
    listAIActions(supabase, {
      from,
      to,
      toolName: params.tool,
      status: params.status === "success" || params.status === "error" ? params.status : undefined,
      conversationId: params.conversation,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    listDistinctToolNames(supabase),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Actions"
        description="Every tool call Claude makes — from Telegram, admin chat, and the playground. Filter, inspect, and undo."
      />
      <AIActionsView
        actions={actions}
        totalCount={count}
        page={page}
        pageSize={pageSize}
        toolNames={toolNames}
        activeRange={params.range ?? "24h"}
        activeTool={params.tool ?? ""}
        activeStatus={params.status ?? "all"}
        activeConversation={params.conversation ?? ""}
        customFrom={params.from ?? ""}
        customTo={params.to ?? ""}
      />
    </div>
  )
}
