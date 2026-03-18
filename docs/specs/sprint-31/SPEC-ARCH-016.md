# Technical Specification: Phase Completion Engine

**Spec ID**: SPEC-ARCH-016
**Related Story**: Sprint 31 Planning — Phase Completion Engine
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The expedition currently has no unified way to determine whether a specific phase is truly "complete" based on actual data presence -- it relies solely on the `ExpeditionPhase.status` field set during wizard submission. This creates a gap: a phase can be marked "completed" in the phases table but have its underlying data deleted or incomplete, or conversely have data present but not be marked complete. This spec introduces a `PhaseCompletionEngine` -- an isomorphic, pure-function engine that evaluates phase completion by inspecting actual data, provides a unified expedition completion summary, and enables automatic trip completion when all 6 phases are satisfied.

## 2. Architecture Diagram

```
+----------------------------+     +----------------------------+
| PhaseCompletionEngine      |     | phase-navigation.engine.ts |
| (isomorphic)               |     | (existing, isomorphic)     |
|                            |     |                            |
| evaluatePhaseCompletion()  |     | resolveAccess()            |
| getExpeditionSummary()     |     | getPhaseState()            |
| isExpeditionComplete()     |     | canNavigateToPhase()       |
+-------------+--------------+     +----------------------------+
              |
              | (server: passes data snapshots)
              |
+-------------v--------------+
| PhaseCompletionService     |
| (server-only)              |
|                            |
| getPhaseCompletionStatus() | <-- queries DB for actual data
| getExpeditionCompletion()  | <-- calls engine with data snapshots
| checkAndCompleteTrip()     | <-- auto-completion trigger
+----------------------------+
              |
              v
+----------------------------+
| Trip.status = "COMPLETED"  |
| (Prisma update)            |
+----------------------------+

Data Flow:
  1. Server service queries DB for phase data (trip, user, checklist, etc.)
  2. Builds PhaseDataSnapshot for each phase
  3. Passes snapshots to isomorphic engine for evaluation
  4. Engine returns completion statuses (pure logic, no DB access)
  5. Server service acts on results (auto-complete trip if all 6 done)
```

## 3. ADR-021: Phase Completion Engine Architecture

**Date**: 2026-03-17
**Status**: PROPOSED
**Deciders**: architect, tech-lead

### Context

Several parts of the codebase need to know whether a phase is "complete":
- Progress bars (`getPhaseState()` in phase-navigation.engine.ts)
- Trip readiness service (`TripReadinessService`)
- Summary page (shows phase data presence)
- Future: auto-completion of expedition

Currently, completion is determined by `ExpeditionPhase.status === "completed"`, which is set during wizard submission but not validated against actual data. This creates drift risk: data could be deleted without updating the phase status.

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| A: Isomorphic engine + server service | Pure logic testable without DB; reusable on client for optimistic UI; separation of concerns | Two layers (engine + service) instead of one |
| B: Server-only service with inline rules | Simpler single layer; direct DB access | Cannot reuse logic on client; harder to unit test |
| C: Extend TripReadinessService | No new files; reuses existing query patterns | TripReadinessService has a different purpose (weighted %; not boolean completion); mixing concerns |

### Decision

**Option A: Isomorphic engine + server service**.

Rationale:
- Follows the established pattern: `phase-navigation.engine.ts` (isomorphic) + `phase-access-guard.ts` (server). The completion engine mirrors this split.
- Pure functions in the engine are trivially testable with unit tests (no DB mocking needed).
- The engine can be imported on the client for optimistic completion indicators without a round-trip.
- The server service handles DB queries and side effects (auto-completion).

### Consequences

**Positive**:
- Completion rules are centralized in one engine file, not scattered across wizards and services
- Unit tests cover all completion rules without Prisma mocks
- Auto-completion replaces the need for a manual "Complete Expedition" button
- Client can show real-time completion status from local state

**Negative / Trade-offs**:
- Two files instead of one (engine + service)
- PhaseDataSnapshot must be kept in sync with actual DB schema
- Auto-completion side effect must be carefully gated to avoid premature completion

**Risks**:
- Phase completion rules may diverge from wizard validation rules if not maintained together. Mitigation: document coupling in implementation notes.

---

## 4. Data Model

No schema changes. The engine reads existing data:

