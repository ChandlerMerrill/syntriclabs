-- ═══════════════════════════════════════════════
-- Syntric AI OS — Full Database Schema
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ═══ PHASE 1: SUBMISSIONS ═══
create table submissions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  company text,
  preferred_contact text,
  service text,
  improvements text[] default '{}',
  message text not null,
  status text not null default 'unread' check (status in ('unread', 'read', 'replied', 'archived')),
  notes text,
  created_at timestamptz default now(),
  read_at timestamptz,
  updated_at timestamptz default now()
);

alter table submissions enable row level security;

create policy "Authenticated users can read submissions"
  on submissions for select to authenticated using (true);

create policy "Authenticated users can update submissions"
  on submissions for update to authenticated using (true);

-- ═══ AUTO-UPDATE TRIGGER ═══
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger submissions_updated_at
  before update on submissions
  for each row execute function update_updated_at();

-- ═══ PHASE 2: CLIENTS ═══
create table clients (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  industry text,
  website text,
  status text not null default 'prospect'
    check (status in ('active', 'inactive', 'prospect')),
  source text default 'other'
    check (source in ('website', 'referral', 'cold_outreach', 'event', 'other')),
  tags text[] default '{}',
  notes text default '',
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  created_from_submission uuid references submissions(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ CLIENT CONTACTS ═══
create table client_contacts (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- ═══ PROJECTS ═══
create table projects (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  description text default '',
  scope text default '',
  status text not null default 'planning'
    check (status in ('planning', 'active', 'paused', 'completed', 'cancelled')),
  tech_stack text[] default '{}',
  budget_min integer,
  budget_max integer,
  start_date date,
  target_end_date date,
  actual_end_date date,
  links jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ DEALS ═══
create table deals (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  stage text not null default 'lead'
    check (stage in ('lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost')),
  value integer default 0,
  probability integer default 10
    check (probability >= 0 and probability <= 100),
  expected_close_date date,
  actual_close_date date,
  lost_reason text,
  notes text default '',
  stage_history jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ ACTIVITIES ═══
create table activities (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  type text not null
    check (type in ('note', 'call', 'email', 'meeting', 'document', 'status_change')),
  title text not null,
  description text default '',
  metadata jsonb default '{}',
  is_auto_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ INDEXES ═══
create index idx_clients_status on clients(status);
create index idx_clients_industry on clients(industry);
create index idx_client_contacts_client on client_contacts(client_id);
create index idx_projects_client on projects(client_id);
create index idx_projects_status on projects(status);
create index idx_deals_client on deals(client_id);
create index idx_deals_stage on deals(stage);
create index idx_deals_stage_updated on deals(stage, updated_at desc);
create index idx_activities_client on activities(client_id);
create index idx_activities_type on activities(type);
create index idx_activities_created on activities(created_at desc);

-- ═══ RLS ═══
alter table clients enable row level security;
alter table client_contacts enable row level security;
alter table projects enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;

create policy "auth_all" on clients for all to authenticated using (true) with check (true);
create policy "auth_all" on client_contacts for all to authenticated using (true) with check (true);
create policy "auth_all" on projects for all to authenticated using (true) with check (true);
create policy "auth_all" on deals for all to authenticated using (true) with check (true);
create policy "auth_all" on activities for all to authenticated using (true) with check (true);

-- ═══ UPDATED_AT TRIGGERS ═══
create trigger clients_updated_at before update on clients
  for each row execute function update_updated_at();
create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();
create trigger deals_updated_at before update on deals
  for each row execute function update_updated_at();
create trigger activities_updated_at before update on activities
  for each row execute function update_updated_at();

-- ═══ PHASE 3: DOCUMENTS ═══
create table documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  type text not null check (type in ('proposal','price_sheet','contract','counter_proposal')),
  title text not null,
  status text not null default 'draft' check (status in ('draft','final','sent','accepted','rejected')),
  version integer not null default 1,
  content_data jsonb not null default '{}',
  storage_path text,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_documents_client on documents(client_id);
create index idx_documents_type on documents(type);
create index idx_documents_deal on documents(deal_id);
alter table documents enable row level security;
create policy "auth_all" on documents for all to authenticated using (true) with check (true);
create trigger documents_updated_at before update on documents
  for each row execute function update_updated_at();

-- ═══ PHASE 4: MESSAGING ═══

-- conversations: one per channel+user combo
create table conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('admin_chat', 'telegram')),
  external_id text,
  title text,
  last_message_at timestamptz not null default now(),
  is_archived boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_channel on conversations(channel);
create index idx_conversations_last_message on conversations(last_message_at desc);
create unique index idx_conversations_external on conversations(channel, external_id) where external_id is not null;

alter table conversations enable row level security;
create policy "Admin read conversations" on conversations for select to authenticated using (true);
create policy "Service write conversations" on conversations for all to service_role using (true) with check (true);

create trigger conversations_updated_at before update on conversations
  for each row execute function update_updated_at();

-- messages: every user and assistant message
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb,
  client_id uuid references clients(id),
  deal_id uuid references deals(id),
  project_id uuid references projects(id),
  is_read boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_unread on messages(is_read) where is_read = false;

alter table messages enable row level security;
create policy "Admin read messages" on messages for select to authenticated using (true);
create policy "Service write messages" on messages for all to service_role using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
