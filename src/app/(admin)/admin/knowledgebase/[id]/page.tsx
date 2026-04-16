import { createClient } from "@/lib/supabase/server"
import { getArticle } from "@/lib/services/knowledgebase"
import { notFound } from "next/navigation"
import KBArticleForm from "./KBArticleForm"

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: article } = await getArticle(supabase, id)

  if (!article) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Edit Article</h1>
        <p className="text-sm text-[#94A3B8]">Update knowledge base article</p>
      </div>
      <KBArticleForm article={article} />
    </div>
  )
}