```prisma
// Already exists:
model Trip {
  destination    String
  startDate      DateTime?
  endDate        DateTime?
  status         TripStatus        // PLANNING | IN_PROGRESS | COMPLETED | CANCELLED
  currentPhase   Int
}

model User {
  name           String?
}

model UserProfile {
  birthDate      DateTime?
}

model ExpeditionPhase {
  tripId         String
  phaseNumber    Int
  status         String            // "locked" | "active" | "completed"
  metadata       Json?
}

model PhaseChecklistItem {
  tripId         String
  phaseNumber    Int
  required       Boolean
  completed      Boolean
}

model TransportSegment {
  tripId         String
}

model Accommodation {
  tripId         String
}

model DestinationGuide {
  tripId         String   @unique
}

model ItineraryDay {
  tripId         String
}
```

## 5. Engine Interface (Isomorphic)

```typescript
// src/lib/engines/phase-completion.engine.ts (isomorphic -- NO "server-only")

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseCompletionStatus =
  | "completed"     // All required data present
  | "in_progress"   // Some data present but not all requirements met
  | "pending";      // No meaningful data present

export interface PhaseDataSnapshot {
  phase1: {
    hasDestination: boolean;
    hasStartDate: boolean;
    hasEndDate: boolean;
    hasUserName: boolean;
    hasUserBirthDate: boolean;
  };
  phase2: {
    hasTravelerType: boolean;
  };
  phase3: {
    totalRequired: number;
    completedRequired: number;
    hasAnyItems: boolean;
  };
  phase4: {
    transportSegmentCount: number;
    accommodationCount: number;
  };
  phase5: {
    hasGuide: boolean;
  };
  phase6: {
    itineraryDayCount: number;
  };
}

export interface PhaseCompletionResult {
  phase: number;
  status: PhaseCompletionStatus;
  /** Which specific requirements are met/unmet (for UI display) */
  requirements: Array<{
    key: string;
    met: boolean;
    label: string;
  }>;
}

export interface ExpeditionCompletionSummary {
  phases: PhaseCompletionResult[];
  completedCount: number;
  totalPhases: number;
  isComplete: boolean;
}
```

### 5.1 Core Engine Functions

```typescript
// ─── Phase Completion Rules ──────────────────────────────────────────────────

/**
 * Evaluate completion status for a single phase.
 * Pure function -- no DB access, no side effects.
 */
export function evaluatePhaseCompletion(
  phaseNumber: number,
  snapshot: PhaseDataSnapshot
): PhaseCompletionResult {
  switch (phaseNumber) {
    case 1: return evaluatePhase1(snapshot.phase1);
    case 2: return evaluatePhase2(snapshot.phase2);
    case 3: return evaluatePhase3(snapshot.phase3);
    case 4: return evaluatePhase4(snapshot.phase4);
    case 5: return evaluatePhase5(snapshot.phase5);
    case 6: return evaluatePhase6(snapshot.phase6);
    default:
      return {
        phase: phaseNumber,
        status: "pending",
        requirements: [],
      };
  }
}

/**
 * Evaluate completion for all 6 phases.
 */
export function getExpeditionCompletionSummary(
  snapshot: PhaseDataSnapshot
): ExpeditionCompletionSummary {
  const phases = [1, 2, 3, 4, 5, 6].map((n) =>
    evaluatePhaseCompletion(n, snapshot)
  );
  const completedCount = phases.filter((p) => p.status === "completed").length;

  return {
    phases,
    completedCount,
    totalPhases: 6,
    isComplete: completedCount === 6,
  };
}

/**
 * Quick check: are all 6 phases completed?
 */
export function isExpeditionComplete(
  snapshot: PhaseDataSnapshot
): boolean {
  return getExpeditionCompletionSummary(snapshot).isComplete;
}
```

### 5.2 Per-Phase Evaluation Rules

