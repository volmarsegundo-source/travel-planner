# UX Designer Memory — Travel Planner

## Project Context
- App: web travel planner, Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Auth: Auth.js v5 (self-hosted). Routes under (auth)/ require login.
- Stack: PostgreSQL + Prisma, Redis (Upstash), Mapbox GL JS
- All UI text: Portuguese. Code: English. Commits: Conventional Commits.

## Completed Work
- UX-001 (US-001): Trip Creation & Management — APPROVED
  - UX spec: docs/ux-patterns.md
  - Prototype: docs/prototypes/feature-001.html (self-contained, no external deps)

## Design System (tokens defined in ux-patterns.md)
- Primary: #E8621A (orange — warm, travel energy)
- Secondary: #1A3C5E (deep navy — trust, navigation)
- Accent: #2DB8A0 (teal — success, active states)
- Page bg: #F7F9FC, Surface: #FFFFFF
- Error: #D93B2B, Warning: #F59E0B, Success: #2DB8A0
- 8 cover gradients: sunset, ocean, forest, desert, aurora, city, sakura, alpine
- Touch targets: min 44x44px on mobile (enforced)
- Font: system-ui / Segoe UI stack (no Google Fonts dependency)

## Key UX Decisions (US-001)
- No image upload in v1: colored gradient covers + emoji instead
- Destination: free text (no Mapbox autocomplete in v1 — hint shown)
- Max 20 active trips: counter in header, FAB disabled at limit, alert in form
- Edit trip: dedicated page /trips/[id]/edit (not modal) — better mobile UX
- Delete confirmation: requires typing trip name exactly (prevents accidents)
- Archive confirmation: simple dialog (reversible action — secondary button, not destructive)
- Empty state: SVG illustration inline (no external deps)
- Loading state: skeleton cards (3 per grid)
- Status flow: PLANNING -> ACTIVE -> COMPLETED | ARCHIVED

## Prototype Conventions
- All prototypes: single self-contained HTML file, no external CDN/fonts
- Navigation: div/section toggling with inline JS (showScreen function)
- ARIA: included in prototype as developer reference
- Text content: Portuguese. JS/CSS/HTML: English.
- Save to: docs/prototypes/[feature-name].html

## Accessibility Standards (non-negotiable)
- WCAG 2.1 AA minimum on all specs
- All form inputs: visible label + aria-required + aria-invalid + aria-describedby on errors
- Focus indicator: 2px solid var(--color-primary), outline-offset 2px
- prefers-reduced-motion: always respected
- Dialogs: focus trap + aria-modal="true" + aria-labelledby + aria-describedby

## Patterns to Reuse (from ux-patterns.md)
- TripCard, TripGrid, StatusBadge, CoverPicker, EmojiPicker
- FormField (label + input + error + hint + char-counter)
- ConfirmDialog vs DeleteConfirmDialog (different severity)
- Toast with auto-dismiss (4s) + progress bar
- EmptyState with inline SVG illustration
