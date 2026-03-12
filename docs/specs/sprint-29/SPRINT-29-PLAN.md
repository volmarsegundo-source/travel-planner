---
title: "Sprint 29 Plan"
sprint: 29
version: "v0.22.0"
budget_hours: "45h"
created: "2026-03-12"
author: tech-lead
---

# Sprint 29 Planning Document

**Version**: 1.0.0
**Author**: tech-lead
**Date**: 2026-03-12
**Budget**: 45h (5 working days, 2 devs at ~4.5h/day each)
**Baseline**: v0.21.0, 1721 tests, build clean, lint clean
**Process**: Spec-Driven Development (SDD) -- fifth sprint under SDD
**Test Target**: 1780+ (from 1721 baseline)
**Theme**: Sprint 28 Completion + Summary Page Integration

---

## 0. Sprint 28 Carryover Analysis

Sprint 28 completed v0.21.0 with partial delivery. The following items were explicitly deferred and MUST be completed in Sprint 29:

| Item | Source Task | Est. (h) | Why Deferred |
|------|-----------|----------|--------------|
| Profile name persistence fix | TASK-28-001 | 2h | Not completed in S28 |
| Map pin -- Prisma migration + autocomplete integration + card rendering | TASK-28-002/016 | 4h | Requires new migration (destinationLat/Lon) |
| Phase 4 auto-save between steps | TASK-28-003 | 3h | Descoped per R-007 budget risk |
| Phase revisit shows saved data | TASK-28-004 | 4h | Descoped per R-007 budget risk |
| Summary page card-based redesign with TripCountdown + readiness + next steps | TASK-28-011/012 | 7h | Backend ready (TripReadinessService, NextStepsEngine), frontend not integrated |
| WizardFooter CTA integration across Phase 1-6 wizards + tests | TASK-28-019/020 | 3h | WizardFooter component exists, integration deferred |

**Total carryover**: ~23h (Days 1-3 focus)

### Items NOT carried to Sprint 29

| Item | Reason | Next Sprint |
|------|--------|-------------|
| DnD time auto-adjustment | SPEC-PROD-004 + SPEC-ARCH-001 still Draft (fourth carry) | Sprint 30 |
| Interactive Mapbox atlas map | Requires SPEC-ARCH-002 full implementation | Sprint 30 |
| PDF/print summary export | Out of scope for SPEC-PROD-007 | Sprint 30+ |

---

## 1. Prioritization and Scope

### Group A: Sprint 28 Deferred Work (P0 -- Days 1-3, 23h)

| ID | Item | Priority | Est. (h) | Specs |
|----|------|----------|----------|-------|
| A-001 | Profile name persistence fix | P0 | 2h | XS exception (existing profile spec) |
| A-002 | Map pin coordinates -- Prisma migration | P0 | 1h | SPEC-ARCH-007 (new) |
| A-003 | Map pin -- autocomplete integration + dashboard rendering | P0 | 3h | SPEC-ARCH-007, SPEC-UX-016 (new) |
| A-004 | Phase 4 auto-save between sub-steps | P0 | 3h | SPEC-ARCH-008 (new) |
| A-005 | Phase revisit shows previously saved data (Phases 1-4) | P0 | 4h | SPEC-PROD-013 (new) |
| A-006 | Summary page card-based redesign | P0 | 5h | SPEC-PROD-007, SPEC-UX-012, SPEC-ARCH-005 |
| A-007 | Summary page -- TripCountdown + readiness + next steps integration | P0 | 2h | SPEC-PROD-007 |
| A-008 | WizardFooter CTA integration (Phase 1-6) | P0 | 2h | SPEC-PROD-009, SPEC-UX-014 |
| A-009 | WizardFooter + summary + map pin tests | P0 | 4h | All above |

**Subtotal Group A**: 26h (across both devs over 3 days)

### Group B: New Features (P1 -- Days 4-5, 14h)

| ID | Item | Priority | Est. (h) | Specs |
|----|------|----------|----------|-------|
| B-001 | Phase revisit -- Phases 5-6 data loading | P1 | 2h | SPEC-PROD-013 |
| B-002 | TripCountdown standalone card for dashboard | P1 | 2h | SPEC-PROD-007 AC-001/002, SPEC-UX-017 (new) |
| B-003 | Summary page -- edit-in-place links per phase card | P1 | 2h | SPEC-PROD-007 AC-005 |
| B-004 | Phase access guard (prevent URL skip-ahead) | P1 | 3h | SPEC-ARCH-010 (new) |
| B-005 | Tech debt cleanup batch (DEBT-S7-002 AppError duplication, DEBT-S8-005 any removal) | P2 | 2h | N/A (tech debt, XS exception) |
| B-006 | Group B tests | P1 | 3h | All above |

**Subtotal Group B**: 14h (across both devs over 2 days)

### Budget Summary

| Category | Hours |
|----------|-------|
| Group A (S28 carryover, P0) | 26h |
| Group B (new features, P1-P2) | 14h |
| **Subtotal** | **40h** |
| Buffer / integration testing | 5h |
| **Total budget** | **45h** |

---

## 2. SDD Spec Gate

### Specs to Approve (existing Drafts from Sprint 28)

These specs were created during Sprint 28 planning and cover deferred work. They are promoted to Approved for Sprint 29:

