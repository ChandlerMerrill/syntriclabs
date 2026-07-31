-- Marketing agent — Phase 3 sending + Phase 4 traceability and eval.
--
-- Two things this schema has to guarantee, because convention won't:
--   1. Nothing sends without a recorded human approval.
--   2. The same (campaign, prospect, variant) never sends twice.
-- Both are constraints, not application logic.

create table if not exists public.marketing_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  variant_id uuid not null references public.marketing_variants(id) on delete cascade,
  prospect_id uuid not null references public.marketing_prospects(id) on delete cascade,

  channel text not null default 'email'
    check (channel in ('email', 'linkedin', 'meta_ads')),

  -- The state machine. `pending_approval` is where every send starts and it is
  -- the only state a generator can create.
  status text not null default 'pending_approval' check (status in (
    'pending_approval',
    'approved',
    'sending',
    'sent',
    'failed',
    'cancelled'
  )),

  -- Rendered at draft time so what was approved is exactly what goes out —
  -- editing the variant afterwards cannot change an approved send.
  rendered_subject text,
  rendered_body text,

  -- The approval gate. Both are set together, by a human, and never by a job.
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,

  -- Claim-before-send: set by the atomic compare-and-set that moves
  -- approved → sending. A crashed worker leaves this stamped, which is how a
  -- stuck send is found.
  claimed_at timestamptz,

  sent_at timestamptz,
  provider_message_id text,
  gmail_thread_id text,
  error text,
  attempt_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Idempotency. The same variant goes to the same prospect in the same
  -- campaign exactly once.
  unique (campaign_id, prospect_id, variant_id),

  -- The gate, in the schema. A row cannot claim to be approved-or-beyond
  -- without both approval columns filled in.
  constraint marketing_sends_approval_required check (
    status in ('pending_approval', 'cancelled')
    or (approved_by is not null and approved_at is not null)
  )
);

create index if not exists idx_marketing_sends_status
  on public.marketing_sends(status, created_at);
create index if not exists idx_marketing_sends_campaign
  on public.marketing_sends(campaign_id, created_at desc);
create index if not exists idx_marketing_sends_variant
  on public.marketing_sends(variant_id);
create index if not exists idx_marketing_sends_prospect
  on public.marketing_sends(prospect_id);
-- Reply matching walks from a thread id back to the send that opened it.
create index if not exists idx_marketing_sends_thread
  on public.marketing_sends(gmail_thread_id) where gmail_thread_id is not null;

create trigger marketing_sends_updated_at before update
  on public.marketing_sends
  for each row execute function update_updated_at();

alter table public.marketing_sends enable row level security;
drop policy if exists "auth_all" on public.marketing_sends;
create policy "auth_all" on public.marketing_sends
  for all to authenticated using (true) with check (true);

-- ── Events ────────────────────────────────────────────────────────────────
-- What happened to a send. `email_id` ties a reply back to the row the Gmail
-- sync already wrote, so nothing about `emails` has to change.

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.marketing_sends(id) on delete cascade,
  type text not null check (type in (
    'delivered', 'opened', 'clicked', 'replied', 'bounced', 'complained'
  )),
  email_id uuid references public.emails(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  -- One event of a kind per send per source row. A re-run of the sync must not
  -- double-count a reply.
  unique (send_id, type, email_id)
);

create index if not exists idx_marketing_events_send
  on public.marketing_events(send_id, occurred_at);
create index if not exists idx_marketing_events_type
  on public.marketing_events(type, occurred_at desc);

alter table public.marketing_events enable row level security;
drop policy if exists "auth_all" on public.marketing_events;
create policy "auth_all" on public.marketing_events
  for all to authenticated using (true) with check (true);

-- ── Outcomes ──────────────────────────────────────────────────────────────
-- The learning half. One scored outcome per send.

create table if not exists public.marketing_outcomes (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null unique references public.marketing_sends(id) on delete cascade,
  reply_sentiment text check (reply_sentiment in (
    'positive', 'neutral', 'negative', 'unsubscribe', 'out_of_office'
  )),
  outcome text check (outcome in (
    'no_reply', 'replied', 'meeting_booked', 'not_interested', 'wrong_person', 'won', 'lost'
  )),
  -- -1 .. 1. Deliberately coarse — at this volume a finer scale is false
  -- precision.
  score numeric(4,3),
  scored_by text not null default 'llm' check (scored_by in ('human', 'llm')),
  rationale text,
  scored_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_outcomes_outcome
  on public.marketing_outcomes(outcome);

alter table public.marketing_outcomes enable row level security;
drop policy if exists "auth_all" on public.marketing_outcomes;
create policy "auth_all" on public.marketing_outcomes
  for all to authenticated using (true) with check (true);

-- ── Performance view ──────────────────────────────────────────────────────
-- Sample size sits next to every rate, always. At single-digit monthly
-- conversions the optimization signal is not there, and a two-reply "winner"
-- has to be visibly not a winner. The view refuses to hide n.
--
-- generation_prompt is exposed alongside the rates because the point of the
-- loop is to improve the generator, not just to pick an output.

create or replace view public.marketing_variant_performance as
select
  v.id                                   as variant_id,
  v.campaign_id,
  c.name                                 as campaign_name,
  c.channel,
  v.label,
  v.subject,
  v.model,
  v.parent_variant_id,
  v.icp_fear,
  v.generation_prompt,
  count(s.id) filter (where s.status = 'sent')                   as sends,
  count(distinct e_rep.send_id)                                  as replies,
  count(distinct e_bnc.send_id)                                  as bounces,
  count(o.id)                                                    as scored,
  -- Rates are null until there is anything to divide by. A null reads as
  -- "unknown" in the UI; 0% would read as "measured and bad".
  case when count(s.id) filter (where s.status = 'sent') > 0
    then round(count(distinct e_rep.send_id)::numeric
               / count(s.id) filter (where s.status = 'sent'), 4)
  end                                                            as reply_rate,
  case when count(s.id) filter (where s.status = 'sent') > 0
    then round(count(distinct e_bnc.send_id)::numeric
               / count(s.id) filter (where s.status = 'sent'), 4)
  end                                                            as bounce_rate,
  round(avg(o.score), 4)                                         as avg_score,
  min(s.sent_at)                                                 as first_sent_at,
  max(s.sent_at)                                                 as last_sent_at
from public.marketing_variants v
join public.marketing_campaigns c on c.id = v.campaign_id
left join public.marketing_sends s on s.variant_id = v.id
left join public.marketing_events e_rep
  on e_rep.send_id = s.id and e_rep.type = 'replied'
left join public.marketing_events e_bnc
  on e_bnc.send_id = s.id and e_bnc.type = 'bounced'
left join public.marketing_outcomes o on o.send_id = s.id
group by v.id, c.name, c.channel;

-- Views inherit the RLS of their base tables when created by a non-superuser,
-- but be explicit: this one is only ever read through requireAdmin().
alter view public.marketing_variant_performance set (security_invoker = on);
