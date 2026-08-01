// Plain module on purpose. The server page needs to validate `?tab=` against
// this list, and a `const` exported from a "use client" file does not survive
// the RSC boundary — it arrives as a client-reference proxy, so `.includes` is
// not a function. Shared data belongs outside the client entry point.

export const WORKSPACE_TABS = ["variants", "outbox", "performance", "audience"] as const

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]

export const TAB_LABELS: Record<WorkspaceTab, string> = {
  variants: "Variants",
  outbox: "Outbox",
  performance: "Performance",
  audience: "Audience",
}

export function resolveTab(raw: string | undefined): WorkspaceTab {
  return WORKSPACE_TABS.includes(raw as WorkspaceTab) ? (raw as WorkspaceTab) : "variants"
}
