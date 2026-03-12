---
spec_id: SPRINT-29-BACKLOG
title: "Sprint 29 Backlog Prioritization"
type: backlog
status: Draft
version: "1.0.0"
sprint: 29
author: product-owner
created: "2026-03-12"
updated: "2026-03-12"
baseline_version: "v0.21.0"
baseline_tests: 1721
target_version: "v0.22.0"
---

# Sprint 29 Backlog Prioritization

**Sprint**: 29
**Version Target**: 0.22.0
**Budget**: 45h (5 working days, 2 devs at ~4.5h/day each)
**Theme**: "Beta Readiness -- Summary Polish, Data Persistence & CTA Closure"
**Process**: Spec-Driven Development (SDD) -- fifth sprint under SDD
**Author**: product-owner
**Date**: 2026-03-12
**Baseline**: v0.21.0, 1721 tests, build clean

---

## 0. Sprint Context

### Why "Beta Readiness" Now

Sprint 28 (v0.21.0) delivered the navigation restructure (Expeditions + Meu Atlas), gamification header, LGPD pages, and basic monitoring. However, seven items were deferred due to budget pressure and the structural complexity of the navigation work. These deferred items represent the last critical UX gaps before the product can be opened to beta users.

Sprint 29 is NOT the beta launch sprint. It is the final polish sprint. The beta launch decision (GO/NO-GO) will be made at the Sprint 29 review based on the Beta Launch Readiness Checklist (Section 8). If all gates pass, Sprint 30 becomes the beta launch sprint.

### Key Inputs

- Sprint 28 results: Navigation restructure, gamification header, LGPD pages, monitoring delivered
- 7 deferred items from Sprint 28 (see Section 1)
- SPEC-PROD-011 (Summary with Edit) partially implemented -- TripCountdown and TripReadinessService exist but are not integrated into ExpeditionSummary.tsx
- SPEC-PROD-009 (CTA Standardization) partially implemented -- WizardFooter component created but not integrated across Phase 1-6 wizards
- DnD Time Adjustment (SPEC-PROD-004) carried from Sprint 26/27/28 -- fourth carry, still Draft
- Manual test re-run needed post-Sprint 28 changes

### Budget Allocation

| Category | Hours | % |
|----------|-------|---|
| P0 Deferred completions (summary + CTA) | 18h | 40% |
| P1 Deferred fixes (persistence, auto-save, revisit) | 9h | 20% |
| P1 Map pin (Prisma migration + rendering) | 5h | 11% |
| New value (SPEC-PROD-013, SPEC-PROD-014) | 5h | 11% |
| Manual test re-run | 3h | 7% |
| Buffer | 5h | 11% |
| **Total** | **45h** | **100%** |

---

## 1. Deferred Items from Sprint 28

| ID | Item | Original Task | Est. (S28) | Reason Deferred |
|----|------|---------------|------------|-----------------|
| DEF-001 | Profile name persistence fix | TASK-28-001 | 2h | Budget pressure from navigation restructure overrun |
| DEF-002 | Map pin coordinates (Prisma migration + coordinate persistence + rendering) | TASK-28-002/016 | 4h | Coupled with navigation restructure; map section partially deferred |
| DEF-003 | Phase 4 auto-save between steps | TASK-28-003 | 3h | P2 in sacrifice order; cut when navigation overran |
| DEF-004 | Phase revisit shows saved data | TASK-28-004 | 4h | P2 in sacrifice order; cut when navigation overran |
| DEF-005 | Summary page card-based redesign | TASK-28-011 | 5h | TripCountdown + TripReadinessService built but not integrated into ExpeditionSummary.tsx |
| DEF-006 | Next Steps integration into summary page | TASK-28-012 | 2h | NextStepsEngine created but not wired into the summary UI |
| DEF-007 | WizardFooter CTA integration across Phase 1-6 + tests | TASK-28-019/020 | 3h | WizardFooter component exists but not integrated into any wizard |

---

## 2. Scoring Summary

Scoring formula (consistent since Sprint 5):

| Criterion | Weight |
|-----------|--------|
| Traveler pain severity | 30% |
| Business revenue impact | 25% |
| Implementation effort (inverse: 5=XS, 1=XL) | 20% |
| Strategic alignment | 15% |
| Competitive differentiation | 10% |

### Scored Backlog

