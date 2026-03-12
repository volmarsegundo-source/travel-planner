---
id: SPEC-UX-018
title: WizardFooter Integration Across Phases
status: draft
sprint: 29
author: ux-designer
created: 2026-03-12
---

# SPEC-UX-018: WizardFooter Integration Across Phases -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (standardization of existing CTA patterns)
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Traveler Goal

The traveler wants a consistent, predictable navigation experience across all phase wizards -- the same position, same button style, same behavior for back/forward/save actions -- so they can focus on planning their trip rather than re-learning how each phase works.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Consistency reduces cognitive load; the traveler learns the pattern once and trusts it across all phases |
| `@leisure-family` | Multi-session planning (common with families) benefits from predictable navigation -- they pick up where they left off without confusion |
| `@business-traveler` | Speed and efficiency; a consistent footer means muscle memory works across phases |
| `@bleisure` | Navigates between multiple phases frequently; inconsistent CTAs would slow them down |

## 3. Current State Audit

Before defining the integration, here is an audit of current CTA patterns across phases:

### Phase 1 (Phase1Wizard.tsx)
- **Steps**: 4 (About You -> Destination -> Dates -> Confirmation)
- **Back button**: Arrow character in a flex-1 `Button variant="outline"` with `aria-label={tCommon("back")}`
- **Forward button**: `tCommon("next")` in a flex-[3] `Button`
- **Final step CTA**: `tExpedition("cta.advance")` / `tExpedition("cta.advancing")` in a flex-[3] `Button size="lg"`
- **Step 1 back**: Not shown (correct -- first step of first phase)
- **Issues**: Back button uses arrow character instead of text label; inconsistent flex ratios; no sticky footer

### Phase 4 (Phase4Wizard.tsx)
- **Steps**: 3 (Transport -> Accommodation -> Mobility+Advance)
- **Back button**: Arrow character in flex-1 `Button variant="outline"` with `aria-label`
- **Forward button**: `tCommon("next")` in flex-[3] `Button`
- **Step 1 back**: Navigates to Phase 3 (previous phase), labeled "back-to-phase-3"
- **Final step CTA**: `tExpedition("cta.advance")` in a separate full-width `Button size="lg"` below the step navigation
- **Edit mode CTA**: `t("goToCurrentPhase")` when revisiting
- **Issues**: CTA is visually separated from navigation buttons on step 3; arrow character; no sticky footer

### Other Phases (2, 3, 5, 6)
- Similar patterns with minor variations
- All use ad-hoc button layouts instead of the WizardFooter component

### WizardFooter Component (current implementation)
- Sticky bottom footer with border-top
- Left side: optional back button (`variant="outline"`)
- Right side: optional secondary actions (ghost buttons) + primary CTA (`bg-atlas-teal`)
- Loading state: spinner + "Salvando..." text
- Disabled state via `isDisabled` prop
- Back button uses `tCommon("back")` text (not an arrow character)
- Already follows accessibility best practices

## 4. Integration Mapping

### Phase 1: O Chamado (4 steps)

| Step | onBack | primaryLabel | isLoading | isDisabled | secondaryActions | Notes |
|---|---|---|---|---|---|---|
| 1 | `undefined` (not shown) | "Proximo" | false | false | none | First step of first phase -- no back button |
| 2 | `goToStep(1)` | "Proximo" | false | `!destination.trim()` | none | |
| 3 | `goToStep(2)` | "Proximo" | false | false | none | Dates are optional |
| 4 | `goToStep(3)` | "Avancar" | `isSubmitting` | `isSubmitting` | none | Final step uses phase-advance label |
| 4 (edit mode) | navigate to summary | "Salvar alteracoes" | `isSubmitting` | `isSubmitting` | "Cancelar" -> summary | Per SPEC-UX-017 |

### Phase 2: O Explorador

