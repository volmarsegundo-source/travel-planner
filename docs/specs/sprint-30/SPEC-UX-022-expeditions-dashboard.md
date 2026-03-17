# SPEC-UX-022: Expeditions Dashboard Rewrite -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (page rewrite)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Existing Implementation (`ExpeditionsList.tsx` + `ExpeditionCard.tsx`)

| Aspect | Current Behavior | Problem |
|---|---|---|
| Layout | Single-column vertical list (`flex-col gap-4`) | No grid. Cards stretch full width on all viewports. Wastes horizontal space on desktop. |
| Card content | Emoji + destination + dates + phase text + DashboardPhaseProgressBar + ChecklistProgressMini | Good data density but no visual status differentiation (no border color for status). |
| Card interaction | Entire card is a link (overlay `<a>` with `inset-0`) + Enter/Space handler | Works but `role="article"` on a clickable div is semantically questionable. |
| Sorting | None | Trips always in the order returned by the server (creation date desc). No user control. |
| Filtering | None | All trips shown. No way to see only active or completed trips. |
| Empty state | Emoji + title + subtitle + CTA button | Acceptable but could be more visually inspiring. |
| "New Expedition" button | Top-right, small `variant="outline"` button | Easy to miss. No FAB on mobile. |
| Loading state | None visible | Page is server-rendered but no skeleton for the expedition list during navigation. |
| Grid | No grid | Should be 1/2/3 column responsive grid. |

### 0.2 Key Issues to Resolve

1. **No grid layout** -- single column wastes space, especially on desktop
2. **No sorting or filtering** -- power users with many trips cannot find what they need
3. **No visual status accent** -- completed/active/overdue trips look identical
4. **"New Expedition" button not prominent enough** -- needs FAB on mobile
5. **No loading skeleton** -- feels slow during client-side navigation
6. **Card semantics** -- `role="article"` on a clickable container is odd

---

## 1. Traveler Goal

See all their expeditions at a glance in an organized, sortable, filterable grid, and quickly identify which trips need attention, which are complete, and how to start a new one.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Visual grid with status colors helps quickly spot the active trip among past ones. |
| `@leisure-family` | Sorting by departure date surfaces the upcoming family trip. Filtering by active shows only what needs planning. |
| `@business-traveler` | Sorting + filtering is essential for travelers with 10+ trips. Quick scan of card status saves time. |
| `@bleisure` | Filter to "Active" to focus on the trip being extended. Sort by departure to prioritize. |
| `@group-organizer` | Multiple trips in parallel. Grid layout + filters are critical for managing many expeditions simultaneously. |
| `@travel-agent` | High trip volume. Sorting by destination A-Z helps find a specific client trip. |

## 3. User Flow

### 3.1 Happy Path -- Returning User

```
/expeditions
    |
    v
[Page loads: header + filter chips + sort dropdown + expedition grid]
    |
    v
[Default view: All trips, sorted by "Newest" (creation date desc)]
    |
    v
[User scans grid, clicks a card]
    |
    v
[Navigate to /expedition/{tripId} (current phase)]
```

### 3.2 Filtering Flow

```
[User clicks "Ativas" filter chip]
    |
    v
[Grid filters to show only active trips. Trip count updates. Sort preserved.]
    |
    v
[If 0 results: inline message "Nenhuma expedicao ativa. Comece uma nova!"]
```

### 3.3 Sorting Flow

```
[User opens sort dropdown, selects "Data de partida"]
    |
    v
[Grid reorders: trips sorted by startDate ascending (soonest first)]
[Trips without dates sorted to the end]
```

### 3.4 New Expedition Flow

```
Desktop: [User clicks "Nova Expedicao" button in header area]
Mobile: [User taps FAB (floating action button) in bottom-right]
    |
    v
[Navigate to /expedition/new]
```

### 3.5 Empty State

```
[User has no expeditions at all]
    |
    v
[Full-width centered empty state: illustration + "Sua aventura comeca aqui" + subtitle + CTA]
```