| # | Item | Pain | Revenue | Effort Inv. | Strategic | Competitive | Score | Est. | Priority |
|---|------|------|---------|-------------|-----------|-------------|-------|------|----------|
| 1 | T-S29-001: Summary page card-based redesign (DEF-005) | 5 | 4 | 3 | 5 | 4 | 4.30 | 5h | P0 |
| 2 | T-S29-002: Next Steps integration (DEF-006) | 4 | 4 | 4 | 5 | 5 | 4.30 | 2h | P0 |
| 3 | T-S29-003: WizardFooter CTA integration + tests (DEF-007) | 4 | 3 | 3 | 5 | 3 | 3.70 | 3h | P0 |
| 4 | T-S29-004: Summary page tests | 4 | 3 | 3 | 5 | 3 | 3.70 | 3h | P0 |
| 5 | T-S29-005: Phase revisit shows saved data (DEF-004) | 4 | 3 | 3 | 5 | 2 | 3.50 | 4h | P1 |
| 6 | T-S29-006: Map pin coordinates full implementation (DEF-002) | 3 | 3 | 3 | 5 | 4 | 3.45 | 5h | P1 |
| 7 | T-S29-007: Phase 4 auto-save between steps (DEF-003) | 3 | 2 | 3 | 4 | 2 | 2.85 | 3h | P1 |
| 8 | T-S29-008: Profile name persistence fix (DEF-001) | 3 | 2 | 4 | 3 | 1 | 2.75 | 2h | P1 |
| 9 | T-S29-009: Beta onboarding flow validation (NEW) | 4 | 5 | 3 | 5 | 3 | 4.10 | 3h | P1 |
| 10 | T-S29-010: Shareable trip summary link (NEW - SPEC-PROD-013) | 3 | 4 | 3 | 4 | 5 | 3.65 | 3h | P2 |
| 11 | T-S29-011: Trip duplication from summary (NEW - SPEC-PROD-014) | 2 | 3 | 4 | 3 | 4 | 2.95 | 2h | P2 |
| 12 | T-S29-012: Manual test full re-run | 5 | 5 | 3 | 5 | 1 | 4.20 | 3h | Mandatory |

### Scoring Rationale

**T-S29-001 (Summary page card-based redesign, 4.30)**: Highest pain (5) because the summary is the "payoff moment" of the entire expedition and it currently does not integrate TripCountdown or TripReadinessService despite these services existing. The backend is done; this is pure UI integration work. Strategic alignment is maximum (5) because the summary page is what beta users will screenshot and share informally, making it a de facto marketing asset.

**T-S29-002 (Next Steps integration, 4.30)**: Same score but lower effort (2h) makes it high ROI. The NextStepsEngine is already built. This is wiring it into the summary page and adding the UI cards. High competitive differentiation (5) because context-aware next-step suggestions are uncommon in trip planners.

**T-S29-009 (Beta onboarding flow, 4.10)**: New item. High revenue impact (5) because the beta launch depends on the new-user flow working end-to-end: register -> first trip -> complete at least Phase 1-3 -> see summary. If this flow breaks, beta is blocked. Not a feature build -- it is a scripted validation + fix pass.

**T-S29-005 (Phase revisit shows saved data, 3.50)**: Third carry. Pain is high (4) because returning to a phase and seeing empty fields destroys user trust. Strategic alignment is maximum (5) because beta users will revisit phases constantly.

**T-S29-010 (Shareable trip summary link, 3.65)**: New feature. Competitive differentiation is highest (5) because enabling users to share a read-only summary link creates organic growth potential during beta. Low effort (3h) because it requires only a public route + token-based access, no new data model.

---

## 3. Sprint 29 Commitment (45h Budget)

### P0 -- Summary Page Completion (13h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S29-001 | Summary page card-based redesign | SPEC-PROD-011 AC-004, AC-005, AC-011, AC-012 | 5h | Integrate TripCountdown + TripReadinessService into ExpeditionSummary.tsx. 6 phase cards with completion status badges, edit actions, destination-themed header. Backend services exist -- this is UI assembly |
| T-S29-002 | Next Steps integration | SPEC-PROD-011 AC-009, AC-010 | 2h | Wire NextStepsEngine output into summary page. 1-3 actionable suggestion cards with click-through navigation. Engine exists -- this is UI rendering + i18n |
| T-S29-003 | WizardFooter CTA integration across Phase 1-6 + tests | SPEC-PROD-009 | 3h | Replace ad-hoc button implementations in all 6 phase wizards with WizardFooter component. Component exists -- this is mechanical replacement + testing. 1h integration per dev pair + 1h tests |
| T-S29-004 | Summary page tests | SPEC-PROD-011 | 3h | Tests for: card layout rendering (6 cards), completion badges, countdown display (future/current/past), readiness percentage, next steps rendering, edit navigation, "View Summary" button on dashboard. Target: >= 20 new tests |

### P1 -- Deferred Fixes & Persistence (14h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S29-005 | Phase revisit shows saved data | SPEC-PROD-001 (phase nav) | 4h | When revisiting a completed phase, form must pre-populate with saved data. Investigate all 6 phase wizards. May require adding data-fetching to wizard page server components. Third carry -- must land this sprint |
| T-S29-006 | Map pin coordinates (Prisma migration + persistence + rendering) | SPEC-PROD-012 AC-007/008/009 | 5h | Full implementation: (a) Prisma migration for destinationLat/destinationLon on Trip, (b) save coordinates from DestinationAutocomplete onSelect, (c) render pins on Meu Atlas map page with color-coded status, (d) pin click tooltip with "View Trip" link. Includes tests |
| T-S29-007 | Phase 4 auto-save between steps | SPEC-PROD-TRANSPORT | 3h | Auto-save transport/accommodation/mobility data when switching between Phase 4 sub-steps. Dirty check + save on sub-step change. Brief visual confirmation (toast or indicator) |
| T-S29-008 | Profile name persistence fix | No spec (XS) | 2h | Root-cause and fix: profile name not persisting after save. Likely JWT session cache issue. Verify name appears in UserMenu, profile page, and expedition summary after save + session refresh |

### P1 -- Beta Validation (3h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S29-009 | Beta onboarding flow validation | SPEC-PROD-013 | 3h | End-to-end scripted test of the beta user journey: register (credentials + Google) -> profile setup -> create first trip -> complete Phase 1-3 -> view summary -> edit a phase -> return to summary. Fix any blockers found. Document pass/fail per step |

