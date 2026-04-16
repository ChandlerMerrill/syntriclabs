-- Knowledgebase seed articles
-- Run after 009_knowledgebase.sql

-- ═══════════════════════════════════════════
-- SERVICES
-- ═══════════════════════════════════════════

insert into knowledgebase_articles (title, category, content) values
(
  'Custom Software Development',
  'services',
  'Syntric builds custom platforms, not cookie-cutter templates. Every business we work with has a different set of problems — we don''t have a product to sell you, we build what you need. That means scoping your workflows, understanding where the bottlenecks are, and designing a system that fits. Our capabilities include: client and admin portals, e-commerce platforms with inventory management, internal dashboards and reporting tools, automated workflows (orders, notifications, data sync), AI chat agents for support and lead capture, and AI voice agents for booking and call handling.'
),
(
  'AI Integration & Automation',
  'services',
  'Syntric embeds AI into existing business workflows — not as a gimmick, but to solve real operational problems. We build AI chat agents for customer support and lead capture, AI voice agents for booking and call handling, workflow automation that connects your systems and eliminates manual data entry, and intelligent document generation and processing. Every AI integration starts with understanding your actual workflow and identifying where automation delivers real value.'
),
(
  'Workshops & Training',
  'services',
  'Syntric runs hands-on workshops that teach teams to use modern tools effectively and ethically — with a focus on building things that actually help. This isn''t a lecture. Your team leaves with working tools they built themselves, a clear understanding of what''s worth automating, and the confidence to keep going after we leave. Who it''s for: teams drowning in manual processes who know there''s a better way, business owners who want to understand what AI can and can''t do, and operations managers looking to streamline without hiring more staff. Teams learn to identify high-value automation opportunities, build internal tools with modern AI-assisted workflows, know when to automate and when a process just needs fixing, and understand ethical and practical considerations for AI in business.'
),
(
  'CRM & Business Systems',
  'services',
  'Syntric builds custom internal tools and dashboards that replace spreadsheets and manual processes. Whether you need a CRM tailored to your sales workflow, an admin dashboard for managing operations, or reporting tools that pull data from multiple sources — we build systems that fit how your business actually works, not the other way around.'
),
(
  'Service Overview',
  'services',
  'Syntric offers two things: custom-built software that solves real operational problems, and workshops that teach your team to solve them on their own. Both start with understanding how your business actually works. Software and training built around your business — not the other way around.'
);

-- ═══════════════════════════════════════════
-- PROCESS
-- ═══════════════════════════════════════════

insert into knowledgebase_articles (title, category, content) values
(
  'How We Work — Discovery',
  'process',
  'Step 1: Discovery. We learn your business. What''s working, what''s not, where you''re losing time. Every project starts with understanding your actual workflows and pain points before we write a single line of code. We ask, we listen, and then we scope. The best systems are designed from the inside out.'
),
(
  'How We Work — Scope & Design',
  'process',
  'Step 2: Scope & Design. We map out the system together. You see what you''re getting before we build it. This phase ensures alignment on exactly what will be built, how it will work, and what the deliverables look like. No surprises.'
),
(
  'How We Work — Build',
  'process',
  'Step 3: Build. Fast, focused development. You see progress weekly, not monthly. Fast delivery doesn''t mean cutting corners — it means focused work, clear scope, and no wasted cycles. Two weeks to a full platform isn''t rushed, it''s efficient.'
),
(
  'How We Work — Launch & Support',
  'process',
  'Step 4: Launch & Support. We don''t hand off and vanish. We stick around through launch, through the first real users, through the edge cases nobody planned for. The job isn''t done until your team is running the system confidently and knows how to use it.'
);

-- ═══════════════════════════════════════════
-- ABOUT
-- ═══════════════════════════════════════════

insert into knowledgebase_articles (title, category, content) values
(
  'About Syntric Labs',
  'about',
  'Syntric Labs is a one-person software studio that builds custom platforms for small and medium-sized businesses. We focus on solving real operational problems with modern technology — not selling off-the-shelf products. Every project starts with a conversation about how your business works and where the bottlenecks are.'
),
(
  'About the Founder',
  'about',
  'Chandler Merrill is the founder and builder at Syntric Labs. He''s a software engineer who works directly with small businesses to design and ship custom platforms. His approach is hands-on: he''s in the meetings, he''s writing the code, and he''s available when something breaks. No account managers, no handoffs, no layers between you and the person building your system.'
),
(
  'Our Values',
  'about',
  'Syntric operates on four principles: Build over buzzwords — we don''t sell a vision, we build working software. Understand first, build second — every project starts with learning your business, we don''t assume we know what you need. Speed without shortcuts — fast delivery means focused work, clear scope, and no wasted cycles, not cutting corners. Stay until it works — we don''t hand off a codebase and disappear, we stick around through launch and beyond.'
);

-- ═══════════════════════════════════════════
-- FAQ
-- ═══════════════════════════════════════════

insert into knowledgebase_articles (title, category, content) values
(
  'Pricing Approach',
  'faq',
  'Syntric''s pricing depends on the scope of the project. We don''t publish fixed pricing because every business has different needs. The best way to get a sense of cost is to book a free discovery call where we can scope your project together. As a reference point, a full multi-tenant e-commerce platform was built for approximately $10,000 — about one-third of a competing quote, with more functionality.'
),
(
  'Tech Stack',
  'faq',
  'Syntric builds with modern, production-ready technologies: Next.js and React for frontends, Node.js for backends, Tailwind CSS for styling, Supabase for databases and auth, Vercel for hosting and deployment, and various AI integrations including Claude, OpenAI, and custom AI agents. We choose the right tools for each project rather than forcing a one-size-fits-all stack.'
),
(
  'Team Size',
  'faq',
  'Syntric is a one-person studio. Chandler Merrill works directly with every client — he''s in the meetings, writing the code, and available when something breaks. There are no account managers, no handoffs, and no layers between you and the person building your system.'
),
(
  'Project Timeline',
  'faq',
  'Syntric delivers fast. A full custom platform can be built in as little as two weeks. You see progress weekly, not monthly. Fast delivery doesn''t mean cutting corners — it means focused work, clear scope, and no wasted cycles.'
),
(
  'Who We Work With',
  'faq',
  'Syntric works primarily with small and medium-sized businesses who need enterprise-quality tech without enterprise budgets. Whether you''re a startup needing your first platform, an established business replacing spreadsheets with custom software, or a team looking to integrate AI into your workflows — if you have real operational problems that technology can solve, we can help.'
),
(
  'Engagement Model',
  'faq',
  'Syntric values long-term partnerships over one-off projects. Every engagement starts with a free discovery session to understand your business and scope the work. From there, we move into focused build sprints with weekly progress updates. After launch, we stick around to support your team and iterate as needs evolve.'
),
(
  'What We Don''t Do',
  'faq',
  'Syntric doesn''t do templates, drag-and-drop website builders, or agency-style handoffs. We don''t resell off-the-shelf products or slap your logo on someone else''s software. Everything we build is custom — designed around your specific workflows and business needs.'
),
(
  'How to Get Started',
  'faq',
  'The easiest way to get started is to book a free 30-minute discovery call at calendly.com/syntriclabs/discovery. You can also fill out the contact form at syntriclabs.com/contact. Whether you have a clear project in mind or you''re just starting to think about what better systems could look like — the first step is a conversation.'
);
