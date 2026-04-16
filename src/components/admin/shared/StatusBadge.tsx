import { Badge } from "@/components/ui/badge"
import { STATUS_COLORS, STAGE_COLORS } from "@/lib/constants"

interface StatusBadgeProps {
  status: string
  variant?: "status" | "stage"
}

export default function StatusBadge({ status, variant = "status" }: StatusBadgeProps) {
  const colors = variant === "stage" ? STAGE_COLORS : STATUS_COLORS
  return (
    <Badge variant="secondary" className={colors[status] ?? "bg-zinc-500/10 text-zinc-400"}>
      {status}
    </Badge>
  )
}