### P2 -- New Value (5h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S29-010 | Shareable trip summary link | SPEC-PROD-014 | 3h | Generate a unique, read-only shareable URL for a trip summary. No authentication required to view. Traveler can copy link from summary page. Shared view shows trip data without edit actions. Token-based access (UUID in URL), no PII exposure |
| T-S29-011 | Trip duplication from summary | SPEC-PROD-015 | 2h | "Plan a similar trip" button on summary page. Creates a new trip pre-populated with: same destination, same travel style preferences, same passenger count. Does NOT copy dates, transport bookings, or accommodation. Quick way to plan a return visit |

### Mandatory Quality Gate (3h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S29-012 | Manual test full re-run | N/A | 3h | Post-Sprint 28/29 changes require a full manual test re-run. Focus on: navigation restructure flows, summary page, CTA buttons across phases, map pins, phase revisit data loading. Target: >= 95% pass rate |

### Budget Summary

| Category | Hours |
|----------|-------|
| P0 Summary completion | 13h |
| P1 Deferred fixes | 14h |
| P1 Beta validation | 3h |
| P2 New value | 5h |
| Mandatory quality gate | 3h |
| **Total committed** | **38h** |
| **Buffer** | **7h (16%)** |
| **Total budget** | **45h** |

### Buffer Analysis

- Buffer is 16% -- healthier than Sprint 28's 13%, reflecting the lesson that deferred fix items tend to expand during investigation
- The summary page work (T-S29-001/002) has lower risk than Sprint 28 because backend services already exist; this is primarily UI assembly
- Highest risk item is T-S29-005 (phase revisit, 4h) -- this is its third carry, suggesting the root cause may be more complex than estimated
- If buffer is consumed, sacrifice order applies (Section 5)

---

## 4. Sacrifice Order (if budget pressure)

If the sprint runs over budget, items are sacrificed in this order (first sacrificed first):

1. **T-S29-011** (Trip duplication, 2h) -- Nice-to-have. Can be built in any future sprint without dependencies.
2. **T-S29-010** (Shareable link, 3h) -- Valuable but not beta-blocking. Beta users can share screenshots instead.
3. **T-S29-007** (Phase 4 auto-save, 3h) -- Fourth carry candidate. Can mitigate with a "save before switching" confirmation dialog as a band-aid.
4. **T-S29-006 partial** (Map pin rendering, ~2h of 5h) -- Ship the Prisma migration + coordinate persistence without the interactive map pin rendering. Pins can be added in Sprint 30.

Items T-S29-001, T-S29-002, T-S29-003, T-S29-004, T-S29-005, T-S29-008, T-S29-009, and T-S29-012 are **non-negotiable** for Sprint 29. These represent the summary page completion (the highest user-facing priority), CTA closure, critical persistence fixes, beta validation, and the quality gate.

---

## 5. Spec Requirements Matrix

| Item | SPEC-PROD | SPEC-UX | SPEC-ARCH | Notes |
|------|-----------|---------|-----------|-------|
| T-S29-001 (Summary redesign) | SPEC-PROD-011 (S28, existing) | SPEC-UX-012 (S28, existing) | SPEC-ARCH-005 (S28, existing) | UI assembly of existing backend. No new specs needed |
| T-S29-002 (Next Steps) | SPEC-PROD-011 AC-009/010 | SPEC-UX-012 | Not needed | Engine exists, UI integration only |
| T-S29-003 (CTA integration) | SPEC-PROD-009 (S27, existing) | SPEC-UX-014 (S28, existing) | Not needed | Component exists, mechanical integration |
| T-S29-004 (Summary tests) | SPEC-PROD-011 | Not needed | Not needed | Test task |
| T-S29-005 (Phase revisit) | SPEC-PROD-001 | Not needed | Not needed | Bug fix, third carry |
| T-S29-006 (Map pin) | SPEC-PROD-012 AC-007-011 | SPEC-UX-013/015 | SPEC-ARCH-004 | Migration + UI work, covered by S28 specs |
| T-S29-007 (Auto-save) | SPEC-PROD-TRANSPORT | Not needed | Not needed | UX fix |
| T-S29-008 (Profile name) | Not needed (XS) | Not needed | Not needed | Bug fix |
| T-S29-009 (Beta validation) | **SPEC-PROD-013** (new) | Not needed | Not needed | Validation spec, not feature spec |
| T-S29-010 (Shareable link) | **SPEC-PROD-014** (new) | Needed (minimal) | Needed (minimal) | New feature, S-sized |
| T-S29-011 (Trip duplication) | **SPEC-PROD-015** (new) | Not needed | Not needed | New feature, XS-sized |
| T-S29-012 (Manual tests) | N/A | N/A | N/A | Quality gate |

### New Specs Required for Sprint 29

| Spec ID | Title | Owner | Priority | Size |
|---------|-------|-------|----------|------|
| SPEC-PROD-013 | Beta Onboarding Flow Validation | product-owner | P1 | XS |
| SPEC-PROD-014 | Shareable Trip Summary Link | product-owner | P2 | S |
| SPEC-PROD-015 | Trip Duplication from Summary | product-owner | P2 | XS |

---

## 6. Task Breakdown

