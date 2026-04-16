export const CHART_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  cyan: '#06B6D4',
} as const

export const AXIS_STYLE = {
  tick: { fill: '#94A3B8', fontSize: 12 },
  axisLine: { stroke: '#334155' },
  tickLine: { stroke: '#334155' },
} as const

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1E293B',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  labelStyle: { color: '#94A3B8' },
} as const

export const ACQUISITION_COLORS: Record<string, string> = {
  website: CHART_COLORS.blue,
  referral: CHART_COLORS.green,
  cold_outreach: CHART_COLORS.purple,
  event: CHART_COLORS.amber,
  other: CHART_COLORS.cyan,
}
