export const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead', color: 'slate', defaultProbability: 10 },
  { value: 'discovery', label: 'Discovery', color: 'blue', defaultProbability: 25 },
  { value: 'proposal', label: 'Proposal', color: 'purple', defaultProbability: 50 },
  { value: 'negotiation', label: 'Negotiation', color: 'amber', defaultProbability: 75 },
  { value: 'won', label: 'Won', color: 'emerald', defaultProbability: 100 },
  { value: 'lost', label: 'Lost', color: 'red', defaultProbability: 0 },
] as const

export const CLIENT_STATUSES = [
  { value: 'active', label: 'Active', color: 'emerald' },
  { value: 'inactive', label: 'Inactive', color: 'zinc' },
  { value: 'prospect', label: 'Prospect', color: 'blue' },
] as const

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning', color: 'blue' },
  { value: 'active', label: 'Active', color: 'emerald' },
  { value: 'paused', label: 'Paused', color: 'amber' },
  { value: 'completed', label: 'Completed', color: 'slate' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const

export const INDUSTRIES = [
  'Construction',
  'Healthcare',
  'Retail',
  'Real Estate',
  'Professional Services',
  'Manufacturing',
  'Food & Beverage',
  'Education',
  'Technology',
  'Finance',
  'Non-Profit',
  'Other',
] as const

export const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note', icon: 'StickyNote', color: 'slate' },
  { value: 'call', label: 'Call', icon: 'Phone', color: 'green' },
  { value: 'email', label: 'Email', icon: 'Mail', color: 'blue' },
  { value: 'meeting', label: 'Meeting', icon: 'Calendar', color: 'purple' },
  { value: 'document', label: 'Document', icon: 'FileText', color: 'amber' },
  { value: 'status_change', label: 'Status Change', icon: 'ArrowRightLeft', color: 'cyan' },
] as const

export const CLIENT_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
] as const

export const DOCUMENT_TYPES = [
  { value: 'proposal', label: 'Proposal', color: 'purple' },
  { value: 'price_sheet', label: 'Price Sheet', color: 'blue' },
  { value: 'contract', label: 'Contract', color: 'emerald' },
  { value: 'counter_proposal', label: 'Counter-Proposal', color: 'amber' },
] as const

export const DOCUMENT_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'final', label: 'Final', color: 'blue' },
  { value: 'sent', label: 'Sent', color: 'purple' },
  { value: 'accepted', label: 'Accepted', color: 'emerald' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
] as const

export const EMAIL_DIRECTIONS = [
  { value: 'inbound', label: 'Received', color: 'blue', icon: 'ArrowDownLeft' },
  { value: 'outbound', label: 'Sent', color: 'emerald', icon: 'ArrowUpRight' },
] as const

export const TRANSCRIPT_SENTIMENTS = [
  { value: 'positive', label: 'Positive', color: 'emerald' },
  { value: 'neutral', label: 'Neutral', color: 'slate' },
  { value: 'negative', label: 'Negative', color: 'red' },
  { value: 'mixed', label: 'Mixed', color: 'amber' },
] as const

export const TRANSCRIPT_PROCESSING_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'processing', label: 'Processing', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'emerald' },
  { value: 'failed', label: 'Failed', color: 'red' },
] as const

export const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  proposal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  price_sheet: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contract: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  counter_proposal: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

export const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  discovery: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  proposal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  negotiation: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  qualified: 'bg-purple-500/10 text-purple-400',
  converted: 'bg-emerald-500/10 text-emerald-400',
  dismissed: 'bg-zinc-500/10 text-zinc-400',
}

export const ESCALATION_STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/10 text-red-400',
  in_progress: 'bg-yellow-500/10 text-yellow-400',
  resolved: 'bg-emerald-500/10 text-emerald-400',
  closed: 'bg-zinc-500/10 text-zinc-400',
}

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400',
  inactive: 'bg-zinc-500/10 text-zinc-400',
  prospect: 'bg-blue-500/10 text-blue-400',
  planning: 'bg-blue-500/10 text-blue-400',
  paused: 'bg-amber-500/10 text-amber-400',
  completed: 'bg-slate-500/10 text-slate-300',
  cancelled: 'bg-red-500/10 text-red-400',
  draft: 'bg-slate-500/10 text-slate-400',
  final: 'bg-blue-500/10 text-blue-400',
  sent: 'bg-purple-500/10 text-purple-400',
  accepted: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
}