### P0 -- Summary Page Completion

---

#### T-S29-001: Summary page card-based redesign
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-011 AC-004, AC-005, AC-011, AC-012
- **Description**: Integrate the existing TripCountdown component and TripReadinessService into ExpeditionSummary.tsx. Replace the current text-based summary with a card-based layout showing 6 phase cards. Each card displays: phase name, icon (matching progress bar), completion status badge (complete/partial/not_started), key data summary, and "Edit"/"Editar" action linking to the phase. Add destination-themed header (gradient based on trip classification). Add readiness percentage indicator at top. Add "View Summary" button on dashboard trip cards for completed/in-progress trips (AC-013, AC-014, AC-015).
- **Acceptance**: 6 phase cards render with correct data from each phase. TripCountdown shows correct state (future/in-progress/past). TripReadinessService percentage displayed. Completion status badges visible. Edit actions navigate to correct phases. Dashboard trip card shows "View Summary" for in-progress/completed trips. Card layout responsive (stacked mobile, grid desktop). All text localized PT-BR + EN.
- **Est**: 5h
- **Dependencies**: TripCountdown and TripReadinessService must exist (confirmed from Sprint 28)
- **Day**: Day 1-2

#### T-S29-002: Next Steps integration into summary page
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-011 AC-009, AC-010
- **Description**: Wire the existing NextStepsEngine output into the summary page UI. Render 1-3 suggestion cards in a "Next Steps" / "Proximos Passos" section below the phase cards. Each suggestion card shows: icon, descriptive label, and click-through link to the relevant screen. Suggestions are contextually generated by NextStepsEngine based on trip state (incomplete phases, approaching dates, missing data).
- **Acceptance**: 1-3 suggestion cards render dynamically. Suggestions change based on trip state. Each suggestion is clickable and navigates to the correct screen. Empty trip shows "Start planning" suggestion. All text localized PT-BR + EN. Accessible labels on suggestion cards.
- **Est**: 2h
- **Dependencies**: T-S29-001 (summary page must be card-based first)
- **Day**: Day 2

#### T-S29-003: WizardFooter CTA integration across Phase 1-6 + tests
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-009 AC-004-014
- **Description**: Replace ad-hoc button implementations in Phase 1-6 wizards with the existing WizardFooter component. Phase-specific label adjustments: Phase 1-2 use "Continue"/"Continuar", Phase 3/5/6 AI phases use "Generate [Type]"/"Gerar [Tipo]" as primary, Phase 4 sub-steps use "Save"/"Salvar" within sub-sections. Ensure: sticky positioning, loading state on async actions, disabled state with visual feedback, keyboard accessibility (Tab order, Enter/Space), no hardcoded colors. Write tests: WizardFooter in each phase wizard context (at least 1 test per phase = 6 tests, plus 6 component tests for WizardFooter itself = 12 minimum).
- **Acceptance**: All 6 phase wizards use WizardFooter. Consistent button placement and styling. Loading states on all async actions. aria-disabled on disabled buttons. Screen reader labels include phase context. >= 12 new tests. No hardcoded color values.
- **Est**: 3h
- **Dependencies**: WizardFooter component must exist (confirmed from Sprint 28)
- **Day**: Day 1-2

#### T-S29-004: Summary page tests
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-011
- **Description**: Comprehensive tests for the summary page integration: (a) TripCountdown rendering (future/in-progress/past dates, i18n), (b) TripReadinessService percentage calculation (weights, edge cases, BOLA), (c) card layout (6 phase cards render, completion badges, edit CTAs), (d) NextStepsEngine integration (suggestion generation, empty trip, full trip), (e) dashboard "View Summary" button (renders for completed/in-progress, hidden for new trips), (f) accessibility (aria-labels, heading hierarchy, screen reader text).
- **Acceptance**: >= 80% coverage on ExpeditionSummary.tsx, TripCountdown, TripReadinessService, NextStepsEngine integration. All SPEC-PROD-011 ACs have test assertions. At least 20 new tests.
- **Est**: 3h
- **Dependencies**: T-S29-001, T-S29-002
- **Day**: Day 3

### P1 -- Deferred Fixes & Persistence

---

#### T-S29-005: Phase revisit shows previously saved data
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-001 (phase navigation, revisit)
- **Description**: When a user completes a phase and later revisits it, the form must pre-populate with saved data. This is the third carry of this item. Investigation scope: all 6 phase wizards. Root cause candidates: (a) wizard page server components do not pass saved data as props, (b) form `defaultValues` are hardcoded instead of using server data, (c) phase re-entry resets state. Fix: add data-fetching to each wizard's parent server component (page.tsx), pass saved trip data as props, use as form defaults. Test each phase individually.
- **Acceptance**: Complete Phase 1 -> advance to Phase 2 -> go back to Phase 1 -> all fields pre-populated with saved data. Verified for all 6 phases. Empty fields only when no data was previously saved. At least 6 new tests (1 per phase). No regression in phase advancement flow.
- **Est**: 4h
- **Dependencies**: None
- **Day**: Day 2-3

