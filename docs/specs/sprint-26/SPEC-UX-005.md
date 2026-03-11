# SPEC-UX-005: Dashboard Visual Polish -- UX Specification

**Version**: 1.1.0
**Status**: Approved
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: SPEC-PROD-002 (Dashboard Trip Cards & Phase Confirmation)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

Quickly understand the status of each trip on the dashboard -- which phase each expedition is in, how much is complete, and what needs attention -- through clear visual hierarchy and distinct phase indicators.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Manages 1-3 trips at a time; needs at-a-glance status to decide which trip to continue |
| `@leisure-family` | May have multiple family trips planned; visual distinction between trip statuses prevents confusion |
| `@business-traveler` | Manages concurrent trips; needs instant visual scan to identify which trip needs action |
| `@group-organizer` | Coordinates multiple group trips; clear progress indicators help prioritize effort |
| `@travel-agent` | Manages many client trips; visual polish and density reduce cognitive load during bulk review |

## 3. User Flow

### Happy Path

1. User lands on the dashboard
2. Trip cards render with updated visual treatment:
   - Each card shows: emoji, destination, phase text, mini progress bar, checklist badge, action link
3. User scans the mini progress bars to identify which trips need attention
4. User clicks a trip card to navigate to that expedition

```
[User opens Dashboard]
    |
    v
[Trip cards render with progress indicators]
    |
    v
[User scans progress bars]
    |
    +--> [Card with incomplete phases] --> [User clicks to continue]
    |
    +--> [Card with all phases complete] --> [User clicks to review]
```

### Alternative Paths

- **No trips**: Empty state (existing -- not changed by this spec)
- **Archived trips**: Show with muted/dimmed visual treatment and "Archived" label
- **Single trip**: Same layout as multiple trips. Card takes full width of its grid cell.

### Error States

- **Trip data fails to load**: Card shows skeleton placeholder. After timeout (3 seconds), shows error state: "Nao foi possivel carregar esta viagem" / "Could not load this trip". Card is not clickable in error state.
- **Phase data inconsistency**: If completedPhases > totalPhases or other impossible states, show the progress bar in an indeterminate state with a warning icon.

### Edge Cases

- **20 trips (maximum)**: Grid layout handles 20 cards without performance issues. Scrollable page.
- **Very long destination names**: Text truncates with ellipsis after 2 lines. Full name appears in title attribute / tooltip.
- **Phase 7-8 (coming soon)**: Progress bar shows these as muted/dimmed segments with a "coming soon" visual treatment (existing behavior, refined in this spec).

## 4. Screen Descriptions

### Screen 1: Dashboard Trip Cards (Visual Polish)

**Purpose**: Provide at-a-glance expedition status for all trips, with clear visual distinction between completed, current, and incomplete phases.

**Layout -- Trip Card (revised)**:

```
+--------------------------------------------------+
| [Emoji]  Destination Name                  [-->]  |
|          Fase 3 de 6 . 2 fases concluidas        |
|                                                    |
|  [===][===][>>][  ][  ][  ][ ][ ]  mini progress  |
|                                                    |
|  [Checklist badge: 3/5 obrigatorios]              |
+--------------------------------------------------+
```

**Mini Progress Bar -- Redesigned**:

The current `DashboardPhaseProgressBar` has these issues:
1. Phase labels overlap the progress count text above
2. Incomplete phases are not visually distinct from "coming soon" phases
3. Check icons above completed segments are too small (3x3 = 12px, below 44px touch target but since segments are clickable links, the segment itself is the touch target)

**New specification for the mini progress bar**:

Each phase is a segment in a horizontal bar. The bar has 8 segments (6 active phases + 2 coming soon).

