"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import ChartCard from "./ChartCard"
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE } from "./chart-config"
import type { VelocityDataPoint } from "@/lib/types"

export default function PipelineVelocityChart({ data }: { data: VelocityDataPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Pipeline Velocity">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No velocity data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Pipeline Velocity" subtitle="Avg days per stage">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis type="number" {...AXIS_STYLE} />
          <YAxis type="category" dataKey="stage" {...AXIS_STYLE} width={90} className="capitalize" />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} days`, "Avg Duration"]} />
          <Bar dataKey="avgDays" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
