import KBArticleForm from "../[id]/KBArticleForm"

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Article</h1>
        <p className="text-sm text-[#94A3B8]">Create a new knowledge base article</p>
      </div>
      <KBArticleForm />
    </div>
  )
}
