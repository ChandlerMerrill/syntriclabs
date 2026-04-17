-- Pending Actions: one-time-use tokens for the two-step hard-delete confirm flow.
-- Claude proposes a destructive action (first call), the user affirms, Claude re-calls
-- with { confirmToken }. Tokens are scoped to one conversation and expire in 5 minutes.
-- Cleanup is lazy — consumeConfirmToken rejects expired rows; no cron runs on this table.

create table if not exists public.pending_actions (
  token uuid default gen_random_uuid() primary key,
  tool_name text not null,
  args jsonb not null default '{}',
  preview jsonb not null default '{}',
  conversation_id uuid references public.conversations(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_pending_actions_conversation on public.pending_actions(conversation_id);
create index if not exists idx_pending_actions_expires_at on public.pending_actions(expires_at);

alter table public.pending_actions enable row level security;

drop policy if exists "auth_all" on public.pending_actions;
create policy "auth_all" on public.pending_actions
  for all to authenticated using (true) with check (true);
