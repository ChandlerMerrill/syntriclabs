# Syntric Labs

B2B AI solutions agency landing page. Multi-page Next.js site with live voice agent demo and static chat showcase.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (verify this passes before committing)

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Framer Motion 12, lucide-react icons, Geist Sans font via next/font.

## Architecture

All source lives under `src/` with the App Router:

- `src/app/` — pages (landing, services, about, contact), layout, globals.css, sitemap
- `src/components/landing/` — Hero, ServicesOverview, Process (How It Works), CTABanner
- `src/components/demos/` — ChatShowcase (static), VoiceDemo (interactive), CallVisualization, CRM cards
- `src/components/ui/` — Button, Card, SectionHeader, AnimateIn, RelevanceAIWidget
- `src/components/layout/` — Navbar, Footer
- `src/components/about/` — Mission, Values
- `src/components/contact/` — ContactForm
- `src/hooks/` — useDemoMode (voice demo scripting)
- `src/lib/` — types, demo-scripts

## Coding Conventions

- **Tailwind only** for styling — no CSS modules. Design tokens live in `globals.css` `@theme inline` block.
- **Framer Motion** for all animations. Use the `AnimateIn` wrapper for scroll-triggered entrance animations.
- **lucide-react** for icons — don't add other icon libraries.
- **`next/image`** for all images — set width/height to match actual image dimensions; control display size with CSS classes.
- Client components use `"use client"` directive only when needed (state, effects, browser APIs).

## Important Patterns

- **Never use `scrollIntoView`** for auto-scrolling within panels — it causes page-level scroll jumps. Use container-scoped `el.scrollTop = el.scrollHeight` instead.
- **No global smooth scroll** — it was removed from globals.css because it caused scroll-jump bugs. Smooth scrolling is opt-in per interaction only.
- Client-side env vars must be prefixed `NEXT_PUBLIC_`.
- The floating chat widget (`RelevanceAIWidget.tsx`) is env-gated via `NEXT_PUBLIC_RELEVANCE_AI_SHARE_ID`.

## Do NOT

- Add global `scroll-behavior: smooth` to CSS
- Use CSS modules
- Commit `.env.local` or any `.env*` files (they contain API keys)
- Use `scrollIntoView` for auto-scrolling inside scrollable containers
