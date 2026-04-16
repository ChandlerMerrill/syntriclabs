"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Mic, CheckCircle2, XCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

interface GmailStatus {
  connected: boolean
  email: string | null
  lastSync: string | null
}

export default function SettingsPage() {
  const { data: gmailStatus, isLoading: gmailLoading, mutate: mutateGmail } = useSWR<GmailStatus>("/api/gmail/status")
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [backfilling, setBackfilling] = useState(false)

  useEffect(() => {
    // Check for OAuth callback result
    const params = new URLSearchParams(window.location.search)
    const gmailResult = params.get("gmail")
    if (gmailResult === "connected") {
      toast.success("Gmail connected successfully!")
      window.history.replaceState({}, "", "/admin/settings")
      mutateGmail()
    } else if (gmailResult === "error") {
      toast.error(`Gmail connection failed: ${params.get("message") || "Unknown error"}`)
      window.history.replaceState({}, "", "/admin/settings")
    }
  }, [mutateGmail])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Synced ${data.synced} emails (${data.matched} matched to clients)`)
      mutateGmail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/gmail/disconnect", { method: "POST" })
      if (!res.ok) throw new Error("Failed to disconnect")
      toast.success("Gmail disconnected")
      mutateGmail({ connected: false, email: null, lastSync: null }, { revalidate: false })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect")
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const res = await fetch("/api/fireflies/backfill", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Backfill complete: ${data.imported} transcripts imported, ${data.processing} processing`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backfill failed")
    } finally {
      setBackfilling(false)
    }
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/fireflies/webhook`
    : "/api/fireflies/webhook"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-[#94A3B8]">Integrations and configuration</p>
      </div>

      {/* Gmail Integration */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-white">Gmail Integration</CardTitle>
              <CardDescription className="text-[#94A3B8]">
                Sync emails and send from within the CRM
              </CardDescription>
            </div>
            {!gmailLoading && (
              <Badge
                variant="secondary"
                className={gmailStatus?.connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                }
              >
                {gmailStatus?.connected ? (
                  <><CheckCircle2 className="mr-1 h-3 w-3" /> Connected</>
                ) : (
                  <><XCircle className="mr-1 h-3 w-3" /> Not Connected</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {gmailLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking connection...
            </div>
          ) : gmailStatus?.connected ? (
            <>
              <div className="rounded-lg bg-[#0B1120] p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#94A3B8]">Email</span>
                  <span className="text-white">{gmailStatus.email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#94A3B8]">Last Sync</span>
                  <span className="text-white">
                    {gmailStatus.lastSync ? formatRelativeTime(gmailStatus.lastSync) : "Never"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
                >
                  {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  {syncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="border-white/8 text-[#94A3B8] hover:text-red-400 hover:border-red-500/20"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p className="mb-3 text-sm text-[#94A3B8]">
                Connect your Gmail account to sync emails and send messages directly from the CRM.
                Emails are automatically matched to clients by contact email addresses.
              </p>
              <a href="/api/gmail/authorize">
                <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Connect Gmail
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fireflies Integration */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Mic className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-white">Fireflies.ai Integration</CardTitle>
              <CardDescription className="text-[#94A3B8]">
                Meeting transcript intelligence with AI-extracted insights
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={process.env.NEXT_PUBLIC_FIREFLIES_CONFIGURED === "true"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }
            >
              {process.env.NEXT_PUBLIC_FIREFLIES_CONFIGURED === "true" ? (
                <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
              ) : (
                "API Key Required"
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-[#0B1120] p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#94A3B8]">Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-[#1E293B] px-2 py-1 text-xs text-white font-mono break-all">
                  {webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-[#94A3B8] hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl)
                    toast.success("Webhook URL copied!")
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Add this URL in your Fireflies.ai webhook settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBackfill}
              disabled={backfilling}
              className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
            >
              {backfilling ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
              {backfilling ? "Importing..." : "Backfill Transcripts"}
            </Button>
            <a href="https://app.fireflies.ai/integrations/custom/webhooks" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-white/8 text-[#94A3B8] hover:text-white">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Fireflies Settings
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
