# Technical Specification: WizardFooter Save/Discard Architecture

**Spec ID**: SPEC-ARCH-020
**Related Stories**: SPEC-PROD-029 (IMP-001), TASK-S33-005
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-20

---

## 1. Overview

This spec defines the architecture for a standardized WizardFooter with dirty-state detection, save-in-place, and discard-or-save confirmation dialogs. The pattern must integrate with all 6 phase wizards without breaking existing navigation, completion, or phase-engine contracts. Dirty state is detected by comparing a structural hash of the current form values against the hash of the last-persisted state -- not by tracking individual field changes.

## 2. Architecture Diagram

```
+------------------------------------------------------+
|  PhaseNWizard (client component)                     |
|                                                      |
|  useForm(defaultValues: savedData)                   |
|       |                                              |
|       +---> useFormDirtyHash(formValues, savedHash)  |
|       |         |                                    |
|       |    isDirty: boolean                          |
|       |    currentHash: string                       |
|       |                                              |
|  +----v------------------------------------------+   |
|  | WizardFooter                                  |   |
|  |   [Voltar]  [Salvar]  [Avancar/Concluir]     |   |
|  |                                               |   |
|  |   onBack() -----> isDirty? --yes--> Dialog    |   |
|  |   onSave() -----> saveAction() -> toast       |   |
|  |   onPrimary() --> isDirty? --yes--> Dialog    |   |
|  +-----------------------------------------------+   |
|                                                      |
|  ConfirmDialog (ARIA modal)                          |
|    intent: "back" | "advance"                        |
|    actions: [SaveAndNavigate, DiscardAndNavigate]    |
+------------------------------------------------------+
         |
         v (server action)
  savePhaseNAction(tripId, data)
         |
         v
  ExpeditionPhase.metadata / Trip fields / related models
```

## 3. Data Model

No schema migration required. This spec operates on existing models.

### Dirty State Hash

```typescript
// src/lib/utils/form-hash.ts

/**
 * Compute a deterministic hash of form values for dirty-state comparison.
 * Uses JSON.stringify with sorted keys + simple djb2 hash.
 * No cryptographic requirement -- this is a UI optimization.
 */
export function computeFormHash(values: Record<string, unknown>): string;

/**
 * Compare two hashes. Returns true if they differ.
 */
export function isFormDirty(currentHash: string, savedHash: string): boolean;
```

**Design decisions**:
- JSON.stringify with sorted keys ensures deterministic output regardless of field insertion order
- djb2 (or FNV-1a) hash produces a short string; no crypto overhead
- Null, undefined, and empty string are normalized before hashing to prevent false positives
- Arrays are sorted before hashing (for multi-select fields like mobility, preferences)

### Dialog State Machine

```typescript
type DialogState =
  | { open: false }
  | { open: true; intent: "back"; onConfirm: () => void }
  | { open: true; intent: "advance"; onConfirm: () => void };
```

The dialog is always driven by a single `dialogState` controlled by the WizardFooter. No ambient state leaks.

## 4. API Contract

### WizardFooter Props (enhanced)

```typescript
interface WizardFooterProps {
  // Existing (backward compatible)
  onBack?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  secondaryActions?: Array<{ label: string; onClick: () => void }>;

  // New (Sprint 33)
  onSave?: () => Promise<void>;       // When provided, enables 3-button layout
  isDirty?: boolean;                   // Drives confirmation dialog logic
  isSaving?: boolean;                  // Distinct from isLoading (save vs advance)
  saveLabel?: string;                  // Default: t("save")
  isFirstStep?: boolean;              // Hides Voltar when true
  isFinalStep?: boolean;              // Changes primaryLabel to t("conclude")
}
```

**Backward compatibility rule**: When `onSave` is `undefined`, render the existing 2-button layout. No visual or behavioral change for wizards that do not opt in.

### Save Action Contract (per phase)

Each phase wizard that opts in must expose a save action with this signature:

```typescript
type PhaseSaveAction = (
  tripId: string,
  data: Record<string, unknown>
) => Promise<{ success: boolean; error?: string }>;
```

For phases that already have server actions (Phase 1: `completePhase1Action`, Phase 2: `updatePhase2Action`, Phase 4: transport/accommodation actions), the save action reuses the same server action but without triggering phase advancement. For phases without dedicated save (Phase 3: toggle is already instant, Phase 5/6: AI-generated), the `onSave` prop is omitted, falling back to the 2-button layout.