#### T-S29-006: Map pin coordinates (full implementation)
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-012 AC-007, AC-008, AC-009, AC-010, AC-011
- **Description**: Full map pin implementation: (a) Prisma migration adding destinationLat (Float?) and destinationLon (Float?) to Trip model, (b) update DestinationAutocomplete onSelect to persist lat/lon via createExpeditionAction or Phase 1 save, (c) update Meu Atlas map component to read coordinates from all user trips and render color-coded pins (blue=planning, gold=active, green=completed), (d) pin click shows tooltip with trip name + destination + dates + "View Trip" link, (e) auto-center map to fit all pins, (f) empty state when no trips have coordinates. Includes tests for coordinate persistence and pin rendering.
- **Acceptance**: Selecting a destination saves lat/lon to Trip. Meu Atlas map shows pins at correct locations. Pins color-coded by status (3 visually distinct states). Pin click shows tooltip and navigates to trip. Map auto-centers. Empty state renders when no coordinates. At least 8 new tests. No non-functional pins.
- **Est**: 5h
- **Dependencies**: Meu Atlas page must exist (confirmed from Sprint 28)
- **Day**: Day 3-4

#### T-S29-007: Phase 4 auto-save between steps
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-TRANSPORT
- **Description**: Implement auto-save for Phase 4 sub-steps (Transport, Accommodation, Mobility). When a user fills data in one sub-step and navigates to another, the current sub-step's data is saved automatically if modified (dirty check). On return, data is preserved. Brief visual confirmation of auto-save (toast or subtle indicator that disappears after 2s). Save only if form is valid (do not auto-save incomplete/invalid forms).
- **Acceptance**: Fill Transport form -> navigate to Accommodation -> navigate back to Transport -> data preserved. Auto-save triggers on sub-step change without user clicking "Save". No data loss between sub-step transitions. Auto-save indicator confirms the save. Invalid/incomplete forms are NOT auto-saved (no silent data corruption). At least 4 new tests.
- **Est**: 3h
- **Dependencies**: None
- **Day**: Day 4

#### T-S29-008: Profile name persistence fix
- **Assigned**: dev-fullstack-2
- **Spec ref**: No spec (XS, bug fix)
- **Description**: Root-cause and fix the profile name persistence issue. The `name` field is saved via `db.user.update` in `createExpeditionAction`. Investigation: (a) verify the save action writes correctly to the User table, (b) verify the read path fetches from the correct table/field, (c) check if session.user.name is stale after update (JWT not refreshed -- most likely cause). If JWT staleness: trigger session refresh after name update. Verify name appears correctly in: UserMenu dropdown, profile page, expedition summary.
- **Acceptance**: Save name in profile form -> name persists across page reloads. Name persists across session restarts (logout/login). Name appears correctly in UserMenu, profile page, and expedition summary. At least 2 regression tests.
- **Est**: 2h
- **Dependencies**: None
- **Day**: Day 1

### P1 -- Beta Validation

---

#### T-S29-009: Beta onboarding flow validation
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared, 1.5h each)
- **Spec ref**: SPEC-PROD-013
- **Description**: End-to-end scripted validation of the complete beta user journey. Two scenarios: (A) Credentials registration: register with email/password -> complete profile (name, birthdate) -> create first trip -> complete Phases 1-3 -> view summary -> edit Phase 1 destination -> return to summary -> verify updated data. (B) Google OAuth: register with Google -> same flow. Document pass/fail per step. Fix any blockers found during validation (within the 3h budget). This is NOT a full manual test -- it is a targeted critical path validation.
- **Acceptance**: Both scenarios (credentials + Google) complete end-to-end without errors. Summary shows correct data after edit. No dead ends or error screens in the flow. All fixes (if any) are committed with tests. Pass/fail documented in `docs/test-results/beta-onboarding-validation-s29.md`.
- **Est**: 3h
- **Dependencies**: T-S29-001, T-S29-005 (summary and phase revisit must be working)
- **Day**: Day 4-5

### P2 -- New Value

---

#### T-S29-010: Shareable trip summary link
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-014
- **Description**: Enable travelers to generate a unique, read-only URL that shares their trip summary with anyone (no authentication required). Implementation: (a) generate a UUID-based share token and store it on the Trip record (new `shareToken` field), (b) create a public route `/share/[token]` that renders a read-only version of the summary page (no edit actions, no gamification data, no PII beyond trip destination/dates), (c) add a "Share" / "Compartilhar" button on the summary page that generates the token (if not already generated) and copies the URL to clipboard. Token can be revoked by the trip owner.
- **Acceptance**: "Share" button on summary page generates a link. Link opens a read-only summary (no login required). Shared view shows: destination, dates, countdown, phase summaries (without sensitive booking codes). No edit actions visible. Trip owner can revoke the link. At least 6 new tests (token generation, public route rendering, BOLA on revoke, no PII exposure).
- **Est**: 3h
- **Dependencies**: T-S29-001 (summary page must be card-based)
- **Day**: Day 4

#### T-S29-011: Trip duplication from summary
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-015
- **Description**: Add a "Plan a similar trip" / "Planejar viagem similar" button on the summary page for completed trips. Clicking it creates a new Trip pre-populated with: same destination (and coordinates), same travel style preferences, same passenger count. Does NOT copy: dates, transport bookings, accommodation bookings, checklist items, itinerary. The new trip starts at Phase 1 with pre-filled destination. Awards gamification points for trip creation (existing PointsEngine logic).
- **Acceptance**: "Plan similar trip" button visible on completed trip summaries. New trip created with destination + preferences + passengers pre-populated. Dates are blank (user must set new dates). No booking data copied. New trip appears in Expeditions list. Gamification points awarded. At least 4 new tests.
- **Est**: 2h
- **Dependencies**: T-S29-001 (summary page must be done)
- **Day**: Day 5

