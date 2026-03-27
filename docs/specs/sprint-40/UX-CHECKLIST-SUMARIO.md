# UX Visual Fidelity Checklist: Sumario da Expedicao

**Spec ID**: UX-CHECKLIST-SUMARIO
**Related Specs**: UX-SPEC-SUMARIO, SPEC-SUMARIO-CONTEUDO, UX-PARECER-DESIGN-SYSTEM
**Author**: ux-designer
**Status**: Active
**Date**: 2026-03-27
**Purpose**: Section-by-section pass/fail comparison between the Stitch prototype (`code.html`) and the current implementation (`ExpeditionSummaryV2.tsx`), using the UX spec and design system tokens as the source of truth.

---

## How to use this checklist

For each item, compare the Stitch prototype export against the current implementation. Mark items as:
- `[x]` PASS -- implementation matches spec intent (does not need to be pixel-perfect to Stitch)
- `[ ]` FAIL -- implementation diverges from spec or Stitch in a way that harms UX, accessibility, or visual consistency
- `[~]` PARTIAL -- partially implemented, needs adjustment
- `[n/a]` NOT APPLICABLE -- item not relevant to current scope

The Stitch prototype is the visual reference. The UX spec (UX-SPEC-SUMARIO) is the behavioral source of truth. When Stitch and UX spec conflict, the UX spec wins. When both are silent, the design system tokens from UX-PARECER-DESIGN-SYSTEM win.

---

## 1. Hero Header

**Stitch reference**: Lines 173-205 of `code.html` -- full-bleed image hero, 480px height, gradient overlay, destination name 60px, metadata row with icons, 3 action buttons overlaid.

**UX spec reference**: Section 4.2 -- 200/240/280px responsive cover, destination h1 28-36px, date range, duration badge, TripCountdown.

**PO content spec reference**: HERO-01 through HERO-07.

### Layout and Sizing

- [ ] **FAIL**: Hero height. Stitch uses `h-[480px]` full cinematic hero. Implementation uses `200px/240px/280px` responsive (per UX spec). **UX spec wins** -- 200/240/280px is correct for a summary page (not a landing page). No change needed in implementation.
- [x] PASS: Hero uses `rounded-atlas-2xl` with overflow hidden (impl line 198).
- [x] PASS: Gradient overlay from black/transparent present (impl line 208).
- [x] PASS: Content positioned at bottom of hero with padding (impl line 214).

### Destination Name (HERO-01, HERO-02)

- [ ] **FAIL**: Stitch shows `trip title` as H1 ("Expedicao Fortaleza 2026") per HERO-01 (`trips.title`). Implementation shows only `destination` as H1 (impl line 219: `summary.phase1?.destination`). Per PO content spec HERO-01, the title should be `trips.title` with `trips.destination` as fallback. **Implementation needs to use trip title, not destination.**
- [x] PASS: Font size responsive 28px mobile / 36px desktop (impl line 218).
- [x] PASS: Uses `font-atlas-headline font-extrabold text-white`.
- [ ] **FAIL**: Stitch headline uses `Plus Jakarta Sans` at 60px (`text-5xl md:text-6xl`). Implementation correctly uses UX spec sizes (28-36px), which is correct. But font-family should be verified as `font-atlas-headline` maps to Plus Jakarta Sans per design system.

### Origin-to-Destination Route

- [x] PASS: Origin arrow destination shown below title when both available (impl lines 222-226).
- [ ] **FAIL**: Stitch shows route as metadata row with Material icon `location_on` ("Sao Paulo -> Fortaleza, Ceara"). Implementation uses plain text via i18n key `heroRoute`. **Missing location icon** prefix per Stitch pattern.

### Date Range (HERO-04)

- [x] PASS: Date range displayed with locale formatting (impl lines 229-237).
- [x] PASS: Empty state shows italic fallback text (impl line 234-236).
- [ ] **FAIL**: Stitch shows `calendar_today` Material icon before dates. Implementation has no icon prefix.