| Spec ID | Title | Owner | Current Status | Action | Covers |
|---------|-------|-------|---------------|--------|--------|
| SPEC-PROD-007 | Complete Journey Summary Enhancement | product-owner | Draft | APPROVE v1.1.0 | A-006, A-007, B-002, B-003 |
| SPEC-PROD-009 | CTA Button Standardization | product-owner | Draft | APPROVE v1.1.0 | A-008 |
| SPEC-UX-012 | Journey Summary Page | ux-designer | Draft | APPROVE v1.1.0 | A-006 |
| SPEC-UX-014 | CTA Button Standardization | ux-designer | Draft | APPROVE v1.1.0 | A-008 |
| SPEC-ARCH-005 | Journey Summary Data Aggregation | architect | Draft | APPROVE v1.1.0 | A-006, A-007 |

### New Specs Required for Sprint 29

| Spec ID | Title | Owner | Priority | Covers |
|---------|-------|-------|----------|--------|
| SPEC-ARCH-007 | Map Pin Coordinate Persistence | architect | Critical (Day 1) | A-002, A-003 |
| SPEC-ARCH-008 | Phase 4 Auto-Save Pattern | architect | High (Day 2) | A-004 |
| SPEC-ARCH-010 | Phase Access Guard | architect | Medium (Day 3) | B-004 |
| SPEC-UX-016 | Map Pin Dashboard Interaction | ux-designer | High (Day 1) | A-003 |
| SPEC-UX-017 | Dashboard Countdown Card | ux-designer | Medium (Day 3) | B-002 |
| SPEC-PROD-013 | Phase Revisit Data Loading | product-owner | High (Day 2) | A-005, B-001 |

### XS Exceptions (no spec required)

| Item | Justification |
|------|---------------|
| A-001 (profile name fix) | Bug fix < 2h, covered by existing profile spec |
| B-005 (tech debt cleanup) | Refactoring < 2h per item, no behavior change |

### Approval Gate Summary

**Pre-sprint**: SPEC-PROD-007, SPEC-PROD-009, SPEC-UX-012, SPEC-UX-014, SPEC-ARCH-005 must be approved.
**Day 1**: SPEC-ARCH-007, SPEC-UX-016 must be approved (unblocks A-002/A-003).
**Day 2**: SPEC-ARCH-008, SPEC-PROD-013 must be approved (unblocks A-004/A-005).
**Day 3**: SPEC-ARCH-010, SPEC-UX-017 must be approved (unblocks B-002/B-004).

---

## 3. Task Breakdown

### Group A -- Sprint 28 Deferred (P0, 26h)

---

#### TASK-29-001: Profile name persistence fix
- **Assigned**: dev-fullstack-2
- **Spec ref**: XS exception (profile data flow)
- **Description**: Root-cause why profile name does not persist after save. The `name` field is saved via `db.user.update` in `createExpeditionAction` (separate from `PROFILE_FIELD_POINTS`). Investigate: (a) is the save action writing correctly, (b) is the read path fetching from the correct table/field, (c) is session.user.name stale after update (JWT not refreshed). Fix the data flow end to end. Ensure JWT session is refreshed after name update.
- **Acceptance**: User saves name in profile form -> name persists across page reloads and session restarts. Name appears correctly in: UserMenu dropdown, profile page, expedition summary. Regression test included.
- **Est**: 2h
- **Dependencies**: None
- **Day**: Day 1

#### TASK-29-002: Map pin coordinates -- Prisma migration
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-ARCH-007 Section 2 (Data Model)
- **Description**: Add `destinationLat` (Float?) and `destinationLon` (Float?) fields to the Trip model in Prisma schema. Create and apply migration. Update Trip select clauses in TripService and ExpeditionSummaryService to include these fields.
- **Acceptance**: Migration runs cleanly. Existing trips have null coordinates (no data loss). Prisma client generated with new fields. Select clauses updated.
- **Est**: 1h
- **Dependencies**: None
- **Day**: Day 1

#### TASK-29-003: Map pin -- autocomplete integration + dashboard rendering
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-ARCH-007 Section 3, SPEC-UX-016
- **Description**: Update DestinationAutocomplete's `onSelect` callback to return lat/lon coordinates from the Nominatim response. Update `createExpeditionAction` to persist destinationLat/destinationLon to Trip. On the dashboard (ExpeditionCard or similar), render a static map pin indicator showing the destination's location. If coordinates are null, gracefully degrade (no pin shown, no error).
- **Acceptance**: Select a destination in Phase 1 -> coordinates saved to Trip. Dashboard shows pin at that location. Pin visible immediately after returning to dashboard. Graceful degradation when no coordinates. At least 4 tests.
- **Est**: 3h
- **Dependencies**: TASK-29-002
- **Day**: Day 1-2

#### TASK-29-004: Phase 4 auto-save between sub-steps
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-ARCH-008
- **Description**: Phase4Wizard has 3 sub-steps (Transport, Accommodation, Mobility). When a user fills Transport data and moves to Accommodation, the Transport data should be auto-saved. Implement dirty-check logic: track whether form data has changed since last load/save. On sub-step transition, if data is dirty, trigger the corresponding save action (saveTransportSegmentsAction, saveAccommodationsAction, saveLocalMobilityAction). Show a brief toast/visual cue confirming auto-save. Do NOT auto-save on page unload (risk of partial data).
- **Acceptance**: Fill Transport form -> navigate to Accommodation -> navigate back to Transport -> data is preserved. Auto-save triggers on sub-step change with dirty data only. Save indicator confirms auto-save. No data loss between sub-step transitions. At least 4 tests.
- **Est**: 3h
- **Dependencies**: SPEC-ARCH-008 approved
- **Day**: Day 2

