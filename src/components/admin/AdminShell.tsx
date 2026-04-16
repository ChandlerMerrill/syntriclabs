"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import AdminSidebar from "./AdminSidebar"
import AdminHeader from "./AdminHeader"
import ChatFAB from "./chat/ChatFAB"
import ChatPanel from "./chat/ChatPanel"
import GlobalSearch from "./shared/GlobalSearch"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useBadgeCounts, type BadgeCounts } from "@/hooks/admin/useBadgeCounts"

interface AdminShellProps {
  children: React.ReactNode
  userEmail: string
  initialBadges: BadgeCounts
}

function extractContext(pathname: string) {
  const ctx: { clientId?: string; dealId?: string; projectId?: string } = {}
  const clientMatch = pathname.match(/\/admin\/clients\/([^/]+)/)
  const dealMatch = pathname.match(/\/admin\/deals\/([^/]+)/)
  const projectMatch = pathname.match(/\/admin\/projects\/([^/]+)/)
  if (clientMatch && clientMatch[1] !== "new") ctx.clientId = clientMatch[1]
  if (dealMatch && dealMatch[1] !== "new") ctx.dealId = dealMatch[1]
  if (projectMatch && projectMatch[1] !== "new") ctx.projectId = projectMatch[1]
  return ctx
}

export default function AdminShell({ children, userEmail, initialBadges }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const pathname = usePathname()
  const chatContext = extractContext(pathname)
  const { counts } = useBadgeCounts(initialBadges)

  return (
    <div className="flex h-screen bg-[#0F172A]">
      {/* Desktop sidebar — renders its own spacer + fixed aside */}
      <AdminSidebar
        unreadCount={counts.unreadSubmissions}
        unreadMessages={counts.unreadMessages}
        newLeads={counts.newLeads}
      />

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[240px] border-white/8 bg-[#0B1120] p-0">
          <AdminSidebar
            unreadCount={counts.unreadSubmissions}
            unreadMessages={counts.unreadMessages}
            newLeads={counts.newLeads}
            mobile
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          userEmail={userEmail}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* AI Chat */}
      <ChatFAB open={chatOpen} onClick={() => setChatOpen(true)} />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} context={chatContext} />

      {/* Global Search (Cmd+K) */}
      <GlobalSearch />
    </div>
  )
}
