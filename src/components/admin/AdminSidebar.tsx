"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
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
  FlaskConical,
  Activity,
  Pin,
  PinOff,
  ArrowLeft,
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
  mobile?: boolean
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

const devItems: NavItem[] = [
  { label: "AI Playground", href: "/admin/ai-playground", icon: FlaskConical, enabled: true },
  { label: "AI Actions", href: "/admin/ai-actions", icon: Activity, enabled: true },
]

const bottomItems = [
  { label: "Settings", href: "/admin/settings", icon: Settings, enabled: true },
]

const HOVER_DELAY = 80
const COLLAPSED_WIDTH = "3rem"
const EXPANDED_WIDTH = "14rem"
const PIN_STORAGE_KEY = "admin-sidebar-pinned"

export default function AdminSidebar({
  unreadCount = 0,
  unreadMessages = 0,
  unreadEmails = 0,
  newLeads = 0,
  mobile = false,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY)
      if (stored === "true") setIsPinned(true)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(PIN_STORAGE_KEY, String(isPinned))
    } catch {}
  }, [isPinned, hydrated])

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setIsHovered(true), HOVER_DELAY)
  }

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setIsHovered(false)
  }

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  const isExpanded = mobile || isPinned || isHovered

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  const badgeCounts: Record<string, number> = {
    submissions: unreadCount,
    messages: unreadMessages,
    emails: unreadEmails,
    leads: newLeads,
  }

  const renderNavItem = (item: NavItem, disabled = false) => {
    const Icon = item.icon
    const active = isActive(item.href)
    const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0
    const hasBadge = item.badgeKey && badgeCount > 0

    const content = (
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150",
          active
            ? "bg-white/10 text-white"
            : disabled
            ? "cursor-not-allowed text-[#94A3B8]/40"
            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
        )}
      >
        <div className="relative shrink-0">
          <Icon className="h-4 w-4" />
          {hasBadge && !isExpanded && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#2563EB] ring-2 ring-[#0B1120]" />
          )}
        </div>
        <span
          className={cn(
            "flex-1 whitespace-nowrap transition-opacity duration-200",
            isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {item.label}
        </span>
        {hasBadge && (
          <Badge
            variant="secondary"
            className={cn(
              "h-5 min-w-[20px] justify-center bg-[#2563EB] px-1.5 text-[10px] text-white transition-opacity duration-200",
              isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {badgeCount}
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

  const innerWidth = mobile ? "240px" : isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH
  const spacerWidth = mobile ? "240px" : isPinned ? EXPANDED_WIDTH : COLLAPSED_WIDTH

  const sidebarBody = (
    <>
      {/* Header */}
      <div className="flex h-[4.5rem] items-center justify-between px-3">
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-2 overflow-hidden whitespace-nowrap transition-opacity duration-200",
            isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 p-0.5">
            <Image
              src="/images/updated-logo.png"
              alt="Syntric"
              width={40}
              height={62}
              className="h-[2.25rem] w-auto"
            />
          </div>
          <span className="font-[family-name:var(--font-rajdhani)] text-xl font-bold tracking-tight text-white">
            Syntric<span className="text-[#8B5CF6]">.</span>
          </span>
        </Link>
        {!mobile && (
          <button
            type="button"
            onClick={() => setIsPinned((v) => !v)}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#94A3B8] transition-all duration-200 hover:bg-white/5 hover:text-white",
              !isExpanded && "pointer-events-none opacity-0"
            )}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <Separator className="bg-white/8" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-3">
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

        {devItems.map((item) => renderNavItem(item))}

        <Separator className="my-2 bg-white/8" />

        <div className="mt-auto" />
        {bottomItems.map((item) => renderNavItem(item))}
      </nav>

      {/* Back to Website */}
      <div className="border-t border-white/8 px-2 py-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-[#60A5FA] transition-colors duration-150 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              "whitespace-nowrap transition-opacity duration-200",
              isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            Back to Website
          </span>
        </Link>
      </div>
    </>
  )

  if (mobile) {
    return (
      <TooltipProvider delay={0}>
        <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-white/8 bg-[#0B1120]">
          {sidebarBody}
        </aside>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delay={0}>
      {/* Spacer reserves layout space based on pinned state */}
      <div
        aria-hidden="true"
        className="hidden shrink-0 transition-[width] duration-[350ms] ease-in-out md:block"
        style={{ width: spacerWidth }}
      />
      {/* Fixed sidebar overlays when only hovered */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/8 bg-[#0B1120] transition-[width] duration-[350ms] ease-in-out md:flex"
        style={{ width: innerWidth }}
      >
        {sidebarBody}
      </aside>
    </TooltipProvider>
  )
}
