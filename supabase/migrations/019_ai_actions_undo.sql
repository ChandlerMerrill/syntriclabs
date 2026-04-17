-- Phase 5: Undo support on ai_actions.
-- Every ai_actions row that was undone gets `undone_at` set to the timestamp,
-- and `undone_by_action_id` pointing at the ai_actions row that recorded the undo.
-- The undo itself is a normal ai_actions row with tool_name = 'undo'.

alter table public.ai_actions
  add column if not exists undone_at timestamptz,
  add column if not exists undone_by_action_id uuid references public.ai_actions(id) on delete set null;

create index if not exists idx_ai_actions_undone on public.ai_actions(undone_at) where undone_at is null;