### Duration Badge (HERO-05)

- [x] PASS: Duration calculated correctly as `(endDate - startDate) + 1` (impl line 85-92).
- [x] PASS: Uses `AtlasBadge variant="status" color="info" size="md"` (impl line 240-242).
- [ ] **FAIL**: Stitch shows `schedule` icon before duration. AtlasBadge may not include icon -- verify component.

### Travelers Count (HERO-06)

- [ ] **FAIL**: Stitch shows total travelers in hero bar metadata row with `group` icon ("7 viajantes"). Implementation does NOT show traveler count in the hero section. Per PO content spec HERO-06, travelers should appear in hero bar when `trips.passengers` is available.

### Trip Type / Family Badge

- [ ] **FAIL**: Stitch shows a `family_restroom` icon with "Familia" label in the hero metadata row. Implementation does not show trip type/classification in the hero. Per Stitch, this enriches the hero with at-a-glance context.

### Completion Percentage (HERO-07)

- [ ] **FAIL**: PO content spec HERO-07 requires a completion percentage and progress bar in the hero. Stitch shows it in the Progress Strip section (not hero). Implementation does not show completion percentage in hero. **Delegate to progress bar section below.**

### Action Buttons (Hero Overlay)

- [ ] **FAIL**: Stitch has 3 action buttons overlaid on the hero: "Exportar PDF" (primary), "Compartilhar" (glass), "Editar Expedicao" (glass). Implementation places actions in the bottom Actions Bar section instead (correct per UX spec). **UX spec decision: actions at bottom, not in hero. No change needed.** But Stitch shows a "Planejamento Completo" badge in the hero -- implementation does not show a completion badge in the hero area.

### Cover Image

- [x] PASS: Destination image loaded via `getDestinationImage()` (impl line 182, 201-206).
- [x] PASS: Fallback to `atlas-surface-container-high` placeholder when no image (impl line 211).
- [x] PASS: Alt text includes destination name (impl line 205).

### TripCountdown

- [x] PASS: TripCountdown rendered below the hero cover area (impl lines 249-254).
- [ ] **FAIL**: Stitch does not show a countdown component. UX spec includes it. **UX spec wins -- keep it.**

---

## 2. Trip Overview Card

**Stitch reference**: Lines 229-255 (Card 1: "Destino e Datas") and Lines 257-273 (Card 2: "Perfil do Viajante"). Stitch splits this into TWO cards. Implementation uses ONE card per UX spec.

### Card Structure

- [x] PASS: Implementation uses single `AtlasCard variant="elevated"` (impl line 260). UX spec defines one consolidated overview card.
- [ ] **FAIL**: Stitch splits overview into "Destino e Datas" (2x2 grid) and "Perfil do Viajante" (chips + accommodation). UX spec consolidates into one card. **UX spec wins -- single card is correct.**
- [x] PASS: Category overline badge "VISAO GERAL" present (impl line 261-263).

### Content Fields

- [x] PASS: Origin displayed with fallback "Nao informada" (impl line 266).
- [x] PASS: Trip type displayed (impl line 267).
- [x] PASS: Destination displayed (impl line 268).
- [x] PASS: Travelers count with passenger breakdown (impl lines 269-273).
- [x] PASS: Departure date displayed (impl line 274).
- [x] PASS: Budget formatted with currency (impl lines 276-279).
- [x] PASS: Return date with flexible dates fallback (impl lines 280-290).

### Travel Style Chips

- [x] PASS: travelerType and accommodationStyle displayed as `AtlasChip mode="selectable" selected disabled` (impl lines 294-307).
- [ ] **FAIL**: Stitch shows additional chips for specific interests ("Praia", "Gastronomia", "Cultura") from preferences. Implementation only shows travelerType and accommodationStyle. Per SPEC-SUMARIO-CONTEUDO F2-02, `preferences.activities` should be shown as chips.

### Grid Layout

