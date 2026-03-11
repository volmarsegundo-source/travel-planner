# SPEC-UX-003: Unified Phase Transitions -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: SPEC-PROD-001 (Expedition Navigation & Phase Sequencing)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

Experience smooth, consistent, and predictable transitions between expedition phases -- so that phase changes feel like natural progression through a journey, not jarring screen swaps.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Consistent transitions build a sense of "journey progression" that matches the expedition metaphor |
| `@leisure-family` | Predictable transitions reduce confusion for less tech-savvy family members |
| `@business-traveler` | Fast, non-blocking transitions respect their time -- no unnecessary delays |
| `@bleisure` | Smooth experience across all phases reinforces product quality |

## 3. User Flow

### Happy Path (Phase Completion Transition)

1. User completes a phase (clicks "Complete phase" or equivalent)
2. System saves data and awards points
3. Points animation plays (PointsAnimation component -- existing, not changed by this spec)
4. User dismisses points animation (click or auto-dismiss)
5. Phase transition screen appears: shows completed phase name + next phase name
6. User clicks "Continue" or waits for auto-advance (configurable delay)
7. Fade-out of transition screen (300ms)
8. New phase content fades in (300ms)
9. Focus moves to the new phase's main heading

```
[User completes phase N]
    |
    v
[Data saved + points awarded]
    |
    v
[PointsAnimation plays] (existing, unchanged)
    |
    v
[User dismisses points]
    |
    v
[PhaseTransition screen: "Phase N complete -> Phase N+1"]
    |
    +---[User clicks "Continue"]---+
    |                              |
    +---[Auto-advance 3s timer]----+
    |
    v
[Unified transition: fade-out (300ms) + slide-up (300ms)]
    |
    v
[New phase content fades in (300ms)]
    |
    v
[Focus moves to new phase heading]
```

### Happy Path (Progress Bar Navigation)

1. User clicks a phase segment on the progress bar
2. Current phase content fades out (200ms)
3. Target phase content fades in (200ms)
4. Focus moves to the target phase's main heading
5. No PhaseTransition interstitial screen (direct navigation -- no celebration)

### Happy Path (Back/Next Button Navigation)

1. User clicks Back or Next button
2. Current phase content fades out (200ms) -- content slides slightly in the direction of navigation (left for forward, right for backward)
3. New phase content fades in (200ms) -- slides in from the opposite direction
4. Focus moves to the new phase heading

### Alternative Paths

- **User cancels auto-advance**: Clicks anywhere on the transition screen before the timer expires. Timer stops. "Continue" button remains available for manual activation.
- **User navigates away during transition**: Standard browser navigation takes precedence. No data loss (data was already saved before the transition started).

### Error States

- **Phase save fails during completion**: Transition does NOT start. Error is shown on the current phase. The PhaseTransition screen never appears.
- **Navigation to locked phase**: If a user somehow triggers navigation to a phase they cannot access, redirect to the first incomplete phase with a brief toast notification.

### Edge Cases

- **Phase 1 back button**: Hidden or navigates to dashboard. No transition animation -- direct navigation.
- **Phase 6 completion**: Final phase has a different transition -- "Expedition Complete" celebration instead of "Advancing to Phase N+1". Uses the same transition component but with different copy and a confetti/success visual.
- **Rapid clicking**: Debounce transition triggers. If a transition is already in progress, ignore subsequent clicks until the transition completes (300ms lockout).

## 4. Screen Descriptions

### Screen 1: Phase Transition Interstitial

**Purpose**: Celebrate phase completion and orient the traveler toward the next phase. Provides a moment of accomplishment before moving forward.

**Layout**:
- Full-viewport overlay with semi-transparent dark backdrop (`bg-black/50`)
- Centered card (max-width 400px) with rounded corners and elevation
- Content stacked vertically, centered:
  1. Phase completion emoji (large, 48px) -- e.g., checkmark for completion
  2. "Phase N completed!" heading (bold, 24px)
  3. Completed phase name in muted text
  4. Divider or spacing
  5. "Advancing to Phase N+1" subheading (primary color, 20px)
  6. Next phase name in muted text
  7. "Continue" primary button (full width of card content)
  8. Auto-advance countdown text (small, muted): "Avancando automaticamente em Xs..." / "Auto-advancing in Xs..."

**Interactive Elements**:

- **"Continue" button**:
  - Default: primary style, full width
  - Hover: slightly elevated
  - Focus: ring highlight
  - Loading: none (navigation is instant after save)

- **Backdrop**: Clicking the backdrop area (outside the card) cancels auto-advance but does NOT dismiss the transition. User must click "Continue" to proceed. This prevents accidental dismissal.