#### TASK-29-005: Phase revisit shows saved data (Phases 1-4)
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-013
- **Description**: When a user completes Phase 1 and revisits it later, the form should show previously saved data. Currently Phase1Wizard receives userProfile/userName props but NOT previously saved trip data (destination, dates, origin). Similarly, Phase2Wizard does not pre-populate from saved expedition phase data. Fix by: (1) updating phase page server components to fetch existing trip data and pass as props, (2) updating wizard components to accept and initialize state from those props. Scope: Phases 1-4 (Phase 1: destination/origin/dates, Phase 2: traveler type/accommodation/passengers, Phase 3: no action needed -- checklist already loads from DB, Phase 4: already loads via getTransportSegmentsAction etc.).
- **Acceptance**: Complete Phase 1 -> advance to Phase 2 -> go back to Phase 1 -> destination, origin, dates pre-populated. Same for Phase 2 fields. Phase 3/4 already work (verify). Empty fields only when no data was previously saved. At least 6 tests.
- **Est**: 4h
- **Dependencies**: None
- **Day**: Day 1-2

#### TASK-29-006: Summary page card-based redesign
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-004/005/008/009, SPEC-UX-012, SPEC-ARCH-005
- **Description**: Redesign ExpeditionSummary.tsx from the current text-list layout to a card-based layout. Each of the 6 phase cards shows: phase name, phase icon (use PHASE_DEFINITIONS icons), completion status badge (complete/partial/not_started based on TripReadinessService data), key data summary from ExpeditionSummaryService. Incomplete phases show a "Complete this section" CTA linking to that phase. Readiness percentage indicator (from TripReadinessService) at top of page. Card layout: responsive grid (2 columns on desktop, stacked on mobile). Integration: the summary page server component must call both ExpeditionSummaryService and TripReadinessService, passing both datasets to the client component.
- **Acceptance**: 6 phase cards with consistent styling. Completion status badges visible. CTAs link to correct phases. Readiness percentage displayed. Card layout responsive (stacked mobile, grid desktop). Existing celebration/points animation still works. At least 8 tests.
- **Est**: 5h
- **Dependencies**: TripReadinessService exists (TASK-28-009 completed in S28)
- **Day**: Day 2-3

#### TASK-29-007: Summary page -- TripCountdown + readiness + next steps integration
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-001/002/006/007
- **Description**: Integrate TripCountdown display and NextStepsEngine suggestions into the redesigned summary page. At the top of the summary: (1) TripCountdown showing days until trip start (future), "Trip in progress" (current), or "Completed on [date]" (past), (2) Readiness percentage donut/bar. Below the phase cards: (3) "Next Steps" section showing 1-3 actionable suggestions from getNextStepsSuggestions(), each clickable to the relevant phase. All text localized (PT-BR + EN). Trip dates come from ExpeditionSummaryService phase1 data.
- **Acceptance**: Countdown renders correctly for future/current/past trips. Readiness percentage matches TripReadinessService calculation. Next steps suggestions render with clickable links. All text i18n. Accessible (aria-label for countdown, screen reader for readiness). At least 6 tests.
- **Est**: 2h
- **Dependencies**: TASK-29-006
- **Day**: Day 3

#### TASK-29-008: WizardFooter CTA integration (Phase 1-6)
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-009 AC-004-014, SPEC-UX-014
- **Description**: Replace ad-hoc button implementations in Phase 1-6 wizards with the existing WizardFooter component. Phase-specific adjustments: Phase 1-2 use "Continue"/"Continuar" as primary CTA. Phase 3 uses "Generate Checklist"/"Gerar Checklist" for AI action. Phase 4 sub-steps use "Save"/"Salvar" within sub-sections and "Continue"/"Continuar" at phase level. Phase 5 uses "Generate Guide"/"Gerar Guia". Phase 6 uses "Generate Itinerary"/"Gerar Roteiro" then "Complete Expedition"/"Concluir Expedição". All CTAs use theme tokens (no hardcoded colors). Keyboard accessible (Tab order, Enter/Space). Ensure loading state on all async actions. Current Phase1Wizard uses inline buttons with arrows -- replace with WizardFooter preserving back navigation.
- **Acceptance**: All 6 phase wizards use WizardFooter. Consistent button placement, styling, and behavior. Loading states on all async actions. No hardcoded color values. aria-disabled on disabled buttons. At least 6 tests (1 per phase verifying WizardFooter renders).
- **Est**: 2h
- **Dependencies**: WizardFooter component exists (TASK-28-018 completed in S28)
- **Day**: Day 3

#### TASK-29-009: Group A tests -- summary + map pin + CTA + fixes
- **Assigned**: dev-fullstack-1 (summary/CTA) + dev-fullstack-2 (map pin/auto-save/name)
- **Spec ref**: All Group A specs
- **Description**: Comprehensive test suite for all Group A deliverables. Includes: (a) Profile name persistence regression test (2 tests), (b) Coordinate persistence and map pin rendering (4 tests), (c) Phase 4 auto-save dirty check and save trigger (4 tests), (d) Phase revisit data loading for Phase 1 and Phase 2 (6 tests), (e) Summary page card layout -- 6 cards render, completion badges, CTAs (8 tests), (f) TripCountdown future/current/past (3 tests), (g) Readiness display (2 tests), (h) Next steps rendering (3 tests), (i) WizardFooter integration per phase (6 tests), (j) Summary page server component integration (2 tests).
- **Acceptance**: >= 40 new tests total. >= 80% coverage on modified files. All SPEC-PROD-007/009 ACs have test assertions. BOLA test for summary page. No regressions.
- **Est**: 4h (2h per dev, in parallel)
- **Dependencies**: TASK-29-001 through TASK-29-008
- **Day**: Day 3

