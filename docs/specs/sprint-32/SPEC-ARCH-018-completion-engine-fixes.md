# SPEC-ARCH-018: Phase Completion Engine Fixes — Architecture Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, security-specialist, qa-engineer]
**Product Spec**: SPEC-PROD-025 (P0-001, P0-006), SPEC-PROD-026 (P0-002, P0-003, P0-005, P0-007, UX-006)
**UX Spec**: N/A (stabilization — no UX changes beyond correct behavior)
**Created**: 2026-03-19
**Last Updated**: 2026-03-19

---

## 1. Overview

This spec documents the architectural root causes and fixes for 7 bugs (6 P0, 1 UX improvement) in the phase completion and transition subsystem. All bugs trace to one of three patterns: (a) missing revisit guards in wizard components, (b) inflated `completedPhases` count via a flawed heuristic in TripService, and (c) missing completion sync calls after data-changing actions. No schema migration is needed — all fixes operate on existing data models.

The fixes apply to three layers: the PhaseCompletionService (new `syncPhaseStatus` method), server actions (new `updatePhase2Action`, modified `togglePhase3ItemAction`, new `syncPhase6CompletionAction`), and client wizards (Phase2Wizard revisit guard, Phase6Wizard post-generation sync).

---

## 2. Architecture Decision Records

