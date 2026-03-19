# Sprint 32 — Stabilization Technical Plan

**Theme**: "Stabilization — Fix P0/P1 Bugs from v0.26.0 Testing"
**Baseline**: v0.26.0 (after Sprint 30+31), ~2024 unit tests
**Target**: v0.27.0, 2150+ unit tests (current + regression tests for each fix)
**Test pass rate target**: 95%+ (up from ~78% in v0.26.0 manual testing)
**Branch**: `feat/sprint-32`
**Tag**: `v0.27.0`
**Date**: 2026-03-19
**Author**: tech-lead

---

## Investigation Results

### P0-001: Phase Transition Errors (Phase 2->3, Phase 5->6)

**Root Cause: Missing revisit-mode handling in Phase2Wizard.**

The `Phase2Wizard.handleSubmit()` ALWAYS calls `completePhase2Action(tripId, data)` regardless of whether the user is on a first visit or revisiting a completed phase. When Phase 2 is already completed:

1. `completePhase2Action` delegates to `ExpeditionService.completePhase2` -> `PhaseEngine.completePhase(tripId, userId, 2, metadata)`
2. `PhaseEngine.completePhase` checks `phaseNumber !== trip.currentPhase` for non-blocking=false phases. Since Phase 2 is already complete and `trip.currentPhase > 2`, the check fails with `PHASE_ORDER_VIOLATION`.
3. Alternatively, if `trip.currentPhase` still equals 2 (edge case), the `phase.status === "completed"` check throws `PHASE_ALREADY_COMPLETED`.
4. Both errors return raw English error messages (not i18n keys) to the client, which displays the untranslated error.

**Evidence:**
- `src/components/features/expedition/Phase2Wizard.tsx` line 161: `completePhase2Action` called unconditionally
- `src/lib/engines/phase-engine.ts` line 176-183: `phaseNumber !== trip.currentPhase` throws for non-blocking=false
- `src/lib/engines/phase-engine.ts` line 199-205: `phase.status === "completed"` throws

**Contrast with Phase 5 (correct pattern):**
- `DestinationGuideWizard.tsx` line 153: `if (accessMode === "revisit" && completedPhases.includes(5))` — skips the action and navigates directly. This is the correct pattern.

