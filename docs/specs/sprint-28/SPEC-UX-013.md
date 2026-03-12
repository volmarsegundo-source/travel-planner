---
spec_id: SPEC-UX-013
title: "Navigation Restructure"
type: ux
status: Draft
version: "1.0.0"
author: ux-designer
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-UX-008
  - SPEC-UX-011
---

# SPEC-UX-013: Navigation Restructure — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (continuation of SPEC-UX-008)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to navigate between three distinct areas of the application — their trip list, their personal atlas (gamification profile and achievements), and a geographic map of their journeys — with clear, predictable navigation that works on both mobile and desktop.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | The map tab inspires future trips; the atlas tab celebrates past ones |
| `@leisure-family` | Expeditions tab is the primary hub; family members can quickly find the active trip |
| `@business-traveler` | Three distinct tabs mean faster muscle-memory navigation to the trip list |
| `@bleisure` | Atlas tab helps track achievements across both business and leisure expeditions |
| `@group-organizer` | Expeditions tab provides focused list management; map helps visualize group destinations |

## 3. Relationship to SPEC-UX-008

SPEC-UX-008 (Sprint 27) proposed splitting "Meu Atlas" into "Expeditions" and "Meu Atlas" (map). This spec (SPEC-UX-013) refines that proposal and adds the third navigation item ("Meu Atlas" as gamification profile), restructures the map as a separate tab, and defines the mobile bottom navigation bar pattern.

Key changes from SPEC-UX-008:
- **Three tabs** instead of two: "Expeditions" + "Meu Atlas" (profile/achievements) + "Mapa" (geographic map)
- **Mobile bottom navigation** replaces reliance on hamburger menu for primary navigation
- **Desktop sidebar** option evaluated and rejected in favor of top navigation tabs (see rationale below)
- **Breadcrumb updates** for all three sections

### Why Top Tabs, Not Sidebar

A sidebar was considered but rejected because:
1. The app has only 3 primary destinations — a sidebar is overkill and wastes horizontal space
2. Expedition phase wizards already use the full viewport width; a sidebar would compress them
3. Travel apps (Google Travel, TripIt, Kayak) consistently use top/bottom navigation, not sidebars
4. Mobile-first: the bottom nav on mobile maps naturally to top tabs on desktop

## 4. User Flow

### Primary Navigation Structure

```
[Header]
    |
    +-- Logo (click) --> /expeditions (default landing)
    |
    +-- Tab: Expeditions --> /expeditions
    |     Active when: pathname starts with /expedition
    |
    +-- Tab: Meu Atlas --> /atlas
    |     Active when: pathname === /atlas
    |
    +-- Tab: Mapa --> /map
    |     Active when: pathname === /map
    |
    +-- [GamificationIndicator] (SPEC-UX-011)
    |
    +-- [Utility controls: Theme, Language, UserMenu]
```

### Route Mapping

| Old Route | New Route | Behavior |
|---|---|---|
| `/dashboard` | `/expeditions` | 301 redirect (permanent) |
| `/dashboard` (map bg) | `/map` | Map elevated to own page |
| `/profile` | `/atlas` | Profile + gamification combined |
| `/profile` (settings) | `/atlas#settings` | Settings section within atlas page |

### Tab Navigation Flow

```
[Traveler on /expeditions]
    |
    +-- Clicks "Meu Atlas" tab --> /atlas loads
    |     |
    |     v
    |   [Profile overview, badges, points history, level progress]
    |
    +-- Clicks "Mapa" tab --> /map loads
    |     |
    |     v
    |   [Interactive world map with expedition pins]
    |
    +-- Clicks "Expeditions" tab --> /expeditions loads
          |
          v
        [Trip card list, create expedition CTA]
```

### Mobile Bottom Navigation

```
[Any authenticated page]
    |
    v
[Bottom navigation bar — always visible, 3 items]
    |
    +-- [Compass icon] Expeditions
    +-- [Star/trophy icon] Meu Atlas
    +-- [Globe icon] Mapa
```

