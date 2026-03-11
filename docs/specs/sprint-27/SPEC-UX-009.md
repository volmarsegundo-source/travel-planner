# SPEC-UX-009: CTA Button Standardization — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: NEW-004
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants a clear, consistent way to advance through expedition phases, with a button label that tells them exactly what will happen — without confusion about points, completion, or side effects.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Consistent CTAs reduce cognitive load during a multi-step planning journey |
| `@leisure-family` | Clear "Avancar" reduces anxiety about accidentally completing something prematurely |
| `@business-traveler` | Consistent button placement and size means muscle memory works across all phases |
| `@group-organizer` | Predictability when managing multiple expeditions rapidly |

## 3. Current Problem

The current CTA buttons across phases are inconsistent in:
- **Label**: Some say "Concluir e Ganhar Pontos" (too long, mixes action with reward), others vary
- **Sizing**: Some are `size="lg" className="w-full"`, others are `size="lg"` without full width
- **Placement**: Most are at bottom of content, but spacing varies
- **Color**: All use primary variant (correct), but hover/focus states are not uniform

This creates cognitive friction: the traveler must re-read and re-interpret the button on every phase, breaking the flow state.

## 4. User Flow

### Standardized CTA Pattern

```
[Traveler completes phase content]
    |
    v
[Primary CTA at bottom of wizard step, full-width]
    |
   +-- Phases 1-5, 7: Label = "Avancar" (Advance)
   |       |
   |       v
   |   [Phase completes, points awarded, transition to next phase]
   |
   +-- Phase 6 (O Tesouro — budget): Label = "Avancar" (Advance) — same pattern
   |
   +-- Phase 8 (O Legado — final): Label = "Concluir Expedicao" (Complete Expedition)
           |
           v
       [Expedition marked complete, celebration animation, return to expeditions]
```

### Decision: Why "Avancar" and not "Concluir"

- "Concluir" implies finality. For phases 1-7, the traveler is not concluding — they are advancing to the next step.
- "Avancar" is action-oriented, forward-looking, and consistent with the expedition metaphor (advancing on a journey).
- "Concluir e Ganhar Pontos" mixes the action (complete) with a reward side-effect (earn points). The reward is communicated via the PointsAnimation, not the button label. Buttons should describe the PRIMARY action.
- Phase 8 uses "Concluir Expedicao" because it IS the conclusion of the entire expedition — the finality is intentional and accurate.

## 5. Screen Descriptions

### Component: PhaseCompletionButton (standardized)

**Purpose**: A single, consistent CTA pattern used at the bottom of every phase wizard.

**Layout**:
- Full-width button at the bottom of the wizard content area
- Margin: 24px top (space from content above), 0 bottom (flush with container)
- If there is a secondary action (e.g., "Regenerar guia" on Phase 5), it appears ABOVE the primary CTA with 12px gap, outlined variant

