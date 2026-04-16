-- 1. Knowledgebase articles (source content for embedding)
create table knowledgebase_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('services','faq','case_study','process','about')),
  content text not null,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table knowledgebase_articles enable row level security;
create policy "Service role full access" on knowledgebase_articles
  for all using (true) with check (true);

-- 2. Widget leads
create table widget_leads (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  conversation_id uuid references widget_conversations(id),
  first_name text,
  last_name text,
  email text,
  phone text,
  preferred_contact text check (preferred_contact in ('phone','email','sms')),
  role text,
  organization text,
  business_type text,
  service_interest text,
  request text,
  summary text,
  status text default 'new' check (status in ('new','contacted','qualified','converted','dismissed')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table widget_leads enable row level security;
create policy "Service role full access" on widget_leads
  for all using (true) with check (true);

-- 3. Escalation tickets
create table widget_escalations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  conversation_id uuid references widget_conversations(id),
  lead_id uuid references widget_leads(id),
  reason text not null,
  preferred_method text,
  status text default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz default now()
);

alter table widget_escalations enable row level security;
create policy "Service role full access" on widget_escalations
  for all using (true) with check (true);

-- 4. Update embeddings constraint to allow 'knowledgebase' type
alter table embeddings drop constraint if exists embeddings_entity_type_check;
alter table embeddings add constraint embeddings_entity_type_check
  check (entity_type in ('client', 'project', 'deal', 'activity', 'email', 'transcript', 'knowledgebase'));

-- 5. Triggers for updated_at on new tables
create trigger set_knowledgebase_articles_updated_at
  before update on knowledgebase_articles
  for each row execute function update_updated_at();

create trigger set_widget_leads_updated_at
  before update on widget_leads
  for each row execute function update_updated_at();