| Segment state | Visual treatment |
|---|---|
| **Completed** | Filled gold background (`bg-atlas-gold`). Small checkmark icon INSIDE the segment (not floating above). |
| **Current** | Filled primary color (`bg-primary`) with a subtle pulse animation (`motion-safe:animate-pulse`). No icon inside. |
| **Incomplete** (not yet started) | Outlined/bordered segment with transparent fill. Border color: `border-border`. Clearly distinct from "coming soon" by having a solid border. |
| **Coming soon** (phases 7-8) | Striped/hatched pattern or dotted border. Reduced opacity (50%). Construction icon NOT shown (too small, removed). |

Segment sizing:
- Height: 8px (current: 10px/2.5 -- reduce slightly for cleaner look)
- Gap between segments: 2px
- Border radius: 2px per segment (rounded-sm)
- All segments equal width (flex-1)

Phase labels (tooltips):
- Desktop: On hover, show phase name in a tooltip BELOW the segment (not above, to avoid overlapping the phase count text). Use a standard tooltip pattern with `position: absolute; top: 100%; margin-top: 4px`.
- Mobile: No hover tooltips. Phase names accessible via `aria-label` on each segment.
- Remove the always-visible phase labels that currently display on `sm:block` -- they clutter the card.

Clickability:
- Completed and current phase segments are clickable links (existing behavior, keep it)
- Incomplete and coming-soon segments are non-interactive divs
- Clickable segments have `cursor-pointer` and `hover:opacity-80`
- Touch target: the full segment height is only 8px, which is below the 44px minimum. However, the entire trip card is also a link (the `Link` overlay). The progress bar segments are supplementary navigation -- the primary interaction is clicking the card. For accessibility, the segments have `aria-label` but do NOT need to be 44px touch targets since they are secondary to the main card action.

**Important**: If the progress bar segments remain as individual links (as in the current implementation), they MUST meet the 44px minimum touch target or be removed as independent links. Recommendation: remove individual segment links from the progress bar. The entire card links to the expedition. The progress bar becomes a read-only visual indicator. Phase-specific navigation happens from within the expedition view, not the dashboard card.

**Phase count text -- Repositioned**:
- Move from inside the card content to a line below the destination name
- Format: "Fase {current} de {total} . {completed} concluidas" / "Phase {current} of {total} . {completed} completed"
- This text is ABOVE the progress bar, with sufficient spacing (8px) so the bar does not overlap it

**Card visual hierarchy** (top to bottom, left to right):
1. **Eye hits first**: Emoji (large, 30px) + Destination name (bold, 16px) -- left side
2. **Eye hits second**: Phase count text (muted, 14px) -- below destination
3. **Eye hits third**: Mini progress bar (8px tall) -- visual summary of expedition state
4. **Eye hits fourth**: Checklist badge (if visible) -- actionable detail
5. **Eye hits fifth**: "View expedition" link text (primary color, right side) -- CTA

**Interactive Elements**:

- **Card overlay link** (existing): Covers the entire card. Click/tap navigates to the expedition.
  - Default: subtle border, white/card background
  - Hover: elevated shadow (`shadow-md`), slight gold tint (`shadow-atlas-gold/5`)
  - Focus: ring highlight on the card border

- **Checklist badge** (existing, pointer-events-auto): Clickable mini-badge showing checklist progress. Navigates directly to Phase 3.
  - Default: small pill with text "3/5" + icon
  - Hover: slightly brighter

- **Progress bar segments**: NON-INTERACTIVE in the new spec (read-only visual). Remove Link wrappers. Remove click handlers. This eliminates the touch target accessibility issue entirely.

**Empty State**: No trips -- existing empty state with illustration (not changed by this spec).

**Loading State**: Skeleton cards (3 per grid row, existing pattern). Each skeleton card shows:
- Skeleton circle (emoji placeholder)
- Skeleton text lines (destination, phase count)
- Skeleton bar (progress bar placeholder)
- Colors: `bg-muted motion-safe:animate-pulse`

**Error State**: Individual card error (rare): card shows error text and retry option. Does not affect other cards in the grid.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | 1 column, cards full-width. Progress bar segments are narrower but proportional. Emoji, destination, and CTA link stack logically. Checklist badge below progress bar. |
| Tablet (768-1024px) | 2-column grid. Cards share the row. |
| Desktop (> 1024px) | 3-column grid (or 2-column if fewer than 3 trips). Cards maintain consistent height within a row. |