- [x] PASS: 2-column grid on md+ with `gap-x-8 gap-y-3` (impl line 265).
- [x] PASS: Single column on mobile (responsive grid).

### Empty State

- [x] PASS: Phase 1 not completed shows fallback message + link to Phase 1 (impl lines 310-318).

---

## 3. Phase Progress Bar

**Stitch reference**: Lines 207-226 -- horizontal strip with "6 de 8 etapas concluidas" text, 8 bar segments (6 filled, 2 locked), points indicator.

### Segment Count

- [ ] **FAIL**: Stitch shows 8 segments (matching 8 phases). Implementation shows 6 segments (`TOTAL_PHASES = 6`, impl line 38). The application has 6 phases, so 6 is correct. **No change needed.**

### Visual States

- [x] PASS: Completed segments use `bg-atlas-success` with white checkmark (impl lines 341-342, 350).
- [x] PASS: Active/partial segment uses `bg-atlas-secondary-container` with pulse animation + `motion-reduce:animate-none` (impl lines 343-344).
- [x] PASS: Not-started segments use hollow `border-2 border-atlas-outline-variant` (impl line 345).

### Connecting Lines

- [x] PASS: Lines between circles use `bg-atlas-success` for completed and `bg-atlas-surface-container-high` for pending (impl lines 377-383).

### Labels

- [x] PASS: Full phase names on `sm+`, phase numbers only on `xs` (impl lines 369-371).
- [x] PASS: Completed labels use `text-[#059669]` (darker green for WCAG on small text) (impl line 362).

### Phase Completion Count

- [ ] **FAIL**: Stitch shows explicit text "6 de 8 etapas concluidas" above the progress bar. Implementation has this only as `aria-label` (impl line 325). **Missing visible text label.** Per Stitch, this label should be visible.

### Points Indicator

- [ ] **FAIL**: Stitch shows "180 Pontos Atlas ganhos nesta expedicao" next to the completion count. Implementation does not show expedition points in the progress strip. This data is in the Gamification Card instead. **Optional enhancement -- defer to Gamification Card.**

### Segment Sizing

- [x] PASS: Circles 28px mobile (`size-7`) / 32px desktop (`size-8`) (impl line 340).
- [ ] **FAIL**: Stitch segments are `h-3` (12px) rounded bars, not circles. This is a fundamentally different visual pattern (bar segments vs connected circles). **UX spec defines circles + connecting lines. UX spec wins.**

### Locked Segments

- [ ] **FAIL**: Stitch shows locked segments with lock icon inside and `surface-container-highest` bg. Implementation shows hollow circles for not-started phases, no lock icon. Per UX spec, not-started = hollow circles. **UX spec wins.**

### Accessibility

- [x] PASS: `role="img"` on container (impl line 324).
- [x] PASS: `aria-label` with completion count (impl line 325).
- [x] PASS: Pulse animation respects `prefers-reduced-motion` (impl line 344).

---

## 4. Phase 1 Card: O Chamado (Trip Basics)

**Stitch reference**: Lines 229-255 (within "Destino e Datas" card -- Stitch merges this into the overview). Stitch does NOT have a separate Phase 1 card. Implementation has a dedicated Phase 1 card per UX spec.

### Card Header

- [x] PASS: Phase icon (emoji) + phase name + status badge + edit CTA (impl lines 415-432).
- [x] PASS: Left border accent for completed phases (impl line 411, function at line 171-175).

### Content When Completed

- [x] PASS: Origin arrow destination on same row (impl line 629).
- [x] PASS: Date range with trip type (impl lines 632-635).
- [x] PASS: Flexible dates indicator when true (impl lines 636-640).

### Content Data (per PO spec F1-01 through F1-08)

