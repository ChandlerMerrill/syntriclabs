-- Correction: the Esoteric case study understated price and timeline
--
-- Decided 2026-07-31 (brain/decisions/log.md, Q3; brain/context/pricing.md).
-- Actuals: ~$15,000 paid, not $10,000. ~2 weeks to the first working platform,
-- then five months of continuous production development (904 commits, 221
-- migrations, still live). Competing agency quote was $27k proposed / $30k as
-- stated on the site.
--
-- The published $10,000 anchored every prospect below actual cost. "$15k against
-- a $30k quote" is still half the price with more delivered, so the framing
-- survives the correction intact.
--
-- Two articles carried the stale figures:
--   Pricing Approach                       — "around $10,000", "between a few
--                                             thousand and $15,000" (012:65)
--   What Does a Project Actually Look Like? — "about six weeks" (012:87)
--
-- Idempotent: full content replacement keyed on title.

UPDATE knowledgebase_articles
SET content = 'Pricing depends on what we''re building, so we don''t publish a fixed price list. The best way to get a real number is a free discovery call where we scope your project together. As a reference: we built a full multi-tenant e-commerce platform for about $15,000 — roughly half what another agency quoted for less functionality. Smaller builds start in the low thousands; a full platform usually lands between $15,000 and $20,000. No hourly billing, no surprise invoices.',
    updated_at = now()
WHERE title = 'Pricing Approach';

UPDATE knowledgebase_articles
SET content = 'One client ran a uniform company managing hundreds of products, dozens of schools, and thousands of orders — all through spreadsheets and email chains. We built them a full platform: product catalog, size charts, custom ordering portal for each school, vendor order management, and a design approval workflow. The system replaced five disconnected tools and cut their order processing time dramatically. They had a working version in about two weeks, and we''ve been building on it for five months since — it has been running their business that entire time. About $15,000 to date, roughly half what a competing agency quoted.',
    updated_at = now()
WHERE title = 'What Does a Project Actually Look Like?';

-- Re-seed embeddings after applying: POST /api/knowledgebase/seed