## 5. Interaction Patterns

- **Card hover**: Shadow elevation increase + subtle gold shadow. Transition: 200ms ease-out. Reduced motion: no shadow transition, instant state change.
- **Card click**: Navigates to expedition. No visual feedback beyond the standard link behavior.
- **Progress bar**: Static visual. No interactions. No tooltips on mobile. Hover tooltip on desktop (if segments are hovered, though they are non-interactive -- tooltip is informational only).
- **Checklist badge click**: Navigates to Phase 3 checklist. Standard link behavior.
- **Loading**: Skeleton pulse animation. Reduced motion: static muted rectangles.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [ ] Each trip card is focusable via Tab (the overlay Link)
  - [ ] Enter/Space on a focused card navigates to the expedition
  - [ ] Checklist badge is a separate Tab stop (existing, pointer-events-auto)
  - [ ] Progress bar segments are NOT Tab stops (read-only visual)
  - [ ] Focus indicator visible on the card border (2px ring)
  - [ ] No keyboard traps
- **Screen Reader**:
  - [ ] Card link has descriptive `aria-label`: "{destination} -- {phase text}" (existing, verify completeness)
  - [ ] Progress bar group has `aria-label`: "Progresso: {completed} de {total} fases concluidas" / "Progress: {completed} of {total} phases completed"
  - [ ] Individual progress segments have `aria-label` with phase name and state (e.g., "O Chamado -- concluida" / "The Calling -- completed")
  - [ ] Checklist badge has `aria-label`: "Checklist: {done} de {total} itens obrigatorios" / "Checklist: {done} of {total} required items"
  - [ ] "Coming soon" segments are announced as such
  - [ ] Skeleton loading state has `aria-busy="true"` on the card container
- **Color & Contrast**:
  - [ ] Gold completed segments on card background: must pass 3:1 for UI components
  - [ ] Primary current segment on card background: must pass 3:1
  - [ ] Incomplete segment border on card background: must pass 3:1
  - [ ] Coming soon segment (50% opacity) on card background: acceptable since it is decorative/supplementary
  - [ ] Phase count text passes 4.5:1 (muted-foreground on card)
  - [ ] Progress states distinguishable without color: completed (filled + checkmark), current (filled + pulse), incomplete (outlined/empty), coming soon (striped/dotted). The visual treatments are structurally different, not just color-different.
- **Motion**:
  - [ ] Current phase pulse animation uses `motion-safe:animate-pulse`
  - [ ] Card hover shadow transition uses `motion-safe:transition-shadow` or is acceptable since it is a hover state, not auto-playing
  - [ ] Skeleton pulse uses `motion-safe:animate-pulse`
- **Touch**:
  - [ ] Card touch target is the entire card (well above 44px)
  - [ ] Checklist badge touch target is at least 44x44px (verify current size)
  - [ ] Progress bar segments are NOT touch targets (read-only)

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `current_phase` | Fase {number} de {total} | Phase {number} of {total} |
| `phases_completed` | {completed} concluidas | {completed} completed |
| `view_expedition` | Ver expedicao | View expedition |
| `progress_label_sr` | Progresso: {completed} de {total} fases concluidas | Progress: {completed} of {total} phases completed |
| `state_completed` | concluida | completed |
| `state_current` | atual | current |
| `state_upcoming` | pendente | upcoming |
| `state_coming_soon` | em breve | coming soon |
| `archived_label` | Arquivada | Archived |
| `card_error` | Nao foi possivel carregar esta viagem | Could not load this trip |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Card load failure | Nao foi possivel carregar esta viagem. | Could not load this trip. |

### Tone of Voice

- Functional and informative. Dashboard text is concise -- users scan, not read.
- Phase progress is stated factually: "Phase 3 of 6. 2 completed." No embellishment.
- CTA "View expedition" is action-oriented and clear.

