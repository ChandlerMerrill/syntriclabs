"use client"

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import ChartCard from "./ChartCard"
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE } from "./chart-config"
import type { WinLossDataPoint } from "@/lib/types"

export default function WinLossChart({ data }: { data: WinLossDataPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Win / Loss Trend">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No win/loss data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Win / Loss Trend" subtitle="Monthly outcomes with win rate">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="month" {...AXIS_STYLE} />
          <YAxis yAxisId="count" {...AXIS_STYLE} />
          <YAxis yAxisId="rate" orientation="right" {...AXIS_STYLE} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
          <Bar yAxisId="count" dataKey="won" stackId="a" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} barSize={24} />
          <Bar yAxisId="count" dataKey="lost" stackId="a" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} barSize={24} />
          <Line yAxisId="rate" type="monotone" dataKey="winRate" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} name="Win Rate %" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
