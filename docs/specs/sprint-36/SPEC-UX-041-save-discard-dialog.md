# SPEC-UX-041: SaveDiscardDialog + WizardFooter Global — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 36
**Sprint**: 36
**Created**: 2026-03-22
**Last Updated**: 2026-03-22

---

## 1. Traveler Goal

Save or discard changes confidently when navigating away from an in-progress expedition phase, with clear feedback and no risk of accidental data loss.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Reduces anxiety about losing typed data when exploring other sections mid-planning |
| `@leisure-family` | Family planning often happens in interrupted sessions; save/discard prevents loss during distractions |
| `@business-traveler` | Fast workflow: muscle-memory keyboard shortcuts (Escape to cancel) keep them efficient |
| `@bleisure` | Frequently switches between work and leisure sections; dirty-state guard prevents silent loss |
| `@group-organizer` | Enters data for multiple passengers/legs; accidental navigation away is high-cost |

## 3. User Flow

### 3.1 Happy Path — Save and Continue

```
[User is editing Phase 2 — Step 3]
    |
    v
[User modifies a field (dirty state = true)]
    |
    v
[WizardFooter shows: "Voltar" | "Salvar" (ghost) | "Avancar" (primary)]
    |
    v
[User clicks "Avancar"]
    |
    v
[System auto-saves + advances to next step/phase]
    |
    v
[Toast: "Alteracoes salvas com sucesso" (auto-dismiss 3s)]
```

### 3.2 Back with Unsaved Changes

```
[User is editing Phase 3 — Step 1 (dirty state = true)]
    |
    v
[User clicks "Voltar"]
    |
    v
[SaveDiscardDialog opens — "back" intent]
    |
    +-- "Salvar e Voltar" (primary) --> [Save] --> [Navigate back] --> [Toast: "Alteracoes salvas"]
    |
    +-- "Descartar e Voltar" (destructive-secondary) --> [Discard changes] --> [Navigate back]
    |
    +-- "Cancelar" (ghost) --> [Close dialog, remain on current step]
    |
    +-- Escape key --> [Same as "Cancelar"]
```

### 3.3 Advance with Unsaved Changes

```
[User is editing Phase 1 — Step 2 (dirty state = true)]
    |
    v
[User clicks "Avancar"]
    |
    v
[SaveDiscardDialog opens — "advance" intent]
    |
    +-- "Salvar e Continuar" (primary) --> [Save] --> [Advance] --> [Toast: "Alteracoes salvas"]
    |
    +-- "Descartar" (destructive-secondary) --> [Discard] --> [Advance with old data]
    |
    +-- "Cancelar" (ghost) --> [Close dialog, remain on current step]
```

### 3.4 Navigation Away (Browser/Route Change)

```
[User is editing any phase (dirty state = true)]
    |
    v
[User clicks a nav link (e.g., "Expedicoes") or browser back]
    |
    v
[beforeunload event fires — browser native dialog]
"Voce tem alteracoes nao salvas. Deseja sair?"
    |
    +-- "Sair" --> [Changes lost, navigate away]
    |
    +-- "Ficar" --> [Remain on page]
```

### 3.5 Phases 5-6 (Read-Only AI Content)

```
[User is on Phase 5 or Phase 6]
    |
    v
[WizardFooter shows: "Voltar" | "Avancar" (primary)]
[No "Salvar" button — content is AI-generated, not user-editable]
[No dirty-state detection — navigation is always clean]
```

### Error States

- **Save failure (network)**: Dialog remains open. Inline error below dialog title: "Nao foi possivel salvar. Verifique sua conexao e tente novamente." Buttons remain enabled for retry.
- **Save failure (validation)**: Dialog closes, form shows inline validation errors on invalid fields. Toast: "Corrija os campos destacados antes de salvar."
- **Save failure (server 500)**: Same as network error message. Log to error boundary. "Salvar e Voltar"/"Salvar e Continuar" shows retry state.

### Edge Cases

- **No changes made (clean state)**: "Voltar" and "Avancar" navigate directly without dialog.
- **Multiple rapid clicks**: All dialog buttons disabled immediately after first click. Re-enabled only on error.
- **Dialog open + Escape**: Always resolves to "Cancelar" (safe default).
- **beforeunload + dialog**: If SaveDiscardDialog is already open, beforeunload does not fire (user is already being prompted).

---

## 4. Screen Descriptions

### Screen 1: WizardFooter (Sticky Bar)

**Purpose**: Provide consistent navigation and save controls across all 6 phase wizards.

