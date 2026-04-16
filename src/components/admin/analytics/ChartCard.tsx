"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`border-white/8 bg-[#1E293B] ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        {subtitle && <p className="text-xs text-[#94A3B8]">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
