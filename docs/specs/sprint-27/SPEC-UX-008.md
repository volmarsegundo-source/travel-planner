# SPEC-UX-008: Navigation Restructure — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: NEW-003
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to quickly navigate between their expedition list (trip management) and their world map (geographic overview of all journeys), with each experience focused and uncluttered.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | The map view inspires wanderlust and shows their travel footprint |
| `@leisure-family` | Expedition list provides quick access to the active family trip without distraction |
| `@business-traveler` | Clear separation means faster access to the trip list (their primary need) |
| `@bleisure` | Map view helps visualize combining business + leisure destinations geographically |
| `@group-organizer` | Expedition list is the hub for managing multiple group trips |

## 3. Current State

Today, the dashboard page (`/dashboard`) combines:
- DashboardHeader (greeting, rank, points)
- AtlasHeroMap (world map with destination pins) as a background
- ExpeditionCard list (trip cards)
- Empty state (if no expeditions)

The map serves as a decorative background (`pointer-events-none`, `aria-hidden="true"`). This restructure elevates the map to a first-class, interactive page.

### Navigation: Current vs. New

| Current | New |
|---|---|
| Meu Atlas (= dashboard with map bg + cards) | Expedicoes (= trip cards only) |
| Meu Perfil | Meu Atlas (= dedicated interactive map) |
| | Meu Perfil |

## 4. User Flow

### Primary Navigation

```
[Header Nav]
    |
    +-- Home (logo click) --> /dashboard (redirects to /expeditions)
    |
    +-- Expedicoes --> /expeditions (trip list)
    |
    +-- Meu Atlas --> /atlas (interactive map)
    |
    +-- Meu Perfil --> /profile
```

### Expeditions Page Flow

```
[/expeditions loads]
    |
    v
[DashboardHeader: greeting + rank + points]
    |
    v
[Expedition cards list]
    |
   +-- Has expeditions --> [Card grid with "Nova Expedicao" button]
    |
   +-- No expeditions --> [Empty state: illustration + CTA "Criar Primeira Expedicao"]
    |
    v
[Click card] --> /expedition/{id}/phase-{N}
[Click "Nova Expedicao"] --> /expedition/new
```

### Atlas Map Page Flow

```
[/atlas loads]
    |
    v
[Full-viewport interactive map with expedition pins]
    |
    v
[Pins color-coded by expedition status]
    |
   +-- Click pin --> [Popover with expedition name, phase, status, "Ver Expedicao" link]
    |
   +-- No expeditions --> [Map with no pins + floating card: "Crie sua primeira expedicao para ver no mapa"]
    |
    v
[New expedition created elsewhere] --> [Pin appears on next visit to /atlas]
```

## 5. Screen Descriptions

### Screen 1: Expeditions Page (`/expeditions`)

**Purpose**: The traveler's mission control for managing their expeditions.

**Layout**:
- NO background map (clean, focused, fast-loading)
- Container: `max-w-4xl`, centered, standard page padding
- Content stacked vertically:
  1. Breadcrumb: Home > Expedicoes
  2. DashboardHeader (greeting, rank, points — reused as-is)
  3. Section header "Minhas Expedicoes" + "Nova Expedicao" button (top-right)
  4. Expedition cards (existing ExpeditionCard component, vertical list)

**Content**:
- Reuses ALL existing dashboard components except AtlasHeroMap
- No visual changes to ExpeditionCard, DashboardHeader, or empty state

**Empty State**: Identical to current dashboard empty state (compass emoji, title, subtitle, CTA button).

**Loading State**: Skeleton cards (3 cards, existing pattern).

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Single column. Cards stack vertically. "Nova Expedicao" button full-width below header. |
| Tablet (768-1024px) | Single column with wider cards. "Nova Expedicao" button inline with section header. |
| Desktop (> 1024px) | Single column, max-w-4xl centered. Same as current dashboard minus map. |

### Screen 2: Atlas Map Page (`/atlas`)

**Purpose**: Geographic visualization of the traveler's expedition footprint. Inspirational and exploratory.

**Layout**:
- Map fills the available viewport below the header (full-width, full remaining height)
- No max-width constraint — the map IS the page
- Floating UI elements overlay the map:
  - Top-left: Breadcrumb (Home > Meu Atlas) on a semi-transparent chip
  - Bottom-right: Zoom controls (if needed by map library)
  - Top-right: Legend card (small, collapsible)

