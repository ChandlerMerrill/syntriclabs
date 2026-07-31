-- Marketing agent — Phase 2 generation + brand QA gate.
--
-- The load-bearing choice, straight from the source architecture: the
-- generating prompt is stored alongside the result. Without it the loop can
-- only tell you which output won, which improves selection and never improves
-- generation.

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references public.marketing_brand_profiles(id) on delete cascade,
  segment_id uuid references public.marketing_segments(id) on delete set null,
  name text not null,
  channel text not null default 'email'
    check (channel in ('email', 'linkedin', 'meta_ads')),
  -- What a reply to this campaign is supposed to mean.
  goal text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_status
  on public.marketing_campaigns(status, created_at desc);

create trigger marketing_campaigns_updated_at before update
  on public.marketing_campaigns
  for each row execute function update_updated_at();

alter table public.marketing_campaigns enable row level security;
drop policy if exists "auth_all" on public.marketing_campaigns;
create policy "auth_all" on public.marketing_campaigns
  for all to authenticated using (true) with check (true);

-- ── Variants ──────────────────────────────────────────────────────────────
-- generation_prompt is NOT NULL on purpose. A variant whose prompt wasn't
-- recorded cannot teach the generator anything, so it may not exist.

create table if not exists public.marketing_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  pain_point_id uuid references public.marketing_pain_points(id) on delete set null,

  label text,
  subject text,
  body text,
  -- Meta creative (Phase 5): image URL or storage key plus its own prompt.
  asset_url text,
  asset_prompt text,

  generation_prompt text not null,
  generation_config jsonb not null default '{}',
  model text not null,

  -- Lineage. A variant bred from a winner points at its parent, so the
  -- performance view can ask whether descendants actually beat ancestors.
  parent_variant_id uuid references public.marketing_variants(id) on delete set null,

  -- Which ICP fear the variant is aimed at, when it maps to one.
  icp_fear text,

  status text not null default 'draft'
    check (status in ('draft', 'checks_failed', 'ready', 'retired')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_variants_campaign
  on public.marketing_variants(campaign_id, created_at desc);
create index if not exists idx_marketing_variants_parent
  on public.marketing_variants(parent_variant_id);
create index if not exists idx_marketing_variants_status
  on public.marketing_variants(status);

create trigger marketing_variants_updated_at before update
  on public.marketing_variants
  for each row execute function update_updated_at();

alter table public.marketing_variants enable row level security;
drop policy if exists "auth_all" on public.marketing_variants;
create policy "auth_all" on public.marketing_variants
  for all to authenticated using (true) with check (true);

-- ── Variant checks ────────────────────────────────────────────────────────
-- One row per rule per variant. Storing the failures individually is what lets
-- the gate say *which* rule blocked a variant rather than just "rejected".

create table if not exists public.marketing_variant_checks (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.marketing_variants(id) on delete cascade,
  rule text not null check (rule in (
    'banned_words',
    'word_count',
    'opens_with_i',
    'one_ask',
    'link_verified',
    'claim_traced',
    'human'
  )),
  passed boolean not null,
  detail text,
  checked_by text not null default 'system' check (checked_by in ('system', 'human')),
  checked_at timestamptz not null default now(),
  unique (variant_id, rule)
);

create index if not exists idx_marketing_variant_checks_variant
  on public.marketing_variant_checks(variant_id);
create index if not exists idx_marketing_variant_checks_failed
  on public.marketing_variant_checks(variant_id) where not passed;

alter table public.marketing_variant_checks enable row level security;
drop policy if exists "auth_all" on public.marketing_variant_checks;
create policy "auth_all" on public.marketing_variant_checks
  for all to authenticated using (true) with check (true);

-- ── Prospects ─────────────────────────────────────────────────────────────
-- Deliberately thin. `client_id` is the whole of the CRM integration: the link
-- exists when it matters, and nothing syncs.

create table if not exists public.marketing_prospects (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references public.marketing_segments(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,

  company text not null,
  contact_name text,
  email text,
  linkedin_url text,
  website text,
  location text,
  notes text,

  qualified boolean,
  qualification_reason text,
  -- Set when the prospect asks not to be contacted, or bounces hard. Checked
  -- before every send.
  suppressed_at timestamptz,
  suppression_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_marketing_prospects_email
  on public.marketing_prospects(lower(email)) where email is not null;
create index if not exists idx_marketing_prospects_segment
  on public.marketing_prospects(segment_id, qualified);
create index if not exists idx_marketing_prospects_client
  on public.marketing_prospects(client_id);

create trigger marketing_prospects_updated_at before update
  on public.marketing_prospects
  for each row execute function update_updated_at();

alter table public.marketing_prospects enable row level security;
drop policy if exists "auth_all" on public.marketing_prospects;
create policy "auth_all" on public.marketing_prospects
  for all to authenticated using (true) with check (true);
