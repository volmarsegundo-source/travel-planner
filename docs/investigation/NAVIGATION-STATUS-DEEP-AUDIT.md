# Phase Navigation & Status -- Deep Audit

**Author**: tech-lead
**Date**: 2026-03-20
**Scope**: Every file that reads/writes phase state, every redirect/guard, every progress bar component
**Method**: Exhaustive codebase read -- no assumptions, all findings verified from source

---

## 1. Executive Summary

The recurring phase navigation bugs stem from **three fundamental conflicts** in the codebase:

1. **Two incompatible phase-count constants**: `TOTAL_PHASES = 8` (phase-config.ts, phase-engine.ts) vs `TOTAL_ACTIVE_PHASES = 6` (phase-navigation.engine.ts). The DB initializes 8 phases, the guard only allows 1-6, and `totalPhases` on the dashboard is set to `trip.phases.length` (8), meaning the "completed" check (`completedPhases.length >= totalPhases`) can never be satisfied because phases 7-8 are always "locked".

2. **Two parallel phase completion systems** that do not share state: `PhaseEngine.completePhase()` (marks `ExpeditionPhase.status = "completed"` in DB, awards points) and `PhaseCompletionService.syncPhaseStatus()` / `phase-completion.engine.ts` (evaluates completion from data presence, ignores `ExpeditionPhase.status`). These can disagree -- a phase can be "completed" in ExpeditionPhase but "in_progress" in the data-based engine, or vice versa.

3. **The `ExpeditionProgressBar` component has its own hardcoded route map** (`PHASE_ROUTES` with Phase 1 = `""`) that contradicts the canonical `PHASE_ROUTE_MAP` (Phase 1 = `"/phase-1"`), and it uses `totalPhases` as a prop (which is 8 from the DB) to render all 8 phases, while `UnifiedProgressBar` and `DashboardPhaseProgressBar` use different rendering logic.

---

## 2. Phase State -- Sources of Truth (Conflicts)

### 2.1 Phase Count Constants

| Constant | Value | File | Used By |
|---|---|---|---|
| `TOTAL_PHASES` | **8** | `src/lib/engines/phase-config.ts:96` | `phase-engine.ts` (init, complete, unlock), `expedition.service.ts` (createExpedition) |
| `TOTAL_ACTIVE_PHASES` | **6** | `src/lib/engines/phase-navigation.engine.ts:10` | `resolveAccess`, `canNavigateToPhase`, `getPhaseState`, `UnifiedProgressBar`, `ExpeditionCardRedesigned`, expedition hub page |
| `TOTAL_COMPLETION_PHASES` | **6** | `src/lib/engines/phase-completion.engine.ts:69` | `getExpeditionCompletionSummary`, `isExpeditionComplete` |
| `EXPEDITION_PHASE_COUNT` | **6** | `src/server/services/trip-readiness.service.ts:17` | readiness score calculation |
| Hardcoded `6` | **6** | `src/components/features/atlas/TripMarkerPopup.tsx:11` | map popup progress |

**CONFLICT-001 (CRITICAL)**: `trip.phases.length` returns **8** (the DB has 8 ExpeditionPhase rows). `TripService.getUserTripsWithExpeditionData()` at line 248 sets `totalPhases: trip.phases.length`, which means `ExpeditionDTO.totalPhases = 8`. But `completedPhases` can only ever contain phases 1-6 (max 6 items) because phases 7-8 are never completed. Therefore `deriveExpeditionStatus()` (`completedPhases.length >= totalPhases` i.e. `6 >= 8`) **never returns "completed"**, and `ExpeditionCard`'s `isExpeditionCompleted` check is **always false**.

### 2.2 Where Phase State Is Written

| Operation | File | What It Writes | Where |
|---|---|---|---|
| Initialize expedition | `phase-engine.ts:27-53` | Creates 8 `ExpeditionPhase` rows (phase 1 active, 2-8 locked) | DB: `ExpeditionPhase` |
| Create expedition | `expedition.service.ts:51-119` | Creates 8 phases, completes phase 1, sets `trip.currentPhase = 2` | DB: `ExpeditionPhase` + `Trip.currentPhase` |
| Complete phase (blocking) | `phase-engine.ts:137-297` | Marks phase completed, unlocks next, updates `trip.currentPhase` | DB: `ExpeditionPhase.status` + `Trip.currentPhase` |
| Advance from phase (non-blocking) | `phase-engine.ts:304-381` | Unlocks next phase, updates `trip.currentPhase` (does NOT mark completed) | DB: `ExpeditionPhase.status` + `Trip.currentPhase` |
| Sync phase status | `phase-completion.service.ts:132-173` | Evaluates data presence, sets status to "completed" or "active" | DB: `ExpeditionPhase.status` |
| Check and complete trip | `phase-completion.service.ts:182-214` | Sets `trip.status = "COMPLETED"` if all 6 phases have data | DB: `Trip.status` |
| Reset expedition | `phase-engine.ts:432-465` | Resets all phases to locked, phase 1 active, `trip.currentPhase = 1` | DB: `ExpeditionPhase` + `Trip.currentPhase` |

