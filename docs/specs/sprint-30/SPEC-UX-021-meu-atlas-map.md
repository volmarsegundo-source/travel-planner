# SPEC-UX-021: Meu Atlas Map -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (page rewrite)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Existing Implementation (`AtlasHeroMap.tsx`)

| Aspect | Current Behavior | Problem |
|---|---|---|
| Library | `react-simple-maps` with world-atlas CDN GeoJSON | External CDN dependency. Projection is static (`geoEqualEarth`), no zoom, no pan. |
| Interactivity | `pointer-events-none` on container, `aria-hidden="true"` | Map is purely decorative. No click, no zoom, no interaction at all. |
| Pin placement | Hardcoded `CITY_COORDS` lookup table (~40 cities) | Fails silently for any city not in the table. No dynamic coordinates from trip data. |
| Pin states | All pins identical (gold pulsing circle) | No visual distinction between completed, in-progress, or planned trips. |
| Pin click | None | No way to navigate to a trip from the map. |
| Mobile | Same SVG map at 800x400 | Map is tiny and unreadable on mobile. No bottom sheet, no list view alternative. |
| Accessibility | Entire map `aria-hidden="true"` | Completely invisible to screen readers. No alternative content. |
| Zoom/Pan | None | Cannot explore destinations or see clustered pins. |

### 0.2 Key Issues to Resolve

1. **No interactivity at all** -- map is a decorative background, not a functional feature
2. **Hardcoded coordinates** -- only ~40 cities supported; trips with database coordinates are ignored
3. **No pin status differentiation** -- all trips look the same on the map
4. **No mobile adaptation** -- needs bottom sheet for trip details
5. **No accessibility** -- entirely hidden from assistive technology, needs text-based alternative
6. **CDN dependency** -- `world-atlas` GeoJSON loaded from jsdelivr at runtime

---

## 1. Traveler Goal

Visualize all their travel destinations on an interactive world map, see the status of each expedition at a glance, and quickly navigate to any trip to continue planning or review.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Visual inspiration -- seeing pins on a world map motivates future travel. Emotional reward for completed trips. |
| `@leisure-family` | Overview of all family trips. Quick access to any expedition without scrolling through a list. |
| `@business-traveler` | Fast visual scan of upcoming destinations. Click pin to jump directly to logistics phase. |
| `@bleisure` | See both business and extended trips on the same map. Plan extensions by seeing nearby destinations. |
| `@group-organizer` | Bird's-eye view of all group expeditions across different destinations. |

## 3. User Flow

### 3.1 Happy Path -- Desktop

```
/atlas (dedicated page)
    |
    v
[Full-width map with left sidebar]
    |--- Sidebar: filter chips (All | Active | Completed) + trip list
    |--- Map: pins for all trips with coordinates
    |
    v
[User clicks pin on map]
    |
    v
[Popover card appears anchored to pin: destination, dates, phase progress, "Continue" link]
    |
    v
[User clicks "Continue"] --> [Navigate to expedition phase page]
```

### 3.2 Happy Path -- Mobile (< 768px)

```
/atlas
    |
    v
[Full-screen map, filter chips overlaid at top, trip count badge]
    |
    v
[User taps pin on map]
    |
    v
[Bottom sheet slides up with trip details: destination, dates, progress, "Continue" button]
    |
    v
[User taps "Continue"] --> [Navigate to expedition]
```

### 3.3 Sidebar/List Navigation

```
[User clicks trip in sidebar list (desktop) or trip list in bottom sheet (mobile)]
    |
    v
[Map pans and zooms to center on that trip's pin]
[Pin popover/bottom sheet opens with trip details]
```

### 3.4 Filter Path

```
[User selects "Active" filter chip]
    |
    v
[Sidebar list filters to active trips only]
[Map: completed/planned pins fade to 30% opacity, active pins remain full]
[Trip count updates]
```

### 3.5 Empty State

```
[User has no trips with coordinates]
    |
    v
[Map shows at default zoom (world view)]
[Centered overlay card: compass illustration + "Seu mapa esta vazio" + subtitle + "Planejar primeira expedicao" CTA]
```

