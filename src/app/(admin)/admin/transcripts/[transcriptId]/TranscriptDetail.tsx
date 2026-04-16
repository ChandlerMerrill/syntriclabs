"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft, RefreshCw, ExternalLink, Link2, ChevronDown, Users, Clock,
  CheckCircle2, Loader2,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { TranscriptWithClient } from "@/lib/types"

const sentimentStyles: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/20",
  mixed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

export default function TranscriptDetail({ transcript: initial }: { transcript: TranscriptWithClient }) {
  const router = useRouter()
  const [transcript, setTranscript] = useState(initial)
  const [reprocessing, setReprocessing] = useState(false)
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [linking, setLinking] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  async function handleReprocess() {
    setReprocessing(true)
    try {
      const res = await fetch("/api/fireflies/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firefliesId: transcript.fireflies_id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Reprocessing started — refresh in a moment to see results")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reprocessing failed")
    } finally {
      setReprocessing(false)
    }
  }

  async function loadClients() {
    const supabase = createClient()
    const { data } = await supabase.from("clients").select("id, company_name").order("company_name")
    setClients(data ?? [])
  }

  async function handleLink() {
    if (!selectedClientId) return
    setLinking(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("transcripts")
        .update({ client_id: selectedClientId })
        .eq("id", transcript.id)
      if (error) throw error
      toast.success("Transcript linked to client")
      router.refresh()
    } catch {
      toast.error("Failed to link transcript")
    } finally {
      setLinking(false)
    }
  }

  const participants = transcript.participants as { name: string; email: string }[] | null
  const actionItems = transcript.action_items as { text: string; assignee?: string; due_date?: string }[] | null
  const keyDecisions = transcript.key_decisions as string[] | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/transcripts" className="mb-2 flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Transcripts
          </Link>
          <h1 className="text-2xl font-semibold text-white">{transcript.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#94A3B8]">
            <span>{formatDate(transcript.date)}</span>
            {transcript.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {transcript.duration_minutes} min
              </span>
            )}
            {participants && participants.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {participants.length} participants
              </span>
            )}
            {transcript.sentiment && (
              <Badge variant="secondary" className={sentimentStyles[transcript.sentiment] ?? ""}>
                {transcript.sentiment}
              </Badge>
            )}
            {transcript.clients && (
              <Badge variant="secondary" className="bg-[#334155] text-white">
                {transcript.clients.company_name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReprocess}
            disabled={reprocessing}
            className="border-white/8 text-[#94A3B8] hover:text-white"
          >
            {reprocessing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Reprocess
          </Button>
          {transcript.fireflies_url && (
            <a href={transcript.fireflies_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-white/8 text-[#94A3B8] hover:text-white">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Fireflies
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Link to client */}
      {!transcript.client_id && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <Link2 className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-400">Unlinked transcript</span>
          <Select
            value={selectedClientId}
            onValueChange={(val) => setSelectedClientId(val ?? "")}
            onOpenChange={(open) => { if (open && clients.length === 0) loadClients() }}
          >
            <SelectTrigger className="h-8 w-[200px] border-white/8 bg-[#0B1120] text-sm text-white">
              <SelectValue placeholder="Select client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleLink}
            disabled={!selectedClientId || linking}
            className="h-8 bg-amber-600 text-white hover:bg-amber-500"
          >
            {linking ? "Linking..." : "Link"}
          </Button>
        </div>
      )}

      {/* Processing status for non-completed */}
      {transcript.processing_status !== "completed" && (
        <Card className="border-white/8 bg-[#1E293B]">
          <CardContent className="p-4">
            <Badge variant="secondary" className={
              transcript.processing_status === "pending" ? "bg-amber-500/10 text-amber-400" :
              transcript.processing_status === "processing" ? "bg-blue-500/10 text-blue-400" :
              "bg-red-500/10 text-red-400"
            }>
              {transcript.processing_status}
            </Badge>
            {transcript.processing_error && (
              <p className="mt-2 text-sm text-red-400">{transcript.processing_error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Summary */}
        {transcript.summary && (
          <Card className="border-white/8 bg-[#1E293B] lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#94A3B8]">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-white/90 leading-relaxed">{transcript.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Items */}
        {actionItems && actionItems.length > 0 && (
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#94A3B8]">Action Items ({actionItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-[#0B1120] p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm text-white">{item.text}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#94A3B8]">
                      {item.assignee && <span>Assignee: {item.assignee}</span>}
                      {item.due_date && <span>Due: {item.due_date}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Key Decisions */}
        {keyDecisions && keyDecisions.length > 0 && (
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#94A3B8]">Key Decisions ({keyDecisions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {keyDecisions.map((decision, i) => (
                <div key={i} className="rounded-lg bg-[#0B1120] p-3">
                  <p className="text-sm text-white">{decision}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        {participants && participants.length > 0 && (
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#94A3B8]">Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Users className="h-3.5 w-3.5 text-[#94A3B8]" />
                  <span className="text-white">{p.name || p.email}</span>
                  {p.email && p.name && <span className="text-xs text-[#94A3B8]">{p.email}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Topics */}
        {transcript.topics && transcript.topics.length > 0 && (
          <Card className="border-white/8 bg-[#1E293B]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#94A3B8]">Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {transcript.topics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="bg-[#334155] text-white text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Raw Transcript (collapsible) */}
      {transcript.raw_transcript && (
        <Card className="border-white/8 bg-[#1E293B]">
          <button className="w-full" onClick={() => setTranscriptOpen(!transcriptOpen)}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm text-[#94A3B8]">Raw Transcript</CardTitle>
              <ChevronDown className={`h-4 w-4 text-[#94A3B8] transition-transform ${transcriptOpen ? "rotate-180" : ""}`} />
            </CardHeader>
          </button>
          {transcriptOpen && (
            <CardContent>
              <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap text-xs text-white/80 font-mono leading-relaxed">
                {transcript.raw_transcript}
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