| Step | onBack | primaryLabel | isLoading | isDisabled | secondaryActions | Notes |
|---|---|---|---|---|---|---|
| Single-step (or multi-step if applicable) | navigate to Phase 1 | "Avancar" | `isSubmitting` | validation-dependent | none | Back goes to previous phase |
| Edit mode | navigate to summary | "Salvar alteracoes" | `isSubmitting` | `isSubmitting` | "Cancelar" | Per SPEC-UX-017 |

### Phase 3: O Preparo

| Step | onBack | primaryLabel | isLoading | isDisabled | secondaryActions | Notes |
|---|---|---|---|---|---|---|
| Single-step | navigate to Phase 2 | "Avancar" | `isSubmitting` | false (non-blocking phase) | none | Checklist is non-blocking; advancing is always available |
| Edit mode | navigate to summary | "Salvar alteracoes" | `isSubmitting` | `isSubmitting` | "Cancelar" | Per SPEC-UX-017 |

### Phase 4: A Logistica (3 steps)

| Step | onBack | primaryLabel | isLoading | isDisabled | secondaryActions | Notes |
|---|---|---|---|---|---|---|
| 1 (Transport) | navigate to Phase 3 | "Proximo" | false | false | none | Back goes to previous phase (not previous step -- this is step 1) |
| 2 (Accommodation) | `goToStep(1)` | "Proximo" | false | false | none | |
| 3 (Mobility) | `goToStep(2)` | "Avancar" | `isCompleting` | `isCompleting` | none | Final step advances to Phase 5 |
| 1-3 (edit mode) | step 1: navigate to summary; steps 2-3: `goToStep(n-1)` | step 3: "Salvar alteracoes"; others: "Proximo" | depends on step | depends on step | "Cancelar" on step 1 only | Per SPEC-UX-017 |

### Phase 5: O Mapa dos Dias

| Step | onBack | primaryLabel | isLoading | isDisabled | secondaryActions | Notes |
|---|---|---|---|---|---|---|
| Single-step | navigate to Phase 4 | "Avancar" | `isSubmitting` | validation-dependent | none | Guide generation may have async loading |
| Edit mode | navigate to summary | "Salvar alteracoes" | `isSubmitting` | `isSubmitting` | "Cancelar" | Per SPEC-UX-017 |

### Phase 6: O Tesouro

| Step | onBack | primaryLabel | isLoading | isDisabled | secondaryActions | Notes |
|---|---|---|---|---|---|---|
| Single-step | navigate to Phase 5 | "Avancar" | `isSubmitting` | validation-dependent | none | |
| Edit mode | navigate to summary | "Salvar alteracoes" | `isSubmitting` | `isSubmitting` | "Cancelar" | Per SPEC-UX-017 |

## 5. Design Rules

### Rule 1: Back Button Visibility

The back button appears in all situations EXCEPT:
- **Step 1 of Phase 1 in creation mode**: This is the absolute beginning of the expedition. There is nowhere meaningful to go back to. Showing a back button here would navigate to the expeditions list, which is confusing (the traveler just chose to create a new expedition).

In all other cases:
- On step 1 of any phase (phases 2-6): back navigates to the PREVIOUS PHASE's last step or page
- On steps 2+ of any multi-step phase: back navigates to the previous step within the same phase
- In edit mode on step 1: back navigates to the summary page

### Rule 2: Primary Label Rules

| Context | Label (PT-BR) | Label (EN) |
|---|---|---|
| Intermediate step (not final step of phase) | "Proximo" | "Next" |
| Final step of phases 1-6 (creation mode) | "Avancar" | "Advance" |
| Final step of phase 7 | "Avancar" | "Advance" |
| Final step of phase 8 | "Concluir Expedicio" | "Complete Expedition" |
| Any step in edit mode (final or only step) | "Salvar alteracoes" | "Save changes" |

These labels align with SPEC-UX-009 (CTA Button Standardization from Sprint 27).

### Rule 3: Loading State

