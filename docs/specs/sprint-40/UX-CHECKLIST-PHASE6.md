# UX Visual Fidelity Checklist: Phase 6 Roteiro Detalhado Redesign

**Checklist ID**: UX-CHECKLIST-PHASE6
**Related Spec**: SPEC-UX-PHASE6-REDESIGN
**Stitch Source**: `docs/design/stitch-exports/phase6_roteiro_detalhado/code.html`
**Implementation**: `src/components/features/expedition/Phase6ItineraryV2.tsx` + child components
**Token Reference**: `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md`
**Author**: ux-designer
**Status**: Draft
**Date**: 2026-03-26
**Purpose**: Pre-merge validation gate. Every checkbox must pass before Phase 6 redesign PR is approved.

---

## How to Use This Checklist

1. Open the Stitch prototype in a browser alongside the running implementation
2. Walk through each section comparing visual output at 1440px, 768px, and 375px
3. Use browser DevTools to verify exact token values (colors, spacing, fonts, radius)
4. Mark each item PASS or FAIL. Any FAIL blocks merge until resolved or explicitly waived by UX.

---

## Section 1: Split Layout (60/40)

### Stitch Description

The main content area is a horizontal flex container (`flex-row` on md+). The left column occupies 60% width (`w-3/5`) containing the itinerary timeline. The right column occupies 40% width (`w-2/5`) containing a sticky interactive map panel. The map column is `sticky top-20` with `h-screen` and is hidden on mobile (`hidden md:block`). The overall max-width is `1440px` centered.

### Atlas Components