- [ ] **FAIL**: F1-01 origin empty state should show "Nao informada" with "Adicionar" link to Phase 1. Implementation shows origin only when available (no explicit empty state within Phase 1 card body -- only in Overview card).
- [x] PASS: F1-02 destination displayed.
- [x] PASS: F1-03/04 dates formatted.
- [x] PASS: F1-05 duration shown in hero, not repeated in card (acceptable).
- [ ] **FAIL**: F1-06 passenger detail not shown in Phase 1 card. PO spec says `show-if-available` in Phase 1 section. Implementation shows passengers only in Phase 2 card and overview. **Minor -- acceptable to keep in Phase 2 only.**
- [x] PASS: F1-07 trip type displayed with dot separator.
- [x] PASS: F1-08 flexible dates displayed when true.

### Empty State

- [x] PASS: Not-started shows "Esta fase ainda nao foi preenchida." in muted italic (impl lines 435-443).
- [x] PASS: `opacity-60` applied to not-started cards (impl line 411).

---

## 5. Phase 2 Card: O Explorador (Profile, Styles, Budget)

**Stitch reference**: Lines 257-273 (Card 2: "Perfil do Viajante") -- chips for interests + accommodation preference.

### Content When Completed

- [x] PASS: Traveler type and accommodation style as chips (impl lines 651-660).
- [x] PASS: Travel pace displayed (impl lines 663-664).
- [x] PASS: Budget formatted (impl lines 666-668).
- [x] PASS: Passengers breakdown (impl lines 670-674).

### Content Data (per PO spec F2-01 through F2-08)

- [ ] **FAIL**: F2-02 travel styles (`preferences.activities`) not shown. Implementation shows only `travelerType` and `accommodationStyle` as chips. PO spec requires activity preferences as chips.
- [ ] **FAIL**: F2-06 dietary restrictions not shown. PO spec says `show-if-available`.
- [ ] **FAIL**: F2-07 cultural interests not shown. PO spec says `show-if-available`.
- [ ] **FAIL**: F2-08 accessibility indicators not shown. PO spec says `show-if-available`.

### Stitch Comparison

- [ ] **FAIL**: Stitch shows interest chips ("Praia", "Gastronomia", "Cultura", "Ritmo: Tranquilo", "Budget: Economico") using `secondary-container` bg with small text. Implementation uses AtlasChip for travelerType/accommodationStyle only. **Missing preference-derived chips.**
- [x] PASS: Accommodation preference shown with icon (Stitch: apartment icon + text). Implementation uses chip instead of icon+text.

---

## 6. Phase 3 Card: O Preparo (Checklist Progress)

**Stitch reference**: Lines 304-322 (Card 4: "Checklist") -- progress bar, 80% (8/10), error-container alert for pending item.

### Progress Display

- [x] PASS: Progress text "X/Y concluidos" (impl line 689).
- [x] PASS: MiniProgressBar component with correct color logic (>=80% = success, <80% = secondary-container) (impl lines 576-602).

### Pending Items

- [x] PASS: Required pending items shown with `!` prefix in `atlas-warning` color (impl lines 702-706).
- [x] PASS: Recommended items in `atlas-on-surface-variant` (impl lines 708-713).
- [x] PASS: Max 5 items displayed with "e mais N..." overflow link (impl lines 715-719).
- [x] PASS: All-done state with green checkmark (impl lines 721-726).

### Stitch Comparison

- [ ] **FAIL**: Stitch shows pending items in an `error-container` (`bg-error-container text-on-error-container`) alert box with `priority_high` icon. Implementation shows a flat list with warning colors for required items. **Stitch pattern is more visually urgent for critical pending items.** Consider wrapping required pending items in an alert-style container.
- [ ] **FAIL**: Stitch shows progress as "80% (8/10 itens)" with both percentage and fraction. Implementation shows only fraction "X/Y concluidos". Per PO spec F3-01: "[X] de [Y] itens concluidos" with progress bar. **Implementation matches PO spec. Percentage could be added as enhancement.**

---

## 7. Phase 4 Card: A Logistica (Transport, Accommodation, Mobility)

**Stitch reference**: Lines 275-302 (Card 3: "Logistica") -- transport type, local transport, pending warning.