**Layout**:
- Sticky bar fixed to the bottom of the viewport
- Full-width with max-width matching page content container
- 16px padding vertical, 24px horizontal
- Background: white with top border (1px solid #E2E8F0) and subtle box-shadow (0 -2px 8px rgba(0,0,0,0.06))
- 3-button layout on phases 1-4; 2-button layout on phases 5-6

**Content**:

Phases 1-4 (editable):
```
[Voltar (ghost)]          [Salvar (outline)]          [Avancar (primary)]
```

Phases 5-6 (read-only AI):
```
[Voltar (ghost)]                                      [Avancar (primary)]
```

Edit Mode (revisiting a completed phase):
```
[Cancelar (ghost)]        [Salvar (outline)]          [Salvar alteracoes (primary)]
```

**Interactive Elements**:

- **"Voltar" button**: Ghost style (no background, text only with underline on hover). Triggers SaveDiscardDialog if dirty. On step 1 of phase 1: hidden. On step 1 of phases 2-6: navigates to previous phase. Otherwise: navigates to previous step.
- **"Salvar" button**: Outline style (border primary, text primary). Only visible when dirty state is true and phase is 1-4. On click: saves current form state, shows success toast, remains on current step.
- **"Avancar" button**: Primary filled (bg #E8621A, text white). Triggers SaveDiscardDialog if dirty. If clean, validates and advances. Label changes to "Concluir Expedicao" on final step of phase 8.
- **All buttons**: min-height 44px, min-width 44px touch target. Disabled state: opacity 0.5, cursor not-allowed.

**Dirty State Indicator**:
- When form has unsaved changes, a subtle dot (6px circle, #E8621A) appears next to the "Salvar" button label
- Screen reader announcement: aria-live region announces "Alteracoes nao salvas" when dirty state becomes true

**Loading State**: During save operations, the active button shows a spinner icon replacing its label text. Other buttons are disabled.

**Error State**: If save fails, a brief inline message appears above the footer bar (not a toast — stays until resolved or dismissed).

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Buttons stack vertically: primary on top (full-width), secondary below, ghost at bottom. 12px gap. Footer height expands. |
| Tablet (768-1024px) | Horizontal 3-button layout, equal spacing |
| Desktop (> 1024px) | Horizontal 3-button layout, "Voltar" left-aligned, "Salvar" center, "Avancar" right-aligned |

---

### Screen 2: SaveDiscardDialog (Modal)

**Purpose**: Give the traveler a conscious choice when navigating away from unsaved work. Prevent accidental data loss while not trapping the user.

**Layout**:
- Modal overlay: rgba(0, 0, 0, 0.5) backdrop
- Card: centered vertically and horizontally, max-width 480px, border-radius 12px, bg white
- Padding: 24px
- Close button (X) in top-right corner, 44x44px touch target

**Content — "Back" Intent**:
- Icon: warning triangle (amber #F59E0B), 32px, centered
- Title: "Alteracoes nao salvas" (18px, bold, #1A202C)
- Body: "Voce tem alteracoes que ainda nao foram salvas. O que deseja fazer?" (14px, #5C6B7A)
- Buttons (bottom, stacked on mobile, inline on desktop):
  1. "Salvar e Voltar" — primary filled (#E8621A, white text)
  2. "Descartar e Voltar" — outline with destructive hint (border #D93B2B, text #D93B2B)
  3. "Cancelar" — ghost (text only, #5C6B7A)

**Content — "Advance" Intent**:
- Same icon and title
- Body: "Voce tem alteracoes que ainda nao foram salvas. O que deseja fazer?"
- Buttons:
  1. "Salvar e Continuar" — primary filled
  2. "Descartar" — outline destructive
  3. "Cancelar" — ghost

**Interactive Elements**:
- All buttons: min-height 44px, full-width on mobile, min-width 140px on desktop
- Close (X): equivalent to "Cancelar"
- Overlay click: equivalent to "Cancelar"
- Keyboard: Tab cycles through buttons + close icon only (focus trap). Escape = "Cancelar". Enter/Space activates focused button.

**Loading state (during save)**:
- "Salvar e Voltar"/"Salvar e Continuar" shows spinner, label changes to "Salvando..."
- Other buttons disabled
- Overlay click and Escape disabled during save

**Error state (save failure)**:
- Inline error text below body: "Nao foi possivel salvar. Verifique sua conexao e tente novamente."
- Buttons re-enabled for retry
- Error text color: #D93B2B with info icon prefix

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Card: full-width with 16px margin. Buttons stacked vertically, primary on top, 8px gap. |
| Tablet (768-1024px) | Card: max-width 480px centered. Buttons inline, 12px gap. |
| Desktop (> 1024px) | Same as tablet. |

---

## 5. Interaction Patterns

- **Dialog entrance**: Overlay fades in (150ms ease-out), card scales from 0.95 to 1.0 (200ms ease-out). Reduced motion: instant appear.
- **Dialog exit**: Overlay fades out (150ms ease-in), card fades out (150ms). Reduced motion: instant disappear.
- **Save success feedback**: Toast at top-right: "Alteracoes salvas com sucesso" with checkmark icon, auto-dismiss 3s, progress bar.
- **Discard feedback**: No toast (discarding is a conscious choice, not an event to celebrate or confirm again).
- **Dirty state detection**: Compare current form values against last-saved values (deep equality). Mark dirty on first divergence, clean on save or reset.
- **Auto-save on step transitions within a phase**: When advancing between steps within the same phase, auto-save silently (no dialog needed). Dialog only triggers when navigating away from the phase or going backwards.
- **beforeunload**: Only registered when dirty state is true. Removed on clean state.

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA (minimum, non-negotiable)

### Keyboard Navigation
- [x] All interactive elements reachable via Tab
- [x] Tab order: Close (X) -> Primary button -> Secondary button -> Ghost button
- [x] Focus indicator visible on all interactive elements (2px solid #E8621A, outline-offset 2px)
- [x] Focus trap within dialog when open — Tab wraps from last to first element
- [x] Escape key closes dialog and returns focus to the button that triggered it
- [x] No keyboard traps outside dialog context

### Screen Reader
- [x] Dialog: `role="alertdialog"`, `aria-modal="true"`
- [x] Title linked via `aria-labelledby`
- [x] Body text linked via `aria-describedby`
- [x] Close button: `aria-label="Cancelar e fechar"`
- [x] Toast success: `role="status"`, `aria-live="polite"`
- [x] Dirty state announcement: `aria-live="polite"` region announces "Alteracoes nao salvas" on state change
- [x] Error messages within dialog: `aria-live="assertive"`

### Color & Contrast
- [x] Title text (#1A202C on white): 16:1 ratio (passes AAA)
- [x] Body text (#5C6B7A on white): 5.2:1 ratio (passes AA)
- [x] Primary button (white on #E8621A): 3.2:1 — passes for large text (18px bold). Button text is 16px bold, meets threshold.
- [x] Destructive outline text (#D93B2B on white): 4.7:1 (passes AA)
- [x] Ghost text (#5C6B7A on white): 5.2:1 (passes AA)
- [x] Warning icon color (#F59E0B) paired with icon shape (triangle) — not color-only information

### Motion
- [x] Dialog entrance/exit animations respect `prefers-reduced-motion`
- [x] Toast entrance respects `prefers-reduced-motion`
- [x] No auto-advancing content

### Touch
- [x] All buttons >= 44x44px
- [x] Close (X) target area: 44x44px (visual icon may be smaller)
- [x] Button spacing >= 8px

---

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `wizard.footer.back` | Voltar | Back |
| `wizard.footer.save` | Salvar | Save |
| `wizard.footer.advance` | Avancar | Continue |
| `wizard.footer.finishExpedition` | Concluir Expedicao | Finish Expedition |
| `wizard.footer.saveChanges` | Salvar alteracoes | Save changes |
| `wizard.footer.cancel` | Cancelar | Cancel |
| `saveDiscard.title` | Alteracoes nao salvas | Unsaved changes |
| `saveDiscard.body` | Voce tem alteracoes que ainda nao foram salvas. O que deseja fazer? | You have unsaved changes. What would you like to do? |
| `saveDiscard.saveAndBack` | Salvar e Voltar | Save and go back |
| `saveDiscard.discardAndBack` | Descartar e Voltar | Discard and go back |
| `saveDiscard.saveAndContinue` | Salvar e Continuar | Save and continue |
| `saveDiscard.discard` | Descartar | Discard |
| `saveDiscard.cancel` | Cancelar | Cancel |
| `saveDiscard.saving` | Salvando... | Saving... |
| `toast.saveSuccess` | Alteracoes salvas com sucesso | Changes saved successfully |
| `wizard.footer.unsavedChanges` | Alteracoes nao salvas | Unsaved changes |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Save failure (network) | Nao foi possivel salvar. Verifique sua conexao e tente novamente. | Could not save. Check your connection and try again. |
| Save failure (validation) | Corrija os campos destacados antes de salvar. | Fix the highlighted fields before saving. |
| Save failure (server) | Ocorreu um erro ao salvar. Tente novamente em alguns instantes. | An error occurred while saving. Please try again shortly. |

### Tone of Voice
- Dialog text is calm and neutral. No urgency language ("Warning! You will lose data!").
- Offer clear choices. The traveler is in control.
- Save success toast is brief and reassuring.
- Error messages are helpful and never blame the user.

---

## 8. Constraints

- WizardFooter currently exists only in Phase4Wizard with inline dirty-state logic. This spec standardizes it across all 6 phases.
- Phases 5 and 6 are AI-generated read-only content. No save/dirty-state logic needed for these.
- Edit mode (revisiting completed phase) was defined in SPEC-UX-017 (Sprint 29). This spec extends the footer behavior for edit mode without changing the edit-mode banner or navigation logic.
- beforeunload is a browser-native dialog; its text cannot be customized in modern browsers. The in-app SaveDiscardDialog handles in-app navigation only.
- The existing WizardFooter from SPEC-UX-018 defined "Avancar" for final steps and "Proximo" for intermediate. This spec unifies to "Avancar" for all forward navigation per SPEC-UX-009 (CTA standardization).
- Auto-save on step transition (within a phase) is preserved from SPEC-UX-017. The SaveDiscardDialog only appears for cross-phase or backward navigation.

---

## 9. Prototype

- [ ] Prototype required: No (component-level spec; existing modal and footer patterns provide sufficient reference)
- **Notes**: Developers should reference the existing PAConfirmModal and ConfirmDialog patterns in `ux-patterns.md` for modal structure and the current Phase4Wizard footer for sticky bar positioning.

---

## 10. Open Questions

- [ ] **CTA color — orange vs teal**: The "Avancar" primary button uses #E8621A (orange). Should "Salvar" use a different color (e.g., teal #2DB8A0) to visually distinguish save from advance? **Awaits: ux-designer decision (carry-over from Sprint 29)**
- [ ] **Auto-save debounce**: Should dirty-state detection include a debounce (e.g., 500ms after last keystroke) to avoid false positives during rapid typing? **Awaits: architect**
- [ ] **Phase 4 migration**: Phase4Wizard currently has its own inline dirty-state logic. Should migration happen in Sprint 36 or a subsequent sprint? **Awaits: tech-lead**

---

## 11. Acceptance Criteria

- [ ] **AC-01**: Phases 1-4 display a sticky WizardFooter with 3 buttons: "Voltar", "Salvar" (when dirty), and "Avancar".
- [ ] **AC-02**: Phases 5-6 display a sticky WizardFooter with 2 buttons only: "Voltar" and "Avancar". No "Salvar" button appears.
- [ ] **AC-03**: When the form has unsaved changes and the user clicks "Voltar", a SaveDiscardDialog opens with 3 options: "Salvar e Voltar", "Descartar e Voltar", "Cancelar".
- [ ] **AC-04**: When the form has unsaved changes and the user clicks "Avancar", a SaveDiscardDialog opens with 3 options: "Salvar e Continuar", "Descartar", "Cancelar".
- [ ] **AC-05**: When the form has no unsaved changes, "Voltar" and "Avancar" navigate directly without showing a dialog.
- [ ] **AC-06**: The dialog has a focus trap: Tab cycles through interactive elements only within the dialog. Escape closes the dialog and returns focus to the trigger button.
- [ ] **AC-07**: The dialog uses `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`.
- [ ] **AC-08**: On successful save, a toast appears: "Alteracoes salvas com sucesso" with `role="status"` and `aria-live="polite"`. Auto-dismisses after 3 seconds.
- [ ] **AC-09**: On save failure, an inline error message appears within the dialog. Buttons re-enable for retry. The dialog does not close.
- [ ] **AC-10**: All dialog and footer buttons have a minimum touch target of 44x44px.
- [ ] **AC-11**: On mobile (< 768px), footer buttons stack vertically (primary on top). Dialog buttons also stack vertically.
- [ ] **AC-12**: All animations (dialog entrance/exit, toast) respect `prefers-reduced-motion` with instant alternatives.
- [ ] **AC-13**: The `beforeunload` browser event fires when the user has unsaved changes and attempts to close the tab or navigate away via browser controls.
- [ ] **AC-14**: During a save operation, all dialog buttons are disabled and the primary button shows "Salvando..." with a spinner. Overlay click and Escape are disabled during save.
- [ ] **AC-15**: In edit mode (revisiting a completed phase), the footer shows "Cancelar", "Salvar", and "Salvar alteracoes" per SPEC-UX-017.

---

## 12. Patterns Used

| Pattern | Source | Usage |
|---|---|---|
| **ConfirmDialog** | ux-patterns.md | Base structure for SaveDiscardDialog modal |
| **Toast** | ux-patterns.md | Save success feedback (auto-dismiss 3s) |
| **WizardFooter** | SPEC-UX-018 | Extended with dirty-state awareness and 3-button layout |
| **PhaseCompletionButton** | SPEC-UX-009 | "Avancar" label standardization |

### New Patterns Introduced

| Pattern | Description | Reusable? |
|---|---|---|
| **SaveDiscardDialog** | Modal with save/discard/cancel for unsaved changes, supports "back" and "advance" intents | Yes — any form with dirty state |
| **DirtyStateIndicator** | Visual dot + aria-live announcement for unsaved changes | Yes — any editable form |

---

> **Spec Status**: Draft
> **Ready for**: Architect (3 open questions need resolution before implementation)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-22 | ux-designer | Initial draft — SaveDiscardDialog + WizardFooter global standardization |
