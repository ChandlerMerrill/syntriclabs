-- AI Actions: raw operational log of every tool call made by Claude (admin chat, Telegram, playground).
-- Separate from `activities` (user-visible CRM timeline). Every writeable tool wraps execute() in
-- withAIAudit() which writes a row here on success or failure.

create table if not exists public.ai_actions (
  id uuid default gen_random_uuid() primary key,
  tool_name text not null,
  args jsonb not null default '{}',
  result jsonb,
  status text not null default 'success' check (status in ('success','error')),
  error_message text,
  conversation_id uuid references public.conversations(id) on delete set null,
  channel text,
  client_id uuid references public.clients(id) on delete set null,
  reversal_hint jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_ai_actions_created_at on public.ai_actions(created_at desc);
create index if not exists idx_ai_actions_tool_name on public.ai_actions(tool_name);
create index if not exists idx_ai_actions_conversation on public.ai_actions(conversation_id);
create index if not exists idx_ai_actions_status on public.ai_actions(status);

alter table public.ai_actions enable row level security;

drop policy if exists "auth_all" on public.ai_actions;
create policy "auth_all" on public.ai_actions
  for all to authenticated using (true) with check (true);
