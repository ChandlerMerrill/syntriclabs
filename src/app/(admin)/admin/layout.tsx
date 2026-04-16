import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminShell from "@/components/admin/AdminShell"
import { getUnreadCount } from "@/lib/services/messages"
import { getNewLeadsCount } from "@/lib/services/leads"

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

  // Get unread submissions count for sidebar badge
  const { count: unreadCount } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread")

  // Get unread message count for messages badge
  const unreadMessages = await getUnreadCount(supabase)

  // Get new leads count for sidebar badge
  const newLeads = await getNewLeadsCount(supabase)

  return (
    <AdminShell userEmail={user.email ?? ""} unreadCount={unreadCount ?? 0} unreadMessages={unreadMessages} newLeads={newLeads}>
      {children}
    </AdminShell>
  )
}
