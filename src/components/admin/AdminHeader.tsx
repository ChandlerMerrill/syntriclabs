"use client"

import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Menu, ExternalLink, Search, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { resolveNavLocation } from "./nav"

interface AdminHeaderProps {
  userEmail: string
  onToggleSidebar?: () => void
  onOpenSearch?: () => void
}

export default function AdminHeader({
  userEmail,
  onToggleSidebar,
  onOpenSearch,
}: AdminHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const location = resolveNavLocation(pathname)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = userEmail
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-white/8 bg-[#0B1120] px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-[#94A3B8] hover:text-white"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* The rail says which section is lit; this says it in words, so the
            left half of the header stops being dead space. */}
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden shrink-0 text-[#94A3B8] sm:inline">{location.section}</span>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-[#94A3B8]/40 sm:inline" />
          <span className="truncate font-medium text-white">{location.label}</span>
        </nav>

        {/* ⌘K has always worked; nothing on screen said so. */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="ml-2 hidden h-8 items-center gap-2 rounded-lg border border-white/8 bg-[#0F172A] pl-2.5 pr-2 text-xs text-[#94A3B8] transition-colors hover:border-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 lg:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="pr-8">Search…</span>
          <kbd className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] leading-none text-[#94A3B8]">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href="/" target="_blank" rel="noopener noreferrer" />}
          className="text-[#94A3B8] hover:text-white"
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          View Site
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="rounded-full" />}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#2563EB]/20 text-xs text-[#60A5FA]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-white/8 bg-[#1E293B] text-white">
            <DropdownMenuItem disabled className="text-xs text-[#94A3B8]">
              {userEmail}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