- **Auto-advance timer**: Shows countdown text. Timer duration: 3 seconds (increased from current 2 seconds per E2E audit recommendation). Clicking "Continue" or any interaction on the card cancels the timer.

**Empty State**: N/A -- this screen is never empty.

**Loading State**: N/A -- data is already saved before this screen appears. If the next phase's data is being fetched, the transition screen stays visible until ready.

**Error State**: This screen does not have its own error state. Errors prevent this screen from appearing at all.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Card takes full width minus 32px padding (16px each side). Button is full width. Text sizes remain the same. The card is vertically centered in the viewport. |
| Tablet (768-1024px) | Card is max-width 400px, centered. |
| Desktop (> 1024px) | Card is max-width 400px, centered. |

### Non-Screen: Inline Phase Transition Animation

For progress bar clicks and Back/Next navigation, there is no interstitial screen. The transition is an inline animation applied to the phase content area:

**Transition specification (forward navigation / Next)**:
1. Current content: `opacity 1->0` + `translateY 0->-8px` over 200ms ease-out
2. Gap: 50ms (allows DOM update)
3. New content: `opacity 0->1` + `translateY 8px->0` over 200ms ease-out
4. Total perceived duration: ~450ms

**Transition specification (backward navigation / Back)**:
1. Current content: `opacity 1->0` + `translateY 0->8px` over 200ms ease-out
2. Gap: 50ms
3. New content: `opacity 0->1` + `translateY -8px->0` over 200ms ease-out

**Transition specification (progress bar jump)**:
1. Current content: `opacity 1->0` over 150ms ease-out
2. Gap: 50ms
3. New content: `opacity 0->1` over 150ms ease-out
4. No slide direction (cross-fade only, since the user may jump multiple phases)

## 5. Interaction Patterns

- **Screen transitions**: ONE consistent pattern for all phase changes. Three variants (completion interstitial, forward/back inline, progress bar jump) but all share the same animation primitives (opacity + translateY).
- **Loading feedback**: The transition itself IS the loading feedback. If the next phase takes time to load, the transition animation holds at the fade-out state until content is ready.
- **Success feedback**: Phase completion interstitial with checkmark emoji and phase name.
- **Error feedback**: Transitions never start if the triggering action fails. Errors are shown in-place on the current phase.
- **Animation**: All animations use `ease-out` timing. Durations: 150-300ms range. MUST respect `prefers-reduced-motion`.
- **Progressive disclosure**: The auto-advance timer shows countdown text so the user knows the screen will advance.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [ ] "Continue" button in transition interstitial is auto-focused when the screen appears
  - [ ] Pressing Enter on the "Continue" button advances to the next phase
  - [ ] Escape key cancels auto-advance timer (does NOT dismiss the interstitial -- user must click Continue)
  - [ ] Focus is trapped within the transition interstitial while it is displayed (it is a modal overlay)
  - [ ] After transition completes, focus moves to the new phase's main h1 heading
  - [ ] Back/Next buttons have descriptive aria-labels: "Voltar para Fase N: [nome]" / "Go back to Phase N: [name]", "Avancar para Fase N: [nome]" / "Advance to Phase N: [name]"
- **Screen Reader**:
  - [ ] Transition interstitial has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the heading
  - [ ] Auto-advance countdown is announced via `aria-live="polite"` (announce once when timer starts, not every second)
  - [ ] Phase change is announced via a visually hidden `aria-live="assertive"` region: "Agora na Fase N: [nome]" / "Now on Phase N: [name]"
  - [ ] The inline fade transitions do NOT interfere with screen reader announcements (content is updated in the DOM, the live region announces the change)
- **Color & Contrast**:
  - [ ] All text on the transition card passes 4.5:1 (card uses `bg-card`, text uses `text-foreground`)
  - [ ] Countdown text passes 4.5:1 even in muted style
  - [ ] Backdrop does not need to pass contrast (it is a non-interactive overlay)
- **Motion**:
  - [ ] ALL transition animations MUST respect `prefers-reduced-motion`
  - [ ] With reduced motion: interstitial appears instantly (no fade), closes instantly. Inline transitions swap content instantly (no fade, no slide). The DOM update still occurs, just without visual animation.
  - [ ] Auto-advance timer still functions with reduced motion (behavior is not motion-dependent)
