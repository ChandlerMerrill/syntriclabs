"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import ChartCard from "./ChartCard"
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE } from "./chart-config"
import type { RevenueDataPoint } from "@/lib/types"

const formatCurrency = (v: number) =>
  `$${(v / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`

export default function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Revenue Over Time">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No revenue data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Revenue Over Time" subtitle="Monthly closed-won deal revenue">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" {...AXIS_STYLE} />
          <YAxis tickFormatter={formatCurrency} {...AXIS_STYLE} width={70} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.blue}
            strokeWidth={2}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
