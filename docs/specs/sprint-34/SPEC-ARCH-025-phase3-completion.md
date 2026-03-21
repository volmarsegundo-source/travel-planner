# Technical Specification: Phase 3 Completion Rewrite

**Spec ID**: SPEC-ARCH-025
**Related Stories**: SPEC-PROD-030, SPEC-ARCH-016
**Author**: architect
**Status**: Draft
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Overview

This spec reviews the Phase 3 (O Preparo) completion logic in `phase-completion.engine.ts` and verifies that `syncPhaseStatus` is called after every checklist toggle to ensure real-time progress bar updates.

### Current State Analysis

From `src/lib/engines/phase-completion.engine.ts`, the `evaluatePhase3` function:

```typescript
function evaluatePhase3(data: PhaseDataSnapshot["phase3"]): PhaseCompletionResult {
  const requirements = [{
    key: "mandatoryChecklist",
    met: data.totalRequired > 0 && data.completedRequired === data.totalRequired,
    label: "phase3.mandatoryChecklist",
  }];

  if (!data.hasAnyItems) return { phase: 3, status: "pending", requirements };

  const allRequiredDone = data.totalRequired > 0 && data.completedRequired === data.totalRequired;
  return {
    phase: 3,
    status: allRequiredDone ? "completed" : "in_progress",
    requirements,
  };
}
```

**Assessment**: The logic is correct for mandatory-only completion:
- `pending`: No checklist items exist at all
- `in_progress`: Some items exist but not all mandatory items are completed
- `completed`: All mandatory items (`totalRequired`) are completed (`completedRequired === totalRequired`)

The engine does NOT require optional items to be completed — only mandatory ones. This is the intended behavior per SPEC-PROD-030.

## 2. syncPhaseStatus Call After Every Toggle

### Current Flow

When a user toggles a checklist item in Phase 3:

```
User clicks checkbox
    |
    v
toggleChecklistItemAction(tripId, itemId, checked)
    |
    v
checklistService.toggleItem(...)  -- updates DB
    |
    v
??? -- Does syncPhaseStatus get called?
```

### Required Flow

```
User clicks checkbox
    |
    v
toggleChecklistItemAction(tripId, itemId, checked)
    |
    v
checklistService.toggleItem(...)  -- updates DB
    |
    v
buildPhaseDataSnapshot(tripId)  -- reads current data
    |
    v
evaluatePhaseCompletion(3, snapshot)  -- pure function
    |
    v
syncPhaseStatus(tripId, 3, result.status)  -- writes ExpeditionPhase
    |
    v
revalidatePath(`/expedition/${tripId}`)  -- triggers progress bar refresh
```

### Verification Checklist

- [ ] `toggleChecklistItemAction` calls `syncPhaseStatus` after toggling
- [ ] `syncPhaseStatus` writes the computed status to `ExpeditionPhase` table
- [ ] `revalidatePath` is called to refresh the progress bar on the client
- [ ] If `syncPhaseStatus` is not called, add it as part of Sprint 34 implementation

## 3. Real-Time Progress Bar Update

The progress bar (`DashboardPhaseProgressBar` or equivalent) reads phase statuses from the server. For the toggle to reflect immediately:

1. **Server action** (`toggleChecklistItemAction`) must call `syncPhaseStatus`
2. **`revalidatePath`** must be called after sync to invalidate the cached page
3. **Client component** re-renders with new data from the server component tree

### Alternative: Optimistic UI

If the server round-trip is too slow for perceived responsiveness:

```typescript
// In Phase3Wizard client component
const optimisticStatus = evaluatePhaseCompletion(3, {
  ...snapshot,
  phase3: {
    totalRequired,
    completedRequired: newCompletedCount,  // optimistic
    hasAnyItems: true,
  },
});
// Update progress bar client-side immediately
// Server sync happens in background
```

The `phase-completion.engine.ts` is isomorphic (no server-only imports), so it can be safely used client-side for optimistic evaluation.

## 4. Edge Cases

| Scenario | Expected Status | Verified |
|---|---|---|
| No checklist items generated yet | `pending` | Yes (engine returns pending when `!hasAnyItems`) |
| 0 mandatory items, some optional checked | `completed` (0 === 0) | **Bug risk** — `totalRequired > 0` check would make this `in_progress` |
| All mandatory checked, some optional unchecked | `completed` | Yes |
| Some mandatory checked, all optional checked | `in_progress` | Yes |
| Trip has no checklist rules for its type | `pending` (no items) | Yes |

### Fix for 0 Mandatory Items

If a trip type has no mandatory checklist items (all optional), the current logic `totalRequired > 0 && completedRequired === totalRequired` would evaluate to `false` (since `totalRequired === 0`), resulting in `in_progress` instead of `completed`. This should be:

```typescript
const allRequiredDone = data.totalRequired === 0 || data.completedRequired === data.totalRequired;
```

This fix should be implemented in Sprint 34 if any trip type can have 0 mandatory items. Verify against `checklist-rules.ts`.

## 5. Test Requirements

| Test Case | Input | Expected Output |
|---|---|---|
| All mandatory done | `{ totalRequired: 5, completedRequired: 5, hasAnyItems: true }` | `completed` |
| Some mandatory done | `{ totalRequired: 5, completedRequired: 3, hasAnyItems: true }` | `in_progress` |
| No items at all | `{ totalRequired: 0, completedRequired: 0, hasAnyItems: false }` | `pending` |
| Zero mandatory, has optionals | `{ totalRequired: 0, completedRequired: 0, hasAnyItems: true }` | `completed` (after fix) |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