### 3.6 Error State

```
[Map tiles fail to load (network error)]
    |
    v
[Fallback: solid dark background (#0D1B2A) + centered message + retry button]
[Sidebar/list still functional (does not depend on map tiles)]
```

---

## 4. Screen Descriptions

### 4.1 Desktop Layout (> 1024px)

**Purpose**: Full atlas experience with simultaneous map exploration and trip list browsing.

**Layout**:
```
+-------------------------------+-------------------+
| MAP (fills remaining width)   | SIDEBAR (320px)   |
|                               |                   |
|   [pin] [pin]                 | [Filter chips]    |
|          [pin]                | [Trip 1]          |
|                               | [Trip 2]          |
|   [Zoom +/-]                  | [Trip 3]          |
|                               | [...]             |
+-------------------------------+-------------------+
```

- Map: fills viewport width minus 320px sidebar, full viewport height minus navbar
- Sidebar: 320px fixed width, right side, scrollable trip list
- Zoom controls: bottom-left of map, stacked + and - buttons

**Sidebar Content**:
1. **Header**: "Meu Atlas" (h1) + trip count badge (e.g., "5 expedicoes")
2. **Filter chips**: horizontal row -- "Todas" | "Ativas" | "Concluidas" | "Planejadas"
3. **Trip list**: scrollable, each item:
   - Cover emoji + destination name (bold) + dates (muted)
   - Mini status indicator: colored dot (gold=completed, blue=active, gray=planned)
   - Click: map centers on pin, popover opens
4. **Active trip highlighted**: current selection has left accent border (primary color)

### 4.2 Tablet Layout (768-1024px)

**Layout**: Same as desktop but sidebar collapses to 280px. Map gets more space. Trip names may truncate with ellipsis.

### 4.3 Mobile Layout (< 768px)

**Purpose**: Full-screen map with overlay controls and bottom sheet for trip details.

**Layout**:
```
+-------------------------------+
| [Filter chips row, top]       |
|                               |
|        MAP (full screen)      |
|                               |
|   [pin]  [pin]                |
|          [pin]                |
|                               |
| [Zoom +/-]   [List toggle]   |
+-------------------------------+
| BOTTOM SHEET (collapsed: peek |
| bar showing trip count)       |
+-------------------------------+
```

- Map: full viewport, behind all overlays
- Filter chips: floating row at top with semi-transparent background
- Zoom controls: bottom-left
- List toggle button: bottom-right, opens bottom sheet to half-height showing trip list
- Bottom sheet: collapsed shows peek bar (trip count). Half-expand shows list. Full-expand on pin tap shows trip details.

### 4.4 Map Pin Visual States

