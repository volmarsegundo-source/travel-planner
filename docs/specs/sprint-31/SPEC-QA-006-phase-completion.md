---
spec-id: SPEC-QA-006
title: "Test Strategy: Phase Completion Logic"
version: 1.0.0
status: Draft
author: qa-engineer
sprint: 31
reviewers: [tech-lead, architect]
date: 2026-03-17
related-specs: [SPEC-PROD-016, SPEC-ARCH-010]
---

# SPEC-QA-006: Test Strategy — Phase Completion Logic

**Versao**: 1.0.0
**Status**: Draft
**Autor**: qa-engineer
**Data**: 2026-03-17
**Sprint**: 31
**Contexto**: TripReadinessService (src/server/services/trip-readiness.service.ts), PhaseEngine (src/lib/engines/phase-engine.ts), phase-config (src/lib/engines/phase-config.ts)

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Phase marked complete when required fields missing | Medium | Critical | P0 |
| Phase marked incomplete when all requirements met | Medium | High | P0 |
| Auto-completion triggers prematurely (not all 6 phases done) | Low | Critical | P0 |
| Progress bar shows wrong phase status colors | Medium | High | P1 |
| Dashboard card colors do not match completion status | Medium | Medium | P1 |
| Partial data incorrectly categorized as "not_started" | Medium | High | P0 |
| TripReadinessService BOLA bypass | Low | Critical | P0 |
| Phase completion state inconsistent between dashboard and wizard | Medium | High | P1 |

---

## 2. Phase Completion Rules (source of truth)

These rules are derived from the existing TripReadinessService and PhaseEngine. The test strategy validates their correct implementation.

### Phase 1 — O Chamado (The Calling)

| Field | Required | Source |
|---|---|---|
| destination | YES | trip.destination (non-null, non-empty) |
| startDate | YES | trip.startDate (non-null) |
| endDate | YES | trip.endDate (non-null) |
| origin | NO | trip.origin (optional enrichment) |

**Complete**: destination + startDate + endDate all set.
**In Progress**: trip exists (destination may be set from creation, but dates missing).
**Pending**: should never occur (trip creation requires destination).

### Phase 2 — O Explorador (The Explorer)

| Field | Required | Source |
|---|---|---|
| travelerType | YES | expeditionPhase.metadata.travelerType |
| passengers | CONDITIONAL | Required when travelerType is "family" or "group" |
| preferences | NO | Optional enrichment |

**Complete**: travelerType set AND (if family/group, passengers array non-empty).
**In Progress**: expeditionPhase record exists with status "active".
**Pending**: No expeditionPhase record for phase 2.

### Phase 3 — O Preparo (The Preparation)

| Field | Required | Source |
|---|---|---|
| checklist items | YES | phaseChecklistItem records with phaseNumber=3 |
| all mandatory items checked | YES | All items where `mandatory=true` have `completed=true` |

**Complete**: All mandatory checklist items checked. (Note: AI generates the checklist; completion requires user action on each mandatory item.)
**In Progress**: Checklist exists (items generated) but not all mandatory items checked.
**Pending**: No checklist items exist for this trip.

### Phase 4 — A Logistica (The Logistics)

| Field | Required | Source |
|---|---|---|
| transport segments | OR | transportSegment records for tripId |
| accommodations | OR | accommodation records for tripId |
| local mobility | NO | trip.localMobility (optional) |

**Complete**: At least one transport segment OR at least one accommodation exists.
**In Progress**: expeditionPhase record exists with status "active" but no transport/accommodation.
**Pending**: No expeditionPhase record and no transport/accommodation data.

### Phase 5 — Guia do Destino (Destination Guide)

| Field | Required | Source |
|---|---|---|
| guide generated | YES | expeditionPhase record with status "completed" for phase 5 |

**Complete**: Guide generated and phase status is "completed".
**In Progress**: Phase started but guide not yet generated (or generation in progress).
**Pending**: Phase not started.

### Phase 6 — O Roteiro (The Itinerary)

| Field | Required | Source |
|---|---|---|
| itinerary generated | YES | expeditionPhase record with status "completed" for phase 6 |

**Complete**: Itinerary generated and phase status is "completed".
**In Progress**: Phase started but itinerary not yet generated.
**Pending**: Phase not started.

---

## 3. Test Pyramid

```
        [E2E]          -- 10 journeys (phase transitions, progress bar, dashboard cards, auto-complete)
       [Integration]   -- TripReadinessService with real DB, cross-phase consistency
      [Unit Tests]     -- Phase status resolver per phase, readiness score calculation, weight redistribution
```

### Unit Tests (devs must cover)

- Phase 1 status: `complete` when destination+startDate+endDate set
- Phase 1 status: `partial` when only destination set (dates missing)
- Phase 2 status: `complete` when travelerType set and passengers present for family/group
- Phase 2 status: `partial` when travelerType set but passengers missing for family type
- Phase 3 status: `complete` when all mandatory checklist items checked
- Phase 3 status: `partial` when checklist exists but some mandatory items unchecked
- Phase 3 status: `not_started` when no checklist items exist
- Phase 4 status: `complete` when transport OR accommodation exists
- Phase 4 status: `not_started` when neither transport nor accommodation exists
- Phase 5 status: `complete` when expeditionPhase status is "completed"
- Phase 6 status: `complete` when expeditionPhase status is "completed"
- Auto-completion: triggers only when ALL 6 phases have status `complete`
- Auto-completion: does NOT trigger when 5/6 phases are complete
- Readiness percent: correct weighted calculation with all categories present
- Readiness percent: correct weight redistribution when checklist/transport/accommodation absent

