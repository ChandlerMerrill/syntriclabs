import type { BrandProfileSeed } from './brand-profile'

/**
 * Syntric's brand profile, transcribed from the brain repo.
 *
 * Sources — keep these in sync by hand, deliberately:
 *   brain/context/voice.md        → voiceRules, bannedWords, hardRules
 *   brain/context/icp.md          → icp
 *   brain/context/offers.md       → offerConstraints
 *   brain/templates/cold-email.md → hardRules
 *
 * This is the only file in the module that knows anything about Syntric. If a
 * second tenant appears, this file gets a sibling and nothing else changes —
 * that is the whole test of whether the config boundary actually holds.
 */
export const SYNTRIC_BRAND_PROFILE: BrandProfileSeed = {
  slug: 'syntric',
  name: 'Syntric',

  voiceRules: {
    speaker:
      'Chandler — a founder and builder who actually runs the systems he talks about. ' +
      'Every piece of writing should read like it came from someone who spent this morning ' +
      "looking at a client's production database, not from someone who writes about looking " +
      'at databases. The voice is not a marketing department, not a tech evangelist selling a ' +
      'vision, not a motivational speaker, and not an "AI guru" account.',

    characteristics: [
      {
        rule: 'Direct without being blunt. Say the thing. Do not bury the point.',
        good: "Most AI chatbots businesses buy don't solve the problem they have.",
        bad: 'There are a variety of considerations when evaluating AI chatbot solutions.',
      },
      {
        rule: 'Confident without being arrogant. State a view. Do not hedge into meaninglessness. Do not be smug.',
        good: "I built this wrong the first time. Here's what I'd do differently.",
        bad: 'You NEED to understand this. Most people are completely wrong about this.',
      },
      {
        rule: 'Curious without being breathless. Genuine interest, no performed excitement.',
        good: 'Interesting to see this pattern showing up more. Makes sense for service businesses.',
        bad: "This is INCREDIBLE. I'm blown away by what this tool can do!!",
      },
      {
        rule: 'Clear and structured, but human. Short sentences. Breathing room. Not everything is a listicle.',
        good: 'Ran an experiment this week. Automated client intake steps 1-3. Saved 40 minutes per client. Not glamorous, but real.',
        bad: 'Top 5 Reasons Why Automation Is Essential For Business Success In 2026...',
      },
      {
        rule: 'Human-paced, not hype-paced. Not every development is urgent. Not everything is a breakthrough.',
      },
      {
        // The failure this guards against is not a wrong word, it is a register.
        // Copy can pass every banned-word check and still read as having come
        // from a department rather than a person, and that is the thing an SMB
        // owner deletes without finishing.
        rule: 'Typed by a person, not issued by a company. If a sentence would fit in a brochure, rewrite it.',
        good: 'Noticed you run trips out of three parks. That reconciliation must be brutal in October.',
        bad: 'We help guiding operations streamline their reporting workflows across multiple locations.',
      },
      {
        rule: 'Short and simple over complete and precise. Get to the point early and stop when it is made.',
        good: "Most of that is manual. It doesn't have to be.",
        bad: 'While there are certainly a number of factors involved, it is often the case that much of this work remains manual in nature.',
      },
    ],

    useCarefully: ['automation', 'workflow', 'efficiency', 'ROI', 'scale'],

    contentRules: [
      'Show, do not tell. Lead with the case study, not the adjective.',
      'No blanket ROI claims. If you say something improved, tell the story of how.',
      'No AI hype language.',
      'SMB owners think in problems ("this is costing me time"), not solutions ("I need AI"). Lead with the problem.',
      'Specific over generic. Always back a claim with a real example.',
      'Never invent a number. If the figure is not on file, do not write it. A fabricated figure in a client email is the failure mode that does actual damage.',
      'Do not assume the reader knows: LLM, API, webhook, prompt, RAG, model. Explain or avoid.',
      'Do not condescend. Many SMB owners are highly intelligent and will notice immediately.',
      'Acknowledge legitimate skepticism. Do not wave it away.',
    ],

    hookRules: [
      'The first line must work standalone.',
      'Never open with "I".',
      'Never open with a quiz question.',
      'Never open with a scene-setting cliche ("In today\'s fast-paced digital landscape...").',
      'Line 1 is an observation about THEIR operation, specific enough that it could not be sent to anyone else.',
    ],

    // brain/templates/cold-email.md — the shape's sign-off block. Appended at
    // render time, never generated. Retained as the fallback for a profile
    // without structured signature details; `signature` below is what the
    // templates actually use.
    signOff: 'Chandler\nSyntric · syntriclabs.com',

    // Transcribed from the Gmail signature so outbound cold mail and a reply
    // typed by hand end in the same block. Matching them matters more than it
    // looks: a prospect who replies and gets a differently-signed message from
    // the same person has been given a reason to wonder which one was automated.
    signature: {
      name: 'Chandler Merrill',
      title: 'Founder & Systems Architect',
      phone: '(801) 518-7571',
      email: 'chandler@syntriclabs.com',
      website: 'www.syntriclabs.com',
      logoUrl: 'https://www.syntriclabs.com/images/Syntric-logo.png',
    },
  },

  // brain/context/voice.md — hard list. Do not ship copy containing these.
  // Plus the two from ../syntric-labs/CLAUDE.md:143.
  bannedWords: [
    'game-changing',
    'game changing',
    'revolutionary',
    'revolutionize',
    'transformative',
    'transform',
    'digital transformation',
    'leverage',
    'synergy',
    'move the needle',
    'at scale',
    'value-add',
    'value add',
    'seamless',
    'unlock',
    'supercharge',
    'AI-powered',
    'AI powered',
    'cutting-edge',
    'cutting edge',
    'best-in-class',
    'best in class',
  ],

  // brain/templates/cold-email.md — "constraints are enforced, not suggested".
  hardRules: {
    maxWords: 120,
    bannedOpeningWords: ['I', "I'm", "I've", 'Im', 'Ive'],
    bannedPhrases: [
      'Hope this finds you well',
      'I wanted to reach out',
      'quick question',
      'circle back',
      'touch base',
      'reaching out',
      'I hope you are doing well',
      'Just following up',
    ],
    subjectMinWords: 4,
    subjectMaxWords: 9,
    maxAsks: 1,
    requireResolvableLinks: true,
  },

  icp: {
    revenueBand: '$500K – $5M annually',
    headcount: '5–100 employees',
    decisionMaker:
      'The owner, almost always. One conversation, one signature. Enterprise-style multi-stakeholder selling is wasted effort here.',
    situation:
      'Hitting an operational ceiling. Still on spreadsheets, manual workflows, disconnected tools. Growing, and the growth is what exposed the ceiling.',
    mindset:
      'They think in problems ("this is eating my time and money"), not solutions ("I need AI"). Copy that leads with the technology loses them.',

    fears: [
      { key: 'wont_work_for_me', statement: "This won't actually work for my specific business." },
      { key: 'pay_a_lot_get_little', statement: "I'll pay a lot and get very little. (Most common and most load-bearing — they have been burned before.)" },
      { key: 'team_wont_use_it', statement: "My team will hate it or won't use it." },
      { key: 'dependent_on_black_box', statement: "I'll become dependent on something I don't understand." },
      { key: 'ai_damages_relationships', statement: 'The AI will make a mistake that damages client relationships.' },
      { key: 'hype_will_date', statement: "This is hype and it'll be outdated in a year." },
    ],

    objections: [
      'Custom software is too expensive for a business my size.',
      "I don't understand AI well enough to know if I need it.",
      'How do I know this will work for my specific business?',
      "I've been burned by tech promises before.",
    ],

    disqualifiers: [
      'Shopping purely on price rather than on not getting burned again.',
      'No single decision maker.',
    ],
  },

  proofAssets: [
    {
      // The key is an identifier, not a label. Existing variants record it as
      // `generation_config.proofAssetKey`, so renaming it would orphan every row
      // that has already cited this asset. The display name is what changed.
      key: 'post_trip_tally',
      // The app's own wordmark is "Tally" — that is what a reader sees if they
      // follow the link, so it is what the copy should say. "Post-Trip Tally"
      // was never the product's name. The descriptor lives in the description
      // rather than in the name on purpose: "Tally, a trip expense tracker I
      // built for a guide" is a person talking, and "Tally — Expense Tracker"
      // written into an email is a directory entry.
      name: 'Tally',
      url: 'https://post-trip.vercel.app',
      description:
        'A trip expense tracker. A web app Chandler built for a guide who runs multi-day park ' +
        'trips, in production and in daily use: photograph each receipt as it happens, it ' +
        'categorizes itself, and the trip report — PDF, Excel, and the images — comes out in ' +
        'one tap at the end. Name it as something built for a client with this exact problem, ' +
        'not as a product with a market. On the URL: it is public, but thin — a stranger ' +
        'following it gets the Tally wordmark, one line about what the app does, and a Sign in ' +
        'button, and everything past that needs an account. So the link currently sends a reader ' +
        'somewhere that explains almost nothing. Prefer describing what it does over linking it ' +
        'until that page says more.',
      // The domain is guided national-park tourism, not fishing and hunting.
      // It pivoted 2026-06-05. Describing it wrong contradicts the product a
      // prospect will actually open.
      segments: ['guiding-outfitting'],
    },
    {
      key: 'esoteric',
      name: 'Esoteric Design Lab',
      url: 'https://esotericdesignlab.com',
      description:
        'A multi-tenant platform with a client portal, e-commerce, inventory and production tracking — in production and still under continuous development.',
      // A clothing supplier serving youth clubs, which is the `suppliers`
      // segment — already described there as its strongest proof. This was
      // empty, meaning "travels anywhere", and so it became the default asset
      // for every segment with none of its own: a vet clinic was about to be
      // offered a clothing-supplier platform as proof.
      segments: ['suppliers'],
    },
  ],

  offerConstraints: {
    offerings: [
      {
        key: 'custom_builds',
        name: 'Custom software builds',
        status: 'proven',
        aliases: [],
        notes: 'What Syntric is actually paid for today. Results may be cited.',
      },
      {
        key: 'design_sprint',
        name: 'Design Sprint',
        status: 'intended',
        // Names it has been floated under, per brain/context/offers.md. Copy
        // using one of them is claiming the same undelivered thing.
        aliases: ['Systems Sprint', 'Operations Review', 'Build Plan', 'AI Roadmap'],
        notes:
          'Embedded assessment plus an implementation plan. Never delivered. May be described, scoped, and quoted. No outcome or track record may be claimed. Never called an audit externally.',
      },
      {
        key: 'education',
        name: 'Education / workshops',
        status: 'intended',
        aliases: ['workshop', 'training'],
        notes: 'Never delivered. Same constraint as the Design Sprint.',
      },
      {
        key: 'ai_front_office',
        name: 'AI front office',
        status: 'intended',
        // Without these the guard is guarded by a phrase no email would use.
        // Each one names the offering rather than the prospect's own desk —
        // "front desk" alone would fire on every clinic email written.
        aliases: ['AI receptionist', 'AI front desk', 'front-desk agent', 'AI phone agent'],
        notes:
          'Chat and voice agents that answer, book, and triage on a business\'s behalf. ' +
          'Demoed on the Syntric site and running for Syntric itself — never delivered to a ' +
          'client. May be described, scoped, and quoted. No outcome or track record may be ' +
          'claimed, including for the demos.',
      },
    ],
    bannedOfferingTerms: ['audit'],
  },
}

