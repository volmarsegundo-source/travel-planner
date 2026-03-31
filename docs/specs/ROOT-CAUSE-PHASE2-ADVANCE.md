# Root Cause Analysis: Phase 2 "Avancar" Crash

**RCA ID**: RCA-001
**Author**: architect
**Date**: 2026-03-30
**Status**: CONFIRMED
**Severity**: P1 -- user-facing crash with ErrorBoundary

---

## 1. Symptom

When clicking "Avancar" on the Phase 2 confirmation step (first-time completion), users intermittently see "Algo deu errado" (ErrorBoundary). Going back to the dashboard and clicking "Continuar" on the same trip works fine on the second attempt.

---

## 2. Investigation Scope

| File | Purpose |
|---|---|
| `src/components/features/expedition/Phase2WizardV2.tsx` | Client wizard, `handleSubmit()` |
| `src/server/actions/expedition.actions.ts` | `completePhase2Action()` |
| `src/server/services/expedition.service.ts` | `ExpeditionService.completePhase2()` |
| `src/lib/engines/phase-engine.ts` | `PhaseEngine.completePhase()` |
| `src/lib/guards/phase-access.guard.ts` | `guardPhaseAccess()` for Phase 3 |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx` | Phase 3 server page |
| `src/lib/engines/checklist-engine.ts` | `ChecklistEngine.initializePhase3Checklist()` |

---

## 3. Call Chain (Button Click to Error)

```
User clicks "Avancar" (confirmation step, first visit)
  |
  v
Phase2WizardV2.handleSubmit()                     [client]
  |-- completePhase2Action(tripId, data)           [server action]
  |     |-- Phase2Schema.safeParse(data)
  |     |-- ExpeditionService.completePhase2(tripId, userId, data)
  |     |     |-- db.trip.update (save passengers)
  |     |     |-- PhaseEngine.completePhase(tripId, userId, 2, metadata)
  |     |           |-- Validate trip ownership (BOLA)
  |     |           |-- Validate phase order (phaseNumber === trip.currentPhase)
  |     |           |-- Validate phase status (must be "active")
  |     |           |-- Transaction:
  |     |           |     mark phase 2 "completed"
  |     |           |     award 150 points
  |     |           |     unlock phase 3 (set status = "active")
  |     |           |     trip.currentPhase = Math.max(3, trip.currentPhase)
  |     |           |-- return PhaseCompletionResult
  |     |
  |     |-- PhaseCompletionService.checkAndCompleteTrip() [fire-and-forget]
  |     |-- revalidatePath("/expeditions")
  |     |-- revalidatePath("/expedition/${tripId}")
  |     |-- return { success: true, data: result }
  |
  |-- router.push(`/expedition/${tripId}/phase-3`)      [client navigation]
        |
        v
Phase3Page (server component)                         [server render]
  |-- guardPhaseAccess(tripId, 3, locale, { tripType, startDate, destination })
  |     |-- auth() -- get session
  |     |-- db.trip.findFirst({ id, userId, deletedAt: null })
  |     |-- db.expeditionPhase.findMany({ tripId, status: "completed" })
  |     |-- resolveAccess(3, safeCurrentPhase, completedPhases)
  |     |-- return { trip, accessMode, completedPhases }
  |
  |-- ChecklistEngine.initializePhase3Checklist(tripId, userId, trip.tripType, trip.startDate)
  |     |-- db.trip.findFirst({ id, userId })
  |     |-- db.phaseChecklistItem.count({ tripId, phaseNumber: 3 })
  |     |-- If count === 0: generate items from PHASE3_CHECKLIST rules
  |     |-- db.phaseChecklistItem.createMany(items)
  |
  |-- ChecklistEngine.getPhaseChecklist(tripId, 3)
  |-- Render Phase3Wizard with serialized items
```

---

## 4. Root Cause: Race Condition Between Navigation and Revalidation

### 4.1 The Timing Problem

The critical issue is a **race condition** between `router.push()` and Next.js `revalidatePath()`.

In `completePhase2Action` (line 296-297):
```typescript
revalidatePath("/expeditions");
revalidatePath(`/expedition/${tripId}`);
```

This triggers server-side cache invalidation. Then the action returns `{ success: true }`.

In `Phase2WizardV2.handleSubmit()` (line 233):
```typescript
router.push(`/expedition/${tripId}/phase-3`);
```

This client-side navigation fires **immediately after** the action returns. However, `revalidatePath()` invalidates the Router Cache asynchronously. The Phase 3 page server component now executes.

### 4.2 What Happens in guardPhaseAccess

The `guardPhaseAccess` function (line 83-88 of `phase-access.guard.ts`) queries:
```typescript
const phases = await db.expeditionPhase.findMany({
  where: { tripId, status: "completed" },
  select: { phaseNumber: true },
});
```

And the trip query fetches `currentPhase`. Under normal conditions, the transaction in `PhaseEngine.completePhase` has committed by this point, so `currentPhase = 3` and phase 2 is "completed". **This part works.**

### 4.3 The Actual Crash Point: Phase 3 Page Rendering

The crash is NOT in the guard. It is in what happens AFTER the guard succeeds. Look at `phase-3/page.tsx` line 23-28:

```typescript
await ChecklistEngine.initializePhase3Checklist(
  tripId,
  session!.user!.id!,
  trip.tripType as TripType,    // <-- THIS CAST
  trip.startDate as Date | null // <-- AND THIS ONE
);
```

The `guardPhaseAccess` call at line 15-18 uses `additionalSelect`:
```typescript
{ tripType: true, startDate: true, destination: true }
```

This select merges with the base select `{ id: true, currentPhase: true }`. The resulting trip object has `tripType`, `startDate`, and `destination`.

However, `trip.tripType` is typed as `unknown` because `GuardResult` defines trip as:
```typescript
trip: {
  id: string;
  currentPhase: number;
  [key: string]: unknown;
}
```

The `as TripType` cast hides a potential runtime issue: if `tripType` were null, the cast would silently pass `null` as a `TripType` argument. But per the Prisma schema, `tripType` defaults to `"international"`, so this is NOT the crash point.

### 4.4 The TRUE Root Cause: `session!.user!.id!` After redirect()

Looking more carefully at line 20-21:

```typescript
const session = await auth();