### 2.3 Where Phase State Is Read

| Reader | File | What It Reads | Type of `completedPhases` |
|---|---|---|---|
| `guardPhaseAccess` | `src/lib/guards/phase-access.guard.ts:79-84` | `ExpeditionPhase` WHERE `status = "completed"` -> `number[]` | `number[]` (from DB) |
| `TripService.getUserTripsWithExpeditionData` | `src/server/services/trip.service.ts:245-248` | `trip.phases` WHERE `status = "completed"` -> `number[]`; `totalPhases = trip.phases.length` | `number[]` (from DB); **totalPhases = 8** |
| `Phase3Wizard` | `src/components/features/expedition/Phase3Wizard.tsx:52` | `isRevisiting = currentPhase > 3` (uses `currentPhase` prop, NOT `completedPhases`) | separate logic |
| `Phase4Wizard` | `src/components/features/expedition/Phase4Wizard.tsx:88` | `isRevisiting = accessMode === "revisit" || currentPhase > 4` | mixed |
| `Phase2Wizard` | `src/components/features/expedition/Phase2Wizard.tsx:74` | `isEditMode = accessMode === "revisit"` | from navigation engine |
| `PhaseCompletionService.buildSnapshot` | `src/server/services/phase-completion.service.ts:21-101` | Reads actual data (not ExpeditionPhase.status) | data presence |
| `TripReadinessService` | `src/server/services/trip-readiness.service.ts:50-80` | Reads `ExpeditionPhase` status + actual data | mixed |

**CONFLICT-002 (MAJOR)**: Two independent definitions of "phase completed":
- **PhaseEngine**: `ExpeditionPhase.status === "completed"` (set explicitly by `completePhase()`)
- **PhaseCompletionEngine**: evaluates actual data presence (e.g., phase 4 is "completed" if `transportSegmentCount > 0 || accommodationCount > 0`)

These can diverge. For example, if a user adds a transport segment but never calls `completePhase4Action`, the data-based engine says "completed" but `ExpeditionPhase.status` remains "active". `syncPhaseStatus` tries to reconcile, but it's only called in specific places (e.g., `togglePhase3ItemAction` fire-and-forget).

---

## 3. Progress Bar Components (Complete Inventory)

There are **5** components that render progress indicators:

| # | Component | File | Props | Phase Count | Route Map | State Source | Parent Components |
|---|---|---|---|---|---|---|---|
| 1 | `UnifiedProgressBar` | `src/components/features/expedition/UnifiedProgressBar.tsx` | `tripId, viewingPhase, tripCurrentPhase, completedPhases: number[]` | `TOTAL_ACTIVE_PHASES` (6) | `PHASE_ROUTE_MAP` from engine (canonical) | `getPhaseState()` from engine | `PhaseShell` (all wizards) |
| 2 | `DashboardPhaseProgressBar` | `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` | `currentPhase, completedPhases: number[], tripId?` | `PHASE_DEFINITIONS.length` **(8)** | `PHASE_ROUTE_MAP` from engine (canonical) | Local: `completedPhases.includes()` + `phaseNum === currentPhase` | `ExpeditionCard`, `ExpeditionCardRedesigned` |
| 3 | `ExpeditionProgressBar` | `src/components/features/expedition/ExpeditionProgressBar.tsx` | `currentPhase, totalPhases, tripId?` | **`totalPhases` prop** (typically 8 from DB) | **Own hardcoded `PHASE_ROUTES`** (Phase 1 = `""`) | Local: `phaseNum < currentPhase` (no completedPhases!) | Appears unused in current codebase (replaced by UnifiedProgressBar) |
| 4 | `PhaseProgressBar` | `src/components/features/expedition/PhaseProgressBar.tsx` | `currentStep, totalSteps` | N/A (intra-phase steps) | None | `i < currentStep` | Appears unused (replaced by StepProgressIndicator) |
| 5 | `StepProgressIndicator` | `src/components/features/expedition/StepProgressIndicator.tsx` | `currentStep, totalSteps` | N/A (intra-phase steps) | None | `i < currentStep` | `PhaseShell` |

**CONFLICT-003 (CRITICAL)**: `DashboardPhaseProgressBar` iterates over `PHASE_DEFINITIONS` which has **8 entries**. It renders all 8 phases, styling phases 7-8 with `isComingSoon` (dashed border). This is the source of "A Fase 7 esta chegando!" visual. The `isNavigable` check prevents clicking on coming-soon phases, but they are visually rendered and can be confusing.

