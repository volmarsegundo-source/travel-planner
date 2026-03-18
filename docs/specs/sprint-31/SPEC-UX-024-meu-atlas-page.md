# SPEC-UX-024: Meu Atlas Page Design -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (implements deferred SPEC-UX-021 from Sprint 30)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

See SPEC-UX-021 (Sprint 30) Section 0 for the full audit of `AtlasHeroMap.tsx`. This spec supersedes SPEC-UX-021 with implementation-ready decisions and resolved open questions.

### 0.1 Key Decisions Since SPEC-UX-021

| Open Question (SPEC-UX-021) | Decision |
|---|---|
| Map library | Leaflet + OpenStreetMap (open-source, zero cost, architect-approved) |
| Sidebar position | Right sidebar (desktop) -- matches reading flow LTR, map is primary content |
| Trips without coordinates | Shown in sidebar with "Sem coordenadas" note, no pin on map |
| Pin clustering | Library-provided clustering (Leaflet.markercluster or equivalent) |

---

## 1. Traveler Goal

Visualize all travel destinations on an interactive world map, see the status of each expedition at a glance, explore a gamification profile summary, and quickly navigate to any trip to continue planning or review.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Visual inspiration -- seeing pins on a world map motivates future travel. Emotional reward for completed trips. Gamification section reinforces progress. |
| `@leisure-family` | Overview of all family trips. Quick access to any expedition without scrolling through a list. |
| `@business-traveler` | Fast visual scan of upcoming destinations. Click pin to jump directly to current phase. |
| `@bleisure` | See both business and extended trips on the same map. Plan extensions by seeing nearby destinations. |
| `@group-organizer` | Bird's-eye view of all group expeditions across different destinations. |

## 3. User Flow

### 3.1 Happy Path -- Desktop

```
/atlas (dedicated page, nav link "Meu Atlas")
    |
    v
[Page loads: full-width map (left) + sidebar (right, 320px)]
    |--- Sidebar: gamification profile section + filter chips + trip list
    |--- Map: dark tiles + pins for all trips with coordinates
    |
    v
[User clicks pin on map]
    |
    v
[Popup card appears anchored to pin: emoji, destination, dates, phase progress, "Continuar" CTA]
    |
    v
[User clicks "Continuar expedicao"] --> [Navigate to /expedition/{tripId}/phase-{current}]
```

### 3.2 Happy Path -- Mobile (< 768px)

```
/atlas
    |
    v
[Full-screen dark map, filter chips overlaid at top, trip count badge]
    |
    v
[User taps pin on map]
    |
    v
[Bottom sheet slides up (~40% height): emoji, destination, dates, progress, "Continuar" button]
    |
    v
[User taps "Continuar expedicao"] --> [Navigate to expedition]
```

### 3.3 Sidebar / List Navigation

```
[User clicks trip in sidebar list (desktop)]
    |
    v
[Map pans and zooms to center on that trip's pin]
[Popup card opens with trip details]
[List item highlighted with primary left border]
```

### 3.4 Filter Path

```
[User selects "Ativas" filter chip]
    |
    v
[Sidebar list filters to active trips only]
[Map: non-matching pins fade to 30% opacity, matching pins remain full]
[Trip count updates]
```

### 3.5 Gamification Profile Section (Sidebar Top)

```
[Sidebar top section, always visible]:
    +------------------------------+
    | [Avatar] UserName            |
    | Level 3 -- Explorador        |
    | [========----] 720 / 1000 pts|
    | [Badge] [Badge] [Badge] +2   |
    +------------------------------+
```

### 3.6 Empty State

```
[User has no trips with coordinates]
    |
    v
[Map shows at default zoom (world view)]
[Centered overlay card: compass SVG + "Seu mapa esta vazio" + subtitle + CTA]
```

### 3.7 Error State

```
[Map tiles fail to load]
    |
    v
[Fallback: solid dark background (#0D1B2A) + centered message + retry button]
[Sidebar/list still functional]
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
|   [pin] [pin]                 | [Gamification]    |
|          [pin]                | [Filter chips]    |
|                               | [Trip 1]          |
|   [Zoom +/-]                  | [Trip 2]          |
|                               | [Trip 3]          |
+-------------------------------+-------------------+
```

