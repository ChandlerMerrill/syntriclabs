-- Off-segment source rejection.
--
-- Search substitutes the segment name into a query literally, so a segment named
-- with ordinary English words drags back documents matching those words in
-- another sense. The first real "Guiding & outfitting" run fetched a
-- consultancy's "2026 Trends Guide", a field-service trends page, a Land Cruiser
-- forum thread and an Indeed results page for "Entry Level Booking Assistant" —
-- five of fifteen readable sources that between them never once say "outfitter".
--
-- The waste is the smaller half. `marketing_pain_points.frequency` counts
-- distinct sources mentioning a complaint, so an off-segment source does not
-- just cost an extraction call, it votes on the ranking.
--
-- Recorded rather than dropped, and this is the load-bearing decision here. The
-- scrape succeeded and was paid for, so unlike an unsupported host the row is
-- not an apology — it is real content the run declined to read, and the reason
-- it declined is exactly what you need to tell a working filter from one quietly
-- eating good material. 9e9a274 fixed a tier that had been silently returning
-- nothing for its whole existence; a silent relevance filter is the same failure
-- with a different cause.

alter table public.marketing_sources
  add column if not exists relevance_skip_reason text;

comment on column public.marketing_sources.relevance_skip_reason is
  'Set when the source was fetched successfully but judged off-segment and not '
  'extracted from. Names the segment term the content never mentions, and the '
  'terms it did match — "off-segment: never mentions ''outfit'' (matched guid×60)". '
  'Null means the source was read. See lib/marketing/research/relevance.ts.';

-- Surfaced beside source_count in the runs list, so a filter that starts
-- rejecting everything is visible without querying the sources table.
alter table public.marketing_research_runs
  add column if not exists skipped_source_count int not null default 0;

comment on column public.marketing_research_runs.skipped_source_count is
  'Sources fetched successfully but skipped as off-segment. Counted separately '
  'from source_count, which stays a count of what the run fetched.';

-- Partial: the column is null for almost every row by design.
create index if not exists idx_marketing_sources_relevance_skipped
  on public.marketing_sources(segment_id, fetched_at desc)
  where relevance_skip_reason is not null;