## 5. Screen Descriptions

### Component: Top Navigation (Desktop >= 768px)

**Location**: Inside `AuthenticatedNavbar`, replacing the current two-link navigation.

**Layout**:
- Three tab-style links, left-aligned after the logo
- Each tab: icon (16px) + text label (14px, medium weight)
- Active tab: `text-atlas-gold`, `border-b-2 border-atlas-gold` (underline indicator)
- Inactive tab: `text-foreground`, hover: `text-foreground bg-accent/10`
- Gap between tabs: 8px

**Tab definitions**:

| Tab | Icon | Label (PT) | Label (EN) | Route | Active Condition |
|---|---|---|---|---|---|
| Expeditions | Compass icon | Expeditions | Expeditions | /expeditions | pathname starts with /expedition |
| Meu Atlas | Star/trophy icon | Meu Atlas | My Atlas | /atlas | pathname === /atlas |
| Mapa | Globe icon | Mapa | Map | /map | pathname === /map |

**After tabs**: GamificationIndicator (SPEC-UX-011), then utility controls (Theme, Language, UserMenu).

### Component: Bottom Navigation (Mobile < 768px)

**Purpose**: Persistent bottom navigation bar for one-tap access to the three primary sections.

**Layout**:
- Fixed to bottom of viewport (`position: fixed`, `bottom: 0`)
- Full-width, height: 56px (plus safe area inset for notched phones)
- Background: `bg-background`, top border: `border-border`
- Three items, equally spaced (flex, justify-around)
- Each item: icon (24px) stacked above text label (10px)
- Active item: `text-atlas-gold`, icon filled variant
- Inactive item: `text-muted-foreground`, icon outline variant

**Safe area**: `padding-bottom: env(safe-area-inset-bottom)` for phones with home indicators (iPhone X+).

**Z-index**: Above page content but below modals/dialogs/popovers.

**Interaction**:
- Tap navigates immediately (standard link behavior)
- Active item has subtle scale animation on tap (1.0 -> 1.05 -> 1.0, 150ms). Reduced motion: none.
- No ripple effect or elaborate animations

**Hamburger menu**: With bottom nav handling primary navigation, the hamburger menu on mobile now contains ONLY utility items: ThemeToggle, LanguageSwitcher, UserMenu. It becomes a "settings" overflow menu, triggered by a gear or dots icon instead of hamburger lines.

### Component: Mobile Header (< 768px, updated)

With primary navigation moved to the bottom bar, the mobile header simplifies:

```
+----------------------------------------------------+
| [Logo]    [GamificationIndicator]    [Settings ...]  |
+----------------------------------------------------+
```

- Logo: left-aligned, links to /expeditions
- GamificationIndicator: center or right of logo (compact, points only — per SPEC-UX-011)
- Settings overflow: replaces hamburger. Single icon button. Opens the existing mobile menu panel containing Theme, Language, UserMenu.

### Screen: Expeditions Page (`/expeditions`)

Identical to SPEC-UX-008 section "Screen 1: Expeditions Page". No changes. Reuses existing dashboard components minus the AtlasHeroMap background.

### Screen: Meu Atlas Page (`/atlas`)

**Purpose**: The traveler's gamification profile — their achievements, badges, points history, and level progress.

**Layout**:
- Container: `max-w-4xl`, centered
- Content stacked:
  1. Breadcrumb: Home > Meu Atlas
  2. Profile header: Avatar + name + rank badge + total points
  3. Level progress section: Current rank, progress bar to next rank, rank description
  4. Badges grid: Earned badges (highlighted) + locked badges (muted/outlined)
  5. Points history: Recent point transactions (table or list, 10 most recent)
  6. Settings section (anchor: `#settings`): Link to account settings, preferences

**Empty state** (new user, no points):
- Profile header with default avatar and "Explorador Iniciante" rank
- Progress bar at 0%
- All badges locked
- Empty points history with encouraging message: "Complete fases da sua expedicao para ganhar pontos!"

**Loading state**: Skeleton for profile header + progress bar + 6 badge placeholders + 3 list item skeletons.