---

### Group B -- New Features (P1-P2, 14h, Days 4-5)

---

#### TASK-29-010: Phase revisit -- Phases 5-6 data loading
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-013
- **Description**: Extend phase revisit to Phases 5 (Destination Guide) and 6 (Itinerary). Phase 5: if a guide has already been generated, show the existing guide rather than the generate button. Phase 6: if an itinerary plan exists, show the existing itinerary with an option to regenerate. Update phase page server components to fetch existing data.
- **Acceptance**: Revisit Phase 5 after guide generated -> guide displays, with option to regenerate. Revisit Phase 6 after itinerary generated -> itinerary displays, with option to regenerate. At least 4 tests.
- **Est**: 2h
- **Dependencies**: TASK-29-005 (pattern established)
- **Day**: Day 4

#### TASK-29-011: TripCountdown standalone card for dashboard
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-007 AC-001/002, SPEC-UX-017
- **Description**: Create a standalone TripCountdown card component that can be rendered on the dashboard (ExpeditionCard). Shows days until departure for each trip. Extracts the countdown logic from the summary page integration (TASK-29-007) into a reusable component. Renders inline on ExpeditionCard (below trip title). Localized.
- **Acceptance**: Each trip card on dashboard shows countdown. Correct formatting for future/current/past trips. Localized PT-BR + EN. Reusable component (used in both dashboard and summary). At least 3 tests.
- **Est**: 2h
- **Dependencies**: TASK-29-007 (countdown logic exists)
- **Day**: Day 4

#### TASK-29-012: Summary page -- edit-in-place links per phase card
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-005
- **Description**: Each phase card on the summary page should have an "Edit" link (ghost button) that navigates to the corresponding phase wizard. Current implementation already has edit buttons (data-testid="edit-phase-N") -- verify they work correctly with the new card layout and update styling to match the card design. For incomplete phases, the "Complete this section" CTA serves double duty as the edit link.
- **Acceptance**: Each completed phase card has an "Edit" link. Each incomplete phase card has a "Complete this section" CTA. Both navigate to the correct phase URL. Hover/focus states visible. At least 3 tests.
- **Est**: 2h
- **Dependencies**: TASK-29-006 (card layout)
- **Day**: Day 4

#### TASK-29-013: Phase access guard (prevent URL skip-ahead)
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-ARCH-010
- **Description**: Currently, users can manually type `/expedition/{tripId}/phase-5` even if they have not completed Phases 1-4. Implement a server-side guard in each phase page server component that checks `trip.currentPhase` and redirects to the correct current phase if the user tries to skip ahead. Allow revisiting completed phases (currentPhase >= requested phase). Allow accessing the current phase. Block access to future phases (currentPhase < requested phase) with redirect to current phase page.
- **Acceptance**: Cannot skip ahead to Phase 5 if currentPhase is 3 -- redirects to Phase 3. Can revisit Phase 1 when on Phase 4. Can access current phase. Guard is server-side only (no client check needed). At least 4 tests.
- **Est**: 3h
- **Dependencies**: None
- **Day**: Day 4

#### TASK-29-014: Tech debt cleanup batch
- **Assigned**: dev-fullstack-2
- **Spec ref**: XS exception (refactoring, no behavior change)
- **Description**: Clean up two long-standing tech debt items: (a) DEBT-S7-002: AppError and TripError are near-duplicates -- refactor to a single ErrorBoundaryCard component with variant prop. (b) DEBT-S8-005: remove eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard by adding proper types. Both are pure refactoring with no behavior change.
- **Acceptance**: AppError/TripError unified into ErrorBoundaryCard. No eslint-disable for no-explicit-any in PlanGeneratorWizard. All existing tests pass. No behavior change.
- **Est**: 2h
- **Dependencies**: None
- **Day**: Day 5

#### TASK-29-015: Group B tests
- **Assigned**: dev-fullstack-1 (summary edit, phase 5-6 revisit) + dev-fullstack-2 (countdown card, access guard)
- **Spec ref**: All Group B specs
- **Description**: Tests for: (a) Phase 5-6 revisit data loading (4 tests), (b) Dashboard countdown card (3 tests), (c) Summary edit links with card layout (3 tests), (d) Phase access guard redirect logic (4 tests), (e) ErrorBoundaryCard refactoring (2 tests regression).
- **Acceptance**: >= 16 new tests. >= 80% coverage on new/modified files. No regressions.
- **Est**: 3h (1.5h per dev, in parallel)
- **Dependencies**: TASK-29-010 through TASK-29-014
- **Day**: Day 5

#### TASK-29-016: Integration testing and build verification
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: All
- **Description**: Final integration verification. Run `npm run build` (catches stricter ESLint+TS than Vitest). Run full test suite. Verify test count >= 1780. Fix any integration issues. Run `npm run lint`. Run `npm run i18n:check`. Prepare PR.
- **Est**: 2h (1h per dev)
- **Dependencies**: All other tasks
- **Day**: Day 5

---

## 4. Dependency Map

