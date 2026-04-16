-- Phase 7G: Knowledge Base Content Rewrite
-- Rewrites KB articles for non-technical SMB audience
-- Adds missing articles addressing real visitor concerns
-- Removes articles that add noise or contain jargon

-- ═══════════════════════════════════════════
-- DELETE 3 articles
-- ═══════════════════════════════════════════

DELETE FROM knowledgebase_articles WHERE title = 'Service Overview';
DELETE FROM knowledgebase_articles WHERE title = 'Tech Stack';
DELETE FROM knowledgebase_articles WHERE title = 'Engagement Model';

-- ═══════════════════════════════════════════
-- REWRITE 10 articles (update title + content)
-- ═══════════════════════════════════════════

UPDATE knowledgebase_articles
SET title = 'What We Build',
    content = 'We build custom systems for businesses that have outgrown spreadsheets, disconnected tools, or off-the-shelf software that doesn''t quite fit. That includes customer portals, internal dashboards, booking and scheduling platforms, e-commerce with inventory management, and workflow tools that connect the moving pieces of your business. Everything is built around how your business actually works — not the other way around. If you can describe the problem, we can probably build the solution.',
    updated_at = now()
WHERE title = 'Custom Software Development';

UPDATE knowledgebase_articles
SET title = 'Automation That Saves You Time',
    content = 'If you or your team are spending hours on tasks that feel like they should happen automatically — data entry, follow-up messages, scheduling, answering the same questions — we can build systems that handle it. That might look like an assistant on your website that answers customer questions 24/7, automated notifications when orders come in, or workflows that move data between your tools without anyone touching it. We start with what''s eating your time and work backward from there.',
    updated_at = now()
WHERE title = 'AI Integration & Automation';

UPDATE knowledgebase_articles
SET content = 'We run hands-on workshops where your team builds real tools — not just sits through slides. By the end, your people walk away with working systems they built themselves and a clear picture of what''s worth automating in your business. These are built for teams drowning in manual processes, owners who want to understand what modern tools can do, and managers looking to do more without hiring more. Your team learns to spot high-value automation opportunities, build simple internal tools, and know when a process needs technology versus just a better process.',
    updated_at = now()
WHERE title = 'Workshops & Training';

UPDATE knowledgebase_articles
SET title = 'Dashboards & Internal Tools',
    content = 'If your team runs on spreadsheets, group texts, or sticky notes — we build the system that replaces all of it. Custom dashboards that show you what matters, admin tools that your team actually wants to use, and reporting that pulls from all your sources in one place. Whether it''s tracking jobs, managing customers, or keeping your team on the same page — we build internal tools that fit how your business already works.',
    updated_at = now()
WHERE title = 'CRM & Business Systems';

UPDATE knowledgebase_articles
SET content = 'Step 2: Scope & Design. We map out the system together so you see exactly what you''re getting before we build anything. You''ll get a clear picture of what will be built, how it works, and what the deliverables are. No surprises, no mystery. This is where we make sure we''re solving the right problem before spending a dollar on development.',
    updated_at = now()
WHERE title = 'How We Work — Scope & Design';

UPDATE knowledgebase_articles
SET title = 'Who Is Syntric Labs?',
    content = 'Syntric Labs is a one-person software studio that builds custom platforms for small and medium-sized businesses. We''re not a big agency with layers of project managers — you work directly with the person building your system. We focus on businesses between $500K and $5M in revenue who need real technology but don''t have a six-figure budget for it. Every project starts with a conversation about what''s not working and what better could look like.',
    updated_at = now()
WHERE title = 'About Syntric Labs';

UPDATE knowledgebase_articles
SET title = 'Why One Person, Not an Agency',
    content = 'Syntric is a one-person studio by design. Chandler Merrill handles every project directly — he''s in the meetings, writing the code, and available when something breaks. That means no game of telephone between you and the developer, no junior devs learning on your project, and no surprises. One person who knows your system inside and out is faster and more reliable than a team of strangers rotating through your project.',
    updated_at = now()
WHERE title = 'Team Size';