**Phase-by-phase integration**:

| Phase | onSave Available | Rationale |
|-------|-----------------|-----------|
| Phase 1 | Yes | Saves destination, dates, origin without advancing |
| Phase 2 | Yes | Saves traveler type, pace, budget without advancing |
| Phase 3 | No | Each checkbox toggle auto-persists; no batch save needed |
| Phase 4 | Yes | Saves current transport/accommodation/mobility step |
| Phase 5 | No | AI-generated; nothing user-editable to save |
| Phase 6 | No | AI-generated; DnD reorder auto-saves |

## 5. Business Logic

### Flow: User clicks "Voltar" (Back)

1. WizardFooter checks `isDirty` prop
2. If `isDirty === false`: call `onBack()` immediately
3. If `isDirty === true`: set `dialogState = { open: true, intent: "back", onConfirm: onBack }`
4. Dialog renders with two options:
   - "Salvar e Voltar": calls `onSave()`, awaits, then calls `onBack()`
   - "Descartar e Voltar": calls `onBack()` directly (data loss accepted)
5. Escape key closes dialog without any action (AC-010)

### Flow: User clicks "Avancar" (Advance)

1. WizardFooter checks `isDirty` prop
2. If `isDirty === false`: call `onPrimary()` immediately
3. If `isDirty === true`: set `dialogState = { open: true, intent: "advance", onConfirm: onPrimary }`
4. Dialog renders with two options:
   - "Salvar e Avancar": calls `onSave()`, awaits, then calls `onPrimary()`
   - "Descartar e Avancar": calls `onPrimary()` directly

### Flow: User clicks "Salvar" (Save)

1. If `isDirty === false`: show inline toast "Ja esta salvo" (AC-014), no network call
2. If `isDirty === true`:
   a. Set `isSaving = true`
   b. Call `onSave()`
   c. On success: update `savedHash` to `currentHash`, show inline toast "Salvo com sucesso" (auto-dismiss 3s)
   d. On error: show error toast, keep `isSaving = false`, data remains on screen (AC-009)

### Edge Cases

- **Save fails during "Salvar e Avancar"**: navigation is aborted; user stays on current screen with error message
- **Save fails during "Salvar e Voltar"**: navigation is aborted; user stays on current screen
- **Rapid double-click on Save**: `isSaving` flag prevents concurrent calls
- **Browser back button while dirty**: outside this spec's scope (browser unload events unreliable); not addressed in SPEC-PROD-029

## 6. External Integrations

None. All operations use existing server actions.

## 7. Security Considerations

- **BOLA**: Save actions must verify `userId` ownership of `tripId` before persisting. Existing server actions already enforce this -- no new surface.
- **Mass assignment**: Save action data must be Zod-validated and explicitly mapped to Prisma fields. No spreading of user input.
- **CSRF**: Server actions in Next.js App Router include built-in CSRF tokens. No additional protection needed.
- **Data in dialog**: The confirmation dialog does not display any user data. No PII exposure risk.

## 8. Performance Requirements

| Metric | Target | Approach |
|--------|--------|----------|
| Hash computation | < 1ms | djb2/FNV-1a on small JSON payloads (< 2KB per form) |
| Save round-trip | < 1.5s on 3G | Same as existing server actions (AC-087 from SPEC-PROD-029) |
| Bundle impact | < 5KB | Dialog is CSS-only (Radix via shadcn); hash is ~20 lines |
| Re-renders from dirty check | 0 spurious | Hash computed in useMemo, compared referentially |

### Hook Implementation

```typescript
// src/lib/hooks/useFormDirtyHash.ts

function useFormDirtyHash(
  currentValues: Record<string, unknown>,
  savedValues: Record<string, unknown>
): { isDirty: boolean; savedHash: string; currentHash: string; markSaved: () => void };
```

- `currentHash` recomputes via `useMemo` when `currentValues` changes
- `savedHash` is set once on mount (from server props) and updated via `markSaved()` after successful save
- `isDirty` is a simple `!==` on the two strings -- no deep comparison, no re-renders beyond what React Hook Form already triggers

## 9. Testing Strategy

### Unit Tests

