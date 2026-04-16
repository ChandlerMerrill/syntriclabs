import { createClient } from "@/lib/supabase/server"
import { getArticles } from "@/lib/services/knowledgebase"
import KBArticlesList from "./KBArticlesList"

export default async function KnowledgebasePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: articles } = await getArticles(supabase, {
    category: params.category,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Knowledge Base</h1>
        <p className="text-sm text-[#94A3B8]">Manage articles for the widget assistant</p>
      </div>
      <KBArticlesList articles={articles ?? []} activeCategory={params.category ?? "all"} />
    </div>
  )
}
