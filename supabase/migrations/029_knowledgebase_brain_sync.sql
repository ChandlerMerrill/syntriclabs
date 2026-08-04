-- Knowledge base: bring the chat widget up to what the business actually knows.
--
-- The 22 articles already in this table describe the services and the process.
-- What they never answered is the set of questions a skeptical owner asks
-- second: are you an AI company, will my team use it, who owns the code, what
-- happens if this is outdated in a year, and — the one the widget had no answer
-- for at all — who isn't a good fit.
--
-- Source is the Syntric brain (`../brain/context/`), which is the canonical
-- record of positioning, offers, pricing, and ICP. Two rules from it are load
-- bearing here and are why some of this copy reads more cautious than marketing
-- copy usually does:
--
--   1. Custom software builds are the only PROVEN offering. Workshops and the
--      chat/voice agents are real offerings that have never been delivered to a
--      client. They can be described and quoted; a result can never be claimed
--      for them. Every article below that touches them says so.
--   2. Only what is already public on the site can be named. Esoteric Design
--      Lab, Tally, and Shamrock Plumbing are on the portfolio page. Nothing
--      else is.
--
-- Idempotent by title: the staged rows replace any earlier version of
-- themselves, and their stale embeddings go with them. Re-embed afterwards with
-- `POST /api/knowledgebase/seed` — an article with no embedding row is invisible
-- to the widget's search, so skipping that step silently un-publishes all of it.

create temp table kb_sync (title text, category text, content text) on commit drop;

insert into kb_sync (title, category, content) values

-- ---------------------------------------------------------------- positioning

('Are You an AI Company?', 'about',
 'No. Syntric is a software builder — we build custom systems for businesses, and sometimes those systems use AI because it happens to be the right tool for that piece. Most of what we build is just software that finally fits how a business actually runs: order flows, client portals, dashboards, the things a spreadsheet stopped being able to hold. We''re careful about this because a lot of what gets sold as AI to small businesses is a demo looking for a problem. We start from the problem. If AI is the answer we''ll use it, and if it isn''t we''ll tell you.'),

('How Chandler Works With You', 'about',
 'The short version: he comes into your business, learns how it actually works, builds the system that fixes the bottleneck, and stays until it''s running. That means sitting with how you take an order today, where the double entry is, which spreadsheet everyone is scared to touch — before any code gets written. It''s a different shape from handing a spec to a development shop and waiting. You''re not managing a project; you''re working with the person building it. It''s also why the work continues after launch instead of ending there. The platform we built for Esoteric Design Lab has been in production for five months and we''re still building on it.'),

-- ------------------------------------------------------------------ offerings

('Chat and Voice Agents for Your Front Desk', 'services',
 'A lot of small businesses lose work at the front door — calls that go to voicemail after hours, the same five questions answered by hand every day, a form nobody checks until Tuesday. We build assistants that handle that: a chat assistant on your site that answers real questions and takes down who''s asking, and a voice agent that picks up the phone, books appointments, and passes anything unusual straight to a person. There''s an internal side too, where your own staff ask it about a job or a schedule instead of digging through email. Worth being straight with you: the assistant you''re talking to right now is one of ours, running on our own site, and so is the voice demo on the services page. We haven''t set one up for a client yet — you''d be the first, and you can judge the work by the one you''re using.'),

('I Don''t Know What I Need Yet', 'faq',
 'That''s the most common place people start, and it''s a fine place to start. Most owners know exactly what''s costing them time — they just don''t know whether the fix is software, a different process, or nothing at all. So the first conversation isn''t a sales call, it''s a diagnostic: what''s the actual bottleneck, what''s it costing, and what would have to be true for it to be worth fixing. You come out of it with a straight answer about where technology helps and where it doesn''t, whether or not you build anything with us. That call is free and there''s no commitment attached to it.'),

-- ---------------------------------------------------------------- the worries

('Will This Actually Work for My Specific Business?', 'faq',
 'It''s the right question, and it''s the reason we don''t sell anything off a shelf. Every business has some part of its operation that''s genuinely its own — the way you quote, the way you schedule, the exception everyone works around. Standard software makes you bend to it. We do it the other way: the first phase of every project is understanding your actual workflow, and what gets built is shaped around that. If during that conversation it turns out an existing product already does what you need, we''ll say so.'),

('Will My Team Actually Use It?', 'faq',
 'This is the thing that kills most software rollouts, and it usually isn''t the software''s fault — people abandon a system that''s slower than the workaround they already have. So we build for the person doing the job, not the person buying the tool, and we watch real users touch it before calling it done. Your team gets trained on it, and we stay through the first weeks when the awkward parts surface. If something isn''t getting used, that''s information about the design, and we fix the design.'),

('Won''t This Be Outdated in a Year?', 'faq',
 'Some of it, honestly, yes — the AI piece of anything built today will look old fairly quickly, and anyone telling you otherwise is selling. But the system underneath doesn''t work that way. An ordering flow that matches how you actually sell, a portal your clients know how to use, a database of your jobs — those age like any other business software, which is to say slowly. We keep the fast-moving parts small and swappable so the rest doesn''t have to be rebuilt around them.'),

