"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Menu, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface AdminHeaderProps {
  userEmail: string
  onToggleSidebar?: () => void
}

export default function AdminHeader({ userEmail, onToggleSidebar }: AdminHeaderProps) {
  const router = useRouter()

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
    <header className="flex h-14 items-center justify-between border-b border-white/8 bg-[#0B1120] px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-[#94A3B8] hover:text-white"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
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
