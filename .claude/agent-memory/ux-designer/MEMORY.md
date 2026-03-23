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

## Sprint 29 UX Specs (2026-03-12)
- SPEC-UX-016: Summary Page Card Redesign — hero with TripCountdown + readiness progress bar, next steps cards (1-3 actionable), 6 phase summary cards with status + edit links, skeleton loading. Readiness bar: horizontal, #2DB8A0 fill. Phase cards: left border accent (green=completed, gold=current). No prototype needed.
- SPEC-UX-017: Phase Revisit Edit Mode — edit banner (info style, #EFF6FF bg), "Salvar alteracoes" CTA replaces "Avancar", "Cancelar" secondary action, pre-populated fields, no confirmation dialog (non-destructive), beforeunload guard for unsaved changes. Multi-step phases: auto-save on step transition preserved. No component changes to WizardFooter needed.
- SPEC-UX-018: WizardFooter Integration Across Phases — standardize all 6 phase wizards to use WizardFooter. Back button rules: never on step 1 of phase 1; goes to previous phase on step 1 of phases 2-6; goes to previous step otherwise. Primary labels: "Proximo" (intermediate), "Avancar" (final), "Salvar alteracoes" (edit mode). Remove all arrow-character back buttons. Single WizardFooter per wizard (outside step conditionals). Migration checklist for 6 wizard files.
- All specs saved to: docs/specs/sprint-29/SPEC-UX-{016-018}.md
- Key decisions: no diff view in edit mode; no confirmation dialog for edits; readiness bar horizontal (not circular); back button text "Voltar" (not arrow); WizardFooter teal vs orange CTA color open question
- Open: readiness weighting (equal vs importance-based) — PO decision; CTA color teal vs orange — UX decision pending

## Sprint 30 UX Specs (2026-03-17)
- SPEC-UX-019: Unified Phase Navigation — audit of 3 progress bar components, PhaseShell wrapper, UnifiedProgressBar, StepProgressIndicator, EditModeBanner. Complete interaction states table. Saved to docs/specs/SPEC-UX-019-unified-phase-navigation.md
- SPEC-UX-020: Autocomplete Rewrite — mobile full-screen overlay, desktop dropdown (max 6 visible), flag emoji + 2-line results, recent searches (localStorage, max 3), skeleton loading, error state with manual fallback. Saved to docs/specs/sprint-30/SPEC-UX-020-autocomplete-rewrite.md
- SPEC-UX-021: Meu Atlas Map — interactive map page (/atlas), 3 pin states (gold=completed, blue=active, gray=planned), desktop sidebar + mobile bottom sheet, filter chips, pin popover/bottom sheet, empty state, dark map tiles. Saved to docs/specs/sprint-30/SPEC-UX-021-meu-atlas-map.md
- SPEC-UX-022: Expeditions Dashboard — CSS Grid (1/2/3 col), card status accents (left border), filter chips + sort dropdown, FAB on mobile, skeleton loading, overdue status detection. Saved to docs/specs/sprint-30/SPEC-UX-022-expeditions-dashboard.md
- SPEC-UX-023: Summary/Report — collapsible phase sections, @media print A4 layout, PDF export, share link, detailed phase data (not just counts), booking code masking with toggle, action bar (print/export/share). Saved to docs/specs/sprint-30/SPEC-UX-023-summary-report.md
- Key decisions: autocomplete uses full-screen overlay on mobile (not dropdown); atlas map sidebar on right; expedition cards have 4 status states (active/completed/overdue/planned); summary sections collapsed by default except Phase 1; print forces all expanded + masked booking codes
- Open questions: map library selection (architect); PDF generation approach (architect+finops); flag emoji on Windows rendering; public share links (PO)

## Sprint 31 UX Specs (2026-03-17)
- SPEC-UX-024: Meu Atlas Page Design — supersedes SPEC-UX-021, Leaflet+OSM decided, right sidebar with gamification profile section, 3 pin colors (yellow/blue/gray), popup cards, mobile bottom sheet, dark map tiles, filter chips. Saved to docs/specs/sprint-31/SPEC-UX-024-meu-atlas-page.md
- SPEC-UX-025: Dashboard Card Quick-Access + Status Colors — quick-access links row (Checklist/Guia/Roteiro/Relatorio) conditional on phase completion, status colors refined (green=completed, amber=in-progress, gray=planned, blue=active), links use stopPropagation. Saved to docs/specs/sprint-31/SPEC-UX-025-dashboard-card-quick-access.md
- SPEC-UX-026: Progress Bar 4-State Color System — replace gold/navy with green(#10B981)/blue(#3B82F6)/gray(#6B7280)/gray-dashed(#9BA8B5). New design tokens: --color-phase-completed/current/pending/locked. Applied to UnifiedProgressBar + DashboardPhaseProgressBar. Green connecting lines for completed path. Saved to docs/specs/sprint-31/SPEC-UX-026-progress-bar-4-state-colors.md
- SPEC-UX-027: Header Cleanup — remove "Perfil" from top nav, move to avatar dropdown. GamificationBadge: Link->div (display-only, no click/hover/focus, role="status"). Desktop: Logo | Expeditions | Meu Atlas | [controls] | [badge] | [avatar dropdown]. Saved to docs/specs/sprint-31/SPEC-UX-027-header-cleanup.md
- Key decisions: Leaflet+OSM for map (not Mapbox); gamification badge display-only; profile in dropdown (not top nav); 4-state color tokens shared across progress bar, cards, and map pins; quick-access links conditional on phase completion
- Open: nested interactive elements in card (architect); route existence for checklist/guide/itinerary views (tech-lead); map auto-zoom feasibility (architect); connecting line gradient (architect)

## Sprint 32 UX Specs (2026-03-19)
- SPEC-UX-028: Autocomplete Side-by-Side — Destino left, Origem right, 50/50 width on md+, stacked on mobile. Portal dropdown. No new strings.
- SPEC-UX-029: Preferences 4+3 Split — Page 1: travelPace, budgetStyle, socialPreference, accommodationStyle. Page 2: interests, foodPreferences, fitnessLevel. 3 categories hidden (photographyInterest, wakePreference, connectivityNeeds). Dot pagination.
- SPEC-UX-030: Phase Names Below Progress Bar — Full names on sm+, short names on xs. Dashboard always short names. 11px for UnifiedProgressBar, 9px for dashboard. Contrast fix: completed labels use #059669 (not #10B981) for small text. New i18n keys for shortName variants.
- SPEC-UX-031: Incomplete Phase Warning Dialog — Modal informative dialog when advancing from IN_PROGRESS phase. Lists pending items from PhaseCompletionEngine. "Completar agora" (primary) + "Avancar mesmo assim" (secondary). Focus trap, Escape = stay. Not shown for COMPLETED phases.
- SPEC-UX-032: Car Rental Conditional — Car rental section only visible when "car_rental" in mobility selection. Slide-down+fade-in 200ms on show, fade-out 150ms on hide. Data reset on deselection. Focus returns to car_rental button on deselect.
- All specs saved to: docs/specs/sprint-32/SPEC-UX-{028-032}.md
- Key decisions: preferences reduced from 10 to 7 visible categories; phase name labels use darker green for WCAG on small text; warning dialog is modal (not inline banner) despite SPEC-PROD saying "inline" — justified by need for conscious decision
- Open: PO confirmation on 3 excluded preference categories

## Sprint 33 UX Specs (2026-03-20)
- SPEC-UX-033: Standardized Footer — 3 buttons (Voltar/Salvar/Avancar), dirty state detection, save/discard dialog, inline save feedback (3s auto-dismiss), sticky bottom bar. Extends WizardFooter. Open: CTA color (orange vs teal), dirty state visual indicator.
- SPEC-UX-034: Phase 4 Mandatory Fields — required field markers (asterisk), inline validation on-blur, advance blocking banner with per-section pendencies, scroll to first invalid. "Avancar" stays enabled (validates on click, not pre-disabled). Open: PO confirm enabled vs disabled button.
- SPEC-UX-035: Summary/Report Redesign — full-page report accessible from Phase 2+, hero with gradient+countdown, completion bar (%), pendencies panel (orange, not red), 6 phase section cards (left border status), accordion on mobile, @media print A4, PDF export, booking code masking with 10s reveal. Open: PDF generation approach (server vs print dialog).
- SPEC-UX-036: Social Login — Google+Apple buttons above email form on login+register, "ou" divider, account linking screen (password confirmation), photo import dialog. Apple button: black filled per guidelines. Google button: outline per guidelines. LoginForm already has Google partially. Open: Apple email relay handling, LGPD consent format.
- All specs saved to: docs/specs/sprint-33/SPEC-UX-{033-036}.md
- Key decisions: "Avancar" button stays enabled (not disabled); pendencies use orange (not red) — orientation not error; report accessible from Phase 2; social buttons above form (not below)

## Gamification PA System UX Spec (2026-03-21)
- SPEC-UX-041: Full gamification PA system — 11 screens/components, 21 acceptance criteria
- Saved to: docs/specs/gamification/SPEC-UX-GAMIFICATION.md
- Key data: WELCOME_BONUS=500PA, AI costs 80-150PA, phase rewards 40-500PA (1565/expedition total), AI cost/expedition ~350PA
- 11 components: /como-funciona page, contextual PA tooltips, predictive cost on expedition card, transaction history, insufficient balance flow, onboarding modal (3 steps), header dropdown (evolves GamificationBadge), level-up toast with confetti, badge grid, AI spend confirmation modal, admin dashboard
- Key decision: GamificationBadge re-activated as button with dropdown (reverses SPEC-UX-027 display-only decision — justified by PA system needing quick-access entry point)
- Gastos displayed in muted gray (not red) — spending is normal, not error
- Insufficient balance: empathetic modal, never punitive, always offers path forward
- 9 new patterns: PATooltip, PAConfirmModal, PAInsufficientModal, OnboardingStepModal, BadgeCard, CelebrationToast, TransactionList, CostInfoSection, HeaderDropdown
- 8 open questions blocking implementation (packages/pricing, badge reactivation, onboarding flag storage, predictive cost anxiety, admin priority, confetti performance, low balance threshold, toast position)

## Sprint 36 UX Specs (2026-03-22)
- SPEC-UX-041: SaveDiscardDialog + WizardFooter Global — reusable modal for save/discard on dirty navigation, sticky 3-button footer (phases 1-4) / 2-button (phases 5-6), beforeunload guard. Saved to docs/specs/sprint-36/SPEC-UX-041-save-discard-dialog.md
- SPEC-UX-042: Badge Showcase + Unlock Animation — 16 badges in 4 categories (Explorador/Perfeccionista/Aventureiro/Veterano), 3 states (locked/unlocked/in-progress), detail modal, confetti unlock toast, grayscale-to-color transition. Saved to docs/specs/sprint-36/SPEC-UX-042-badge-showcase.md
- SPEC-UX-043: PA Purchase Page — /meu-atlas/comprar-pa, 4 packages (500/1200/2800/6000 PA), radio card selection, confirmation modal, mock payment v1, contextual ?needed= banner from insufficient modal, purchase history, refund policy. Saved to docs/specs/sprint-36/SPEC-UX-043-pa-purchase-page.md
- SPEC-UX-044: Admin Dashboard — /admin/dashboard, 5 KPI cards (revenue/AI cost/margin/active users/PA circulation), 3 charts (revenue line, top users bar, PA economy donut), sortable user table with search+pagination, date range filter, desktop-optimized. Saved to docs/specs/sprint-36/SPEC-UX-044-admin-dashboard.md
- Key decisions: SaveDiscardDialog is alertdialog (not simple dialog); badge categories always expanded (not collapsible); PA purchase mock payment in v1; admin dashboard desktop-optimized with mobile notice; package economy % calculated against Explorador base rate
- New patterns: SaveDiscardDialog, DirtyStateIndicator, BadgeShowcaseGrid, BadgeDetailModal, BadgeUnlockTransition, PackageCard, PurchaseConfirmModal, ContextualNeedBanner, KPICard, DateRangeFilter, DataChart, SortableTable, MobileNoticeBar
- Open questions: CTA color (orange vs teal), payment gateway (v2), chart library, AI cost tracking, confetti performance

## Sprint 37 UX Specs (2026-03-23)
- SPEC-UX-045: Stripe Purchase Flow — upgrades mock payment to Stripe Checkout hosted redirect. Review panel replaces confirmation modal (inline, not overlay). Success/pending/timeout/cancel pages. Trust badge row. Payment method icons. Polling for webhook confirmation (3s intervals, 30s max). Supersedes SPEC-UX-043.
- SPEC-UX-046: Enhanced Admin Dashboard — upgrades skeleton to full metrics. 7 KPI cards (users, paying, revenue, AI cost BRL, margin%, ARPU, conversion). Margin alert banners (yellow <80%, red <50%). 4 charts (revenue line, AI calls multi-line, level pie, destinations bar). Sortable/searchable user table with profit column (green/red). CSV export. Period filter (7d/30d/90d/1y/custom). Supersedes SPEC-UX-GAMIFICATION 4.11.
- All specs saved to: docs/specs/sprint-37/SPEC-UX-{045-046}.md
- Key decisions: Stripe Checkout hosted (not embedded Elements) for PCI simplicity; inline review panel instead of modal (user leaves our site); cancel page neutral gray icon (not red); margin card color-coded but supplemented by banner; chart sr-only data tables for accessibility; admin dashboard read-only (no user CRUD)
- New patterns: InlineReviewPanel, StripeRedirectOverlay, PaymentResultPage, KPICard (extended to 7), MarginAlertBanner, PeriodFilter, SortableDataTable, ChartCard
- Open questions: PIX/Boleto async payments, email receipt (Stripe vs custom), chart library, USD/BRL rate source, per-user AI cost attribution, CSV row limit

## Sprint 38 UX Specs (2026-03-23) — Design System Foundation
- SPEC-UX-047: 7 component specs (Button, Input, Card, Chip, Badge, PhaseProgress, StepperInput). All tokens from DESIGN.md (V2). Amber-500 CTA, navy-900 brand, teal-600 success, Plus Jakarta Sans. Saved to docs/specs/sprint-38/SPEC-UX-047-design-system-components.md
- SPEC-UX-048: Token mapping — all DESIGN.md tokens to Tailwind under atlas-* namespace. V1/V2 coexistence via prefix isolation. Contrast matrix verified. Saved to docs/specs/sprint-38/SPEC-UX-048-design-token-mapping.md
- Key decisions: atlas-* prefix for all V2 tokens (zero V1 collision); amber-500 is both CTA and warning (risk noted, separate tokens); sm primary button contrast borderline (open question); teal-600 on gray-50 = 4.4:1 (recommend teal-700 on gray backgrounds)
- Feature flag: NEXT_PUBLIC_DESIGN_V2=false (off by default, no visual changes until enabled)
- Open: sm button contrast (OQ-047-01), font loading strategy (OQ-047-02), dashboard progress clickability (OQ-047-03)
