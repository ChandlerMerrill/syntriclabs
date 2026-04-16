"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Inbox,
  Building2,
  FolderKanban,
  GitBranch,
  FileText,
  MessageCircle,
  BarChart3,
  Settings,
  Mail,
  Mic,
  UserPlus,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface AdminSidebarProps {
  unreadCount?: number
  unreadMessages?: number
  unreadEmails?: number
  newLeads?: number
}

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  enabled: boolean
  badgeKey?: 'submissions' | 'messages' | 'emails' | 'leads'
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, enabled: true },
  { label: "Submissions", href: "/admin/submissions", icon: Inbox, enabled: true, badgeKey: 'submissions' },
]

const phase2Items: NavItem[] = [
  { label: "Clients", href: "/admin/clients", icon: Building2, enabled: true },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban, enabled: true },
  { label: "Pipeline", href: "/admin/pipeline", icon: GitBranch, enabled: true },
]

const phase3Items: NavItem[] = [
  { label: "Documents", href: "/admin/documents", icon: FileText, enabled: true },
]

const phase4Items: NavItem[] = [
  { label: "Messages", href: "/admin/messages", icon: MessageCircle, enabled: true, badgeKey: 'messages' },
]

const phase5Items: NavItem[] = [
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, enabled: true },
  { label: "Emails", href: "/admin/emails", icon: Mail, enabled: true, badgeKey: 'emails' },
  { label: "Transcripts", href: "/admin/transcripts", icon: Mic, enabled: true },
]

const phase6Items: NavItem[] = [
  { label: "Leads", href: "/admin/leads", icon: UserPlus, enabled: true, badgeKey: 'leads' },
  { label: "Knowledge Base", href: "/admin/knowledgebase", icon: BookOpen, enabled: true },
]

const bottomItems = [
  { label: "Settings", href: "/admin/settings", icon: Settings, enabled: true },
]

export default function AdminSidebar({ unreadCount = 0, unreadMessages = 0, unreadEmails = 0, newLeads = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  const badgeCounts: Record<string, number> = { submissions: unreadCount, messages: unreadMessages, emails: unreadEmails, leads: newLeads }

  const renderNavItem = (item: NavItem, disabled = false) => {
    const Icon = item.icon
    const active = isActive(item.href)

    const content = (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
          active
            ? "bg-white/10 text-white"
            : disabled
            ? "cursor-not-allowed text-[#94A3B8]/40"
            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
          <Badge variant="secondary" className="h-5 min-w-[20px] justify-center bg-[#2563EB] px-1.5 text-[10px] text-white">
            {badgeCounts[item.badgeKey]}
          </Badge>
        )}
      </div>
    )

    if (disabled) {
      return (
        <Tooltip key={item.label}>
          <TooltipTrigger>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Coming in Phase 2</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Link key={item.label} href={item.href}>
        {content}
      </Link>
    )
  }

  return (
    <TooltipProvider delay={0}>
      <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-white/8 bg-[#0B1120]">
        {/* Logo */}
        <div className="flex h-14 items-center px-5">
          <Link href="/admin" className="flex items-center">
            <span className="font-[family-name:var(--font-rajdhani)] text-lg font-bold tracking-tight text-white">
              syntric<span className="text-[#8B5CF6]">.</span>
            </span>
            <span className="ml-2 text-xs font-medium text-[#94A3B8]">admin</span>
          </Link>
        </div>

        <Separator className="bg-white/8" />

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
          {navItems.map((item) => renderNavItem(item))}

          <Separator className="my-2 bg-white/8" />

          {phase2Items.map((item) => renderNavItem(item))}

          <Separator className="my-2 bg-white/8" />

          {phase3Items.map((item) => renderNavItem(item))}

          <Separator className="my-2 bg-white/8" />

          {phase4Items.map((item) => renderNavItem(item))}

          <Separator className="my-2 bg-white/8" />

          {phase5Items.map((item) => renderNavItem(item))}

          <Separator className="my-2 bg-white/8" />

          {phase6Items.map((item) => renderNavItem(item))}

          <Separator className="my-2 bg-white/8" />

          <div className="mt-auto" />
          {bottomItems.map((item) => renderNavItem(item))}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
