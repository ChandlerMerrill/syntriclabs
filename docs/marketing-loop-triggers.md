# Marketing loop — what spends money, and what sets it off

Every paid step in the marketing loop, what triggers it, and how to stop it.

Two kinds of spend: **Anthropic** (model calls, via `src/lib/marketing/model.ts`,
default `claude-opus-5`) and **Firecrawl** (search + scrape). Sending mail costs
nothing per message — it goes out through the connected Gmail account.

---

## The map

```
                    ┌─────────────────────────────────────────────┐
                    │  RESEARCH — what problem to write about     │
                    └─────────────────────────────────────────────┘

   cron: Mon 07:00 UTC ──┐
   /api/cron/marketing/research
                         ├──> fetchSegmentSources()      🔥 Firecrawl
   button: Research tab ─┘      ~10 queries × 3 results, per segment
   /api/admin/marketing/research
                         │
                         ├──> extractPainPoints()        🤖 1 call PER SOURCE
                         │      research/extract.ts:101
                         │
                         └──> clusterAndRank()           🤖 1 call per run
                                research/rank.ts:61
                                          │
                                          v
                                  marketing_pain_points


   cron: Mon & Thu 06:00 UTC ──> injectEntropy()         🔥 Firecrawl only
   /api/cron/marketing/entropy      outside material, no model calls


                    ┌─────────────────────────────────────────────┐
                    │  PROSPECTS — who to write to                │
                    └─────────────────────────────────────────────┘

   button: Prospects tab ──────> qualifyProspects()      🤖 1 call PER BATCH
   /api/admin/marketing/prospects/qualify   prospects/qualify.ts:161
                                            (batches of ≤20)
   No cron. Only ever runs when you press the button.


                    ┌─────────────────────────────────────────────┐
                    │  GENERATE — write the copy                  │
                    └─────────────────────────────────────────────┘

   button: Variants tab ──────> generateVariants()       🤖 1 call PER PRESS
   /api/admin/marketing/variants/generate    generate/variants.ts:112
                                             (produces 1–6 variants)
   No cron. Only ever runs when you press the button.
                                          │
                                          v
                                  gateVariant()          ⚙️  free, deterministic
                                    review/gate.ts       banned_words, word_count,
                                                         opens_with_i, one_ask,
                                                         claim_traced, link_verified


                    ┌─────────────────────────────────────────────┐
                    │  SEND — approval, dispatch, reply           │
                    └─────────────────────────────────────────────┘

   button: Outbox ────────────> approve                  ⚙️  free
                                 a human, always

   cron: Mon–Thu 15:00 UTC ───> queueFollowUps()         ⚙️  free (drafts only)
   /api/cron/marketing/send     dispatchApprovedSends()  📧 real mail to real people

   cron: every 2h at :30 ─────> findRepliesForSend()     ⚙️  free
   /api/cron/marketing/reply-sync  recordInboundEvent()  ⚙️  free
                                   bounce suppression    ⚙️  free
                                   unsubscribe-phrase    ⚙️  free
                                     suppression
                                   scoreAndStore()       🤖 1 call PER NEW REPLY
                                     eval/score.ts:76
```

`/api/gmail/sync` (every 2h) feeds reply-sync but is not part of this loop and
costs nothing.

---

## The five model calls

| # | Function | File | Cost shape | Cron? |
|---|----------|------|-----------|-------|
| 1 | `extractPainPoints` | `research/extract.ts:101` | **one call per fetched source** — the fan-out | yes |
| 2 | `clusterAndRank` | `research/rank.ts:61` | one per research run | yes |
| 3 | `qualifyProspects` | `prospects/qualify.ts:161` | one per batch of ≤20 rows | no |
| 4 | `generateVariants` | `generate/variants.ts:112` | one per button press | no |
| 5 | `scoreReply` | `eval/score.ts:76` | one per newly-recorded reply | yes |

