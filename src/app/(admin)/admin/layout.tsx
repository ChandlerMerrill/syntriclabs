import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminShell from "@/components/admin/AdminShell"
import { getUnreadCount } from "@/lib/services/messages"
import { getNewLeadsCount } from "@/lib/services/leads"
import { AdminSWRProvider } from "@/lib/swr/provider"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ count: unreadSubmissions }, unreadMessages, newLeads] = await Promise.all([
    supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "unread"),
    getUnreadCount(supabase),
    getNewLeadsCount(supabase),
  ])

  return (
    <AdminSWRProvider>
      <AdminShell
        userEmail={user.email ?? ""}
        initialBadges={{
          unreadSubmissions: unreadSubmissions ?? 0,
          unreadMessages,
          newLeads,
        }}
      >
        {children}
      </AdminShell>
    </AdminSWRProvider>
  )
}
