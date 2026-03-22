# SPEC-ARCH-028: useFormDirty Hook + Global Dirty-State Architecture

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: tech-lead, ux-designer, qa-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**References**: SPEC-PROD-039, SPEC-UX-041, SPEC-ARCH-024 (Sprint 34), ATLAS-GAMIFICACAO-APROVADO.md

---

## 1. Problem Statement

Dirty-state detection logic is currently inlined in `Phase4Wizard.tsx` only. Sprint 34 implemented it for Phase 4 but did not extract it into a reusable hook. Phases 1-3 have no unsaved-changes protection, creating data loss risk. Phases 5-6 are read-only and need only navigation buttons.

---

## 2. System Design

### 2.1 Component Architecture

```
src/
  hooks/
    useFormDirty.ts           # NEW — reusable dirty-state hook
  components/
    ui/
      SaveDiscardDialog.tsx    # NEW — reusable dialog component
    features/expedition/
      WizardFooter.tsx         # EXISTING — enhanced with dirty-state props
      Phase1Wizard.tsx         # MODIFIED — integrate useFormDirty + WizardFooter
      Phase2Wizard.tsx         # MODIFIED — integrate useFormDirty + WizardFooter
      Phase3Wizard.tsx         # MODIFIED — integrate useFormDirty + WizardFooter
      Phase4Wizard.tsx         # MODIFIED — refactor to use hook (remove inline)
      Phase5Guide.tsx          # MODIFIED — add WizardFooter (no save, read-only)
      Phase6Itinerary.tsx      # MODIFIED — add WizardFooter (no save, read-only)
```

### 2.2 Hook: useFormDirty

```typescript
// src/hooks/useFormDirty.ts
import { useRef, useMemo, useCallback } from "react";

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned 32-bit
}

interface UseFormDirtyReturn {
  isDirty: boolean;
  resetDirty: () => void;
  markClean: () => void;
  initialHash: number;
  currentHash: number;
}

export function useFormDirty(
  formValues: Record<string, unknown>
): UseFormDirtyReturn {
  const serialized = useMemo(
    () => JSON.stringify(formValues, Object.keys(formValues).sort()),
    [formValues]
  );
  const currentHash = useMemo(() => djb2Hash(serialized), [serialized]);
  const baselineRef = useRef(currentHash);

  const resetDirty = useCallback(() => {
    baselineRef.current = currentHash;
  }, [currentHash]);

  const markClean = useCallback(() => {
    baselineRef.current = currentHash;
  }, [currentHash]);

  return {
    isDirty: currentHash !== baselineRef.current,
    resetDirty,
    markClean,
    initialHash: baselineRef.current,
    currentHash,
  };
}
```

**Performance**: `JSON.stringify` + `djb2Hash` is O(n) on total serialized length. For typical wizard forms (~20 fields, ~2KB serialized), execution is <1ms. Memoized via `useMemo` to avoid recomputation on unrelated renders.

**Security note** (per SPEC-SEC-006 SEC-036-001): The hash is ephemeral client-side state. MUST NOT be logged, persisted, or sent to analytics.

### 2.3 SaveDiscardDialog Component

```typescript
// src/components/ui/SaveDiscardDialog.tsx

type DialogIntent = "back" | "advance" | null;

interface SaveDiscardDialogProps {
  intent: DialogIntent;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**State Machine**:
```
dialogIntent: null ─── user clicks "Voltar" + isDirty ──→ "back"
                  ├── user clicks "Avancar" + isDirty ──→ "advance"

"back"    ── [Salvar e Voltar]     → onSave() → onBack()    → null
          ── [Descartar e Voltar]  → onDiscard() → onBack()  → null
          ── [Cancelar] / ESC      → onCancel()              → null

"advance" ── [Salvar e Continuar]  → onSave() → onPrimary() → null
          ── [Descartar]           → onDiscard() → onPrimary() → null
          ── [Cancelar] / ESC      → onCancel()              → null
