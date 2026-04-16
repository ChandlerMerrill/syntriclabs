"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send, Loader2 } from "lucide-react"

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: {
    to?: string
    cc?: string
    subject?: string
    body?: string
    threadId?: string
    inReplyTo?: string
    references?: string
  }
}

export default function ComposeDialog({ open, onOpenChange, defaults }: ComposeDialogProps) {
  const [to, setTo] = useState(defaults?.to ?? "")
  const [cc, setCc] = useState(defaults?.cc ?? "")
  const [subject, setSubject] = useState(defaults?.subject ?? "")
  const [body, setBody] = useState(defaults?.body ?? "")
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!to || !subject || !body) {
      toast.error("To, subject, and body are required")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          cc: cc || undefined,
          subject,
          body,
          threadId: defaults?.threadId,
          inReplyTo: defaults?.inReplyTo,
          references: defaults?.references,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Email sent!")
      onOpenChange(false)
      setTo("")
      setCc("")
      setSubject("")
      setBody("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/8 bg-[#1E293B] text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{defaults?.threadId ? "Reply" : "New Email"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-[#94A3B8]">To</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-white/8 bg-[#0B1120] text-white"
            />
          </div>
          <div>
            <Label className="text-xs text-[#94A3B8]">Cc</Label>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="border-white/8 bg-[#0B1120] text-white"
            />
          </div>
          <div>
            <Label className="text-xs text-[#94A3B8]">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="border-white/8 bg-[#0B1120] text-white"
            />
          </div>
          <div>
            <Label className="text-xs text-[#94A3B8]">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
              rows={8}
              className="border-white/8 bg-[#0B1120] text-white resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={sending || !to || !subject || !body}
              className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
            >
              {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