```
Independent (can start Day 1):
  TASK-29-001 (profile name fix)
  TASK-29-002 (Prisma migration for coordinates)
  TASK-29-005 (phase revisit Phases 1-4)

Sequential chains:
  TASK-29-002 --> TASK-29-003 (map pin autocomplete + dashboard)

  TASK-29-005 --> TASK-29-006 (summary card redesign)
  TASK-29-006 --> TASK-29-007 (countdown + readiness + next steps)
  TASK-29-006 --> TASK-29-008 (WizardFooter integration)

  TASK-29-001 + TASK-29-003 + TASK-29-004 + TASK-29-005 +
  TASK-29-006 + TASK-29-007 + TASK-29-008 --> TASK-29-009 (Group A tests)

  TASK-29-005 --> TASK-29-010 (Phase 5-6 revisit, extends pattern)
  TASK-29-007 --> TASK-29-011 (dashboard countdown card, extracts component)
  TASK-29-006 --> TASK-29-012 (edit links on card layout)

  TASK-29-010 + TASK-29-011 + TASK-29-012 + TASK-29-013 +
  TASK-29-014 --> TASK-29-015 (Group B tests)

  ALL --> TASK-29-016 (integration)

Parallelization:
  dev-fullstack-1 (phase revisit + summary redesign + CTA + edit links)
  dev-fullstack-2 (profile fix + map pin + auto-save + access guard + tech debt)
```

---

## 5. Dev Assignment Summary

### dev-fullstack-1 (22.5h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-29-005 | Phase revisit Phases 1-4 | 4h | Day 1-2 |
| TASK-29-006 | Summary page card-based redesign | 5h | Day 2-3 |
| TASK-29-007 | Summary TripCountdown + readiness + next steps | 2h | Day 3 |
| TASK-29-008 | WizardFooter CTA integration (Phase 1-6) | 2h | Day 3 |
| TASK-29-009 | Group A tests (summary/CTA portion) | 2h | Day 3 |
| TASK-29-010 | Phase 5-6 revisit | 2h | Day 4 |
| TASK-29-012 | Summary edit-in-place links | 2h | Day 4 |
| TASK-29-015 | Group B tests (summary/revisit portion) | 1.5h | Day 5 |
| TASK-29-016 | Integration (shared) | 1h | Day 5 |
| **Total** | | **21.5h** | |

### dev-fullstack-2 (22.5h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-29-001 | Profile name persistence fix | 2h | Day 1 |
| TASK-29-002 | Map pin Prisma migration | 1h | Day 1 |
| TASK-29-003 | Map pin autocomplete + dashboard | 3h | Day 1-2 |
| TASK-29-004 | Phase 4 auto-save | 3h | Day 2 |
| TASK-29-009 | Group A tests (map pin/auto-save/name portion) | 2h | Day 3 |
| TASK-29-013 | Phase access guard | 3h | Day 4 |
| TASK-29-011 | Dashboard countdown card | 2h | Day 4 |
| TASK-29-014 | Tech debt cleanup | 2h | Day 5 |
| TASK-29-015 | Group B tests (countdown/guard portion) | 1.5h | Day 5 |
| TASK-29-016 | Integration (shared) | 1h | Day 5 |
| **Total** | | **20.5h** | |

**Buffer**: 4h total (2h per dev) -- available for estimate overflow or additional tests.

---

## 6. Execution Plan (Day-by-Day)

### Day 1 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-29-005: Phase revisit Phases 1-4 (start) | 4h | Investigate Phase 1/2 server components, add data-fetching props. Largest Day 1 task. |
| dev-fullstack-2 | TASK-29-001: Profile name fix | 2h | Quick fix. Investigate JWT refresh after name update. |
| dev-fullstack-2 | TASK-29-002: Prisma migration (destinationLat/Lon) | 1h | Run migration early to unblock TASK-29-003. |
| dev-fullstack-2 | TASK-29-003: Map pin autocomplete (start) | 1.5h | Wire Nominatim lat/lon to createExpeditionAction. |

**End of Day 1**: Profile name fixed. Migration applied. Phase revisit investigation complete for Phases 1-2. Map pin coordinate flow started.

### Day 2 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-29-005: Phase revisit Phases 1-4 (finish) | 0.5h | Verify Phase 3/4 already work (data loads from DB). |
| dev-fullstack-1 | TASK-29-006: Summary page card redesign (start) | 4h | Rewrite ExpeditionSummary.tsx. Card grid layout, completion badges, phase icons. |
| dev-fullstack-2 | TASK-29-003: Map pin autocomplete + dashboard (finish) | 1.5h | Dashboard rendering, graceful degradation. |
| dev-fullstack-2 | TASK-29-004: Phase 4 auto-save | 3h | Dirty check logic + save trigger on sub-step change. |

**End of Day 2**: Phase revisit done (1-4). Summary card redesign in progress. Map pin functional. Auto-save implemented.

### Day 3 (9h total: ~4.5h per dev) -- KEY MILESTONE

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-29-006: Summary page card redesign (finish) | 1h | Remaining card styling and responsive behavior. |
| dev-fullstack-1 | TASK-29-007: TripCountdown + readiness + next steps | 2h | Integration into redesigned summary page. |
| dev-fullstack-1 | TASK-29-008: WizardFooter CTA integration | 2h | Wire WizardFooter to all 6 phase wizards. Replace inline buttons. |
| dev-fullstack-1 | TASK-29-009: Group A tests (summary/CTA) | 0.5h | Start test writing. |
| dev-fullstack-2 | TASK-29-009: Group A tests (map pin/auto-save/name) | 2h | Tests for TASK-29-001/003/004. |
| dev-fullstack-2 | (buffer) | 2h | Overflow from auto-save or coordinate work. |