**CONFLICT-004 (MAJOR)**: `ExpeditionProgressBar` has its own `PHASE_ROUTES` map at lines 13-20 where Phase 1 maps to `""` (empty string), meaning clicking Phase 1 navigates to `/expedition/{tripId}` (the hub page) instead of `/expedition/{tripId}/phase-1`. This contradicts the canonical `PHASE_ROUTE_MAP` where Phase 1 = `"/phase-1"`. This component appears to be a legacy remnant, but if used anywhere, it would cause wrong navigation.

**CONFLICT-005 (MAJOR)**: `ExpeditionProgressBar` uses `isPast = phaseNum < currentPhase` to determine completed phases. It has NO `completedPhases` prop and cannot distinguish between "completed" and "skipped" phases. Non-blocking phases (3, 4) that were skipped via `advanceFromPhase` would show as "past" (completed) even though they are not completed.

**CONFLICT-006 (MINOR)**: `DashboardPhaseProgressBar` at line 78 considers a phase navigable only if `isCompleted || isCurrent`. It does NOT check `canNavigateToPhase()` from the engine, which also allows navigation to phases behind the current one and to non-blocking phases. This means a user who advanced from Phase 3 (skipped) cannot navigate back to Phase 3 from the dashboard progress bar.

---

## 4. Guards & Redirects (Complete Inventory)

### 4.1 Server-Side Guards

| Guard | File | What It Checks | Redirect Target | Call Sites |
|---|---|---|---|---|
| `guardPhaseAccess` | `src/lib/guards/phase-access.guard.ts` | Auth session, BOLA, calls `resolveAccess()` from engine | If blocked: `getPhaseUrl(tripId, safeCurrentPhase)` | All 6 phase page.tsx files |
| `resolveAccess` | `src/lib/engines/phase-navigation.engine.ts:60-126` | Range check, completedPhases, currentPhase, non-blocking | Returns `redirectTo` URL | `guardPhaseAccess`, `shouldRedirect` |
| Expedition hub redirect | `src/app/[locale]/(app)/expedition/[tripId]/page.tsx:36-41` | `trip.currentPhase` range check | If in 1-6: redirect to `getPhaseUrl(tripId, trip.currentPhase)` | Direct visit to `/expedition/{tripId}` |

### 4.2 Client-Side Navigation

| Navigation | File | Trigger | Target | Concern |
|---|---|---|---|---|
| Phase1Wizard submit (new) | `Phase1Wizard.tsx:314` | createExpeditionAction success | `/expedition/{tripId}/phase-2` | OK |
| Phase1Wizard submit (edit) | `Phase1Wizard.tsx:301` | updatePhase1Action success | `/expedition/{tripId}/phase-2` | Always goes to phase 2 even on revisit |
| Phase2Wizard submit (new) | `Phase2Wizard.tsx:191` | completePhase2Action success | `/expedition/{tripId}/phase-3` | OK |
| Phase2Wizard submit (revisit) | `Phase2Wizard.tsx:157` | accessMode === "revisit" && completedPhases.includes(2) | `/expedition/{tripId}/phase-3` | Navigates forward, not back to where user came from |
| Phase3Wizard advance | `Phase3Wizard.tsx:113` | advanceFromPhaseAction success | `/expedition/{tripId}/phase-4` | OK |
| Phase3Wizard revisit primary | `Phase3Wizard.tsx:147` | isRevisiting (currentPhase > 3) | `/expedition/{tripId}/phase-4` | Always navigates forward |
| Phase4Wizard advance | `Phase4Wizard.tsx:226` | advanceFromPhaseAction success | `/expedition/{tripId}/phase-5` | OK |
| Phase5Wizard complete | `DestinationGuideWizard.tsx:154,168` | revisit or completePhase5Action | `/expedition/{tripId}/phase-6` | OK |
| Phase6Wizard done | `Phase6Wizard.tsx:202-206` | [DONE] stream event | `syncPhase6CompletionAction` + `router.refresh()` | Does NOT navigate forward; stays on phase 6 |
| UnifiedProgressBar click | `UnifiedProgressBar.tsx:115` | Click on navigable segment | `getPhaseUrl(tripId, phaseNum)` (canonical) | OK |
| DashboardPhaseProgressBar click | `DashboardPhaseProgressBar.tsx:96` | Click on navigable segment | `/expedition/{tripId}${PHASE_ROUTES[phaseNum]}` (canonical) | OK, but only completed/current are clickable |

### 4.3 Guard Logic Flow

