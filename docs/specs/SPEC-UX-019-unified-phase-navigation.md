# SPEC-UX-019: Unified Phase Navigation -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (cross-cutting UX infrastructure)
**Created**: 2026-03-16
**Last Updated**: 2026-03-16

---

## 0. Audit Summary -- Current State

Before defining the target experience, this section documents the broken baseline that this spec replaces.

### 0.1 Three Progress Bar Components (Must Become One)

| Component | File | Used In | Visual | Touch Target | Issues |
|---|---|---|---|---|---|
| `PhaseProgressBar` | `PhaseProgressBar.tsx` | Phase 1, Phase 2, Phase 4 | Filled dots -- gold for complete, muted for pending | 32x8px (FAILS 44px) | Step-level only. No phase context. No navigation. |
| `ExpeditionProgressBar` | `ExpeditionProgressBar.tsx` | Phase 2-6 (not Phase 1) | Colored bars -- teal=past, gold=current, muted=future | 24x8px (FAILS 44px) | Clickable but targets are 24x8px. Missing from Phase 1. |
| `DashboardPhaseProgressBar` | Dashboard cards only | ExpeditionCard | Segmented bar with icons | ~48x10px (height FAILS) | Read-only on dashboard -- correct. Labels hidden on mobile. Phases 7-8 show construction icon at 8px text -- unreadable. |

**Root problem**: Phase 1 has no expedition-level progress bar. Phase 6 has no back navigation. All phase-level bars have click targets below the 44px minimum. There is no unified "phase shell" wrapping all phases.

### 0.2 Inconsistent Phase Layouts

| Phase | Progress Bar(s) | Header Align | Back Button | Max Width | Footer |
|---|---|---|---|---|---|
| Phase 1 | PhaseProgressBar only | Centered | Arrow char (no aria-label) | max-w-md | WizardFooter |
| Phase 2 | PhaseProgressBar + ExpeditionProgressBar | Centered | Arrow char (no aria-label) | max-w-md | WizardFooter |
| Phase 3 | ExpeditionProgressBar only | Centered | WizardFooter "Voltar" | max-w-md | WizardFooter |
| Phase 4 | PhaseProgressBar + ExpeditionProgressBar | Centered | WizardFooter "Voltar" | max-w-2xl (inconsistent) | WizardFooter |
| Phase 5 | ExpeditionProgressBar only | Centered | WizardFooter "Voltar" | max-w-md | WizardFooter |
| Phase 6 | ExpeditionProgressBar only | Left-aligned (inconsistent) | None | max-w-4xl | WizardFooter |

### 0.3 Phase Transition Issues

- `PointsAnimation` auto-dismisses at 2.5s with no user control, no focus trap, and no tap-to-continue button.
- `PhaseTransition` auto-advances after 3s countdown. Users can cancel but the affordance is tiny text at `/70` opacity.
- Neither component fully respects `prefers-reduced-motion`.

### 0.4 Revisit Behavior

- Phase 1 and Phase 2 accept `savedData` props and pre-populate fields. This works.
- Phase 3 loads checklist state from server. This works.
- Phase 4 loads transport/accommodation/mobility from server. This works but the step selector resets to step 1 on every load regardless of completion state.
- Phase 5 and Phase 6 have no revisit pre-population for their primary content.
- No phase shows a visual indicator that the traveler is in "edit mode" vs. "first visit mode".

---

## 1. Traveler Goal

Navigate confidently through a 6-phase expedition, always knowing which phase they are on, which phases are complete, and how to move forward, backward, or revisit any completed phase.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Clear progress tracking reduces anxiety and builds momentum through the planning journey. Can revisit any phase without fear of losing data. |
| `@leisure-family` | Families often plan in multiple sessions. Consistent navigation and state preservation lets them pick up where they left off without confusion. |
| `@business-traveler` | Speed and efficiency: can jump directly to the phase they need to edit without stepping through every previous phase. |
| `@bleisure` | May extend a trip mid-planning. Easy phase revisit lets them adjust dates, accommodation, or itinerary without restarting. |
| `@group-organizer` | Manages complexity across multiple travelers. Clear phase completion status helps them track what is done vs. what needs attention. |

