"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Trash2 } from "lucide-react"
import type { KnowledgebaseArticle, KnowledgebaseCategory } from "@/lib/types"

const categories: { value: KnowledgebaseCategory; label: string }[] = [
  { value: "services", label: "Services" },
  { value: "faq", label: "FAQ" },
  { value: "case_study", label: "Case Study" },
  { value: "process", label: "Process" },
  { value: "about", label: "About" },
]

export default function KBArticleForm({ article }: { article?: KnowledgebaseArticle }) {
  const router = useRouter()
  const isEdit = !!article

  const [title, setTitle] = useState(article?.title ?? "")
  const [category, setCategory] = useState<KnowledgebaseCategory>(article?.category ?? "faq")
  const [content, setContent] = useState(article?.content ?? "")
  const [isPublished, setIsPublished] = useState(article?.is_published ?? true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required")
      return
    }

    setSaving(true)
    const body = { title: title.trim(), category, content: content.trim(), is_published: isPublished }

    const res = isEdit
      ? await fetch(`/api/knowledgebase/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/knowledgebase/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

    setSaving(false)

    if (!res.ok) {
      toast.error("Failed to save article")
      return
    }

    toast.success(isEdit ? "Article updated" : "Article created")
    router.push("/admin/knowledgebase")
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm("Delete this article? This cannot be undone.")) return

    setDeleting(true)
    const res = await fetch(`/api/knowledgebase/articles/${article!.id}`, {
      method: "DELETE",
    })
    setDeleting(false)

    if (!res.ok) {
      toast.error("Failed to delete article")
      return
    }

    toast.success("Article deleted")
    router.push("/admin/knowledgebase")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/admin/knowledgebase"
        className="flex items-center gap-1.5 text-sm text-[#94A3B8] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Knowledge Base
      </Link>

      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#94A3B8]">Article Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as KnowledgebaseCategory)}>
              <SelectTrigger className="w-48 border-white/8 bg-[#0B1120] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/8 bg-[#1E293B] text-white">
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Article content..."
              rows={12}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isPublished ? "bg-[#8B5CF6]" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isPublished ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <Label className="text-sm text-white">Published</Label>
            <span className="text-xs text-[#94A3B8]">
              {isPublished ? "Visible to widget assistant" : "Hidden from widget assistant"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {isEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Article"}
        </Button>
      </div>
    </div>
  )
}