/**
 * Segments seeded alongside the profile. The guiding & outfitting one is the
 * live outreach target and Phase 1's benchmark — its research output is
 * compared against the market page that was built by hand.
 */
export const SYNTRIC_SEGMENTS = [
  {
    slug: 'guiding-outfitting',
    name: 'Guiding & outfitting',
    description:
      'Operators running guided trips, and the agencies and lodges that sell them. Tally is the ' +
      'proof asset because a guiding company recognises it, not because its domain defines who ' +
      'is worth writing to. Trip length is not a qualifier.',
    // Trip length and permit-holding were both qualifiers here until 2026-08-06,
    // and both were written to match the proof asset's domain rather than to
    // describe who Syntric can help. They were doing real gatekeeping: a booking
    // agency was rejected for selling day trips, and rows were cautioned for
    // running short ones. Chandler's correction — the proof asset is a relatable
    // example, not the ICP — is what these two lines now say instead.
    qualifiers: [
      'Carries recurring back-office work the owner still does by hand — reconciling, reporting, chasing paperwork.',
      'Owner-operated, or small enough that the owner still touches the paperwork.',
    ],
    disqualifiers: [
      'Already runs a full booking platform and is only looking for a cheaper one — booking software is a solved category and Syntric declines to compete in it.',
      'Enterprise tour operator with a procurement process.',
    ],
  },
  {
    slug: 'service-trades',
    name: 'Service-based / trades',
    description: 'Contractors, plumbers, HVAC, home services.',
    qualifiers: ['Dispatch, quoting, or job tracking still lives in spreadsheets or a group chat.'],
    disqualifiers: ['Fewer than five jobs a week — the ceiling has not been hit yet.'],
  },
  {
    slug: 'suppliers',
    name: 'Suppliers / product businesses',
    description: 'Wholesale, distribution, custom manufacture. Strongest proof asset.',
    qualifiers: ['Inventory or production tracking is manual, or split across tools that do not talk.'],
    disqualifiers: ['Pure dropship with no operational complexity.'],
  },
]