**End of Day 3**: ALL Group A implementation complete. Summary page redesigned with countdown + readiness + next steps. WizardFooter integrated. Group A tests partially done. **This is the user-facing milestone -- summary page is the top priority.**

### Day 4 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-29-009: Group A tests (finish) | 1.5h | Complete remaining summary/CTA tests. |
| dev-fullstack-1 | TASK-29-010: Phase 5-6 revisit | 2h | Extend revisit pattern to guide + itinerary. |
| dev-fullstack-1 | TASK-29-012: Summary edit links | 1h | Verify/update edit links on card layout. |
| dev-fullstack-2 | TASK-29-013: Phase access guard | 3h | Server-side currentPhase check on all phase pages. |
| dev-fullstack-2 | TASK-29-011: Dashboard countdown card | 1.5h | Extract reusable countdown, add to ExpeditionCard. |

**End of Day 4**: Phase revisit complete (all 6 phases). Access guard implemented. Dashboard countdown visible. Edit links functional.

### Day 5 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-29-012: Summary edit links (finish) | 1h | Complete styling and tests. |
| dev-fullstack-1 | TASK-29-015: Group B tests (summary/revisit) | 1.5h | Tests for TASK-29-010/012. |
| dev-fullstack-1 | TASK-29-016: Integration (shared) | 1h | npm run build + full test suite. |
| dev-fullstack-2 | TASK-29-014: Tech debt cleanup | 2h | ErrorBoundaryCard unification + any removal. |
| dev-fullstack-2 | TASK-29-015: Group B tests (countdown/guard) | 1.5h | Tests for TASK-29-011/013. |
| dev-fullstack-2 | TASK-29-016: Integration (shared) | 1h | PR prep, final verification. |

**End of Day 5**: All tasks done. Build clean. Test count >= 1780. PR ready.

---

## 7. Item Completion Timeline

| Day | Items Completed | Running Test Count (est.) |
|-----|----------------|--------------------------|
| Day 1 | Profile name fix (A-001), Prisma migration (A-002), Phase revisit started (A-005) | ~1728 |
| Day 2 | Map pin (A-003), Auto-save (A-004), Phase revisit done (A-005), Summary started (A-006) | ~1740 |
| Day 3 | Summary redesign (A-006), Countdown/readiness/next steps (A-007), CTA integration (A-008), Group A tests (A-009) | ~1765 |
| Day 4 | Phase 5-6 revisit (B-001), Countdown card (B-002), Edit links (B-003), Access guard (B-004) | ~1775 |
| Day 5 | Tech debt (B-005), Group B tests (B-006), Integration | ~1785 |

---

## 8. Test Strategy

### New Test Categories

| Area | Expected Tests | Coverage Target |
|------|---------------|-----------------|
| Profile name persistence | 2-3 | Regression |
| Coordinate persistence (Prisma + autocomplete) | 4-5 | >= 80% |
| Map pin dashboard rendering | 3-4 | >= 80% |
| Phase 4 auto-save (dirty check + save trigger) | 4-5 | >= 80% |
| Phase revisit data loading (Phase 1-2) | 6-8 | >= 80% |
| Summary page card layout (6 cards, badges, CTAs) | 8-10 | >= 80% |
| TripCountdown (future/current/past) | 3-4 | >= 80% |
| Readiness display | 2-3 | >= 80% |
| Next steps rendering | 3-4 | >= 80% |
| WizardFooter integration (1 per phase) | 6 | Smoke per phase |
| Phase 5-6 revisit | 4 | >= 80% |
| Dashboard countdown card | 3 | >= 80% |
| Summary edit links | 3 | >= 80% |
| Phase access guard | 4-5 | >= 80% |
| ErrorBoundaryCard + any removal | 2 | Regression |
| **Total new tests** | **57-71** | |
| **Expected final count** | **~1780-1792** | |

### Manual Verification Protocol

For UI-layer changes, unit tests are necessary but NOT sufficient (Sprint 27 lesson).

#### MANUAL-V-S29-001: Summary Page Redesign
1. Navigate to summary page for a trip with all 6 phases complete.
2. VERIFY: 6 phase cards render in a 2-column grid on desktop.
3. VERIFY: Cards stack on mobile (375px).
4. VERIFY: Completion status badges show correctly (complete/partial/not_started).
5. VERIFY: Readiness percentage displays at top.
6. VERIFY: TripCountdown shows correct days.
7. VERIFY: Next Steps section shows relevant suggestions for partially complete trip.
8. VERIFY: Celebration animation still works on first visit after completing Phase 6.

#### MANUAL-V-S29-002: WizardFooter CTA Consistency
1. Navigate through Phase 1 to Phase 6.
2. VERIFY: All phases use WizardFooter with Back (left) and Primary CTA (right).
3. VERIFY: Loading spinner on all async CTAs (Phase 3/5/6 AI generation).
4. VERIFY: Disabled state is visually distinct.
5. VERIFY: Labels follow standardized convention ("Continue", "Generate [Type]", "Complete Expedition").

#### MANUAL-V-S29-003: Profile Name Persistence
1. Set name in Phase 1 profile form -> save (create expedition).
2. Refresh page -> VERIFY: name still shows in UserMenu dropdown.
3. Log out and log in -> VERIFY: name persists.

