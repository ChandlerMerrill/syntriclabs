-- Deal archive: distinct from stage='lost'. Archive is for mistakes/duplicates/parked
-- deals; lost is a real pipeline outcome. Flipping is_archived is what archiveDeal does.

alter table public.deals
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

-- Partial index — most deal queries filter to non-archived rows.
create index if not exists idx_deals_is_archived on public.deals(is_archived) where is_archived = false;