- Map: fills viewport width minus 320px sidebar, full viewport height minus navbar (calc(100vh - 56px))
- Sidebar: 320px fixed width, right side, scrollable content
- Zoom controls: bottom-left of map, stacked + and - buttons (44x44px each)

### 4.2 Sidebar Content (Desktop)

**Content hierarchy (top to bottom)**:

1. **Gamification profile section**:
   - User avatar (40px circle) + name (bold) + level name (muted)
   - Horizontal progress bar: current points / next level threshold
   - Badge row: last 3 earned badges as small icons (24px), +N overflow count if more
   - Background: subtle card bg (#1E293B), border-radius 12px, padding 16px
   - No click action (display-only, per SPEC-UX-027 principle)

2. **Header**: "Meu Atlas" (h1, visually hidden -- page title is in the breadcrumb/nav) + trip count badge (e.g., "5 expedicoes")

3. **Filter chips**: horizontal row -- "Todas" | "Ativas" | "Concluidas" | "Planejadas"
   - Active chip: filled primary background (#E8621A), white text
   - Inactive chip: outlined, muted text, card background
   - Chip height: 36px desktop, 44px mobile
   - Gap: 8px

4. **Trip list**: scrollable, each item:
   - Cover emoji (24px) + destination name (bold, truncate 1 line) + dates (muted, 12px)
   - Mini status dot: yellow (#F59E0B) = completed, blue (#3B82F6) = in-progress, gray (#9BA8B5) = planned
   - Click: map centers on pin, popup opens
   - Active/selected item: left accent border 3px solid primary
   - Trips without coordinates: shown with "Sem coordenadas" in italic muted, no pin interaction

### 4.3 Tablet Layout (768-1024px)

Same as desktop but sidebar collapses to 280px. Trip names truncate with ellipsis. Gamification section: avatar + points only (badges hidden).

### 4.4 Mobile Layout (< 768px)

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

- Map: full viewport (calc(100vh - 56px)), behind all overlays
- Filter chips: floating row at top, semi-transparent background (bg-background/80 backdrop-blur)
- Zoom controls: bottom-left, 44x44px buttons
- List toggle button: bottom-right, 44x44px, opens bottom sheet to half-height
- Bottom sheet states:
  - Collapsed: peek bar with drag handle + trip count text
  - Half (50%): trip list view (scrollable)
  - Detail (~40%): single trip detail (on pin tap)
- Gamification section: not shown on mobile map (visible on profile page instead)

### 4.5 Map Pin Visual States

| State | Shape | Color | Animation | Border |
|---|---|---|---|---|
| Completed | Filled circle (10px radius) | Yellow (#F59E0B) | None (static) | 2px white ring |
| In-progress (active) | Filled circle (10px radius) | Blue (#3B82F6) | Gentle pulse (2s cycle, scale 1.0-1.15) | 2px white ring |
| Planned | Outlined circle (10px radius) | Gray (#9BA8B5) | None | 2px dashed white |

- `prefers-reduced-motion`: pulse animation disabled (static blue circle)
- White ring/border ensures visibility against any map tile color
- Clustered pins (close together at current zoom): show count badge (circle with number). Click cluster: zoom in to expand.
- Hit area: 44x44px invisible expanded touch target around the visual 20px circle

### 4.6 Pin Popup Card (Desktop/Tablet)

**Purpose**: Quick trip details on pin click without leaving the map.

**Layout**:
```
+---------------------------+
| [Emoji] Tokyo, Japan      |
| 15 mar - 22 mar 2026      |
| [====----] Fase 3 de 6    |
| [Continuar expedicao ->]  |
+---------------------------+
```

- Positioned above pin (preferred), flips below if near top edge
- Max width: 280px
- Background: card bg (#1E293B), border 1px #334155, border-radius 8px, shadow-lg
- Dismiss: click outside, Escape key, click another pin
- Phase progress: mini bar (read-only, same palette as DashboardPhaseProgressBar)
- CTA: "Continuar expedicao" for active/planned trips, "Ver resumo" for completed trips
- CTA style: text link with arrow, primary color, 44px touch target

### 4.7 Bottom Sheet (Mobile) -- Trip Detail View

**Purpose**: Show trip details after pin tap on mobile.

- Slides up from bottom to ~40% viewport height
- Same content as popup but larger text (16px base) and bigger touch targets
- CTA button: full-width, 48px height, primary variant
- Swipe down to dismiss
- Drag handle at top: 4px x 32px rounded bar, centered, muted color
- Background: card bg, border-radius 16px 16px 0 0 (top corners only)
- Scrim: bg-black/30 behind sheet

### 4.8 Map Tiles (Dark Theme)

| Element | Color |
|---|---|
| Ocean / background | #0D1B2A |
| Land mass fill | #1E3A5F at 40% opacity |
| Land mass border | #334155 (slate-700) |
| Country labels (if shown) | #94A3B8 (slate-400) |

- Tile provider: dark-themed OSM tiles (CartoDB Dark Matter or equivalent)
- If tiles fail to load: solid #0D1B2A background + error message + retry button
- Sidebar/list remains functional independent of map tile loading

### 4.9 Empty State

**Layout**: Map at default world zoom + centered overlay card

**Card content**:
- Compass SVG illustration (inline, no external dependency)
- Title: "Seu mapa esta vazio" (h2)
- Subtitle: "Crie sua primeira expedicao para ver destinos no mapa."
- CTA button: "Planejar primeira expedicao" -> `/expedition/new`
- Card: bg-background, max-width 360px, padding 32px, border-radius 16px, centered on map

### 4.10 Loading State

- Map container: dark background (#0D1B2A) shown immediately (no flash)
- Sidebar: skeleton for gamification section (avatar circle + 2 text lines + progress bar rectangle) + 3 skeleton trip list items
- Pins: appear after trip data loads (no skeleton for pins)
- Tiles: load progressively (Leaflet default behavior -- gray tiles fill in)

---

## 5. Interaction States Table

### 5.1 Map Interactions

| User Action | Context | Expected Behavior |
|---|---|---|
| Click empty area | No popup open | Nothing. |
| Click empty area | Popup open | Close popup. |
| Click pin | Any | Open popup/bottom sheet for that trip. Close any previous popup. |
| Double-click map | Any | Zoom in one level, centered on click point. |
| Scroll wheel on map | Desktop | Zoom in/out. |
| Pinch gesture | Mobile/tablet | Zoom in/out. |
| Drag | Any | Pan the map. |
| Click zoom + button | Any | Zoom in one level. |
| Click zoom - button | Any | Zoom out one level. |
| Click cluster badge | Any | Zoom in to expand cluster into individual pins. |

### 5.2 Sidebar Interactions (Desktop)

| User Action | Context | Expected Behavior |
|---|---|---|
| Click trip in list | Any | Map pans to center pin. Popup opens. List item highlighted (left border). |
| Hover trip in list | Any | Corresponding pin on map gets highlight ring (2px primary). |
| Click trip without coordinates | List | No map pan. Tooltip: "Sem coordenadas -- edite a Fase 1 para adicionar." |
| Click filter chip | Any | Filter list + adjust pin opacity. Active chip: filled bg. Others: outlined. |
| Scroll list | Many trips | Standard overflow scroll. Filter chips + gamification section stay sticky at top. |

### 5.3 Popup Interactions (Desktop/Tablet)

| User Action | Context | Expected Behavior |
|---|---|---|
| Click "Continuar expedicao" | Active/planned trip | Navigate to `/expedition/{tripId}/phase-{currentPhase}`. |
| Click "Ver resumo" | Completed trip | Navigate to `/expedition/{tripId}/summary`. |
| Click outside popup | Popup open | Close popup. |
| Press Escape | Popup open | Close popup. Return focus to pin. |
| Tab inside popup | Popup open | Focus cycles: progress bar (read-only, skip) -> CTA link. |

### 5.4 Bottom Sheet Interactions (Mobile)

| User Action | Context | Expected Behavior |
|---|---|---|
| Tap pin | Any | Bottom sheet slides to detail view (~40% height). |
| Tap list toggle button | Sheet collapsed | Sheet expands to 50% with trip list. |
| Swipe down on sheet | Sheet expanded | Collapse to peek bar. |
| Swipe up on peek bar | Sheet collapsed | Expand to 50% with trip list. |
| Tap trip in list | List visible | Sheet switches to trip detail. Map centers on pin. |
| Tap CTA button | Detail visible | Navigate to expedition. |
| Tap scrim / swipe down | Detail visible | Collapse sheet. |

### 5.5 Filter Chips

| User Action | Context | Expected Behavior |
|---|---|---|
| Click "Todas" | Any filter active | Show all trips. All pins at full opacity. |
| Click "Ativas" | Any | Active trips only. Non-matching pins fade to 30% opacity. |
| Click "Concluidas" | Any | Completed trips only. Non-matching pins fade to 30%. |
| Click "Planejadas" | Any | Planned trips only (0 completed phases). Non-matching pins fade to 30%. |

### 5.6 Gamification Section

| User Action | Context | Expected Behavior |
|---|---|---|
| View section | Always | Display-only. No click, no hover effect, no cursor pointer. |
| Badge overflow "+N" | > 3 badges | Shows count. No click action. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] Map wrapped in `role="region"` with `aria-label="Mapa interativo de destinos"`
- [x] Zoom buttons focusable with `aria-label="Aumentar zoom"` / `"Diminuir zoom"`
- [x] Pins are focusable (`role="button"`) within the map, navigable via Tab
- [x] Enter/Space on focused pin opens popup
- [x] Escape closes popup, returns focus to pin
- [x] Sidebar trip list items focusable, Enter activates (centers map + opens popup)
- [x] Filter chips: `role="radiogroup"`, arrow Left/Right between, Enter/Space to select
- [x] Bottom sheet: focus trapped when expanded, Escape to collapse
- [x] Tab order: filter chips -> gamification (read-only, skipped) -> trip list -> map pins -> zoom controls
- [x] Focus indicator: 2px solid ring (primary color), 2px offset

### Screen Reader
- [x] Each pin: `aria-label="{destination}, {status}"` (e.g., "Tokyo, em andamento")
- [x] Popup: `aria-live="polite"` announces trip name when opened
- [x] Filter change: `aria-live="polite"` announces "{N} expedicoes" count
- [x] Empty state: heading hierarchy (h2)
- [x] Map region described: `aria-roledescription="Mapa interativo mostrando {N} destinos de viagem"`
- [x] Non-sighted alternative: sidebar trip list provides full access without visual map
- [x] Gamification section: `aria-label="Seu progresso"`, content readable by SR
- [x] Trips without coordinates in list: announced as "{destination}, sem coordenadas no mapa"

### Color and Contrast
- [x] Yellow pins (#F59E0B) with white ring: 3.1:1 against dark map bg (passes 3:1 for graphical objects)
- [x] Blue pins (#3B82F6) with white ring: passes 3:1 against dark map bg
- [x] Gray pins (#9BA8B5) with dashed border: supplemented by dashed style (not color alone)
- [x] No information conveyed by color alone: each status uses unique animation + border style + color
- [x] Popup text: standard card contrast (#F1F5F9 on #1E293B = 11.5:1)
- [x] Filter chip active: white on #E8621A = 3.2:1 (passes large text 3:1, chip text is 14px bold -- verify)

### Motion
- [x] Pin pulse: respects `prefers-reduced-motion` (disabled, static circle)
- [x] Bottom sheet slide: respects `prefers-reduced-motion` (instant show/hide)
- [x] Map pan/zoom CSS transitions: disabled under reduced motion
- [x] Pin fade (filter): instant opacity change under reduced motion

### Touch
- [x] Pins: 44x44px touch target (invisible expanded hit area)
- [x] Zoom buttons: 44x44px each
- [x] Filter chips: 44px height on mobile, 8px gap
- [x] Bottom sheet CTA: 48px height, full-width
- [x] List toggle button: 44x44px
- [x] Sidebar trip items: min 44px height

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
| `atlas.noCoordinates` | Sem coordenadas | No coordinates |
| `atlas.noCoordinatesHint` | Sem coordenadas -- edite a Fase 1 para adicionar. | No coordinates -- edit Phase 1 to add. |
| `atlas.pinStatus.completed` | concluida | completed |
| `atlas.pinStatus.active` | em andamento | in progress |
| `atlas.pinStatus.planned` | planejada | planned |
| `atlas.progress` | Seu progresso | Your progress |
| `atlas.mapError` | Nao foi possivel carregar o mapa. Verifique sua conexao. | Could not load the map. Check your connection. |
| `atlas.retry` | Tentar novamente | Try again |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Map tiles fail | Nao foi possivel carregar o mapa. Verifique sua conexao. | Could not load the map. Check your connection. |
| Trip data fail | Nao foi possivel carregar suas expedicoes. | Could not load your expeditions. |

### Tone of Voice
- The Atlas page is the traveler's personal trophy room. Copy is warm, exploratory, rewarding.
- Empty state is encouraging: "Your map is empty" implies it is waiting to be filled.
- Pin status labels are factual and concise (for screen readers, not emotional copy).

---

## 8. Constraints

- **Coordinates source**: Trips store `destinationLat` and `destinationLon` from Phase 1. Trips without coordinates appear only in sidebar list.
- **Map library**: Leaflet + OpenStreetMap (dark tiles). Architect confirms library choice. Requirements: interactive (zoom, pan, click), dark tile support, graceful fallback.
- **Pin clustering**: When zoomed out, nearby pins cluster. Cluster shows count badge. Zoom in expands cluster.
- **Performance**: Map lazy-loads. Sidebar renders immediately from server data. Do not block page render on tile loading.
- **Dark theme only for map**: Map tiles must be dark-themed. No light map tiles.
- **Max 20 trips**: Per existing business rule.
- **Gamification data**: Available from `getProgressSummary` (already used in AppShellLayout).

---

## 9. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/meu-atlas-page.html`
- **Scope**: Desktop layout (sidebar + map + popup), mobile layout (bottom sheet), pin states, empty state, gamification section, filter behavior
- **Notes**: Map tiles simulated with static dark background. Pins as positioned circles.

---

## 10. Open Questions

- [ ] **Gamification section data depth**: Should the sidebar show all badges earned or only last 3? Currently spec says last 3 + overflow count. **Needs: product-owner**
- [ ] **Map initial zoom**: Should the map auto-zoom to fit all pins on first load, or default to world view? Auto-fit is better UX for users with trips. **Needs: architect (feasibility with Leaflet)**

---

## 11. Components to Create / Replace

### New Components

| Component | Replaces | Purpose |
|---|---|---|
| `AtlasMap` | `AtlasHeroMap` | Interactive Leaflet map with zoom, pan, pin click |
| `AtlasMapPin` | Nothing (new) | Individual pin marker with 3 status styles |
| `AtlasMapPopup` | Nothing (new) | Trip detail popup anchored to pin |
| `AtlasSidebar` | Nothing (new) | Trip list sidebar with gamification + filters |
| `AtlasTripListItem` | Nothing (new) | Trip row in sidebar list |
| `AtlasBottomSheet` | Nothing (new) | Mobile bottom sheet for trip details and list |
| `AtlasFilterChips` | Nothing (new) | Filter chip row (All / Active / Completed / Planned) |
| `AtlasGamificationCard` | Nothing (new) | Gamification profile summary (display-only) |

### Components to Deprecate

| Component | Action |
|---|---|
| `AtlasHeroMap` | Replace entirely. Remove from expeditions page. Delete after migration. |

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: EmptyState (SVG + title + subtitle + CTA), StatusBadge (adapted for pin), Toast (error fallback)

**New patterns introduced**: AtlasMapPin (3-state marker), AtlasMapPopup (anchored detail card), AtlasBottomSheet (mobile map sheet), AtlasFilterChips (status filter row), AtlasGamificationCard (display-only profile summary)

---

> **Spec Status**: Draft
> Ready for: Architect (map library integration details, auto-zoom feasibility)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Supersedes SPEC-UX-021 with resolved decisions (Leaflet, right sidebar, gamification section) and full interaction states table. |
