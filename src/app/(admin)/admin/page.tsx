import { createClient } from "@/lib/supabase/server"
import { getWidgetOverview } from "@/lib/services/widget-analytics"
import DashboardView from "./DashboardView"
import type { ActivityWithContext } from "@/lib/types"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    clientsRes,
    activeProjectsRes,
    pipelineRes,
    wonRes,
    lostRes,
    recentActivitiesRes,
    recentSubmissionsRes,
    widgetOverview,
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).neq("status", "inactive"),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("deals").select("value, stage").not("stage", "in", '("won","lost")'),
    supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage", "won"),
    supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage", "lost"),
    supabase.from("activities").select("*, clients(id, company_name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("submissions").select("id, name, email, service, status, created_at").order("created_at", { ascending: false }).limit(5),
    getWidgetOverview(supabase),
  ])

  return (
    <DashboardView
      initialData={{
        clientsCount: clientsRes.count ?? 0,
        activeProjectsCount: activeProjectsRes.count ?? 0,
        pipelineDeals: pipelineRes.data ?? [],
        wonCount: wonRes.count ?? 0,
        lostCount: lostRes.count ?? 0,
        recentActivities: (recentActivitiesRes.data ?? []) as ActivityWithContext[],
        recentSubmissions: (recentSubmissionsRes.data ?? []) as {
          id: string
          name: string
          email: string
          service: string | null
          status: string
          created_at: string
        }[],
        widgetOverview,
      }}
    />
  )
}
