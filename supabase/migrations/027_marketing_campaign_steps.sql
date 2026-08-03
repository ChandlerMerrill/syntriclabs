-- Follow-ups, as steps on the campaign.
--
-- A sequence is the one feature here that multiplies sends per prospect, so it
-- is deliberately the last thing built and the thinnest: an ordered list of
-- variants and the gap between them. There is no branching, no per-prospect
-- state machine, and no condition language. What decides whether step N+1 goes
-- out is the ledger that already exists — did step N send, how long ago, did
-- they reply, are they suppressed.
--
-- Re-runnable.

create table if not exists public.marketing_campaign_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,

  -- 1-based. Step 1 is the opener and is what the ordinary queue path creates.
  step_no int not null check (step_no >= 1),

  -- Days to wait after the *previous* step actually sent — not after the
  -- prospect entered the campaign. Meaningless on step 1, where it is ignored.
  delay_days int not null default 3 check (delay_days >= 0 and delay_days <= 365),

  -- The copy for this step. Cascades: a deleted variant takes its step with it
  -- rather than leaving a step that cannot render.
  variant_id uuid not null references public.marketing_variants(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (campaign_id, step_no),

  -- One variant per campaign. Not tidiness: `marketing_sends` is unique on
  -- (campaign_id, prospect_id, variant_id), so two steps sharing a variant
  -- would make the second one silently unqueueable for everyone who received
  -- the first. Better to refuse the definition than to debug the symptom.
  unique (campaign_id, variant_id)
);

create index if not exists idx_marketing_campaign_steps_campaign
  on public.marketing_campaign_steps(campaign_id, step_no);

drop trigger if exists marketing_campaign_steps_updated_at on public.marketing_campaign_steps;
create trigger marketing_campaign_steps_updated_at before update
  on public.marketing_campaign_steps
  for each row execute function update_updated_at();

alter table public.marketing_campaign_steps enable row level security;
drop policy if exists "auth_all" on public.marketing_campaign_steps;
create policy "auth_all" on public.marketing_campaign_steps
  for all to authenticated using (true) with check (true);

-- Which step a send belongs to.
--
-- Defaulted to 1 rather than left nullable so every existing row is an opener,
-- which is what all four of them are. A nullable column would make "no
-- sequence" and "step unknown" the same value, and the follow-up query has to
-- tell them apart.
alter table public.marketing_sends
  add column if not exists step_no int not null default 1;

-- The follow-up query's access path: for one campaign, what has this prospect
-- already been sent, and at which step.
create index if not exists idx_marketing_sends_campaign_prospect_step
  on public.marketing_sends(campaign_id, prospect_id, step_no);
