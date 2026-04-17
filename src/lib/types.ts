// ─── Enums ───
export type SubmissionStatus = 'unread' | 'read' | 'replied' | 'archived'
export type ClientStatus = 'active' | 'inactive' | 'prospect'
export type ClientSource = 'website' | 'referral' | 'cold_outreach' | 'event' | 'other'
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
export type DealStage = 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'document' | 'status_change'

// ─── Database Row Types ───
export interface Submission {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  preferred_contact: string | null
  service: string | null
  improvements: string[]
  message: string
  status: SubmissionStatus
  notes: string | null
  created_at: string
  read_at: string | null
  updated_at: string
}

export interface Client {
  id: string
  company_name: string
  industry: string | null
  website: string | null
  status: ClientStatus
  source: ClientSource
  tags: string[]
  notes: string
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  created_from_submission: string | null
  created_at: string
  updated_at: string
}

export interface ClientContact {
  id: string
  client_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  is_primary: boolean
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description: string
  scope: string
  status: ProjectStatus
  tech_stack: string[]
  budget_min: number | null
  budget_max: number | null
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  links: { label: string; url: string }[]
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  client_id: string
  project_id: string | null
  title: string
  stage: DealStage
  value: number
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  lost_reason: string | null
  notes: string
  stage_history: StageHistoryEntry[]
  is_archived: boolean
  archived_at: string | null
  archive_reason: string | null
  created_at: string
  updated_at: string
}

export interface StageHistoryEntry {
  from: string
  to: string
  timestamp: string
  note?: string
}

export interface Activity {
  id: string
  client_id: string
  deal_id: string | null
  project_id: string | null
  type: ActivityType
  title: string
  description: string
  metadata: Record<string, unknown>
  is_auto_generated: boolean
  created_at: string
  updated_at: string
}

// ─── Input Types ───
export type ClientInput = Omit<Client, 'id' | 'created_at' | 'updated_at'>
export type ClientContactInput = Omit<ClientContact, 'id' | 'created_at'>
export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type DealInput = Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'stage_history'>
export type ActivityInput = Omit<Activity, 'id' | 'created_at' | 'updated_at'>

// ─── Document Types ───
export type DocumentType = 'proposal' | 'price_sheet' | 'contract' | 'counter_proposal' | 'custom'
export type DocumentStatus = 'draft' | 'final' | 'sent' | 'accepted' | 'rejected'

export interface Document {
  id: string
  client_id: string | null
  deal_id: string | null
  project_id: string | null
  type: DocumentType
  title: string
  status: DocumentStatus
  version: number
  content_data: Record<string, unknown>
  storage_path: string | null
  notes: string
  created_at: string
  updated_at: string
}

export type DocumentInput = Omit<Document, 'id' | 'created_at' | 'updated_at' | 'version' | 'storage_path'>

export interface DocumentWithClient extends Document {
  clients: Pick<Client, 'id' | 'company_name'> | null
}

export interface ProposalData {
  clientName: string
  clientIndustry?: string
  projectName: string
  executiveSummary: string
  scopeItems: { title: string; description: string }[]
  timeline: { phase: string; duration: string; description: string }[]
  pricing: { item: string; description: string; hours: number; rate: number }[]
  totalMin?: number
  totalMax?: number
  terms: string[]
  validUntil?: string
}

export interface PriceSheetData {
  clientName: string
  projectName?: string
  lineItems: { service: string; description: string; hours: number; rate: number }[]
  discount?: number
  notes?: string
  validUntil?: string
}

export interface ContractData {
  clientName: string
  clientContactName: string
  clientContactEmail?: string
  projectName: string
  scope: string
  deliverables: string[]
  startDate: string
  endDate: string
  paymentTerms: string
  totalValue: number
  ipClause?: string
  terminationClause?: string
}

export interface CustomDocumentSection {
  heading: string
  body: string
}

export interface CustomDocumentData {
  title: string
  subtitle?: string
  body: string
  sections?: CustomDocumentSection[]
}

