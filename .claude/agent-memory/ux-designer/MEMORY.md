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
- UX-002 (ITEM-13): Transport Selection (Phase 4) — DRAFT
  - 3 sub-steps: intercity transport, local transport, accommodation
  - Non-blocking phase: all fields optional, "Ainda nao decidi" option
  - Card-based selectors (radiogroup/checkbox), conditional detail panels
  - Multiple accommodations support (max 5, collapsible entries)
  - Spec: docs/product/DESTINATION-GUIDE-REDESIGN.md (Part 1)
- UX-003 (ITEM-14): Destination Guide Redesign (Phase 5) — DRAFT
  - 3 options evaluated: Card Grid, Magazine Layout, Dashboard Cards
  - Recommended: Option C (Dashboard Cards) with B elements
  - 4 stat cards (timezone, currency, language, electricity) + 2 content cards
  - Dark theme: bg #1E293B, border #334155, text #CBD5E1
  - Spec: docs/product/DESTINATION-GUIDE-REDESIGN.md (Part 2)
  - Prototype: docs/prototypes/destination-guide-redesign.html

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

## New Patterns (UX-002/003)
- SelectableCard: base component for radiogroup/checkbox card selectors (reusable)
- WizardProgressBar: 3-step with icons (reusable across phases)
- DestinationStatCard: compact card with colored top border (4 categories)
- DestinationContentCard: larger card with left accent border (text content)
- AiBadge: pill badge with sparkle icon for AI-generated content
- CollapsibleEntry: for multi-item lists (accommodations)

## New Patterns (UX-004/005 — Sprint 20)
- PreferenceCategory: collapsible card with question + chip grid + auto-save + points
- PreferenceChip: selectable chip (radio/checkbox) with emoji, name, description
- PreferenceProgressBar: 10-segment bar tracking preference completion
- PassengerSelector: summary field + collapsible panel with steppers
- PassengerStepper: +/- control with label, value, limits, hints
- ChildAgeInput: select (2-11) per child, animated entry/exit
- BottomSheet: mobile slide-up modal container (reusable)

## Sprint 20 UX Decisions
- 10 preference categories: travelPace, foodPreferences, interests, budgetStyle, socialPreference, accommodationStyle, fitnessLevel, photographyInterest, wakeUpPreference, connectivityNeeds
- Preferences stored as JSON field in UserProfile (not 10 separate columns)
- Gamification: +5pts/category, badge at 10/10 (+25 bonus), max 75pts total
- Passenger selector: stepper pattern (LATAM/GOL style), max 9 total, infants <= adults
- Passenger data: JSON field on Trip model
- Bottom sheet on mobile for passenger selector, inline panel on desktop
- Preferences use chips (not text inputs) for structured data
- Spec location: docs/ux/SPRINT-20-UX-SPECS.md

## Dark Theme Tokens (destination guide)
- Card bg: #1E293B (slate-800), border: #334155 (slate-700)
- Text on dark: #F1F5F9 (primary), #CBD5E1 (secondary), #94A3B8 (muted)
- Contrast verified: slate-300 on slate-800 = 7.5:1 (passes AAA)
