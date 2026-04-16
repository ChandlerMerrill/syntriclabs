"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ACTIVITY_TYPES } from "@/lib/constants"
import {
  StickyNote, Phone, Mail, Calendar, FileText, Loader2,
} from "lucide-react"
import type { ActivityType } from "@/lib/types"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  StickyNote, Phone, Mail, Calendar, FileText,
}

interface ActivityFormProps {
  clientId: string
  dealId?: string
  projectId?: string
  onComplete?: () => void
}

export default function ActivityForm({ clientId, dealId, projectId, onComplete }: ActivityFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState<ActivityType>("note")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from("activities").insert({
      client_id: clientId,
      deal_id: dealId ?? null,
      project_id: projectId ?? null,
      type,
      title: title.trim(),
      description: description.trim(),
      is_auto_generated: false,
    })

    if (error) {
      toast.error("Failed to log activity")
    } else {
      toast.success("Activity logged")
      setTitle("")
      setDescription("")
      router.refresh()
      onComplete?.()
    }
    setSaving(false)
  }

  const filteredTypes = ACTIVITY_TYPES.filter((t) => t.value !== "status_change")

  return (
    <Card className="border-white/8 bg-[#1E293B]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white">Log Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {filteredTypes.map((t) => {
              const Icon = iconMap[t.icon]
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value as ActivityType)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    type === t.value
                      ? "border-[#2563EB] bg-[#2563EB]/10 text-[#60A5FA]"
                      : "border-white/8 text-[#94A3B8] hover:border-white/15 hover:text-white"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {t.label}
                </button>
              )
            })}
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border-white/8 bg-[#0B1120] text-white"
              placeholder="Brief summary..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border-white/8 bg-[#0B1120] text-white placeholder:text-[#94A3B8]/50"
              placeholder="Details..."
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Activity
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
