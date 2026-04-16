"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { KnowledgebaseArticle } from "@/lib/types"

const categoryTabs = [
  { value: "all", label: "All" },
  { value: "services", label: "Services" },
  { value: "faq", label: "FAQ" },
  { value: "case_study", label: "Case Study" },
  { value: "process", label: "Process" },
  { value: "about", label: "About" },
]

export default function KBArticlesList({
  articles,
  activeCategory,
}: {
  articles: KnowledgebaseArticle[]
  activeCategory: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = articles.filter((article) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      article.title.toLowerCase().includes(q) ||
      article.content.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs + actions */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-white/8 bg-[#0B1120] p-1">
          {categoryTabs.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/admin/knowledgebase" : `/admin/knowledgebase?category=${tab.value}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === tab.value
                  ? "bg-white/10 text-white"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/8 bg-[#0B1120] pl-9 text-white placeholder:text-[#94A3B8]/50"
          />
        </div>

        <Link href="/admin/knowledgebase/new">
          <Button size="sm" className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border border-white/8">
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-[#94A3B8]">Title</TableHead>
                <TableHead className="text-[#94A3B8]">Category</TableHead>
                <TableHead className="text-[#94A3B8]">Published</TableHead>
                <TableHead className="text-[#94A3B8]">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((article) => (
                <TableRow
                  key={article.id}
                  className="cursor-pointer border-white/8 transition-colors hover:bg-white/5"
                  onClick={() => router.push(`/admin/knowledgebase/${article.id}`)}
                >
                  <TableCell className="font-medium text-white">{article.title}</TableCell>
                  <TableCell className="text-[#94A3B8]">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-xs">
                      {article.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        article.is_published ? "bg-green-400" : "bg-[#94A3B8]/40"
                      }`}
                    />
                  </TableCell>
                  <TableCell className="text-[#94A3B8]">{formatDate(article.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/8 py-16">
          <p className="text-sm text-[#94A3B8]">
            {search ? "No articles match your search." : "No articles yet."}
          </p>
        </div>
      )}
    </div>
  )
}
