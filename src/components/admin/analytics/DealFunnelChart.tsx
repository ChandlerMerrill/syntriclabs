"use client"

import ChartCard from "./ChartCard"
import { CHART_COLORS } from "./chart-config"
import type { FunnelDataPoint } from "@/lib/types"

const STAGE_COLORS: Record<string, string> = {
  lead: CHART_COLORS.blue,
  discovery: CHART_COLORS.cyan,
  proposal: CHART_COLORS.purple,
  negotiation: CHART_COLORS.amber,
  won: CHART_COLORS.green,
}

export default function DealFunnelChart({ data }: { data: FunnelDataPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Deal Funnel">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No funnel data in this period.</p>
      </ChartCard>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <ChartCard title="Deal Funnel" subtitle="Stage progression with drop-off %">
      <div className="space-y-3 py-2">
        {data.map((d, i) => {
          const widthPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
          const color = STAGE_COLORS[d.stage] ?? CHART_COLORS.blue
          return (
            <div key={d.stage}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="capitalize text-[#F8FAFC]">{d.stage}</span>
                <span className="text-[#94A3B8]">
                  {d.count} deals
                  {i > 0 && <span className="ml-2 text-red-400">-{d.dropOff}%</span>}
                </span>
              </div>
              <div className="h-6 w-full rounded bg-white/5">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