// ─── Messaging Types ───
export type MessageChannel = 'admin_chat' | 'telegram'
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Conversation {
  id: string
  channel: MessageChannel
  external_id: string | null
  title: string | null
  last_message_at: string
  is_archived: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tool_calls: Array<{ toolName: string; args: unknown; result?: unknown }> | null
  client_id: string | null
  deal_id: string | null
  project_id: string | null
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Joined Types ───
export interface ClientWithContacts extends Client {
  client_contacts: ClientContact[]
}

export interface DealWithClient extends Deal {
  clients: Pick<Client, 'id' | 'company_name' | 'industry'> | null
}

export interface ProjectWithClient extends Project {
  clients: Pick<Client, 'id' | 'company_name'> | null
}

export interface ActivityWithContext extends Activity {
  clients: Pick<Client, 'id' | 'company_name'> | null
}

// ─── Email Types ───
export type EmailDirection = 'inbound' | 'outbound'

export interface Email {
  id: string
  gmail_message_id: string
  gmail_thread_id: string | null
  client_id: string | null
  from_address: string
  from_name: string | null
  to_addresses: { address: string; name: string }[]
  cc_addresses: { address: string; name: string }[]
  bcc_addresses: { address: string; name: string }[]
  subject: string | null
  body_text: string | null
  body_html: string | null
  snippet: string | null
  label_ids: string[]
  is_read: boolean
  is_starred: boolean
  is_draft: boolean
  has_attachments: boolean
  internal_date: string
  direction: EmailDirection
  matched_contact_id: string | null
  raw_headers: Record<string, string> | null
  created_at: string
}

export interface EmailWithClient extends Email {
  clients: Pick<Client, 'id' | 'company_name'> | null
}

export interface EmailAttachment {
  id: string
  email_id: string
  gmail_attachment_id: string | null
  filename: string | null
  mime_type: string | null
  size_bytes: number | null
}

export interface EmailThread {
  thread_id: string
  subject: string
  last_date: string
  message_count: number
  client: Pick<Client, 'id' | 'company_name'> | null
  emails: Email[]
  snippet: string
  is_read: boolean
  direction: EmailDirection
}

export interface GmailAccount {
  id: string
  user_id: string
  email_address: string
  history_id: number | null
  last_sync_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Transcript Types ───
export type TranscriptSentiment = 'positive' | 'neutral' | 'negative' | 'mixed'
export type TranscriptProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface TranscriptActionItem {
  text: string
  assignee?: string
  due_date?: string
}

export interface Transcript {
  id: string
  fireflies_id: string
  client_id: string | null
  title: string
  date: string
  duration_minutes: number | null
  organizer_email: string | null
  participants: { name: string; email: string }[]
  raw_transcript: string | null
  summary: string | null
  action_items: TranscriptActionItem[]
  key_decisions: string[]
  sentiment: TranscriptSentiment | null
  topics: string[]
  fireflies_url: string | null
  matched_contact_ids: string[]
  processing_status: TranscriptProcessingStatus
  processing_error: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TranscriptWithClient extends Transcript {
  clients: Pick<Client, 'id' | 'company_name'> | null
}

// ─── Widget Lead Types ───
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'dismissed'
export type EscalationStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface WidgetLead {
  id: string; session_id: string; conversation_id: string | null
  first_name: string | null; last_name: string | null; email: string | null
  phone: string | null; preferred_contact: string | null; role: string | null
  organization: string | null; business_type: string | null
  service_interest: string | null; request: string | null; summary: string | null
  status: LeadStatus; metadata: Record<string, unknown>
  created_at: string; updated_at: string
}

export interface WidgetEscalation {
  id: string; session_id: string; conversation_id: string | null
  lead_id: string | null; reason: string; preferred_method: string | null
  status: EscalationStatus; created_at: string
}

export interface WidgetLeadWithEscalations extends WidgetLead {
  widget_escalations: WidgetEscalation[]
}

// ─── Knowledgebase Types ───
export type KnowledgebaseCategory = 'services' | 'faq' | 'case_study' | 'process' | 'about'

export interface KnowledgebaseArticle {
  id: string
  title: string
  category: KnowledgebaseCategory
  content: string
  is_published: boolean
  created_at: string
  updated_at: string
}

// ─── Analytics Types ───
export interface DateRange {
  from: string
  to: string
}

export interface RevenueDataPoint {
  month: string
  revenue: number
}

export interface VelocityDataPoint {
  stage: string
  avgDays: number
}

export interface FunnelDataPoint {
  stage: string
  count: number
  dropOff: number
}

export interface WinLossDataPoint {
  month: string
  won: number
  lost: number
  winRate: number
}

export interface DocumentConversionPoint {
  status: string
  count: number
  rate: number
}

export interface AcquisitionDataPoint {
  month: string
  website: number
  referral: number
  cold_outreach: number
  event: number
  other: number
}

export interface TopClientDataPoint {
  clientId: string
  companyName: string
  industry: string | null
  totalRevenue: number
  dealCount: number
}

// ─── Widget Analytics Types ───
export interface WidgetOverview {
  conversations: number
  messages: number
  leads: number
  escalations: number
}

export interface WidgetConversationPoint { date: string; count: number }
export interface WidgetConversionPoint { month: string; conversations: number; leads: number; rate: number }
