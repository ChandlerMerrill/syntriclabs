"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Building2, FolderKanban, GitBranch, Clock, X } from "lucide-react"

interface SearchResult {
  entity_type: string
  entity_id: string
  content: string
  similarity: number
  details: Record<string, unknown>
}

const ENTITY_CONFIG: Record<string, { icon: typeof Building2; label: string; color: string; getHref: (id: string) => string; getName: (d: Record<string, unknown>) => string }> = {
  client: {
    icon: Building2,
    label: "Client",
    color: "text-blue-400",
    getHref: (id) => `/admin/clients/${id}`,
    getName: (d) => (d.company_name as string) ?? "Unknown",
  },
  project: {
    icon: FolderKanban,
    label: "Project",
    color: "text-purple-400",
    getHref: (id) => `/admin/projects/${id}`,
    getName: (d) => (d.name as string) ?? "Unknown",
  },
  deal: {
    icon: GitBranch,
    label: "Deal",
    color: "text-green-400",
    getHref: (id) => `/admin/pipeline`,
    getName: (d) => (d.title as string) ?? "Unknown",
  },
  activity: {
    icon: Clock,
    label: "Activity",
    color: "text-amber-400",
    getHref: () => `/admin`,
    getName: (d) => (d.title as string) ?? "Unknown",
  },
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout>(null)

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setSelectedIndex(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const navigate = (result: SearchResult) => {
    const config = ENTITY_CONFIG[result.entity_type]
    if (config) {
      router.push(config.getHref(result.entity_id))
      setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B] shadow-2xl">
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
                <Search className="h-4 w-4 text-[#94A3B8]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search clients, projects, deals..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[#94A3B8]/60 focus:outline-none"
                />
                <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[#94A3B8] sm:inline">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto">
                {loading && (
                  <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">Searching...</div>
                )}
                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">No results found.</div>
                )}
                {!loading && results.map((r, i) => {
                  const config = ENTITY_CONFIG[r.entity_type]
                  if (!config) return null
                  const Icon = config.icon
                  return (
                    <button
                      key={`${r.entity_type}-${r.entity_id}`}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === selectedIndex ? "bg-white/8" : "hover:bg-white/5"
                      }`}
                      onClick={() => navigate(r)}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {config.getName(r.details)}
                        </p>
                        <p className="truncate text-xs text-[#94A3B8]">
                          {config.label}
                          {r.similarity > 0 && ` · ${Math.round(r.similarity * 100)}% match`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              {results.length > 0 && (
                <div className="border-t border-white/8 px-4 py-2 text-[10px] text-[#94A3B8]">
                  <kbd className="rounded bg-white/10 px-1 py-0.5">↑↓</kbd> navigate
                  <span className="mx-2">·</span>
                  <kbd className="rounded bg-white/10 px-1 py-0.5">↵</kbd> open
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
