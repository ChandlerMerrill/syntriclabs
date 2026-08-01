-- Presentation as a tracked dimension.
--
-- The same copy can land differently depending on whether it looks like a
-- person typed it or like an organisation sent it. That is a real question and
-- it is not answerable by picking one — so the treatment is recorded per send,
-- the copy is held constant, and the two arms are compared.
--
-- `template` sits on the send rather than on the variant on purpose. On the
-- variant it would be a property of the copy, and every comparison would
-- confound presentation with wording. On the send, one variant goes out both
-- ways and the only thing that differs is the shell.
--
-- Re-runnable.

alter table marketing_sends
  add column if not exists template text not null default 'plain';

-- What actually shipped, stored beside what a human read.
--
-- Rendered at queue time rather than at send time so approval stays
-- byte-for-byte: a brand-profile edit between sign-off and dispatch cannot
-- change the message that goes out.
alter table marketing_sends
  add column if not exists rendered_html text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketing_sends_template_check'
  ) then
    alter table marketing_sends
      add constraint marketing_sends_template_check
      check (template in ('plain', 'branded'));
  end if;
end $$;

create index if not exists idx_marketing_sends_template
  on marketing_sends (template, status);

-- The comparison, at the grain the experiment is actually run at.
--
-- `marketing_variant_performance` stays one row per variant — the performance
-- page depends on that grain. This is a sibling, one row per (variant,
-- template), so a template can be judged within a variant rather than across a
-- mix of copy that happened to be sent one way more often than the other.
--
-- Sample size is a column, not a footnote, for the same reason it is on the
-- other view: a 100% reply rate on one send is not a winner.
create or replace view marketing_template_performance as
select
  v.id                                             as variant_id,
  v.campaign_id,
  c.name                                           as campaign_name,
  v.label,
  s.template,
  count(s.id) filter (where s.status = 'sent')     as sends,
  count(distinct e_rep.send_id)                    as replies,
  count(distinct e_bnc.send_id)                    as bounces,
  count(o.id)                                      as scored,
  case
    when count(s.id) filter (where s.status = 'sent') > 0
    then round(
      count(distinct e_rep.send_id)::numeric
        / count(s.id) filter (where s.status = 'sent')::numeric, 4)
    else null
  end                                              as reply_rate,
  round(avg(o.score), 4)                           as avg_score,
  min(s.sent_at)                                   as first_sent_at,
  max(s.sent_at)                                   as last_sent_at
from marketing_sends s
  join marketing_variants v on v.id = s.variant_id
  join marketing_campaigns c on c.id = v.campaign_id
  left join marketing_events e_rep
    on e_rep.send_id = s.id and e_rep.type = 'replied'
  left join marketing_events e_bnc
    on e_bnc.send_id = s.id and e_bnc.type = 'bounced'
  left join marketing_outcomes o on o.send_id = s.id
group by v.id, v.campaign_id, c.name, v.label, s.template;