```typescript
function evaluatePhase1(
  data: PhaseDataSnapshot["phase1"]
): PhaseCompletionResult {
  const requirements = [
    { key: "destination", met: data.hasDestination, label: "phase1.destination" },
    { key: "startDate", met: data.hasStartDate, label: "phase1.startDate" },
    { key: "endDate", met: data.hasEndDate, label: "phase1.endDate" },
    { key: "userName", met: data.hasUserName, label: "phase1.userName" },
    { key: "userBirthDate", met: data.hasUserBirthDate, label: "phase1.userBirthDate" },
  ];

  const allMet = requirements.every((r) => r.met);
  const anyMet = requirements.some((r) => r.met);

  return {
    phase: 1,
    status: allMet ? "completed" : anyMet ? "in_progress" : "pending",
    requirements,
  };
}

function evaluatePhase2(
  data: PhaseDataSnapshot["phase2"]
): PhaseCompletionResult {
  const requirements = [
    { key: "travelerType", met: data.hasTravelerType, label: "phase2.travelerType" },
  ];

  return {
    phase: 2,
    status: data.hasTravelerType ? "completed" : "pending",
    requirements,
  };
}

function evaluatePhase3(
  data: PhaseDataSnapshot["phase3"]
): PhaseCompletionResult {
  const requirements = [
    {
      key: "mandatoryChecklist",
      met: data.totalRequired > 0 && data.completedRequired === data.totalRequired,
      label: "phase3.mandatoryChecklist",
    },
  ];

  if (!data.hasAnyItems) {
    return { phase: 3, status: "pending", requirements };
  }

  const allRequiredDone =
    data.totalRequired > 0 && data.completedRequired === data.totalRequired;

  return {
    phase: 3,
    status: allRequiredDone ? "completed" : "in_progress",
    requirements,
  };
}

function evaluatePhase4(
  data: PhaseDataSnapshot["phase4"]
): PhaseCompletionResult {
  const hasTransport = data.transportSegmentCount > 0;
  const hasAccommodation = data.accommodationCount > 0;
  const hasEither = hasTransport || hasAccommodation;

  const requirements = [
    {
      key: "logisticsEntry",
      met: hasEither,
      label: "phase4.logisticsEntry",
    },
  ];

  return {
    phase: 4,
    status: hasEither ? "completed" : "pending",
    requirements,
  };
}

function evaluatePhase5(
  data: PhaseDataSnapshot["phase5"]
): PhaseCompletionResult {
  const requirements = [
    { key: "guide", met: data.hasGuide, label: "phase5.guide" },
  ];

  return {
    phase: 5,
    status: data.hasGuide ? "completed" : "pending",
    requirements,
  };
}

function evaluatePhase6(
  data: PhaseDataSnapshot["phase6"]
): PhaseCompletionResult {
  const hasItinerary = data.itineraryDayCount > 0;

  const requirements = [
    { key: "itinerary", met: hasItinerary, label: "phase6.itinerary" },
  ];

  return {
    phase: 6,
    status: hasItinerary ? "completed" : "pending",
    requirements,
  };
}
```

## 6. Server Service