- **Touch**:
  - [ ] "Continue" button is at least 44px tall
  - [ ] On mobile, the entire transition card is tappable as a "Continue" action (larger touch target)

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `phase_completed` | Fase {number} concluida! | Phase {number} completed! |
| `advancing_to` | Avancando para a Fase {number} | Advancing to Phase {number} |
| `cta_continue` | Continuar | Continue |
| `auto_advance` | Avancando automaticamente em {seconds}s... | Auto-advancing in {seconds}s... |
| `auto_advance_cancelled` | Clique em Continuar quando estiver pronto. | Click Continue when you're ready. |
| `expedition_complete` | Expedicao concluida! | Expedition complete! |
| `back_to_phase` | Voltar para Fase {number}: {name} | Go back to Phase {number}: {name} |
| `advance_to_phase` | Avancar para Fase {number}: {name} | Advance to Phase {number}: {name} |
| `now_on_phase_sr` | Agora na Fase {number}: {name} | Now on Phase {number}: {name} |

### Error Messages

No error messages specific to transitions. Errors are handled by the triggering action (phase completion, navigation).

### Tone of Voice

- Celebratory but brief for phase completion. The transition is a micro-moment of delight, not a blocker.
- Auto-advance text is informative, not pressuring. The user should feel in control.

## 8. Constraints (from Product Spec)

- Phase navigation must complete in under 500ms perceived transition time (SPEC-PROD-001, Performance constraints). The 200ms inline transition + 50ms gap + 200ms fade-in = 450ms, which meets this constraint.
- Auto-advance was flagged in the E2E audit as too fast at 2 seconds. Increased to 3 seconds in this spec.
- The PhaseTransition component currently auto-advances after a 1200ms celebration + 2000ms auto-advance = 3200ms total. New spec: 1200ms celebration + 3000ms countdown = 4200ms total. The user can always skip by clicking "Continue."
- Focus management is critical: SPEC-PROD-001 AC-012 requires phase name to be announced by screen readers on phase change.

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: The transition behavior is well-defined by timing and easing values. Implementation is CSS/JS animation work. The interstitial screen layout is already implemented (PhaseTransition component) -- changes are to timing, consistency, and adding reduced-motion fallbacks.

## 10. Open Questions

- [ ] Should the auto-advance timer show a visual countdown (progress ring, shrinking bar)? Recommendation: simple text countdown is sufficient and more accessible. A progress ring could be added as enhancement but is not required for MVP. (Product Owner to decide)
- [ ] Should clicking the backdrop dismiss the interstitial or just cancel auto-advance? Recommendation: cancel auto-advance only (not dismiss). Dismissing via backdrop is ambiguous -- does it mean "continue" or "go back"? (UX decision: cancel auto-advance only, documented above)

---

## Dark Theme Considerations

- Backdrop: `bg-black/50` works identically in light and dark themes
- Transition card: `bg-card` (adapts automatically)
- Text: `text-foreground` for headings, `text-muted-foreground` for phase names and countdown
- Emoji: Renders natively, no theme dependency
- Button: Uses existing primary button style (adapts automatically)

## Motion Specifications (comprehensive)

### Token Definitions

| Token | Duration | Easing | Purpose |
|---|---|---|---|
| `--transition-fast` | 150ms | ease-out | Progress bar jump cross-fade |
| `--transition-normal` | 200ms | ease-out | Inline phase navigation (forward/back) |
| `--transition-slow` | 300ms | ease-out | Phase completion interstitial fade |
| `--transition-celebration` | 1200ms | ease-in-out | Celebration state before advancing text |

### Reduced Motion Behavior

When `prefers-reduced-motion: reduce` is active:
- ALL duration values become 0ms (instant transitions)
- ALL translateY values become 0 (no slide)
- Content updates still occur -- only the visual animation is removed
- Auto-advance timer still counts down and advances (the timer is not motion)
- The interstitial screen still appears and functions -- it just appears/disappears instantly

### CSS Implementation Guidance (for architect/developer reference)

```
/* These are UX specifications, not implementation code.
   Provided as reference for the architect's technical spec. */

Inline transition (forward):
  exit:  opacity 1→0, translateY 0→-8px, 200ms ease-out
  enter: opacity 0→1, translateY 8px→0, 200ms ease-out

Inline transition (backward):
  exit:  opacity 1→0, translateY 0→8px, 200ms ease-out
  enter: opacity 0→1, translateY -8px→0, 200ms ease-out

Inline transition (jump):
  exit:  opacity 1→0, 150ms ease-out
  enter: opacity 0→1, 150ms ease-out

Interstitial:
  appear: opacity 0→1, 300ms ease-out
  dismiss: opacity 1→0, 300ms ease-out

Reduced motion override:
  All above: duration 0ms, translateY 0
```

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft -- unify 3 animation styles into one consistent system |
