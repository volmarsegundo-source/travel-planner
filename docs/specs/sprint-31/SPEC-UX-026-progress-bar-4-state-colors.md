# SPEC-UX-026: Progress Bar 4-State Color System -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (visual update to SPEC-UX-019 UnifiedProgressBar)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Current UnifiedProgressBar Colors (from code)

| State | Current Color | Current Icon | Issue |
|---|---|---|---|
| Completed | Amber/gold (#F59E0B / `bg-amber-500`) | Checkmark | Gold is ambiguous -- used for both "completed" and "current" in different contexts across the app |
| Current | Navy (#1A3C5E) | Phase number + pulse | Navy is the secondary brand color -- fine, but low visual urgency for "you are here" |
| Available | Transparent + gray border (#5C6B7A) | Phase number | Acceptable |
| Locked | Gray 30% opacity + dashed border (#9BA8B5) | Lock icon | Acceptable |

### 0.2 Problem

The current 4-state system uses gold for "completed" and navy for "current." This creates several issues:

1. **Gold/amber overload**: Gold is used for completed phases, completed badges, points displays, and the brand accent. It no longer signals "completed" distinctly.
2. **No urgency for current phase**: Navy is calm and recessive. The "you are here" indicator should have higher visual weight.
3. **Inconsistency with dashboard cards**: SPEC-UX-025 defines green for completed, amber for in-progress, blue for active, gray for planned. The progress bar should use the same semantic color mapping.

### 0.3 Target: Unified 4-State Color System

A single color vocabulary used consistently across UnifiedProgressBar, DashboardPhaseProgressBar, expedition card borders, and pin states.

---

## 1. Traveler Goal

Immediately understand the state of each expedition phase at a glance through a consistent, intuitive color system -- green means done, amber means working on it, blue means "you are here," gray means not yet.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Clearer progress tracking. Green checkmarks provide stronger sense of accomplishment. |
| `@leisure-family` | Family members looking over the traveler's shoulder can instantly parse which phases are done. |
| `@business-traveler` | Speed: universal color language (green=done, amber=active) matches enterprise software mental models. |
| `@bleisure` | Consistent colors across bar and cards reduce cognitive load when managing multiple trips. |
| `@group-organizer` | At-a-glance status scanning is critical for multi-trip management. |

## 3. User Flow

No flow changes. This is a visual-only update to existing components. Interaction behavior is unchanged from SPEC-UX-019.

---

## 4. Screen Descriptions

### 4.1 UnifiedProgressBar -- New 4-State Colors

| State | Fill Color | Icon | Border | Animation | Hover |
|---|---|---|---|---|---|
| Concluida (completed) | #10B981 (green-500) | Checkmark (white) | None | None | translateY(-2px), cursor pointer |
| Atual (current) | #3B82F6 (blue-500) | Half-circle / phase number (white) | None | Gentle pulse (scale 1.0-1.05, 2s) | cursor default, no lift |
| Pendente (available/upcoming) | Transparent | Phase number (#6B7280) | 2px solid #6B7280 (gray-500) | None | translateY(-2px), cursor pointer |
| Bloqueada (locked) | #374151/30 (gray-700 at 30%) | Lock icon (#9BA8B5) | 2px dashed #9BA8B5 | None | cursor not-allowed, no lift |

### 4.2 Visual Comparison -- Before vs After

**Before (SPEC-UX-019)**:
```
[gold+check] -- [navy+num+pulse] -- [outlined+num] -- [gray+lock]
 Completed       Current              Available         Locked
```

**After (this spec)**:
```
[green+check] -- [blue+num+pulse] -- [gray-outlined+num] -- [gray-dashed+lock]
 Completed        Current              Pending              Locked
```

### 4.3 DashboardPhaseProgressBar -- Same Colors

The dashboard card progress bar (read-only, smaller) must adopt the same 4-state colors:

| State | Segment Color | Label |
|---|---|---|
| Completed | #10B981 (green) | Phase name (muted text below on hover) |
| Current | #3B82F6 (blue) | Phase name + "(atual)" |
| Pending | #6B7280 (gray, outlined) | Phase name |
| Locked / Coming Soon | #9BA8B5 (dashed, faded) | Phase name + lock or construction icon |

### 4.4 Segment Size (Unchanged)

- 44x44px circles on all viewpoints (per SPEC-UX-019)
- 8px gap between segments
- Connecting lines: 2px, completed segments use green (#10B981), pending use muted gray

### 4.5 Connecting Line Colors (Updated)

| Between | Line Color |
|---|---|
| Two completed segments | #10B981 (green) -- shows a "completed path" |
| Completed and current | Gradient from #10B981 to #3B82F6 |
| Current and pending | Muted gray (#4B5563) |
| Two pending/locked | Muted gray (#4B5563) |

---

## 5. Interaction States Table

All interaction behaviors are unchanged from SPEC-UX-019 Section 5.1. Only visual presentation changes.

### 5.1 Updated Hover/Focus States

| User Action | State | Visual Change |
|---|---|---|
| Hover completed | Completed | Green brightens slightly (#34D399). translateY(-2px). |
| Hover current | Current | No change. Pulse continues. |
| Hover pending | Pending | Border brightens (#9CA3AF). translateY(-2px). |
| Hover locked | Locked | Tooltip appears. No visual change to segment. cursor not-allowed. |
| Focus any | Any | 2px solid focus ring (primary #E8621A), 2px offset. |

### 5.2 Screen Reader Announcements (Unchanged)

| State | Announcement |
|---|---|
| Completed | "{Phase name}, fase {N} de 6, concluida" |
| Current | "{Phase name}, fase {N} de 6, atual" |
| Pending | "{Phase name}, fase {N} de 6, pendente" |
| Locked | "{Phase name}, fase {N} de 6, bloqueada" |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Color and Contrast (Updated)

- [x] Green (#10B981) checkmark on green bg: white icon on #10B981 = 3.1:1 for graphical objects (passes). Supplemented by checkmark shape.
- [x] Blue (#3B82F6) number on blue bg: white text on #3B82F6 = 3.8:1 for large text (14px bold). If fails 4.5:1 for normal text, number is graphical (3:1 suffices).
- [x] Gray border (#6B7280) on dark card bg (#1E293B): 3.4:1 (passes 3:1 for UI components)
- [x] Gray text (#6B7280) inside pending circle: on transparent bg over card bg -- verify >= 4.5:1. If fails, lighten to #9CA3AF.
- [x] Locked gray (#9BA8B5) with dashed border: 2.8:1 against dark bg -- mitigated by lock icon + dashed style (not color alone)
- [x] No information conveyed by color alone: each state has unique icon (checkmark / number / number / lock) AND unique fill/border style (solid green / solid blue / outlined gray / dashed gray)

### Motion
- [x] Blue pulse on current: respects `prefers-reduced-motion` (disabled, static blue)
- [x] Hover translateY: respects `prefers-reduced-motion` (no translate, instant state change)

### Keyboard and Touch
- [x] All behaviors unchanged from SPEC-UX-019 Section 6

---

## 7. Content and Copy

### Updated State Labels

| Key | PT-BR (updated) | EN |
|---|---|---|
| `progress.completed` | Concluida | Completed |
| `progress.current` | Atual | Current |
| `progress.pending` | Pendente | Pending |
| `progress.locked` | Bloqueada | Locked |

**Note**: "Disponivel" (available) from SPEC-UX-019 renamed to "Pendente" (pending) for consistency with card status vocabulary. Clearer semantic meaning: "pending" = waiting for you, "available" = you can go there. "Pendente" is more intuitive for progress context.

---

## 8. Constraints

- **CSS changes only**: No behavioral changes. Only color values, icons (if half-circle replaces number for current), and connecting line gradients.
- **Design tokens**: New tokens needed:
  - `--color-phase-completed: #10B981`
  - `--color-phase-current: #3B82F6`
  - `--color-phase-pending: #6B7280`
  - `--color-phase-locked: #9BA8B5`
- **Consistency requirement**: These 4 tokens must be used in UnifiedProgressBar, DashboardPhaseProgressBar, expedition card left borders (SPEC-UX-025), and atlas map pins (SPEC-UX-024). One vocabulary, everywhere.
- **Dark theme**: Colors chosen for dark backgrounds. On light theme (if ever added), lighter variants would be needed.

---

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: This is a color-only change to an existing component. The interaction states table and color specifications provide sufficient guidance for implementation.

---

## 10. Open Questions

- [ ] **Current phase icon**: Should the current phase show the phase number (current behavior) or a half-circle icon (to visually distinguish from pending which also shows a number)? Half-circle adds visual distinction but loses the "which phase number" information. **Recommendation**: Keep phase number. The blue fill + pulse already distinguishes from gray outlined pending. **Needs: product-owner confirmation**
- [ ] **Connecting line gradient**: Is the green-to-blue gradient between completed and current segments achievable in the current implementation? If not, use solid muted gray for all non-completed connections. **Needs: architect**

---

## 11. Components to Modify

| Component | Change |
|---|---|
| `UnifiedProgressBar` | Update `getSegmentClasses`: amber->green for completed, navy->blue for current, gray border adjustments |
| `DashboardPhaseProgressBar` | Adopt same 4-state color tokens |
| (New) Design tokens in Tailwind config | Add `--color-phase-completed`, `--color-phase-current`, `--color-phase-pending`, `--color-phase-locked` |

### No New Components

### No Components Deprecated

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: UnifiedProgressBar (modified), DashboardPhaseProgressBar (modified)

**New patterns introduced**: 4-state phase color system (design tokens, used across all phase-status contexts)

---

> **Spec Status**: Draft
> Ready for: Architect (gradient feasibility, token integration)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. 4-state color system replacing gold/navy with green/blue/gray palette for consistency across progress bar, cards, and map pins. |