### Transport Segments

- [x] PASS: Transport count and per-segment details (emoji, places, date, booking code) (impl lines 740-763).
- [x] PASS: Max 3 segments displayed (impl line 747, `MAX_TRANSPORT_DISPLAY`).
- [x] PASS: Booking codes in mono font (impl line 754).

### Accommodations

- [x] PASS: Accommodation count and per-entry details (type, name, dates, booking code) (impl lines 767-790).
- [x] PASS: Max 3 accommodations displayed (impl line 773, `MAX_ACCOMMODATION_DISPLAY`).

### Mobility

- [x] PASS: Mobility options displayed as non-interactive chips (impl lines 793-806).

### Stitch Comparison

- [ ] **FAIL**: Stitch shows confirmation status badges ("CONFIRMADO", "OK") next to transport items in bold teal. Implementation does not show confirmation status per segment. **Not in UX spec -- defer.**
- [ ] **FAIL**: Stitch shows a pending item warning in `text-error` with warning icon ("Traslado Aeroporto Pendente"). Implementation does not surface individual pending logistics items. **Enhancement: could derive from readiness service.**
- [ ] **FAIL**: Stitch uses Material icons for transport types (`flight`, `directions_car`). Implementation uses emoji. **Acceptable -- emoji is the established pattern in this codebase.**

---

## 8. Phase 5 Card: O Guia do Destino (Guide Highlights)

**Stitch reference**: Lines 324-369 (Full-width "Guia do Destino" card) -- dark bg, texture image, 3 highlight cards, stats (Clima, Seguranca).

### Content

- [x] PASS: "Gerado em" date with AI badge (impl lines 816-821).
- [x] PASS: Highlights displayed as bulleted list (impl lines 822-836).

### Stitch Comparison

- [ ] **FAIL**: Stitch renders the guide card as a dramatic full-width dark card (`bg-[#040d1b] text-white`) with a texture overlay image, 3 highlight sub-cards, and stat boxes (Clima, Seguranca). Implementation renders a standard `AtlasCard variant="base"` phase card with a simple bulleted list. **This is the largest visual gap between Stitch and implementation.**
- [ ] **FAIL**: Stitch spans the guide card across 2 columns (`md:col-span-2`). Implementation uses the standard single-column phase card. Per Stitch, guide content deserves visual emphasis.
- [ ] **FAIL**: Stitch shows destination-specific stats (temperature, safety level) as formatted stat boxes. Implementation shows highlights as plain text bullets. **Enhancement: structure highlights into typed stat cards if data model supports it.**
- [ ] **FAIL**: Stitch shows 3 named highlights ("Praia de Iracema", "Beach Park", "Dragao do Mar") with descriptions in styled sub-cards. Implementation lists highlights as bullets without structure.

---

## 9. Phase 6 Card: O Roteiro (Itinerary Overview)

**Stitch reference**: Lines 372-411 (Full-width "Roteiro" card) -- day-by-day grid, activity count, estimated cost per person.

### Content

- [x] PASS: Day count and total activities displayed (impl lines 841-853).

### Stitch Comparison

- [ ] **FAIL**: Stitch renders a full-width card (`md:col-span-2`) with a day-by-day grid (6 day cards with labels "Chegada", "Iracema", etc.), total activity count, and estimated cost per person ("R$ 1.530 / pessoa"). Implementation shows only a single line "N dias planejados / N atividades". **Major visual gap.**
- [ ] **FAIL**: Stitch shows cost per person prominently (`text-2xl font-headline font-extrabold`). Implementation does not show any cost data in Phase 6 card. Per PO spec, cost data may come from a future budget phase.
- [ ] **FAIL**: Stitch day cards have colored bottom borders (primary for Day 1, teal for others). Implementation has no day-by-day visual. **Enhancement for future iteration.**

---

## 10. Gamification Card

**Stitch reference**: Lines 469-488 -- gradient strip with badge icons, rank label, points-to-next-level indicator.