- `form-hash.ts`: deterministic output, sorted keys, null normalization, array sorting, empty object, large payload
- `useFormDirtyHash`: hook returns isDirty=false on mount, true after change, false after markSaved
- `WizardFooter`: renders 2-button when onSave absent, 3-button when present; dialog opens on dirty+back; dialog opens on dirty+advance; escape closes dialog; save-already-clean shows toast; save-error keeps user on page

### Integration Tests

- Phase 1 wizard: fill form -> click Salvar -> verify server action called -> click Voltar -> no dialog (just saved)
- Phase 2 wizard: fill form -> click Avancar with dirty -> dialog appears -> "Salvar e Avancar" -> verify save then advance
- Phase 4 wizard: sub-step change -> dirty detected -> back dialog -> "Descartar e Voltar" -> data not persisted

### E2E Tests

- Full flow: Phase 1 -> edit -> save -> back -> forward -> verify persistence
- Error flow: simulate server error on save -> verify user stays on page

### EDD Eval Criteria

| Eval ID | Dimension | Criterion | Pass Threshold |
|---------|-----------|-----------|----------------|
| EDD-020-01 | Correctness | Hash is deterministic: same input always produces same hash | 100% |
| EDD-020-02 | Correctness | isDirty transitions: false -> true on edit, true -> false on save | 100% |
| EDD-020-03 | UX Fidelity | Dialog opens on dirty+navigate, does NOT open on clean+navigate | 100% |
| EDD-020-04 | Backward Compat | All 6 phase wizards render without errors when onSave is omitted | 100% |
| EDD-020-05 | Performance | Hash computation < 5ms for forms with 50+ fields | 95th percentile |
| EDD-020-06 | Accessibility | Dialog has role="dialog", aria-modal="true", focus trap, Escape closes | 100% |
| EDD-020-07 | Error Resilience | Failed save aborts navigation; data intact on screen | 100% |

## 10. Implementation Notes for Developers

1. **Do NOT use `window.confirm`** -- use the Radix AlertDialog from shadcn/ui (`AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, etc.). This satisfies AC-010 (Escape to close) and ARIA requirements.

2. **Toast for save feedback**: Use the existing `sonner` toast (already in the project). Auto-dismiss after 3 seconds. Add `aria-live="polite"` region for screen readers.

3. **Hash normalization order**: Before hashing, apply: (a) sort object keys, (b) sort arrays, (c) convert `undefined` to `null`, (d) trim strings. This prevents false dirty states from field reordering or whitespace changes.

4. **Do NOT store form hash in global state** -- keep it local to each wizard component via the hook. This prevents cross-wizard contamination.

5. **Mobile layout (AC-011)**: The three buttons must use `flex` with `justify-between`, each button `min-h-[44px]`. On `sm:` and below, stack buttons vertically with full width. On `md:` and above, horizontal layout.

6. **WizardFooter must remain a leaf component** -- it receives callbacks, it does NOT know about server actions, Prisma, or trip data. The parent wizard is responsible for wiring `onSave` to the correct server action.

7. **Phase 3 and Phase 5/6**: These phases use the 2-button layout (onSave omitted). Developers should NOT add onSave to these phases in this sprint.

## 11. Open Questions

- [ ] OQ-1: Should "Descartar e Voltar" also reset the form to the last saved state (re-render with savedData), or should it simply navigate away? Recommendation: navigate away -- the re-render would happen naturally when the user returns.
- [ ] OQ-2: Should Phase 4 sub-step transitions (Transport -> Accommodation -> Mobility) also trigger the dirty dialog, or only inter-phase navigation? Recommendation: only inter-phase, since sub-step data is step-scoped.

## 12. Definition of Done

- [ ] All AC from SPEC-PROD-029 are met (AC-001 through AC-014)
- [ ] Unit test coverage >= 80% on form-hash.ts, useFormDirtyHash, WizardFooter
- [ ] WizardFooter backward compatibility verified: all existing tests pass
- [ ] All 6 phase wizards render without errors
- [ ] Phases 1, 2, 4 integrate onSave with working dirty detection
- [ ] Phases 3, 5, 6 use 2-button layout (no regression)
- [ ] Accessibility: keyboard navigation, ARIA dialog, aria-live toast
- [ ] Mobile: 44px touch targets, full-width stacked layout
- [ ] Performance: < 5KB bundle addition
- [ ] EDD eval criteria EDD-020-01 through EDD-020-07 pass

> Draft -- pending tech-lead review

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | architect | Initial draft -- Sprint 33 WizardFooter save/discard architecture |
