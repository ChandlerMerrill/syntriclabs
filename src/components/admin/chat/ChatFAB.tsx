"use client"

import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatFABProps {
  open: boolean
  onClick: () => void
}

export default function ChatFAB({ open, onClick }: ChatFABProps) {
  if (open) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full",
        "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25",
        "hover:bg-[#3B82F6] hover:scale-105",
        "transition-all duration-200"
      )}
    >
      <MessageSquare className="h-5 w-5" />
    </button>
  )
}