```
User visits /expedition/{tripId}/phase-N
  |
  v
guardPhaseAccess(tripId, N, locale)
  |-- auth check -> redirect to login if no session
  |-- BOLA check -> redirect to /expeditions if trip not found
  |-- Fetch trip.currentPhase (with defensive coerce to >= 1)
  |-- Fetch ExpeditionPhase WHERE status = "completed" -> completedPhases[]
  |-- resolveAccess(N, tripCurrentPhase, completedPhases)
       |
       |-- N out of range (< 1 or > 6) -> BLOCKED -> redirect to current phase
       |-- completedPhases.has(N) -> ALLOWED (revisit)
       |-- N === tripCurrentPhase -> ALLOWED (first_visit)
       |-- N < tripCurrentPhase -> ALLOWED (revisit)  <-- even if not completed!
       |-- N in {3,4} && tripCurrentPhase >= 2 -> ALLOWED (first_visit)
       |-- else -> BLOCKED -> redirect to current phase
```

**CONFLICT-007 (MAJOR)**: `resolveAccess` at line 100-107 returns `mode: "revisit"` for any phase behind `tripCurrentPhase`, even if that phase was never completed (e.g., phase 3 was skipped via `advanceFromPhase`). This means Phase 3 can show the "revisitando" edit-mode banner even on what is effectively a first visit. The mode should be `"first_visit"` for skipped phases.

---

## 5. Phase 2 -> 3 Error -- Full Trace

### 5.1 Happy Path (First Visit)

1. User clicks "Confirm" on Phase2Wizard confirmation step
2. `handleSubmit()` is called (Phase2Wizard.tsx:152)
3. Guard check: `accessMode === "revisit" && completedPhases.includes(2)` -- **false** on first visit
4. Calls `completePhase2Action(tripId, data)` (expedition.actions.ts:221)
5. Validates session, parses with `Phase2Schema`
6. Calls `ExpeditionService.completePhase2(tripId, userId, data)` (expedition.service.ts:148)
7. Saves passengers to Trip if provided
8. Calls `PhaseEngine.completePhase(tripId, userId, 2, metadata)` (phase-engine.ts:137)
9. PhaseEngine validates:
   - Trip exists and BOLA passes
   - `trip.expeditionMode === true`
   - Phase 2 definition: `nonBlocking = false` -> requires `phaseNumber === trip.currentPhase`
   - **If `trip.currentPhase !== 2`** -> throws `PHASE_ORDER_VIOLATION`
   - Phase status must be "active" (not "locked" or "completed")
10. If all checks pass: transaction marks phase 2 completed, awards 150 points, unlocks phase 3, updates `trip.currentPhase = 3`
11. Returns to action -> revalidates paths
12. Calls `PhaseCompletionService.checkAndCompleteTrip` (fire-and-forget)
13. Returns success to client
14. Client navigates to `/expedition/{tripId}/phase-3`

### 5.2 Error Scenario: `PHASE_ORDER_VIOLATION`

This error occurs when `phaseNumber !== trip.currentPhase`, which means:
- `trip.currentPhase` is NOT 2 at the time of completion
- This can happen if:
  - **Race condition**: User double-clicks and the first call already advanced `currentPhase` to 3
  - **Stale server component**: The page was rendered with `currentPhase = 2`, but another tab/action already advanced it
  - **Phase 3/4 non-blocking advance**: If the user visited Phase 3 or 4 (non-blocking) and somehow advanced, `currentPhase` would have moved past 2

### 5.3 Error Scenario: `PHASE_ALREADY_COMPLETED`

This occurs if `phase.status === "completed"` for phase 2. Can happen if:
- `syncPhaseStatus` auto-completed phase 2 based on data presence (travelerType exists)
- Double submission

### 5.4 Error Scenario on Revisit

When revisiting Phase 2 (accessMode = "revisit"):
- Phase2Wizard.tsx:156: checks `accessMode === "revisit" && completedPhases.includes(2)`
- If both true: navigates to phase-3 without calling any action
- **Problem**: the wizard does not call `updatePhase2Action` when revisiting, so changes are lost
- The revisit guard navigates to phase-3 unconditionally, even if the user wanted to save changes

---

## 6. "A Fase 7 esta chegando!" -- Root Cause

### Finding

`DashboardPhaseProgressBar` (line 40) iterates over `PHASE_DEFINITIONS`, which contains **8 entries** (phases 1-8). For each phase:

```typescript
PHASE_DEFINITIONS.map((phase) => {
  const phaseNum = phase.phaseNumber;
  const isComingSoon = phaseNum >= 7;
  ...
})
```

Phases 7 and 8 are rendered with dashed borders and the `stateComingSoon` label. This is **intentional behavior** -- the dashboard progress bar is designed to show all 8 phases with 7-8 as "coming soon".

However, the **`ExpeditionCard`** passes `totalPhases` (which is **8** from `trip.phases.length`) to the text display:

```typescript
// ExpeditionCard.tsx:106-111
{t("phasesCompleted", {
  current: currentPhase,
  total: totalPhases,  // <-- 8
  completed: completedPhases.length,
})}
```