```typescript
// src/server/services/phase-completion.service.ts
import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AppError } from "@/lib/errors";
import {
  evaluatePhaseCompletion,
  getExpeditionCompletionSummary,
  isExpeditionComplete,
  type PhaseDataSnapshot,
  type PhaseCompletionResult,
  type ExpeditionCompletionSummary,
} from "@/lib/engines/phase-completion.engine";

export class PhaseCompletionService {
  /**
   * Build a PhaseDataSnapshot from the database for a given trip.
   * BOLA: verifies trip belongs to user.
   */
  static async buildSnapshot(
    tripId: string,
    userId: string
  ): Promise<PhaseDataSnapshot> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: {
        id: true,
        destination: true,
        startDate: true,
        endDate: true,
        userId: true,
      },
    });

    if (!trip) {
      throw new AppError("FORBIDDEN", "errors.tripNotFound", 403);
    }

    // Parallel queries for all phase data
    const [user, profile, phases, checklistItems, transportSegments, accommodations, guide, itineraryDays] =
      await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: { name: true },
        }),
        db.userProfile.findUnique({
          where: { userId },
          select: { birthDate: true },
        }),
        db.expeditionPhase.findMany({
          where: { tripId },
          select: { phaseNumber: true, status: true, metadata: true },
        }),
        db.phaseChecklistItem.findMany({
          where: { tripId, phaseNumber: 3 },
          select: { required: true, completed: true },
        }),
        db.transportSegment.count({ where: { tripId } }),
        db.accommodation.count({ where: { tripId } }),
        db.destinationGuide.findUnique({
          where: { tripId },
          select: { id: true },
        }),
        db.itineraryDay.count({ where: { tripId } }),
      ]);

    const phase2 = phases.find((p) => p.phaseNumber === 2);
    const phase2Meta = phase2?.metadata as Record<string, unknown> | null;

    const requiredItems = checklistItems.filter((i) => i.required);
    const completedRequired = requiredItems.filter((i) => i.completed).length;

    return {
      phase1: {
        hasDestination: !!trip.destination && trip.destination.trim().length > 0,
        hasStartDate: trip.startDate !== null,
        hasEndDate: trip.endDate !== null,
        hasUserName: !!user?.name && user.name.trim().length > 0,
        hasUserBirthDate: profile?.birthDate !== null && profile?.birthDate !== undefined,
      },
      phase2: {
        hasTravelerType: !!phase2Meta?.travelerType,
      },
      phase3: {
        totalRequired: requiredItems.length,
        completedRequired,
        hasAnyItems: checklistItems.length > 0,
      },
      phase4: {
        transportSegmentCount: transportSegments,
        accommodationCount: accommodations,
      },
      phase5: {
        hasGuide: guide !== null,
      },
      phase6: {
        itineraryDayCount: itineraryDays,
      },
    };
  }

  /**
   * Get completion status for a single phase.
   */
  static async getPhaseCompletionStatus(
    tripId: string,
    userId: string,
    phaseNumber: number
  ): Promise<PhaseCompletionResult> {
    const snapshot = await this.buildSnapshot(tripId, userId);
    return evaluatePhaseCompletion(phaseNumber, snapshot);
  }

  /**
   * Get completion summary for all 6 phases.
   */
  static async getExpeditionCompletion(
    tripId: string,
    userId: string
  ): Promise<ExpeditionCompletionSummary> {
    const snapshot = await this.buildSnapshot(tripId, userId);
    return getExpeditionCompletionSummary(snapshot);
  }

  /**
   * Check if all 6 phases are complete. If so, set trip.status = "COMPLETED".
   * Called after each phase wizard submission.
   *
   * Returns true if the trip was just completed (state transition happened).
   * Returns false if already completed or not yet complete.
   */
  static async checkAndCompleteTrip(
    tripId: string,
    userId: string
  ): Promise<boolean> {
    const snapshot = await this.buildSnapshot(tripId, userId);

    if (!isExpeditionComplete(snapshot)) {
      return false;
    }

    // Check current status to avoid redundant updates
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { status: true },
    });

    if (!trip || trip.status === "COMPLETED") {
      return false;
    }

    // Transition to COMPLETED
    await db.trip.update({
      where: { id: tripId },
      data: { status: "COMPLETED" },
    });

    logger.info("trip.auto-completed", {
      userId: hashUserId(userId),
      tripId,
    });

    return true;
  }
}
```

## 7. Integration Points

### 7.1 Auto-Completion Trigger

`checkAndCompleteTrip()` should be called after each phase wizard submission that successfully completes a phase. The call sites are:

| Phase | Action | File |
|---|---|---|
| Phase 1 | `completePhase1Action` | `src/server/actions/expedition.actions.ts` |
| Phase 2 | `completePhase2Action` | `src/server/actions/expedition.actions.ts` |
| Phase 3 | Checklist item toggle (when all required done) | `src/server/actions/checklist.actions.ts` |
| Phase 4 | Transport/accommodation save | `src/server/actions/transport.actions.ts` |
| Phase 5 | Guide generation complete | `src/server/actions/guide.actions.ts` |
| Phase 6 | Itinerary save | `src/server/actions/itinerary.actions.ts` |

The call is fire-and-forget (non-blocking). If it fails, the trip remains in its current status -- no user-facing error. Log the failure.

```typescript
// Example integration in a phase completion action:
// After successful phase completion...
PhaseCompletionService.checkAndCompleteTrip(tripId, userId).catch((err) => {
  logger.warn("trip.auto-complete.failed", { tripId, error: err.message });
});
```

### 7.2 Summary Page Integration

The summary page can use `getExpeditionCompletion()` to show a completion progress indicator:

```typescript
// In /expedition/{tripId}/summary/page.tsx
const completion = await PhaseCompletionService.getExpeditionCompletion(tripId, userId);
// Pass completion.phases to ReadinessIndicator or similar component
```

### 7.3 Relationship with Existing Code

| Existing Code | Relationship | Action |
|---|---|---|
| `TripReadinessService` | Calculates weighted readiness % | **No change**. Readiness is a different concept (how "ready" is the trip). Completion is binary per-phase. Both can coexist. |
| `phase-navigation.engine.ts` `getPhaseState()` | Returns visual state for progress bar | **No change**. Phase state (completed/current/available/locked) is based on `ExpeditionPhase.status`. Completion engine validates actual data. |
| `ExpeditionPhase.status` field | Set by wizards on submission | **No change**. The completion engine reads actual data, not this field. The field remains the primary driver for navigation guards. |
| Manual "Complete Expedition" button | Currently required to finish | **Replaced** by auto-completion. Button can be removed or kept as a fallback. |

