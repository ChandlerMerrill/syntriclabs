/** Row shapes for the `marketing_*` tables. Mirrors migrations 023–025. */

export type MarketingChannel = 'email' | 'linkedin' | 'meta_ads'

export type ResearchRunStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type SourceKind =
  | 'forum'
  | 'review'
  | 'job_posting'
  | 'press'
  | 'competitor'
  | 'transcript'
  | 'web'

export type VariantStatus = 'draft' | 'checks_failed' | 'ready' | 'retired'

export type CheckRule =
  | 'banned_words'
  | 'word_count'
  | 'opens_with_i'
  | 'one_ask'
  | 'link_verified'
  | 'claim_traced'
  | 'human'

export type SendStatus =
  | 'pending_approval'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled'

export type EventType =
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'complained'

export interface MarketingSegment {
  id: string
  brand_profile_id: string
  slug: string
  name: string
  description: string | null
  qualifiers: string[]
  disqualifiers: string[]
  created_at: string
  updated_at: string
}

export interface MarketingResearchRun {
  id: string
  brand_profile_id: string
  segment_id: string | null
  status: ResearchRunStatus
  processing_error: string | null
  trigger: 'manual' | 'cron'
  source_count: number
  outside_source_count: number
  pain_point_count: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface MarketingSource {
  id: string
  research_run_id: string | null
  segment_id: string | null
  kind: SourceKind
  url: string | null
  title: string | null
  content: string | null
  signal_rank: number
  is_outside_injection: boolean
  fetched_at: string
  fetch_error: string | null
  created_at: string
}

export interface PainPointEvidence {
  source_id: string | null
  quote: string
  url: string | null
}

export interface MarketingPainPoint {
  id: string
  research_run_id: string
  segment_id: string | null
  statement: string
  frequency: number
  rank: number | null
  score: number
  evidence: PainPointEvidence[]
  icp_fear: string | null
  created_at: string
}

export interface MarketingCampaign {
  id: string
  brand_profile_id: string
  segment_id: string | null
  name: string
  channel: MarketingChannel
  goal: string | null
  status: 'draft' | 'active' | 'paused' | 'archived'
  created_at: string
  updated_at: string
}

export interface MarketingVariant {
  id: string
  campaign_id: string
  pain_point_id: string | null
  label: string | null
  subject: string | null
  body: string | null
  asset_url: string | null
  asset_prompt: string | null
  generation_prompt: string
  generation_config: Record<string, unknown>
  model: string
  parent_variant_id: string | null
  icp_fear: string | null
  status: VariantStatus
  created_at: string
  updated_at: string
}

export interface MarketingVariantCheck {
  id: string
  variant_id: string
  rule: CheckRule
  passed: boolean
  detail: string | null
  checked_by: 'system' | 'human'
  checked_at: string
}

export interface MarketingProspect {
  id: string
  segment_id: string | null
  client_id: string | null
  company: string
  contact_name: string | null
  email: string | null
  linkedin_url: string | null
  website: string | null
  location: string | null
  notes: string | null
  qualified: boolean | null
  qualification_reason: string | null
  suppressed_at: string | null
  suppression_reason: string | null
  created_at: string
  updated_at: string
}

export interface MarketingSend {
  id: string
  campaign_id: string
  variant_id: string
  prospect_id: string
  channel: MarketingChannel
  status: SendStatus
  rendered_subject: string | null
  rendered_body: string | null
  approved_by: string | null
  approved_at: string | null
  claimed_at: string | null
  sent_at: string | null
  provider_message_id: string | null
  gmail_thread_id: string | null
  error: string | null
  attempt_count: number
  created_at: string
  updated_at: string
}

export interface MarketingEvent {
  id: string
  send_id: string
  type: EventType
  email_id: string | null
  occurred_at: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface MarketingOutcome {
  id: string
  send_id: string
  reply_sentiment: 'positive' | 'neutral' | 'negative' | 'unsubscribe' | 'out_of_office' | null
  outcome:
    | 'no_reply'
    | 'replied'
    | 'meeting_booked'
    | 'not_interested'
    | 'wrong_person'
    | 'won'
    | 'lost'
    | null
  score: number | null
  scored_by: 'human' | 'llm'
  rationale: string | null
  scored_at: string
  created_at: string
}

/**
 * A row of `marketing_variant_performance`.
 *
 * `sends` is not optional and the UI is not allowed to hide it. At Syntric's
 * conversion volume the optimization signal is not there; a two-reply "winner"
 * has to look like what it is.
 */
export interface VariantPerformance {
  variant_id: string
  campaign_id: string
  campaign_name: string
  channel: MarketingChannel
  label: string | null
  subject: string | null
  model: string
  parent_variant_id: string | null
  icp_fear: string | null
  generation_prompt: string
  sends: number
  replies: number
  bounces: number
  scored: number
  reply_rate: number | null
  bounce_rate: number | null
  avg_score: number | null
  first_sent_at: string | null
  last_sent_at: string | null
}