UPDATE knowledgebase_articles
SET title = 'Is This Right for My Business?',
    content = 'We work with small and medium-sized businesses — contractors, trades companies, suppliers, clinics, service businesses — usually between $500K and $5M in revenue. If you''re running a real business with real customers and your current tools are holding you back, you''re probably a great fit. You don''t need to know anything about technology. You just need to know what''s not working. We handle the rest.',
    updated_at = now()
WHERE title = 'Who We Work With';

UPDATE knowledgebase_articles
SET content = 'Pricing depends on what we''re building, so we don''t publish a fixed price list. The best way to get a real number is a free discovery call where we scope your project together. As a reference: we built a full multi-tenant e-commerce platform for around $10,000 — about a third of a competing quote, with more functionality. Most projects fall somewhere between a few thousand and $15,000. No hourly billing, no surprise invoices.',
    updated_at = now()
WHERE title = 'Pricing Approach';

UPDATE knowledgebase_articles
SET content = 'Book a free 30-minute discovery call at calendly.com/syntriclabs/discovery, or fill out the contact form at syntriclabs.com/contact. Whether you have a clear project in mind or you''re just starting to wonder if there''s a better way to run something — the first step is a conversation. No commitment, no sales pitch. Just an honest look at what technology can do for your business.',
    updated_at = now()
WHERE title = 'How to Get Started';

-- ═══════════════════════════════════════════
-- INSERT 5 new articles
-- ═══════════════════════════════════════════

INSERT INTO knowledgebase_articles (title, category, content) VALUES
(
  'I''ve Been Burned by Developers Before',
  'faq',
  'We hear this a lot. You paid an agency $30K, got something half-built, and now you''re stuck. Or a freelancer disappeared mid-project. Here''s what''s different: you work directly with the person building your system — no handoffs, no disappearing acts. You see real progress every week, not a status update email. We don''t bill hourly, so there''s no incentive to drag things out. And we don''t vanish after launch — we stick around until your team is running the system confidently.'
),
(
  'What Does a Project Actually Look Like?',
  'case_study',
  'One client ran a uniform company managing hundreds of products, dozens of schools, and thousands of orders — all through spreadsheets and email chains. We built them a full platform: product catalog, size charts, custom ordering portal for each school, vendor order management, and a design approval workflow. The system replaced five disconnected tools and cut their order processing time dramatically. It was built in about six weeks and cost roughly a third of what a competing agency quoted.'
),
(
  'Do I Need Custom Software or Is There an App for That?',
  'faq',
  'Off-the-shelf tools are great — until they''re not. If a product like Shopify, HubSpot, or Monday.com does what you need, use it. We''ll tell you that honestly. Custom software makes sense when you''ve outgrown what standard tools can do, when you''re paying for three subscriptions that don''t talk to each other, or when your workflow is unique enough that no product fits. The discovery call is free and we''ll tell you straight if you don''t need us.'
),
(
  'How We Build Your System',
  'faq',
  'We use modern, production-ready tools that are fast, secure, and built to scale with your business. Your system runs on the same infrastructure used by companies hundreds of times your size — which means it''s reliable, it loads fast, and it won''t fall apart as you grow. We own the code and you own the product. No vendor lock-in, no proprietary platforms you can''t leave. If we get hit by a bus, another developer can pick it up.'
),
(
  'What Happens After Launch?',
  'faq',
  'We don''t hand off a system and disappear. After launch, we stick around through the first real users, the edge cases, and the "wait, what about this?" moments. Your team gets trained on the system so you''re not dependent on us for every little change. If something breaks or you need new features down the road, we''re a call away. Most clients come back for phase two once they see what''s possible.'
);

-- ═══════════════════════════════════════════
-- Clean up orphaned embeddings
-- ═══════════════════════════════════════════

DELETE FROM embeddings
WHERE entity_type = 'knowledgebase'
  AND entity_id::uuid NOT IN (SELECT id FROM knowledgebase_articles);

-- Re-seed embeddings: POST /api/knowledgebase/seed