### Mandatory Quality Gate

---

#### T-S29-012: Manual test full re-run
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: N/A
- **Description**: Full re-run of manual test scenarios post-Sprint 29. Focus areas: (a) navigation restructure flows (Expeditions, Meu Atlas, breadcrumbs), (b) summary page (cards, countdown, readiness, next steps, edit, View Summary from dashboard), (c) CTA buttons across all 6 phases (WizardFooter rendering, loading states, disabled states), (d) map pins (coordinate persistence, pin rendering, tooltip, color-coding), (e) phase revisit (all 6 phases pre-populate saved data), (f) profile name persistence, (g) Phase 4 auto-save. Target: >= 95% pass rate on all scenarios.
- **Acceptance**: All manual test scenarios executed and documented. Pass rate >= 95%. Any failures documented with severity and linked to Sprint 30 backlog. Results in `docs/test-results/manual-test-sprint-29.md`.
- **Est**: 3h
- **Dependencies**: All other tasks complete
- **Day**: Day 5

---

## 7. Dependency Map

```
Independent (can start Day 1):
  T-S29-003 (CTA integration -- WizardFooter exists)
  T-S29-008 (Profile name fix)

Sequential chains:
  T-S29-001 (summary redesign) --> T-S29-002 (next steps) --> T-S29-004 (summary tests)
  T-S29-001 --> T-S29-010 (shareable link)
  T-S29-001 --> T-S29-011 (trip duplication)

  T-S29-005 (phase revisit) -- independent, Day 2-3
  T-S29-006 (map pins) -- independent, Day 3-4
  T-S29-007 (auto-save) -- independent, Day 4

  T-S29-001 + T-S29-005 --> T-S29-009 (beta validation)

  ALL --> T-S29-012 (manual tests)

Parallelization:
  dev-fullstack-1 (summary + next steps + tests + shareable + duplication)
  dev-fullstack-2 (CTA integration + profile fix + phase revisit + map pins + auto-save)
```

---

## 8. Dev Assignment Summary

### dev-fullstack-1 (~21h)

| Task | Item | Hours | Days |
|------|------|-------|------|
| T-S29-001 | Summary page card-based redesign | 5h | Day 1-2 |
| T-S29-002 | Next Steps integration | 2h | Day 2 |
| T-S29-004 | Summary page tests | 3h | Day 3 |
| T-S29-010 | Shareable trip summary link | 3h | Day 4 |
| T-S29-011 | Trip duplication from summary | 2h | Day 5 |
| T-S29-009 | Beta onboarding validation (shared) | 1.5h | Day 4-5 |
| T-S29-012 | Manual test re-run (shared) | 1.5h | Day 5 |
| **Total** | | **18h** | |

### dev-fullstack-2 (~20h)

| Task | Item | Hours | Days |
|------|------|-------|------|
| T-S29-008 | Profile name persistence fix | 2h | Day 1 |
| T-S29-003 | WizardFooter CTA integration + tests | 3h | Day 1-2 |
| T-S29-005 | Phase revisit shows saved data | 4h | Day 2-3 |
| T-S29-006 | Map pin coordinates full implementation | 5h | Day 3-4 |
| T-S29-007 | Phase 4 auto-save | 3h | Day 4 |
| T-S29-009 | Beta onboarding validation (shared) | 1.5h | Day 4-5 |
| T-S29-012 | Manual test re-run (shared) | 1.5h | Day 5 |
| **Total** | | **20h** | |

### Capacity Analysis

- dev-fullstack-1: 18h committed against 22.5h available (4.5h/day x 5 days). Buffer: 4.5h.
- dev-fullstack-2: 20h committed against 22.5h available. Buffer: 2.5h.
- Combined buffer: 7h (16% of 45h budget). Healthier than Sprint 28.

---

## 9. Execution Plan (Day-by-Day)

### Day 1 (~9h total)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | T-S29-001: Summary page card-based redesign (start) | 4.5h | Largest task. Integrate TripCountdown + TripReadinessService. Begin card layout. |
| dev-fullstack-2 | T-S29-008: Profile name persistence fix | 2h | Quick fix. Build momentum. |
| dev-fullstack-2 | T-S29-003: WizardFooter CTA integration (start) | 2.5h | Begin replacing ad-hoc buttons in Phase 1-3. |

**End of Day 1**: Profile name fixed. CTA integration started (3 phases). Summary redesign in progress.

### Day 2 (~9h total)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | T-S29-001: Summary page card-based redesign (finish) | 0.5h | Complete remaining card + dashboard button work. |
| dev-fullstack-1 | T-S29-002: Next Steps integration | 2h | Wire NextStepsEngine into summary. |
| dev-fullstack-1 | Buffer / polish | 2h | Summary page polish, edge cases. |
| dev-fullstack-2 | T-S29-003: WizardFooter CTA integration (finish) | 0.5h | Complete Phase 4-6 + write tests. |
| dev-fullstack-2 | T-S29-005: Phase revisit (start) | 4h | Begin investigation across all 6 phases. |

**End of Day 2**: Summary page complete with Next Steps. CTA integration done. Phase revisit investigation underway.