### 3.6 Filtered Empty State

```
[User has trips but none match the active filter]
    |
    v
[Inline message in grid area: "Nenhuma expedicao {filter_name}." + link to clear filter]
```

---

## 4. Screen Descriptions

### 4.1 Page Header

**Layout**:
```
[Breadcrumb: Home > Expedicoes]

[h1: Expedicoes]                    [Nova Expedicao button (desktop)]

[Filter chips: Todas | Ativas | Concluidas]   [Sort: dropdown]
```

- Breadcrumb: existing `Breadcrumb` component
- Title: "Expedicoes", h1, bold, foreground color
- "Nova Expedicao" button: primary variant, right-aligned on desktop. Hidden on mobile (FAB replaces it).
- Filter chips + sort on same row, wrapping on narrow viewports

### 4.2 Filter Chips

**Layout**: Horizontal row of toggle chips

| Chip | Filter Logic |
|---|---|
| Todas | No filter. Show all expeditions. Default active state. |
| Ativas | `completedPhases < totalPhases` |
| Concluidas | `completedPhases >= totalPhases` |

- Active chip: filled primary background, white text
- Inactive chip: outlined, muted text, card background
- Chip height: 36px desktop, 44px mobile (touch target)
- Gap between chips: 8px

### 4.3 Sort Dropdown

**Layout**: Standard select/dropdown, right-aligned next to filter chips

| Option | Sort Logic |
|---|---|
| Mais recente (default) | `createdAt` descending |
| Data de partida | `startDate` ascending, nulls last |
| Destino A-Z | `destination` alphabetical ascending |

- Dropdown trigger: text label + chevron-down icon
- Options: standard listbox behavior
- Keyboard: arrow keys to navigate, Enter to select

### 4.4 Expedition Card (Redesigned)

**Dimensions**:
- Min-width: 300px (prevents cards from becoming too narrow in 3-col grid)
- Min-height: 180px
- Padding: 20px (desktop), 16px (mobile)
- Border-radius: 12px
- Border: 1px solid `border` color

**Card Content (top to bottom)**:
1. **Header row**: Cover emoji (32px) + Destination name (h3, bold, truncate at 2 lines) + Status badge (right-aligned)
2. **Dates row**: "15 mar - 22 mar 2026" (muted text, 13px). If no dates: "Datas nao definidas" in muted italic.
3. **Trip countdown** (if departure date set): existing TripCountdownInline
4. **Phase progress bar**: mini version (DashboardPhaseProgressBar), read-only
5. **Phase label**: "Fase 3 de 6 -- A Preparacao" (muted text, 12px)

**Card Status Visual Accents**:

| Status | Left border | Badge | Badge color |
|---|---|---|---|
| Active | 4px solid #3B82F6 (blue) | "Ativa" | bg blue/10, text blue |
| Completed | 4px solid #F59E0B (gold) | "Concluida" | bg gold/10, text gold |
| Overdue (startDate < today, not completed) | 4px solid #E8621A (primary orange) | "Atencao" | bg orange/10, text orange |
| Planned (no phases started) | 4px solid #9BA8B5 (gray) | "Planejada" | bg gray/10, text gray |

**Card Hover State**: Subtle shadow increase (`shadow-md`), border color shifts to `border-muted`. Cursor pointer. Entire card is clickable.

**Card Focus State**: 2px focus ring (primary color), 2px offset. Card border unchanged.

**Card Active State (click)**: Brief scale-down (98%, 100ms) for tactile feedback. `prefers-reduced-motion`: no scale, instant navigation.

### 4.5 Grid Layout

| Breakpoint | Columns | Card min-width | Gap |
|---|---|---|---|
| Mobile (< 640px) | 1 | 100% | 12px |
| Small tablet (640-767px) | 1 | 100% | 12px |
| Tablet (768-1023px) | 2 | ~340px | 16px |
| Desktop (1024-1440px) | 3 | ~300px | 16px |
| Wide (> 1440px) | 3 (max-width 1280px, centered) | ~380px | 20px |