And `ExpeditionCardRedesigned` displays:

```typescript
// ExpeditionCardRedesigned.tsx:142
{t("phaseLabel", { current: exp.currentPhase, total: TOTAL_ACTIVE_PHASES })} // <-- 6 (correct)
```

### Root Cause

**CONFLICT-008 (CRITICAL)**: `TripService.getUserTripsWithExpeditionData()` at line 248 sets:
```typescript
totalPhases: trip.phases.length  // Returns 8 (all DB rows)
```

This propagates to:
- `ExpeditionDTO.totalPhases = 8`
- `ExpeditionCard` text: "Fase 4 de 8"
- `deriveExpeditionStatus`: `completedPhases.length >= totalPhases` -> `6 >= 8` -> **never "completed"**
- `ExpeditionCard.isExpeditionCompleted`: `completedPhases.length >= totalPhases` -> **always false**

The `ExpeditionCardRedesigned` correctly uses `TOTAL_ACTIVE_PHASES` (6) for text display, but still receives `totalPhases: 8` in its `ExpeditionDTO`, so `deriveExpeditionStatus` still fails.

### Fix Required

`TripService.getUserTripsWithExpeditionData()` should set:
```typescript
totalPhases: trip.phases.filter(p => p.phaseNumber <= 6).length
// OR simply use the constant:
totalPhases: 6  // TOTAL_ACTIVE_PHASES
```

---

## 7. Phase 6 Revisit on First Visit -- Root Cause

### Finding

The `resolveAccess` function at line 100-107:

```typescript
// Phase is behind the current frontier but not completed
// (edge case: phase was skipped via non-blocking advance)
if (requestedPhase < tripCurrentPhase) {
  return {
    allowed: true,
    mode: "revisit",  // <-- ALWAYS "revisit" for phases behind current
    ...
  };
}
```

This means if `tripCurrentPhase = 7` (which happens after completing phase 6, since `PhaseEngine.completePhase` sets `currentPhase = Math.min(phaseNumber + 1, TOTAL_PHASES) = 7`), then visiting Phase 6 returns `mode: "revisit"`.

**But the guard has a separate check for completed phases** at line 79-86 which fires first:
```typescript
if (completedSet.has(requestedPhase)) {
  return { mode: "revisit" };  // <-- Correctly identifies revisit for completed phases
}
```

So for Phase 6, if `completedPhases` includes 6, it returns "revisit" correctly.

### The Actual Bug Scenario

Phase 6 shows "revisitando" on what appears to be a first visit when:

1. User arrives at Phase 6 for the first time (`tripCurrentPhase = 6`, phase 6 status = "active")
2. The page.tsx renders Phase6Wizard with `accessMode = "first_visit"` (correct)
3. User generates an itinerary via streaming
4. On `[DONE]`, `syncPhase6CompletionAction` fires (fire-and-forget)
5. `syncPhase6CompletionAction` calls `PhaseEngine.completePhase(tripId, userId, 6)`
6. This sets `trip.currentPhase = Math.min(7, 8) = 7` and `ExpeditionPhase.status = "completed"` for phase 6
7. `router.refresh()` fires, causing the server component to re-render
8. `guardPhaseAccess(tripId, 6, locale)` now sees `tripCurrentPhase = 7` and phase 6 in `completedPhases`
9. `resolveAccess(6, 7, [1,2,...,6])` -> `completedPhases.has(6)` -> returns `mode: "revisit"`
10. PhaseShell renders the edit-mode banner: "Voce esta revisitando a Fase 6"

**ROOT CAUSE**: The `router.refresh()` after `syncPhase6CompletionAction` causes the page to re-render with updated server state, but the user is still on the same page from their perspective. The transition from `first_visit` to `revisit` happens mid-session without any navigation.

### Fix Options

