# Technical Specification: WizardFooter Dirty-State Architecture

**Spec ID**: SPEC-ARCH-024
**Related Stories**: SPEC-PROD-029, SPEC-UX-037, SPEC-ARCH-020
**Author**: architect
**Status**: Draft
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Overview

This spec defines the dirty-state detection mechanism for the standardized WizardFooter. The existing `WizardFooter.tsx` already accepts `isDirty` and `onSave` props, and has a basic confirmation dialog. This spec formalizes the pattern: dirty state via form hash (djb2 on `JSON.stringify`), a `useFormDirty` hook, a dialog state machine, and a generic server action contract for save-in-place.

### Current State Analysis

From `src/components/features/expedition/WizardFooter.tsx`:
- Already supports `isDirty?: boolean` and `onSave?: () => void` props
- Has a basic 2-button dialog (Discard / Save and Exit)
- Missing: hash-based dirty detection, 3-button dialog (Discard / Save+Continue / Cancel), toast feedback

This spec extends the existing component rather than replacing it.

## 2. Dirty State Detection — `useFormDirty` Hook

### Location

`src/hooks/useFormDirty.ts`

### Interface

```typescript
interface UseFormDirtyOptions<T> {
  /** Current form values (re-evaluated on every render) */
  currentValues: T;
  /** Hash of the last-persisted state (updated after successful save) */
  savedHash: string;
}

interface UseFormDirtyResult {
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Current hash of form values (for comparison after save) */
  currentHash: string;
  /** Reset saved hash to current (call after successful save) */
  markClean: () => void;
}

function useFormDirty<T>(options: UseFormDirtyOptions<T>): UseFormDirtyResult;
```

### Hash Algorithm — djb2

```typescript
// src/lib/utils/form-hash.ts

export function computeFormHash(values: unknown): string {
  const json = JSON.stringify(values, Object.keys(values as object).sort());
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}
```

**Why djb2**: Extremely fast (~10x faster than SHA-256), deterministic, sufficient for equality comparison (not security). Collision probability negligible for form data of typical size (< 10KB).

### Usage in Phase Wizards

```typescript
// Inside Phase4Wizard.tsx
const savedHash = useMemo(
  () => computeFormHash({ transportSegments: initialSegments, accommodations: initialAccommodations, mobility: initialMobility }),
  [initialSegments, initialAccommodations, initialMobility]
);

const { isDirty, currentHash, markClean } = useFormDirty({
  currentValues: { transportSegments, accommodations, mobility },
  savedHash,
});
```

## 3. Dialog State Machine

### States

```
idle ──(back or advance click + isDirty)──> confirming(intent)
confirming(intent) ──(save+continue)──> executing("save", intent)
confirming(intent) ──(discard)──> executing("discard", intent)
confirming(intent) ──(cancel/escape)──> idle
executing("save") ──(success)──> idle + navigate(intent)
executing("save") ──(error)──> confirming(intent) + error toast
executing("discard") ──> idle + navigate(intent)
```

### Type Definition

```typescript
type DialogIntent = "back" | "advance";

type DialogState =
  | { status: "idle" }
  | { status: "confirming"; intent: DialogIntent }
  | { status: "executing"; action: "save" | "discard"; intent: DialogIntent };
```

### Implementation: `useReducer`

The dialog state is managed via `useReducer` inside WizardFooter, replacing the current `useState(showDialog)`. This ensures predictable transitions and prevents invalid states (e.g., saving while idle).

## 4. Server Action Contract

Each phase wizard must provide a save function that conforms to:

```typescript
type SavePhaseAction = (tripId: string, data: unknown) => Promise<{
  success: boolean;
  error?: string;
}>;
```

The WizardFooter receives this via the existing `onSave` prop. The save function is phase-specific:

| Phase | Save Action | Data Shape |
|---|---|---|
| Phase 1 | `savePhase1Action` | `{ destination, dates, personalInfo }` |
| Phase 2 | `savePhase2Action` | `{ travelerType, preferences }` |
| Phase 3 | N/A (checklist auto-saves on toggle) | — |
| Phase 4 | `saveTransportSegmentsAction` + `saveAccommodationsAction` + `saveLocalMobilityAction` | Current step data |
| Phase 5 | N/A (guide is read-only) | — |
| Phase 6 | N/A (itinerary auto-saves) | — |

For Phase 4, the save function must save data for the **current step only** (not all 3 steps), determined by the `currentStep` state.

## 5. Toast Integration

After successful save, the WizardFooter emits a toast notification:

```typescript
// Inside WizardFooter after save success
setSaveSuccess(true);
setTimeout(() => setSaveSuccess(false), 3000);
```

Toast component is rendered inside WizardFooter as a `role="status"` element with `aria-live="polite"`. This is already partially implemented (the `saveSuccess` state in Phase4Wizard). The pattern should be moved into WizardFooter itself for consistency.

## 6. Backward Compatibility

The `isDirty` prop remains optional. Wizards that don't implement hash-based detection can still pass `isDirty={false}` to get the non-dialog navigation behavior. The `onSave` prop also remains optional — when absent, the "Salvar" button is hidden (current behavior preserved).

### Migration Path

1. **Sprint 34**: Implement `useFormDirty` hook and `computeFormHash` utility
2. **Sprint 34**: Update WizardFooter dialog from 2-button to 3-button
3. **Sprint 34**: Integrate `useFormDirty` into Phase4Wizard as pilot
4. **Sprint 35+**: Migrate remaining phases (1, 2) to use `useFormDirty`

## 7. Security Considerations

- Form hash is computed client-side and never sent to the server
- The hash is not used for data integrity verification — only for UI dirty-state comparison
- Dialog does not store or leak form data to URL, localStorage, or sessionStorage
- All save operations go through existing server actions with BOLA checks

## 8. Test Strategy

| Test | Type | Location |
|---|---|---|
| `computeFormHash` determinism | Unit | `src/lib/utils/__tests__/form-hash.test.ts` |
| `useFormDirty` hook | Unit | `src/hooks/__tests__/useFormDirty.test.ts` |
| Dialog state machine transitions | Unit | `src/components/features/expedition/__tests__/WizardFooter.test.tsx` |
| Save + navigate integration | Integration | Phase4Wizard test file |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
