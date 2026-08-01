"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Pin, PinOff, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { navSections, navBottomItems, type NavItem } from "./nav"
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

const HOVER_DELAY = 80
// Centring is arithmetic, not a nudge: nav px-3 (12) + item px-3 (12) + half a
// 20px icon (10) = 34 = 68/2. Change any one of these and the rail is off again.
const COLLAPSED_WIDTH = "4.25rem"
const EXPANDED_WIDTH = "15rem"
const PIN_STORAGE_KEY = "admin-sidebar-pinned"

/**
 * Collapses to genuinely zero width rather than going transparent.
 *
 * `opacity-0` leaves the label occupying its full width, which is what pushed
 * every icon off the centre of the collapsed rail. A `0fr → 1fr` grid column
 * animates the width itself, so the icon is the only thing left in the row.
 */
function Collapsible({
  open,
  children,
  className,
}: {
  open: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn("grid transition-[grid-template-columns] duration-300 ease-in-out", className)}
      style={{ gridTemplateColumns: open ? "1fr" : "0fr" }}
    >
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {children}
      </span>
    </span>
  )
}

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

  // Hover is ignored until we have hydrated. If the pointer happens to be
  // resting over the rail as a page loads — which it is every time you click a
  // nav item — expanding mid-hydration makes React re-render a tree it was
  // still adopting, and it reports a hydration mismatch. The hover timer keeps
  // running either way, so the rail opens the moment hydration finishes.
  const isExpanded = mobile || isPinned || (hydrated && isHovered)

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

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(item.href)
    const disabled = !item.enabled
    const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0
    const hasBadge = Boolean(item.badgeKey) && badgeCount > 0

    // No `gap` here on purpose — a flex gap still occupies its 12px next to a
    // zero-width label, which would drag the icon back off centre. The spacing
    // lives inside the collapsing label instead, so it collapses with it.
    const content = (
      <div
        className={cn(
          "relative flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
          active
            ? "bg-white/10 text-white"
            : disabled
              ? "cursor-not-allowed text-[#94A3B8]/40"
              : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
        )}
      >
        <div className="relative shrink-0">
          <Icon className="h-5 w-5" />
          {hasBadge && (
            <span
              className={cn(
                "absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#2563EB] ring-2 ring-[#0B1120] transition-opacity duration-200",
                isExpanded && "opacity-0"
              )}
            />
          )}
        </div>
        <Collapsible open={isExpanded} className="min-w-0">
          <span className="block pl-3">{item.label}</span>
        </Collapsible>
        {hasBadge && (
          <Collapsible open={isExpanded} className="ml-auto">
            <Badge
              variant="secondary"
              className="ml-2 h-5 min-w-[20px] justify-center bg-[#2563EB] px-1.5 text-[10px] text-white"
            >
              {badgeCount}
            </Badge>
          </Collapsible>
        )}
      </div>
    )

    const tip = disabled ? "Coming soon" : item.label

    return (
      // The rail is 68px of icons when collapsed, so the label has to be one
      // hover away. Disabling on the root rather than the trigger matters:
      // hovering also *expands* the rail, and root-level disabling closes an
      // already-open tooltip, so it never sits next to the label it duplicates.
      <Tooltip key={item.label} disabled={isExpanded}>
        <TooltipTrigger
          render={
            disabled ? (
              <div aria-disabled="true" />
            ) : (
              <Link href={item.href} aria-current={active ? "page" : undefined} />
            )
          }
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-0"
        >
          {content}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{tip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  /**
   * A named group when expanded, a plain rule when collapsed.
   *
   * Both are always mounted and cross-faded rather than swapped. Expanding is
   * hover-driven, so it can land while React is still hydrating — and a node
   * that mounts mid-hydration is a hydration mismatch. Fixed height in both
   * states, so the flip never shifts the items below it either.
   */
  const renderSectionLabel = (title: string) => (
    <div className="relative flex h-6 shrink-0 items-center px-3">
      <span
        className={cn(
          "truncate text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 transition-opacity duration-200",
          isExpanded ? "opacity-100" : "opacity-0"
        )}
      >
        {title}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3 h-px bg-white/8 transition-opacity duration-200",
          isExpanded ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  )

  const innerWidth = mobile ? EXPANDED_WIDTH : isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH
  const spacerWidth = mobile ? EXPANDED_WIDTH : isPinned ? EXPANDED_WIDTH : COLLAPSED_WIDTH

  const sidebarBody = (
    <>
      {/* Header — the mark stays mounted at every width. Its 44px box inside
          px-3 centres on 34px, the same axis as every icon below it. */}
      <div className="flex h-[4.5rem] items-center justify-between overflow-hidden px-3">
        <Link href="/admin" className="flex min-w-0 items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 p-0.5">
            <Image
              src="/images/updated-logo.png"
              alt="Syntric"
              width={40}
              height={62}
              className="h-[2.25rem] w-auto"
            />
          </div>
          <Collapsible open={isExpanded} className="min-w-0">
            <span className="block pl-2 font-[family-name:var(--font-rajdhani)] text-xl font-bold tracking-tight text-white">
              Syntric<span className="text-[#8B5CF6]">.</span>
            </span>
          </Collapsible>
        </Link>
        {!mobile && (
          <Collapsible open={isExpanded}>
            <button
              type="button"
              onClick={() => setIsPinned((v) => !v)}
              tabIndex={isExpanded ? undefined : -1}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#94A3B8] transition-colors duration-200 hover:bg-white/5 hover:text-white"
              aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          </Collapsible>
        )}
      </div>

      <Separator className="bg-white/8" />

      {/* Navigation */}
      {/* Sixteen items plus five section labels is a tall column — the rhythm is
          deliberately tight so the whole panel fits without scrolling on a
          laptop, and scrolls gracefully when it doesn't. */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3 py-2">
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-0.5">
            {renderSectionLabel(section.title)}
            {section.items.map((item) => renderNavItem(item))}
          </div>
        ))}

        <div className="mt-auto" />
        <div className="flex h-6 shrink-0 items-center px-3" aria-hidden>
          <span className="h-px w-full bg-white/8" />
        </div>
        {navBottomItems.map((item) => renderNavItem(item))}
      </nav>

      {/* Back to Website */}
      <div className="border-t border-white/8 px-3 py-2">
        <Link
          href="/"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[#60A5FA] transition-colors duration-150 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          <Collapsible open={isExpanded} className="min-w-0">
            <span className="block pl-3">Back to Website</span>
          </Collapsible>
        </Link>
      </div>
    </>
  )

  if (mobile) {
    return (
      <TooltipProvider delay={0}>
        <aside
          className="flex h-full shrink-0 flex-col border-r border-white/8 bg-[#0B1120]"
          style={{ width: EXPANDED_WIDTH }}
        >
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
