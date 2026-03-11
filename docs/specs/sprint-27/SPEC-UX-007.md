# SPEC-UX-007: Gamification Header — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: NEW-001
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to see their gamification progress (points, rank, and progress toward next rank) at all times while using the app, reinforcing a sense of achievement and motivating continued exploration.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Gamification creates a sense of companionship and personal achievement in solo planning |
| `@leisure-family` | Points visible at all times motivate completing planning steps for the family trip |
| `@business-traveler` | Compact display ensures it does not interfere with efficient task completion |
| `@bleisure` | Rank progression encourages exploring beyond just the business portion of the trip |
| `@group-organizer` | Visible score creates social proof when sharing screens with group members |

## 3. User Flow

### Display Logic

The gamification header widget appears on ALL authenticated pages. It is a read-only display element — it does not require interaction to fulfill its primary purpose (awareness), but it offers an expandable detail view.

```
[Any authenticated page loads]
    |
    v
[Header renders with GamificationWidget]
    |
    +-- Desktop: shows points + rank badge + mini progress bar (always visible)
    |
    +-- Mobile: shows points number only (compact)
                  |
                  +-- Tap --> [Expand to show rank + progress bar]
                  |
                  +-- Tap again / scroll / navigate --> [Collapse back to points only]
```

### Real-Time Updates

When the traveler completes a phase or earns points:
1. The phase wizard shows PointsAnimation (existing behavior)
2. After PointsAnimation dismisses, the header widget updates to reflect new totals
3. If rank changed, the rank badge animates briefly (subtle color pulse, 600ms)

The header widget does NOT poll for updates. It receives updated data through:
- Page navigation (server component re-renders layout with fresh data)
- Client-side state propagation after phase completion actions return new totals

## 4. Screen Descriptions

### Component: GamificationWidget (new)

**Purpose**: Persistent, compact display of the traveler's gamification status in the header bar.

**Location**: Inside `AuthenticatedNavbar`, positioned between the navigation links and the utility controls (ThemeToggle, LanguageSwitcher, UserMenu).

#### Desktop Layout (>= 768px)

A horizontal strip containing three elements, left to right:

1. **Points counter**: Gold-colored number + compass emoji (reuses PointsDisplay with `size="sm"`)
2. **Rank badge**: Pill badge with emoji + rank name (reuses RankBadge with `size="sm"`)
3. **Mini progress bar**: Thin horizontal bar (4px height, 64px width) showing progress toward next rank
   - Filled portion: `--color-accent` (#2DB8A0)
   - Unfilled portion: `--color-bg-subtle` (#EEF2F7)
   - Rounded ends (2px radius)

Total width: approximately 200-240px. Height: fits within the 56px (h-14) header.

Visual hierarchy: Points number is most prominent (gold, semibold). Rank badge is secondary. Progress bar is tertiary (thin, subtle).

#### Mobile Layout (< 768px)

Collapsed state (default):
- Only the points number is visible: gold number + compass emoji
- Total width: approximately 60-80px
- Tappable area: minimum 44x44px

Expanded state (after tap):
- A small card slides down below the header (or appears as a popover below the widget)
- Shows: Rank badge (full size "sm"), points number, progress bar (full width of card), text "X pontos para [Next Rank]"
- Card: `bg-popover`, `border-border`, `shadow-md`, `rounded-lg`, 8px padding
- Dismisses on: tap outside, scroll, navigation, Escape key

#### Rank Progress Calculation

The rank system is event-driven (rank promotions happen at specific phase completions, not at point thresholds). However, for the progress bar we need a visual indicator. The progress bar shows:

- **If rank can advance via the next expedition phase**: progress = completedPhases / totalPhases of the current expedition
- **If no active expedition**: progress bar is empty (0%) with hint "Inicie uma expedicao"
- **If at maximum rank (ambassador)**: progress bar is full (100%), gold color, with text "Rank maximo atingido"

The architect will determine the exact data source for this. The UX only requires: a 0-100 percentage value and the name of the next rank (or null if max).

### Dark Theme

- Points number: `text-atlas-gold` (already works in dark)
- Rank badge: existing dark-compatible colors from RankBadge component
- Progress bar filled: `bg-accent` (teal, works in both themes)
- Progress bar unfilled: `bg-muted` (adapts to theme)
- Mobile expanded card: `bg-popover`, `border-border` (theme-aware)

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Points number only. Tap to expand card with full details. Widget in hamburger menu area OR before hamburger button. |
| Tablet (768-1024px) | Points + rank badge visible. Progress bar visible if space allows (hide if header crowded). |
| Desktop (> 1024px) | Full widget: points + rank badge + progress bar. All inline in header. |

## 5. Interaction Patterns

- **Mobile tap to expand**: The expanded card appears via a slide-down animation (200ms ease-out). Respects `prefers-reduced-motion` (instant appear if reduced).
- **Mobile dismiss**: Fade out 150ms. With reduced motion: instant.
- **Rank change pulse**: When rank updates, the rank badge background pulses once (opacity 1 -> 0.5 -> 1 over 600ms). Reduced motion: no pulse, just update value.
- **Points update**: Number counts up from old value to new value over 400ms (like a counter animation). Reduced motion: instant update.
- **No loading state needed**: Data comes from the server layout render. If data is stale (unlikely), it refreshes on next navigation.

### Motion Tokens

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Mobile card appear | 200ms | ease-out | instant |
| Mobile card dismiss | 150ms | ease-in | instant |
| Rank pulse | 600ms | ease-in-out | none (instant swap) |
| Points counter | 400ms | ease-out | instant |

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] Widget is NOT a tab stop on desktop (read-only display, no interaction needed)
  - [x] On mobile, the collapsed widget is a button with `role="button"` and is a tab stop
  - [x] Mobile expanded card is dismissable with Escape
  - [x] Mobile expanded card does NOT trap focus (it is supplementary info, not a dialog)
- **Screen Reader**:
  - [x] Desktop widget: single `aria-label` summarizing all info, e.g., "1.250 pontos, rank Explorador, 40% para Navegador"
  - [x] Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Progresso para proximo rank"`
  - [x] Mobile button: `aria-label="Sua pontuacao: 1.250 pontos. Toque para ver detalhes"`
  - [x] Mobile expanded card: `aria-live="polite"` announces content when expanded
  - [x] Points counter animation: screen readers see final value immediately (no intermediate values announced)
- **Color & Contrast**:
  - [x] Gold text on header background >= 4.5:1 (atlas-gold on background/95 — verify in both themes)
  - [x] Progress bar: filled vs unfilled distinguishable without color (filled portion has higher opacity)
  - [x] Rank badge colors already verified in RankBadge component
- **Touch**:
  - [x] Mobile collapsed widget tap target >= 44x44px
  - [x] Mobile expanded card: all text readable, no interactive elements requiring precise touch

## 7. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `gamification.headerLabel` | {points} pontos - {rank} | {points} points - {rank} |
| `gamification.progressToNext` | {remaining} pontos para {nextRank} | {remaining} points to {nextRank} |
| `gamification.maxRank` | Rank maximo atingido | Maximum rank achieved |
| `gamification.noExpedition` | Inicie uma expedicao | Start an expedition |
| `gamification.tapForDetails` | Toque para ver detalhes | Tap for details |
| `gamification.progressLabel` | Progresso para proximo rank | Progress to next rank |

### Tone of Voice

- Celebratory but not intrusive. The widget is a quiet motivator, not a distraction.
- Numbers should use locale-formatted separators (1.250 in PT, 1,250 in EN).

## 8. Constraints

- Header height is fixed at h-14 (56px). The widget must fit within this.
- AuthenticatedNavbar currently has: Logo | nav links | ThemeToggle | LanguageSwitcher | UserMenu
- The widget goes between nav links and ThemeToggle to maintain grouping (nav on left, utilities on right, gamification as the bridge).
- On mobile, the widget appears in the header bar (not inside the hamburger menu) because it is a persistent motivator.
- Data source: `PointsEngine.getProgressSummary(userId)` is already called in the dashboard page. For the header, it needs to be called in the AppShellLayout and passed down to AuthenticatedNavbar.

## 9. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/gamification-header.html`
- **Scope**: Desktop full view, mobile collapsed, mobile expanded, dark theme variants
- **Status**: Deferred to implementation sprint — spec is sufficient for architect

## 10. Open Questions

- [ ] Should the progress bar represent expedition progress or a points-based threshold to next rank? The current rank system is phase-completion-driven (not points-based), so a pure percentage may be misleading. **Recommendation**: Show expedition phase progress (e.g., 3/8 phases = 37.5%) for the active expedition. If no active expedition, show empty.
- [ ] Does the layout server component need to call `getProgressSummary` on every page load, or should we cache this in the session/cookie? **For architect to decide** — UX only requires the data to be reasonably fresh (stale by up to 1 page navigation is acceptable).

## 11. Patterns Used

- **RankBadge** (size="sm") from gamification components
- **PointsDisplay** (size="sm") from gamification components
- **New pattern: GamificationWidget** — compact header widget (to be added to ux-patterns)
- **New pattern: MiniProgressBar** — thin 4px progress bar for inline use (reusable)

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft |
