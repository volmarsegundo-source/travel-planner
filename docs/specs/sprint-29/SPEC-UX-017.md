---
id: SPEC-UX-017
title: Phase Revisit Edit Mode
status: draft
sprint: 29
author: ux-designer
created: 2026-03-12
---

# SPEC-UX-017: Phase Revisit Edit Mode -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (UX improvement for existing revisit behavior)
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Traveler Goal

The traveler wants to revisit a previously completed phase to update their plans, and they need clear visual cues that distinguish editing existing data from first-time entry -- so they feel confident they are modifying, not starting over.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Plans evolve -- a solo traveler might change dates or destination as they research more; needs to edit without anxiety about losing data |
| `@leisure-family` | Family logistics change frequently (school schedules, childcare); must update phases confidently |
| `@business-traveler` | Itineraries shift last-minute; needs to update transport or accommodation details quickly and return to the current phase |
| `@bleisure` | Extending a business trip into leisure means revisiting Phase 1 (dates), Phase 4 (accommodation), etc. frequently |

## 3. User Flow

### Happy Path -- Editing a Completed Phase

```
[Summary page or ExpeditionProgressBar]
    |
    v
[Traveler taps "Editar" link on a completed phase card]
    |
    v
[Phase wizard loads in EDIT MODE]
    |-- Edit mode banner visible at top
    |-- All fields pre-populated with saved data
    |-- WizardFooter shows "Salvar alteracoes" (not "Avancar")
    |-- Back button behavior: returns to summary (not previous phase)
    |
    v
[Traveler modifies one or more fields]
    |
    v
[Traveler taps "Salvar alteracoes"]
    |
    +--[Validation passes]--> [Save succeeds]
    |                              |
    |                              v
    |                         [Toast: "Alteracoes salvas com sucesso"]
    |                         [Navigate back to summary page]
    |
    +--[Validation fails]---> [Inline errors on fields, same as creation mode]
    |
    +--[Traveler taps "Cancelar" or back button]
         |
         v
    [No changes saved, navigate back to summary page]
```

### Alternative Path -- Editing a Phase with Multi-Step Wizard (e.g., Phase 4)

```
[Summary page: taps "Editar" on Phase 4]
    |
    v
[Phase 4 wizard loads in EDIT MODE at Step 1]
    |-- Edit mode banner visible
    |-- All 3 steps pre-populated with saved data
    |-- Step navigation works normally (can jump between steps)
    |-- User can modify any step independently
    |
    v
[Traveler navigates between steps, modifying data]
    |-- Each step auto-saves on step transition (existing behavior preserved)
    |
    v
[On final step, CTA is "Salvar alteracoes" (not "Avancar")]
    |
    v
[Save + navigate back to summary]
```

### Edge Case -- Phase Data Was Deleted Externally

If the traveler visits a phase marked as "completed" but the underlying data is missing (data inconsistency), the wizard should:
1. Show the edit mode banner (since the phase is marked completed)
2. Show empty fields (since data is missing)
3. Function as creation mode in practice (save creates new data)
4. No confirmation dialog needed -- saving is always safe

### Edge Case -- Navigating to a Phase Ahead of Current

Current behavior: Phase4Wizard already checks `isRevisiting = currentPhase > 4` and shows a "Go to current phase" button. This spec does NOT change that behavior. The edit mode banner only appears when the traveler explicitly enters via an "Editar" link or when `isRevisiting` is true.

## 4. Screen Descriptions

### Screen 1: Edit Mode Banner

**Purpose**: Immediately communicate to the traveler that they are modifying existing data, not creating new data. This reduces the anxiety of "will I lose my previous work?"

**Layout**:
- Positioned at the top of the wizard content area, below the phase header (PhaseProgressBar + phase label) and above the first form field
- Full width of the wizard content area
- Visually distinct from error banners -- uses an informational style, not a warning or error style

**Content**:
- Left-aligned icon: a pencil/edit icon (decorative, `aria-hidden="true"`)
- Text: "Voce esta editando dados ja salvos. Suas alteracoes so serao aplicadas ao confirmar."
- The text reassures the traveler that:
  1. They are in edit mode (not creating from scratch)
  2. Changes are not auto-saved until they explicitly confirm (for single-step phases)
  3. For multi-step phases (Phase 4): each step auto-saves on transition, which is the existing behavior and is communicated differently (see below)

**Visual treatment**:
- Background: `--color-info-bg` (#EFF6FF)
- Border: 1px solid `--color-info` (#3B82F6) at 30% opacity
- Border-radius: `--radius-md` (8px)
- Padding: 12px 16px
- Text color: `--color-text-primary`
- Icon color: `--color-info`

**For multi-step phases (Phase 4)**, the banner text changes to:
"Voce esta editando dados ja salvos. As alteracoes de cada etapa sao salvas automaticamente ao avancar."

This matches the existing auto-save behavior and prevents confusion.

### Screen 2: Modified WizardFooter in Edit Mode

**Purpose**: The footer CTA must clearly communicate that this action saves changes (not advances to a new phase).

**Changes from creation mode**:

| Aspect | Creation Mode | Edit Mode |
|---|---|---|
| Primary CTA label | "Avancar" | "Salvar alteracoes" |
| Primary CTA on final step | "Avancar" (or "Concluir Expedicio" on phase 8) | "Salvar alteracoes" |
| Back button behavior | Goes to previous step or previous phase | Goes to previous step; on step 1, navigates to summary |
| Secondary action | None | "Cancelar" (ghost button, navigates to summary without saving) |
| Loading state label | "Avancando..." | "Salvando..." |

**The WizardFooter component props already support this**:
- `primaryLabel` accepts a custom string
- `secondaryActions` accepts additional buttons
- `onBack` can be wired to navigate to summary

No changes to the WizardFooter component itself are needed. The consuming wizard components detect edit mode and pass different props.

### Screen 3: Pre-populated Form Fields

**Purpose**: Show the traveler their previously saved data so they can identify what to change.

**Behavior rules**:
- All fields are pre-populated with the latest saved values from the database
- Fields are fully editable (not read-only)
- No visual distinction on unchanged fields vs. changed fields (tracking diffs would add complexity without clear user benefit in this context)
- Autocomplete fields (destination, origin) show the saved text value but do not re-trigger the autocomplete dropdown on load
- Date fields show saved dates in the input
- Checkbox/toggle fields reflect saved state
- Multi-select fields (mobility) reflect saved selections

**What NOT to do**:
- Do not show a "diff view" or highlight changed fields -- this is a travel planner, not a version control system
- Do not disable fields that haven't changed -- the traveler should feel free to modify anything
- Do not require the traveler to confirm each individual change -- a single "Salvar alteracoes" at the end is sufficient

### Confirmation Before Overwriting

**Decision: No confirmation dialog for saving edits.**

Rationale:
1. The edit mode banner already communicates that existing data will be modified
2. The CTA label "Salvar alteracoes" is explicit about what will happen
3. Adding a "Are you sure?" dialog creates unnecessary friction for a non-destructive action (the old data is not permanently lost -- it is overwritten, but no cascading deletions occur)
4. The traveler can always edit again if they made a mistake

**Exception**: If a future feature introduces irreversible cascading effects (e.g., editing Phase 1 dates invalidates the entire itinerary), a confirmation dialog should be added at that point. For Sprint 29, no cascading effects exist.

### Unsaved Changes Guard

When the traveler has modified form fields but has not saved:
- If they tap "Cancelar" or the browser back button, show a browser-native `beforeunload` confirmation: "Voce tem alteracoes nao salvas. Deseja sair?"
- This uses the standard `beforeunload` event, not a custom modal
- The guard is only active when `isDirty` is true (form state has diverged from initial values)

## 5. Interaction Patterns

- **Screen transitions**: Entering edit mode is a standard route navigation (no special animation). The edit mode banner appears immediately without animation.
- **Loading feedback**: Form fields show their pre-populated values after the data loads. During loading, skeleton placeholders appear (same as creation mode loading state).
- **Success feedback**: Toast notification on successful save: "Alteracoes salvas com sucesso!" Auto-dismiss in 4 seconds.
- **Error feedback**: Inline validation errors on individual fields (same patterns as creation mode). Server errors shown as a banner above the form.
- **Animation**: No special animations for edit mode. Standard transition tokens apply.
- **Progressive disclosure**: Same as creation mode -- multi-step wizards show one step at a time.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [x] Edit mode banner is not focusable (informational, not interactive)
  - [x] Tab order unchanged from creation mode
  - [x] "Cancelar" button in footer is keyboard-accessible
  - [x] Focus indicator visible on all interactive elements
  - [x] No keyboard traps
- **Screen Reader**:
  - [x] Edit mode banner has `role="status"` so it is announced when the page loads
  - [x] Banner text clearly communicates edit mode context to screen reader users
  - [x] "Salvar alteracoes" button label is descriptive (no ambiguous "Submit")
  - [x] Form fields retain their existing label associations from creation mode
  - [x] Pre-populated values are read by screen readers as the field value (native behavior)
- **Color & Contrast**:
  - [x] Banner text (#1A1A2E) on info background (#EFF6FF): 14.2:1 (passes AAA)
  - [x] Banner border (#3B82F6 at 30% opacity) against background: decorative, not information-bearing
  - [x] No information conveyed by color alone -- the banner uses text + icon
- **Motion**:
  - [x] No animations specific to edit mode
- **Touch**:
  - [x] "Cancelar" button >= 44x44px touch target
  - [x] All other touch targets unchanged from creation mode

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `edit_banner_single` | Voce esta editando dados ja salvos. Suas alteracoes so serao aplicadas ao confirmar. | You are editing previously saved data. Your changes will only be applied when you confirm. |
| `edit_banner_multi` | Voce esta editando dados ja salvos. As alteracoes de cada etapa sao salvas automaticamente ao avancar. | You are editing previously saved data. Changes for each step are saved automatically when you advance. |
| `cta_save_changes` | Salvar alteracoes | Save changes |
| `cta_saving` | Salvando... | Saving... |
| `cta_cancel` | Cancelar | Cancel |
| `toast_save_success` | Alteracoes salvas com sucesso! | Changes saved successfully! |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| `save_failure` | Nao foi possivel salvar as alteracoes. Tente novamente. | Could not save your changes. Please try again. |
| `unsaved_changes` | Voce tem alteracoes nao salvas. Deseja sair? | You have unsaved changes. Do you want to leave? |

### Tone of Voice

- Reassuring: "Suas alteracoes so serao aplicadas ao confirmar" reduces anxiety about accidental overwrites
- Clear: "Salvar alteracoes" is unambiguous about the action
- Never punitive: if save fails, the message offers a path forward ("Tente novamente")

## 8. Constraints

- Edit mode is determined by URL query parameter or by detecting `isRevisiting` (currentPhase > phaseNumber), which Phase4Wizard already implements
- WizardFooter component already supports `primaryLabel`, `secondaryActions`, and `onBack` props -- no component changes needed
- Auto-save on step transition in Phase 4 is existing behavior and must be preserved in edit mode
- The `beforeunload` guard is a browser-native feature and does not require a custom modal component

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: Edit mode is a behavioral layer on top of existing wizard screens. The only new visual element is the edit mode banner, which is a simple informational card described fully in the spec.

## 10. Open Questions

- [ ] Should editing Phase 1 dates trigger a warning about potential impact on Phase 5 (destination guide) or Phase 6 (itinerary)? -- Architect to determine if cascading recalculations exist. If yes, add a warning banner (not a blocker).
- [ ] Should the system track edit history per phase? (e.g., "Last edited on March 10") -- Product Owner to decide. Not required for Sprint 29 MVP.

---

> **Spec Status**: Draft
> **Ready for**: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | ux-designer | Initial draft |
