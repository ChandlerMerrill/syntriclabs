-- The critic gate.
--
-- Until now the gate was deliberately model-free: `review/checks.ts` argued that
-- a model deciding whether copy is on-brand is a judgement the human gate makes,
-- and that a model deciding whether the word "seamless" appears is a substitute
-- for includes(). That stance is being reversed on purpose, not drifted away
-- from. The mechanical rules stay exactly as they are; two model critics are
-- added beside them and can block.
--
-- What makes a non-deterministic gate defensible rather than capricious is that
-- every blocking finding has to quote the span of copy it is about, and the
-- quote is verified against the body in code before it is allowed to block. A
-- critic that cannot point at the words it objects to does not get to reject the
-- variant. That check lives in `review/critique.ts`; this file stores the result.
--
-- Re-runnable.

-- ── New check rules ───────────────────────────────────────────────────────
-- The constraint is inline in 024, so Postgres named it for us. Dropped and
-- re-added rather than altered, which is the only way to widen a CHECK.

alter table public.marketing_variant_checks
  drop constraint if exists marketing_variant_checks_rule_check;

alter table public.marketing_variant_checks
  add constraint marketing_variant_checks_rule_check check (rule in (
    'banned_words',
    'word_count',
    'opens_with_i',
    'one_ask',
    'link_verified',
    'claim_traced',
    -- Judges the copy on its own terms: does it read as typed by a person, is
    -- it specific to this segment, is every claim supported by the evidence on
    -- file.
    'qa_review',
    -- Argues the recipient's case for deleting it. Adversarial by construction,
    -- and blocking only where the copy could have prevented the objection.
    'devils_advocate',
    -- Written by an actual approval, and by a human overriding a critic. The
    -- one rule no code writes on someone's behalf.
    'human'
  ));

-- ── Critiques ─────────────────────────────────────────────────────────────
-- The reasoning behind a verdict, stored the way `generation_prompt` is stored:
-- verbatim, next to what it produced. A gate that can reject copy without
-- leaving an argument you can read and disagree with is not a gate, it is a
-- coin toss with extra steps.

create table if not exists public.marketing_variant_critiques (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.marketing_variants(id) on delete cascade,

  critic text not null check (critic in ('qa_review', 'devils_advocate')),

  verdict text not null check (verdict in ('pass', 'fail')),

  -- One or two sentences. Mirrored into marketing_variant_checks.detail so the
  -- existing gate UI shows something useful without joining.
  summary text not null,

  -- [{ severity, quote, problem }]. `quote` is a verbatim span of the variant
  -- body or subject, verified present before a blocking finding is honoured.
  findings jsonb not null default '[]'::jsonb,

  -- The prompt that produced this, verbatim. Same contract as
  -- marketing_variants.generation_prompt: a verdict that cannot be traced back
  -- to the instruction that produced it cannot be argued with, and cannot
  -- improve the critic.
  critique_prompt text not null,

  model text,

  -- 'model' ran the API call. 'manual' means the critique was authored by hand
  -- against this exact prompt — the same path generate-variants-manual.ts takes,
  -- and the reason it exists: iterating a gate should not require paying for it.
  -- 'human' is a person's own judgement, not a reproduction of a critic's.
  transport text not null default 'model' check (transport in ('model', 'manual', 'human')),

  created_at timestamptz not null default now(),

  -- Latest critique per critic per variant wins. Re-critiquing after an edit
  -- must replace the verdict, not accumulate rows that disagree with each other
  -- while the gate reads whichever it happens to find first.
  unique (variant_id, critic)
);

create index if not exists idx_marketing_variant_critiques_variant
  on public.marketing_variant_critiques(variant_id);
create index if not exists idx_marketing_variant_critiques_failed
  on public.marketing_variant_critiques(variant_id) where verdict = 'fail';

alter table public.marketing_variant_critiques enable row level security;
drop policy if exists "auth_all" on public.marketing_variant_critiques;
create policy "auth_all" on public.marketing_variant_critiques
  for all to authenticated using (true) with check (true);
