# UX Designer Memory — Travel Planner

## SDD Process (Sprint 25+)
- Official process: Spec-Driven Development
- UX owns SPEC-UX-XXX specs
- UX spec defines user flows, interaction patterns, accessibility requirements
- UX specs must be technology-agnostic (no library/component references)
- Must include: user flows, wireframe descriptions, WCAG requirements, responsive behavior
- UX spec created AFTER product spec (SPEC-PROD), BEFORE architecture spec (SPEC-ARCH)
- Any UX deviation during implementation requires spec update + approval
- Template location: docs/specs/templates/TEMPLATE-UX-SPEC.md
- Spec numbering: SPEC-UX-001, SPEC-UX-002, etc. (sequential)
- Reviewers: product-owner, tech-lead, architect (minimum)

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

## Sprint 26 UX Specs (2026-03-11)
- SPEC-UX-001: Autocomplete Redesign — opaque dropdown bg, structured 2-line results (City bold / State, Country muted), no-results hint, 44px mobile touch targets
- SPEC-UX-002: Guide Full Visibility — remove all collapsible sections, 10 sections always visible, hero summary banner, remove "Update guide" button, skeleton loading for 10 cards
- SPEC-UX-003: Unified Phase Transitions — one consistent pattern: fade+slide 200ms ease-out for inline, 300ms for interstitial. Auto-advance 3s (up from 2s). Motion tokens: fast(150ms), normal(200ms), slow(300ms), celebration(1200ms). All respect prefers-reduced-motion.
- SPEC-UX-004: Preferences Pagination — split 10 categories into 2 pages of 5. Page 1 = trip-shaping prefs, Page 2 = lifestyle. Chips: never truncate, wrap text, 44px min touch. Next/Previous buttons.
- SPEC-UX-005: Dashboard Visual Polish — progress bar segments become read-only (remove clickable links to fix 44px touch issue). Completed=gold+checkmark, Current=primary+pulse, Incomplete=outlined, ComingSoon=dashed+opacity. Phase labels as hover tooltips below bar. Add dates to card per SPEC-PROD-002.
- All specs saved to: docs/specs/sprint-26/SPEC-UX-{001-005}.md
- Key decisions: progress bar segments non-interactive on dashboard cards; guide sections never collapse; autocomplete dropdown instant (no animation); preferences page 1 has AI-critical categories

## Sprint 27 UX Specs (2026-03-11)
- SPEC-UX-006: Autocomplete FINAL Fix — portal-based dropdown rendering to escape parent overflow clipping. Recommends shadcn/ui Combobox (Radix Popover portal). Two-line format preserved. No animation on dropdown. This is the DEFINITIVE fix after 4+ sprints of clipping bugs.
- SPEC-UX-007: Gamification Header — points + rank badge + mini progress bar in AuthenticatedNavbar. Desktop: inline (points + rank + bar). Mobile: collapsed to points only, tap to expand card. Data from getProgressSummary in AppShellLayout. Rank pulse animation 600ms on update.
- SPEC-UX-008: Navigation Restructure — split "Meu Atlas" into "Expedicoes" (/expeditions, trip list only) and "Meu Atlas" (/atlas, dedicated interactive map). Map pins color-coded by status. Pin click opens popover. /dashboard redirects to /expeditions. AtlasHeroMap removed from expeditions page.
- SPEC-UX-009: CTA Button Standardization — all phase completion buttons become "Avancar" (phases 1-7), "Concluir Expedicao" (phase 8). Full-width, 48px, size="lg". Single i18n key for phases 1-7. No reward language in CTA. Double-click prevention. White on #E8621A contrast note (3.2:1 passes large text).
- SPEC-UX-010: Guide Card Uniformity — hero banner gets narrative summary paragraph (new AI field needed). Stat cards: uniform 120px height, tips moved to tooltip. Content cards: uniform min-height 140px, colored bullet dots. Visual cohesion: same border-radius, padding, bg across stat and content cards.
- All specs saved to: docs/specs/sprint-27/SPEC-UX-{006-010}.md
- Key decisions: portal rendering for autocomplete (not z-index fixes); gamification widget between nav links and utility controls; /dashboard becomes /expeditions; "Avancar" not "Concluir e Ganhar Pontos"; stat card tips in tooltips for uniform height
- Blocked: SPEC-UX-010 needs prompt-engineer to add destinationSummary to AI guide schema

## New Patterns (UX-006 through 010 — Sprint 27)
- PortalCombobox: combobox with portal-rendered listbox (escapes overflow)
- GamificationWidget: compact header widget (points + rank + progress bar)
- MiniProgressBar: thin 4px inline progress bar (reusable)
- MapPinPopover: clickable map marker with anchored popover
- MapLegend: collapsible overlay legend card for map
- MapBottomSheet: mobile bottom sheet for pin details (extends BottomSheet)
- PhaseCompletionButton: standardized CTA wrapper for all phase wizards
- GuideHeroBanner: narrative summary + quick stats row
- CardTipTooltip: hover/focus tooltip for supplementary tips on compact cards

## End-to-End UX Audit (2026-03-10)
- Full audit: docs/ux/END-TO-END-UX-REVIEW.md
- Grade: C+ (Functional but Inconsistent)
- Top 5: Phase 4 tabs->wizard, 3 animation systems, progress bar mobile, autocomplete, no save feedback
- Critical: Phase 4 needs 3-step wizard redesign (transport->accommodation->mobility+confirm)
- Critical: prefers-reduced-motion NOT respected anywhere (WCAG violation)
- Major: Phase 1-2 lack ExpeditionProgressBar, Phase 6 has none at all
- Major: PointsAnimation auto-dismiss 2.5s too fast, no focus trap
- Major: PhaseTransition auto-advance 2s, should require explicit tap
- Major: Back buttons use arrow char with no aria-label
- Major: No save confirmation on Phase 4 transport/accommodation save
- Major: ExpeditionProgressBar click targets 24x8px (below 44x44 minimum)
- Extract shared: Spinner, PhaseHeader, WizardNavButtons, SaveIndicator
- Motion tokens needed: fast(150ms), normal(300ms), slow(500ms), celebration(3s)
- Phase 4 max-w-2xl breaks consistency (others use max-w-md)
- Major: Phase 4 tab panels aria-labelledby reference non-existent IDs (broken ARIA)
- Major: Phase 2 confirmation "categories" hardcoded English (not i18n)
- Major: RegisterForm "(opcional)" hardcoded Portuguese (not i18n)
- i18n: ThemeToggle, DashboardPhaseProgressBar state labels also hardcoded English
- All phase pages have Breadcrumbs (Home > Expedition), but depth is shallow
- Phase 3 checklist has good ARIA: role="checkbox", aria-checked, aria-label per item
