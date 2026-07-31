-- Fix: dead Calendly URL served to prospects by the chat widget
--
-- The "How to Get Started" article shipped with calendly.com/syntriclabs/discovery
-- (009_knowledgebase_seed.sql:125, carried forward by 012_knowledgebase_rewrite.sql:70).
-- That link is dead. The canonical booking URL is FOUNDER.calendlyUrl in
-- src/lib/founder-profile.ts:9 — every live site component already uses it.
--
-- The widget retrieves this article and hands the URL to prospects, so the stale
-- value was costing bookings directly.
--
-- Idempotent: matches on the stale substring, so re-running is a no-op.

UPDATE knowledgebase_articles
SET content = replace(
      content,
      'calendly.com/syntriclabs/discovery',
      'calendly.com/chandler-syntriclabs/30min'
    ),
    updated_at = now()
WHERE content LIKE '%calendly.com/syntriclabs/discovery%';

-- Re-seed embeddings after applying: POST /api/knowledgebase/seed
-- The stored embedding contains the old text until then, so retrieval can still
-- surface the stale answer.
