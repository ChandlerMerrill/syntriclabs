-- What a pain point is worth, and whether an address will accept mail.
--
-- Two additions that exist for the same reason: the loop is about to send to
-- real people for the first time, and both of the decisions that precedes —
-- which problem to write about, and which address to write to — are currently
-- made on evidence that does not include the thing the decision turns on.
--
-- ── Scoring ───────────────────────────────────────────────────────────────
--
-- `frequency`, `score` and `rank` answer one question well: how much credible
-- corroboration is there for this complaint. That is a real signal and it is
-- why `rank.ts` weights an operator forum above trade press. It is also the
-- only question the table can answer, which means a complaint mentioned by six
-- sources and one mentioned by two are ordered even when the two-source one has
-- a federal deadline attached and the six-source one is a grumble.
--
-- The four dimensions below are added rather than multiplied, and unweighted.
-- Smaply's pain-point prioritisation writes up the same shape — severity +
-- frequency + business impact on 1–5 scales — and explicitly declines to weight
-- the terms without a justification for the weights, on the grounds that an
-- invented multiplier reads as precision it has not earned. The fourth
-- dimension, `addressability`, is the one that is specific to outbound rather
-- than to product research: a problem Syntric cannot build for is worth nothing
-- in a cold email no matter how badly it hurts, and without it the rubric will
-- happily rank an insurance-market problem first.
--
-- `score`, `rank` and `frequency` are left alone, deliberately. They are read by
-- the research view and written by `completeResearchRun`, they mean something
-- specific, and they are comparable across runs. Overwriting them with a
-- differently-derived number would silently break that comparison — the same
-- failure the GENERATION_PROMPT_VERSION bumps exist to prevent.
--
-- ── Verification ──────────────────────────────────────────────────────────
--
-- Every prospect on file today is a seeded alias of the operator's own inbox,
-- so nothing has ever bounced. A hard bounce rate above roughly 2% is what
-- takes a sending domain's reputation down, and it is the one deliverability
-- number that is cheap to control before the send rather than expensive to
-- explain after it.

-- ── marketing_pain_points ─────────────────────────────────────────────────

alter table public.marketing_pain_points
  add column if not exists reach smallint check (reach between 1 and 5);
alter table public.marketing_pain_points
  add column if not exists severity smallint check (severity between 1 and 5);
alter table public.marketing_pain_points
  add column if not exists urgency smallint check (urgency between 1 and 5);
alter table public.marketing_pain_points
  add column if not exists addressability smallint check (addressability between 1 and 5);

comment on column public.marketing_pain_points.reach is
  'How much credible corroboration exists, 1-5. Banded from the existing `score`, '
  'which is frequency weighted by source signal rank — this is that number made '
  'commensurable with the other three, not a second opinion about it.';

comment on column public.marketing_pain_points.severity is
  'How badly it hurts when it lands, 1-5. 1 = an irritation absorbed without '
  'comment. 5 = it costs the operator money, a client, or a licence.';

comment on column public.marketing_pain_points.urgency is
  'Whether it has a clock on it, 1-5. 1 = can be ignored indefinitely. '
  '5 = a dated deadline or a trigger that recurs inside the sending window. '
  'This is the dimension that decays: a February filing scores 5 in January and '
  '2 in August, so a score is only true as of `scored_at`.';

comment on column public.marketing_pain_points.addressability is
  'Whether Syntric can build for it and prove it, 1-5. 1 = outside what software '
  'can touch (insurance markets, weather, hiring supply). 5 = squarely a build, '
  'with a proof asset on the brand profile that speaks to it. The dimension that '
  'stops the rubric ranking a real problem nobody here can solve.';

-- Added, not multiplied, and null until every dimension is present. A pain point
-- scored on three of four is not 15/20 — it is unscored, and ordering by a
-- partial sum would put it above fully-scored rows it has not beaten.
alter table public.marketing_pain_points
  add column if not exists priority_score smallint
    generated always as (reach + severity + urgency + addressability) stored;

comment on column public.marketing_pain_points.priority_score is
  'reach + severity + urgency + addressability, max 20. Null until all four are '
  'set. Generated, so it cannot drift from the dimensions it sums.';

-- The quantified figure, and the quote that licenses it.
--
-- `{ amount, unit, period, quote, source_id, url }`. The quote must appear
-- verbatim in that source''s stored content — checked by
-- scripts/db/score-pain-points.ts before this column is written, using the same
-- normalisation research-manual.ts uses on pain point evidence. That rule is the
-- only thing separating a number that can go in a client email from one that
-- cannot, because a figure is exactly the kind of detail that survives being
-- paraphrased while ceasing to be true.
alter table public.marketing_pain_points
  add column if not exists cost_evidence jsonb;

comment on column public.marketing_pain_points.cost_evidence is
  'What the problem costs, with the verbatim quote that says so: '
  '{ amount, unit, period, quote, source_id, url }. Null when no source names a '
  'figure, which is the common case and is not a defect — an invented number is '
  'far worse than an absent one. Never write this without re-checking the quote '
  'against marketing_sources.content.';

alter table public.marketing_pain_points
  add column if not exists scored_at timestamptz;
alter table public.marketing_pain_points
  add column if not exists scored_by text check (scored_by in ('model', 'human'));

comment on column public.marketing_pain_points.scored_at is
  'When the four dimensions were set. Load-bearing because `urgency` is a '
  'statement about a date: a score read six months later is stale in a way a '
  'frequency count never is.';

comment on column public.marketing_pain_points.scored_by is
  'model = a scoring call produced it. human = authored against the rubric in a '
  'session, the same provenance distinction marketing_research_runs.'
  'extraction_transport draws for extraction.';

-- Partial: most rows are unscored, and the ordering only ever asks for scored
-- ones within a segment.
create index if not exists idx_marketing_pain_points_priority
  on public.marketing_pain_points(segment_id, priority_score desc)
  where priority_score is not null;

-- ── marketing_prospects ───────────────────────────────────────────────────

alter table public.marketing_prospects
  add column if not exists email_verification jsonb;

comment on column public.marketing_prospects.email_verification is
  'What lib/marketing/prospects/verify.ts found: '
  '{ verdict, checkedAt, domain, mx, reasons[], flags[] }. Kept whole rather than '
  'flattened because the reason a verdict was reached is what tells a list that '
  'is genuinely risky from a check that has started failing — an MX lookup that '
  'times out and a domain with no MX record are the same verdict and completely '
  'different facts.';

alter table public.marketing_prospects
  add column if not exists verification_status text not null default 'unchecked'
    check (verification_status in ('deliverable', 'risky', 'undeliverable', 'unchecked'));

comment on column public.marketing_prospects.verification_status is
  'deliverable = syntax ok, domain has MX, nothing flagged. risky = accepted but '
  'sends late and in small batches (role address, free provider, unresolvable '
  'lookup). undeliverable = never imported and never sent to. unchecked = '
  'predates verification or was added by hand; not null, because a null here and '
  'the string "unchecked" would be two spellings of the same state.';

create index if not exists idx_marketing_prospects_verification
  on public.marketing_prospects(verification_status)
  where verification_status <> 'deliverable';
