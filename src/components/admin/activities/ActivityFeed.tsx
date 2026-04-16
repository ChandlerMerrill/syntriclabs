"use client"

import {
  StickyNote, Phone, Mail, Calendar, FileText, ArrowRightLeft,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "@/lib/utils"
import type { ActivityWithContext, Activity } from "@/lib/types"

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  note: { icon: StickyNote, color: "text-slate-400 bg-slate-500/10" },
  call: { icon: Phone, color: "text-green-400 bg-green-500/10" },
  email: { icon: Mail, color: "text-blue-400 bg-blue-500/10" },
  meeting: { icon: Calendar, color: "text-purple-400 bg-purple-500/10" },
  document: { icon: FileText, color: "text-amber-400 bg-amber-500/10" },
  status_change: { icon: ArrowRightLeft, color: "text-cyan-400 bg-cyan-500/10" },
}

interface ActivityFeedProps {
  activities: (ActivityWithContext | Activity)[]
  compact?: boolean
}

export default function ActivityFeed({ activities, compact = false }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#94A3B8]">No activity yet.</p>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const config = typeConfig[activity.type] ?? typeConfig.note
        const Icon = config.icon
        return (
          <div
            key={activity.id}
            className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}>
                  {activity.title}
                </p>
                {activity.is_auto_generated && (
                  <Badge variant="secondary" className="bg-[#334155] text-[#94A3B8] text-[10px] px-1.5">
                    System
                  </Badge>
                )}
              </div>
              {activity.description && !compact && (
                <p className="mt-0.5 text-xs text-[#94A3B8] line-clamp-2">{activity.description}</p>
              )}
              {'clients' in activity && activity.clients && !compact && (
                <p className="mt-0.5 text-xs text-[#94A3B8]">{activity.clients.company_name}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-[#94A3B8]">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
