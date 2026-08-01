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
  // Unfiltered: the category facet is computed from the rows on screen, so the
  // server handing back a pre-narrowed set would make its counts lie.
  const { data: articles } = await getArticles(supabase, {})

  return <KBArticlesList articles={articles ?? []} initialCategory={params.category} />
}
