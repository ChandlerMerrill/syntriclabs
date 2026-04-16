"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const PRESETS = [
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1y", value: "365d" },
  { label: "All", value: "all" },
]

export default function DateRangeFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const current = searchParams.get("range") ?? "90d"

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", value)
    router.push(`/admin/analytics?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#94A3B8]">Period:</span>
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          onClick={() => handleSelect(p.value)}
          className={
            current === p.value
              ? "bg-white/10 text-white"
              : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
          }
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
