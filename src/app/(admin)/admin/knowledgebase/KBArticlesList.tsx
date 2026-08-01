"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDown, BookOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import PageHeader from "@/components/admin/shared/PageHeader"
import EmptyState from "@/components/admin/shared/EmptyState"
import FilterBar from "@/components/admin/shared/FilterBar"
import FilterSearch from "@/components/admin/shared/FilterSearch"
import FilterSelect from "@/components/admin/shared/FilterSelect"
import FilterMultiSelect from "@/components/admin/shared/FilterMultiSelect"
import { facetedList, filterSummary, type Facet } from "@/components/admin/shared/faceted"
import { formatDate } from "@/lib/utils"
import type { KnowledgebaseArticle } from "@/lib/types"

const CATEGORY_ORDER = ["services", "faq", "case_study", "process", "about"] as const
const CATEGORY_META: Record<string, { label: string }> = {
  services: { label: "Services" },
  faq: { label: "FAQ" },
  case_study: { label: "Case Study" },
  process: { label: "Process" },
  about: { label: "About" },
}

const PUBLISHED_META: Record<string, { label: string; dotClassName: string }> = {
  published: { label: "Published", dotClassName: "bg-emerald-400" },
  draft: { label: "Draft", dotClassName: "bg-white/30" },
}

const SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "title", label: "Title A–Z" },
]

export default function KBArticlesList({
  articles,
  initialCategory,
}: {
  articles: KnowledgebaseArticle[]
  /** Seeds the category filter so an old `?category=` bookmark still lands filtered. */
  initialCategory?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [categorySel, setCategorySel] = useState<Set<string>>(() =>
    initialCategory && initialCategory !== "all" ? new Set([initialCategory]) : new Set()
  )
  const [publishedSel, setPublishedSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState("updated")

  const facets = useMemo<Record<"category" | "published", Facet<KnowledgebaseArticle>>>(
    () => ({
      category: { values: (a) => a.category, order: CATEGORY_ORDER, meta: CATEGORY_META },
      published: {
        values: (a) => (a.is_published ? "published" : "draft"),
        order: ["published", "draft"],
        meta: PUBLISHED_META,
      },
    }),
    []
  )

  const { options, counts, active, visible, filtersActive } = useMemo(
    () =>
      facetedList({
        rows: articles,
        search,
        matchesSearch: (a, q) =>
          a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q),
        facets,
        selected: { category: categorySel, published: publishedSel },
      }),
    [articles, search, facets, categorySel, publishedSel]
  )

  const sorted = useMemo(() => {
    const rows = [...visible]
    switch (sort) {
      case "created":
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case "title":
        rows.sort((a, b) => a.title.localeCompare(b.title))
        break
      default:
        rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    }
    return rows
  }, [visible, sort])

  function clearFilters() {
    setSearch("")
    setCategorySel(new Set())
    setPublishedSel(new Set())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Manage articles for the widget assistant"
      >
        <Link href="/admin/knowledgebase/new">
          <Button size="sm" className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Article
          </Button>
        </Link>
      </PageHeader>

      {articles.length > 0 && (
        <FilterBar
          active={filtersActive}
          onClear={clearFilters}
          summary={filterSummary(visible.length, articles.length, "article")}
        >
          <FilterSearch value={search} onChange={setSearch} placeholder="Search articles…" />
          {options.category.length > 1 && (
            <FilterMultiSelect
              options={options.category}
              selected={active.category}
              onChange={setCategorySel}
              counts={counts.category}
              allLabel="All categories"
              manyLabel="Categories"
              className="w-44"
            />
          )}
          {options.published.length > 1 && (
            <FilterMultiSelect
              options={options.published}
              selected={active.published}
              onChange={setPublishedSel}
              counts={counts.published}
              allLabel="Any state"
              manyLabel="States"
              className="w-40"
            />
          )}
          <FilterSelect
            options={SORTS}
            value={sort}
            onChange={setSort}
            label="Sort"
            icon={ArrowUpDown}
            className="w-52"
          />
        </FilterBar>
      )}

      {sorted.length > 0 ? (
        <div className="rounded-xl border border-white/8">
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
              {sorted.map((article) => (
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
        <EmptyState
          icon={BookOpen}
          title={articles.length === 0 ? "No articles yet" : "Nothing matches these filters"}
          description={
            articles.length === 0
              ? "Write the first article the widget assistant can draw on."
              : "Clear the filters to see every article."
          }
          actionLabel={articles.length === 0 ? "New Article" : undefined}
          actionHref={articles.length === 0 ? "/admin/knowledgebase/new" : undefined}
        />
      )}
    </div>
  )
}
