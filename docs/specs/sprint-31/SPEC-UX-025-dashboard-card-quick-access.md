# SPEC-UX-025: Dashboard Card Quick-Access + Status Colors -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (enhancement to SPEC-UX-022 expedition cards)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Existing Card Implementation

Per SPEC-UX-022 (Sprint 30), the expedition card was redesigned with status-colored left borders and badges. This spec enhances those cards with **quick-access links** to generated content (checklist, guide, itinerary, report) so travelers can jump directly to key outputs without entering the expedition wizard.

### 0.2 Current Card Content (Bottom to Top)

1. Header row: emoji + destination + status badge
2. Dates row
3. Trip countdown (if applicable)
4. Phase progress bar (DashboardPhaseProgressBar)
5. Phase label ("Fase 3 de 6 -- A Preparacao")

**Missing**: No way to access generated content (checklist, guide, itinerary) directly from the card. The traveler must click the card, navigate to the expedition, then find the relevant phase output.

---

## 1. Traveler Goal

Quickly access the most useful outputs of their expedition planning -- checklist, destination guide, itinerary, and summary report -- directly from the expedition card on the dashboard, without navigating through the phase wizard.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Quick access to their checklist before packing. One-tap to review their itinerary. |
| `@leisure-family` | Can share the guide or itinerary link with family members directly from the dashboard. |
| `@business-traveler` | Efficiency: jump to the report for expense reconciliation without navigating the wizard. |
| `@bleisure` | Quick check of the destination guide for local recommendations. |
| `@group-organizer` | Rapid access to share checklist/itinerary with group members. |
| `@travel-agent` | Review any client trip's report directly from the list. |

## 3. User Flow

### 3.1 Happy Path -- Quick Access Links Visible

```
/expeditions (dashboard)
    |
    v
[Expedition card for "Tokyo 2026"]
    |--- Card content (emoji, destination, dates, progress bar)
    |--- Quick-access row: [Checklist] [Guia] [Roteiro] [Relatorio]
    |
    v
[User clicks "Guia" link]
    |
    v
[Navigate to /expedition/{tripId}/guide (Phase 5 output view)]
```

### 3.2 Conditional Visibility

```
[Trip at Phase 2 -- no generated content yet]
    |
    v
[Card shows NO quick-access row (no links to show)]

[Trip at Phase 4 -- checklist generated (Phase 3 complete)]
    |
    v
[Card shows: [Checklist] only]

[Trip at Phase 6 complete -- all content generated]
    |
    v
[Card shows: [Checklist] [Guia] [Roteiro] [Relatorio]]
```

### 3.3 Status Badge States

```
[Trip status determines left border + badge]
    |
    +-- completedPhases >= 6 --> green border + "Concluida" badge
    +-- completedPhases > 0 AND startDate >= today --> amber border + "Em andamento" badge
    +-- completedPhases > 0 AND startDate < today --> amber border + "Em andamento" badge
    +-- completedPhases === 0 --> gray border + "Planejada" badge
    +-- startDate < today AND completedPhases < 6 --> blue border + "Ativa" badge (prioritize active)
```

---

## 4. Screen Descriptions

### 4.1 Enhanced Expedition Card Layout

**Card Content (top to bottom)**:

1. **Header row**: Cover emoji (32px) + Destination name (h3, bold, truncate 2 lines) + Status badge (right-aligned)
2. **Dates row**: "15 mar - 22 mar 2026" (muted, 13px). No dates: "Datas nao definidas" (italic muted).
3. **Trip countdown**: TripCountdownInline (if departure date set)
4. **Phase progress bar**: DashboardPhaseProgressBar (read-only)
5. **Phase label**: "Fase 3 de 6 -- A Preparacao" (muted, 12px)
6. **Quick-access links row** (NEW): horizontal row of icon+text links, separated by a subtle top border

### 4.2 Quick-Access Links Row

**Purpose**: Direct navigation to generated expedition content.

**Layout**:
```
------- (1px border-t, border-border/40) -------
[link-icon] Checklist  [compass-icon] Guia  [map-icon] Roteiro  [doc-icon] Relatorio
```

**Link specifications**:

| Link | Icon | Label | Visible when | Destination URL |
|---|---|---|---|---|
| Checklist | List/check icon (16px) | "Checklist" | Phase 3 completed | `/expedition/{tripId}/checklist` |
| Guia | Compass icon (16px) | "Guia" | Phase 5 completed | `/expedition/{tripId}/guide` |
| Roteiro | Map/route icon (16px) | "Roteiro" | Phase 6 completed | `/expedition/{tripId}/itinerary` |
| Relatorio | Document icon (16px) | "Relatorio" | Phases 3 + 5 + 6 all completed | `/expedition/{tripId}/summary` |

**Link styling**:
- Font size: 12px
- Color: muted-foreground
- Hover: text-foreground, underline
- Gap between links: 12px
- Icon + text gap: 4px
- Links wrap to second line if card is narrow (mobile single-column)
- Each link: `min-height: 32px` (links are secondary, not primary touch targets -- card itself is the primary action)
- On mobile: links get `min-height: 44px` padding to meet touch target

**Visibility rules**:
- Row is completely hidden if no links are available (no empty row, no placeholder)
- Links appear individually as their conditions are met
- Order is always: Checklist, Guia, Roteiro, Relatorio (even if only some are visible)

### 4.3 Status Colors (Card Left Border + Badge)

**Refined from SPEC-UX-022**:

| Status | Left border | Badge text | Badge bg | Badge text color |
|---|---|---|---|---|
| Concluida | 4px solid #10B981 (green) | "Concluida" | green/10 | #10B981 |
| Em andamento | 4px solid #F59E0B (amber) | "Em andamento" | amber/10 | #F59E0B |
| Planejada | 4px solid #9BA8B5 (gray) | "Planejada" | gray/10 | #9BA8B5 |
| Ativa (has active phases) | 4px solid #3B82F6 (blue) | "Ativa" | blue/10 | #3B82F6 |

**Status determination logic**:
- **Concluida**: `completedPhases >= totalPhases` (all 6 phases done)
- **Ativa**: `completedPhases > 0 AND completedPhases < totalPhases` (in progress)
- **Planejada**: `completedPhases === 0` (not started)
- **Note**: The "overdue" status from SPEC-UX-022 (orange border for past start date) is deferred. Revisit when PO decides overdue threshold.

### 4.4 Card Click Behavior

- **Primary click area**: entire card (existing behavior)
- **Quick-access links**: stop propagation on click. Only navigate to the specific URL. Do not trigger the card-level navigation.
- **Keyboard**: Tab through card (1 tab stop for card link) then Tab to each quick-access link individually.

---

## 5. Interaction States Table

### 5.1 Quick-Access Link Interactions

| User Action | Context | Expected Behavior |
|---|---|---|
| Hover link | Any | Text color changes to foreground. Underline appears. Cursor pointer. |
| Click link | Any | Navigate to specific URL. `e.stopPropagation()` to prevent card click. |
| Focus link (Tab) | Any | 2px focus ring (primary), 2px offset. |
| Enter/Space on focused link | Focused | Navigate to specific URL. |
| Hover card (not on link) | Any | Card shadow increases (existing behavior). Links unaffected. |
| Click card (not on link) | Any | Navigate to expedition main page (existing behavior). |

### 5.2 Status Badge Interactions

| User Action | Context | Expected Behavior |
|---|---|---|
| View badge | Any | Display-only. No click, no hover effect. |
| Screen reader | Any | Badge text included in card accessible name. |

### 5.3 Responsive Quick-Access Row

| Breakpoint | Behavior |
|---|---|
| Mobile (< 640px) | Links wrap. Each link gets 44px min-height for touch. |
| Tablet (768-1024px) | Links in one row if all fit, wrap otherwise. |
| Desktop (> 1024px) | Links in one horizontal row. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] Quick-access links are individually focusable via Tab
- [x] Tab order: card link -> quick-access links (left to right)
- [x] Enter/Space navigates to link destination
- [x] Focus indicator: 2px solid ring (primary), 2px offset
- [x] Links do not trap keyboard (Tab moves to next card)

### Screen Reader
- [x] Quick-access row wrapped in `<nav aria-label="Acesso rapido -- {destination}">` to distinguish from main nav
- [x] Each link: visible text serves as accessible name (icon is `aria-hidden="true"`)
- [x] Status badge: text visible, included in card's accessible description
- [x] When no quick-access links: nav element not rendered (no empty landmarks)

