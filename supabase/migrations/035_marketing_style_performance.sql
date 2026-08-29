-- Which shape of writing gets replied to.
--
-- Third sibling of `marketing_template_performance` (026) and
-- `marketing_opening_performance` (034), and it exists for the same reason they
-- do: `marketing_variant_performance` is one row per variant, which cannot
-- answer a question asked across variants.
--
-- ── Why this view and why now ─────────────────────────────────────────────
--
-- `generation_config.style` has been written on every variant since styles were
-- introduced, and nothing has ever read it back. `style.ts` says out loud that
-- style is "assigned per variant, recorded on the row, and left free to vary,
-- which makes it something marketing_variant_performance can eventually
-- attribute a win to" — but there was no grouping by it, so every style that
-- has ever shipped has produced data nobody could look at.
--
-- The `cohesive` style, added 2026-08-06, is the one that made the gap matter.
-- It is not a correction to `plain_direct`; it is the other bet on the same
-- axis — whether a reader prefers one beat per line or connected prose — and a
-- bet with no scoreboard is just a preference with extra steps.
--
-- ── Read this with the sample size in front of you ────────────────────────
--
-- `sends` comes first, before any rate, for the same reason it does in 034.
-- Style is assigned two-in-three toward the house default, so the explorers
-- accumulate slowly by design and will sit at single digits for a long time.
-- A rate over four sends is noise wearing a result's clothes.
--
-- ── The confound worth naming ─────────────────────────────────────────────
--
-- Style and opening arm are independent tags on the same sends, so this view
-- and 034 partition the same rows two different ways. Neither controls for the
-- other. Until the counts are large enough to cross them, a style difference
-- may be an arm difference in disguise and the reverse is equally true. The
-- honest reading of both views early on is one dimension at a time, and only
-- when a batch held the other dimension balanced.

create or replace view public.marketing_style_performance as
select
  coalesce(v.generation_config->>'style', 'untagged')         as style,
  count(s.id) filter (where s.status = 'sent')                as sends,
  count(distinct e_rep.send_id)                               as replies,
  count(distinct e_bnc.send_id)                               as bounces,
  count(o.id)                                                 as scored,
  case
    when count(s.id) filter (where s.status = 'sent') > 0
    then round(
      count(distinct e_rep.send_id)::numeric
        / count(s.id) filter (where s.status = 'sent')::numeric, 4)
  end                                                         as reply_rate,
  case
    when count(s.id) filter (where s.status = 'sent') > 0
    then round(
      count(distinct e_bnc.send_id)::numeric
        / count(s.id) filter (where s.status = 'sent')::numeric, 4)
  end                                                         as bounce_rate,
  round(avg(o.score), 4)                                      as avg_score,
  -- What the drafts actually came out as, not what they were asked for. A style
  -- assigned is not a style achieved: the band and the grouping are recorded per
  -- variant by `measureStyle`, and averaging them here is what distinguishes
  -- "connected prose loses" from "nothing was ever written as connected prose".
  round(avg((v.generation_config->'styleMetrics'->>'words')::numeric), 1)
                                                              as avg_words,
  round(avg((v.generation_config->'styleMetrics'->>'paragraphs')::numeric), 2)
                                                              as avg_paragraphs,
  round(avg((v.generation_config->'styleMetrics'->>'loneSentenceParagraphs')::numeric), 2)
                                                              as avg_lone_sentence_paragraphs,
  count(distinct v.id)                                        as variants,
  min(s.sent_at)                                              as first_sent_at,
  max(s.sent_at)                                              as last_sent_at
from public.marketing_sends s
  join public.marketing_variants v on v.id = s.variant_id
  left join public.marketing_events e_rep
    on e_rep.send_id = s.id and e_rep.type = 'replied'
  left join public.marketing_events e_bnc
    on e_bnc.send_id = s.id and e_bnc.type = 'bounced'
  left join public.marketing_outcomes o on o.send_id = s.id
group by coalesce(v.generation_config->>'style', 'untagged');

comment on view public.marketing_style_performance is
  'Reply and bounce rate by writing style — plain_direct, terse, story, '
  'question_led, cohesive. Grouped from marketing_variants.generation_config->>''style''. '
  'Carries the measured shape alongside the result (avg_words, avg_paragraphs, '
  'avg_lone_sentence_paragraphs) so a style that was never actually written as '
  'specified is visible rather than being read as a style that failed. Does not '
  'control for opening arm — see marketing_opening_performance.';

alter view public.marketing_style_performance set (security_invoker = on);