### Day 3 (~9h total)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | T-S29-004: Summary page tests | 3h | Comprehensive tests for summary + countdown + readiness + next steps. |
| dev-fullstack-1 | Buffer | 1.5h | Address any test failures or edge cases. |
| dev-fullstack-2 | T-S29-005: Phase revisit (finish if started Day 2) | 0h-1h | Wrap up if needed. |
| dev-fullstack-2 | T-S29-006: Map pin coordinates (start) | 4h | Prisma migration + coordinate persistence + begin map rendering. |

**End of Day 3**: Summary tests done. Phase revisit done. Map pin migration + persistence done.

### Day 4 (~9h total)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | T-S29-010: Shareable trip summary link | 3h | Share token + public route + copy-to-clipboard UI. |
| dev-fullstack-1 | T-S29-009: Beta onboarding validation (start) | 1.5h | Run credentials registration flow. |
| dev-fullstack-2 | T-S29-006: Map pin rendering + tests (finish) | 1h | Complete pin interactivity + tests. |
| dev-fullstack-2 | T-S29-007: Phase 4 auto-save | 3h | Dirty check + save on sub-step change + indicator. |

**End of Day 4**: Shareable link done. Map pins done. Auto-save done. Beta validation started.

### Day 5 (~9h total)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | T-S29-011: Trip duplication from summary | 2h | "Plan similar trip" button + pre-populated trip creation. |
| dev-fullstack-1 | T-S29-012: Manual test re-run (shared) | 1.5h | Summary, CTA, shareable link scenarios. |
| dev-fullstack-1 | Build + integration verification | 1h | npm run build + full test suite + lint. |
| dev-fullstack-2 | T-S29-009: Beta onboarding validation (finish) | 1.5h | Run Google OAuth flow. Document results. |
| dev-fullstack-2 | T-S29-012: Manual test re-run (shared) | 1.5h | Map pins, phase revisit, auto-save, profile scenarios. |
| dev-fullstack-2 | Build + PR prep | 1h | Final verification. |

**End of Day 5**: All tasks done. Build clean. Tests >= 1780. Beta validation documented. PR ready.

---

## 10. Test Strategy

### New Test Categories

| Area | Expected Tests | Coverage Target |
|------|---------------|-----------------|
| Summary page cards + layout | 8-10 | >= 80% |
| TripCountdown integration | 3-4 | >= 80% |
| TripReadinessService integration | 3-4 | >= 80% |
| NextStepsEngine UI integration | 3-4 | >= 80% |
| WizardFooter phase integration | 12 (2 per phase) | >= 80% |
| Phase revisit data loading | 6 (1 per phase) | >= 80% |
| Map pin / coordinates | 8-10 | >= 80% |
| Profile name persistence | 2-3 | Regression |
| Phase 4 auto-save | 4-5 | >= 80% |
| Shareable summary link | 6-8 | >= 80% |
| Trip duplication | 4-5 | >= 80% |
| **Total new tests** | **59-75** | |
| **Expected final count** | **~1780-1796** | |

---

