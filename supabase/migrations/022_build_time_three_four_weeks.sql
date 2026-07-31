-- Correction: publish effective dev time, not the fast-start figure
--
-- Chandler's call, 2026-07-31. The site now leads with ~3-4 weeks of build
-- time rather than the "~2 weeks to a first working platform" figure.
--
-- This does NOT contradict brain/decisions/log.md (Q3). Two weeks was true for
-- the first working build; ~1 month of effective full-time dev is the other
-- true number from the same entry, and it is the more honest one to anchor a
-- prospect's expectations to. 3-4 weeks is that month, stated in weeks.
--
-- Article 1 is the Esoteric case study and is squarely the thing being
-- corrected. Articles 2 and 3 are generic timeline claims — they were not
-- part of the original ask, but "as little as two weeks" now contradicts the
-- homepage, which is exactly the widget-vs-site drift that 020/021 fixed.
--
-- Idempotent: full content replacement keyed on title.

UPDATE knowledgebase_articles
SET content = 'One client ran a uniform company managing hundreds of products, dozens of schools, and thousands of orders — all through spreadsheets and email chains. We built them a full platform: product catalog, size charts, custom ordering portal for each school, vendor order management, and a design approval workflow. The system replaced five disconnected tools and cut their order processing time dramatically. They had a working version in about three to four weeks, and we''ve been building on it for five months since — it has been running their business that entire time. About $15,000 to date, roughly half what a competing agency quoted.',
    updated_at = now()
WHERE title = 'What Does a Project Actually Look Like?';

UPDATE knowledgebase_articles
SET content = 'Syntric delivers fast. A full custom platform typically takes three to four weeks of build time. You see progress weekly, not monthly. Fast delivery doesn''t mean cutting corners — it means focused work, clear scope, and no wasted cycles. How long it takes on the calendar also depends on how quickly we can get answers and feedback from your side.',
    updated_at = now()
WHERE title = 'Project Timeline';

UPDATE knowledgebase_articles
SET content = 'Step 3: Build. Fast, focused development. You see progress weekly, not monthly. Fast delivery doesn''t mean cutting corners — it means focused work, clear scope, and no wasted cycles. Three to four weeks to a full platform isn''t rushed, it''s efficient.',
    updated_at = now()
WHERE title = 'How We Work — Build';

-- Re-seed embeddings after applying: POST /api/knowledgebase/seed
