"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Mic, Search, Clock, Users, Loader2, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { useTranscripts } from "@/hooks/admin/useTranscripts"
import type { TranscriptWithClient } from "@/lib/types"

interface TranscriptsListProps {
  initialTranscripts: TranscriptWithClient[]
}

const sentimentStyles: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/20",
  mixed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function TranscriptsList({ initialTranscripts }: TranscriptsListProps) {
  const router = useRouter()
  const { transcripts, mutate } = useTranscripts(initialTranscripts)
  const [search, setSearch] = useState("")
  const [backfilling, setBackfilling] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return transcripts
    const q = search.toLowerCase()
    return transcripts.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.summary?.toLowerCase().includes(q) ||
      t.topics?.some(topic => topic.toLowerCase().includes(q))
    )
  }, [transcripts, search])

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const res = await fetch("/api/fireflies/backfill", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Imported ${data.imported} transcripts (${data.processing} processing)`)
      await mutate()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backfill failed")
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcripts..."
            className="pl-9 border-white/8 bg-[#0B1120] text-white"
          />
        </div>
        <Button
          size="sm"
          onClick={handleBackfill}
          disabled={backfilling}
          className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
        >
          {backfilling ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
          {backfilling ? "Importing..." : "Backfill"}
        </Button>
      </div>

      {/* Transcript cards */}
      {filtered.length === 0 ? (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardContent className="flex flex-col items-center py-16">
            <Mic className="h-10 w-10 text-[#94A3B8]/40" />
            <p className="mt-4 text-sm text-[#94A3B8]">
              {initialTranscripts.length === 0
                ? "No transcripts yet. Configure Fireflies.ai in Settings to get started."
                : "No transcripts match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="border-white/8 bg-[#1E293B] cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => router.push(`/admin/transcripts/${t.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-purple-400 shrink-0" />
                      <h3 className="text-sm font-medium text-white truncate">{t.title}</h3>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-[#94A3B8]">
                      <span>{formatDate(t.date)}</span>
                      {t.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {t.duration_minutes} min
                        </span>
                      )}
                      {t.participants && t.participants.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {t.participants.length}
                        </span>
                      )}
                    </div>
                    {t.summary && (
                      <p className="mt-2 text-xs text-[#94A3B8]/80 line-clamp-2">{t.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {t.processing_status !== "completed" && (
                      <Badge variant="secondary" className={statusStyles[t.processing_status] ?? ""}>
                        {t.processing_status}
                      </Badge>
                    )}
                    {t.sentiment && (
                      <Badge variant="secondary" className={sentimentStyles[t.sentiment] ?? ""}>
                        {t.sentiment}
                      </Badge>
                    )}
                    {t.clients && (
                      <Badge variant="secondary" className="bg-[#334155] text-white text-[10px]">
                        {t.clients.company_name}
                      </Badge>
                    )}
                  </div>
                </div>
                {t.topics && t.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.topics.slice(0, 5).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-[#334155] px-2 py-0.5 text-[10px] text-[#94A3B8]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