## 11. Definition of Done (Sprint 29)

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes
- [ ] Commits use Conventional Commits with spec IDs and task IDs: `feat(SPEC-PROD-011): description [T-S29-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] No hardcoded colors -- use theme tokens
- [ ] redirect() calls are OUTSIDE try/catch blocks

### Sprint-Level DoD
- [ ] All 12 tasks marked complete (or sacrificed per sacrifice order)
- [ ] Code review approved by tech-lead
- [ ] Test count >= 1780 (target: ~1780-1796 from 1721 baseline)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] Security checklist passed for all PRs
- [ ] QA conformance audit against SPEC-PROD-009, SPEC-PROD-011, SPEC-PROD-012
- [ ] Manual test re-run (T-S29-012) completed with >= 95% pass rate
- [ ] Beta onboarding validation (T-S29-009) documented with pass/fail
- [ ] No spec drift detected
- [ ] All commits reference spec IDs
- [ ] Merged to master via PR -- no direct commits
- [ ] SPEC-STATUS.md updated with Sprint 29 entries
- [ ] Version bumped to v0.22.0
- [ ] Beta Launch GO/NO-GO decision documented

---

## 12. Beta Launch Readiness Checklist (Sprint 30 Gate)

After Sprint 29, the following must ALL be TRUE for Sprint 30 beta launch approval:

- [ ] All 14 recurring bugs from v0.19.0 confirmed resolved (Sprint 27) -- no regressions
- [ ] Navigation restructure live (Expeditions + Meu Atlas) -- Sprint 28
- [ ] Gamification header visible on all pages -- Sprint 28
- [ ] Summary page with cards, countdown, readiness, next steps, edit capability -- Sprint 29
- [ ] CTA buttons standardized across all 6 phases (WizardFooter) -- Sprint 29
- [ ] Map pins rendering on Meu Atlas page -- Sprint 29
- [ ] Phase revisit shows saved data across all 6 phases -- Sprint 29
- [ ] LGPD pages published -- Sprint 28
- [ ] Monitoring active (errors, uptime, AI usage) -- Sprint 28
- [ ] Manual test pass rate >= 95% -- Sprint 29
- [ ] Beta onboarding flow validated (credentials + Google OAuth) -- Sprint 29
- [ ] No P0 or P1 bugs open
- [ ] Staging environment matches production config
- [ ] Google AI free tier privacy disclosure in terms of use -- Sprint 28

If any item fails, Sprint 30 becomes "Beta Fix Sprint" and launch moves to Sprint 31.

---

## 13. Deferred to Sprint 30+

| Item | Est. | Reason for Deferral |
|------|------|---------------------|
| DnD Time Adjustment (SPEC-PROD-004) | 10h | Fourth carry. Both specs still Draft. Not beta-blocking. Post-beta feature |
| Dashboard Trip Card Redesign (SPEC-PROD-002 AC-002) | 6h | Post-beta UX improvement |
| US-122: Destination Chat AI (Premium) | 12h+ | Revenue feature. Requires GeminiProvider + payment gateway. Sprint 31+ |
| Full Observability Setup | 6h | Sprint 28 delivered minimum viable monitoring. Full after beta |
| Analytics Platform Integration (PostHog) | 8h | After beta launch when metrics priorities are clear |
| Map Pin Clustering | 2h | Post-beta optimization for power users |
| Accumulated tech debt (DEBT-S6-003, DEBT-S7-002, DEBT-S8-005) | 3-5h | Low severity, non-blocking |

---

## 14. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: Phase revisit (T-S29-005, 4h) is its third carry -- root cause may be deeper than estimated | Medium | High (trust-breaking UX) | Budget 4h (generous for a fix). If investigation reveals systemic issue across all 6 phases, fix Phases 1-3 (most used) in Sprint 29 and Phases 4-6 in Sprint 30. |
| R-002: Map pin implementation (T-S29-006, 5h) requires Prisma migration that may conflict | Low | Medium | Run migration first thing on Day 3. Test locally before pushing. Single migration file. |
| R-003: Shareable link (T-S29-010) introduces a public route -- security surface increase | Medium | High (PII exposure) | Strict data filtering on public route: no booking codes, no passenger PII, no profile data. Only trip destination, dates, phase summaries. Security-specialist review required. |
| R-004: Summary page integration (T-S29-001) has hidden complexity connecting existing services | Low | Medium | Services already exist and have tests. This is UI assembly, not new backend logic. Risk is CSS/layout, not data. |
| R-005: Beta validation (T-S29-009) discovers critical blockers consuming the buffer | Medium | Medium | 3h budget is for validation + minor fixes. If a critical blocker is found that requires > 2h to fix, document it and make it the P0 for Sprint 30 (beta becomes "fix sprint"). |
| R-006: WizardFooter integration (T-S29-003) breaks phase-specific behavior | Low | Medium | Each phase has existing tests. Run phase tests after each integration. Mechanical replacement with known component. |

---

## 15. Coordination Notes

### For tech-lead
- **Pre-sprint (Day 0)**: Verify SPEC-PROD-011 and SPEC-PROD-012 are Approved (required for T-S29-001 and T-S29-006). SPEC-PROD-009 must also be Approved for T-S29-003. Create SPEC-PROD-013/014/015 stubs if product-owner has not yet created them.
- **Day 1**: Verify profile name fix (T-S29-008) lands quickly -- it is the oldest deferred bug. Confirm WizardFooter component API is stable before integration starts.
- **Day 2**: Mid-check on summary page (T-S29-001). This is the highest user-facing priority. If delayed, it cascades to T-S29-002 and T-S29-004.
- **Day 3**: Phase revisit (T-S29-005) should be done or nearly done. If investigation is still ongoing, assess if the 4h estimate needs buffer.
- **Day 4**: Shareable link (T-S29-010) introduces a public route -- flag for security-specialist review. Beta validation should begin.
- **Day 5**: Final code review. Build + test gate. Manual test re-run. Beta GO/NO-GO documentation.

### For devs
- dev-fullstack-1: You own the summary page ecosystem (redesign + next steps + tests + shareable link + duplication). T-S29-001 is the foundation -- get the card layout right and the rest follows.
- dev-fullstack-2: You own persistence fixes (profile, phase revisit, auto-save) and structural work (CTA integration, map pins). Start with the quick profile fix to build momentum, then CTA integration, then the investigation-heavy items.
- BOTH: Run `npm run build` after completing each major task, not just at sprint end.
- BOTH: When touching Phase wizards (CTA integration, phase revisit), verify imports use `@/i18n/navigation`.
- BOTH: The shareable link (T-S29-010) creates a PUBLIC route. No PII, no booking codes, no gamification data on that route.

### For spec owners
- product-owner: Create SPEC-PROD-013 (Beta Onboarding Validation), SPEC-PROD-014 (Shareable Summary Link), SPEC-PROD-015 (Trip Duplication). SPEC-PROD-011, SPEC-PROD-012, and SPEC-PROD-009 need Approved status before sprint starts.
- security-specialist: Review T-S29-010 (shareable link) for PII exposure risk on the public route. Review T-S29-006 (map pins) for BOLA on pin click navigation.
- ux-designer: Minimal new UX work. Shareable link page layout should follow existing summary page patterns (cards, no edit actions). Trip duplication button placement on summary page.

---

> This backlog was prepared by the product-owner on 2026-03-12 based on: Sprint 28 plan and results, Sprint 28 deferred items list, SPEC-PROD-009/010/011/012, Beta Launch Readiness Checklist, and accumulated product context from Sprints 1-28.