#### MANUAL-V-S29-004: Map Pin
1. Create new trip, select destination via autocomplete.
2. Navigate to dashboard.
3. VERIFY: Pin/location indicator appears for that trip.

#### MANUAL-V-S29-005: Phase 4 Auto-Save
1. In Phase 4, add a transport segment.
2. Navigate to Accommodation sub-step.
3. Navigate back to Transport sub-step.
4. VERIFY: Previously entered transport data is preserved.

#### MANUAL-V-S29-006: Phase Revisit
1. Complete Phase 1 (set destination, dates, origin).
2. Advance to Phase 2, then navigate back to Phase 1.
3. VERIFY: Destination, origin, and dates are pre-populated.

#### MANUAL-V-S29-007: Phase Access Guard
1. Create a new trip (currentPhase = 1).
2. Manually type URL for Phase 5.
3. VERIFY: Redirected to Phase 1.
4. Complete Phase 1, advance to Phase 2.
5. Try Phase 5 URL again.
6. VERIFY: Redirected to Phase 2.

---

## 9. Definition of Done

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes
- [ ] Commits use Conventional Commits with spec IDs and task IDs: `feat(SPEC-PROD-007): description [TASK-29-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] Prisma JSON writes use `as unknown as Prisma.InputJsonValue` pattern (if applicable)
- [ ] redirect() calls are OUTSIDE try/catch blocks (FIND-M-001)
- [ ] No hardcoded colors -- use theme tokens

### Sprint-Level DoD
- [ ] All 16 tasks marked complete
- [ ] Code review approved by tech-lead (structured review per template)
- [ ] Test count >= 1780 (target: ~1785 from 1721 baseline)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] i18n check clean (`npm run i18n:check` -- no missing keys)
- [ ] Security checklist passed for all PRs
- [ ] Bias/ethics checklist passed for all PRs
- [ ] QA conformance audit against all referenced specs
- [ ] ALL 7 MANUAL-V protocols executed and documented with PASS/FAIL
- [ ] No recurring bugs remain from this sprint's scope
- [ ] No spec drift detected
- [ ] All commits reference spec IDs
- [ ] Merged to master via PR -- no direct commits
- [ ] SPEC-STATUS.md updated with Sprint 29 spec approvals
- [ ] Version bumped to v0.22.0

### Security Checklist
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized (Zod schemas for coordinates, phase numbers)
- [ ] PII data not logged or exposed in responses
- [ ] Auth/authz correctly enforced on touched endpoints
- [ ] No SQL injection, XSS, or CSRF vectors introduced
- [ ] BOLA checks on: summary page, phase access guard, map pin data
- [ ] redirect() calls outside try/catch blocks (FIND-M-001)
- [ ] Trip ownership verified before displaying any trip data
- [ ] Coordinate fields (Float?) validated for reasonable ranges (-90..90 lat, -180..180 lon)

### Bias and Ethics Checklist
- [ ] No discriminatory logic based on nationality, gender, age, disability, religion
- [ ] Search/sort/filter algorithms treat all users equitably
- [ ] Error messages are neutral and non-judgmental
- [ ] No dark patterns in UX flows
- [ ] CTA labels are honest and clear
- [ ] Summary readiness percentage framing is encouraging, not judgmental
- [ ] Phase access guard redirects with neutral messaging (no blame)

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: Summary page redesign takes longer than 5h | Medium | Medium | Backend (TripReadinessService, NextStepsEngine) is already built. If over by Day 3, descope edit-in-place links (TASK-29-012) to Sprint 30. |
| R-002: Phase revisit reveals missing data paths in multiple phases | Medium | High | Scope Phase 1-4 in Group A, defer Phases 5-6 to Group B. If Phase 1-2 alone exceed 4h, descope Phase 2 revisit to Sprint 30. |
| R-003: WizardFooter integration has higher blast radius than expected | Low | Medium | WizardFooter component is already built and tested. Integration is mechanical replacement. If any phase has incompatible patterns, document and skip (fix in Sprint 30). |
| R-004: Prisma migration for coordinates conflicts with other changes | Low | Low | Migration runs first (Day 1). Single migration file. No conflict with other schema changes this sprint. |
| R-005: Phase access guard needs complex logic for partial completion | Medium | Medium | Keep logic simple: `if (requestedPhase > trip.currentPhase) redirect`. Phase completion status already tracked in currentPhase field. |
| R-006: Budget overflow (40h planned, 45h budget, 5h margin) | Low | Low | 5h buffer is more generous than Sprint 28 (2h). Descope priority: B-005 (tech debt) first, then B-002 (dashboard countdown). |

---

## 11. Spec Approval Actions

### Pre-Sprint (tech-lead approves existing Drafts)

The following specs have been in Draft since Sprint 27/28. They have been reviewed during Sprint 28 planning and are hereby approved for Sprint 29 implementation:

| Spec ID | Version | Status Change | Date |
|---------|---------|---------------|------|
| SPEC-PROD-007 | 1.1.0 | Draft -> Approved | 2026-03-12 |
| SPEC-PROD-009 | 1.1.0 | Draft -> Approved | 2026-03-12 |
| SPEC-UX-012 | 1.1.0 | Draft -> Approved | 2026-03-12 |
| SPEC-UX-014 | 1.1.0 | Draft -> Approved | 2026-03-12 |
| SPEC-ARCH-005 | 1.1.0 | Draft -> Approved | 2026-03-12 |

### New Specs to Create (assignments)

| Spec ID | Title | Owner | Deadline | Priority |
|---------|-------|-------|----------|----------|
| SPEC-ARCH-007 | Map Pin Coordinate Persistence | architect | Day 1 (2026-03-12) | Critical |
| SPEC-ARCH-008 | Phase 4 Auto-Save Pattern | architect | Day 2 (2026-03-13) | High |
| SPEC-ARCH-010 | Phase Access Guard | architect | Day 3 (2026-03-14) | Medium |
| SPEC-UX-016 | Map Pin Dashboard Interaction | ux-designer | Day 1 (2026-03-12) | High |
| SPEC-UX-017 | Dashboard Countdown Card | ux-designer | Day 3 (2026-03-14) | Medium |
| SPEC-PROD-013 | Phase Revisit Data Loading | product-owner | Day 2 (2026-03-13) | High |

---

## 12. Sprint 30 Preview

| Item | Est. | Notes |
|------|------|-------|
| DnD time auto-adjustment | 12h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft. Fifth carry -- needs resolution. |
| Interactive Mapbox atlas map | 8-10h | Build on SPEC-ARCH-007 coordinate data. |
| PDF/print summary export | 4-6h | Natural extension of summary page redesign. |
| Descoped Sprint 29 items (if any) | 2-4h | Potential: dashboard countdown (B-002), edit links (B-003), tech debt (B-005). |
| Navigation restructure | 10-14h | SPEC-PROD-008 + SPEC-ARCH-002 still Draft. Deferred from Sprint 28. |

---

## 13. Coordination Notes

### For tech-lead (self)
- **Pre-sprint (Day 0)**: Approve 5 existing Draft specs (SPEC-PROD-007/009, SPEC-UX-012/014, SPEC-ARCH-005). Request creation of 6 new specs from architect/ux-designer/product-owner.
- **Day 1**: Verify profile name fix (TASK-29-001) is a quick win. Ensure migration (TASK-29-002) runs cleanly. Monitor phase revisit investigation (TASK-29-005).
- **Day 2**: Mid-check on summary card redesign (TASK-29-006). This is the highest-risk and highest-value task. Verify auto-save pattern (TASK-29-004) is clean.
- **Day 3**: CRITICAL MILESTONE. Summary page, WizardFooter integration, and all Group A items must be implementation-complete. Start MANUAL-V protocols.
- **Day 4**: Review Group B implementations. Phase access guard (TASK-29-013) is structurally important.
- **Day 5**: Final code review. Build + test gate. Ensure all 7 MANUAL-V protocols documented.

### For devs
- dev-fullstack-1: You own the summary page (biggest feature) and phase revisit. The summary card redesign (TASK-29-006) is the highest-risk task at 5h. The readiness service and next steps engine already exist -- you are wiring them into the UI, not building from scratch.
- dev-fullstack-2: You own the map pin pipeline (migration -> autocomplete -> dashboard), Phase 4 auto-save, and the phase access guard. Start with the two quick tasks (TASK-29-001/002) to build momentum on Day 1.
- BOTH: Run `npm run build` after completing each major task.
- BOTH: When touching Phase wizards (CTA integration, phase revisit), check imports use `@/i18n/navigation` -- this is a recurring violation.
- BOTH: Coordinate fields must be validated for reasonable ranges (-90..90 lat, -180..180 lon) in Zod schemas.

### For spec owners
- architect: 3 new specs needed (SPEC-ARCH-007/008/009). SPEC-ARCH-007 is critical for Day 1.
- ux-designer: 2 new specs needed (SPEC-UX-016/017). SPEC-UX-016 needed by Day 1.
- product-owner: 1 new spec needed (SPEC-PROD-013). Needed by Day 2.

---

## 14. Key Files Reference

### Already Built (from Sprint 28, ready to use/integrate)
- `src/components/features/expedition/WizardFooter.tsx` -- shared CTA component (TASK-28-018)
- `src/server/services/trip-readiness.service.ts` -- readiness calculation (TASK-28-009)
- `src/lib/engines/next-steps-engine.ts` -- suggestion engine (TASK-28-012)

### To Modify
- `src/components/features/expedition/ExpeditionSummary.tsx` -- card-based redesign
- `src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx` -- add readiness + countdown data
- `src/components/features/expedition/Phase1Wizard.tsx` -- WizardFooter + data loading
- `src/components/features/expedition/Phase4Wizard.tsx` -- auto-save + WizardFooter
- `src/server/actions/expedition.actions.ts` -- persist destinationLat/Lon
- `prisma/schema.prisma` -- add destinationLat/Lon to Trip
- `src/components/features/expedition/DestinationAutocomplete.tsx` -- return lat/lon from onSelect

### To Create
- `src/components/features/expedition/TripCountdown.tsx` -- standalone countdown component
- `src/components/features/expedition/PhaseCard.tsx` -- reusable phase card for summary
- `src/components/features/expedition/ReadinessIndicator.tsx` -- percentage display
- `src/lib/guards/phase-access-guard.ts` -- server-side phase access check
- Migration file: `prisma/migrations/YYYYMMDDHHMMSS_add_destination_coordinates/`

---

> READY TO EXECUTE. All Sprint 28 deferred items accounted for. 5 existing specs approved (SPEC-PROD-007/009, SPEC-UX-012/014, SPEC-ARCH-005). 6 new specs needed from architect/ux-designer/product-owner (SPEC-ARCH-007/008/009, SPEC-UX-016/017, SPEC-PROD-013) -- architect must deliver SPEC-ARCH-007 by Day 1 to unblock map pin work.