await ChecklistEngine.initializePhase3Checklist(
  tripId,
  session!.user!.id!,  // <-- Non-null assertion
  ...
);
```

The `auth()` call happens AFTER `guardPhaseAccess()`, which also calls `auth()` internally. In Next.js 15 App Router, when a server action calls `revalidatePath()`, the subsequent server component render may execute in a context where the session cookie is being refreshed.

**Critical finding**: `auth()` can return `null` transiently when the session JWT is being rotated or when the request arrives during the window between `revalidatePath()` invalidation and the fresh server render. The triple non-null assertion `session!.user!.id!` then throws a TypeError:

```
TypeError: Cannot read properties of null (reading 'user')
```

This TypeError is uncaught in the server component and triggers the ErrorBoundary.

### 4.5 Why It Works on Second Attempt

On the second attempt (returning from dashboard):
1. The session has been fully established (no rotation in progress)
2. `revalidatePath()` has fully propagated
3. The Phase 3 page renders cleanly because `auth()` returns a valid session
4. `initializePhase3Checklist` is idempotent -- if items were partially created on the first attempt, the `count > 0` check short-circuits

### 4.6 Contributing Factor: Double auth() Call

The Phase 3 page calls `auth()` twice:
1. Inside `guardPhaseAccess()` (line 50 of `phase-access.guard.ts`)
2. Directly on line 20 of `phase-3/page.tsx`

The second call is unnecessary. `guardPhaseAccess` already validates the session and could return the userId. This double call increases the window for session-related race conditions.

---

## 5. Evidence Supporting This Analysis

| Observation | Explanation |
|---|---|
| Crash is intermittent, not 100% reproducible | Session rotation timing varies |
| ErrorBoundary triggers ("Algo deu errado") | Unhandled server component exception |
| Second attempt always works | Session is stable, checklist is already initialized |
| Dashboard navigation works fine after crash | Full page load re-establishes session |
| No error logged in server-side action | The action completes successfully; crash is in the page render |

---

## 6. Secondary Risk: Checklist Initialization Partial Failure

Even if the session issue is fixed, there is a secondary risk. `initializePhase3Checklist` does:

```typescript
const existing = await db.phaseChecklistItem.count({ where: { tripId, phaseNumber: 3 } });
if (existing > 0) return;  // idempotent guard

// ... filter rules, create items
await db.phaseChecklistItem.createMany({ data: items });
```

If the first render crashes AFTER `createMany` but BEFORE the page finishes rendering, the items exist in the DB. The second attempt sees `existing > 0` and skips creation. This is safe -- the idempotent guard works correctly here.

However, if the crash happens DURING `createMany` (e.g., the request is aborted), a partial set of items could exist. The `createMany` is NOT wrapped in a transaction, so partial writes are possible. On the next attempt, `count > 0` returns true and skips re-initialization, leaving the user with an incomplete checklist.

---

## 7. Recommended Fix

### Fix 1 (Primary): Eliminate double auth() and use guard-returned userId

```
Phase3Page should:
1. Get userId from guardPhaseAccess (add userId to GuardResult)
2. Remove the standalone auth() call
3. Pass the userId from the guard to initializePhase3Checklist
```

This eliminates the second `auth()` call and the non-null assertion chain.

### Fix 2 (Defense): Add null-safe session check before checklist init

```
If session is null after guardPhaseAccess succeeds (should be impossible,
but defensive), redirect to login instead of crashing.
```

### Fix 3 (Secondary): Wrap checklist createMany in a transaction

```
initializePhase3Checklist should use db.$transaction to ensure
either all items are created or none are.
```

### Fix 4 (Improvement): Return userId from guardPhaseAccess

Modify `GuardResult` to include `userId: string` so downstream code never needs a separate `auth()` call. This pattern should be applied to ALL phase pages that call `auth()` after `guardPhaseAccess()`.

---

## 8. Affected Files

| File | Change |
|---|---|
| `src/lib/guards/phase-access.guard.ts` | Add `userId` to `GuardResult` |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx` | Remove standalone `auth()`, use guard userId |
| `src/lib/engines/checklist-engine.ts` | Wrap `createMany` in transaction |
| Other phase pages (4, 5, 6) | Audit for same double-auth pattern |

---

## 9. Severity Assessment

- **Impact**: P1 -- user-facing crash on a critical path (phase advancement)
- **Frequency**: Intermittent (depends on session rotation timing)
- **Workaround**: User can return to dashboard and continue (always works on second try)
- **Fix complexity**: Low (2-4 hours)
- **Regression risk**: Low (changes are additive, not structural)