## 8. Business Logic

### 8.1 Per-Phase Completion Rules (Detailed)

**Phase 1 -- O Chamado (The Calling)**:
- `trip.destination` is non-empty string
- `trip.startDate` is not null
- `trip.endDate` is not null
- `user.name` is non-empty string
- `userProfile.birthDate` is not null
- ALL five conditions must be true for "completed"

**Phase 2 -- O Explorador (The Explorer)**:
- `ExpeditionPhase[2].metadata.travelerType` exists and is truthy
- Single condition. "completed" if met, "pending" otherwise.

**Phase 3 -- O Preparo (The Preparation)**:
- At least one `PhaseChecklistItem` exists for this trip with `phaseNumber = 3`
- ALL items where `required = true` must have `completed = true`
- If no checklist items exist: "pending"
- If items exist but not all required are done: "in_progress"
- If all required are done: "completed"

**Phase 4 -- A Logistica (The Logistics)**:
- At least 1 `TransportSegment` OR at least 1 `Accommodation` exists for this trip
- Single OR condition. Any logistics entry satisfies the requirement.

**Phase 5 -- Guia do Destino (Destination Guide)**:
- `DestinationGuide` record exists for this tripId
- Single condition. Guide generated = completed.

**Phase 6 -- O Roteiro (The Itinerary)**:
- At least 1 `ItineraryDay` exists for this trip
- Single condition. Any itinerary content = completed.

### 8.2 Auto-Completion Logic

When `checkAndCompleteTrip()` detects all 6 phases are complete:
1. Verify trip exists and belongs to user (BOLA)
2. Verify trip is not already COMPLETED or CANCELLED
3. Set `trip.status = "COMPLETED"`
4. Log the event

What auto-completion does NOT do:
- Award points (points are awarded per-phase by `PointsEngine`)
- Award badges (badges are awarded per-phase)
- Change `trip.currentPhase` (remains at whatever phase the user last advanced to)
- Redirect the user (the UI should show a completion celebration, handled by the frontend)

### 8.3 Edge Cases

| Scenario | Behavior |
|---|---|
| User deletes transport after Phase 4 was "completed" | Phase 4 completion engine returns "pending". Trip auto-completion check returns false. Trip status remains unchanged (does not revert from COMPLETED). |
| User edits Phase 1 and removes startDate | Phase 1 completion returns "in_progress". Does not affect trip status if already COMPLETED. |
| Trip already COMPLETED, user deletes data | Status remains COMPLETED. Completion engine can be queried to show a warning, but status is not reverted automatically. |
| All 6 phases complete on first Phase 6 save | `checkAndCompleteTrip()` fires, sets status to COMPLETED. |
| Race condition: two simultaneous saves | Both call `checkAndCompleteTrip()`. Second call finds status already COMPLETED, returns false. No harm. |

Note on status reversion: Auto-completing is a one-way state transition in MVP. Reverting from COMPLETED to PLANNING requires manual intervention (future feature). This avoids surprising the user.

## 9. Security Considerations

- **BOLA**: Every service method requires `userId` and filters by it in the Prisma query.
- **No PII exposure**: The engine works with boolean flags (hasUserName, hasUserBirthDate), not actual values. No PII crosses the engine boundary.
- **Auto-completion gating**: Only transitions PLANNING/IN_PROGRESS to COMPLETED. Cannot transition CANCELLED trips.
- **No direct client access**: The service is server-only. The engine is isomorphic but only receives pre-validated snapshots from the server.

## 10. Performance Requirements

| Metric | Target |
|---|---|
| `buildSnapshot()` (8 parallel queries) | < 100ms |
| `evaluatePhaseCompletion()` (pure logic) | < 1ms |
| `getExpeditionCompletionSummary()` (pure logic) | < 1ms |
| `checkAndCompleteTrip()` (snapshot + 1 update) | < 150ms |

The `buildSnapshot()` method uses `Promise.all` for 8 parallel queries. Most are small (count or findUnique). The heaviest is `phaseChecklistItem.findMany` which is bounded by checklist size (typically < 30 items).