### Integration Tests

- `TripReadinessService.calculateTripReadiness()` with Phase 1 data only = partial readiness
- `TripReadinessService.calculateTripReadiness()` with all 6 phases complete = 100% readiness
- BOLA: `calculateTripReadiness(tripId, wrongUserId)` throws 403
- Phase status consistency: expeditionPhase.status matches derived status from data checks

---

## 4. Critical E2E Scenarios

### E2E-QA006-001: Phase 1 completes when all required fields filled

**Steps**:
1. Create new expedition.
2. Enter destination, start date, end date in Phase 1 wizard.
3. Submit Phase 1.
4. Navigate to dashboard.
**Expected**: Phase 1 shows as "complete" (green/gold indicator). Progress bar segment 1 is filled.

### E2E-QA006-002: Phase 3 completes when all mandatory checklist items checked

**Steps**:
1. Create expedition with completed phases 1+2.
2. Generate checklist in Phase 3.
3. Check all mandatory items (leave optional items unchecked).
4. Navigate to dashboard.
**Expected**: Phase 3 shows as "complete". Optional items do not block completion.

### E2E-QA006-003: Phase 4 completes when transport exists (no accommodation)

**Steps**:
1. Create expedition with completed phases 1+2+3.
2. Navigate to Phase 4 and add 1 transport segment.
3. Do NOT add accommodation.
4. Navigate to dashboard.
**Expected**: Phase 4 shows as "complete" (transport OR accommodation is sufficient).

### E2E-QA006-004: Phase 4 completes when accommodation exists (no transport)

**Steps**:
1. Create expedition with completed phases 1+2+3.
2. Navigate to Phase 4 and add 1 accommodation record.
3. Do NOT add transport.
4. Navigate to dashboard.
**Expected**: Phase 4 shows as "complete".

### E2E-QA006-005: Partial data shows "in_progress" status

**Steps**:
1. Create expedition.
2. Enter destination in Phase 1 but leave dates empty.
3. Navigate to dashboard.
**Expected**: Phase 1 shows as "in_progress" (blue indicator). Progress bar segment 1 shows partial state.

### E2E-QA006-006: No data shows "pending" status

**Steps**:
1. Create expedition (just the initial creation with minimal data).
2. Navigate to dashboard.
**Expected**: Phases 2-6 all show "pending" (gray indicator). Phase 1 shows "in_progress" (creation implies some phase 1 data).

### E2E-QA006-007: Auto-completion fires when all 6 phases complete

**Steps**:
1. Complete all 6 phases for an expedition (full E2E journey).
2. After Phase 6 completion, verify expedition status.
**Expected**: Expedition status changes to "completed". Dashboard card shows completed state (gold/green card border or badge). Gamification points awarded for expedition completion.

### E2E-QA006-008: Progress bar reflects correct phase states

**Steps**:
1. Create expedition with phases 1+2 complete, phase 3 in progress, phases 4-6 pending.
2. Navigate to expedition detail page.
**Expected**:
- Segments 1, 2: filled (gold/green)
- Segment 3: pulse animation (current/active)
- Segments 4, 5, 6: gray (future)

### E2E-QA006-009: Dashboard card colors match completion status

**Steps**:
1. Have 3 expeditions: one completed, one in-progress, one just created.
2. Navigate to dashboard.
**Expected**:
- Completed expedition card: completed indicator (gold/green border or badge)
- In-progress expedition card: active indicator (blue accent or badge)
- Newly created card: default/neutral indicator (gray)

### E2E-QA006-010: Readiness percentage is accurate

**Steps**:
1. Create expedition with phases 1+2 complete, checklist half done, 1 transport, 0 accommodations.
2. Navigate to dashboard.
3. Read readiness percentage from trip card.
**Expected**: Readiness calculation matches weighted formula: phases (2/6 * 40%) + checklist (50% * 30%) + transport (100% * 15%) + accommodation (0% * 15% redistributed). Value is reasonable and non-zero.

---

## 5. Status-to-Visual Mapping (for verification)

| PhaseStatus | Progress Bar Color | Dashboard Card Indicator | DashboardPhaseProgressBar |
|---|---|---|---|
| `complete` | Gold/green filled | Checkmark or green dot | Gold segment |
| `partial` / `in_progress` | Blue with pulse | Blue dot or progress ring | Pulse segment |
| `not_started` / `pending` | Gray | Gray dot | Gray segment |

---

## 6. Eval Dataset Reference

Dataset: `docs/evals/datasets/phase-completion-states.json` (12 cases)
Grader: State transition correctness checker

---

## 7. Definition of Done (QA perspective)

- [ ] All 10 E2E scenarios automated and passing
- [ ] Unit tests for all 6 phases x 3 states (complete, partial, pending)
- [ ] Readiness score calculation unit tests with weight redistribution
- [ ] Auto-completion trigger/non-trigger tests
- [ ] BOLA test for TripReadinessService
- [ ] Progress bar visual states match status-to-visual mapping table
- [ ] Dashboard card indicators match status-to-visual mapping table
- [ ] No phase status regression from Sprint 29 (PhaseNavigationEngine)
- [ ] Eval dataset passes with trust score >= 0.8