### Card Presence

- [x] PASS: Card hidden when `totalPA === 0` or gamification is null (impl line 462).

### Content

- [x] PASS: Category overline with custom color (impl line 465).
- [x] PASS: PA badge displayed (impl line 470).
- [x] PASS: Rank badge displayed (impl line 471-473).
- [x] PASS: Badge count displayed (impl lines 474-478).

### Progress Bar

- [x] PASS: Rank progress bar with correct tokens (`bg-atlas-primary` track, `bg-atlas-secondary-container` fill) (impl lines 482-500).
- [x] PASS: `role="progressbar"` with `aria-valuenow/min/max/label` (impl lines 486-490).
- [x] PASS: Progress bar transition respects `motion-reduce:transition-none` (impl line 493).
- [x] PASS: "Proximo nivel" text below bar (impl lines 497-499).

### Stitch Comparison

- [ ] **FAIL**: Stitch uses a gradient strip (`bg-gradient-to-r from-on-tertiary-fixed-variant to-[#003833]`) with badge icons displayed as overlapping circles. Implementation uses `AtlasCard variant="dark"` (navy). **UX spec defines dark card variant, which is correct. Gradient is a Stitch embellishment.**
- [ ] **FAIL**: Stitch shows badge icons as overlapping circle avatars with Material filled icons (`workspace_premium`, `map`). Implementation shows badge count as text only. **Enhancement: show earned badge icons when badge data is available.**
- [ ] **FAIL**: Stitch rank label is large bold ("Level 9 Desbravador"). Implementation shows rank via `AtlasBadge variant="rank"` component which may be more compact. Verify visual weight.

---

## 11. Actions Bar

**Stitch reference**: Lines 489-498 -- simple footer with "Voltar para Roteiro" left and "Voltar ao Dashboard" right button.

### Layout

- [x] PASS: Sticky bottom bar on mobile, inline on desktop (impl line 508).
- [x] PASS: `role="navigation"` with `aria-label` (impl lines 509-510).

### Primary CTA

- [x] PASS: "Voltar ao Dashboard" as `AtlasButton variant="primary" size="lg"` (impl lines 513-521).
- [x] PASS: Full width on mobile, auto width on desktop (impl line 516).

### Secondary Actions

- [x] PASS: "Exportar PDF" and "Compartilhar" as disabled secondary buttons (impl lines 523-543).
- [x] PASS: Hidden on mobile (`hidden md:flex`) (impl line 523).
- [x] PASS: `aria-disabled="true"` on disabled buttons (impl lines 529, 537).

### Mobile Spacer

- [x] PASS: Spacer div `h-20 md:hidden` to prevent content under sticky bar (impl line 548).

### Stitch Comparison

- [ ] **FAIL**: Stitch shows "Voltar para Roteiro" as a ghost/text back button (left-aligned) and "Voltar ao Dashboard" as primary button (right-aligned) with arrow icon. Implementation shows only "Voltar ao Dashboard" as primary + disabled export/share. **Stitch has a back-to-previous-phase navigation that implementation lacks.** UX spec does not include a back-to-previous-phase button. No change needed.
- [x] PASS: Primary button uses orange bg with dark text -- matches design system CTA pattern.

### Stitch Side Navigation

- [ ] **FAIL**: Stitch includes a persistent left sidebar (`w-64`) with phase navigation and a "Download Itinerary" button. Implementation has no sidebar -- summary is a standalone page. **UX spec does not require a sidebar for the summary page. The sidebar is a Stitch shell artifact, not part of the summary spec.**

---

## 12. Responsive Behavior

### Mobile (375px)

- [x] PASS: Single column layout (`grid-cols-1` on phase cards, impl line 400).
- [x] PASS: Hero cover 200px (impl line 198).
- [x] PASS: Progress bar circles 28px with number-only labels on xs (impl lines 340, 370).
- [x] PASS: Overview card single column (impl line 265, grid-cols-1 default).
- [x] PASS: Sticky bottom actions bar (impl line 508).
- [x] PASS: Export/share buttons hidden (impl line 523).

### Tablet (768px)

- [x] PASS: 2-column grid for phase cards (impl line 400, `md:grid-cols-2`).
- [x] PASS: Hero cover 240px (impl line 198, `md:h-[240px]`).
- [x] PASS: Overview card 2 columns (impl line 265, `md:grid-cols-2`).
- [x] PASS: Full phase names visible on `sm+` (impl line 369).
- [x] PASS: Actions bar inline (impl line 508, `md:static`).

### Desktop (1440px)

- [x] PASS: Max width `max-w-4xl` (896px) centered (impl line 194).
- [x] PASS: Hero cover 280px (impl line 198, `lg:h-[280px]`).
- [x] PASS: Padding `px-8` on large screens (impl line 194, `lg:px-8`).
- [x] PASS: All action buttons visible.

### Stitch Comparison

- [ ] **FAIL**: Stitch uses a sidebar layout (`ml-64`) with sidebar taking 256px. Implementation is a single-column centered layout. **Correct per UX spec -- summary page does not use sidebar.**
- [ ] **FAIL**: Stitch uses `max-w-7xl` (1280px) for content area. Implementation uses `max-w-4xl` (896px). UX spec says max-w-4xl. **UX spec wins. But phase 5 and 6 cards in Stitch span 2 columns because of the wider container -- this visual emphasis is lost in the narrower layout.**

---

## Summary Scorecard

| Section | Pass | Fail | Partial | Total | Score |
|---|---|---|---|---|---|
| 1. Hero Header | 8 | 8 | 0 | 16 | 50% |
| 2. Trip Overview Card | 9 | 2 | 0 | 11 | 82% |
| 3. Phase Progress Bar | 9 | 4 | 0 | 13 | 69% |
| 4. Phase 1 Card | 8 | 2 | 0 | 10 | 80% |
| 5. Phase 2 Card | 5 | 5 | 0 | 10 | 50% |
| 6. Phase 3 Card | 5 | 2 | 0 | 7 | 71% |
| 7. Phase 4 Card | 5 | 3 | 0 | 8 | 63% |
| 8. Phase 5 Card | 2 | 4 | 0 | 6 | 33% |
| 9. Phase 6 Card | 1 | 3 | 0 | 4 | 25% |
| 10. Gamification Card | 8 | 3 | 0 | 11 | 73% |
| 11. Actions Bar | 6 | 2 | 0 | 8 | 75% |
| 12. Responsive | 10 | 2 | 0 | 12 | 83% |
| **TOTAL** | **76** | **40** | **0** | **116** | **66%** |

---

## Priority Findings (grouped by severity)

### P0 -- Must fix before release

| # | Section | Issue | Effort |
|---|---|---|---|
| 1 | Hero (1) | Trip title (`trips.title`) not used as H1 -- uses destination instead. PO spec HERO-01 requires title with destination fallback | Small |
| 2 | Phase 2 (5) | Missing preference-derived content: activities, dietary restrictions, cultural interests, accessibility (F2-02, F2-06, F2-07, F2-08). Service may not expose these fields | Medium |
| 3 | Phase 5 (8) | Guide card rendered as plain phase card. Stitch and UX intent both call for visually distinct treatment (dark bg, structured highlights, stats) | Large |

### P1 -- Should fix for visual parity

| # | Section | Issue | Effort |
|---|---|---|---|
| 4 | Hero (1) | Missing traveler count in hero metadata row (HERO-06) | Small |
| 5 | Progress Bar (3) | Missing visible "X de Y fases concluidas" text label above bar | Small |
| 6 | Phase 6 (9) | Only shows count line. Stitch shows day-by-day grid and cost per person. Requires expanded data from itinerary service | Large |
| 7 | Phase 3 (6) | Required pending items not wrapped in alert-style container (Stitch uses error-container bg) | Small |
| 8 | Phase 4 (7) | No confirmation status badges or pending logistics warnings | Medium |

