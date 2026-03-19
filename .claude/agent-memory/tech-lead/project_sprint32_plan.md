---
name: Sprint 32 Plan & Root Causes
description: Sprint 32 stabilization plan — P0 root causes for phase transitions, completion engine, and progress bar bugs from v0.26.0 testing
type: project
---

Sprint 32 is a stabilization sprint targeting v0.27.0, based on v0.26.0 test results (~78% pass rate).

## Root Causes Identified (2026-03-19)

### P0-001: Phase 2->3 / 5->6 Transition Errors
- Phase2Wizard.handleSubmit() always calls completePhase2Action even on revisit
- PhaseEngine.completePhase throws PHASE_ORDER_VIOLATION or PHASE_ALREADY_COMPLETED
- Error messages are raw English, not i18n keys
- DestinationGuideWizard (Phase 5) has correct revisit guard pattern at line 153

### P0-005: Dashboard Progress Bar Shows Phase 3 as Complete When Skipped
- TripService.getUserTripsWithExpeditionData uses `Math.max(count, currentPhase - 1)` heuristic
- Inflates completedPhases count for skipped non-blocking phases (3, 4)
- DashboardPhaseProgressBar uses sequential `phaseNum <= completedPhases` model
- P0-003 (Phase 4 complete without data) is same root cause

### P0-002: Phase 3 Status Not Reverting After Unchecking Items
- togglePhase3ItemAction does NOT call any completion status sync
- ExpeditionPhase.status never updated after checklist changes
- Fix: new PhaseCompletionService.syncPhaseStatus method

### P0-007/UX-006: Phase 6 Not Auto-Completing
- Itinerary generation flow (stream route + persistence service) never calls PhaseCompletionService
- Phase6Wizard has no completion action
- Fix: new syncPhase6CompletionAction, called after generation

## Task Summary
- 9 tasks (TASK-S32-001 through TASK-S32-009)
- Plan: docs/specs/sprint-32/SPRINT-32-PLAN.md
- Specs: SPEC-PROD-025 (transitions), SPEC-PROD-026 (completion engine)

**Why:** v0.26.0 testing showed ~78% pass rate; P0 bugs block all expeditions from completing
**How to apply:** Tasks are parallelized across dev-fullstack-1 and dev-fullstack-2; 4-day schedule