**For Phase 5->6 specifically:** The `DestinationGuideWizard` handles revisit correctly, BUT it relies on `completedPhases` passed from the server. If the server-rendered data is stale (e.g., revalidation hasn't propagated), `completedPhases` might not include 5, causing the action to be called unnecessarily on revisit.

**For first-pass failures (100% failure claim in spec):** Most likely the test environment had trips with pre-existing phase completions (not freshly created trips). A truly fresh expedition should complete Phase 2->3 on first pass. The spec's "100% failure" is consistent with testing against trips that had been created, partially advanced, and then retried.

**Fix approach:**
1. Add revisit guard to `Phase2Wizard.handleSubmit()` (same pattern as DestinationGuideWizard line 153)
2. Create `updatePhase2Action` for revisit mode (saves data without re-completing)
3. Ensure `PhaseEngine.completePhase` error messages use i18n keys, not raw English

---

### P0-005: Progress Bar Sends to Phase 6 for Incomplete Phase 3

**Root Cause: `completedPhases` count inflated by `currentPhase - 1` heuristic.**

In `TripService.getUserTripsWithExpeditionData` (line 245-248):
```typescript
completedPhases: Math.max(
  trip.phases.filter((p) => p.status === "completed").length,
  trip.currentPhase - 1,
),
```

This assumes all phases below `currentPhase` are completed, which is false when non-blocking phases (3, 4) are advanced-through without completion. Example: user is on Phase 5 (`currentPhase = 5`), completed phases are [1, 2]. `completedPhases = Math.max(2, 4) = 4`. Dashboard shows phases 1-4 as green/completed, but 3 and 4 were never completed.

`DashboardPhaseProgressBar` then uses `isCompleted = phaseNum <= completedPhases` (sequential model), which shows Phase 3 and 4 as completed when they are not.

The `UnifiedProgressBar` (wizard-side) does NOT have this bug — it uses an array of completed phase numbers, not a count. The issue is dashboard-only.

**Fix approach:**
1. Change `TripService.getUserTripsWithExpeditionData` to return a `completedPhases: number[]` (array of phase numbers) instead of a count
2. Update `DashboardPhaseProgressBar` to use `completedPhases.includes(phaseNum)` instead of `phaseNum <= completedPhases`
3. Remove the `Math.max(count, currentPhase - 1)` heuristic entirely

---

### P0-002: Phase 3 Stays "Concluida" After Unchecking Items

**Root Cause: No completion status sync after checklist toggle.**

The `togglePhase3ItemAction` (line 286-309 in expedition.actions.ts) calls `ChecklistEngine.toggleItem()` which updates the checklist item in the DB. However, it does NOT:
- Call `PhaseCompletionService` to re-evaluate Phase 3 completion
- Update `ExpeditionPhase.status` back from "completed" to "active"

The `PhaseCompletionService.checkAndCompleteTrip` is called as fire-and-forget after other actions, but it only checks if all 6 phases are complete — it does NOT sync individual phase statuses back to the `ExpeditionPhase` table.

The completion engine (`phase-completion.engine.ts`) evaluates correctly (it checks `completedRequired === totalRequired`), but it's a pure function that is never called after toggle.

**Fix approach:**
1. After `togglePhase3ItemAction`, call a new `PhaseCompletionService.syncPhaseStatus(tripId, userId, 3)` method
2. `syncPhaseStatus` builds a snapshot, evaluates the phase, and updates `ExpeditionPhase.status` accordingly (completed -> active if requirements no longer met, active -> completed if all met)
3. Add `revalidatePath` for the expeditions dashboard after status change

---

### P0-003: Phase 4 Marked Complete Without Data

**Root Cause: Same `Math.max(count, currentPhase - 1)` heuristic as P0-005.**

Phase 4 is non-blocking. When the user clicks "Proximo" in Phase 4, `advanceFromPhaseAction(tripId, 4)` calls `PhaseEngine.advanceFromPhase` which:
- Sets `trip.currentPhase = 5`
- Unlocks Phase 5
- Does NOT mark Phase 4 as "completed"

The `ExpeditionPhase.status` for Phase 4 correctly remains "active" (not "completed"). But the dashboard's `completedPhases = Math.max(2, 4) = 4` makes it LOOK completed.

**Fix approach:** Same as P0-005 — fix the `completedPhases` computation. No additional work needed.

---

### P0-007 / UX-006: Phase 6 Not Auto-Completing After Itinerary Generation

**Root Cause: Itinerary generation path never triggers completion sync.**

The itinerary generation flow is:
1. `Phase6Wizard` calls `POST /api/ai/plan/stream` (SSE streaming)
2. Stream route accumulates output, parses with Zod, persists via `itinerary-persistence.service.ts`
3. Wizard shows generated itinerary

At NO point in this flow does anyone call:
- `PhaseCompletionService.checkAndCompleteTrip`
- `PhaseEngine.completePhase(tripId, userId, 6)`
- Any phase status update

The `Phase6Wizard` has no "complete phase" button — itinerary generation IS the phase completion action, but it was never wired up.

**Evidence:**
- `src/components/features/expedition/Phase6Wizard.tsx`: no import of any completion action
- `src/server/services/itinerary-persistence.service.ts`: no `PhaseCompletionService` calls
- `src/app/api/ai/plan/stream/route.ts`: no completion logic

**Fix approach:**
1. In `itinerary-persistence.service.ts`, after successful persistence of itinerary days, call `PhaseCompletionService.checkAndCompleteTrip(tripId, userId)` — but this file does not have userId context
2. Better: create a new `syncPhase6CompletionAction` server action
3. In Phase6Wizard, after successful generation (when `setDays(parsed.days)` succeeds), call this action as fire-and-forget
4. The action calls `PhaseEngine.completePhase(tripId, userId, 6)` if not already completed, then `PhaseCompletionService.checkAndCompleteTrip`

---

## Dependency Map

```
TASK-S32-001 (PhaseEngine error i18n) ─────────────────────────┐
                                                                 │
TASK-S32-002 (Phase2Wizard revisit guard) ─── depends on ───────┤
TASK-S32-003 (updatePhase2Action) ─── depends on ─── TASK-S32-001
                                                                 │
TASK-S32-004 (completedPhases array refactor) ──────────────────┤
TASK-S32-005 (DashboardPhaseProgressBar fix) ── depends on ──── TASK-S32-004
                                                                 │
TASK-S32-006 (PhaseCompletionService.syncPhaseStatus) ──────────┤
TASK-S32-007 (togglePhase3Item sync) ── depends on ──── TASK-S32-006
                                                                 │
TASK-S32-008 (Phase6 auto-complete) ────────────────────────────┤
                                                                 │
TASK-S32-009 (regression tests) ── depends on ─── ALL above ────┘

PARALLEL TRACKS:
  Track A (dev-fullstack-1): TASK-001, TASK-002, TASK-003, TASK-006, TASK-007
  Track B (dev-fullstack-2): TASK-004, TASK-005, TASK-008
  Track C (joint):           TASK-009
```

---

## Task Breakdown

### Priority 1: P0-001 Phase Transition Errors

#### TASK-S32-001: Standardize PhaseEngine error messages to i18n keys
- **Assignee**: `dev-fullstack-1`
- **Spec ref**: SPEC-PROD-025 AC-009
- **Priority**: P0
- **Est**: S (1-2h)
- **Description**: Replace raw English error messages in `PhaseEngine.completePhase` and `PhaseEngine.advanceFromPhase` with i18n keys. All `AppError` messages should use keys from `messages/en.json` and `messages/pt-BR.json`.
- **Files**:
  - `src/lib/engines/phase-engine.ts` — change error messages
  - `messages/en.json` — add error keys
  - `messages/pt-BR.json` — add error keys
- **Acceptance**:
  - `PhaseEngine.completePhase` uses `"errors.phaseAlreadyCompleted"`, `"errors.phaseOrderViolation"`, `"errors.phaseNotActive"`, `"errors.prerequisitesNotMet"` instead of raw English
  - Both locale files have corresponding translations
  - Existing tests updated to match new error messages

#### TASK-S32-002: Add revisit guard to Phase2Wizard
- **Assignee**: `dev-fullstack-1`
- **Spec ref**: SPEC-PROD-025 AC-004, AC-005, AC-006
- **Priority**: P0
- **Est**: M (2-3h)
- **Depends on**: TASK-S32-001
- **Description**: Mirror the pattern from `DestinationGuideWizard` line 153: when `accessMode === "revisit"` and `completedPhases.includes(2)`, skip `completePhase2Action` and navigate directly. When revisiting with edits, call a new `updatePhase2Action` instead.
- **Files**:
  - `src/components/features/expedition/Phase2Wizard.tsx` — add revisit logic to `handleSubmit`
- **Acceptance**:
  - Revisiting Phase 2 and clicking "Proximo" navigates to Phase 3 without error
  - Revisiting Phase 2, editing data, and clicking "Salvar" saves data without attempting to re-complete
  - First-visit Phase 2 completion still works as before
  - New unit tests for revisit and first-visit paths

#### TASK-S32-003: Create updatePhase2Action for revisit data saves
- **Assignee**: `dev-fullstack-1`
- **Spec ref**: SPEC-PROD-025 AC-004, AC-005
- **Priority**: P0
- **Est**: M (2-3h)
- **Depends on**: TASK-S32-001
- **Description**: Create a new server action `updatePhase2Action(tripId, data)` that saves Phase 2 data (traveler type, accommodation style, budget, passengers) WITHOUT calling `PhaseEngine.completePhase`. Similar to existing `updatePhase1Action` pattern. Includes BOLA check, Zod validation, and passenger data persistence.
- **Files**:
  - `src/server/actions/expedition.actions.ts` — new action
- **Acceptance**:
  - `updatePhase2Action` saves traveler type, accommodation style, budget, currency, passengers to DB
  - BOLA check: trip must belong to user
  - Does NOT award points, badges, or change phase status
  - Zod validation applied (reuses Phase2Schema)
  - Unit tests cover happy path, BOLA violation, validation failure

---

### Priority 2: P0-002/003/005 Completion Engine + Navigation

#### TASK-S32-004: Refactor completedPhases from count to array in TripService
- **Assignee**: `dev-fullstack-2`
- **Spec ref**: SPEC-PROD-026 AC (P0-003, P0-005)
- **Priority**: P0
- **Est**: M (2-3h)
- **Description**: Change `TripService.getUserTripsWithExpeditionData` to return `completedPhases` as `number[]` (array of completed phase numbers) instead of a `number` (count). Remove the `Math.max(count, currentPhase - 1)` heuristic that inflates completion counts.
- **Files**:
  - `src/server/services/trip.service.ts` — change completedPhases computation
  - `src/types/expedition.types.ts` — update ExpeditionDTO type
  - `src/app/[locale]/(app)/expeditions/page.tsx` — update mapping
  - `src/components/features/dashboard/AtlasDashboard.tsx` — update prop type
  - `src/components/features/dashboard/ExpeditionCard.tsx` — update prop type
  - `src/components/features/dashboard/ExpeditionCardRedesigned.tsx` — update prop type
  - `src/components/features/dashboard/ExpeditionsList.tsx` — update prop type
- **Acceptance**:
  - `completedPhases` is `number[]` throughout the dashboard data flow
  - Skipped non-blocking phases are NOT included in the array
  - All consuming components updated and tests passing
  - Build passes (`npm run build`)

#### TASK-S32-005: Fix DashboardPhaseProgressBar to use array-based completion
- **Assignee**: `dev-fullstack-2`
- **Spec ref**: SPEC-PROD-026 AC (P0-005)
- **Priority**: P0
- **Est**: S (1-2h)
- **Depends on**: TASK-S32-004
- **Description**: Update `DashboardPhaseProgressBar` to accept `completedPhases: number[]` and use `completedPhases.includes(phaseNum)` instead of `phaseNum <= completedPhases`. Navigation should only allow clicking on phases that are truly completed or current.
- **Files**:
  - `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` — update props and logic
- **Acceptance**:
  - Phases 3 and 4 show as "pending" (not green) when skipped via non-blocking advance
  - Clicking a skipped phase navigates to it (available, not completed)
  - Only truly completed phases show green with checkmark
  - Unit tests cover: all-complete, partially-complete, skipped-non-blocking scenarios

#### TASK-S32-006: Add PhaseCompletionService.syncPhaseStatus method
- **Assignee**: `dev-fullstack-1`
- **Spec ref**: SPEC-PROD-026 AC (P0-002)
- **Priority**: P0
- **Est**: M (2-3h)
- **Description**: Add a new method `PhaseCompletionService.syncPhaseStatus(tripId, userId, phaseNumber)` that builds a snapshot, evaluates the specified phase, and updates `ExpeditionPhase.status` if it differs from the evaluation result. Handles: completed -> active (if requirements no longer met), active -> completed (if all met, but does NOT award points — that's PhaseEngine's job).
- **Files**:
  - `src/server/services/phase-completion.service.ts` — new method
- **Acceptance**:
  - Unchecking a required Phase 3 item -> `syncPhaseStatus` changes Phase 3 from "completed" to "active"
  - Re-checking all required items -> status changes back to "completed"
  - Method is idempotent (calling twice with same state is a no-op)
  - Does NOT award/revoke points (status sync only)
  - Unit tests cover forward and backward status transitions

#### TASK-S32-007: Wire togglePhase3ItemAction to completion sync
- **Assignee**: `dev-fullstack-1`
- **Spec ref**: SPEC-PROD-026 AC (P0-002)
- **Priority**: P0
- **Est**: S (1h)
- **Depends on**: TASK-S32-006
- **Description**: After `togglePhase3ItemAction` toggles the checklist item, call `PhaseCompletionService.syncPhaseStatus(tripId, userId, 3)` to update Phase 3's completion status based on current checklist state.
- **Files**:
  - `src/server/actions/expedition.actions.ts` — add sync call to togglePhase3ItemAction
- **Acceptance**:
  - Toggling a required item updates ExpeditionPhase.status for Phase 3
  - Dashboard reflects the updated status after page revalidation
  - Unit tests verify status change after toggle

#### TASK-S32-008: Phase 6 auto-complete after itinerary generation
- **Assignee**: `dev-fullstack-2`
- **Spec ref**: SPEC-PROD-026 AC (P0-007, UX-006)
- **Priority**: P0
- **Est**: M (2-3h)
- **Description**: After successful itinerary generation and persistence, automatically complete Phase 6 and check if the entire expedition is complete. Create a new server action `syncPhase6CompletionAction(tripId)` that: (a) checks if itinerary days exist, (b) completes Phase 6 via `PhaseEngine.completePhase` if not already completed, (c) calls `PhaseCompletionService.checkAndCompleteTrip`. Wire this into Phase6Wizard after successful generation.
- **Files**:
  - `src/server/actions/expedition.actions.ts` — new syncPhase6CompletionAction
  - `src/components/features/expedition/Phase6Wizard.tsx` — call action after generation
- **Acceptance**:
  - After itinerary generation completes, Phase 6 status changes to "completed"
  - If all 6 phases are completed, `trip.status` changes to "COMPLETED"
  - Action is idempotent (safe to call multiple times)
  - Re-generation does not fail (Phase 6 already completed)
  - Unit tests for: first generation, re-generation, partial expedition, full expedition completion

---

### Priority 3: Regression Tests

#### TASK-S32-009: Integration/regression tests for all Sprint 32 fixes
- **Assignee**: `dev-fullstack-1` + `dev-fullstack-2`
- **Spec ref**: SPEC-QA-009
- **Priority**: P1
- **Est**: L (4-5h)
- **Depends on**: ALL tasks above
- **Description**: Write comprehensive regression tests covering:
  - Phase 2->3 transition: first visit, revisit with edits, revisit without edits
  - Phase 5->6 transition: first visit, revisit
  - Phase transition after reverse navigation (6->5->4->3->2, then 2->3)
  - Dashboard completedPhases: accurate for fresh trip, partially completed, all completed, with skipped non-blocking phases
  - Phase 3 status sync: check all required items, uncheck one, verify status reverts
  - Phase 4 status: advance without data, verify not marked as completed
  - Phase 6 auto-completion: generate itinerary, verify Phase 6 and trip status
  - Full expedition flow: Phase 1->2->3->4->5->6, verify final status
- **Files**:
  - `tests/unit/engines/phase-transition-regression.test.ts` — new test suite
  - `tests/unit/services/phase-completion-sync.test.ts` — new test suite
  - `tests/unit/components/features/dashboard/DashboardPhaseProgressBar.test.tsx` — update
- **Acceptance**:
  - All new tests pass
  - No existing tests broken
  - Test count >= 2150
  - Build passes (`npm run build`)

---

## Priority Order (Implementation Sequence)

```
Day 1 (P0 — unblock the critical path):
  dev-fullstack-1: TASK-S32-001 (error i18n) -> TASK-S32-002 (Phase2 revisit guard)
  dev-fullstack-2: TASK-S32-004 (completedPhases array refactor)

Day 2 (P0 — completion engine):
  dev-fullstack-1: TASK-S32-003 (updatePhase2Action) -> TASK-S32-006 (syncPhaseStatus)
  dev-fullstack-2: TASK-S32-005 (DashboardPhaseProgressBar) -> TASK-S32-008 (Phase6 auto-complete)

Day 3 (P0 wrapup + regression):
  dev-fullstack-1: TASK-S32-007 (toggle sync) -> TASK-S32-009 (regression tests, backend half)
  dev-fullstack-2: TASK-S32-009 (regression tests, frontend half)

Day 4 (buffer + code review + build verification):
  tech-lead: Code review all PRs
  Both devs: Address review feedback, ensure build passes
```

---

## Key Technical Notes for Developers

### Pattern: Revisit Guard in Wizard Components
```typescript
// CORRECT PATTERN (from DestinationGuideWizard):
if (accessMode === "revisit" && completedPhases.includes(PHASE_NUMBER)) {
  router.push(`/expedition/${tripId}/phase-${PHASE_NUMBER + 1}`);
  return;
}
// Otherwise, call the action normally
```

### Pattern: Phase Status Sync (new)
```typescript
// After any action that changes data affecting phase completion:
await PhaseCompletionService.syncPhaseStatus(tripId, userId, phaseNumber);
revalidatePath(`/expedition/${tripId}`);
revalidatePath("/expeditions");
```

### Avoid: redirect() inside try/catch in Server Actions
This is a known pattern (FIND-M-001) that does NOT affect the current P0 bugs (no redirect() in expedition actions), but devs should remain vigilant.

### completedPhases Convention (post-fix)
- **Dashboard/card context**: `number[]` — array of actually-completed phase numbers
- **Wizard/progress bar context**: `number[]` — already correct, sourced from `guardPhaseAccess`
- **NEVER use** `currentPhase - 1` as a proxy for completed phases

---

## Definition of Done

- [ ] All 9 tasks above marked complete
- [ ] Code review approved by tech-lead (security + bias checklist)
- [ ] Test count >= 2150
- [ ] `npm run build` passes cleanly
- [ ] `npm run test` — 0 failures
- [ ] `npm run lint` — 0 errors
- [ ] No hardcoded credentials or PII exposure
- [ ] All new error messages available in en + pt-BR
- [ ] Phase transitions Phase 1->2->3->4->5->6 work end-to-end (manual verification)
- [ ] Reverse navigation Phase 6->5->4->3->2->3 works (manual verification)
- [ ] Dashboard correctly shows completion status for skipped non-blocking phases
- [ ] Merged to main via PR — no direct commits
- [ ] Tagged as v0.27.0

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| completedPhases type change cascades to more components than listed | Medium | Medium | Run `grep -rn "completedPhases" src/` after refactor; update TypeScript strict mode to catch all callers |
| PhaseEngine.completePhase called unexpectedly in other code paths | Low | High | Search for all callers before changing error messages; add test for each caller |
| Phase 6 auto-complete fires during re-generation, double-completing | Low | Low | PhaseEngine.completePhase is idempotent for already-completed phases (throws, caught) |
| syncPhaseStatus creates a DB hot path (called on every toggle) | Low | Medium | Single Prisma query + conditional update; monitor query count in dev |

> Ready to execute. All specs (SPEC-PROD-025, SPEC-PROD-026) are in Draft status. Recommend fast-tracking to Approved given P0 urgency — no architectural changes, only bug fixes to existing patterns.