### Screen: Map Page (`/map`)

Identical to SPEC-UX-008 section "Screen 2: Atlas Map Page". Route changed from `/atlas` to `/map` to avoid collision with the profile page now at `/atlas`. All pin behaviors, legend, empty state, and error state from SPEC-UX-008 apply.

### Dark Theme

- Bottom nav: `bg-background` adapts. `border-border` adapts. Icon/text colors use theme tokens.
- Top tabs: active underline `border-atlas-gold` works on dark. Inactive text `text-foreground` adapts.
- All page content uses theme-aware tokens as specified in individual page descriptions.

### Wireframe Description

```
Desktop (>= 768px):
+------------------------------------------------------------------------------------+
| [Logo]  [Expeditions] [Meu Atlas] [Mapa]  |  [1.250 pts]  |  [Theme] [Lang] [User] |
+------------------------------------------------------------------------------------+
                                               ^ Active tab has gold underline

Mobile (< 768px):
+------------------------------------------+
| [Logo]           1.250        [Settings]  |
+------------------------------------------+
|                                          |
|           (Page content here)            |
|                                          |
+------------------------------------------+
| [Compass]    [Star]      [Globe]         |
| Expeditions  Meu Atlas   Mapa            |
+------------------------------------------+
                ^ Bottom nav, always visible
```

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Bottom navigation bar (fixed). Header simplified (logo + points + settings). Primary nav via bottom bar. Utility items in settings overflow. |
| Tablet (768-1024px) | Top tab navigation in header. No bottom bar. Standard hamburger for overflow if needed. |
| Desktop (> 1024px) | Top tab navigation in header. All utility controls visible inline. No bottom bar. |

## 6. Interaction Patterns

- **Tab switching**: Standard navigation (full page load or Next.js client-side navigation). No tab-switch animation.
- **Bottom nav tap**: Navigate immediately. Active item icon scales briefly (150ms). Reduced motion: instant.
- **Settings overflow (mobile)**: Opens the existing mobile menu panel slide-down. Escape closes. Standard behavior from current hamburger menu.
- **Active state**: `aria-current="page"` on the active tab/nav item.

### Motion Tokens

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Bottom nav active tap | 150ms | ease-out | none (instant) |
| Settings menu slide | 200ms | ease-out | instant |

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] Desktop tabs: all three are focusable links via Tab
  - [x] `aria-current="page"` on active tab
  - [x] Bottom nav (mobile): all three items focusable via Tab. Tab order: left to right.
  - [x] Bottom nav does not interfere with page content tabbing (it is after page content in DOM order, or uses `tabindex` appropriately)
  - [x] Settings overflow: Escape closes, focus returns to trigger button
  - [x] Focus indicator visible on all navigation items (2px outline, 2px offset)
- **Screen Reader**:
  - [x] Desktop tabs: `<nav aria-label="Navegacao principal">` wrapping the tab links
  - [x] Bottom nav: `<nav aria-label="Navegacao principal">` (same landmark, only one rendered per breakpoint)
  - [x] Each nav item: meaningful text label (not icon-only for screen readers)
  - [x] Bottom nav icons: `aria-hidden="true"` (text labels provide the accessible name)
  - [x] Settings overflow button: `aria-label="Configuracoes"`, `aria-expanded` state
- **Color & Contrast**:
  - [x] Active tab gold text on header/nav background >= 4.5:1
  - [x] Inactive tab text on header/nav background >= 4.5:1
  - [x] Bottom nav: active gold icon/text on background >= 4.5:1. Inactive muted on background >= 4.5:1
  - [x] Active indicator (underline on desktop, filled icon on mobile) is not color-only: underline is a shape cue, filled vs outlined icon is a shape cue
- **Touch**:
  - [x] Desktop tabs: at least 44px height within the 56px header (padding included)
  - [x] Bottom nav items: each item at least 44x44px tap target (the full third of the bar width ensures this)
  - [x] Settings overflow button: 44x44px minimum
  - [x] Spacing between bottom nav items: items are separated by flex distribution (no overlapping targets)

