-- Which opening shape gets replied to.
--
-- The first real batch went out as a matched pair: the same angle, the same
-- subject line and the same middle paragraph, differing only in how the email
-- starts. One arm opens cold on the observation. The other opens
-- "Hey <name>," and says how the prospect was found, using the `found_via`
-- column added in 033.
--
-- Both are defensible and nobody involved knows which works. That is the whole
-- point — the question is settled by replies, not by taste, and a batch that
-- only ever ships one shape can never answer it.
--
-- ── Why this is its own view ──────────────────────────────────────────────
--
-- Sibling of `marketing_template_performance` (026) and the same reasoning:
-- `marketing_variant_performance` is one row per variant and the performance
-- page depends on that grain. This groups by the arm instead, so the two
-- openings can be compared across every variant that carries the tag rather
-- than one variant at a time.
--
-- `template` is a column on `marketing_sends` because the same variant can be
-- sent both ways. The opening is not — it is baked into the copy — so it is
-- read from `generation_config`, alongside `transport`, `style` and
-- `promptVersion`, which is where everything else a comparison has to group by
-- already lives.
--
-- ── Read this with the sample size in front of you ────────────────────────
--
-- `sends` is the first column after the arm for a reason. The batch that
-- prompted this view was two sends per arm. Two. A difference at that size is
-- noise wearing a result's clothes, and the correct reading of the first few
-- batches is "not yet". The value is cumulative: the tag means every future
-- batch adds to the same two buckets instead of starting the question over.

create or replace view public.marketing_opening_performance as
select
  coalesce(v.generation_config->>'openingStyle', 'untagged')  as opening_style,
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
group by coalesce(v.generation_config->>'openingStyle', 'untagged');

comment on view public.marketing_opening_performance is
  'Reply and bounce rate by opening shape — "observation" (cold open on the '
  'observation) vs "personal" (greeting plus how they were found). Grouped from '
  'marketing_variants.generation_config->>''openingStyle''. Untagged variants '
  'collect under "untagged" rather than being dropped, so a batch that forgot the '
  'tag is visible instead of silently absent.';

alter view public.marketing_opening_performance set (security_invoker = on);
