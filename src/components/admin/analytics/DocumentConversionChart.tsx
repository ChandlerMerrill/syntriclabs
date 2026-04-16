"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import ChartCard from "./ChartCard"
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE } from "./chart-config"
import type { DocumentConversionPoint } from "@/lib/types"

export default function DocumentConversionChart({ data }: { data: DocumentConversionPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Document Conversion">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No document data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Document Conversion" subtitle="Status breakdown with conversion rates">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis type="number" {...AXIS_STYLE} />
          <YAxis type="category" dataKey="status" {...AXIS_STYLE} width={80} className="capitalize" />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, _name, props) => [
              `${v} (${(props.payload as DocumentConversionPoint).rate}%)`,
              "Count",
            ]}
          />
          <Bar dataKey="count" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
