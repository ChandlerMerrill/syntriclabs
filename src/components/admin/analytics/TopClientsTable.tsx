"use client"

import Link from "next/link"
import ChartCard from "./ChartCard"
import { formatCurrency } from "@/lib/utils"
import type { TopClientDataPoint } from "@/lib/types"

export default function TopClientsTable({ data }: { data: TopClientDataPoint[] }) {
  if (!data.length) {
    return (
      <ChartCard title="Top Clients">
        <p className="py-12 text-center text-sm text-[#94A3B8]">No client revenue data in this period.</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Top Clients" subtitle="By closed-won revenue">
      <div className="space-y-2">
        {data.map((c, i) => (
          <Link
            key={c.clientId}
            href={`/admin/clients/${c.clientId}`}
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 transition-colors hover:bg-white/8"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-right text-xs font-medium text-[#94A3B8]">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-white">{c.companyName}</p>
                {c.industry && <p className="text-xs text-[#94A3B8]">{c.industry}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{formatCurrency(c.totalRevenue)}</p>
              <p className="text-xs text-[#94A3B8]">{c.dealCount} deal{c.dealCount !== 1 ? "s" : ""}</p>
            </div>
          </Link>
        ))}
      </div>
    </ChartCard>
  )
}