- When `isLoading` is true, the primary button shows a spinner icon + loading label
- Loading labels:
  - "Proximo" steps: no loading state (step transitions are instant, no server call)
  - "Avancar": "Avancando..."
  - "Concluir Expedicio": "Concluindo..."
  - "Salvar alteracoes": "Salvando..."
- The back button and secondary actions are disabled during loading
- Double-click prevention: `isDisabled` is set to true when `isLoading` is true (already handled by WizardFooter's `disabled={isDisabled || isLoading}`)

### Rule 4: Sticky Footer Behavior

The WizardFooter uses `sticky bottom-0` positioning. This means:
- On desktop: the footer sits at the bottom of the wizard content area and scrolls with content until it reaches the viewport bottom, then sticks
- On mobile: the footer is always visible at the bottom of the viewport, ensuring the CTA is always one tap away
- The footer has a `border-t` and `bg-background` to visually separate it from scrolling content above
- The footer has adequate padding (`py-4`) for comfortable touch targets

### Rule 5: Transition from Current Patterns

The migration must:
1. Remove all ad-hoc `<div className="flex gap-3">` button containers in wizard step renders
2. Replace with `<WizardFooter>` at the bottom of each wizard's render tree (not inside individual step conditionals)
3. Wire `onBack`, `onPrimary`, `primaryLabel`, `isLoading`, `isDisabled`, and `secondaryActions` based on the mapping tables above
4. Remove all arrow character back buttons and replace with WizardFooter's text-based back button
5. Preserve all existing `data-testid` attributes by adding them to the WizardFooter wrapper or using the existing `data-testid="wizard-footer"`, `data-testid="wizard-back"`, `data-testid="wizard-primary"` test IDs

## 6. Screen Descriptions

### WizardFooter (visual reference)

The WizardFooter renders as follows in all phases:

```
+------------------------------------------------------------------+
| [< Voltar]                             [Cancelar]  [Avancar  ->] |
+------------------------------------------------------------------+
  ^                                        ^            ^
  outline variant                       ghost       primary (atlas-teal)
  only when onBack provided          only in edit    always present
```

On mobile (< 768px):
```
+------------------------------------------+
| [< Voltar]              [Avancar  ->]    |
+------------------------------------------+
```
Secondary actions collapse: "Cancelar" moves above the footer as a standalone text link on mobile if space is constrained.

**Interactive Elements**:
- Back button: `variant="outline"`, disabled during loading
- Secondary actions: `variant="ghost"`, disabled during loading
- Primary CTA: `bg-atlas-teal text-white`, disabled when `isDisabled || isLoading`, shows spinner during loading

**Loading State**:
```
+------------------------------------------------------------------+
| [< Voltar (disabled)]                    [  (spinner) Salvando...] |
+------------------------------------------------------------------+
```

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [x] Tab order within footer: Back -> Secondary actions -> Primary CTA (left to right)
  - [x] All buttons keyboard-accessible
  - [x] Focus indicator visible (2px ring)
  - [x] No keyboard traps
  - [x] Disabled buttons remain in tab order but are not activatable (`disabled` attribute)
- **Screen Reader**:
  - [x] Footer container: no special role needed (it is a `div` with buttons)
  - [x] Back button: text label "Voltar" (not an arrow character) -- clear for screen readers
  - [x] Primary button: descriptive label (e.g., "Avancar", "Salvar alteracoes")
  - [x] Loading state: `aria-busy="true"` on the primary button during loading; spinner is `aria-hidden="true"`
  - [x] Disabled state: `aria-disabled` is implicit via the `disabled` HTML attribute
- **Color & Contrast**:
  - [x] White text (#FFFFFF) on atlas-teal (#2DB8A0): 3.2:1 -- passes for large text (button text is >= 14px bold). Note: this contrast ratio was accepted in SPEC-UX-009; if body-text sized buttons are used, consider darkening the teal to #1A9A84 for 4.5:1
  - [x] Outline button border against background: passes (border uses `--border` token)
  - [x] Disabled state: reduced opacity (0.5) plus `cursor-not-allowed` -- visual cue for disabled
- **Motion**:
  - [x] Spinner animation respects `prefers-reduced-motion` (already implemented: `motion-reduce:animate-none`)
- **Touch**:
  - [x] All buttons >= 44x44px touch target (WizardFooter uses standard Button component sizing)
  - [x] Adequate spacing between buttons (gap-2 = 8px minimum)

## 8. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `cta_next` | Proximo | Next |
| `cta_advance` | Avancar | Advance |
| `cta_advancing` | Avancando... | Advancing... |
| `cta_complete` | Concluir Expedicio | Complete Expedition |
| `cta_completing` | Concluindo... | Completing... |
| `cta_save_changes` | Salvar alteracoes | Save changes |
| `cta_saving` | Salvando... | Saving... |
| `cta_cancel` | Cancelar | Cancel |
| `cta_back` | Voltar | Back |

### Tone of Voice

- Action-oriented: "Avancar" conveys forward momentum
- Clear: "Salvar alteracoes" is explicit about what the button does
- Consistent: same labels across all 6+ phases creates trust through predictability

## 9. Constraints

- WizardFooter component already exists and is ready for integration -- no component changes needed for Sprint 29 (unless the team identifies missing features during implementation)
- The `bg-atlas-teal` color on the primary button is already the standard per the WizardFooter component. This differs from the `--color-primary` (#E8621A orange) used elsewhere. The WizardFooter was designed with teal for wizard-specific actions. This is intentional and should remain consistent across phases.
- Existing `data-testid` attributes on ad-hoc buttons (e.g., `data-testid="back-to-phase-3"`) should be preserved or mapped to the standard `data-testid="wizard-back"` / `data-testid="wizard-primary"` IDs that WizardFooter provides. QA engineer should review test impacts.

## 10. Migration Checklist

For the implementation team, here is the file-by-file migration checklist:

| File | Current Pattern | WizardFooter Integration | Priority |
|---|---|---|---|
| `Phase1Wizard.tsx` | 3 ad-hoc `<div className="flex gap-3">` blocks (steps 2, 3, 4) + 1 `<Button>` (step 1) | Replace all 4 with single `<WizardFooter>` outside step conditionals; wire props based on `currentStep` | High |
| `Phase4Wizard.tsx` | 3 ad-hoc `<div className="flex gap-3">` blocks + 1 separate advance `<Button>` | Replace all with single `<WizardFooter>`; consolidate step 3 navigation + advance into one footer | High |
| Phase2Wizard | To audit | Replace with `<WizardFooter>` | Medium |
| Phase3Wizard | To audit | Replace with `<WizardFooter>` | Medium |
| Phase5Wizard (DestinationGuideWizard) | To audit | Replace with `<WizardFooter>` | Medium |
| Phase6Wizard (ItineraryWizard) | To audit | Replace with `<WizardFooter>` | Medium |

## 11. Prototype

- [ ] Prototype required: No
- **Notes**: WizardFooter already exists as a working component. The spec defines prop mappings, not new visual patterns. The existing component is the reference implementation.

## 12. Open Questions

- [ ] Should the primary CTA color be atlas-teal (current WizardFooter) or primary orange (#E8621A, per SPEC-UX-009)? There is a minor inconsistency: SPEC-UX-009 defined all phase CTAs as orange, but WizardFooter was built with teal. -- UX decision needed; recommend keeping teal for wizard contexts (differentiation from destructive/marketing CTAs) and reserving orange for the dashboard.
- [ ] Should tests be updated to use the new standard `data-testid="wizard-back"` / `data-testid="wizard-primary"` or should the old test IDs be preserved via passthrough props? -- QA engineer to decide based on test maintenance cost.

---

> **Spec Status**: Draft
> **Ready for**: Architect (open questions are non-blocking for architecture spec; they are implementation-level decisions)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | ux-designer | Initial draft |
