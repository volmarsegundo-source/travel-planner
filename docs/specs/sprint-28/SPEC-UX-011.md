---
spec_id: SPEC-UX-011
title: "Gamification Header Indicator"
type: ux
status: Draft
version: "1.0.0"
author: ux-designer
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-UX-007
---

# SPEC-UX-011: Gamification Header Indicator — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (continuation of SPEC-UX-007)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to see their current expedition phase and accumulated points at a glance in the navigation header, reinforcing a sense of progress and motivating completion of their planning journey.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Visible progress creates companionship — the app is tracking their journey alongside them |
| `@leisure-family` | Points indicator motivates completing all planning steps for a well-prepared family trip |
| `@business-traveler` | Compact display does not interfere with rapid task execution; glanceable status |
| `@bleisure` | Phase visibility helps distinguish where they are in planning across multiple trip types |
| `@group-organizer` | Score visible when sharing screen with group members provides social proof of planning effort |

## 3. Relationship to SPEC-UX-007

SPEC-UX-007 (Sprint 27) defined the full GamificationWidget concept: points + rank badge + mini progress bar. This spec (SPEC-UX-011) refines and simplifies that design for Sprint 28 implementation based on what is buildable now:

- **Retained**: Points badge, phase indicator, mobile compact view
- **Simplified**: Progress bar deferred (rank progression data not yet available in header layout)
- **Added**: Phase icon/name display, animation on points earned, click-to-navigate behavior
- **Changed**: Widget position clarified for current navbar structure

This spec supersedes the layout details in SPEC-UX-007 sections 4 and 5 while preserving its accessibility and motion requirements.

## 4. User Flow

### Display Logic

```
[Any authenticated page loads]
    |
    v
[AppShellLayout fetches user progress data]
    |
    v
[AuthenticatedNavbar renders GamificationIndicator]
    |
    +-- Desktop (>= 768px):
    |     [Phase icon] + "Fase X" label + [Points badge: "1.250 pts"]
    |     |
    |     +-- Click anywhere on indicator --> Navigate to /profile#progress
    |
    +-- Mobile (< 768px):
          [Phase icon] + [Points count only: "1.250"]
          |
          +-- Tap --> Navigate to /profile#progress
```

### Points Earned Animation

```
[Traveler completes a phase or earns points]
    |
    v
[PointsAnimation shows in wizard (existing behavior)]
    |
    v
[Page navigates to next phase or reloads]
    |
    v
[Header re-renders with updated data]
    |
    v
[Points badge pulses once (subtle scale + glow, 600ms)]
    |
    v
[Returns to static display]
```

### Edge Cases

- **No active expedition**: Show points badge only (no phase indicator). Points = total accumulated.
- **Multiple expeditions**: Show phase from the most recently active expedition.
- **Zero points (new user)**: Show "0 pts" with no phase indicator. Subtle visual invitation.
- **Maximum phase (phase 8 completed)**: Phase icon shows a checkmark or trophy. Label: "Concluida".
- **Data unavailable**: Indicator hidden entirely (graceful degradation, no error state).

## 5. Screen Descriptions

### Component: GamificationIndicator

**Purpose**: Compact, persistent display of the traveler's current expedition phase and points total in the navigation header.

**Location**: Inside `AuthenticatedNavbar`, positioned between the navigation links ("Expeditions" / "Meu Atlas") and the utility controls (ThemeToggle, LanguageSwitcher, UserMenu).

#### Desktop Layout (>= 768px)

A horizontal strip containing two elements, left to right:

1. **Phase indicator**: Small icon (16px) representing the current phase + text label "Fase X" (13px, `text-muted-foreground`). The icon uses the expedition phase icon set (compass, map, checklist, etc.).
2. **Points badge**: Pill-shaped badge with gold background tint (`bg-atlas-gold/10`), gold text (`text-atlas-gold`), containing the points number formatted with locale separators + "pts" suffix. Font: 13px, semibold.

The two elements are separated by a thin vertical divider (1px, `border-border`, 16px height).

Total width: approximately 160-200px. Height: fits within the 56px (h-14) header.

Visual hierarchy: Points badge is most prominent (gold tint background draws the eye). Phase indicator is secondary (muted text).

The entire indicator area is a clickable link to `/profile#progress`, with a hover state: `bg-accent/10` rounded background on the container.

#### Mobile Layout (< 768px)

Collapsed to a single element:
- Points number only: gold text, no "pts" suffix, no phase label
- Example: "1.250"
- Compass emoji (existing app icon) as prefix: "1.250"
- Total width: approximately 50-70px
- Tappable area: minimum 44x44px
- Taps navigate to `/profile#progress`

The phase indicator is NOT shown on mobile to conserve header space. The traveler can see full details on the profile page.

#### No-Expedition State

When the traveler has no active expeditions:
- Desktop: Points badge only (no phase indicator, no divider). If points are also 0, show "0 pts" with subdued style (`text-muted-foreground` instead of gold).
- Mobile: "0" in muted color.

### Dark Theme

- Points badge: `bg-atlas-gold/10` works in both themes (gold tint on dark background is visible)
- Phase label: `text-muted-foreground` adapts to theme
- Phase icon: `text-muted-foreground` adapts to theme
- Hover state: `bg-accent/10` adapts to theme
- Divider: `border-border` adapts to theme

### Wireframe Description