### Color and Contrast
- [x] Link text (muted-foreground on card bg): verify >= 4.5:1
- [x] Link hover text (foreground on card bg): passes 4.5:1
- [x] Status badge colors: each badge text color on its 10% opacity bg -- verify >= 4.5:1
- [x] Green (#10B981) on green/10: verify. If fails on dark bg, lighten to #34D399.
- [x] Amber (#F59E0B) on amber/10: verify. If fails, darken text or increase bg opacity.
- [x] Left border is supplementary (badge text is primary status indicator, not color alone)

### Touch
- [x] Quick-access links on mobile: 44px min-height with padding
- [x] Card itself: well above 44px (entire card is touch target)
- [x] Links spaced with 12px gap to prevent accidental taps

---

## 7. Content and Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `card.quickAccess.checklist` | Checklist | Checklist |
| `card.quickAccess.guide` | Guia | Guide |
| `card.quickAccess.itinerary` | Roteiro | Itinerary |
| `card.quickAccess.report` | Relatorio | Report |
| `card.quickAccess.ariaLabel` | Acesso rapido -- {destination} | Quick access -- {destination} |
| `card.status.completed` | Concluida | Completed |
| `card.status.active` | Ativa | Active |
| `card.status.inProgress` | Em andamento | In progress |
| `card.status.planned` | Planejada | Planned |

### Tone of Voice
- Quick-access labels are short, functional, single-word. No verbs needed -- the icon provides action context.
- Status badges are factual and neutral. "Ativa" is better than "Em progresso" for brevity.

---

## 8. Constraints

- **Data availability**: Quick-access link visibility depends on `completedPhases` array from `getUserTripsWithExpeditionData`. No new API fields needed -- phase completion status already available.
- **URL structure**: Assumes routes exist for `/expedition/{tripId}/checklist`, `/expedition/{tripId}/guide`, `/expedition/{tripId}/itinerary`, `/expedition/{tripId}/summary`. If routes differ, adjust URLs.
- **Click propagation**: Quick-access links must call `e.stopPropagation()` and `e.preventDefault()` on the card's click handler to prevent double navigation.
- **Card already a link**: The card wraps content in an overlay `<a>` tag. Quick-access links must be positioned above this overlay (higher z-index) or the card structure must change to avoid nested interactive elements (a link inside a link is invalid HTML).

---

## 9. Prototype

- [ ] Prototype required: No (enhancement is additive to existing card)
- **Notes**: Quick-access row is a straightforward addition. Card structure and status colors are documented with sufficient detail for implementation without a visual prototype.

---

## 10. Open Questions

- [ ] **Nested interactive elements**: Current card uses an overlay `<a>` covering the entire card. Adding links inside creates nested `<a>` tags (invalid HTML). The card structure may need to change to a clickable `<div>` with `role="link"` or the overlay approach must be replaced. **Needs: architect**
- [ ] **Route existence**: Do `/expedition/{tripId}/checklist`, `/guide`, `/itinerary` routes exist as standalone view pages, or are they only accessible within the phase wizard? If wizard-only, links should navigate to the relevant phase page instead. **Needs: tech-lead**
- [ ] **Overdue status**: SPEC-UX-022 included an "overdue" state (orange). Is this still desired for Sprint 31? Currently deferred. **Needs: product-owner**

---

## 11. Components to Create / Replace

### Modified Components

| Component | Change |
|---|---|
| `ExpeditionCard` (from SPEC-UX-022) | Add quick-access links row. Update status color palette (green for completed instead of gold). |

### New Components

| Component | Purpose |
|---|---|
| `QuickAccessLinks` | Horizontal row of conditional icon+text links for expedition outputs |

### No Components Deprecated

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: StatusBadge, TripCard (extended), DashboardPhaseProgressBar, TripCountdownInline

**New patterns introduced**: QuickAccessLinks (conditional icon+text secondary link row)

---

> **Spec Status**: Draft
> Ready for: Architect (nested interactive element resolution, route verification)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Quick-access links + refined status colors for expedition cards. |