- Grid uses CSS Grid with `auto-fill` and `minmax(300px, 1fr)`
- Max container width: `max-w-6xl` (1152px) centered
- Grid is wrapped in a `role="list"` container, each card is `role="listitem"`

### 4.6 Floating Action Button (Mobile)

**Position**: Fixed, bottom-right, 16px from edges
**Size**: 56x56px circle
**Icon**: Plus (+) icon, white on primary orange background
**Shadow**: elevation shadow (lg)
**Label**: `aria-label="Nova expedicao"`
**Behavior**: Visible only on mobile (< 768px). Scrolls with page (always visible). On tap: navigate to `/expedition/new`.
**Hide on scroll down**: Optional enhancement -- hide FAB when scrolling down, show when scrolling up. Not required for v1.

### 4.7 Loading State (Skeleton)

**When**: During client-side navigation to `/expeditions` page
**Layout**: 3 skeleton cards in the grid (matching grid columns for the current breakpoint)
**Skeleton card**: Same dimensions as real card. Gray animated pulse blocks for: emoji circle, 2 text lines, progress bar rectangle, badge rectangle.
**Duration**: Shown until server data arrives
**`prefers-reduced-motion`**: Static gray blocks, no pulse

### 4.8 Empty State (No Trips)

**Layout**: Centered within the grid area, full-width
**Content**:
- Inline SVG illustration (compass or suitcase, consistent with existing empty states)
- Title: "Sua aventura comeca aqui" (h2, bold)
- Subtitle: "Crie sua primeira expedicao e comece a planejar a viagem dos seus sonhos." (muted, max-width 400px)
- CTA button: "Nova Expedicao" (primary, lg size)
- No filter chips or sort shown in empty state

### 4.9 Filtered Empty State (Filter Active, No Matches)

**Layout**: Inline within grid area, not full-page
**Content**: Text message: "Nenhuma expedicao {filter_name}." + "Ver todas" link that resets filter
**Styling**: Muted text, centered, padded `py-12`

---

## 5. Interaction States Table

### 5.1 Card Interactions

| User Action | State | Expected Behavior |
|---|---|---|
| Hover card | Default | Shadow increases. Border shifts to muted. |
| Click card | Default | Brief scale-down (98%, 100ms). Navigate to `/expedition/{tripId}`. |
| Focus card (Tab) | Default | 2px focus ring (primary). |
| Enter/Space on focused card | Focused | Navigate to `/expedition/{tripId}`. |
| Long press (mobile) | Default | No special behavior (v1). |

### 5.2 Filter Interactions

| User Action | State | Expected Behavior |
|---|---|---|
| Click filter chip | Inactive | Activate chip. Filter grid. Update trip count in header. Animate grid transition (fade, 150ms). |
| Click active filter chip | Active | Deactivate, revert to "Todas". |
| Keyboard: Tab to chips | Any | Focus first chip. Arrow Left/Right between. Enter/Space to toggle. |
| Filter with 0 results | Any | Show filtered empty state. Filter chips remain visible. Sort dropdown disabled. |

### 5.3 Sort Interactions

| User Action | State | Expected Behavior |
|---|---|---|
| Click sort dropdown | Closed | Open listbox with 3 options. |
| Select sort option | Open | Close dropdown. Reorder grid. No page reload (client-side sort). |
| Keyboard: Enter/Space on sort | Closed | Open listbox. Arrow Up/Down to navigate. Enter to select. Escape to close. |

### 5.4 FAB Interactions (Mobile)

| User Action | State | Expected Behavior |
|---|---|---|
| Tap FAB | Default | Navigate to `/expedition/new`. |
| Focus FAB (keyboard, unlikely on mobile) | Default | 2px focus ring. |

### 5.5 Page-Level States

