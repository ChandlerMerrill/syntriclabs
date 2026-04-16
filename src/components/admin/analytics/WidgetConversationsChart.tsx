"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import ChartCard from "./ChartCard"
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE } from "./chart-config"
import type { WidgetConversationPoint } from "@/lib/types"

export default function WidgetConversationsChart({ data }: { data: WidgetConversationPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Widget Conversations">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No widget conversations in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Widget Conversations" subtitle="Daily conversations started">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="widgetConvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} allowDecimals={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v), "Conversations"]} />
          <Area
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS.purple}
            strokeWidth={2}
            fill="url(#widgetConvGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
