-- How this prospect was found, in the sender's own words.
--
-- Cold outbound has exactly two personalisation tokens today, `{{company}}` and
-- `{{first_name}}`, and both are mail-merge: they insert a fact the recipient
-- already knows about themselves. Neither can carry the one line that makes a
-- cold email read as addressed rather than broadcast — why this company, and
-- not the two hundred others in the same segment.
--
-- That line cannot live on the variant, because the variant is written once and
-- sent to many. It has to live on the prospect. So it does.
--
-- Held as a noun phrase that completes "found you through ___", because the
-- framing belongs to the copy and the fact belongs to the row:
--
--   'the permit list on your site — Shoshone, Bridger-Teton and a Yellowstone CUA'
--   'your 2026 rates page, while looking for outfits running dated multi-day hunts'
--
-- It must be TRUE. It is the first factual claim in the email and the easiest
-- one to be caught inventing — a recipient knows what is on their own website.
-- `scripts/db/prospects-discover.ts` writes it from the pages it actually
-- scraped, which is the only reason it can be trusted.
--
-- ── The length cap is load-bearing ────────────────────────────────────────
--
-- `word_count` is checked against the *unrendered* variant, where this whole
-- phrase is a single `{{found_via}}` token. A long value would inflate the real
-- email past the 120-word ceiling with every check still passing — a limit that
-- silently stops applying is worse than no limit. 120 characters bounds the
-- inflation to roughly twenty words, which keeps a variant that passed at 84
-- words under the ceiling after substitution.

alter table public.marketing_prospects
  add column if not exists found_via text
    check (found_via is null or char_length(found_via) <= 120);

comment on column public.marketing_prospects.found_via is
  'Noun phrase completing "found you through ___", drawn from something actually '
  'read on this company''s own site. Null means the prospect cannot receive a '
  'variant using {{found_via}} — renderSend reports it as missing and the outbox '
  'skips the row rather than sending a sentence with a hole in it. Capped at 120 '
  'characters so substitution cannot carry a variant past the word ceiling that '
  'was checked before substitution.';