### ADR-018: Phase Completion Sync Pattern
- **Status**: Proposed
- **Context**: The completion engine (`phase-completion.engine.ts`) is a pure function layer that evaluates phase status from data snapshots but has no side effects. The `PhaseCompletionService` only provides `checkAndCompleteTrip` (all-or-nothing trip completion) and `getPhaseCompletionStatus` (read-only). There is no method to sync a single phase's `ExpeditionPhase.status` based on current data, creating a gap: data changes (toggles, edits, generation) do not update phase status.
- **Decision**: Add `PhaseCompletionService.syncPhaseStatus(tripId, userId, phaseNumber)` as the canonical method for bidirectional phase status sync. This method builds a snapshot, evaluates the target phase, and conditionally updates `ExpeditionPhase.status`. It does NOT award/revoke points (that remains PhaseEngine's responsibility). Every action that mutates data affecting completion criteria must call this method.
- **Consequences**:
  - **Positive**: Single point of truth for status sync; idempotent; testable in isolation; no gamification side effects.
  - **Negative / Trade-offs**: Adds one DB read (snapshot) + one conditional write per toggle/save. Acceptable given Phase 3 toggles are infrequent (user clicks, not batch).
  - **Risks**: If a new phase-affecting action is added in the future and the developer forgets to call `syncPhaseStatus`, the same class of bug will recur. Mitigated by documenting the pattern and adding a "Phase Completion Sync Checklist" to the implementation guide.
- **Alternatives Considered**:
  - **Database trigger**: Would eliminate the "forgotten call" risk but moves business logic into the DB layer, violating our architecture principle of keeping logic in application code. Rejected.
  - **Event-driven (pub/sub)**: Cleaner separation but over-engineered for the current scale. Could revisit if we add more phase-affecting actions. Rejected for MVP.
  - **Middleware/interceptor on all expedition actions**: Too broad; would add overhead to actions that don't affect completion. Rejected.

---

## 3. System Design

### Component Diagram

```
                        Client (Browser)
                             |
     +----------+-------+---+----+-----------+
     |          |        |        |           |
Phase2Wizard  Phase3    Phase4  Phase6     Dashboard
  (revisit    (toggle)  (advance) (generation) (progress bar)
   guard)       |         |        |           |
     |          |         |        |           |
     v          v         v        v           v
[updatePhase2  [toggle   [advance [syncPhase6  [getUserTrips
 Action]       Phase3    FromPhase Completion   WithExpedition
     |         Item       Action]  Action]      Data]
     |         Action]     |        |           |
     |          |          |        |           |
     v          v          v        v           v
  (saves      (toggles  (advances (completes  (returns
   data,       item,     phase,    Phase 6,    number[]
   no          syncs     syncs     checks      not count)
   complete)   status)   status)   trip)
     |          |          |        |
     +----+-----+----+-----+-------+
          |          |
          v          v
  PhaseCompletion  PhaseEngine
  Service          (completePhase,
  .syncPhaseStatus  advanceFromPhase)
          |
          v
  phase-completion.engine.ts  (pure functions)
  evaluatePhaseCompletion()
```

### Data Flow: Phase Status Sync (new pattern)

```
Action mutates data (toggle checklist item, save transport, generate itinerary)
    |
    v
Call PhaseCompletionService.syncPhaseStatus(tripId, userId, phaseNumber)
    |
    v
buildSnapshot(tripId, userId)  -- parallel DB queries for all phase data
    |
    v
evaluatePhaseCompletion(phaseNumber, snapshot)  -- pure function, returns status
    |
    v
Compare result.status with current ExpeditionPhase.status
    |
    +-- Same? --> No-op (return false)
    |
    +-- Different? --> UPDATE ExpeditionPhase SET status = newStatus
                       |
                       +-- If newStatus is "completed" AND was "active":
                       |     log "phase.auto-completed"
                       |
                       +-- If newStatus is NOT "completed" AND was "completed":
                       |     log "phase.status-reverted"
                       |     Also check: was trip.status = "COMPLETED"?
                       |       +-- Yes: revert trip.status to "IN_PROGRESS"
                       |
                       +-- return true (status changed)
```

### Data Flow: Phase 2 Revisit (P0-001 / P0-006 fix)

```
User navigates to Phase 2 (revisit mode)
    |
    v
Phase2Wizard receives accessMode="revisit", completedPhases=[1,2,...]
    |
    v
User edits data and clicks "Salvar"
    |
    v
handleSubmit() checks: accessMode === "revisit" && completedPhases.includes(2)?
    |
    +-- YES: call updatePhase2Action(tripId, data)
    |         |
    |         v
    |       Saves data to DB (travelerType, budget, passengers, etc.)
    |       Does NOT call PhaseEngine.completePhase()
    |       Does NOT award points/badges
    |       Calls syncPhaseStatus(tripId, userId, 2) to verify completion still valid
    |       Navigate to phase-3
    |
    +-- NO (first_visit): call completePhase2Action(tripId, data) [existing behavior]
```

### Data Flow: Phase 6 Auto-Complete (P0-007 / UX-006 fix)

```
Phase6Wizard: itinerary generation completes successfully
    |
    v
setDays(parsedDays) -- UI updates with generated itinerary
    |
    v
Call syncPhase6CompletionAction(tripId) -- fire-and-forget
    |
    v
Server action:
  1. buildSnapshot(tripId, userId) -- check itineraryDayCount > 0
  2. evaluatePhaseCompletion(6, snapshot) -- returns "completed" if days exist
  3. Current Phase 6 status check:
     +-- "active" or "pending": call PhaseEngine.completePhase(tripId, userId, 6)
     |     Awards points, badge, unlocks next
     +-- "completed": no-op (idempotent for re-generation)
  4. PhaseCompletionService.checkAndCompleteTrip(tripId, userId)
     Checks all 6 phases; if all completed, sets trip.status = "COMPLETED"
```

### Data Flow: Dashboard completedPhases fix (P0-005 / P0-003)

```
TripService.getUserTripsWithExpeditionData(userId)
    |
    v
BEFORE (buggy):
  completedPhases = Math.max(
    phases.filter(p => p.status === "completed").length,
    trip.currentPhase - 1  // <-- inflates count
  )
    |
    v
AFTER (fixed):
  completedPhases = phases
    .filter(p => p.status === "completed")
    .map(p => p.phaseNumber)   // Returns number[], e.g. [1, 2, 5]
    |
    v
DashboardPhaseProgressBar:
  BEFORE: isCompleted = phaseNum <= completedPhases  // sequential model
  AFTER:  isCompleted = completedPhases.includes(phaseNum)  // set model
```

### API Contracts

#### New Server Action: `updatePhase2Action`

```typescript
export async function updatePhase2Action(
  tripId: string,
  data: Phase2Input
): Promise<ActionResult<{ tripId: string }>>
```

- **Auth**: Required (session.user.id)
- **BOLA**: Verifies trip.userId === session.userId
- **Validation**: Phase2Schema (reuse existing)
- **Side effects**: Updates trip metadata (travelerType, budget, passengers). Calls `syncPhaseStatus(tripId, userId, 2)`. Calls `revalidatePath`.
- **Does NOT**: Call PhaseEngine.completePhase. Award points/badges. Change ExpeditionPhase.status directly.
- **Error responses**: `errors.tripNotFound` (BOLA), `errors.generic` (validation), `errors.unauthorized`

#### New Server Action: `syncPhase6CompletionAction`

```typescript
export async function syncPhase6CompletionAction(
  tripId: string
): Promise<ActionResult<{ completed: boolean; tripCompleted: boolean }>>
```

- **Auth**: Required
- **BOLA**: Verifies trip ownership
- **Logic**:
  1. Check if Phase 6 is already completed -> if yes, return `{ completed: true, tripCompleted: false }` (idempotent)
  2. Build snapshot, evaluate Phase 6
  3. If itinerary exists and Phase 6 not completed: call `PhaseEngine.completePhase(tripId, userId, 6)` (wrapped in try/catch for PHASE_ALREADY_COMPLETED)
  4. Call `PhaseCompletionService.checkAndCompleteTrip(tripId, userId)`
  5. Return `{ completed: true, tripCompleted }` where tripCompleted = result of checkAndCompleteTrip
- **Error responses**: `errors.tripNotFound`, `errors.generic`

#### Modified Server Action: `togglePhase3ItemAction`

```typescript
// Existing signature unchanged. New behavior: after toggle, sync phase status.
export async function togglePhase3ItemAction(
  tripId: string,
  itemKey: string
): Promise<ActionResult<{ completed: boolean; pointsAwarded: number }>>
```

- **New side effect**: After `ChecklistEngine.toggleItem()`, call `PhaseCompletionService.syncPhaseStatus(tripId, session.user.id, 3)`.
- **Revalidation**: Add `revalidatePath("/expeditions")` to propagate dashboard status change.

#### New Service Method: `PhaseCompletionService.syncPhaseStatus`

```typescript
static async syncPhaseStatus(
  tripId: string,
  userId: string,
  phaseNumber: number
): Promise<{ changed: boolean; newStatus: PhaseCompletionStatus }>
```

- **BOLA**: Inherited from buildSnapshot
- **Logic**:
  1. `buildSnapshot(tripId, userId)`
  2. `evaluatePhaseCompletion(phaseNumber, snapshot)` -> `result`
  3. Fetch current `ExpeditionPhase` for `(tripId, phaseNumber)`
  4. Map engine status to DB status: `"completed" -> "completed"`, `"in_progress" -> "active"`, `"pending" -> "active"`
  5. If current DB status === mapped status: return `{ changed: false, newStatus }`
  6. If different: `UPDATE ExpeditionPhase SET status = mappedStatus`
  7. If reverting from "completed" to "active": check if `trip.status === "COMPLETED"` and revert to `"IN_PROGRESS"`
  8. Return `{ changed: true, newStatus }`
- **Idempotent**: Yes. Calling with same state is a no-op.
- **Does NOT**: Award/revoke points, badges, or rank. That is PhaseEngine's domain.

#### Modified: `TripService.getUserTripsWithExpeditionData`

```typescript
// Return type change:
// BEFORE: completedPhases: number (count)
// AFTER:  completedPhases: number[] (array of phase numbers)

return trips.map((trip) => ({
  ...trip,
  completedPhases: trip.phases
    .filter((p) => p.status === "completed")
    .map((p) => p.phaseNumber),
  // ... rest unchanged
}));
```

---

## 4. Data Model

No schema changes required. All fixes operate on existing models:

- `Trip`: `status` (String), `currentPhase` (Int)
- `ExpeditionPhase`: `status` (String: "locked" | "active" | "completed"), `phaseNumber` (Int), `tripId` (String)
- `PhaseChecklistItem`: `required` (Boolean), `completed` (Boolean)
- `TransportSegment`, `Accommodation`: count-based checks
- `ItineraryDay`: count-based checks

The `completedPhases` field is a derived/computed value in TripService, not a persisted column. The fix changes how it is computed.

---

## 5. Vendor Dependencies

None. All fixes use existing internal modules.

---

## 6. Constraints (MANDATORY)

### Architectural Boundaries

- `syncPhaseStatus` MUST NOT award or revoke points. Points are earned via `PhaseEngine.completePhase()` only. Status sync is a separate concern.
- `syncPhaseStatus` MUST NOT call `PhaseEngine.completePhase()` directly. If a phase needs to transition from "active" to "completed" with points, the caller action is responsible for that decision.
- The phase-completion.engine.ts MUST remain a pure function module with no imports. `syncPhaseStatus` lives in the service layer.
- `updatePhase2Action` MUST NOT duplicate the profile field saving logic from `completePhase2Action`. Extract shared logic into a helper if needed, or reuse `ExpeditionService.completePhase2` with a `skipCompletion` flag. (Recommendation: create a private helper `savePhase2Data` in expedition.actions.ts or expedition.service.ts.)
- `completedPhases: number[]` change cascades to all consumers of `getUserTripsWithExpeditionData`. The type in `ExpeditionDTO` (or equivalent) must be updated, and TypeScript strict mode will catch all callers.

### Performance Budgets

- `syncPhaseStatus`: p95 < 200ms. One `buildSnapshot` call (8 parallel queries) + one conditional update. Acceptable.
- `togglePhase3ItemAction` with sync: adds ~100-150ms to the current toggle latency. The toggle already returns quickly (< 100ms); total should stay under 300ms p95.
- `completedPhases` array computation: O(n) where n = number of phases (always 6-8). Negligible.
- No additional bundle size impact (all changes are server-side except Phase2Wizard guard logic, which adds ~10 lines of client code).

### Security Requirements

- **BOLA**: All new actions (`updatePhase2Action`, `syncPhase6CompletionAction`) MUST verify `trip.userId === session.user.id` before any data access.
- **Mass assignment**: `updatePhase2Action` MUST map fields explicitly from `Phase2Schema` parsed output. Never spread raw input into Prisma.
- **Error exposure**: PhaseEngine error messages must use i18n keys, never raw English strings that leak implementation details. The SPRINT-32-PLAN already specifies this in TASK-S32-001.
- `syncPhaseStatus` logs `hashUserId(userId)` only, never raw userId.

### Scalability

- Current scale: single-user operations. No concurrent access concerns for phase status sync.
- If future concurrent access is needed (e.g., collaborative trip planning), `syncPhaseStatus` would need optimistic locking. Not needed for MVP.

---

## 7. Implementation Guide

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/server/services/phase-completion.service.ts` | Modify | Add `syncPhaseStatus()` method + trip status reversion logic |
| `src/server/actions/expedition.actions.ts` | Modify | Add `updatePhase2Action`, `syncPhase6CompletionAction`; modify `togglePhase3ItemAction` |
| `src/components/features/expedition/Phase2Wizard.tsx` | Modify | Add revisit guard in `handleSubmit()`: if revisit, call `updatePhase2Action` instead of `completePhase2Action` |
| `src/components/features/expedition/Phase6Wizard.tsx` | Modify | After successful itinerary generation, call `syncPhase6CompletionAction` |
| `src/server/services/trip.service.ts` | Modify | Change `completedPhases` from `number` to `number[]` in `getUserTripsWithExpeditionData` |
| `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` | Modify | Change `completedPhases` prop from `number` to `number[]`; use `.includes()` |
| `src/components/features/dashboard/ExpeditionCard.tsx` | Modify | Update `completedPhases` prop type |
| `src/components/features/dashboard/ExpeditionCardRedesigned.tsx` | Modify | Update `completedPhases` prop type |
| `src/components/features/dashboard/ExpeditionsList.tsx` | Modify | Update `completedPhases` prop type |
| `src/components/features/dashboard/AtlasDashboard.tsx` | Modify | Update `completedPhases` prop type |
| `src/app/[locale]/(app)/expeditions/page.tsx` | Modify | Update mapping if needed |
| `src/lib/engines/phase-engine.ts` | Modify | Change error messages to i18n keys (TASK-S32-001) |
| `messages/en.json` | Modify | Add error keys: `errors.phaseOrderViolation`, `errors.phaseNotActive`, `errors.prerequisitesNotMet` |
| `messages/pt-BR.json` | Modify | Add corresponding Portuguese error keys |

### Migration Strategy

No database migration required. All changes are application-level.

### Phase 2 Revisit Guard Pattern

```typescript
// In Phase2Wizard.handleSubmit():
async function handleSubmit() {
  if (!travelerType || !accommodationStyle) return;
  setIsSubmitting(true);
  setErrorMessage(null);

  const formData = {
    travelerType, accommodationStyle, travelPace, budget, currency,
    travelers: needsPassengers ? totalPassengers : undefined,
    passengers: needsPassengers ? { adults, children: { count: childrenCount, ages: childrenAges }, seniors, infants } : undefined,
  };

  try {
    // REVISIT GUARD: same pattern as DestinationGuideWizard line 153
    if (accessMode === "revisit" && completedPhases.includes(2)) {
      const result = await updatePhase2Action(tripId, formData);
      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }
      router.push(`/expedition/${tripId}/phase-3`);
      return;
    }

    // FIRST VISIT: existing behavior
    const result = await completePhase2Action(tripId, formData);
    // ... existing error handling and navigation
  } catch { ... }
}
```

### syncPhaseStatus Implementation Sketch

```typescript
static async syncPhaseStatus(
  tripId: string,
  userId: string,
  phaseNumber: number
): Promise<{ changed: boolean; newStatus: string }> {
  const snapshot = await this.buildSnapshot(tripId, userId);
  const result = evaluatePhaseCompletion(phaseNumber, snapshot);

  const phase = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber } },
  });

  if (!phase) {
    return { changed: false, newStatus: "pending" };
  }

  // Map engine status to DB status
  const dbStatus = result.status === "completed" ? "completed" : "active";

  if (phase.status === dbStatus) {
    return { changed: false, newStatus: dbStatus };
  }

  // Update phase status
  await db.expeditionPhase.update({
    where: { id: phase.id },
    data: { status: dbStatus },
  });

  // If reverting from completed, check if trip needs status reversion too
  if (phase.status === "completed" && dbStatus === "active") {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { status: true },
    });
    if (trip?.status === "COMPLETED") {
      await db.trip.update({
        where: { id: tripId },
        data: { status: "IN_PROGRESS" },
      });
      logger.info("trip.status-reverted", { tripId, userId: hashUserId(userId) });
    }
  }

  logger.info(
    dbStatus === "completed" ? "phase.auto-completed" : "phase.status-reverted",
    { tripId, userId: hashUserId(userId), phaseNumber, newStatus: dbStatus }
  );

  return { changed: true, newStatus: dbStatus };
}
```

### Phase Completion Sync Checklist (for future developers)

Any server action that mutates data affecting a phase's completion criteria MUST call `syncPhaseStatus` after the mutation. Current list:

| Action | Affects Phase | Sync Call |
|--------|--------------|-----------|
| `togglePhase3ItemAction` | 3 | `syncPhaseStatus(tripId, userId, 3)` |
| `updatePhase2Action` | 2 | `syncPhaseStatus(tripId, userId, 2)` |
| `updatePhase1Action` | 1 | `syncPhaseStatus(tripId, userId, 1)` (add if not present) |
| Transport/Accommodation CRUD actions | 4 | `syncPhaseStatus(tripId, userId, 4)` (add if not present) |
| `syncPhase6CompletionAction` | 6 | Uses `PhaseEngine.completePhase` directly (first completion), then `checkAndCompleteTrip` |
| `generateDestinationGuideAction` | 5 | Already calls `checkAndCompleteTrip`; add `syncPhaseStatus(tripId, userId, 5)` |

---

## 8. Testing Strategy

### Unit Tests

| Test Suite | Layer | What to Test |
|-----------|-------|-------------|
| `phase-completion.service.test.ts` | Service | `syncPhaseStatus`: status forward transition (active->completed), backward transition (completed->active), no-op when unchanged, trip status reversion when phase reverts |
| `expedition.actions.test.ts` | Actions | `updatePhase2Action`: happy path, BOLA violation, validation failure, syncPhaseStatus called |
| `expedition.actions.test.ts` | Actions | `syncPhase6CompletionAction`: first completion, re-generation idempotency, trip auto-completion |
| `expedition.actions.test.ts` | Actions | `togglePhase3ItemAction`: verify syncPhaseStatus called after toggle |
| `trip.service.test.ts` | Service | `getUserTripsWithExpeditionData`: verify `completedPhases` returns `number[]`, skipped non-blocking phases excluded |
| `DashboardPhaseProgressBar.test.tsx` | Component | All-complete, partially-complete, skipped-non-blocking scenarios with `number[]` prop |
| `Phase2Wizard.test.tsx` | Component | Revisit path calls `updatePhase2Action`; first-visit path calls `completePhase2Action` |

### Integration Tests

| Scenario | Coverage |
|----------|----------|
| Phase 2->3 first visit | completePhase2Action -> PhaseEngine.completePhase -> success |
| Phase 2->3 revisit | updatePhase2Action -> saves data, no completion -> success |
| Phase 3 toggle -> uncheck required -> status reverts | togglePhase3ItemAction -> syncPhaseStatus -> ExpeditionPhase.status = "active" |
| Phase 6 generation -> auto-complete | syncPhase6CompletionAction -> PhaseEngine.completePhase(6) -> checkAndCompleteTrip |
| Full expedition flow 1->6 | Each phase completes, trip.status = COMPLETED at end |

### E2E Tests

See SPEC-QA-009 for the full E2E regression plan covering:
- Phase 2->3 transition (first visit and revisit)
- Dashboard progress bar accuracy
- Phase 6 auto-completion after itinerary generation
- Reverse navigation (6->2->3) without errors

### Eval Criteria (EDD)

| Eval Dimension | Criteria | Threshold |
|---------------|----------|-----------|
| Correctness | Phase transitions 1->2->3->4->5->6 complete without error | 100% pass |
| Correctness | Reverse navigation + forward (6->2->3) works | 100% pass |
| Correctness | Phase 3 uncheck reverts status | 100% pass |
| Correctness | Phase 6 auto-complete fires after generation | 100% pass |
| Correctness | Dashboard shows accurate completion (no inflation) | 100% pass |
| Idempotency | syncPhaseStatus called twice with same state = no-op | 100% pass |
| Performance | syncPhaseStatus p95 < 200ms | Measured in dev |
| Security | BOLA on all new actions | Verified by tests |

---

## 9. Open Questions

- [x] **OQ-1**: Should `updatePhase2Action` call `syncPhaseStatus` to handle the case where the user removes the traveler type during revisit? **Decision**: Yes. syncPhaseStatus handles bidirectional transitions. If travelerType is removed (empty), Phase 2 would revert to "pending"/"active".
- [ ] **OQ-2**: Should `updatePhase1Action` also call `syncPhaseStatus` for consistency? Currently it does not. **Recommendation**: Yes, add in this sprint if time permits, or flag as debt for Sprint 33. Low risk since Phase 1 revisit is less common.
- [ ] **OQ-3**: Phase 6 completion via `PhaseEngine.completePhase` awards points. If user re-generates itinerary after Phase 6 is already completed, `completePhase` will throw `PHASE_ALREADY_COMPLETED`. The `syncPhase6CompletionAction` must catch this error gracefully. **Decision**: Wrap in try/catch, treat PHASE_ALREADY_COMPLETED as success (idempotent).
- [ ] **OQ-4**: UX-008 (incomplete data warning before advancing) is specified in SPEC-PROD-026 but is a UX enhancement, not a bug fix. Recommend deferring to Sprint 33 to keep Sprint 32 focused on P0 fixes. **Decision needed from tech-lead.**

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-19 | architect | Initial draft — root cause analysis and fix architecture for P0-001/002/003/005/006/007 + UX-006 |