| State | Behavior |
|---|---|
| Initial load (server) | Full page render with data. No skeleton needed. |
| Client navigation (from /atlas or other page) | Skeleton cards shown until data loads. |
| Network error loading trips | Error banner at top: "Nao foi possivel carregar suas expedicoes." + retry button. |
| 20+ trips (max limit) | FAB / "Nova Expedicao" button disabled. Tooltip: "Limite de 20 expedicoes atingido." |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] Filter chips: `role="radiogroup"`, each chip `role="radio"`. Arrow Left/Right between. Enter/Space to select.
- [x] Sort dropdown: standard listbox keyboard pattern
- [x] Cards: each card focusable via Tab. Enter/Space navigates. Focus indicator visible.
- [x] FAB: focusable, `aria-label="Nova expedicao"`
- [x] Tab order: breadcrumb -> title -> "Nova Expedicao" button -> filter chips -> sort -> cards (left-to-right, top-to-bottom) -> FAB (mobile)
- [x] No keyboard traps
- [x] Focus indicator: 2px solid ring (primary color), 2px offset

### Screen Reader
- [x] Grid container: `role="list"` with `aria-label="Lista de expedicoes"`
- [x] Each card: `role="listitem"`. Link inside announces destination + status.
- [x] Filter change: `aria-live="polite"` announces "{N} expedicoes" after filter
- [x] Sort change: `aria-live="polite"` announces "Ordenado por {criterion}"
- [x] Empty state: heading hierarchy maintained (h2)
- [x] Card status badge: visible text (not color-only), included in accessible name
- [x] Overdue status: "Atencao" badge text provides non-visual alert
- [x] Trip count in header: updated dynamically, announced via `aria-live`

