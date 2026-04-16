-- Phase 5C: Marketing Chat Widget
-- Run this in Supabase SQL editor

create table widget_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  ip_address text,
  user_agent text,
  last_message_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_widget_conv_session on widget_conversations(session_id);

create table widget_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references widget_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_widget_msgs_conv on widget_messages(conversation_id, created_at);

create table widget_rate_limits (
  ip_address text not null,
  window_start timestamptz not null,
  message_count int not null default 1,
  primary key (ip_address, window_start)
);

-- RLS: service role only
alter table widget_conversations enable row level security;
alter table widget_messages enable row level security;
alter table widget_rate_limits enable row level security;
create policy "Service role" on widget_conversations for all to service_role using (true) with check (true);
create policy "Service role" on widget_messages for all to service_role using (true) with check (true);
create policy "Service role" on widget_rate_limits for all to service_role using (true) with check (true);