```
Desktop (>= 768px):
+------------------------------------------------------------------------+
| [Logo]  [Expeditions] [Meu Atlas]  |  [Phase Icon] Fase 3 | 1.250 pts  |  [Theme] [Lang] [User] |
+------------------------------------------------------------------------+
                                      ^--- GamificationIndicator ---^

Mobile (< 768px):
+------------------------------------------+
| [Logo]         1.250         [Hamburger]  |
+------------------------------------------+
                  ^--- Points only
```

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Points number only, gold text. Tappable, navigates to profile. No phase label. |
| Tablet (768-1024px) | Full indicator: phase icon + "Fase X" + divider + points badge. Same as desktop. |
| Desktop (> 1024px) | Full indicator: phase icon + "Fase X" + divider + points badge. Hover highlights. |

## 6. Interaction Patterns

- **Click/tap**: Navigates to `/profile#progress`. Standard link behavior (no animation on click itself).
- **Hover (desktop)**: Container shows `bg-accent/10` rounded background. Cursor: pointer.
- **Focus**: 2px outline `var(--color-primary)`, 2px offset on the container link.
- **Points update pulse**: When the header re-renders with a higher points value, the points badge scales to 1.05x and glows briefly (box-shadow with atlas-gold/30), then returns to normal over 600ms. This is triggered by comparing the rendered points value to the previous value (implementation detail for architect).
- **No loading state**: Data comes from server layout render. If data is unavailable, indicator is hidden.

### Motion Tokens

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Points pulse (scale + glow) | 600ms | ease-in-out | instant value update, no animation |
| Hover bg transition | 150ms | ease | instant |

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] Indicator is a single focusable link element (`<a>` wrapping the content)
  - [x] Tab order: after nav links, before utility controls
  - [x] Focus indicator visible: 2px outline primary, 2px offset
  - [x] Enter activates the link (navigates to profile)
- **Screen Reader**:
  - [x] Link has `aria-label` summarizing all displayed info: "1.250 pontos, Fase 3 de 8. Ver progresso no perfil"
  - [x] On mobile (shorter display): `aria-label` still contains full info even though only points number is visible
  - [x] Points update: no live region needed (the value changes on page navigation, not in-place)
  - [x] Phase icon: `aria-hidden="true"` (decorative, info conveyed by text label)
- **Color & Contrast**:
  - [x] Gold text (`text-atlas-gold`) on header background: verify >= 4.5:1 in both light and dark themes. If atlas-gold (#C9973A) on light bg (#F7F9FC) fails, use `text-atlas-gold-dark` variant or darken to #9A7530
  - [x] Muted phase label: `text-muted-foreground` on header bg >= 4.5:1 (already verified in design system)
  - [x] Points information is not conveyed by color alone (the number itself is the information)
- **Touch**:
  - [x] Mobile tap target: minimum 44x44px (entire indicator area is the link)
  - [x] Desktop: no minimum required (pointer device), but indicator is at least 32px tall within the 56px header

## 8. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `gamification.indicator.label` | {points} pontos, Fase {phase} de {total}. Ver progresso no perfil | {points} points, Phase {phase} of {total}. View progress in profile |
| `gamification.indicator.noExpedition` | {points} pontos. Ver progresso no perfil | {points} points. View progress in profile |
| `gamification.indicator.phaseLabel` | Fase {number} | Phase {number} |
| `gamification.indicator.completed` | Concluida | Completed |
| `gamification.indicator.pts` | pts | pts |

### Tone of Voice

- Informational and compact. The header is not the place for celebration — that happens in the phase wizards.
- Numbers use locale-formatted separators: "1.250" (PT), "1,250" (EN).

## 9. Constraints

- Header height is fixed at h-14 (56px). All indicator content must fit within this.
- Current `AuthenticatedNavbar` receives `userName`, `userImage`, `userEmail` as props. The gamification data (points, currentPhase, totalPhases) must be added to props, passed from `AppShellLayout`.
- Data source: `PointsEngine.getProgressSummary(userId)` or equivalent. This is already called on the dashboard page. For the header, it needs to be called in the layout server component.
- The indicator must not cause layout shift when data loads. Since it renders server-side in the layout, this should not be an issue.
- Performance: the layout query must be fast (cached or lightweight). If it adds noticeable latency to every page load, it should be cached per session.

## 10. Prototype

- [ ] Prototype required: No (compact header element — spec and wireframe description sufficient for implementation)

## 11. Open Questions

- [ ] Should the indicator link to `/profile#progress` or to the active expedition's current phase? **Recommendation**: Link to profile. The profile page shows overall progress including all expeditions. The traveler can navigate to their active expedition from there.
- [ ] If atlas-gold text fails contrast check on the light theme header background, should we darken the gold or add a subtle badge background? **Recommendation**: Use `bg-atlas-gold/10` pill background to ensure the gold text sits on a tinted surface, improving readability and creating a visual badge effect.
- [ ] Should the mobile indicator appear in the header bar directly, or inside the hamburger menu? **Recommendation**: In the header bar directly (not inside hamburger). Points are a persistent motivator and should be visible without opening the menu.

## 12. Patterns Used

- **New pattern: GamificationIndicator** — compact header link with points badge + phase label (to be added to ux-patterns)
- **Reuses**: atlas-gold color token, phase icon set from expedition wizards

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft — refined from SPEC-UX-007 for Sprint 28 scope |
