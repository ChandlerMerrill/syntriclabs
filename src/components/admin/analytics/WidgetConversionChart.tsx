"use client"

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import ChartCard from "./ChartCard"
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE } from "./chart-config"
import type { WidgetConversionPoint } from "@/lib/types"

export default function WidgetConversionChart({ data }: { data: WidgetConversionPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Widget Lead Conversion">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No widget data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Widget Lead Conversion" subtitle="Monthly conversations vs leads captured">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="month" {...AXIS_STYLE} />
          <YAxis yAxisId="count" {...AXIS_STYLE} allowDecimals={false} />
          <YAxis yAxisId="rate" orientation="right" {...AXIS_STYLE} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => {
              if (name === "rate") return [`${v}%`, "Conversion Rate"]
              return [Number(v), name === "conversations" ? "Conversations" : "Leads"]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
          <Bar yAxisId="count" dataKey="conversations" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} barSize={24} />
          <Bar yAxisId="count" dataKey="leads" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} barSize={24} />
          <Line yAxisId="rate" type="monotone" dataKey="rate" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} name="Conversion %" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
