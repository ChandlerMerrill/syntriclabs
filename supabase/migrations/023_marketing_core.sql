-- Marketing agent — Phase 0/1 core.
--
-- The loop is: research → generate → QA → publish → measure → learn.
-- This migration covers the research half plus the productization seam.
--
-- Everything lives in `public` with a `marketing_` prefix — no client in this
-- repo is constructed with a `schema:` option, so a separate schema would be
-- invisible to every existing helper.
--
-- Every table gets RLS + the `auth_all` policy. A table with only a
-- service_role policy returns zero rows through requireAdmin(), which returns
-- an RLS-scoped client.

-- ── Brand profiles — THE PRODUCTIZATION SEAM ──────────────────────────────
-- One row = one tenant. The loop code never hard-codes a Syntric fact; it
-- reads voice rules, banned words, ICP, and proof assets from here. For a
-- client, this row is the output of a Design Sprint.

create table if not exists public.marketing_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_default boolean not null default false,

  -- Tone, structure, and the hooks/CTA rules. Free-form prose the generator
  -- prompt embeds verbatim.
  voice_rules jsonb not null default '{}',

  -- Hard reject list. Checked mechanically, case-insensitive, before a variant
  -- can ever be queued for approval.
  banned_words text[] not null default '{}',

  -- Mechanical constraints: max word count, opening-word bans, one-ask, etc.
  hard_rules jsonb not null default '{}',

  -- Who we sell to: revenue band, decision maker, segments, fears, objections.
  icp jsonb not null default '{}',

  -- Named, verifiable proof. Each entry needs a url the checker can resolve.
  proof_assets jsonb not null default '[]',

  -- Offerings, and which of them may be claimed as a delivered result.
  offer_constraints jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_marketing_brand_profiles_default
  on public.marketing_brand_profiles(is_default) where is_default;

drop trigger if exists marketing_brand_profiles_updated_at on public.marketing_brand_profiles;
create trigger marketing_brand_profiles_updated_at before update
  on public.marketing_brand_profiles
  for each row execute function update_updated_at();

alter table public.marketing_brand_profiles enable row level security;
drop policy if exists "auth_all" on public.marketing_brand_profiles;
create policy "auth_all" on public.marketing_brand_profiles
  for all to authenticated using (true) with check (true);

-- ── Segments ──────────────────────────────────────────────────────────────

create table if not exists public.marketing_segments (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references public.marketing_brand_profiles(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  -- What makes a prospect in this segment worth contacting, and what rules
  -- them out. Both are arrays of plain-language statements the qualifier reads.
  qualifiers text[] not null default '{}',
  disqualifiers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_profile_id, slug)
);

drop trigger if exists marketing_segments_updated_at on public.marketing_segments;
create trigger marketing_segments_updated_at before update
  on public.marketing_segments
  for each row execute function update_updated_at();

alter table public.marketing_segments enable row level security;
drop policy if exists "auth_all" on public.marketing_segments;
create policy "auth_all" on public.marketing_segments
  for all to authenticated using (true) with check (true);

-- ── Research runs ─────────────────────────────────────────────────────────
-- Status state machine copied from `transcripts` (see process-transcript.ts):
-- pending → processing → completed | failed, with the error kept on the row.

create table if not exists public.marketing_research_runs (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references public.marketing_brand_profiles(id) on delete cascade,
  segment_id uuid references public.marketing_segments(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  processing_error text,
  trigger text not null default 'manual' check (trigger in ('manual', 'cron')),
  -- Denormalized counters so the list view needs no joins.
  source_count int not null default 0,
  outside_source_count int not null default 0,
  pain_point_count int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_research_runs_segment
  on public.marketing_research_runs(segment_id, created_at desc);
create index if not exists idx_marketing_research_runs_status
  on public.marketing_research_runs(status);

alter table public.marketing_research_runs enable row level security;
drop policy if exists "auth_all" on public.marketing_research_runs;
create policy "auth_all" on public.marketing_research_runs
  for all to authenticated using (true) with check (true);

-- ── Sources ───────────────────────────────────────────────────────────────
-- Every fetched source, kept verbatim. `is_outside_injection` is the entropy
-- flag: material the loop did not produce. A run that reads only its own past
-- output converges on its own voice, so the cron enforces a floor here.

create table if not exists public.marketing_sources (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid references public.marketing_research_runs(id) on delete cascade,
  segment_id uuid references public.marketing_segments(id) on delete set null,
  kind text not null default 'web'
    check (kind in ('forum', 'review', 'job_posting', 'press', 'competitor', 'transcript', 'web')),
  url text,
  title text,
  content text,
  -- 1 = operator forums, 4 = trade press. Drives the ranking weight.
  signal_rank int not null default 4 check (signal_rank between 1 and 4),
  is_outside_injection boolean not null default false,
  fetched_at timestamptz not null default now(),
  fetch_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_sources_run
  on public.marketing_sources(research_run_id);
create index if not exists idx_marketing_sources_url
  on public.marketing_sources(url);
create index if not exists idx_marketing_sources_entropy
  on public.marketing_sources(segment_id, is_outside_injection, fetched_at desc);

alter table public.marketing_sources enable row level security;
drop policy if exists "auth_all" on public.marketing_sources;
create policy "auth_all" on public.marketing_sources
  for all to authenticated using (true) with check (true);

-- ── Pain points ───────────────────────────────────────────────────────────
-- Ranked by how often the complaint actually appears, not by how good it
-- sounds. `evidence` is a non-empty array of {source_id, quote, url} — an
-- unsourced pain point is an assumption and may not inform a claim to a client.

create table if not exists public.marketing_pain_points (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.marketing_research_runs(id) on delete cascade,
  segment_id uuid references public.marketing_segments(id) on delete set null,
  statement text not null,
  -- How many distinct sources mentioned it.
  frequency int not null default 1,
  -- Final ordered position within the run, 1 = most frequent.
  rank int,
  -- Weighted score: frequency × source signal quality.
  score numeric(10,3) not null default 0,
  evidence jsonb not null default '[]',
  -- Which of the brand profile's named ICP fears this maps to, if any.
  icp_fear text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_pain_points_run
  on public.marketing_pain_points(research_run_id, rank);
create index if not exists idx_marketing_pain_points_segment
  on public.marketing_pain_points(segment_id, score desc);

alter table public.marketing_pain_points enable row level security;
drop policy if exists "auth_all" on public.marketing_pain_points;
create policy "auth_all" on public.marketing_pain_points
  for all to authenticated using (true) with check (true);

-- ── Semantic search over research content ─────────────────────────────────
-- Same idiom as 009_knowledgebase.sql:59-61 — drop and re-add the CHECK.

alter table public.embeddings drop constraint if exists embeddings_entity_type_check;
alter table public.embeddings add constraint embeddings_entity_type_check
  check (entity_type in (
    'client', 'project', 'deal', 'activity', 'email', 'transcript',
    'knowledgebase', 'marketing_source', 'marketing_pain_point'
  ));