```

**Accessibility**: Uses Radix Dialog primitive (shadcn/ui). Focus trap, ESC to cancel, `role="alertdialog"`, `aria-describedby` for dialog message.

### 2.4 WizardFooter Props Contract

```typescript
interface WizardFooterProps {
  // Navigation
  onBack?: () => void;
  onPrimary: () => void;
  primaryLabel: string; // "Avançar", "Ver Expedições", etc.

  // Save (optional — omit for read-only phases)
  onSave?: () => Promise<void>;
  isDirty?: boolean;
  showSave?: boolean;

  // State
  isLoading?: boolean;
  disabled?: boolean;
}
```

### 2.5 Integration Contract per Phase

| Phase | useFormDirty | SaveDiscardDialog | WizardFooter Config |
|---|---|---|---|
| Phase 1 | Yes — tracks personal/destination/dates/type fields | Yes | showSave=true, onSave=savePhase1Action |
| Phase 2 | Yes — tracks preference selections | Yes | showSave=true, onSave=savePreferencesAction |
| Phase 3 | Yes — tracks checked items | Yes | showSave=true, onSave=saveChecklistAction |
| Phase 4 | Yes — extract from inline to hook | Yes | showSave=true, onSave=existing save actions |
| Phase 5 | No (read-only AI content) | No | showSave=false, primaryLabel="Avançar" |
| Phase 6 | No (read-only AI content) | No | showSave=false, primaryLabel="Ver Expedições" |

### 2.6 Save Action Contract

Each phase with dirty-state must expose an async save function:

```typescript
type SaveFunction = () => Promise<{ success: boolean; error?: string }>;
```

- Phase 1: calls `updatePhase1Action(tripId, formData)` — existing action
- Phase 2: calls `savePreferencesAction(tripId, selections)` — existing action
- Phase 3: calls `saveChecklistAction(tripId, checkedItems)` — existing action
- Phase 4: calls `saveTransportAction` / `saveAccommodationAction` / `saveMobilityAction` — existing actions

No new server actions required. All save actions already include `revalidatePath` (fixed in Sprint 34).

---

## 3. Data Flow

```
User edits form field
  → React state update
  → useFormDirty recalculates hash via useMemo
  → isDirty = currentHash !== baselineRef

User clicks "Voltar" or "Avançar":
  if (isDirty):
    → Open SaveDiscardDialog (intent = "back" | "advance")
    → User chooses: Save / Discard / Cancel
    → Save: call onSave() → markClean() → navigate
    → Discard: navigate (data lost)
    → Cancel: close dialog, stay on page
  else:
    → Navigate directly (no dialog)

After successful save:
  → Toast "Alterações salvas com sucesso"
  → markClean() updates baseline hash
  → isDirty = false
```

---

## 4. Performance Considerations

| Concern | Mitigation |
|---|---|
| JSON.stringify on every render | Memoized via useMemo; only recomputes when formValues changes |
| djb2 hash on large forms | O(n) on serialized string length; <1ms for typical wizard data |
| SaveDiscardDialog render | Lazy rendered (only when intent !== null); uses Radix portal |
| Save action debounce | 300ms debounce on save button; prevents double-submit |

---

## 5. Testing Strategy

| Test Type | Coverage |
|---|---|
| Unit: useFormDirty | djb2 hash correctness, isDirty toggle, resetDirty, markClean |
| Unit: SaveDiscardDialog | Render states, button clicks, ESC key, loading state |
| Unit: WizardFooter | All prop combinations, disabled state, loading |
| Integration: Phase 1-4 | Dirty detection + dialog + save + navigate flow |
| Integration: Phase 5-6 | No dirty tracking, simple navigation |
| E2E | Full wizard flow with dirty-state across phases |

Estimated: ~30 new unit tests, ~5 new E2E tests.

---

## 6. Migration Plan

1. Create `useFormDirty` hook (new file)
2. Create `SaveDiscardDialog` component (new file)
3. Enhance `WizardFooter` props (backward-compatible)
4. Refactor Phase4Wizard: replace inline logic with hook (regression test)
5. Integrate Phase 1, 2, 3 (one at a time, test each)
6. Add navigation-only footer to Phase 5, 6
7. Remove any remaining inline dirty-state code from Phase4Wizard

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — useFormDirty + dirty-state architecture |