- `PhaseShell` (wrapper — must support split layout mode)
- New: `ItinerarySplitLayout` or equivalent layout container
- `ItineraryEditor` (left column content)
- New: `ItineraryMapPanel` (right column content)

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Left column bg | `bg-surface` (#f9f9ff in Stitch) | `bg-atlas-surface` (#f9f9f9) |
| Right column bg | `bg-surface-container-low` | `bg-atlas-surface-container-low` (#f3f3f3) |
| Left column padding | `px-8 py-12` (32px horizontal, 48px vertical) | `px-8 py-12` |
| Right column padding | `p-8` (32px all sides) | `p-8` |
| Max content width | `max-w-[1440px]` | `max-w-screen-2xl` (1536px) or custom 1440px |
| Min height | `min-h-screen` on flex container | `min-h-screen` |

### Pass/Fail

- [ ] Layout renders as `flex-row` on screens >= 768px (md breakpoint)
- [ ] Left column is exactly 60% width (`w-3/5`) on desktop
- [ ] Right column is exactly 40% width (`w-2/5`) on desktop
- [ ] Right column is sticky with `top-20` (80px from top, below navbar)
- [ ] Right column has `h-screen` so map fills available viewport
- [ ] Right column is completely hidden on mobile (< 768px)
- [ ] On mobile, layout stacks to single column (left column = full width)
- [ ] Max content width is 1440px, centered with `mx-auto`
- [ ] Left column bg uses `atlas-surface` token (not hardcoded hex)
- [ ] Right column bg uses `atlas-surface-container-low` token (not hardcoded hex)
- [ ] No raw Tailwind color classes (slate, gray, etc.) — only `atlas-*` tokens

---

## Section 2: Day Selector Pills

### Stitch Description

A horizontal scrollable row of pill-shaped buttons. Each pill shows "Dia N" (bold, 14px) and the date below (12px). The active pill has `bg-primary-container` (#fe932c) with white/on-primary text and `shadow-lg`. Inactive pills have `bg-surface-container-lowest` (#fff) with `text-on-surface-variant`. Pills are `min-w-[100px] h-20` (80px tall) with `rounded-xl` (12px). The row has `overflow-x-auto` with hidden scrollbar (`.hide-scrollbar`). Gap between pills is `gap-3` (12px).

### Atlas Components

- New: `DaySelectorPills` (horizontally scrollable pill strip)
- Each pill: `DayPill` button

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Active pill bg | `bg-primary-container` | `bg-atlas-secondary-container` (#fe932c) |
| Active pill text | `text-on-primary-container` | `text-atlas-primary` (#040d1b) per UX-PARECER contrast fix |
| Active pill shadow | `shadow-lg` | `shadow-atlas-lg` |
| Inactive pill bg | `bg-surface-container-lowest` | `bg-atlas-surface-container-lowest` (#fff) |
| Inactive pill text | `text-on-surface-variant` | `text-atlas-on-surface-variant` (#45474c) |
| Inactive hover | `hover:bg-surface-container-low` | `hover:bg-atlas-surface-container-low` |
| Border radius | `rounded-xl` | `rounded-xl` (12px = `atlas-radius-lg`) |
| Day label font | 14px bold | `text-sm font-bold font-atlas-body` |
| Date label font | 12px, reduced opacity on inactive | `text-xs font-atlas-body` |
| Gap | `gap-3` (12px) | `gap-3` |
| Min width per pill | 100px | `min-w-[100px]` |
| Height | 80px | `h-20` |

### Pass/Fail

- [ ] Pills render in a horizontal scrollable row
- [ ] Scrollbar is visually hidden (CSS `scrollbar-width: none` + webkit pseudo)
- [ ] Active pill uses `atlas-secondary-container` background
- [ ] Active pill text has contrast ratio >= 4.5:1 (use `atlas-primary` #040d1b, NOT white)
- [ ] Inactive pills use `atlas-surface-container-lowest` background
- [ ] Hover state on inactive pills transitions to `atlas-surface-container-low`
- [ ] Each pill shows day number (bold) and date (smaller text below)
- [ ] Pill dimensions are minimum 100px wide x 80px tall
- [ ] Border radius is 12px (`rounded-xl`)
- [ ] Active pill has `shadow-lg` elevation
- [ ] Pills are keyboard navigable (Tab or arrow keys within group)
- [ ] Active pill has `aria-selected="true"` or equivalent ARIA
- [ ] The pill strip uses `role="tablist"` and each pill `role="tab"`
- [ ] Transition between active states uses `atlas-transition-base` (200ms ease)
- [ ] Touch targets are >= 44x44px (80px height satisfies this)
- [ ] On mobile, pills still scroll horizontally with momentum/inertia

---

## Section 3: Day Header

### Stitch Description

Below the day selector, a heading reads "Dia 1 -- Chegada e Alfama" styled as `text-2xl font-headline font-bold` with a `border-l-4 border-primary-container` left accent and `pl-6` padding. Color is `text-on-surface`.

### Atlas Components

- Part of `ItineraryDayCard` header or new `DayHeader` sub-component

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Text size | `text-2xl` (24px) | `text-2xl` = `atlas-text-h3` range |
| Font family | `font-headline` | `font-atlas-headline` (Plus Jakarta Sans) |
| Font weight | `font-bold` (700) | `font-bold` |
| Text color | `text-on-surface` | `text-atlas-on-surface` (#1a1c1c) |
| Left border width | `border-l-4` (4px) | `border-l-4` |
| Left border color | `border-primary-container` | `border-atlas-secondary-container` (#fe932c) |
| Left padding | `pl-6` (24px) | `pl-6` |
| Bottom margin | `mb-4` (16px) | `mb-4` |

### Pass/Fail

- [ ] Day header uses Plus Jakarta Sans (`font-atlas-headline`)
- [ ] Text is 24px bold
- [ ] Left accent border is 4px wide, using `atlas-secondary-container` (#fe932c)
- [ ] Left padding is 24px (`pl-6`)
- [ ] Text color uses `atlas-on-surface` token
- [ ] Day header updates when switching day pills (content matches selected day)
- [ ] Header is an `<h2>` element for proper document outline
- [ ] Separator character between day number and title is an em-dash (not hyphen)

---

## Section 4: Activity Timeline (Vertical Line + Category Dots)

### Stitch Description

A vertical timeline runs down the left side of the activity list. The line is `absolute left-[7px] top-24 bottom-0 w-0.5 bg-surface-container-high` (hidden on mobile: `hidden md:block`). Each activity entry has a colored dot (`w-4 h-4 rounded-full`) positioned at the left with a `ring-4 ring-surface` outer ring. Dot colors vary by category:

- Logistics: `bg-primary-container` (#fe932c)
- Culture: `bg-tertiary` (teal #266861 in Stitch)
- Food/Gastronomy: `bg-orange-400`

Entries are laid out with `flex gap-8` where the dot column is fixed and the card column is `flex-1`.

### Atlas Components

- New: `ActivityTimeline` container (manages vertical line + dot placement)
- Dot: `TimelineDot` (colored by activity category)

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Vertical line bg | `bg-surface-container-high` | `bg-atlas-surface-container-high` (#e8e8e8) |
| Vertical line width | `w-0.5` (2px) | `w-0.5` |
| Dot size | `w-4 h-4` (16px) | `w-4 h-4` |
| Dot border radius | `rounded-full` | `rounded-full` |
| Dot ring | `ring-4 ring-surface` | `ring-4 ring-atlas-surface` |
| Dot: logistics | `bg-primary-container` | `bg-atlas-secondary-container` (#fe932c) |
| Dot: culture | `bg-tertiary` | `bg-atlas-on-tertiary-container` (#1c9a8e) or custom category token |
| Dot: food | `bg-orange-400` | `bg-atlas-secondary-container` or `bg-atlas-secondary-fixed-dim` |
| Entry gap | `gap-8` (32px) | `gap-8` |
| Entry spacing (vertical) | `gap-8` on parent flex-col | `gap-8` |

### Pass/Fail

- [ ] Vertical line is visible on desktop (>= 768px)
- [ ] Vertical line is hidden on mobile (< 768px)
- [ ] Vertical line is 2px wide (`w-0.5`)
- [ ] Vertical line color uses `atlas-surface-container-high` token
- [ ] Category dots are 16px diameter, perfectly round
- [ ] Dots have a 4px ring in `atlas-surface` color (creates white halo effect)
- [ ] Dot colors are mapped to activity categories using atlas tokens (no raw colors)
- [ ] Dots are positioned relative with `z-10` (above the vertical line)
- [ ] Gap between dot column and card column is 32px (`gap-8`)
- [ ] Vertical spacing between entries is 32px (`gap-8`)
- [ ] Dots are purely decorative (`aria-hidden="true"`) — no interaction
- [ ] Timeline layout does not break when there is a single activity
- [ ] Timeline line extends from first to last entry (not beyond)

---

## Section 5: Activity Cards

### Stitch Description

Each card is a white container with `bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow`. Cultural/food cards have an additional `border-l-8` accent in the category color. Card content hierarchy:

1. **Top row**: Time (`text-sm font-bold`, colored by category) + Category badge (pill: `px-3 py-1 rounded-full text-xs font-bold/medium`)
2. **Title**: `text-xl font-bold text-on-surface`
3. **Description**: `text-on-surface-variant leading-relaxed`
4. **Metadata row**: Duration (clock icon + "2h") and Cost (payment icon + "Gratis" or "R$ 80-120") in `text-xs font-bold uppercase tracking-wider text-on-surface-variant/70`
5. **Optional tip box**: `bg-primary-fixed text-on-primary-fixed-variant px-4 py-2 rounded-lg text-sm italic` with lightbulb icon

### Atlas Components

- `ActivityCard` (replaces current `ActivityItem`)
- `CategoryBadge` (pill badge)
- `ActivityTip` (optional AI tip box)
- `MetadataRow` (duration + cost)

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Card bg | `bg-surface-container-lowest` | `bg-atlas-surface-container-lowest` (#fff) |
| Card padding | `p-6` (24px) | `p-6` |
| Card radius | `rounded-xl` (12px) | `rounded-xl` = `atlas-radius-lg` |
| Card shadow default | `shadow-sm` | `shadow-atlas-sm` |
| Card shadow hover | `hover:shadow-md` | `hover:shadow-atlas-md` |
| Shadow transition | `transition-shadow` | `transition-shadow duration-200` |
| Left accent border (culture) | `border-l-8 border-tertiary-container` | `border-l-8 border-atlas-on-tertiary-container` or category token |
| Left accent border (food) | `border-l-8 border-primary-container` | `border-l-8 border-atlas-secondary-container` |
| Time text | `text-sm font-bold` + category color | `text-sm font-bold font-atlas-body` |
| Title | `text-xl font-bold text-on-surface` | `text-xl font-bold font-atlas-headline text-atlas-on-surface` |
| Description | `text-on-surface-variant leading-relaxed` | `text-atlas-on-surface-variant leading-relaxed font-atlas-body` |
| Metadata text | `text-xs font-bold uppercase tracking-wider text-on-surface-variant/70` | `text-xs font-bold uppercase tracking-wider text-atlas-on-surface-variant/70` |
| Badge bg (culture) | `bg-tertiary-fixed` | `bg-atlas-tertiary-fixed` (#89f5e7) |
| Badge text (culture) | `text-on-tertiary-fixed-variant` | `text-atlas-on-tertiary-fixed-variant` (#005049) |
| Badge bg (food) | `bg-primary-fixed` | `bg-atlas-secondary-fixed` (#ffdcc3) |
| Badge text (food) | `text-on-primary-fixed-variant` | `text-atlas-on-secondary-fixed-variant` (#6e3900) |
| Badge radius | `rounded-full` | `rounded-full` |
| Badge padding | `px-3 py-1` | `px-3 py-1` |
| Tip box bg | `bg-primary-fixed` | `bg-atlas-secondary-fixed` (#ffdcc3) |
| Tip box text | `text-on-primary-fixed-variant` | `text-atlas-on-secondary-fixed-variant` (#6e3900) |
| Tip box radius | `rounded-lg` (8px) | `rounded-lg` = `atlas-radius-md` |
| Tip box padding | `px-4 py-2` | `px-4 py-2` |
| Tip box font | `text-sm italic` | `text-sm italic font-atlas-body` |

### Pass/Fail

- [ ] Card background is `atlas-surface-container-lowest` (white)
- [ ] Card padding is 24px (`p-6`)
- [ ] Card border radius is 12px (`rounded-xl`)
- [ ] Card has `shadow-sm` at rest, `shadow-md` on hover
- [ ] Shadow transition is smooth (200ms ease)
- [ ] Cards with culture/food categories have an 8px left accent border
- [ ] Left border color matches the category (teal for culture, amber for food)
- [ ] Logistics cards have NO left accent border (plain card)
- [ ] Time label is bold, colored by category
- [ ] Category badge is pill-shaped (`rounded-full`)
- [ ] Category badge uses category-specific bg and text tokens
- [ ] Title is `text-xl` (20px), bold, Plus Jakarta Sans or Work Sans bold
- [ ] Description is `text-atlas-on-surface-variant`, `leading-relaxed`
- [ ] Duration and cost metadata use uppercase, letter-spaced, 70% opacity style
- [ ] Metadata icons (clock, payment) are 14px (`text-sm`)
- [ ] Tip box (when present) uses `atlas-secondary-fixed` bg
- [ ] Tip box has lightbulb icon + italic text
- [ ] Tip box border radius is 8px (`rounded-lg`)
- [ ] Card content order matches: time+badge, title, description, metadata, tip
- [ ] Cards are `<article>` elements for semantics
- [ ] Activity title is an `<h3>` within each card
- [ ] No raw Tailwind color classes in card implementation

---

## Section 6: Day Summary

### Stitch Description

A summary card appears at the bottom of each day's timeline. It uses `bg-surface-container p-8 rounded-xl`. Left side has an icon container (`p-4 bg-surface-container-lowest rounded-xl text-primary-container`) with an analytics icon, plus a title "Resumo do Dia N" (`text-xl font-headline font-bold`) and subtitle. Right side shows 3 stat columns: Activities count, Duration, and Average Cost. Each stat has a large number (`text-2xl font-headline font-extrabold`) over a label (`text-xs uppercase font-bold text-on-surface-variant opacity-60`). Stats are spaced with `gap-10` (40px).

### Atlas Components

- New: `DaySummaryCard`
- Stat items: `SummaryStat` (number + label pair)

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Card bg | `bg-surface-container` | `bg-atlas-surface-container` (#eeeeee) |
| Card padding | `p-8` (32px) | `p-8` |
| Card radius | `rounded-xl` (12px) | `rounded-xl` = `atlas-radius-lg` |
| Icon container bg | `bg-surface-container-lowest` | `bg-atlas-surface-container-lowest` (#fff) |
| Icon container radius | `rounded-xl` | `rounded-xl` |
| Icon container padding | `p-4` (16px) | `p-4` |
| Icon color | `text-primary-container` | `text-atlas-secondary-container` (#fe932c) |
| Icon size | `text-3xl` (30px) | Material icon 30px or equivalent SVG |
| Title font | `text-xl font-headline font-bold` | `text-xl font-atlas-headline font-bold` |
| Title color | `text-on-surface` | `text-atlas-on-surface` |
| Subtitle color | `text-on-surface-variant` | `text-atlas-on-surface-variant` |
| Stat number | `text-2xl font-headline font-extrabold` | `text-2xl font-atlas-headline font-extrabold` |
| Stat label | `text-xs uppercase font-bold opacity-60` | `text-xs uppercase font-bold text-atlas-on-surface-variant/60` |
| Stat gap | `gap-10` (40px) | `gap-10` |
| Layout gap (icon to text) | `gap-6` (24px) | `gap-6` |

### Pass/Fail

- [ ] Summary card appears at the bottom of each day's activities
- [ ] Card background uses `atlas-surface-container` token
- [ ] Card padding is 32px (`p-8`)
- [ ] Card border radius is 12px (`rounded-xl`)
- [ ] Layout is horizontal: icon+title on left, stats on right (desktop)
- [ ] Icon is inside a white rounded container
- [ ] Icon color is `atlas-secondary-container` (amber/orange)
- [ ] Title uses Plus Jakarta Sans, bold
- [ ] Stat numbers are `text-2xl`, extra-bold, Plus Jakarta Sans
- [ ] Stat labels are 12px, uppercase, bold, 60% opacity
- [ ] Three stats shown: activities count, total duration, average cost
- [ ] Stats are spaced 40px apart (`gap-10`)
- [ ] On mobile, summary card stacks vertically (icon+title on top, stats below)
- [ ] Stats on mobile use a 3-column grid or horizontal scroll
- [ ] Summary card has `role="region"` and `aria-label` describing the summary

---

## Section 7: Map Panel

### Stitch Description

A sticky right-side panel (`w-2/5 h-screen sticky top-20`), hidden on mobile. Contains a map container with `rounded-2xl overflow-hidden shadow-xl border border-white/20`. The map has a blue-tinted background (`bg-[#dbe4f4]`). Markers are colored circles (`w-8 h-8 rounded-full border-4 border-white shadow-lg`) with category icons inside. Colors: hotel=`bg-primary-container`, museum=`bg-tertiary`, restaurant=`bg-primary-container`. A glass-morphism overlay at top-left shows "Mapa interativo" label. Bottom-center has zoom controls in a glass-morphism container with `+`/`-`/location buttons.

### Atlas Components

- New: `ItineraryMapPanel` (Leaflet map integration)
- `MapMarker` (category-colored pins)
- `MapControls` (zoom in, zoom out, center)
- `MapLabel` (glass-morphism "Mapa interativo" overlay)

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Panel bg | `bg-surface-container-low` | `bg-atlas-surface-container-low` |
| Map container radius | `rounded-2xl` (16px) | `rounded-2xl` = `atlas-radius-xl` |
| Map container shadow | `shadow-xl` | `shadow-atlas-xl` |
| Map container border | `border border-white/20` | `border border-white/20` |
| Marker size | `w-8 h-8` (32px) | `w-8 h-8` |
| Marker border | `border-4 border-white` | `border-4 border-white` |
| Marker shadow | `shadow-lg` | `shadow-atlas-lg` |
| Glass overlay bg | `rgba(255,255,255,0.7)` + `backdrop-filter: blur(12px)` | Custom glass-morphism utility |
| Glass overlay border | `border border-white/40` | `border border-white/40` |
| Glass overlay radius | `rounded-lg` (overlay label), `rounded-xl` (controls) | Respective radius tokens |
| Control button bg | `bg-white` | `bg-white` |
| Control button hover | `hover:bg-surface-container-low` | `hover:bg-atlas-surface-container-low` |
| Control button padding | `p-3` (12px) | `p-3` |
| Label text | `font-bold text-on-surface` | `font-bold text-atlas-on-surface` |

### Pass/Fail

- [ ] Map panel is sticky, positioned below navbar
- [ ] Map panel fills viewport height (`h-screen`)
- [ ] Map panel has 32px padding (`p-8`)
- [ ] Map container has 16px border radius (`rounded-2xl`)
- [ ] Map container has `shadow-xl` elevation
- [ ] Map renders using Leaflet + OSM tiles (per SPEC-UX-024 decision)
- [ ] Activity markers are plotted on the map for the selected day
- [ ] Marker circles are 32px, with category-specific colors
- [ ] Markers have 4px white border and shadow
- [ ] Markers show a category icon inside (hotel, museum, restaurant, etc.)
- [ ] Glass-morphism "Mapa interativo" label appears at top-left
- [ ] Glass effect: `background: rgba(255,255,255,0.7)` + `backdrop-filter: blur(12px)`
- [ ] Zoom controls appear centered at the bottom of the map
- [ ] Zoom controls have glass-morphism background
- [ ] Control buttons have hover state
- [ ] Map panel is hidden entirely on mobile (< 768px)
- [ ] Map is purely visual — does not block screen reader flow (`aria-hidden` or role annotation)
- [ ] Map markers update when the user switches day pills
- [ ] If no coordinates available for activities, map shows destination center

---

## Section 8: Footer Navigation

### Stitch Description

A fixed bottom bar (`fixed bottom-0 left-0 right-0 z-50`) with `bg-white shadow-[0_-8px_24px_rgba(4,13,27,0.04)]`. Content is max `1440px`, centered. Three elements in a `flex justify-between`:

1. **Left**: "Voltar para Guia" button with back arrow icon — ghost style, `text-on-surface-variant font-bold`
2. **Center**: Progress indicator showing "Progresso Total" label (`text-xs font-bold uppercase tracking-widest`) with 8 small colored bars (completed=`bg-tertiary-fixed-dim`, active=`bg-primary-container`, locked=`bg-surface-container-high`) each `w-6 h-1 rounded-full`
3. **Right**: "Ver Sumario" button with forward arrow — dark filled (`bg-on-surface text-white`) with hover to `bg-primary-container text-on-primary-container`

### Atlas Components

- `WizardFooter` (existing — must be adapted to match this 3-column layout)
- Mini progress bar: inline (may reuse `MiniProgressBar` pattern)

### Token Mapping

| Property | Stitch Value | Atlas Token |
|---|---|---|
| Footer bg | `bg-white` | `bg-white` or `bg-atlas-surface-container-lowest` |
| Footer shadow | `0 -8px 24px rgba(4,13,27,0.04)` | Custom upward shadow token |
| Footer padding | `px-8 py-4` | `px-8 py-4` |
| Back button text | `text-on-surface-variant font-bold` | `text-atlas-on-surface-variant font-bold` |
| Back button hover | `hover:text-primary-container` | `hover:text-atlas-secondary-container` |
| Progress label | `text-xs font-bold uppercase tracking-widest` | `text-xs font-bold uppercase tracking-widest` |
| Progress label color | `text-on-surface-variant/60` | `text-atlas-on-surface-variant/60` |
| Progress bar segment (completed) | `bg-tertiary-fixed-dim` | `bg-atlas-tertiary-fixed-dim` (#6bd8cb) |
| Progress bar segment (active) | `bg-primary-container` | `bg-atlas-secondary-container` (#fe932c) |
| Progress bar segment (locked) | `bg-surface-container-high` | `bg-atlas-surface-container-high` (#e8e8e8) |
| Progress segment size | `w-6 h-1` (24x4px) | `w-6 h-1` |
| Progress segment radius | `rounded-full` | `rounded-full` |
| Progress gap | `gap-1` (4px) | `gap-1` |
| Primary CTA bg | `bg-on-surface` (#121c2a in Stitch) | `bg-atlas-primary` (#040d1b) |
| Primary CTA text | `text-white` | `text-atlas-on-primary` (#fff) |
| Primary CTA hover bg | `hover:bg-primary-container` | `hover:bg-atlas-secondary-container` |
| Primary CTA hover text | `hover:text-on-primary-container` | `hover:text-atlas-primary` (per contrast rule) |
| Primary CTA padding | `px-8 py-3` | `px-8 py-3` |
| Primary CTA radius | `rounded-lg` (8px) | `rounded-lg` = `atlas-radius-md` |
| Primary CTA font | `font-bold` | `font-bold font-atlas-body` |

### Pass/Fail

- [ ] Footer is fixed at the bottom of the viewport
- [ ] Footer has upward shadow (not downward)
- [ ] Footer background is white
- [ ] Footer content is max 1440px, centered
- [ ] Three-column layout: back button | progress | forward CTA
- [ ] Back button is ghost style with left arrow icon
- [ ] Back button text is "Voltar para Guia" (or localized equivalent)
- [ ] Back button hover changes text color to amber
- [ ] Center shows "Progresso Total" label above mini progress segments
- [ ] Progress segments: 8 bars showing correct phase completion states
- [ ] Completed phases use `atlas-tertiary-fixed-dim` (teal)
- [ ] Active phase uses `atlas-secondary-container` (amber)
- [ ] Locked phases use `atlas-surface-container-high` (gray)
- [ ] Primary CTA reads "Ver Sumario" (or localized equivalent) per phase context
- [ ] Primary CTA has dark bg (`atlas-primary`) with white text
- [ ] Primary CTA hover transitions to amber bg with dark text
- [ ] Primary CTA has right arrow icon
- [ ] CTA transition uses `custom-spring` timing (cubic-bezier(0.34, 1.56, 0.64, 1))
- [ ] Footer z-index is 50 (`z-50`) to overlay content
- [ ] Footer does not obscure bottom content — content has sufficient bottom padding
- [ ] On mobile, center progress indicator may be hidden or simplified
- [ ] All footer buttons have min 44px touch targets
- [ ] Back button is keyboard accessible (visible focus ring)
- [ ] Primary CTA is keyboard accessible (visible focus ring)

---

## Section 9: Responsive Behavior

### 9.1 Desktop (1440px)

- [ ] 60/40 split layout is visible
- [ ] Map panel is sticky and visible
- [ ] Day pills are all visible without scrolling (up to ~12 days)
- [ ] Activity cards show full descriptions
- [ ] Summary card is horizontal layout (icon+title left, stats right)
- [ ] Footer shows all 3 elements (back, progress, CTA)
- [ ] Content respects max-width 1440px
- [ ] Typography scale matches Stitch exactly (h1=48px, h2=24px, body=16px)

### 9.2 Tablet (768px)

- [ ] 60/40 split layout activates at `md` breakpoint (768px)
- [ ] Map panel appears but may be narrower
- [ ] Day pills scroll horizontally if more than ~6 pills
- [ ] Activity cards reduce padding if needed
- [ ] Footer remains 3-column
- [ ] Summary card may start to stack

### 9.3 Mobile (375px)

- [ ] Layout is single column (no map panel)
- [ ] Map panel is completely hidden (`hidden md:block`)
- [ ] Day pills are horizontally scrollable with momentum
- [ ] Day pills maintain minimum 100px width and 80px height
- [ ] Timeline vertical line is hidden (`hidden md:block`)
- [ ] Activity cards still show category dots (inline or adjusted position)
- [ ] Activity card padding reduces to `p-4` (16px)
- [ ] Day header is full width with left accent border
- [ ] Summary card stacks vertically
- [ ] Footer remains fixed at bottom
- [ ] Footer center progress may be hidden on very small screens
- [ ] All touch targets remain >= 44x44px
- [ ] No horizontal overflow or scroll (except day pills row)
- [ ] Text remains readable (no text smaller than 12px)
- [ ] Content has sufficient bottom padding to clear fixed footer (~80px)

---

## Section 10: Cross-Cutting Concerns

### Typography Consistency

- [ ] All headlines use `font-atlas-headline` (Plus Jakarta Sans)
- [ ] All body text uses `font-atlas-body` (Work Sans)
- [ ] No instances of `font-semibold` where Stitch uses `font-bold`
- [ ] No usage of `Inter` or system font fallback-only for visible text
- [ ] Font weights match Stitch: 400 (body), 500 (medium), 600 (semibold labels), 700 (bold), 800 (extrabold headlines)

### Color Token Compliance

- [ ] Zero raw Tailwind color classes (no `slate-*`, `gray-*`, `amber-*`, `green-*`, `orange-*`)
- [ ] All colors reference `atlas-*` design tokens
- [ ] CTA buttons never use white text on amber bg (contrast violation per UX-PARECER)
- [ ] Stitch `primary-container` (#fe932c) maps to `atlas-secondary-container` (not `atlas-primary-container`)
- [ ] Stitch `primary` (#914d00) maps to `atlas-secondary` (not `atlas-primary`)
- [ ] Stitch `tertiary` (#266861) maps to appropriate atlas tertiary token

### Accessibility

- [ ] All interactive elements have visible focus indicators (2px `atlas-focus-ring`)
- [ ] Tab order follows visual order: day pills -> day content -> activities -> summary -> footer
- [ ] Activity cards have meaningful `aria-label` or heading structure
- [ ] Day pill group uses `role="tablist"` with `role="tab"` children
- [ ] Selected day content uses `role="tabpanel"`
- [ ] Color is not the only differentiator for categories (icons + text labels also present)
- [ ] All images/icons have `aria-hidden="true"` or meaningful `alt` text
- [ ] Map panel is excluded from tab order or properly annotated for AT
- [ ] `prefers-reduced-motion: reduce` removes all animations (shadow transitions, hover transforms)
- [ ] Error states (if generation fails) are announced via `role="alert"`
- [ ] Loading/generating state has `role="status"` with `aria-live="polite"`

### Animations and Transitions

- [ ] Card hover shadow: `transition-shadow duration-200` (atlas-transition-base)
- [ ] Day pill selection: smooth background transition (200ms)
- [ ] Footer CTA hover: `custom-spring` cubic-bezier as defined in Stitch
- [ ] All animations respect `prefers-reduced-motion`
- [ ] No layout shift on day change (content area maintains consistent width)

### States Not in Stitch (Must Be Designed)

- [ ] **Loading state**: Skeleton cards while itinerary generates (existing in Phase6ItineraryV2)
- [ ] **Empty state**: No itinerary generated yet — CTA to generate (existing in Phase6ItineraryV2)
- [ ] **Error state**: Generation failed — error message with retry action
- [ ] **Edit mode**: Activity editing inline (drag-and-drop, add, delete)
- [ ] **Regenerate confirmation**: Warning before overwriting existing itinerary
- [ ] **Single-day trip**: No day pills needed — skip directly to timeline
- [ ] **Many days (>12)**: Pills must scroll gracefully, possibly with edge fade gradient

---

## Migration Delta: Current vs. Target

The following table summarizes the gap between the current implementation and the Stitch target.

| Aspect | Current (Phase6ItineraryV2) | Target (Stitch) | Gap |
|---|---|---|---|
| Layout | Single column, centered | 60/40 split with sticky map | **Major** |
| Day selection | None (all days in vertical list) | Horizontal pill selector | **Major** |
| Timeline | None | Vertical line + category dots | **Major** |
| Activity display | `ItineraryDayCard` + `ActivityItem` (basic list) | Rich cards with category borders, tips, metadata | **Major** |
| Day summary | None | Summary card with stats | **New component** |
| Map | None | Sticky Leaflet map panel | **New component** |
| Footer | `WizardFooter` (2-button) | 3-column with mini progress bar | **Redesign** |
| Typography | Mix of atlas + legacy tokens | Full atlas-headline/body system | **Token migration** |
| Colors | Mix of atlas + raw Tailwind | Pure atlas-* tokens | **Token migration** |
| Category system | `TYPE_COLORS` with raw classes | Category-specific tokens and accent borders | **Redesign** |

---

> This checklist must be completed and signed off by the UX designer before any Phase 6 redesign PR is approved for merge. Partial failures may be accepted only with documented waiver and follow-up ticket.

> Status: DRAFT — Ready for implementation team review
