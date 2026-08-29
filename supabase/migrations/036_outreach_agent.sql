-- Outreach agent — volume mode.
--
-- The existing loop was built for four sends a week authored by hand in a chat
-- window. The target is now 150–300 a week, twice a week, sent through an
-- external tool rather than out of one person's Gmail. Three things that were
-- implicit at four sends have to become columns at three hundred.
--
-- 1. WHICH BATCH A SEND BELONGS TO. Sending moves off the Gmail dispatcher and
--    onto a tool that takes a CSV and hands back a results CSV. Reconciling
--    "what came back" to "what went out" needs a key that survives the round
--    trip. `export_batch` is that key, and it is written at export time, not at
--    queue time, so a row exported twice is visibly wrong rather than silently
--    merged.
--
-- 2. WHICH MAILBOX IT LEFT FROM. At volume, mail goes from rotating mailboxes
--    on secondary domains. When one of them starts landing in spam, the only
--    way to see it is per-mailbox reply and bounce rates — which requires
--    knowing, per send, which mailbox it used. Recorded as text rather than a
--    FK to a mailboxes table: the sending tool owns that roster, we only
--    observe it.
--
-- 3. WHERE THE PROSPECT CAME FROM, AND WHY NOW. `source` separates Apollo rows
--    from scraped rows, which matters because their qualification evidence is
--    not comparable — an Apollo row is firmographic, a Firecrawl row quotes the
--    company's own site. `signals` is the cheap version of what intent-signal
--    vendors sell: a timestamped note that this company just did something
--    that makes contacting them today better than contacting them in March.
--    Held as jsonb rather than columns because nobody knows yet which signals
--    matter, and a schema that guesses will be wrong in a way that is annoying
--    to unwind.
--
-- Channel checks are widened to name the channels that are planned but not
-- built. This is deliberate: adding 'sms' to a CHECK constraint later means an
-- ACCESS EXCLUSIVE lock and a code deploy in the same window. Naming them now
-- costs nothing and does not enable anything — no adapter answers to them.

-- ── marketing_sends ───────────────────────────────────────────────────────

alter table public.marketing_sends
  add column if not exists export_batch text;
alter table public.marketing_sends
  add column if not exists sent_from text;

comment on column public.marketing_sends.export_batch is
  'Key of the CSV batch this row was exported in, written at export time. Null '
  'until exported. The join key for reconciling a sending tool''s results back '
  'onto the ledger.';
comment on column public.marketing_sends.sent_from is
  'The mailbox this send actually left from, e.g. chandler@getsyntric.com. '
  'Per-mailbox reply and bounce rates are the only way to see one rotating '
  'mailbox going bad before it takes the others with it.';

create index if not exists idx_marketing_sends_export_batch
  on public.marketing_sends(export_batch)
  where export_batch is not null;

-- ── marketing_prospects ───────────────────────────────────────────────────

alter table public.marketing_prospects
  add column if not exists source text;
alter table public.marketing_prospects
  add column if not exists signals jsonb not null default '[]'::jsonb;

comment on column public.marketing_prospects.source is
  'How the row was obtained: apollo | firecrawl | csv | manual. Not a CHECK — '
  'the list of providers will change faster than a constraint should.';
comment on column public.marketing_prospects.signals is
  'Array of {kind, observed_at, evidence, url}. A timestamped reason this '
  'company is worth contacting NOW rather than in three months — a hiring post, '
  'a new location, a season-booking page edit. The free version of what intent '
  'vendors charge for, aimed at segments that emit signals off LinkedIn.';

create index if not exists idx_marketing_prospects_segment_qualified
  on public.marketing_prospects(segment_id, qualified)
  where suppressed_at is null;

-- ── channel widening ──────────────────────────────────────────────────────
-- Named, not implemented. No adapter answers to sms or direct_mail.

alter table public.marketing_campaigns
  drop constraint if exists marketing_campaigns_channel_check;
alter table public.marketing_campaigns
  add constraint marketing_campaigns_channel_check
  check (channel in ('email', 'linkedin', 'meta_ads', 'sms', 'direct_mail'));

alter table public.marketing_sends
  drop constraint if exists marketing_sends_channel_check;
alter table public.marketing_sends
  add constraint marketing_sends_channel_check
  check (channel in ('email', 'linkedin', 'meta_ads', 'sms', 'direct_mail'));
