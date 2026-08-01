"use client"

// The module's own chrome. Two jobs: a way back out of every subpage that isn't
// the browser button, and a stage strip that puts the loop's order on screen —
// research feeds variants, variants feed the outbox, the outbox feeds
// performance. Numbering them says that; six sibling tabs did not.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ChevronRight, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

const OVERVIEW = "/admin/marketing"

const STAGES = [
  { href: "/admin/marketing/research", label: "Research" },
  { href: "/admin/marketing/campaigns", label: "Campaigns" },
  { href: "/admin/marketing/variants", label: "Variants" },
  { href: "/admin/marketing/prospects", label: "Prospects" },
  { href: "/admin/marketing/outbox", label: "Outbox" },
  { href: "/admin/marketing/performance", label: "Performance" },
]

export default function MarketingNav() {
  const pathname = usePathname()
  const current = STAGES.find((s) => pathname.startsWith(s.href)) ?? null

  // On a stage, back goes up one level to the overview. On the overview itself
  // it leaves the module entirely — the crumb never dead-ends.
  const back = current
    ? { href: OVERVIEW, label: "Marketing" }
    : { href: "/admin", label: "Admin" }

  return (
    <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-white/8 bg-[#0F172A]/85 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-xs">
        <Link
          href={back.href}
          className="group -ml-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {back.label}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-[#94A3B8]/40" />
        <span className="font-medium text-white">{current?.label ?? "Marketing"}</span>
      </div>

      <nav
        aria-label="Marketing stages"
        className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5"
      >
        <Link
          href={OVERVIEW}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
            !current
              ? "bg-white/[0.07] text-white"
              : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
          )}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Overview
        </Link>

        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-white/8" />

        {STAGES.map((stage, i) => {
          const active = current?.href === stage.href
          return (
            <Link
              key={stage.href}
              href={stage.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-white/[0.07] text-white"
                  : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-[5px] text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? "bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-white"
                    : "bg-white/8 text-[#94A3B8] group-hover:text-white"
                )}
              >
                {i + 1}
              </span>
              {stage.label}
              {active && (
                <span className="absolute inset-x-2.5 -bottom-px h-px bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