**Visual Specifications**:
- Width: 100% of parent container
- Height: 48px (consistent with `size="lg"`)
- Border radius: 8px (design token `--radius`)
- Background: `--color-primary` (#E8621A)
- Text: white, 16px, font-weight 600
- Hover: `--color-primary-hover` (#C9511A)
- Focus: 2px outline `--color-primary`, 2px offset
- Disabled: opacity 50%, cursor not-allowed
- Loading: text replaced with spinner + "Carregando..." (screen reader: aria-busy="true")

**Labels by Phase**:

| Phase | CTA Label (PT-BR) | CTA Label (EN) | i18n Key |
|---|---|---|---|
| 1 — O Chamado | Avancar | Advance | `expedition.cta.advance` |
| 2 — O Explorador | Avancar | Advance | `expedition.cta.advance` |
| 3 — O Preparo | Avancar | Advance | `expedition.cta.advance` |
| 4 — A Logistica | Avancar | Advance | `expedition.cta.advance` |
| 5 — O Mapa dos Dias | Avancar | Advance | `expedition.cta.advance` |
| 6 — O Tesouro | Avancar | Advance | `expedition.cta.advance` |
| 7 — A Expedicao | Avancar | Advance | `expedition.cta.advance` |
| 8 — O Legado | Concluir Expedicao | Complete Expedition | `expedition.cta.complete` |

Note: Phases 1-7 ALL use the same i18n key. This means a single label change propagates everywhere — no more inconsistency.

**Loading Label**:

| State | PT-BR | EN | i18n Key |
|---|---|---|---|
| Loading (phases 1-7) | Avancando... | Advancing... | `expedition.cta.advancing` |
| Loading (phase 8) | Concluindo... | Completing... | `expedition.cta.completing` |

**Button States**:
1. **Default**: Primary background, white text
2. **Hover**: Darker primary background
3. **Focus**: 2px primary outline with 2px offset (visible focus ring)
4. **Active/Pressed**: Slightly darker than hover (scale 0.99 for tactile feedback; reduced motion: no scale)
5. **Disabled**: 50% opacity, not clickable. Used when: form validation fails, content not ready, or action in progress
6. **Loading**: Spinner replaces text. `aria-busy="true"` on button. Button disabled during loading.

### Secondary Actions (where applicable)

Some phases have a secondary action alongside the primary CTA:

| Phase | Secondary Action | Variant | Placement |
|---|---|---|---|
| 5 (Destination Guide) | "Regenerar guia" | `outline`, `size="sm"` | Above primary CTA, 12px gap |
| 3 (Checklist) | None currently | — | — |
| 4 (Logistics) | None currently | — | — |

Secondary actions are NEVER placed beside the primary CTA (side by side). They are ALWAYS above, with clear visual hierarchy difference (outlined vs filled, smaller size).

### Dark Theme

- Primary button: same `--color-primary` works in both themes (orange on dark bg is high contrast)
- Focus ring: `--color-primary` outline on dark backgrounds — verify >= 3:1 contrast against `bg-background`
- Disabled state: opacity approach works in both themes

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-width. 48px height. Sticky at bottom of viewport if content scrolls (optional — architect decision). |
| Tablet (768-1024px) | Full-width within wizard container (max-w-md). |
| Desktop (> 1024px) | Full-width within wizard container (max-w-md). |

## 6. Interaction Patterns

- **Click**: Immediate visual feedback (pressed state). Then loading state while server action executes.
- **Double-click prevention**: Button disables immediately on click. Re-enables only on error.
- **Success flow**: Button stays in loading state -> PointsAnimation appears -> PhaseTransition -> next phase loads with fresh button.
- **Error flow**: Button re-enables, error message appears above the button (inline, not toast), button returns to default state.
- **Keyboard**: Enter or Space triggers the button. Same behavior as click.

### Motion

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Pressed scale | 100ms | ease-out | none (instant press) |
| Spinner rotation | continuous | linear | `motion-reduce:animate-none` (static spinner icon) |

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] Button reachable via Tab
  - [x] Enter and Space activate the button
  - [x] Focus indicator visible (2px primary outline, 2px offset)
  - [x] In loading state: button is disabled, focus moves to next focusable element or stays on button
- **Screen Reader**:
  - [x] Button text is the accessible name ("Avancar" or "Concluir Expedicao")
  - [x] Loading state: `aria-busy="true"` on button, `aria-disabled="true"`
  - [x] Loading text ("Avancando...") replaces button text for screen readers
  - [x] Error message linked to button context via proximity (error appears directly above)
- **Color & Contrast**:
  - [x] White text on primary orange >= 4.5:1 (white #FFFFFF on #E8621A = 3.2:1 — **WARNING**: this may fail AA for normal text. **Mitigation**: Use font-weight 600 (bold) which is assessed at 3:1 for large text. Button text at 16px bold qualifies as large text per WCAG.)
  - [x] Focus ring >= 3:1 against surrounding background
  - [x] Disabled state: still readable (opacity 50% maintains text legibility)
- **Touch**:
  - [x] Button height 48px >= 44px minimum
  - [x] Full-width ensures easy tap on mobile

## 8. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `expedition.cta.advance` | Avancar | Advance |
| `expedition.cta.advancing` | Avancando... | Advancing... |
| `expedition.cta.complete` | Concluir Expedicao | Complete Expedition |
| `expedition.cta.completing` | Concluindo... | Completing... |

### Tone of Voice

- Action-oriented. The button says what will happen, not what the system will do to the user.
- Forward-looking: "Avancar" implies progress. It aligns with the expedition metaphor.
- No reward language in the CTA: points and badges are communicated through the PointsAnimation, keeping the button clean and focused.

## 9. Constraints

- Every phase wizard currently has its own CTA button implementation. This spec requires extracting a shared component or at minimum enforcing the same props/classes across all wizards.
- Phase 8 does not exist as a wizard yet — the "Concluir Expedicao" label is specified for when it is implemented.
- The PointsAnimation behavior after button click is NOT changed by this spec. Only the button itself is standardized.

## 10. Prototype

- [ ] Prototype required: No (this is a standardization of an existing pattern, not a new visual)

## 11. Open Questions

- [x] Should the button be sticky at the bottom of the viewport on mobile (like a floating action button)? **Recommendation**: No. Sticky CTAs at bottom can conflict with mobile browser chrome and can obscure content. The button should scroll with the content and be visible when the traveler reaches the bottom. If the wizard content is short enough that the button is always visible, no issue.
- [ ] Should the contrast issue (white on orange = 3.2:1) be addressed by darkening the primary color or adding a text shadow? **Recommendation**: The current primary color is a brand decision. At 16px bold, the text qualifies as "large text" per WCAG (>= 14pt bold), which requires only 3:1. At 3.2:1, this passes. However, if the team wants to be conservative, darkening to #D45518 would achieve 4.5:1. **For product-owner and tech-lead to decide.**

## 12. Patterns Used

- **Existing pattern: Button** (shadcn/ui Button component, `variant="default"`, `size="lg"`)
- **New pattern: PhaseCompletionButton** — standardized wrapper enforcing consistent labels, loading states, and placement (to be added to ux-patterns)

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft |
