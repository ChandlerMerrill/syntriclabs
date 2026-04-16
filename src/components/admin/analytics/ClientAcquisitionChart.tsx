"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import ChartCard from "./ChartCard"
import { AXIS_STYLE, TOOLTIP_STYLE, ACQUISITION_COLORS } from "./chart-config"
import type { AcquisitionDataPoint } from "@/lib/types"

const SOURCES = [
  { key: "website", label: "Website" },
  { key: "referral", label: "Referral" },
  { key: "cold_outreach", label: "Cold Outreach" },
  { key: "event", label: "Event" },
  { key: "other", label: "Other" },
]

export default function ClientAcquisitionChart({ data }: { data: AcquisitionDataPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Client Acquisition">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No acquisition data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Client Acquisition" subtitle="New clients by source over time">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="month" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} allowDecimals={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
          {SOURCES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="1"
              stroke={ACQUISITION_COLORS[s.key]}
              fill={ACQUISITION_COLORS[s.key]}
              fillOpacity={0.4}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
