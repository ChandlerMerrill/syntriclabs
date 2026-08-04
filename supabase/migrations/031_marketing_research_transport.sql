-- How a research run's model steps were actually performed.
--
-- `trigger` already says what started a run (a button or the cron). It does not
-- say what did the thinking. `scripts/db/research-manual.ts` runs the real
-- pipeline with the extraction and clustering calls supplied by hand, which is
-- how research gets exercised without spending ~15 Opus calls per run — and a
-- run done that way is currently indistinguishable from a model run.
--
-- That matters for the same reason `marketing_variants.generation_config.transport`
-- exists: pain points produced by a person reasoning over the sources and pain
-- points produced by the extractor are different evidence, and averaging them
-- silently would hide which one the copy was written from. A pain point is
-- allowed to inform a claim to a client; where it came from is part of the claim.

alter table public.marketing_research_runs
  add column if not exists extraction_transport text not null default 'model'
    check (extraction_transport in ('model', 'manual'));

comment on column public.marketing_research_runs.extraction_transport is
  'model = extract.ts and rank.ts made the calls. manual = a human authored the '
  'extraction and clustering through scripts/db/research-manual.ts, using the '
  'same prompts and the same storage and ranking code. Defaults to model, which '
  'is correct for every row that predates this column.';