**Map Specifications**:
- The existing `AtlasHeroMap` uses `react-simple-maps` with a static `CITY_COORDS` lookup. For this page, it becomes interactive.
- Pins are color-coded by expedition status:
  - **Active (current phase 1-7)**: Pulsing teal (#2DB8A0) — same as current animation
  - **Completed (phase 8)**: Solid gold (#C9973A) — no pulse, static
  - **Planning (phase 1, not yet advanced)**: Outlined white with teal border — subtle
- Pin click: Opens a popover card anchored to the pin
- The map is NOT `pointer-events-none` and NOT `aria-hidden` on this page — it is the primary content

**Pin Popover Card**:
- Content: Expedition emoji + destination name (bold), current phase name, status badge
- Action: "Ver Expedicao" link button -> `/expedition/{id}/phase-{N}`
- Dismiss: Click outside, Escape, or click another pin
- Width: 200-240px, `bg-popover`, `border-border`, `shadow-lg`, `rounded-lg`

**Legend Card** (top-right overlay):
- Small card showing pin color meanings
- Three rows: Active (teal dot + "Ativa"), Completed (gold dot + "Concluida"), Planning (outline dot + "Planejando")
- Collapsible to just a legend icon on mobile
- `bg-popover/90 backdrop-blur`, `border-border`, `rounded-lg`

**Empty State**:
- Map still renders (world map is always interesting to look at)
- Centered floating card: "Suas expedicoes aparecerão aqui no mapa. Crie sua primeira expedicao para comecar!" + CTA "Criar Expedicao" -> `/expedition/new`

**Loading State**:
- Map loads with gray placeholder (existing react-simple-maps behavior)
- Pins appear after expedition data loads (progressive enhancement)

**Error State**:
- If map library fails to load (CDN issue): Fallback message "O mapa nao pode ser carregado. Suas expedicoes estao disponiveis em Expedicoes."
- Link to /expeditions as recovery path

### Dark Theme

- Expeditions page: No changes needed (already theme-aware components)
- Atlas map: Ocean bg `#0D1B2A`, continent fill `#1E3A5F` (already configured)
- Pin popover: `bg-popover`, `border-border` (theme tokens)
- Legend card: `bg-popover/90 backdrop-blur` (works in both themes)
- Breadcrumb chip on map: `bg-background/80 backdrop-blur` for readability over map

**Responsive Behavior for Atlas Map**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Map fills viewport. Legend collapsed to icon. Pin popovers render as bottom sheet (anchored to bottom, full-width). Breadcrumb smaller font. |
| Tablet (768-1024px) | Map fills viewport. Legend visible. Pin popovers anchored to pins. |
| Desktop (> 1024px) | Map fills viewport. Legend visible. Pin popovers anchored to pins. |

## 6. Interaction Patterns

- **Navigation transition**: Standard Next.js navigation (no special animation). The Expeditions page is a lightweight list; Atlas is a heavier map. Each loads independently.
- **Pin click**: Popover appears instantly (no animation). On mobile, the bottom sheet slides up 200ms ease-out. Reduced motion: instant.
- **Pin pulse animation**: Existing 2s infinite pulse on active pins. Respects `prefers-reduced-motion`: static dot with slightly larger radius (no animation).
- **Legend collapse/expand** (mobile): Toggle with 150ms slide. Reduced motion: instant toggle.
- **Map interactions**: Pan (drag), zoom (pinch/scroll wheel). These are map library native — UX does not customize them.

### Motion Tokens

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Mobile pin bottom sheet | 200ms | ease-out | instant |
| Pin pulse | 2000ms | linear (infinite) | none (static dot) |
| Legend toggle | 150ms | ease-in-out | instant |

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] All header nav links keyboard-navigable via Tab
  - [x] `aria-current="page"` on active nav item
  - [x] Map pins focusable via Tab (each pin is a button)
  - [x] Pin popover: Escape closes, focus returns to pin
  - [x] Legend card: not a focus trap, collapsible via button with `aria-expanded`
- **Screen Reader**:
  - [x] Map has `role="img"` with `aria-label="Mapa mundial com suas expedicoes marcadas"` (or equivalent)
  - [x] Each pin: `role="button"`, `aria-label="{destination} - {status}"` (e.g., "Tokyo - Ativa, fase 3")
  - [x] Pin popover content readable by screen reader when opened
  - [x] Empty state card: has heading and descriptive text
  - [x] Legend card: semantic list with color descriptions in text (not color alone)
- **Color & Contrast**:
  - [x] Pin colors distinguishable: teal (active) vs gold (completed) vs outlined (planning) — all have different shapes/fills in addition to color
  - [x] Popover text on popover background >= 4.5:1
  - [x] Breadcrumb chip on map: background provides sufficient contrast for text
- **Touch**:
  - [x] Map pins: minimum 44x44px tap target (pin itself can be smaller, but tappable area must be 44px)
  - [x] Legend toggle button: 44x44px
  - [x] Popover "Ver Expedicao" link: 44px height

## 8. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `navigation.expeditions` | Expedicoes | Expeditions |
| `navigation.myAtlas` | Meu Atlas | My Atlas |
| `navigation.myProfile` | Meu Perfil | My Profile |
| `atlas.pageTitle` | Meu Atlas | My Atlas |
| `atlas.mapLabel` | Mapa mundial com suas expedicoes marcadas | World map with your expeditions marked |
| `atlas.emptyTitle` | Seu mapa esta esperando | Your map is waiting |
| `atlas.emptySubtitle` | Crie sua primeira expedicao para ver seus destinos no mapa | Create your first expedition to see your destinations on the map |
| `atlas.emptyCta` | Criar Expedicao | Create Expedition |
| `atlas.legendTitle` | Legenda | Legend |
| `atlas.statusActive` | Ativa | Active |
| `atlas.statusCompleted` | Concluida | Completed |
| `atlas.statusPlanning` | Planejando | Planning |
| `atlas.pinLabel` | {destination} - {status}, fase {phase} | {destination} - {status}, phase {phase} |
| `atlas.viewExpedition` | Ver Expedicao | View Expedition |
| `atlas.mapError` | O mapa nao pode ser carregado. Suas expedicoes estao disponiveis em Expedicoes. | The map could not be loaded. Your expeditions are available in Expeditions. |
| `expeditions.pageTitle` | Minhas Expedicoes | My Expeditions |
| `expeditions.breadcrumb` | Expedicoes | Expeditions |

### Tone of Voice

- Atlas page: Inspirational. "Seu mapa esta esperando" evokes wanderlust.
- Expeditions page: Functional, efficient. Quick access to what matters.

## 9. Constraints

- `react-simple-maps` is already a dependency (used in AtlasHeroMap). For the interactive version, it may need the `@react-simple-maps/core` features for click handlers and zoom. Architect should evaluate if this is sufficient or if Mapbox GL JS (already in stack per project context) would be better for an interactive full-page map.
- The `CITY_COORDS` lookup table is limited to ~35 cities. For the map page to show arbitrary destinations, we need to use the `lat`/`lon` data stored on Trip records (from the autocomplete selection). Trips that were created before autocomplete (no lat/lon) will not appear on the map — this is acceptable.
- The `/dashboard` route should redirect to `/expeditions` to avoid breaking existing bookmarks/links.
- SEO: Neither page needs special SEO (both are behind auth).

## 10. Prototype

- [ ] Prototype required: Yes (for the Atlas map page — new visual)
- **Location**: `docs/prototypes/atlas-map.html`
- **Scope**: Map page with pins, popover, legend, empty state, mobile bottom sheet
- **Status**: Deferred — spec is sufficient for architect to plan data requirements

## 11. Open Questions

- [ ] Should `/dashboard` redirect to `/expeditions` (302) or should we keep `/dashboard` as an alias? **Recommendation**: 301 redirect `/dashboard` -> `/expeditions` for cleanliness, but preserve the route temporarily for backward compatibility.
- [ ] Should the AtlasHeroMap on the expeditions page be removed entirely, or kept as a smaller decorative element? **Recommendation**: Remove entirely. The map has its own page now; keeping a decorative version on the list page dilutes both experiences.
- [ ] Does `react-simple-maps` support click handlers on markers well enough for the interactive map, or should we switch to Mapbox GL JS? **For architect to evaluate.** UX requirements: clickable pins, zoom, pan, popover anchoring.
- [ ] How do we handle trips without lat/lon coordinates (created before autocomplete)? **Recommendation**: Show a small banner on the Atlas page: "Algumas expedicoes nao possuem coordenadas. Edite o destino para que aparecam no mapa." Only show if there are trips without coords.

## 12. Patterns Used

- **DashboardHeader** (reused on Expeditions page)
- **ExpeditionCard** (reused on Expeditions page)
- **EmptyState** (reused with different content on both pages)
- **Breadcrumb** (reused on both pages)
- **New pattern: MapPinPopover** — clickable map marker with anchored popover card
- **New pattern: MapLegend** — collapsible overlay legend card
- **New pattern: MapBottomSheet** — mobile-only bottom sheet for pin details (extends BottomSheet from Sprint 20)

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft |
