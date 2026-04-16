import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-white/8 py-16">
      <Icon className="h-10 w-10 text-[#94A3B8]/40" />
      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-[#94A3B8]">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4">
          <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  )
}