('What If the AI Makes a Mistake With My Customers?', 'faq',
 'Reasonable worry, and the answer is that AI doesn''t get the last word on anything that matters. Where we use it, it works inside limits we set: it can answer questions it has real information for, take down details, and pass anything unusual to a person. It doesn''t improvise about pricing, it doesn''t make promises on your behalf, and it hands off the moment it''s out of its depth. Anything that touches money or a commitment goes through a human. The point isn''t to replace judgment — it''s to stop the easy stuff from eating your day.'),

('I Don''t Want to Depend on Something I Don''t Understand', 'faq',
 'Then we''ve built it wrong. You should be able to explain what your system does to a new employee in a couple of minutes, and your team should be able to run it without calling us. We train people on it before launch, we write things down in plain language rather than technical documentation, and we build it on standard tools so any competent developer can pick it up. The code is yours. If you ever want to take it somewhere else, you can, and nothing is locked behind a platform you can''t leave.'),

-- ------------------------------------------------------- commercial questions

('Who Owns the Code and the Data?', 'faq',
 'You own the product and your data, always — the customer records, the orders, the history. It''s your business, and it stays portable. Syntric keeps ownership of the underlying patterns and building blocks we reuse across projects, which is what lets each build start from something proven instead of a blank page. In practice that means you''re never locked in: everything runs on standard, widely used infrastructure, and another developer could take it over tomorrow. No proprietary platform, no license you have to keep paying to keep your own system running.'),

('How Payment Works', 'faq',
 'A deposit up front, then invoices tied to work that''s actually shipped — not to a calendar. You see progress weekly, so you always know what you''re paying for before you pay for it. No hourly billing on builds, which means there''s no incentive on our side to stretch the work out. If something comes up mid-project that''s genuinely outside what we scoped, we tell you and re-quote it rather than quietly absorbing it or surprising you at the end. Ongoing support after launch is a separate, smaller arrangement and it''s optional.'),

('Who Isn''t a Good Fit', 'faq',
 'Worth saying plainly, because scoping the wrong project helps nobody. We''re probably not your answer if an off-the-shelf tool genuinely does the job — Shopify, HubSpot, Monday and the like are good products and we''ll tell you when one of them fits. We''re also not set up for large enterprise work with procurement committees and security reviews, and we''re not a fit for someone pre-revenue who doesn''t have a process worth systematizing yet, or for anyone shopping for an hourly contractor. Where we do work well: businesses roughly between $500,000 and $5 million in revenue that have outgrown their spreadsheets.'),

('What Industries Do You Work With?', 'faq',
 'Service and trades businesses — contractors, plumbers, HVAC, home services. Suppliers and product businesses doing wholesale, distribution, or custom manufacturing, which is where our deepest work is: the multi-tenant platform we built for Esoteric Design Lab. Clinics — vet, dental, medical — where the front desk is usually the bottleneck. And guiding and outfitting companies, which is where our own product Tally came from. Honestly, the industry matters less than the shape of the problem. If your operation runs on spreadsheets, group texts, and someone''s memory, we''ve seen that pattern before.'),

-- ------------------------------------------------------------------- delivery

('How We Deliver So Fast', 'process',
 'Three to four weeks for a full platform sounds implausible until you see how the work is set up. We''ve built enough of these to have a repeatable path — intake, research, plan, build — with our own tooling at each step, so a project doesn''t start from a blank page. The parts that are the same in every business (accounts, payments, permissions, admin screens) come from patterns already proven in production. The time goes into the parts that are actually yours. It also helps that there''s one person and no handoffs: nothing is lost in translation between a strategist, a designer, and a developer, because they''re the same person.'),

-- ---------------------------------------------------------------- what we did

('Tally — Our Own Product', 'case_study',
 'Tally is a product Syntric owns and built, aimed at guides and outfitters. On a trip, a guide photographs receipts as they go. An assistant reads each one, sorts it into a category, and adds it up. By the time they''re home the expense report and trip summary are already written. It''s real software with real users, and it exists partly because it''s the honest way to show what we do — not a demo, a thing that has to work when someone''s standing in a parking lot with a wet receipt. You can look at it at post-trip.vercel.app.'),

('Websites for Local Service Businesses', 'case_study',
 'Not every job is a platform. Some businesses need a site that loads fast, says what they do, and turns a visitor into a phone call — and that''s a smaller, cheaper piece of work. We built one for Shamrock Plumbing: clean, quick, built around getting service calls rather than winning design awards. If that''s what you need, say so on the call and we''ll scope it that way instead of talking you into something larger.'),

-- ------------------------------------------------------------ reaching a human

('How Do I Reach a Person?', 'faq',
 'Two ways, both fast. Ask here and I''ll put a short form in the chat — you type what you need, it goes straight to Chandler''s inbox, and he reads it himself. Or book a free 30-minute call at calendly.com/chandler-syntriclabs/30min and talk to him directly. There''s no queue, no support desk, and no account manager in between. Chandler is the person who''d build your system, so you''re talking to him from the first message.')

;

-- Drop the embeddings first: they point at article ids that are about to stop
-- existing, and nothing else would clean them up.
delete from embeddings
where entity_type = 'knowledgebase'
  and entity_id in (
    select a.id from knowledgebase_articles a join kb_sync s on s.title = a.title
  );

delete from knowledgebase_articles a
using kb_sync s
where s.title = a.title;

insert into knowledgebase_articles (title, category, content)
select title, category, content from kb_sync;