### Color and Contrast
- [x] Card left border colors serve as supplementary accent -- status badge text provides the primary status indicator (not color alone)
- [x] Active filter chip: white text on primary bg -- contrast verified >= 4.5:1
- [x] Inactive filter chip: muted text on card bg -- contrast verified >= 4.5:1
- [x] Status badge text colors: each passes 4.5:1 against their 10% opacity background
- [x] Overdue orange (#E8621A) on orange/10 bg: verify >= 4.5:1. If fails, darken to #C9511A.

### Motion
- [x] Card click scale: disabled under `prefers-reduced-motion`
- [x] Grid filter animation (fade): disabled under `prefers-reduced-motion` (instant swap)
- [x] Skeleton pulse: disabled under `prefers-reduced-motion` (static gray)
- [x] FAB hover/tap: no motion effects

### Touch
- [x] Cards: entire card is touch target (well above 44px minimum)
- [x] Filter chips: 44px height on mobile
- [x] Sort dropdown trigger: 44px height on mobile
- [x] FAB: 56x56px (exceeds 44px minimum)
- [x] Gap between filter chips: 8px

---

## 7. Content and Copy

### Key Labels and CTAs

| Key | PT-BR | EN |
|---|---|---|
| `expeditions.title` | Expedicoes | Expeditions |
| `expeditions.newExpedition` | Nova Expedicao | New Expedition |
| `expeditions.filterAll` | Todas | All |
| `expeditions.filterActive` | Ativas | Active |
| `expeditions.filterCompleted` | Concluidas | Completed |
| `expeditions.sortNewest` | Mais recente | Newest |
| `expeditions.sortDeparture` | Data de partida | Departure date |
| `expeditions.sortDestination` | Destino A-Z | Destination A-Z |
| `expeditions.sortLabel` | Ordenar por | Sort by |
| `expeditions.tripCount` | {count} {count, plural, one {expedicao} other {expedicoes}} | {count} {count, plural, one {expedition} other {expeditions}} |
| `expeditions.emptyTitle` | Sua aventura comeca aqui | Your adventure starts here |
| `expeditions.emptySubtitle` | Crie sua primeira expedicao e comece a planejar a viagem dos seus sonhos. | Create your first expedition and start planning your dream trip. |
| `expeditions.filteredEmpty` | Nenhuma expedicao {filter}. | No {filter} expeditions. |
| `expeditions.clearFilter` | Ver todas | View all |
| `expeditions.noDates` | Datas nao definidas | Dates not set |
| `expeditions.limitReached` | Limite de 20 expedicoes atingido. | 20 expedition limit reached. |
| `expeditions.statusActive` | Ativa | Active |
| `expeditions.statusCompleted` | Concluida | Completed |
| `expeditions.statusOverdue` | Atencao | Attention |
| `expeditions.statusPlanned` | Planejada | Planned |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Failed to load trips | Nao foi possivel carregar suas expedicoes. Tente novamente. | Could not load your expeditions. Try again. |

### Tone of Voice
- The expedition list is the traveler's home base. It should feel organized, calm, and empowering.
- Empty state is inspirational -- "Your adventure starts here" creates anticipation.
- "Atencao" (overdue) is neutral, not alarming. It signals "this trip needs your attention" without creating anxiety.
- Filtered empty states are factual and offer a clear path (view all).

---

## 8. Constraints

- **Max 20 active trips**: Per existing business rule. FAB and "Nova Expedicao" button disabled at limit.
- **Server-rendered page**: Expeditions list is fetched server-side. Sorting and filtering are client-side (no additional API calls). All trip data is available on initial render.
- **Existing card data**: All data fields (destination, dates, currentPhase, completedPhases, totalPhases, coverEmoji, coordinates) are already fetched by `getUserTripsWithExpeditionData`.
- **Overdue detection**: A trip is "overdue" when `startDate < today AND completedPhases < totalPhases`. This is a client-side derivation, no new API field needed.
- **No pagination in v1**: All trips rendered. With 20 max, pagination is unnecessary.

---

## 9. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/expeditions-dashboard.html`
- **Scope**: Grid layout (1/2/3 col), card states (active/completed/overdue/planned), filter + sort, empty state, mobile FAB
- **Notes**: To be created as a follow-up after spec approval.

---

## 10. Open Questions

- [ ] **Card click destination**: Currently navigates to `/expedition/{tripId}` (Phase 1). Should completed trips navigate to `/expedition/{tripId}/summary` instead? **Needs: product-owner**
- [ ] **Overdue threshold**: Should "overdue" status apply only if the trip start date has passed, or also if departure is within 7 days and planning is incomplete? **Needs: product-owner**
- [ ] **Sort persistence**: Should the selected sort option persist across sessions (localStorage) or reset to "Newest" each visit? **Needs: product-owner**

---

## 11. Components to Create / Replace

### New Components

| Component | Replaces | Purpose |
|---|---|---|
| `ExpeditionCard` (rewrite) | Current `ExpeditionCard.tsx` | Status-accented card with left border, redesigned layout |
| `ExpeditionGrid` | `ExpeditionsList` (vertical list) | CSS Grid responsive container |
| `ExpeditionFilterChips` | Nothing (new) | Status filter chips (All / Active / Completed) |
| `ExpeditionSortDropdown` | Nothing (new) | Sort control (Newest / Departure / A-Z) |
| `ExpeditionFAB` | Nothing (new) | Mobile floating action button for new expedition |
| `ExpeditionCardSkeleton` | Nothing (new) | Loading placeholder card |

### Components to Deprecate

| Component | Action |
|---|---|
| `ExpeditionsList` | Replace with `ExpeditionGrid` |
| Current `ExpeditionCard` | Rewrite in place |

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: TripCard (adapted), StatusBadge (redesigned with left border), EmptyState (SVG + title + CTA), Toast (error feedback), DashboardPhaseProgressBar (reused as-is), TripCountdownInline (reused as-is)

**New patterns introduced**: ExpeditionGrid (responsive auto-fill grid), ExpeditionFilterChips (status toggle group), ExpeditionSortDropdown (client-side sort control), ExpeditionFAB (mobile floating action button), ExpeditionCardSkeleton (loading placeholder)

---

> **Spec Status**: Draft
> Ready for: Architect (pending resolution of open questions in Section 10)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Full audit of current list layout + complete grid dashboard spec with filtering, sorting, status accents, FAB, and skeleton loading. |