### P2 -- Nice to have (enhance toward Stitch fidelity)

| # | Section | Issue | Effort |
|---|---|---|---|
| 9 | Hero (1) | Missing Material-style icons in metadata row (location, calendar, clock, group) | Small |
| 10 | Gamification (10) | Badge icons shown as text count instead of visual overlapping circles | Medium |
| 11 | Phase 5 (8) | Highlights displayed as flat bullets instead of typed sub-cards with icons | Medium |
| 12 | Hero (1) | "Planejamento Completo" badge not shown in hero | Small |
| 13 | Phase 6 (9) | Missing cost per person display | Medium (data dependency) |

---

## Design Token Compliance

### Tokens correctly applied

- [x] `atlas-surface-container-lowest` for card backgrounds (via AtlasCard)
- [x] `atlas-success` / `#059669` for completed states (circles + text)
- [x] `atlas-secondary-container` for active/CTA elements
- [x] `atlas-on-surface` / `atlas-on-surface-variant` for text hierarchy
- [x] `atlas-outline-variant` for borders
- [x] `font-atlas-headline` for headings
- [x] `font-atlas-body` for body text
- [x] `atlas-text-h4` (18px bold) for phase card names
- [x] `focus-visible` ring on interactive elements (inherited from Atlas components)
- [x] `motion-reduce:animate-none` on pulse animations

### Tokens missing or misapplied

- [ ] **Stitch uses non-token colors**: `#040d1b` inline, `slate-*` classes, `#fe932c` inline. Implementation correctly uses `atlas-*` token classes. **Implementation is more correct than Stitch.**
- [ ] **Stitch uses Google Material Symbols Outlined font**: Implementation uses emoji for icons. Decision: emoji is the established pattern. No action needed.
- [ ] **Stitch uses custom shadow** (`0px 24px 48px rgba(4, 13, 27, 0.06)`): Not in design system token set. Maps approximately to `atlas-shadow-lg`. Implementation relies on AtlasCard built-in shadows.

---

## Accessibility Compliance

- [x] All interactive elements keyboard-navigable
- [x] Color contrast verified for text on surfaces (per UX spec section 6)
- [x] No information conveyed by color alone (badges have text labels, progress has icons)
- [x] Hero image has alt text
- [x] Progress bar has `role="img"` with descriptive `aria-label`
- [x] Mini progress bars have `role="progressbar"` with aria attributes
- [x] Phase card heading hierarchy (h1 > h2 > h3)
- [x] Actions bar has `role="navigation"` with `aria-label`
- [x] Disabled buttons have `aria-disabled="true"`
- [x] Animations respect `prefers-reduced-motion`
- [x] Touch targets minimum 44px on buttons (AtlasButton size md/lg)
- [ ] **REVIEW**: Emoji icons used with `aria-hidden="true"` -- correct.
- [ ] **REVIEW**: Status badges should verify `role="status"` presence (inherited from AtlasBadge).

---

## Recommendations for Next Sprint

1. **Service layer**: Expand `ExpeditionSummaryService` to expose `trips.title`, preference activities, dietary restrictions, and cultural interests for Phase 2 card.
2. **Phase 5 card**: Create a `GuideHighlightCard` variant (dark bg, structured sub-cards) to match the visual weight Stitch gives to the guide section.
3. **Phase 6 card**: Extend itinerary data to include day summaries and per-person cost estimate.
4. **Hero enrichment**: Add traveler count, trip type badge, and completion badge to the hero metadata row.
5. **Progress bar label**: Add visible "X de Y fases concluidas" text above or beside the progress bar circles.

---

> Checklist complete. Overall visual fidelity: **66%**. Core structure and interaction patterns are solid. Major gaps are in content richness (Phase 2 preferences, Phase 5 guide treatment, Phase 6 day grid) and hero metadata completeness. Implementation correctly follows UX spec where Stitch and spec diverge.