## 11. Testing Strategy

### Unit Tests (Engine -- no DB mocking needed)

- `evaluatePhaseCompletion(1, ...)`: all 5 requirements met, partial (3 of 5), none met
- `evaluatePhaseCompletion(2, ...)`: travelerType present, absent
- `evaluatePhaseCompletion(3, ...)`: all required done, some required pending, no items, items but none required
- `evaluatePhaseCompletion(4, ...)`: transport only, accommodation only, both, neither
- `evaluatePhaseCompletion(5, ...)`: guide present, absent
- `evaluatePhaseCompletion(6, ...)`: itinerary days present, absent
- `getExpeditionCompletionSummary()`: all complete, none complete, mixed
- `isExpeditionComplete()`: true when all 6 complete, false otherwise
- Edge: phase number out of range (0, 7, -1)

### Integration Tests (Service -- Prisma mocked)

- `buildSnapshot()`: verify correct boolean mapping from DB data
- `getPhaseCompletionStatus()`: verify single-phase evaluation
- `getExpeditionCompletion()`: verify full summary
- `checkAndCompleteTrip()`: verify trip status update when all complete
- `checkAndCompleteTrip()`: verify no update when already COMPLETED
- `checkAndCompleteTrip()`: verify no update when not all complete
- BOLA: verify error when tripId belongs to different user

### E2E Tests

- Complete all 6 phases of an expedition, verify trip status changes to COMPLETED
- Verify summary page shows completion indicator
- Verify expedition card on dashboard shows completed badge

## 12. Implementation Notes for Developers

1. **File location**: Engine at `src/lib/engines/phase-completion.engine.ts` (isomorphic). Service at `src/server/services/phase-completion.service.ts` (server-only).

2. **No "server-only" in engine**: The engine file must NOT import "server-only". It must be importable from client components for optimistic UI.

3. **Snapshot immutability**: `PhaseDataSnapshot` should be treated as immutable. Build it once, pass it to engine functions. Do not mutate it between calls.

4. **Phase 3 edge case**: If no `PhaseChecklistItem` records exist at all (user never generated a checklist), Phase 3 is "pending" -- not "completed". The checklist must exist AND all required items must be checked.

5. **Coupling with wizards**: Phase completion rules must stay aligned with wizard validation. If a wizard adds a new required field, the completion engine must be updated. Document this coupling in code comments.

6. **Fire-and-forget pattern**: `checkAndCompleteTrip()` calls in actions should use `.catch()` to prevent unhandled rejections. The user's action should succeed even if auto-completion fails.

7. **Do not use `Prisma.$transaction`**: The auto-completion update is idempotent. If two concurrent calls both try to set COMPLETED, the second is a no-op. No transaction needed.

8. **Requirement labels**: The `label` field in requirements uses i18n keys (e.g., `phase1.destination`). These are for UI display in completion checklists, not for logging.

## 13. Open Questions

- [ ] **OQ-1**: Should the completion engine revert trip status from COMPLETED to PLANNING if data is deleted after completion? Recommendation: No for MVP. One-way transition. Add a warning indicator instead.
- [ ] **OQ-2**: Should Phase 3 require a minimum number of checklist items (e.g., at least 5)? Current rule: any checklist with all required items checked. Recommendation: no minimum count -- the checklist generation already ensures reasonable coverage.
- [ ] **OQ-3**: Should Phase 4 require BOTH transport AND accommodation, or is one sufficient? Current rule: OR (either suffices). Some trips may not need accommodation (day trips) or transport (local exploration). Recommendation: keep OR.

## 14. Definition of Done

- [ ] `phase-completion.engine.ts` created with all 6 phase evaluation rules
- [ ] `phase-completion.service.ts` created with buildSnapshot, getPhaseCompletionStatus, getExpeditionCompletion, checkAndCompleteTrip
- [ ] Auto-completion integrated into phase action files (fire-and-forget)
- [ ] Unit tests for engine: all phases, edge cases, summary, isComplete
- [ ] Integration tests for service: BOLA, auto-completion trigger, idempotency
- [ ] E2E test: complete all 6 phases, verify COMPLETED status
- [ ] Unit test coverage >= 80% for engine and service
- [ ] ADR-021 accepted by tech-lead
- [ ] No regressions in existing phase navigation or readiness tests

> PROPOSED -- Awaiting tech-lead review before implementation begins