Call 1 is the one to watch. A research run scrapes up to ~30 URLs per segment
and spends one Opus 5 extraction call on each readable one, then multiplies that
by the segment count. Everything else is single calls.

---

## The switch

`MARKETING_AUTOPILOT` — governs **cron triggers only**. The admin panel is never
gated by it; pressing a button is consent, a schedule firing is not.

```bash
MARKETING_AUTOPILOT=off              # nothing runs on a schedule
MARKETING_AUTOPILOT=all              # everything does
MARKETING_AUTOPILOT=score,dispatch   # exactly these (this is the default)
```

Unset behaves as `score,dispatch`. Stage names: `research`, `entropy`,
`generate`, `qualify`, `score`, `critique`, `dispatch`.

**Why that default.** `score` and `dispatch` are reactive and bounded — scoring
costs one call per reply a human actually received, and dispatch can only ship
rows a human already approved. `research` and `entropy` are generative and
unbounded: they fan out across every segment on a timer in response to nothing.
The moment `FIRECRAWL_API_KEY` is set, the Monday research cron would otherwise
start spending weekly with nobody watching.

A blocked cron returns `{ ok: true, skipped: "..." }` and says on the response
how to switch the stage on. It is not an error — a 500 from a cron looks like an
outage and gets retried.

Implementation: `src/lib/marketing/autopilot.ts`. A typo in the variable narrows
what may run rather than crashing a job; unrecognised names are reported by
`unknownStages()`, not thrown.

### What stays on when scoring is off

Reply-sync gates the scorer alone, not the job. These still run, free:

- matching replies to sends, and recording the events
- hard-bounce suppression
- **unsubscribe-phrase suppression** — `looksLikeUnsubscribeRequest()` in
  `eval/suppress.ts`, a deterministic phrase match that runs whether or not
  scoring does

That last one was added with the switch. Honouring an unsubscribe was previously
reachable only *through* `scoreAndStore`, so a skipped or failed model call meant
the request was understood by nobody and the person got mailed again once the
cooldown lapsed. Recognising the request is an obligation; spending a model call
to recognise it is a choice.

Replies recorded while scoring was off are picked up on a later run — the loop
revisits already-recorded replies carrying no outcome, inside the 30-day window
`sendsAwaitingReplies` walks. Past 30 days they stay unscored, and the cron
reports `unscored` so that is visible rather than assumed.

---

## Running steps by hand

The manual path exists so prompts can be iterated without API spend. See
`scripts/db/generate-variants-manual.ts` — it exercises the real prompt, the real
insert, and the real gate, with only the model call replaced by copy authored
in-session.

---

## Other environment variables

| Variable | Effect if unset |
|---|---|
| `FIRECRAWL_API_KEY` | Research and entropy throw `FirecrawlNotConfiguredError`. Runs record `failed` with the reason. |
| `MARKETING_UNSUBSCRIBE_SECRET` | `prospectSendGate` refuses **every** send. Fails closed by design. |
| `MARKETING_PUBLIC_URL` | Falls back to `NEXT_PUBLIC_SITE_URL`. Set it to the production origin so a send queued locally does not freeze `http://localhost:3000/u/...` into its footer — `rendered_html` is frozen at queue time and dispatch ships those exact bytes. |
| `NEXT_PUBLIC_SITE_URL` | Same refusal as the secret, if `MARKETING_PUBLIC_URL` is also unset. |
| `MARKETING_MODEL` | Per-stage overrides `MARKETING_EXTRACT_MODEL`, `MARKETING_GENERATE_MODEL`, `MARKETING_SCORE_MODEL`; default `claude-opus-5`. |

Do not repoint `NEXT_PUBLIC_SITE_URL` at production locally to fix the footer
link. Four other consumers read it, and two of them — `lib/ai/tools.ts:266` and
`managed-agent/handlers/documents.ts:75` — *fetch* it, so a local run would POST
to production's `/api/documents/send` and really send a document. That is what
`MARKETING_PUBLIC_URL` exists to avoid.