| State | Shape | Color | Animation | Border |
|---|---|---|---|---|
| Completed | Filled circle (10px radius) | Gold (#F59E0B) | None (static) | 2px white ring |
| In-progress (active) | Filled circle (10px radius) | Blue (#3B82F6) | Gentle pulse (2s cycle) | 2px white ring |
| Planned | Outlined circle (10px radius) | Gray (#9BA8B5) | None | 2px dashed |

- `prefers-reduced-motion`: pulse animation disabled for in-progress pins (static blue circle)
- Pins have white ring/border to ensure visibility against any map tile color
- Clustered pins (very close): show count badge (e.g., "3") when zoomed out, expand on zoom in

### 4.5 Pin Popover (Desktop/Tablet)

**Purpose**: Quick trip details on pin click without leaving the map.

**Layout**:
```
+---------------------------+
| [Emoji] Tokyo, Japan      |
| 15 mar - 22 mar 2026      |
| [====----] Fase 3 de 6    |
| [Continuar expedicao ->]   |
+---------------------------+
```

- Positioned above pin (preferred), or below if near top edge
- Max width: 280px
- Dismiss: click outside, Escape key, or click another pin
- Phase progress: mini bar (same as DashboardPhaseProgressBar, read-only)
- CTA: "Continuar expedicao" link (completed trips: "Ver resumo")

### 4.6 Bottom Sheet (Mobile) -- Trip Detail View

**Purpose**: Show trip details after pin tap on mobile.

**Layout**:
- Slides up from bottom to ~40% viewport height
- Same content as popover but larger text and bigger touch targets
- CTA button: full-width, 48px height
- Swipe down to dismiss
- Drag handle at top (4px x 32px rounded bar)

### 4.7 Map Colors (Dark Theme)

| Element | Color |
|---|---|
| Ocean / background | #0D1B2A |
| Land mass fill | #1E3A5F at 40% opacity |
| Land mass border | #334155 (slate-700) |
| Country labels (if shown) | #94A3B8 (slate-400) |
| Grid lines (if shown) | #1E293B at 20% opacity |

### 4.8 Empty State

**Layout**: Map at default world zoom + centered overlay card

**Card content**:
- Compass SVG illustration (inline, no external dependency)
- Title: "Seu mapa esta vazio" (h2)
- Subtitle: "Crie sua primeira expedicao para ver destinos no mapa."
- CTA button: "Planejar primeira expedicao" -> `/expedition/new`

---

## 5. Interaction States Table

### 5.1 Map Interactions

| User Action | Context | Expected Behavior |
|---|---|---|
| Click empty area of map | No popover open | Nothing. |
| Click empty area of map | Popover open | Close popover. |
| Click pin | Any | Open popover/bottom sheet for that trip. Close any previously open popover. |
| Double-click map | Any | Zoom in one level, centered on click point. |
| Scroll wheel on map | Desktop | Zoom in/out. |
| Pinch gesture | Mobile/tablet | Zoom in/out. |
| Drag | Any | Pan the map. |
| Click zoom + button | Any | Zoom in one level. |
| Click zoom - button | Any | Zoom out one level. |

### 5.2 Sidebar Interactions (Desktop)

| User Action | Context | Expected Behavior |
|---|---|---|
| Click trip in list | Any | Map pans to center pin. Popover opens. List item highlighted. |
| Hover trip in list | Any | Corresponding pin on map gets a highlight ring (2px primary color). |
| Click filter chip | Any | Filter list and adjust pin opacity. Active chip: filled bg. Others: outlined. |
| Scroll list | Many trips | Standard scroll. Sticky filter chips at top. |

### 5.3 Popover Interactions (Desktop)

| User Action | Context | Expected Behavior |
|---|---|---|
| Click "Continuar expedicao" | Active trip | Navigate to `/expedition/{tripId}/phase-{currentPhase}`. |
| Click "Ver resumo" | Completed trip | Navigate to `/expedition/{tripId}/summary`. |
| Click outside popover | Popover open | Close popover. |
| Press Escape | Popover open | Close popover. Return focus to pin. |
| Tab inside popover | Popover open | Focus cycles: progress bar (read-only) -> CTA link. |

### 5.4 Bottom Sheet Interactions (Mobile)

| User Action | Context | Expected Behavior |
|---|---|---|
| Tap pin | Any | Bottom sheet slides to detail view (~40% height). |
| Tap "List toggle" button | Sheet collapsed | Sheet expands to 50% with trip list. |
| Swipe down on sheet | Sheet expanded | Collapse to peek bar. |
| Swipe up on peek bar | Sheet collapsed | Expand to 50% with trip list. |
| Tap trip in list | List visible | Sheet switches to trip detail. Map centers on pin. |
| Tap CTA button | Detail visible | Navigate to expedition. |
| Tap scrim / swipe down | Detail visible | Collapse sheet. |

### 5.5 Filter Chips

| User Action | Context | Expected Behavior |
|---|---|---|
| Click "Todas" | Any filter active | Show all trips in list. All pins at full opacity. |
| Click "Ativas" | Any | Show only trips where `currentPhase <= totalPhases` and `completedPhases < totalPhases`. Non-matching pins fade to 30%. |
| Click "Concluidas" | Any | Show only trips where `completedPhases >= totalPhases`. Non-matching pins fade to 30%. |
| Click "Planejadas" | Any | Show only trips with `completedPhases === 0`. Non-matching pins fade to 30%. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] Map is wrapped in a landmark: `role="region"` with `aria-label="Mapa de destinos"`
- [x] Zoom buttons are focusable with `aria-label="Aumentar zoom"` / `"Diminuir zoom"`
- [x] Pins are focusable elements (`role="button"`) within the map, navigable via Tab
- [x] Enter/Space on focused pin opens popover
- [x] Escape closes popover, returns focus to pin
- [x] Sidebar trip list items are focusable, Enter activates
- [x] Filter chips: arrow Left/Right between chips, Enter/Space to select
- [x] Bottom sheet: focus trapped when expanded, Escape to collapse
- [x] Tab order: filter chips -> sidebar/list -> map pins -> zoom controls

### Screen Reader
- [x] Each pin has `aria-label="{destination}, {status}"` (e.g., "Tokyo, em andamento")
- [x] Popover: `aria-live="polite"` announces trip name when opened
- [x] Filter change: `aria-live="polite"` announces "{N} expedicoes" count
- [x] Empty state: properly structured with heading hierarchy
- [x] Map region described: "Mapa interativo mostrando {N} destinos de viagem"
- [x] Non-sighted alternative: the sidebar trip list provides full access to all trip data without needing the visual map

### Color and Contrast
- [x] Gold pins (#F59E0B) with white ring: 3.1:1 against dark map bg (passes 3:1 for graphical objects)
- [x] Blue pins (#3B82F6) with white ring: passes 3:1 against dark map bg
- [x] Gray pins (#9BA8B5) with dashed border: lower contrast but supplemented by dashed style (not color alone)
- [x] No information conveyed by color alone: each status uses unique animation + border style + color
- [x] Popover text: standard card contrast (foreground on card bg)
- [x] Filter chips: active chip uses filled bg with sufficient text contrast

### Motion
- [x] Pin pulse animation: respects `prefers-reduced-motion` (disabled, static circle)
- [x] Bottom sheet slide: respects `prefers-reduced-motion` (instant show/hide)
- [x] Map pan/zoom: CSS transitions disabled under reduced motion
- [x] Pin fade (filter): instant opacity change under reduced motion

### Touch
- [x] Pins: minimum 44x44px touch target (achieved via invisible expanded hit area around the visual 20px circle)
- [x] Zoom buttons: 44x44px each
- [x] Filter chips: minimum 44px height, 8px gap between
- [x] Bottom sheet CTA: 48px height, full-width
- [x] List toggle button (mobile): 44x44px

---

## 7. Content and Copy

### Key Labels and CTAs

| Key | PT-BR | EN |
|---|---|---|
| `atlas.pageTitle` | Meu Atlas | My Atlas |
| `atlas.tripCount` | {count} {count, plural, one {expedicao} other {expedicoes}} | {count} {count, plural, one {expedition} other {expeditions}} |
| `atlas.filterAll` | Todas | All |
| `atlas.filterActive` | Ativas | Active |
| `atlas.filterCompleted` | Concluidas | Completed |
| `atlas.filterPlanned` | Planejadas | Planned |
| `atlas.continueExpedition` | Continuar expedicao | Continue expedition |
| `atlas.viewSummary` | Ver resumo | View summary |
| `atlas.emptyTitle` | Seu mapa esta vazio | Your map is empty |
| `atlas.emptySubtitle` | Crie sua primeira expedicao para ver destinos no mapa. | Create your first expedition to see destinations on the map. |
| `atlas.emptyCta` | Planejar primeira expedicao | Plan first expedition |
| `atlas.zoomIn` | Aumentar zoom | Zoom in |
| `atlas.zoomOut` | Diminuir zoom | Zoom out |
| `atlas.mapLabel` | Mapa interativo de destinos | Interactive destination map |
| `atlas.pinStatus.completed` | concluida | completed |
| `atlas.pinStatus.active` | em andamento | in progress |
| `atlas.pinStatus.planned` | planejada | planned |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Map tiles fail to load | Nao foi possivel carregar o mapa. Verifique sua conexao. | Could not load the map. Check your connection. |
| Trip data fail to load | Nao foi possivel carregar suas expedicoes. | Could not load your expeditions. |

### Tone of Voice
- The Atlas page is the traveler's personal trophy room. Copy should feel warm, exploratory, and rewarding.
- Empty state is encouraging, not discouraging. "Your map is empty" implies it is waiting to be filled.
- Pin status labels are factual and concise -- used for screen readers, not emotional copy.

---

## 8. Constraints

- **Coordinates source**: Trips store `destinationLat` and `destinationLon` from Phase 1 autocomplete selection. Trips without coordinates (pre-autocomplete or manually typed) will not have pins -- they appear only in the sidebar list with a "Sem coordenadas" note.
- **Map library**: Architect decides the mapping library. This spec is technology-agnostic. Requirements: interactive (zoom, pan, click), dark tile support, offline-resilient (graceful fallback if tiles do not load).
- **Pin clustering**: When zoomed out, nearby pins must cluster to avoid overlap. Cluster shows count badge. Zooming in expands cluster into individual pins.
- **Performance**: Map should lazy-load. Do not block page render on map tile loading. Sidebar renders immediately from server data.
- **Dark theme only for map**: Map tiles must be dark-themed to match the app. No light-themed map tiles.
- **No Mapbox in v1**: Per project constraints (MEMORY), Mapbox autocomplete is not used in v1. Map library choice is separate from autocomplete. Architect to decide.

---

## 9. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/meu-atlas-map.html`
- **Scope**: Desktop layout (sidebar + map + popover), mobile layout (bottom sheet), pin states, empty state, filter behavior
- **Notes**: To be created as a follow-up. Map tiles will be simulated with a static dark background in the prototype.

---

## 10. Open Questions

- [ ] **Map library selection**: react-simple-maps (current, limited) vs. Leaflet (open-source, full-featured) vs. Mapbox GL JS (powerful, has cost). **Needs: architect + finops-engineer**
- [ ] **Trips without coordinates**: Show them in sidebar with "Sem coordenadas" and a link to edit Phase 1? Or hide them from the Atlas page entirely? **Needs: product-owner**
- [ ] **Pin clustering algorithm**: At what zoom level do pins cluster? Use a fixed distance threshold or a library-provided clustering? **Needs: architect**
- [ ] **Sidebar position**: This spec puts sidebar on the right. Left sidebar is more conventional for map UIs. **Needs: product-owner preference**

---

## 11. Components to Create / Replace

### New Components

| Component | Replaces | Purpose |
|---|---|---|
| `AtlasMap` | `AtlasHeroMap` | Interactive map with zoom, pan, pin click |
| `AtlasMapPin` | Nothing (new) | Individual pin with status styling |
| `AtlasMapPopover` | Nothing (new) | Trip detail popover anchored to pin |
| `AtlasSidebar` | Nothing (new) | Trip list sidebar with filters |
| `AtlasTripListItem` | Nothing (new) | Trip row in sidebar list |
| `AtlasBottomSheet` | Nothing (new) | Mobile bottom sheet for trip details and list |
| `AtlasFilterChips` | Nothing (new) | Filter chip row (All / Active / Completed / Planned) |

### Components to Deprecate

| Component | Action |
|---|---|
| `AtlasHeroMap` | Replace entirely. Remove from expeditions page. |

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: EmptyState (SVG + title + subtitle + CTA), StatusBadge (adapted for pin context), Toast (error fallback)

**New patterns introduced**: AtlasMapPin (3-state map marker), MapPopover (anchored detail card), AtlasBottomSheet (mobile map detail sheet), AtlasFilterChips (status filter row)

---

> **Spec Status**: Draft
> Ready for: Architect (pending resolution of open questions in Section 10, especially map library selection)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Full audit of AtlasHeroMap + complete interactive map page spec with pin states, sidebar, bottom sheet, and filter behavior. |