## 8. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `navigation.expeditions` | Expeditions | Expeditions |
| `navigation.myAtlas` | Meu Atlas | My Atlas |
| `navigation.map` | Mapa | Map |
| `navigation.settings` | Configuracoes | Settings |
| `atlas.profileTitle` | Meu Perfil Atlas | My Atlas Profile |
| `atlas.rankProgress` | Progresso para {nextRank} | Progress to {nextRank} |
| `atlas.badgesTitle` | Insignias | Badges |
| `atlas.badgeLocked` | Bloqueada | Locked |
| `atlas.pointsHistory` | Historico de Pontos | Points History |
| `atlas.noPoints` | Complete fases da sua expedicao para ganhar pontos! | Complete expedition phases to earn points! |
| `atlas.settingsLink` | Configuracoes da conta | Account settings |

### Tone of Voice

- Navigation labels: Short, action-oriented. Maximum 2 words.
- Atlas page: Celebratory for achievements, encouraging for locked badges.
- Map page: Inspirational (per SPEC-UX-008).

## 9. Constraints

- The `/dashboard` route must 301 redirect to `/expeditions`. Existing bookmarks and internal links referencing `/dashboard` must not break.
- The `/profile` route must redirect to `/atlas`. Account settings page (if separate from profile) should also redirect or be folded into `/atlas#settings`.
- Bottom navigation on mobile must account for `safe-area-inset-bottom` on notched phones.
- Bottom nav must not overlap with any fixed-position elements (sticky headers, floating action buttons, cookie banners).
- The hamburger icon on mobile changes to a settings/gear icon since primary nav moves to bottom bar.
- Three `<nav>` landmarks would confuse screen readers. Only ONE `<nav aria-label="Navegacao principal">` should exist per page — either the top tabs (desktop) or the bottom bar (mobile), rendered conditionally.
- Page content on mobile must have bottom padding equal to the bottom nav height (56px + safe area) to prevent content being hidden behind the nav.

## 10. Prototype

- [ ] Prototype required: Yes (new navigation pattern — critical to validate before implementation)
- **Location**: `docs/prototypes/navigation-restructure.html`
- **Scope**: Desktop header with 3 tabs, mobile header + bottom nav, tab switching simulation, settings overflow
- **Status**: Deferred — spec and wireframes are sufficient for architect planning

## 11. Open Questions

- [ ] Should "Meu Atlas" (profile/gamification) be at route `/atlas` or `/profile` with the map at `/map`? **Recommendation**: `/atlas` for profile (aligns with app identity "Atlas"), `/map` for the geographic map. The word "Atlas" in the app name refers to the traveler's personal journey record, not just a map.
- [ ] Should the bottom nav be visible on expedition phase wizard pages, or hidden to maximize content area? **Recommendation**: Visible. The bottom nav provides a safety net for navigation. If the traveler gets lost in a wizard, they can always tap Expeditions to return to the list. Hiding it would trap them in the wizard.
- [ ] Should we keep the `/profile` route for backward compatibility or immediately redirect? **Recommendation**: 301 redirect `/profile` -> `/atlas` for at least 2 sprints, then remove.
- [ ] What icon for the settings overflow on mobile? **Recommendation**: Three vertical dots (more/kebab menu) — universally understood as "more options". Not a gear icon (which implies system settings, not user menu).

## 12. Patterns Used

- **AuthenticatedNavbar** (redesigned with 3 tabs + GamificationIndicator)
- **Breadcrumb** (updated paths for new routes)
- **EmptyState** (reused on Atlas page for new users)
- **MapPinPopover, MapLegend, MapBottomSheet** (from SPEC-UX-008, used on /map page)
- **New pattern: BottomNavBar** — mobile fixed-bottom navigation with 3 items
- **New pattern: SettingsOverflow** — mobile overflow menu for utility controls (replaces hamburger)

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft — refined from SPEC-UX-008, adds bottom nav + atlas profile page |
