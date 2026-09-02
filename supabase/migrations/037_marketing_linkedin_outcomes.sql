-- LinkedIn joins the ledger.
--
-- The brain repo has run LinkedIn outreach since 2026-08-06 into a staging file
-- (`projects/linkedin-agent/ledger.jsonl`) that its own brief said would import
-- here in "Phase 2". Day 27 and it had not. `scripts/db/import-linkedin-ledger.ts`
-- does that import; this migration is what the import needs and what reading
-- the result needs. Four changes, all additive.
--
-- ── 1. Outcome vocabulary ─────────────────────────────────────────────────
--
-- `marketing_outcomes.outcome` was written for email: no_reply, replied,
-- meeting_booked, not_interested, wrong_person, won, lost. A LinkedIn
-- invitation resolves differently — accepted, ignored, withdrawn, declined —
-- and the constraint would have rejected every one of them. The four are
-- APPENDED, not mapped: "accepted" is not "replied", and an email is never
-- "ignored" in the sense an invitation is. A view that pools the two channels
-- has to say which vocabulary it is counting, and both views below do.
--
-- ── 2. Send metadata ──────────────────────────────────────────────────────
--
-- No jsonb exists on `marketing_sends` (025, 026, 027, 036 all add typed
-- columns). `marketing_variants.generation_config` is per variant, and a
-- LinkedIn variant is one row per *angle*, not per send — so the things that
-- vary per send (which post the person engaged with, which disclosure arm,
-- the note's measured shape, who approved it and under what label) need a
-- home on the send. Same name and reasoning as `marketing_events.metadata`
-- (025): held as jsonb because nobody knows yet which of these fields matter,
-- and a column per guess would be wrong in a way that is annoying to unwind.
--
-- The one key that gets an index is `sourcing_kind` — engagement | search |
-- pymk | school | mutual | manual | offsite_signal | unknown — because it is
-- the axis the brain's 2026-09-02 decision made the campaign about: does a
-- person who did something accept more than a person who matched a filter.
--
-- ── 3. linkedin_url index ─────────────────────────────────────────────────
--
-- `marketing_prospects.linkedin_url` has existed since 024 with no index. It
-- is now the dedupe key for every LinkedIn-sourced prospect, and the join key
-- the outreach agent's importer uses to say "same person, both channels".
-- UNIQUE, because the live table had zero rows with a linkedin_url on
-- 2026-09-02 (checked before this was written) and a duplicate from here on
-- is a bug, not data. Case-folded, same as the email index in 024.
--
-- ── 4. Two views ──────────────────────────────────────────────────────────
--
-- `marketing_sourcing_performance` — per (channel, sourcing_kind). The SQL
-- twin of `sourcing_test` in the brain's `scripts/linkedin-quota.mjs`, so the
-- two can be checked against each other. `resolved` is the count of scored
-- outcomes; `accepted` counts accepted | replied | meeting_booked, the same
-- list the script uses. Email rows read their kind from `prospects.source`
-- (apollo, firecrawl, linkedin_engagement …) because an email send has no
-- metadata of its own yet.
--
-- `marketing_prospect_channels` — per (prospect, channel, sourcing_kind): the
-- LinkedIn rows and the email rows for one person, side by side. This is a
-- join, not a rating, which is why it is a view here and not an extension of
-- `eval/performance.ts` — that file is per-variant and carries a
-- MIN_SAMPLE_FOR_SIGNAL that has no meaning for a list of one person's touches.
--
-- ── Read this with the sample size in front of you ────────────────────────
--
-- `sends` and `resolved` come before every rate, as in 034 and 035. On the
-- day this lands the LinkedIn side is one arm — `unknown`, every pre-field
-- send pooled — at 211 resolved and 19%. The engagement arm is empty. A
-- comparison exists when both are readable, and not before.

-- ── 1. marketing_outcomes.outcome ─────────────────────────────────────────

alter table public.marketing_outcomes
  drop constraint if exists marketing_outcomes_outcome_check;
alter table public.marketing_outcomes
  add constraint marketing_outcomes_outcome_check
  check (outcome in (
    -- email, from 025
    'no_reply', 'replied', 'meeting_booked', 'not_interested', 'wrong_person', 'won', 'lost',
    -- linkedin invitations, from 037. Never mapped onto the email values.
    'accepted', 'ignored', 'withdrawn', 'declined'
  ));

comment on column public.marketing_outcomes.outcome is
  'Email: no_reply | replied | meeting_booked | not_interested | wrong_person | '
  'won | lost. LinkedIn invitation: accepted | ignored | withdrawn | declined, '
  'plus replied and meeting_booked. The two vocabularies are never mapped onto '
  'each other — accepted is not replied.';

-- ── 2. marketing_sends.metadata ───────────────────────────────────────────

alter table public.marketing_sends
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.marketing_sends.metadata is
  'Per-send facts that are not columns yet. LinkedIn rows imported from the '
  'brain ledger carry: ledger_id, action (connection_request | first_message), '
  'segment, campaign_key, variant_key, disclosure, generator, sourcing_kind, '
  'sourcing {kind, field, quote, rationale, engagement{post_url, seed_account, '
  'action, comment_text, observed_at}}, note_features, notes, '
  'in_reply_to_send_id, approved_by_label, prospect_snapshot. Email rows: '
  'empty until something needs it.';

create index if not exists idx_marketing_sends_sourcing_kind
  on public.marketing_sends ((metadata->>'sourcing_kind'))
  where channel = 'linkedin';

-- ── 3. marketing_prospects.linkedin_url ───────────────────────────────────

create unique index if not exists idx_marketing_prospects_linkedin_url
  on public.marketing_prospects (lower(linkedin_url))
  where linkedin_url is not null;

comment on column public.marketing_prospects.linkedin_url is
  'Canonical form https://www.linkedin.com/in/<slug>/ — lowercase, no query, '
  'trailing slash. Unique (case-folded) since 037: the dedupe key for every '
  'LinkedIn-sourced prospect and the join key for "same person, both channels".';

-- ── 4a. marketing_sourcing_performance ────────────────────────────────────
-- Acceptance is a property of the first touch, so only step_no = 1 counts.
-- A LinkedIn first message is step 2 and must not read as a second invitation;
-- an email follow-up is step 2+ and must not count the prospect twice.

create or replace view public.marketing_sourcing_performance as
select
  s.channel,
  coalesce(s.metadata->>'sourcing_kind', p.source, 'untagged')          as sourcing_kind,
  count(s.id)                                                             as sends,
  count(o.id)                                                             as resolved,
  count(o.id) filter (where o.outcome in ('accepted', 'replied', 'meeting_booked'))
                                                                          as accepted,
  count(o.id) filter (where o.outcome = 'ignored')                        as ignored,
  count(o.id) filter (where o.outcome = 'replied')                        as replied,
  -- Null until something has resolved. Null reads as "unknown"; 0% would
  -- read as "measured and bad".
  case when count(o.id) > 0
    then round(
      count(o.id) filter (where o.outcome in ('accepted', 'replied', 'meeting_booked'))::numeric
      / count(o.id), 4)
  end                                                                     as acceptance_rate,
  min(s.sent_at)                                                          as first_sent_at,
  max(s.sent_at)                                                          as last_sent_at
from public.marketing_sends s
join public.marketing_prospects p on p.id = s.prospect_id
left join public.marketing_outcomes o on o.send_id = s.id
where s.status = 'sent'
  and s.step_no = 1
group by s.channel, coalesce(s.metadata->>'sourcing_kind', p.source, 'untagged');

alter view public.marketing_sourcing_performance set (security_invoker = on);

comment on view public.marketing_sourcing_performance is
  'Per (channel, sourcing_kind): first-touch sends, resolved outcomes, and '
  'acceptance (accepted | replied | meeting_booked over resolved). The SQL '
  'twin of sourcing_test in the brain''s linkedin-quota.mjs. Read sends and '
  'resolved before any rate.';

-- ── 4b. marketing_prospect_channels ───────────────────────────────────────
-- One person, every channel they were touched on, with the outcome vocabulary
-- of each channel counted in its own column. All steps count here — this is
-- "what happened with this person", not "which first touch worked".

create or replace view public.marketing_prospect_channels as
select
  p.id                                                                    as prospect_id,
  p.company,
  p.contact_name,
  p.linkedin_url,
  p.email,
  p.source,
  s.channel,
  coalesce(s.metadata->>'sourcing_kind', p.source, 'untagged')          as sourcing_kind,
  count(s.id)                                                             as sends,
  count(o.id) filter (where o.outcome = 'accepted')                       as accepted,
  count(o.id) filter (where o.outcome = 'ignored')                        as ignored,
  count(o.id) filter (where o.outcome = 'replied')                        as replied,
  count(o.id) filter (where o.outcome = 'meeting_booked')                 as meeting_booked,
  max(o.scored_at)                                                        as last_outcome_at,
  min(s.sent_at)                                                          as first_sent_at,
  max(s.sent_at)                                                          as last_sent_at
from public.marketing_prospects p
join public.marketing_sends s on s.prospect_id = p.id and s.status = 'sent'
left join public.marketing_outcomes o on o.send_id = s.id
group by p.id, p.company, p.contact_name, p.linkedin_url, p.email, p.source, s.channel,
         coalesce(s.metadata->>'sourcing_kind', p.source, 'untagged');

alter view public.marketing_prospect_channels set (security_invoker = on);

comment on view public.marketing_prospect_channels is
  'Per (prospect, channel, sourcing_kind): the LinkedIn rows and the email rows '
  'for one person side by side. A join, not a rating — a prospect with a '
  'linkedin row and an email row is the bridge the signal-outreach project '
  'exists to build.';