1. Phase6Wizard should NOT call `router.refresh()` after sync -- use client-side state update instead
2. Or: `PhaseShell` should not show the edit-mode banner if the user hasn't navigated away and back
3. Or: `syncPhase6CompletionAction` should complete the phase without advancing `trip.currentPhase` beyond 6 (since phases 7-8 don't exist yet)

---

## 8. Progress Bar Wrong Navigation -- Root Cause

### 8.1 ExpeditionProgressBar (Legacy)

This component has its own route map:
```typescript
const PHASE_ROUTES: Record<number, string> = {
  1: "",          // <-- Phase 1 navigates to /expedition/{tripId} (hub page)
  2: "/phase-2",
  ...
};
```

This contradicts the canonical `PHASE_ROUTE_MAP`:
```typescript
export const PHASE_ROUTE_MAP: Record<number, string> = {
  1: "/phase-1",  // <-- Phase 1 navigates to /expedition/{tripId}/phase-1
  ...
};
```

If `ExpeditionProgressBar` is used anywhere, clicking Phase 1 would navigate to the hub page, which then redirects to the current phase (not Phase 1).

### 8.2 DashboardPhaseProgressBar Navigation Logic

The component at line 78 considers a phase navigable only if:
```typescript
const isNavigable = (isCompleted || isCurrent) && tripId && PHASE_ROUTES[phaseNum] !== undefined;
```

This does NOT use `canNavigateToPhase()` from the engine. Problems:
- Phases behind current but not completed (skipped non-blocking) are NOT navigable
- Non-blocking phases (3, 4) that are accessible per the engine are NOT navigable from dashboard
- The `PHASE_ROUTES` check is for phases 1-6 only (key 7 and 8 are not in the map), so phases 7-8 are correctly non-navigable

### 8.3 UnifiedProgressBar Navigation Logic

This component correctly uses `canNavigateToPhase()` from the engine at line 98:
```typescript
const isNavigable = canNavigateToPhase(tripCurrentPhase, phaseNum, completedPhases);
```

And uses `getPhaseUrl()` for navigation. This is correct.

**CONFLICT-009**: `DashboardPhaseProgressBar` and `UnifiedProgressBar` have different navigability rules. A phase that is navigable in the wizard (UnifiedProgressBar) may not be navigable from the dashboard card (DashboardPhaseProgressBar).

---

## 9. Data Flow Diagram

```
                        +-----------------------+
                        |   Prisma Schema       |
                        |  Trip.currentPhase    |
                        |  ExpeditionPhase[]    |
                        |    .status            |
                        |    .phaseNumber       |
                        +-----------+-----------+
                                    |
                +-------------------+-------------------+
                |                                       |
    +-----------v-----------+              +------------v-----------+
    | PhaseEngine           |              | PhaseCompletionService |
    | (status-based)        |              | (data-based)           |
    |                       |              |                        |
    | completePhase()       |              | evaluatePhaseCompletion|
    |  -> set status =      |              |  -> check data presence|
    |     "completed"       |              |                        |
    |  -> update            |              | syncPhaseStatus()      |
    |     currentPhase      |              |  -> reconcile DB status|
    |                       |              |     with data presence |
    | advanceFromPhase()    |              |                        |
    |  -> unlock next       |              | checkAndCompleteTrip() |
    |  -> update            |              |  -> set Trip.status =  |
    |     currentPhase      |              |     "COMPLETED"        |
    |  -> DO NOT complete   |              |                        |
    +-----------+-----------+              +------------+-----------+
                |                                       |
                +-------------------+-------------------+
                                    |
                    +---------------v---------------+
                    |   guardPhaseAccess            |
                    |   (reads ExpeditionPhase      |
                    |    status = "completed")      |
                    |                               |
                    |   -> completedPhases[]        |
                    |   -> resolveAccess()          |
                    |   -> accessMode               |
                    +---------------+---------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
+---------v---------+  +-----------v-----------+  +----------v----------+
| UnifiedProgressBar|  | DashboardPhaseProgress|  | ExpeditionProgressBar|
| (6 phases)        |  | Bar (8 phases)        |  | (totalPhases prop)   |
| Uses engine's     |  | Uses PHASE_DEFINITIONS|  | Own PHASE_ROUTES     |
| getPhaseState()   |  | Local isCompleted     |  | isPast = num < cur   |
| canNavigateToPhase|  | isCompleted||isCurrent|  | (LEGACY)             |
+---------+---------+  +-----------+-----------+  +----------+----------+
          |                         |                         |
          v                         v                         v
   Phase wizard pages        Dashboard cards          (Possibly unused)
   (all via PhaseShell)      (ExpeditionCard,
                              ExpeditionCardRedesigned)
```

---

## 10. Conflicts Identified (Complete List)

| # | Severity | Description | Files Involved |
|---|---|---|---|
| CONFLICT-001 | CRITICAL | `totalPhases` from DB returns 8, but only 6 phases are active. `deriveExpeditionStatus` and `isExpeditionCompleted` never return true. | `trip.service.ts:248`, `expedition.types.ts:48`, `ExpeditionCard.tsx:44` |
| CONFLICT-002 | MAJOR | Two parallel completion systems: PhaseEngine (status-based) vs PhaseCompletionEngine (data-based). Can disagree. | `phase-engine.ts`, `phase-completion.engine.ts`, `phase-completion.service.ts` |
| CONFLICT-003 | CRITICAL | `DashboardPhaseProgressBar` renders 8 phases (from `PHASE_DEFINITIONS`), showing phases 7-8 as "coming soon". | `DashboardPhaseProgressBar.tsx:40` |
| CONFLICT-004 | MAJOR | `ExpeditionProgressBar` has own `PHASE_ROUTES` with Phase 1 = `""` (contradicts canonical `"/phase-1"`). | `ExpeditionProgressBar.tsx:13-20` |
| CONFLICT-005 | MAJOR | `ExpeditionProgressBar` has no `completedPhases` prop -- uses `phaseNum < currentPhase` to determine "past" phases. Cannot distinguish completed from skipped. | `ExpeditionProgressBar.tsx:44` |
| CONFLICT-006 | MINOR | `DashboardPhaseProgressBar` navigability check does not use `canNavigateToPhase()` from engine. Skipped/non-blocking phases are not clickable. | `DashboardPhaseProgressBar.tsx:78` |
| CONFLICT-007 | MAJOR | `resolveAccess` returns `mode: "revisit"` for all phases behind `tripCurrentPhase`, even if never completed (skipped via advanceFromPhase). | `phase-navigation.engine.ts:100-107` |
| CONFLICT-008 | CRITICAL | `trip.phases.length` (8) is used as `totalPhases` in DTO, preventing expedition completion detection. | `trip.service.ts:248` |
| CONFLICT-009 | MINOR | `DashboardPhaseProgressBar` and `UnifiedProgressBar` use different navigability rules. | `DashboardPhaseProgressBar.tsx:78`, `UnifiedProgressBar.tsx:98` |
| CONFLICT-010 | MAJOR | Phase 6 `router.refresh()` after `syncPhase6CompletionAction` causes mid-session transition from "first_visit" to "revisit", showing edit-mode banner unexpectedly. | `Phase6Wizard.tsx:202-206` |
| CONFLICT-011 | MINOR | `Phase3Wizard` uses `isRevisiting = currentPhase > 3` (separate from `accessMode`); `Phase4Wizard` uses `isRevisiting = accessMode === "revisit" \|\| currentPhase > 4` (mixed). Inconsistent revisit logic across wizards. | `Phase3Wizard.tsx:52`, `Phase4Wizard.tsx:88` |
| CONFLICT-012 | INFO | `Phase2Wizard` revisit guard skips `updatePhase2Action` entirely, so edits made during revisit are silently discarded. | `Phase2Wizard.tsx:155-159` |
| CONFLICT-013 | INFO | `PhaseEngine.completePhase` sets `currentPhase = Math.min(phaseNumber + 1, TOTAL_PHASES)`, where `TOTAL_PHASES = 8`. After completing phase 6, `currentPhase` becomes 7. This "Phase 7" state triggers the "coming soon" hub page for any direct `/expedition/{tripId}` visit. | `phase-engine.ts:272` |

---

## 11. Single-Source-of-Truth Proposal

### Problem Statement

The codebase has 3 phase counts (6, 8, prop-based), 2 completion systems (status vs data), 3 progress bar components, 2 route maps, and inconsistent revisit logic. These compound into recurring bugs.

### Proposed Architecture: PhaseStateService

A single service that consolidates all phase state queries and mutations, used by all consumers.

#### 11.1 Unify Phase Count

```typescript
// phase-navigation.engine.ts
export const TOTAL_ACTIVE_PHASES = 6;  // THE constant for all UI and business logic
```

**Actions**:
1. `TripService.getUserTripsWithExpeditionData()` must set `totalPhases: TOTAL_ACTIVE_PHASES` (not `trip.phases.length`)
2. `DashboardPhaseProgressBar` must iterate `TOTAL_ACTIVE_PHASES` times (not `PHASE_DEFINITIONS.length`)
3. `PhaseEngine.completePhase` must cap `currentPhase` at `TOTAL_ACTIVE_PHASES`, not `TOTAL_PHASES`
4. Remove or deprecate `ExpeditionProgressBar` (replaced by `UnifiedProgressBar`)

#### 11.2 Unify Completion System

Choose ONE source of truth for "phase completed":
- **Recommendation**: `ExpeditionPhase.status` is the authoritative source (it's what the guard reads)
- `PhaseCompletionEngine` becomes a diagnostic/readiness tool only -- it checks "could this phase be completed?" but does NOT write status
- `syncPhaseStatus` should be removed or gated behind an explicit admin/migration action, not called in normal user flows

#### 11.3 Unify Progress Bar

- **Keep**: `UnifiedProgressBar` (correct engine usage, 6 phases, canonical routes)
- **Fix**: `DashboardPhaseProgressBar` -- iterate `TOTAL_ACTIVE_PHASES`, use `canNavigateToPhase()` from engine
- **Delete**: `ExpeditionProgressBar` (legacy, wrong route map, no completedPhases)
- **Delete**: `PhaseProgressBar` (legacy, replaced by StepProgressIndicator)

#### 11.4 Fix accessMode for Skipped Phases

In `resolveAccess`, differentiate between "behind current and completed" vs "behind current and not completed":

```typescript
if (requestedPhase < tripCurrentPhase) {
  if (completedSet.has(requestedPhase)) {
    return { mode: "revisit" };      // Completed: revisit
  }
  return { mode: "first_visit" };    // Skipped: first visit
}
```

#### 11.5 Fix Phase 6 Router Refresh

Phase6Wizard should not call `router.refresh()` after `syncPhase6CompletionAction`. Instead, update local client state to reflect completion.

#### 11.6 Fix Phase 2 Revisit Data Loss

Phase2Wizard revisit guard should call `updatePhase2Action` before navigating, not skip the save entirely.

### Priority Order

1. **P0**: Fix `totalPhases` (CONFLICT-001, CONFLICT-008) -- 1 line change in trip.service.ts
2. **P0**: Cap `currentPhase` at 6 in `PhaseEngine.completePhase` (CONFLICT-013) -- 1 line change
3. **P1**: Fix `DashboardPhaseProgressBar` to render 6 phases (CONFLICT-003) -- small refactor
4. **P1**: Fix `resolveAccess` revisit mode for skipped phases (CONFLICT-007) -- logic change
5. **P1**: Remove `ExpeditionProgressBar` and `PhaseProgressBar` (CONFLICT-004, CONFLICT-005) -- cleanup
6. **P2**: Fix Phase 6 router.refresh issue (CONFLICT-010) -- behavior change
7. **P2**: Fix Phase 2 revisit data loss (CONFLICT-012) -- behavior change
8. **P2**: Unify DashboardPhaseProgressBar navigability with engine (CONFLICT-006, CONFLICT-009)
9. **P2**: Standardize revisit logic across all wizards (CONFLICT-011)
10. **P3**: Evaluate removing dual completion system (CONFLICT-002) -- architectural decision

---

## Appendix A: File Index

All files that participate in phase navigation (for grep reference):

**Engines (pure logic)**:
- `src/lib/engines/phase-config.ts` -- PHASE_DEFINITIONS (8), TOTAL_PHASES (8)
- `src/lib/engines/phase-engine.ts` -- completePhase, advanceFromPhase, canAccessPhase
- `src/lib/engines/phase-navigation.engine.ts` -- TOTAL_ACTIVE_PHASES (6), PHASE_ROUTE_MAP, resolveAccess, canNavigateToPhase, getPhaseState
- `src/lib/engines/phase-completion.engine.ts` -- TOTAL_COMPLETION_PHASES (6), evaluatePhaseCompletion, isExpeditionComplete

**Guards**:
- `src/lib/guards/phase-access.guard.ts` -- guardPhaseAccess

**Services (DB)**:
- `src/server/services/expedition.service.ts` -- createExpedition, completePhase2
- `src/server/services/phase-completion.service.ts` -- syncPhaseStatus, checkAndCompleteTrip
- `src/server/services/trip.service.ts` -- getUserTripsWithExpeditionData (totalPhases = phases.length)
- `src/server/services/trip-readiness.service.ts` -- calculateTripReadiness

**Actions**:
- `src/server/actions/expedition.actions.ts` -- all phase completion actions

**Pages (server components)**:
- `src/app/[locale]/(app)/expedition/[tripId]/page.tsx` -- hub redirect
- `src/app/[locale]/(app)/expedition/[tripId]/phase-{1..6}/page.tsx` -- phase pages
- `src/app/[locale]/(app)/expeditions/page.tsx` -- expedition list

**Wizards (client components)**:
- `src/components/features/expedition/Phase{1..4}Wizard.tsx`
- `src/components/features/expedition/DestinationGuideWizard.tsx` (Phase 5)
- `src/components/features/expedition/Phase6Wizard.tsx`

**Progress bars**:
- `src/components/features/expedition/UnifiedProgressBar.tsx` -- CORRECT (6 phases, engine)
- `src/components/features/expedition/PhaseShell.tsx` -- uses UnifiedProgressBar
- `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` -- BUGGY (8 phases)
- `src/components/features/expedition/ExpeditionProgressBar.tsx` -- LEGACY (wrong routes)
- `src/components/features/expedition/PhaseProgressBar.tsx` -- LEGACY (intra-phase)

**Dashboard cards**:
- `src/components/features/dashboard/ExpeditionCard.tsx` -- uses totalPhases (8)
- `src/components/features/dashboard/ExpeditionCardRedesigned.tsx` -- uses TOTAL_ACTIVE_PHASES (6) for label
- `src/components/features/dashboard/ExpeditionsList.tsx` -- passes totalPhases through

**Types**:
- `src/types/expedition.types.ts` -- ExpeditionDTO, deriveExpeditionStatus
- `src/types/gamification.types.ts` -- PhaseNumber, PhaseStatus, PhaseCompletionResult