## 8. Constraints (from Product Spec)

- SPEC-PROD-002 AC-002: Trip card MUST display destination, dates, status, phase progress, and a single primary action.
- SPEC-PROD-002 AC-005: No buttons that lead to dead ends.
- Dashboard must render up to 20 trip cards in under 2 seconds (SPEC-PROD-002 Performance).
- Removing legacy buttons ("Itens", "Checklist", "Hospedagem") is covered by SPEC-PROD-002 AC-001 -- verified that the current ExpeditionCard does NOT have these buttons (they were already removed in a previous sprint). No action needed.
- The current card does not show travel dates. SPEC-PROD-002 AC-002 requires dates. This spec notes the requirement but dates are a data issue (the dates need to be passed as props to the card), not a pure visual polish issue. Recommend adding `startDate` and `endDate` props to ExpeditionCard.

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: Changes are visual refinements to existing components (progress bar segment styles, label positioning, tooltip direction). No novel interaction patterns that need prototype validation.

## 10. Open Questions (RESOLVED)

- [x] **Progress bar interactivity resolved:** Progress bar segments become read-only visuals (non-interactive). This eliminates the 44px touch target issue. The card itself links to the expedition; phase-specific navigation happens from within the expedition view. Confirmed by tech-lead and product owner.
- [x] **Travel dates resolved:** Yes, add dates to the card in Sprint 26. Format: "12 Mar - 20 Mar 2026" below the destination name. The `startDate` and `endDate` props will be passed to ExpeditionCard.
- [x] **Phase name resolved:** Show the current phase name in addition to the number. Format: "Fase 3: O Preparo . 2 concluidas" / "Phase 3: The Preparation . 2 completed". Only the current phase name is shown, not all phases.

---

## Dark Theme Considerations

- Card background: `bg-card` (adapts automatically)
- Card border: `border-border` (adapts)
- Card shadow on hover: `shadow-md shadow-atlas-gold/5` -- verify this is visible in dark mode. Gold shadow on dark card may need increased opacity: `shadow-atlas-gold/10`.
- Progress bar segments:
  - Completed (gold): `bg-atlas-gold` -- vivid enough for both themes
  - Current (primary): `bg-primary` -- orange, vivid on both themes. **Note (Q5):** Any text or icon overlaid on `bg-primary` in dark mode MUST use a dark color (`text-black` or high-contrast `text-primary-foreground`) to meet WCAG 4.5:1 contrast ratio.
  - Incomplete: `border border-border bg-transparent` -- the border is visible in both themes because `border-border` adapts
  - Coming soon: `border border-dashed border-border/50 bg-transparent opacity-50` -- dashed border distinguishes from incomplete
- Text: `text-foreground` for destination, `text-muted-foreground` for phase count, `text-primary` for CTA -- all adapt
- Skeleton: `bg-muted` (adapts)
- Checkmark inside completed segments: `text-card` (background color) for contrast against gold fill, or use a small SVG with explicit fill

## Motion Specifications

- **Card hover shadow**: `transition-shadow duration-200 ease-out`. Reduced motion: instant shadow change (acceptable, hover states are not auto-playing).
- **Current phase pulse**: `motion-safe:animate-pulse`. Reduced motion: static primary color fill (no pulse). The current phase is still identifiable by its distinct color.
- **Skeleton loading**: `motion-safe:animate-pulse`. Reduced motion: static muted background.
- **Card appearance on page load**: No entrance animation. Cards render statically. This is deliberate -- the dashboard should feel instant and stable.

---

> **Spec Status**: Approved
> Ready for: Task breakdown

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft -- progress bar redesign, card visual hierarchy, touch target fix |
| 1.1.0 | 2026-03-11 | tech-lead | Approved with stakeholder decisions: Q5 (bg-primary dark mode contrast note), open questions closed (progress bar read-only, dates added, phase name shown) |
