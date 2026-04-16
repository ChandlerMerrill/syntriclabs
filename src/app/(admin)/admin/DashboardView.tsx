"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, FolderOpen, DollarSign, TrendingUp, MessageCircle, UserPlus, AlertTriangle, Send } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/utils"
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/constants"
import ActivityFeed from "@/components/admin/activities/ActivityFeed"
import { Button } from "@/components/ui/button"
import { useDashboard, type DashboardData } from "@/hooks/admin/useDashboard"

const statusColors: Record<string, string> = {
  unread: "bg-yellow-500/10 text-yellow-400",
  read: "bg-blue-500/10 text-blue-400",
  replied: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
}

export default function DashboardView({ initialData }: { initialData: DashboardData }) {
  const { data } = useDashboard(initialData)
  const d = data ?? initialData

  const pipelineValue = d.pipelineDeals.reduce((sum, x) => sum + (x.value ?? 0), 0)
  const winRate =
    d.wonCount + d.lostCount > 0
      ? Math.round((d.wonCount / (d.wonCount + d.lostCount)) * 100)
      : 0

  const stageCounts = PIPELINE_STAGES.filter((s) => s.value !== "won" && s.value !== "lost").map((stage) => {
    const stageDeals = d.pipelineDeals.filter((x) => x.stage === stage.value)
    return {
      ...stage,
      count: stageDeals.length,
      total: stageDeals.reduce((sum, x) => sum + (x.value ?? 0), 0),
    }
  })

  const maxStageTotal = Math.max(...stageCounts.map((s) => s.total), 1)

  const stats = [
    { label: "Total Clients", value: d.clientsCount, icon: Building2, color: "text-[#3B82F6]" },
    { label: "Active Projects", value: d.activeProjectsCount, icon: FolderOpen, color: "text-[#10B981]" },
    { label: "Pipeline Value", value: formatCurrency(pipelineValue), icon: DollarSign, color: "text-[#F59E0B]" },
    { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "text-[#8B5CF6]", subtitle: `${d.wonCount}W / ${d.lostCount}L` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-[#94A3B8]">Overview of your CRM</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-white/8 bg-[#1E293B]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
                  {stat.subtitle && <p className="mt-0.5 text-xs text-[#94A3B8]/60">{stat.subtitle}</p>}
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Summary */}
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium text-white">Pipeline Summary</CardTitle>
            <Link href="/admin/pipeline" className="text-xs text-[#60A5FA] hover:text-[#3B82F6]">View Pipeline</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageCounts.map((stage) => (
              <div key={stage.value} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className={STAGE_COLORS[stage.value]} variant="secondary">{stage.label}</Badge>
                    <span className="text-[#94A3B8]">{stage.count} deals</span>
                  </div>
                  <span className="font-medium text-white">{formatCurrency(stage.total)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all"
                    style={{ width: `${(stage.total / maxStageTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {stageCounts.every((s) => s.count === 0) && (
              <p className="py-4 text-center text-sm text-[#94A3B8]">No active deals in pipeline.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-white/8 bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={d.recentActivities} compact />
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-medium text-white">Recent Submissions</CardTitle>
          <Link href="/admin/submissions" className="text-xs text-[#60A5FA] hover:text-[#3B82F6]">View All</Link>
        </CardHeader>
        <CardContent>
          {d.recentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {d.recentSubmissions.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/admin/submissions/${sub.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{sub.name}</p>
                      <Badge className={statusColors[sub.status] ?? ""} variant="secondary">{sub.status}</Badge>
                    </div>
                    <p className="truncate text-xs text-[#94A3B8]">
                      {sub.email} {sub.service ? `· ${sub.service}` : ""}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-xs text-[#94A3B8]">{formatDate(sub.created_at)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#94A3B8]">No submissions yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Widget Activity */}
      <Card className="border-white/8 bg-[#1E293B]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-medium text-white">Widget Activity</CardTitle>
          <Link href="/admin/leads" className="text-xs text-[#60A5FA] hover:text-[#3B82F6]">View Leads →</Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Conversations", value: d.widgetOverview.conversations, icon: MessageCircle, color: "text-[#8B5CF6]" },
              { label: "Leads", value: d.widgetOverview.leads, icon: UserPlus, color: "text-[#10B981]" },
              { label: "Escalations", value: d.widgetOverview.escalations, icon: AlertTriangle, color: "text-[#F59E0B]" },
              { label: "Messages", value: d.widgetOverview.messages, icon: Send, color: "text-[#3B82F6]" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                <item.icon className={`h-5 w-5 ${item.color} opacity-60`} />
                <div>
                  <p className="text-lg font-semibold text-white">{item.value}</p>
                  <p className="text-xs text-[#94A3B8]">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/clients/new">
          <Button variant="outline" size="sm" className="border-white/8 text-white hover:bg-white/5">Add Client</Button>
        </Link>
        <Link href="/admin/deals/new">
          <Button variant="outline" size="sm" className="border-white/8 text-white hover:bg-white/5">Add Deal</Button>
        </Link>
        <Link href="/admin/projects/new">
          <Button variant="outline" size="sm" className="border-white/8 text-white hover:bg-white/5">Add Project</Button>
        </Link>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="text-[#94A3B8] hover:text-white">Visit Site</Button>
        </a>
      </div>
    </div>
  )
}