## 3. User Flow

### 3.1 Happy Path -- First-Time Linear Progression

```
/expeditions (trip list)
    |
    v
[Click "New Expedition" or resume existing]
    |
    v
/expedition/{tripId} (Phase 1)
    |--- PhaseShell renders: UnifiedProgressBar (Phase 1 highlighted)
    |                        Phase 1 content
    |                        WizardFooter (no back on Phase 1 step 1)
    |
    v (complete Phase 1)
[PointsOverlay: tap to continue OR auto-dismiss 5s]
    |
    v
[PhaseTransition: celebration card, then "Continue" button. Auto-advance 3s.]
    |
    v
/expedition/{tripId}/phase-2
    |--- PhaseShell renders: UnifiedProgressBar (Phase 1=completed, Phase 2=current)
    |                        Phase 2 content
    |                        WizardFooter (back goes to Phase 1)
    |
    v (repeat through Phase 6)
    |
    v (complete Phase 6)
/expedition/{tripId}/summary
```

### 3.2 Alternative Path -- Revisit Completed Phase

```
/expedition/{tripId}/phase-4 (currently on Phase 5)
    |
    v
[PhaseShell: UnifiedProgressBar (1-4=completed, 5=current)]
[Edit banner: "Voce esta revisitando esta fase. Suas alteracoes serao salvas quando voce confirmar."]
[Phase 4 content pre-populated with saved data]
[WizardFooter: "Salvar alteracoes" primary, "Cancelar" secondary]
    |
    +--> [Save] --> toast "Alteracoes salvas" --> navigate to referrer
    |
    +--> [Cancel] --> navigate back without saving
```

### 3.3 Alternative Path -- Direct URL Access

```
User types /expedition/{tripId}/phase-4
    |
    +--> If Phase 4 is accessible (current or completed): render normally
    |
    +--> If Phase 4 is locked (user is on Phase 2): redirect to current phase
         with toast "Complete a Fase 2 antes de avancar para a Fase 4"
```

### 3.4 Error Paths

```
[Phase completion fails (server error)]
    |
    v
[Error banner: "Nao foi possivel salvar o progresso. Verifique sua conexao e tente novamente."]
[WizardFooter primary button re-enabled for retry]
[No data lost -- form state preserved in client]

[Phase data load fails (revisit)]
    |
    v
[ErrorBoundaryCard with retry button]
[Fallback: show empty form with warning "Nao foi possivel carregar seus dados anteriores"]
```

---

## 4. Screen Descriptions

### 4.1 Component: UnifiedProgressBar

**Purpose**: Replace all three progress bar components with a single component that shows expedition-level progress on every phase page (1-6). This is the traveler's "you are here" map.

**Layout**:
- Horizontal bar with 6 segments (Phases 1-6 only; Phases 7-8 do not appear here -- they show only on dashboard cards)
- Each segment is a labeled, interactive element
- Desktop: segments are rounded rectangles with phase name below
- Mobile: segments are circles with phase number inside, current phase name shown as a label below the bar

**Visual States for Each Segment**:

| State | Fill | Icon | Border | Interaction |
|---|---|---|---|---|
| Completed | Solid gold (#F59E0B) | Checkmark | None | Click navigates to that phase (edit mode) |
| Current | Solid navy (#1A3C5E) with subtle pulse | Phase number (white) | None | Click scrolls to top of current content |
| Available | No fill (transparent) | Phase number (muted) | Solid 2px #5C6B7A | Click navigates to that phase |
| Locked | Gray fill at 30% opacity | Lock icon | Dashed 2px #9BA8B5 | Hover/focus shows tooltip |

**Segment Size (touch targets)**:
- Desktop: minimum 48px wide x 48px tall (including label area below)
- Mobile: 44x44px circles, 8px gap between
- Connecting lines between segments are decorative (2px, muted color), `aria-hidden="true"`

**Responsive Behavior**:

| Breakpoint | Layout |
|---|---|
| Mobile (< 768px) | 6 circles in a row, connected by thin lines. Phase number inside circle. Current phase name shown as label below the entire bar. Other names hidden. |
| Tablet (768-1024px) | 6 rounded rectangles, abbreviated phase name below each. |
| Desktop (> 1024px) | 6 rounded rectangles with full phase name below. Generous spacing. |

**Keyboard Navigation**:
- The bar is wrapped in `role="navigation"` with `aria-label="Progresso da expedicao"`
- Each segment is a focusable element (link for completed/available, button for current, inert span for locked)
- Arrow Left/Right moves focus between segments
- Enter/Space activates the focused segment
- Screen reader announces: "{Phase name}, fase {N} de 6, {state}"

**Loading State**: 6 skeleton rectangles (gray pulse animation) while trip data loads

**Error State**: If phase data cannot be determined, show all segments in "available" state with no completion markers and a subtle warning icon

### 4.2 Component: PhaseShell

**Purpose**: A consistent wrapper that every phase page (1-6) renders inside. Eliminates the per-phase layout inconsistencies documented in Section 0.2.

**Layout (top to bottom)**:
1. **UnifiedProgressBar** (pinned at top, above scroll content)
2. **StepProgressIndicator** (conditional -- only for multi-step phases)
3. **Phase header**: centered h1 title + p subtitle, consistent CSS across all phases
4. **Edit mode banner** (conditional -- only when revisiting a completed phase)
5. **Phase content area** (scrollable, wizard steps live here)
6. **WizardFooter** (sticky at bottom)

**Content width**: `max-w-2xl` for all phases. Phase 6 uses `max-w-4xl` for the itinerary editor, but the progress bar and header still use `max-w-2xl`.

**Edit Mode Banner**:
- Background: info blue (#EFF6FF), left accent border 4px solid #3B82F6
- Text: "Voce esta revisitando a Fase {N}. Suas alteracoes serao salvas quando voce confirmar."
- Persistent while in edit mode (not dismissible)
- `role="status"` with `aria-live="polite"`

**WizardFooter Rules**:

| Context | Back Button | Primary Button Label |
|---|---|---|
| Phase 1, Step 1 (first visit) | Hidden | "Proximo" |
| Phase 1, Steps 2-4 | Shows, goes to previous step | "Proximo" (2-3), "Avancar" (4) |
| Phase 2-6, Step 1 | Shows, goes to previous phase | "Proximo" or "Avancar" (last step) |
| Phase 2-6, Steps 2+ | Shows, goes to previous step | "Proximo" or "Avancar" (last step) |
| Any phase, edit mode | "Cancelar" (secondary) | "Salvar alteracoes" |
| Phase 6 | Custom footer allowed (Generate / Complete actions) | N/A |

### 4.3 Component: StepProgressIndicator

**Purpose**: For multi-step phases (Phase 1 = 4 steps, Phase 2 = 7 steps, Phase 4 = 3 steps), show sub-step progress below the UnifiedProgressBar.

**Layout**:
- Small horizontal dots, centered
- Text: "Passo {current} de {total}"
- Dots: completed = gold, current = primary, future = muted

**Replaces**: The existing `PhaseProgressBar` component. Renamed to avoid confusion with the expedition-level `UnifiedProgressBar`.

**Visibility**: Only shown for phases with more than 1 step. Phase 3, 5, 6 (single-action phases) do not show this.

### 4.4 Phase Transition Flow (Revised)

**On Phase Completion (first visit, happy path)**:

1. Server returns success with points/badge/rank data
2. **PointsOverlay** appears:
   - Full-screen semi-transparent overlay (`bg-black/50`)
   - **Focus trapped inside** (fixes current bug)
   - Shows: points earned (large text), badge name (if earned), rank change (if promoted)
   - **"Continuar" button always visible** (fixes current no-button issue)
   - Auto-dismiss after **5 seconds** (increased from 2.5s)
   - `prefers-reduced-motion`: instant display, no fade, still requires tap or 5s timer
   - `aria-modal="true"`, `aria-labelledby` pointing to the points text
3. On dismiss, **PhaseTransition** dialog appears:
   - Celebration emoji, then after 1.2s shows rocket emoji with next phase name
   - "Continuar" button (large, prominent)
   - Auto-advance countdown: 3 seconds, shown as subtle text below button
   - Backdrop click cancels auto-advance but does NOT dismiss
   - `prefers-reduced-motion`: skip celebration, show advance card immediately
   - Keyboard: Enter/Space activates "Continuar". Escape cancels auto-advance.
4. Navigate to next phase

**On Phase Completion (edit mode)**:
- No PointsOverlay (no points awarded for edits)
- No PhaseTransition
- Toast: "Alteracoes salvas com sucesso"
- Navigate back to referrer

---

## 5. Interaction States Table

This is the definitive behavioral specification. Implementation must match this table exactly.

### 5.1 Progress Bar Interactions

| User Action | Segment State | Expected Behavior |
|---|---|---|
| Click completed segment | Completed | Navigate to `/expedition/{tripId}/phase-{N}` in edit mode |
| Click current segment | Current | Smooth scroll to top of phase content. No navigation. |
| Click available segment | Available | Navigate to `/expedition/{tripId}/phase-{N}` |
| Click locked segment | Locked | No navigation. Show tooltip "Complete a Fase {N-1} para desbloquear" for 3s. |
| Hover completed segment | Completed | Phase name + "Concluida". Cursor pointer. Subtle translateY(-2px) lift. |
| Hover current segment | Current | Phase name + "Atual". Cursor default. No lift. |
| Hover available segment | Available | Phase name + "Disponivel". Cursor pointer. Subtle lift. |
| Hover locked segment | Locked | Phase name + "Bloqueada". Cursor not-allowed. No lift. |
| Focus (keyboard) any segment | Any | 2px solid focus ring (primary color), 2px offset. SR announces state. |
| Arrow Right from segment N | Any | Move focus to segment N+1 (wrap to 1 after 6). |
| Arrow Left from segment N | Any | Move focus to segment N-1 (wrap to 6 from 1). |
| Enter/Space on completed | Completed | Navigate in edit mode. |
| Enter/Space on current | Current | Scroll to top. |
| Enter/Space on available | Available | Navigate. |
| Enter/Space on locked | Locked | Announce tooltip via `aria-live`. No navigation. |

### 5.2 Forward Navigation (Within Phase)

| User Action | Phase/Step State | Expected Behavior |
|---|---|---|
| Click "Proximo" (valid) | Step M, not last step | Validate. If valid: save step data, slide-left to step M+1, focus first input. |
| Click "Proximo" (invalid) | Step M | Show inline field errors via `aria-describedby`. Focus first errored field. Do not advance. |
| Click "Avancar" (valid, last step) | Final step, first visit | Submit to server. On success: PointsOverlay + PhaseTransition. On error: banner + re-enable button. |
| Click "Salvar alteracoes" | Edit mode | Submit to server. On success: toast + navigate back. On error: banner + re-enable button. |
| Double-click any primary button | Any | Prevented. Button disabled on first click (`isLoading=true`). |

### 5.3 Back Navigation

| User Action | Phase/Step State | Expected Behavior |
|---|---|---|
| Click "Voltar" | Phase 1, Step 1 | Hidden. Not rendered. |
| Click "Voltar" | Phase 1, Step 2+ | Previous step (slide-right). Preserve form data. |
| Click "Voltar" | Phase 2-6, Step 1 | Navigate to previous phase (view mode, not edit). |
| Click "Voltar" | Phase 2-6, Step 2+ | Previous step (slide-right). Preserve form data. |
| Click "Cancelar" | Edit mode, any changes | Discard changes. Navigate back. No confirmation (explicit cancel = user intent). |
| Click "Cancelar" | Edit mode, no changes | Navigate back immediately. |
| Browser back button | Unsaved changes present | `beforeunload` confirmation dialog. |
| Browser back button | No unsaved changes | Normal browser back. |

### 5.4 Phase Completion (First Visit)

| Phase | Points | Badge | Rank | Next Destination |
|---|---|---|---|---|
| Phase 1 | 100 | first_step | -- | Phase 2 |
| Phase 2 | 150 | -- | explorer | Phase 3 |
| Phase 3 | 75 | navigator | -- | Phase 4 |
| Phase 4 | 50 | logistics_master | -- | Phase 5 |
| Phase 5 | 40 | -- | cartographer | Phase 6 |
| Phase 6 | 250 | treasurer | -- | Summary page (no PhaseTransition for final phase) |

### 5.5 Direct URL Access

| URL Target | User's Current Phase | Expected Behavior |
|---|---|---|
| `/expedition/{id}` (Phase 1) | Any | Always accessible. Completed: edit mode. Current: normal. |
| `/expedition/{id}/phase-2` | Phase 1 (incomplete) | Redirect to Phase 1. Toast: "Complete a Fase 1 primeiro". |
| `/expedition/{id}/phase-2` | Phase 2 (current) | Normal mode. |
| `/expedition/{id}/phase-2` | Phase 3+ | Edit mode (Phase 2 completed). |
| `/expedition/{id}/phase-{N}` (blocking) | Phase < N | Redirect to current phase. Toast with message. |
| `/expedition/{id}/phase-{N}` (non-blocking: 3, 4) | Any | Allow access. Non-blocking phases are always reachable. |
| `/expedition/{id}/summary` | Phase < 6 complete | Redirect to current phase. Toast: "Complete todas as fases para ver o resumo". |
| `/expedition/{id}/summary` | Phase 6 complete | Normal access. |

### 5.6 Phase Revisit

| User Action | Context | Expected Behavior |
|---|---|---|
| Click completed segment in bar | Viewing any phase | Navigate in edit mode. Banner appears. Fields pre-populated. |
| Edit a field | Revisiting Phase N | No auto-save. Changes held in client state until explicit save. |
| Click "Salvar alteracoes" | Edit mode, changes | Submit. Toast on success. Navigate back. |
| Click "Cancelar" | Edit mode, changes | Discard. Navigate back. No dialog. |
| Click "Cancelar" | Edit mode, no changes | Navigate back immediately. |
| Navigate away (browser) | Edit mode, unsaved changes | `beforeunload` dialog. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] UnifiedProgressBar wrapped in `role="navigation"` with `aria-label`
- [x] Arrow Left/Right navigates between phase segments
- [x] Enter/Space activates focused segment
- [x] Tab order: ProgressBar > StepProgressIndicator > Phase content > WizardFooter
- [x] Focus indicator: 2px solid ring, primary color, 2px offset
- [x] Focus trapped inside PointsOverlay and PhaseTransition dialogs
- [x] Escape cancels auto-advance in PhaseTransition (does not dismiss)
- [x] No keyboard traps

### Screen Reader
- [x] Segments announce: "{Phase name}, fase {N} de 6, {state}"
- [x] State labels: "concluida" / "atual" / "disponivel" / "bloqueada" (via i18n)
- [x] Phase transitions: `aria-live="assertive"` for navigation announcements
- [x] Edit mode banner: `role="status"` with `aria-live="polite"`
- [x] Step changes: `aria-live="polite"` with "Passo {M} de {T}"
- [x] Errors linked to fields via `aria-describedby`
- [x] PointsOverlay: `aria-modal="true"` + `aria-labelledby`
- [x] Locked tooltip: announced via `aria-live="polite"`
- [x] Decorative lines and emojis: `aria-hidden="true"`

### Color and Contrast
- [x] Completed gold (#F59E0B) icon: passes 3:1 for graphical objects. Text labels use #1A1A2E (passes 4.5:1).
- [x] Current navy (#1A3C5E) on white: 9.7:1 (passes AAA)
- [x] Available border (#5C6B7A) on white: 5.1:1 (passes 3:1 for UI components)
- [x] Locked gray (#9BA8B5) on white: 2.8:1 -- mitigated by lock icon + dashed border (not color alone)
- [x] No information conveyed by color alone: every state uses unique icon (checkmark / number / number / lock) AND unique border style (solid / solid / outlined / dashed)

### Motion
- [x] All animations respect `prefers-reduced-motion: reduce`
- [x] Reduced motion: PointsOverlay instant (no fade), PhaseTransition skips celebration, step transitions instant
- [x] Pulse on current segment disabled under reduced motion
- [x] Auto-advance countdown preserved (informational, not animated)

### Touch
- [x] All progress bar segments: minimum 44x44px
- [x] Spacing between segments: minimum 8px
- [x] WizardFooter buttons: minimum 48px height
- [x] Locked segment tooltip triggered on tap (not just hover)

---

## 7. Content and Copy

### Key Labels and CTAs

| Key | PT-BR | EN |
|---|---|---|
| `progress.phaseLabel` | Fase {N} de 6 | Phase {N} of 6 |
| `progress.completed` | Concluida | Completed |
| `progress.current` | Atual | Current |
| `progress.available` | Disponivel | Available |
| `progress.locked` | Bloqueada | Locked |
| `progress.lockedTooltip` | Complete a Fase {N} para desbloquear | Complete Phase {N} to unlock |
| `progress.ariaLabel` | Progresso da expedicao | Expedition progress |
| `wizard.next` | Proximo | Next |
| `wizard.advance` | Avancar | Advance |
| `wizard.back` | Voltar | Back |
| `wizard.cancel` | Cancelar | Cancel |
| `wizard.saveChanges` | Salvar alteracoes | Save changes |
| `wizard.saving` | Salvando... | Saving... |
| `editBanner.message` | Voce esta revisitando a Fase {N}. Suas alteracoes serao salvas quando voce confirmar. | You are revisiting Phase {N}. Your changes will be saved when you confirm. |
| `toast.changesSaved` | Alteracoes salvas com sucesso | Changes saved successfully |
| `toast.phaseLocked` | Complete a Fase {N} antes de avancar | Complete Phase {N} before advancing |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Server error on completion | Nao foi possivel salvar o progresso. Verifique sua conexao e tente novamente. | Could not save progress. Check your connection and try again. |
| Data load failure (revisit) | Nao foi possivel carregar seus dados anteriores. Voce pode preencher novamente. | Could not load your previous data. You can fill in again. |
| Step validation error | Corrija os campos destacados antes de continuar. | Fix the highlighted fields before continuing. |
| Unsaved changes guard | Voce tem alteracoes nao salvas. Deseja sair? | You have unsaved changes. Do you want to leave? |

### Tone of Voice
- Phase navigation is about confidence and momentum. Copy should encourage, never scold.
- Locked state messages explain what to do ("Complete a Fase X"), never say "you cannot".
- Edit mode banner is calm and informational (blue, not warning yellow or error red).
- Celebrations are warm and brief, never over-the-top.

---

## 8. Constraints

**From phase-config.ts**:
- Phases 3 and 4 are `nonBlocking: true`. Users may access them even if previous phases are incomplete. The progress bar must handle this: non-blocking phases can be "available" even when the previous phase is not complete.
- Phases 7-8 do not appear in UnifiedProgressBar. They exist only on dashboard cards.
- Phase 6 needs `max-w-4xl` for the itinerary editor. PhaseShell must accommodate this while keeping the progress bar and header at standard width.

**Technical**:
- All phase pages are server components rendering client wizard components. PhaseShell must be a client component (needs router, translations, interactivity).
- Phase data loading is server-side. PhaseShell receives phase state as props.
- Phase completion uses explicit server actions, not auto-save.

---

## 9. Components to Create / Replace

### New Components

| Component | Replaces | Purpose |
|---|---|---|
| `UnifiedProgressBar` | `ExpeditionProgressBar` | Single expedition progress + navigation for all phase pages |
| `PhaseShell` | Per-phase inline layout code | Consistent wrapper for all 6 phase pages |
| `StepProgressIndicator` | `PhaseProgressBar` | Within-phase step dots (multi-step phases only) |
| `EditModeBanner` | Nothing (new) | Info banner for phase revisit context |

### Components to Deprecate

| Component | Action |
|---|---|
| `PhaseProgressBar` | Replace with `StepProgressIndicator`. Delete after migration. |
| `ExpeditionProgressBar` | Replace with `UnifiedProgressBar`. Delete after migration. |

### Components to Keep (with fixes)

| Component | Fixes Needed |
|---|---|
| `WizardFooter` | No changes. PhaseShell passes correct props. |
| `PhaseTransition` | Add focus trap. Already has 3s auto-advance (keep). |
| `PointsAnimation` | Add focus trap. Add "Continuar" button. Increase to 5s auto-dismiss. |
| `DashboardPhaseProgressBar` | Keep on dashboard cards (different context, read-only). |

---

## 10. Migration Checklist

- [ ] **Phase1Wizard**: Remove inline `PhaseProgressBar`. Wrap in `PhaseShell`. Widen to `max-w-2xl`. Add edit mode.
- [ ] **Phase2Wizard**: Remove inline `PhaseProgressBar` + `ExpeditionProgressBar`. Wrap in `PhaseShell`. Widen to `max-w-2xl`. Add edit mode.
- [ ] **Phase3Wizard**: Remove inline `ExpeditionProgressBar`. Wrap in `PhaseShell`. Widen to `max-w-2xl`. Add edit mode.
- [ ] **Phase4Wizard**: Remove inline `PhaseProgressBar` + `ExpeditionProgressBar`. Wrap in `PhaseShell`. Already `max-w-2xl`. Add edit mode.
- [ ] **Phase5Wizard**: Remove inline `ExpeditionProgressBar`. Wrap in `PhaseShell`. Widen to `max-w-2xl`. Add edit mode.
- [ ] **Phase6Wizard**: Remove inline `ExpeditionProgressBar`. Wrap in `PhaseShell` with `contentMaxWidth="4xl"`. Fix header from left-aligned to centered. Add edit mode.

---

## 11. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/unified-phase-navigation.html`
- **Scope**: Progress bar states, mobile + desktop layout, transition overlays, edit mode banner
- **Notes**: To be created as a follow-up. This spec prioritizes the behavioral specification because the 60% manual failure rate is primarily a logic/state issue, not a visual one.

---

## 12. Open Questions

- [ ] **Content width change**: Widening Phases 1-3 and 5 from `max-w-md` (448px) to `max-w-2xl` (672px) improves consistency but makes form inputs wider on desktop. Should form fields use an inner `max-w-md` container while the shell stays at `max-w-2xl`? **Needs: architect + ux-designer**
- [ ] **Non-blocking phase access**: Phases 3 and 4 are non-blocking. Should the progress bar show them as "available" even when Phase 2 is not complete, or follow linear lock? **Needs: product-owner**
- [ ] **Phase 6 footer override**: Phase 6 has unique actions. Should PhaseShell accept a `renderFooter` prop, or should Phase 6 opt out of PhaseShell's footer? **Needs: architect**
- [ ] **PointsOverlay timing**: This spec proposes 5 seconds (up from 2.5s). Product-owner previously approved 3s for PhaseTransition. Should PointsOverlay use the same 3s or longer 5s? **Needs: product-owner**

---

## 13. Patterns Used

**From `docs/ux-patterns.md`**: WizardFooter, PhaseTransition, PointsAnimation, Toast, ErrorBoundaryCard

**New patterns introduced**: UnifiedProgressBar, PhaseShell, StepProgressIndicator, EditModeBanner

---

> **Spec Status**: Draft
> Ready for: Architect (pending resolution of open questions in Section 12)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-16 | ux-designer | Initial draft. Full audit + unified navigation spec with complete interaction states table. |
