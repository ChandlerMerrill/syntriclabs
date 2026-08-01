// One description of the panel's shape, so the rail and the header can never
// disagree about which section you are standing in.

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
  Megaphone,
  FlaskConical,
  Activity,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  enabled: boolean
  badgeKey?: "submissions" | "messages" | "emails" | "leads"
}

export type NavSection = {
  title: string
  items: NavItem[]
}

// Grouped by what you are doing — bringing work in, running it, talking to
// people, growing — rather than by the phase a feature happened to ship in.
export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, enabled: true },
      { label: "Submissions", href: "/admin/submissions", icon: Inbox, enabled: true, badgeKey: "submissions" },
    ],
  },
  {
    title: "Clients & Projects",
    items: [
      { label: "Clients", href: "/admin/clients", icon: Building2, enabled: true },
      { label: "Projects", href: "/admin/projects", icon: FolderKanban, enabled: true },
      { label: "Pipeline", href: "/admin/pipeline", icon: GitBranch, enabled: true },
      { label: "Documents", href: "/admin/documents", icon: FileText, enabled: true },
    ],
  },
  {
    title: "Comms",
    items: [
      { label: "Messages", href: "/admin/messages", icon: MessageCircle, enabled: true, badgeKey: "messages" },
      { label: "Emails", href: "/admin/emails", icon: Mail, enabled: true, badgeKey: "emails" },
      { label: "Transcripts", href: "/admin/transcripts", icon: Mic, enabled: true },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "Leads", href: "/admin/leads", icon: UserPlus, enabled: true, badgeKey: "leads" },
      { label: "Marketing", href: "/admin/marketing", icon: Megaphone, enabled: true },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, enabled: true },
      { label: "Knowledge Base", href: "/admin/knowledgebase", icon: BookOpen, enabled: true },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "AI Playground", href: "/admin/ai-playground", icon: FlaskConical, enabled: true },
      { label: "AI Actions", href: "/admin/ai-actions", icon: Activity, enabled: true },
    ],
  },
]

export const navBottomItems: NavItem[] = [
  { label: "Settings", href: "/admin/settings", icon: Settings, enabled: true },
]

// Routes with no rail entry of their own. Without these a deal or a login page
// would fall through to the title-cased-slug guess below and read worse.
const extraRoutes: { href: string; section: string; label: string }[] = [
  { href: "/admin/deals", section: "Clients & Projects", label: "Deals" },
]

const allRoutes = [
  ...navSections.flatMap((s) => s.items.map((i) => ({ href: i.href, section: s.title, label: i.label }))),
  ...navBottomItems.map((i) => ({ href: i.href, section: "Settings", label: i.label })),
  ...extraRoutes,
]

export interface NavLocation {
  section: string
  label: string
  href: string
}

function titleCase(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Where the given pathname sits in the panel.
 *
 * Longest matching prefix wins, so `/admin/clients/<id>` still reports Clients
 * rather than falling back to a guessed slug.
 */
export function resolveNavLocation(pathname: string): NavLocation {
  if (pathname === "/admin") {
    return { section: "Overview", label: "Dashboard", href: "/admin" }
  }

  let best: (typeof allRoutes)[number] | null = null
  for (const route of allRoutes) {
    if (route.href === "/admin") continue
    if (pathname === route.href || pathname.startsWith(`${route.href}/`)) {
      if (!best || route.href.length > best.href.length) best = route
    }
  }
  if (best) return { section: best.section, label: best.label, href: best.href }

  const slug = pathname.replace(/^\/admin\/?/, "").split("/")[0]
  return {
    section: "Admin",
    label: slug ? titleCase(slug) : "Dashboard",
    href: pathname,
  }
}
