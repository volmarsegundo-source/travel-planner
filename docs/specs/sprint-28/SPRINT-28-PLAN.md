---
title: "Sprint 28 Plan"
sprint: 28
version: "v0.21.0"
budget_hours: "40-50h"
created: "2026-03-11"
author: tech-lead
---

# Sprint 28 Planning Document

**Version**: 1.0.0
**Author**: tech-lead
**Date**: 2026-03-11
**Budget**: 45h (5 working days, 2 devs at ~4.5h/day each)
**Baseline**: v0.20.0, 1662 tests, build clean, lint clean
**Process**: Spec-Driven Development (SDD) -- fourth sprint under SDD
**Test Target**: 1720+ (from 1662 baseline)
**Theme**: Structural Improvements -- navigation, summary, header gamification, CTA consistency

---

## 0. Sprint 27 Carryover Analysis

Sprint 27 completed v0.20.0 with focus on recurring bug fixes (Group A) and gamification header (Group B1). The following items were explicitly deferred to Sprint 28:

| Item | Source | Est. | Status |
|------|--------|------|--------|
| B2: Navigation restructure (Expeditions/Meu Atlas/Mapa) | Sprint 27 backlog | 10-14h | Deferred -- SPEC-PROD-008 + SPEC-ARCH-002 both Draft |
| B3: Map pin real-time updates | Sprint 27 backlog | 2h | Deferred -- pairs with navigation restructure |
| DnD time auto-adjustment | Sprint 26 carry | 12h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft -- DEFERRED again to Sprint 29 |
| Summary page enhancements | SPEC-PROD-007 Draft | 12-16h | New spec created in Sprint 27 |

**Decision**: DnD time auto-adjustment (SPEC-PROD-004 + SPEC-ARCH-001) is deferred to Sprint 29. Both specs remain in Draft status and the 12h estimate exceeds what we can fit alongside the navigation restructure. The 4 items planned for Sprint 28 total 34-42h, which fills the budget.

---

## 1. Prioritization and Scope

### Sprint 28 Items

| ID | Item | Priority | Est. (h) | Specs Required | Decision |
|----|------|----------|----------|----------------|----------|
| NEW-001 | Gamification score in header (polish/carry if incomplete in S27) | P1 | 6 | SPEC-PROD-006, SPEC-UX-007 | IN -- carry if needed, or polish |
| NEW-002 | Summary page with ALL journey data + edit capability | P1 | 14 | SPEC-PROD-007, SPEC-UX-011 (new) | IN |
| NEW-003 | Navigation restructure (Expeditions/Meu Atlas/Mapa) | P1 | 12 | SPEC-PROD-008, SPEC-UX-008, SPEC-ARCH-002 | IN |
| NEW-004 | Standardize ALL CTA buttons across phases | P1 | 5 | SPEC-PROD-009, SPEC-UX-009 | IN |
| FIX-001 | Profile name not persisting after save | P1 | 2 | -- (XS, covered by existing profile spec) | IN |
| FIX-002 | Map pin not appearing on destination selection | P1 | 2 | -- (XS, covered by SPEC-ARCH-002) | IN |
| FIX-003 | Phase 4 auto-save between steps | P2 | 3 | -- (S, covered by SPEC-PROD-TRANSPORT) | IN |
| FIX-004 | Phase revisit should show previously saved data | P2 | 4 | -- (S, covered by SPEC-PROD-001) | IN |

### Budget Summary

| Category | Hours |
|----------|-------|
| NEW features (NEW-001 through NEW-004) | 37h |
| Fixes (FIX-001 through FIX-004) | 11h |
| **Subtotal** | **48h** |
| Buffer / integration testing | 2h (included in budget) |
| **Total budget** | **50h max** |

**Risk note**: At 48h planned against a 50h budget, the margin is thin. Mitigation: FIX-003 and FIX-004 can be descoped to Sprint 29 if NEW-002 or NEW-003 expand beyond estimate. See Risk Register (Section 10).

---

## 2. SDD Spec Gate

### Specs Required (new for Sprint 28)

| Spec ID | Title | Owner | Status | Sprint 28 Items |
|---------|-------|-------|--------|-----------------|
| SPEC-PROD-010 | Summary Page Enhancement (product) | product-owner | Draft | NEW-002 |
| SPEC-PROD-011 | Navigation Restructure (product update) | product-owner | Draft | NEW-003 |
| SPEC-PROD-012 | CTA Button Standardization (product update) | product-owner | Draft | NEW-004 |
| SPEC-UX-011 | Summary Page Visual Spec | ux-designer | Draft | NEW-002 |
| SPEC-UX-012 | Navigation Restructure UX (update) | ux-designer | Draft | NEW-003 |
| SPEC-UX-013 | CTA Button Visual Spec (update) | ux-designer | Draft | NEW-004 |
| SPEC-UX-014 | Gamification Header Polish | ux-designer | Draft | NEW-001 |
| SPEC-UX-015 | Map Pin Interaction UX | ux-designer | Draft | FIX-002 |
| SPEC-ARCH-004 | Summary Page Data Architecture | architect | Draft | NEW-002 |
| SPEC-ARCH-005 | Navigation Route Architecture (update) | architect | Draft | NEW-003 |
| SPEC-ARCH-006 | Phase Auto-Save Architecture | architect | Draft | FIX-003 |

### Specs Reused (already approved or from Sprint 27)

| Spec ID | Items Covered |
|---------|---------------|
| SPEC-PROD-006 v1.0.0 | NEW-001 (gamification header, may need approval) |
| SPEC-PROD-007 v1.0.0 | NEW-002 (summary page -- Draft, needs approval) |
| SPEC-PROD-008 v1.0.0 | NEW-003 (navigation restructure -- Draft, needs approval) |
| SPEC-PROD-009 v1.0.0 | NEW-004 (CTA buttons -- Draft, needs approval) |
| SPEC-UX-007 v1.0.0 | NEW-001 (gamification header visual -- Draft from S27) |
| SPEC-UX-008 v1.0.0 | NEW-003 (navigation UX -- Draft from S27) |
| SPEC-UX-009 v1.0.0 | NEW-004 (CTA UX -- Draft from S27) |
| SPEC-ARCH-002 v1.0.0 | NEW-003 (navigation architecture -- Draft from S27) |
| SPEC-PROD-001 v1.1.0 | FIX-004 (phase revisit) |
| SPEC-PROD-TRANSPORT (legacy) | FIX-003 (Phase 4 auto-save) |

### SDD Approval Strategy

Many specs from Sprint 27 are already in Draft. The strategy for Sprint 28 is:

1. **Reuse and approve existing S27 Draft specs** where possible (SPEC-PROD-006/007/008/009, SPEC-UX-007/008/009, SPEC-ARCH-002). These already capture the product intent and need review, not rewriting.
2. **Create new specs** only for aspects not covered by existing Drafts (SPEC-PROD-010/011/012 as product updates, SPEC-UX-011/012/013/014/015, SPEC-ARCH-004/005/006).
3. **XS exceptions**: FIX-001, FIX-002, FIX-004 fall under SDD XS exception (bug fixes under 2h covered by existing specs).
4. **FIX-003 (3h)**: Size S, needs at minimum SPEC-ARCH-006 for the auto-save pattern.

### Spec Approval Priority (to unblock development)

| Priority | Specs | Deadline | Unblocks |
|----------|-------|----------|----------|
| Critical | SPEC-PROD-008, SPEC-UX-008, SPEC-ARCH-002 (nav restructure) | Pre-sprint | NEW-003 (Day 1) |
| Critical | SPEC-PROD-007, SPEC-UX-011, SPEC-ARCH-004 (summary page) | Pre-sprint | NEW-002 (Day 1) |
| High | SPEC-PROD-009, SPEC-UX-009 (CTA buttons) | Day 2 | NEW-004 (Day 3) |
| Medium | SPEC-PROD-006, SPEC-UX-007 (gamification header) | Day 2 | NEW-001 (Day 3) |
| Medium | SPEC-ARCH-006 (auto-save) | Day 3 | FIX-003 (Day 4) |

---

## 3. Task Breakdown

### FIXES -- Group F (P1-P2, 11h total)

---

#### TASK-28-001: Profile name persistence fix
- **Assigned**: dev-fullstack-2
- **Spec ref**: -- (XS, profile data flow investigation)
- **Description**: Root-cause why profile name does not persist after save. The `name` field is saved via `db.user.update` in `createExpeditionAction` (separate from `PROFILE_FIELD_POINTS`). Investigate: (a) is the save action writing correctly, (b) is the read path fetching from the correct table/field, (c) is session.user.name stale after update (JWT not refreshed). Fix the data flow end to end.
- **Acceptance**: User saves name in profile form -> name persists across page reloads and session restarts. Name appears correctly in: UserMenu dropdown, profile page, expedition summary.
- **Est**: 2h
- **Dependencies**: None
- **Day**: Day 1

#### TASK-28-002: Map pin on destination selection
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-008 AC-007/008/009, SPEC-UX-015
- **Description**: When a user selects a destination in Phase 1 (via DestinationAutocomplete), the map pin on the dashboard should update to show that destination. Root-cause: either (a) destination coordinates (lat/lon) are not being persisted to the Trip record, or (b) the dashboard map component is not reading the latest coordinates. Fix requires ensuring `destinationLat`/`destinationLon` are saved when destination is selected (SPEC-ARCH-002 Section 3.5 documents this schema change), and the map component reads them.
- **Acceptance**: Select a destination in Phase 1 -> dashboard map shows a pin at that location. Pin visible immediately after returning to dashboard (no manual refresh needed). If no coordinates available, no pin shown (graceful degradation).
- **Est**: 2h
- **Dependencies**: Trip model must have destinationLat/destinationLon fields (SPEC-ARCH-002). If migration not yet applied, include it.
- **Day**: Day 1

#### TASK-28-003: Phase 4 auto-save between steps
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-TRANSPORT, SPEC-ARCH-006
- **Description**: Phase 4 wizard has 3 sub-steps (Transport, Accommodation, Mobility). When a user fills Transport data and moves to Accommodation, the Transport data should be auto-saved. Currently, data may be lost if the user navigates between sub-steps without explicitly clicking "Save". Implement auto-save: when leaving a sub-step, trigger a save action for that sub-step's data if it has been modified (dirty check).
- **Acceptance**: Fill Transport form -> navigate to Accommodation -> navigate back to Transport -> data is preserved. Auto-save triggers on sub-step change without user clicking "Save". No data loss between sub-step transitions. Save indicator (brief toast or visual cue) confirms auto-save.
- **Est**: 3h
- **Dependencies**: SPEC-ARCH-006 approved
- **Day**: Day 4

#### TASK-28-004: Phase revisit shows previously saved data
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-001 (phase navigation, revisit)
- **Description**: When a user completes Phase 1 and advances to Phase 2, then revisits Phase 1, the form should show the previously saved data (destination, dates, traveler info), not empty fields. Investigate all phase wizards (1-6) and ensure each one loads persisted data on mount. This may require adding data-fetching logic to wizard page server components that pass saved data as props.
- **Acceptance**: Complete Phase 1 -> advance to Phase 2 -> go back to Phase 1 -> all fields pre-populated with saved data. Works for all phases that have previously saved data. Empty fields only when no data was saved for that field.
- **Est**: 4h
- **Dependencies**: None
- **Day**: Day 4-5

#### TASK-28-005: Fixes test suite
- **Assigned**: dev-fullstack-2
- **Spec ref**: All fix specs
- **Description**: Tests for TASK-28-001 (name persistence), TASK-28-002 (map pin), TASK-28-003 (auto-save), TASK-28-004 (phase revisit data loading). Focus on: data persistence assertions, coordinate storage, auto-save trigger on navigation, form pre-population from server data.
- **Acceptance**: >= 80% coverage on modified service/component files. Regression tests prevent reintroduction of each bug. At least 15 new tests across all 4 fixes.
- **Est**: included in each fix estimate (not separate)
- **Dependencies**: TASK-28-001 through TASK-28-004

---

### NEW-001 -- Gamification Header (6h)

---

#### TASK-28-006: Gamification header -- backend data endpoint (carry/polish)
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-006 (AC-001, AC-005, AC-008, AC-009, AC-010)
- **Description**: If not completed in Sprint 27: create a server-side function returning compact gamification data for header (points, levelName, levelProgress). If completed in Sprint 27: polish and verify all ACs pass. Must use authenticated session (BOLA). Must return initial state for new users (0 pts, "Explorer" rank).
- **Acceptance**: Function returns { points, levelName, levelProgress } for authenticated user. BOLA enforced. New user returns { points: 0, levelName: "Explorer", levelProgress: 0 }. Responds in < 500ms. No PII logged.
- **Est**: 2h (carry) or 1h (polish)
- **Dependencies**: SPEC-PROD-006 approved
- **Day**: Day 3

#### TASK-28-007: Gamification header -- UI component (carry/polish)
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-006 (AC-001-010), SPEC-UX-007, SPEC-UX-014
- **Description**: If not completed in Sprint 27: build the compact gamification indicator for AuthenticatedNavbar. If completed: polish per SPEC-UX-014 feedback. Display points + level name. Clickable (navigates to gamification profile / Meu Atlas page). Skeleton loading state (AC-008). Mobile responsive (AC-004). Real-time update after point-earning actions. Level-up visual cue respects `prefers-reduced-motion`.
- **Acceptance**: Indicator visible on all authenticated pages. Points and level display correctly. Click navigates to gamification profile. Skeleton shown during load. Mobile layout adapts. Points update after earning without page reload.
- **Est**: 2.5h (carry) or 1h (polish)
- **Dependencies**: TASK-28-006, SPEC-UX-007 approved
- **Day**: Day 3

#### TASK-28-008: Gamification header tests (carry/polish)
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-006
- **Description**: Tests for gamification header: data function (BOLA, new user default, point/level calculation), UI component (render states, skeleton, click navigation, accessibility label, mobile rendering). Integration: point award triggers header update.
- **Acceptance**: >= 80% coverage on header data function and component. All SPEC-PROD-006 ACs have test assertions. BOLA test included.
- **Est**: 1.5h (carry) or 0.5h (polish)
- **Dependencies**: TASK-28-006, TASK-28-007
- **Day**: Day 3

---

### NEW-002 -- Summary Page Enhancement (14h)

---

#### TASK-28-009: Trip readiness calculation service
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-003, SPEC-PROD-010, SPEC-ARCH-004
- **Description**: Create a server-side function `calculateTripReadiness(tripId, userId)` that computes an overall preparation percentage: phases completed (40%), checklist completion (30%), transport booked (15%), accommodation booked (15%). Returns per-phase completion status (complete/partial/not_started). Must be server-side computation (not client). BOLA: must verify trip ownership.
- **Acceptance**: Returns { readinessPercent, phases: [{phase, status, dataSnapshot}] }. Weights correctly applied. BOLA enforced. Responds in < 500ms. Handles edge cases: no checklist data, no transport, new trip with no phases.
- **Est**: 3h
- **Dependencies**: SPEC-PROD-007 + SPEC-ARCH-004 approved
- **Day**: Day 1

#### TASK-28-010: Trip countdown component
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-001, AC-002
- **Description**: Create a `TripCountdown` component that displays days until trip start. Formats: "X days until your trip" / "X dias para sua viagem" (future), "Trip in progress" / "Viagem em andamento" (current), "Trip completed on [date]" / "Viagem concluida em [date]" (past). Visually prominent (large typography, top of summary page). Localized PT-BR + EN.
- **Acceptance**: Correct countdown for future trips. Correct "in progress" for ongoing trips. Correct "completed" for past trips. i18n works in both locales. Accessible label for screen readers.
- **Est**: 1.5h
- **Dependencies**: None
- **Day**: Day 1

#### TASK-28-011: Summary page card-based redesign
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-004, AC-005, AC-008, AC-009, SPEC-UX-011
- **Description**: Redesign the summary page layout from text list to card-based layout. Each of the 6 phase cards shows: phase name, phase icon (matching progress bar icons), completion status badge (complete/partial/not_started), key data summary. Per-phase calls-to-action for incomplete phases ("Complete this section" -> links to that phase). Destination-themed header (gradient/icon based on trip classification). Readiness percentage indicator at top.
- **Acceptance**: 6 phase cards with consistent styling. Completion status badges visible. CTAs link to correct phases. Readiness percentage displayed and accessible. Destination-themed header renders. Card layout responsive (stacked on mobile, grid on desktop).
- **Est**: 5h
- **Dependencies**: TASK-28-009, SPEC-UX-011 approved
- **Day**: Day 2-3

#### TASK-28-012: Next Steps suggestions engine
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007 AC-006, AC-007
- **Description**: Create a `getNextStepsSuggestions(tripData)` function that dynamically generates 1-3 actionable suggestions based on trip state. Logic: prioritize incomplete/high-impact items. Examples: "Complete your checklist (5/12 done)", "Add accommodation details", "Your trip is in 15 days -- review your itinerary". Each suggestion is clickable and navigates to the relevant screen. Localized PT-BR + EN.
- **Acceptance**: Returns 1-3 suggestions. Suggestions are contextually relevant (not generic). Each suggestion has a label, target URL, and priority. Empty trip returns "Start planning" suggestion. All suggestions localized.
- **Est**: 2h
- **Dependencies**: TASK-28-009
- **Day**: Day 3

#### TASK-28-013: Summary page tests
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-007, SPEC-PROD-010
- **Description**: Tests for: readiness calculation (weights, edge cases, BOLA), countdown component (future/current/past dates, i18n), card layout (6 phase cards render, completion badges, CTAs), next steps engine (suggestion generation, empty trip, full trip). Integration: summary page renders complete data for a fully planned trip.
- **Acceptance**: >= 80% coverage on readiness service, countdown component, summary page, next steps engine. All SPEC-PROD-007 ACs have test assertions. At least 25 new tests.
- **Est**: 2.5h
- **Dependencies**: TASK-28-009 through TASK-28-012
- **Day**: Day 4

---

### NEW-003 -- Navigation Restructure (12h)

---

#### TASK-28-014: Route architecture -- /expeditions and /atlas pages
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-008 AC-001, AC-005, SPEC-ARCH-002, SPEC-ARCH-005
- **Description**: Create two new page routes: (a) `/expeditions` -- server component that renders expedition cards (extract from current dashboard, no map). (b) `/atlas` -- server component that renders the Meu Atlas gamification/explorer profile page (badges, points, level, completion history per SPEC-PROD-008 AC-004). Add redirect from `/dashboard` to `/expeditions` for backward compatibility. Create `ExpeditionsList` client component (extraction from current AtlasDashboard -- cards only). Create `AtlasProfilePage` component.
- **Acceptance**: `/expeditions` renders trip cards. `/atlas` renders gamification profile with badges, points, level, and expedition history. `/dashboard` redirects to `/expeditions`. Both pages load in < 2s. New users on `/atlas` see "Start your first expedition" prompt (AC-006).
- **Est**: 5h
- **Dependencies**: SPEC-PROD-008 + SPEC-ARCH-002 + SPEC-ARCH-005 approved
- **Day**: Day 1-2

#### TASK-28-015: Navbar restructure -- Expeditions + Meu Atlas + Meu Perfil
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-008 AC-001, AC-002, AC-003, AC-010, AC-011, SPEC-UX-008, SPEC-UX-012
- **Description**: Update `AuthenticatedNavbar.tsx` to show three nav items: "Expeditions" (`/expeditions`), "Meu Atlas" (`/atlas`), "Meu Perfil" (`/profile`). Replace "Minhas Viagens" label with "Expedicoes"/"Expeditions". Active state highlights correct item based on current path. Mobile hamburger menu shows all three items with "Expeditions" first. Compact gamification indicator next to "Meu Atlas" in mobile menu (AC-011).
- **Acceptance**: Three nav items visible on desktop. Active state correct on all routes. Mobile menu shows all three with gamification preview. Label "Minhas Viagens" fully removed. i18n: both PT-BR and EN labels correct. Keyboard navigable with focus indicators.
- **Est**: 3h
- **Dependencies**: TASK-28-014 (routes must exist), SPEC-UX-008 approved
- **Day**: Day 2-3

#### TASK-28-016: Coordinate persistence and map pin
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-ARCH-002 Section 3.5, SPEC-PROD-008 AC-007/008/009
- **Description**: Add `destinationLat` and `destinationLon` Float? fields to Trip model (if not already added in TASK-28-002). Update `createExpeditionAction` and Phase 1 destination selection to persist lat/lon from DestinationAutocomplete's `onSelect` callback. Update the atlas/dashboard map to read these coordinates for pin placement. Resolve the non-functional map pin: either make it interactive (click navigates to Phase 5 guide) or remove decorative pin per AC-008/009.
- **Acceptance**: Selecting a destination saves coordinates to Trip. Map pin appears at correct location. Pin click navigates to Phase 5 guide (if interactive). No non-functional/decorative pins remain.
- **Est**: 2h (partially overlaps with TASK-28-002, coordinate accordingly)
- **Dependencies**: TASK-28-014
- **Day**: Day 3

#### TASK-28-017: Navigation restructure tests
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-008, SPEC-ARCH-002
- **Description**: Tests for: route rendering (/expeditions, /atlas, /dashboard redirect), navbar active state logic, navigation between pages, mobile menu rendering, ExpeditionsList component, AtlasProfilePage component, coordinate persistence, map pin rendering.
- **Acceptance**: >= 80% coverage on new page components and navbar changes. Route redirect tested. Active state logic tested for all three routes. At least 20 new tests.
- **Est**: 2h
- **Dependencies**: TASK-28-014 through TASK-28-016
- **Day**: Day 4

---

### NEW-004 -- CTA Button Standardization (5h)

---

#### TASK-28-018: CTA audit and shared component
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-009 AC-001-010, SPEC-UX-013
- **Description**: Audit all 6 phase wizards for CTA inconsistencies. Create a shared `WizardFooter` component that renders: Back button (left, secondary style), Primary CTA (right, filled/prominent), optional secondary actions (center, text-only). The component handles: loading state on primary CTA, disabled state with visual feedback (AC-011/012), consistent height and positioning (sticky footer, AC-004/005). Labels follow the standardized convention: "Continue"/"Continuar" for phase advancement, "Save"/"Salvar" for sub-step saves, "Generate [Type]"/"Gerar [Tipo]" for AI actions, "Complete Expedition"/"Concluir Expedicao" for Phase 6.
- **Acceptance**: `WizardFooter` component created with all variants. Props: { onBack, onPrimary, primaryLabel, isLoading, isDisabled, secondaryActions? }. Sticky positioning. Visual hierarchy (primary > secondary > tertiary). Disabled state feedback. All labels i18n.
- **Est**: 2h
- **Dependencies**: SPEC-PROD-009 + SPEC-UX-009 approved
- **Day**: Day 4

#### TASK-28-019: CTA integration across all phases
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-009 AC-004-014
- **Description**: Replace ad-hoc button implementations in Phase 1-6 wizards with the `WizardFooter` component. Phase-specific adjustments: Phase 4 sub-steps use "Save" CTA within sub-sections and "Continue" at phase level (AC-013). AI generation phases (3, 5, 6) use "Generate [Type]" as primary and "Continue" as secondary after generation (AC-014). Ensure all CTAs use theme tokens (no hardcoded colors). Verify keyboard accessibility (Tab order, Enter/Space).
- **Acceptance**: All 6 phase wizards use `WizardFooter`. Consistent button placement, styling, and behavior. Loading states on all async actions. No hardcoded color values. `aria-disabled` on disabled buttons. Screen reader labels include phase context.
- **Est**: 2h
- **Dependencies**: TASK-28-018
- **Day**: Day 4-5

#### TASK-28-020: CTA standardization tests
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-009
- **Description**: Tests for `WizardFooter` component (all variants, disabled state, loading state, keyboard interaction). Integration tests verifying each phase wizard renders WizardFooter with correct labels and behavior.
- **Acceptance**: >= 80% coverage on WizardFooter. Each phase wizard has at least one test asserting correct CTA rendering. At least 12 new tests.
- **Est**: 1h
- **Dependencies**: TASK-28-018, TASK-28-019
- **Day**: Day 5

---

### Cross-Cutting

---

#### TASK-28-021: i18n keys for all Sprint 28 features
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: All specs
- **Description**: Add all new i18n keys to `en.json` and `pt-BR.json` message files. Keys include: navigation labels (expeditions, myAtlas, myProfile), countdown strings, readiness labels, next steps suggestions, CTA labels, completion status labels, Atlas profile page content. Verify no hardcoded strings remain.
- **Acceptance**: All new UI text localized in both locales. `npm run i18n:check` passes clean. No hardcoded English or Portuguese strings in components.
- **Est**: included in each feature task (not separate)
- **Dependencies**: All feature tasks

#### TASK-28-022: Integration testing and build verification
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: All
- **Description**: Final integration verification. Run `npm run build` (catches stricter ESLint+TS than Vitest). Run full test suite. Verify test count >= 1720. Fix any integration issues. Run `npm run lint`. Prepare PR.
- **Est**: 2h (1h per dev)
- **Dependencies**: All other tasks complete
- **Day**: Day 5

---

## 4. Dependency Map

```
Independent (can start Day 1):
  TASK-28-001 (profile name fix)
  TASK-28-002 (map pin fix)
  TASK-28-009 (readiness service)
  TASK-28-010 (countdown component)
  TASK-28-014 (route architecture)

Sequential chains:
  TASK-28-009 --> TASK-28-011 (summary cards) --> TASK-28-012 (next steps)
  TASK-28-009 + TASK-28-010 + TASK-28-011 + TASK-28-012 --> TASK-28-013 (summary tests)

  TASK-28-014 --> TASK-28-015 (navbar restructure) --> TASK-28-016 (coordinates/pins)
  TASK-28-014 + TASK-28-015 + TASK-28-016 --> TASK-28-017 (nav tests)

  TASK-28-006 --> TASK-28-007 --> TASK-28-008 (gamification header chain)

  TASK-28-018 (CTA component) --> TASK-28-019 (CTA integration) --> TASK-28-020 (CTA tests)

  TASK-28-003 (auto-save) -- independent, Day 4
  TASK-28-004 (phase revisit) -- independent, Day 4-5

  ALL --> TASK-28-022 (integration)

Parallelization:
  dev-fullstack-1 (summary + header + CTA) || dev-fullstack-2 (fixes + navigation)
```

---

## 5. Dev Assignment Summary

### dev-fullstack-1 (25h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-28-009 | Trip readiness service | 3h | Day 1 |
| TASK-28-010 | Trip countdown component | 1.5h | Day 1 |
| TASK-28-011 | Summary page card redesign | 5h | Day 2-3 |
| TASK-28-012 | Next steps suggestions engine | 2h | Day 3 |
| TASK-28-006 | Gamification header backend (carry/polish) | 1-2h | Day 3 |
| TASK-28-007 | Gamification header UI (carry/polish) | 1-2.5h | Day 3 |
| TASK-28-008 | Gamification header tests (carry/polish) | 0.5-1.5h | Day 3 |
| TASK-28-013 | Summary page tests | 2.5h | Day 4 |
| TASK-28-018 | CTA shared component | 2h | Day 4 |
| TASK-28-019 | CTA integration across phases | 2h | Day 5 |
| TASK-28-020 | CTA tests | 1h | Day 5 |
| TASK-28-022 | Integration (shared) | 1h | Day 5 |
| **Total** | | **~23-25h** | |

### dev-fullstack-2 (23h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-28-001 | Profile name fix | 2h | Day 1 |
| TASK-28-002 | Map pin fix | 2h | Day 1 |
| TASK-28-014 | Route architecture (/expeditions, /atlas) | 5h | Day 1-2 |
| TASK-28-015 | Navbar restructure | 3h | Day 2-3 |
| TASK-28-016 | Coordinate persistence + map pin interaction | 2h | Day 3 |
| TASK-28-003 | Phase 4 auto-save | 3h | Day 4 |
| TASK-28-004 | Phase revisit data loading | 4h | Day 4-5 |
| TASK-28-017 | Navigation tests | 2h | Day 5 |
| TASK-28-022 | Integration (shared) | 1h | Day 5 |
| **Total** | | **24h** | |

**Note**: dev-fullstack-2 is at capacity (24h vs ~22.5h available at 4.5h/day). If FIX-003 or FIX-004 expand, descope to Sprint 29. dev-fullstack-1 has ~2h buffer from the gamification carry/polish variance.

---

## 6. Execution Plan (Day-by-Day)

### Day 1 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-28-009: Trip readiness service | 3h | Foundation for summary page. Start early. |
| dev-fullstack-1 | TASK-28-010: Trip countdown component | 1.5h | Self-contained, can finish Day 1. |
| dev-fullstack-2 | TASK-28-001: Profile name fix | 2h | Quick fix, unblocks verification. |
| dev-fullstack-2 | TASK-28-002: Map pin fix (initial) | 1h | Start investigation, coordinate with TASK-28-016. |
| dev-fullstack-2 | TASK-28-014: Route architecture (start) | 1.5h | Begin /expeditions page extraction. |

**End of Day 1**: Readiness service done. Countdown component done. Profile name fixed. Route architecture started.

### Day 2 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-28-011: Summary page card redesign (start) | 4.5h | Largest single task. Layout + 6 phase cards. |
| dev-fullstack-2 | TASK-28-014: Route architecture (finish) | 3.5h | Finish /expeditions + /atlas + redirect. |
| dev-fullstack-2 | TASK-28-015: Navbar restructure (start) | 1h | Begin navbar changes. |

**End of Day 2**: Summary page in progress. Both new routes functional. Navbar changes started.

### Day 3 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-28-011: Summary page card redesign (finish) | 0.5h | Complete remaining card work. |
| dev-fullstack-1 | TASK-28-012: Next steps engine | 2h | Suggestion logic. |
| dev-fullstack-1 | TASK-28-006/007/008: Gamification header (carry/polish) | 2h | Assess Sprint 27 state, polish or build. |
| dev-fullstack-2 | TASK-28-015: Navbar restructure (finish) | 2h | Complete navbar + mobile menu. |
| dev-fullstack-2 | TASK-28-016: Coordinates + map pin | 2h | Persistence + interactivity. |
| dev-fullstack-2 | TASK-28-002: Map pin fix (finish) | 0.5h | Verify pin shows after destination select. |

**End of Day 3**: Summary page complete (NEW-002 impl done). Gamification header done (NEW-001). Navigation restructure impl done (NEW-003 impl done). Map pin functional.

### Day 4 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-28-013: Summary page tests | 2.5h | Full test suite for summary. |
| dev-fullstack-1 | TASK-28-018: CTA shared component | 2h | WizardFooter component. |
| dev-fullstack-2 | TASK-28-003: Phase 4 auto-save | 3h | Dirty check + save on sub-step change. |
| dev-fullstack-2 | TASK-28-004: Phase revisit (start) | 1.5h | Begin data loading investigation. |

**End of Day 4**: Summary tests done. CTA component done. Auto-save done. Phase revisit in progress.

### Day 5 (9h total: ~4.5h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-28-019: CTA integration across phases | 2h | Wire WizardFooter to all 6 phases. |
| dev-fullstack-1 | TASK-28-020: CTA tests | 1h | Component + integration tests. |
| dev-fullstack-1 | TASK-28-022: Integration (shared) | 1h | npm run build + full test suite. |
| dev-fullstack-2 | TASK-28-004: Phase revisit (finish) | 2.5h | Complete all phase data loading. |
| dev-fullstack-2 | TASK-28-017: Navigation tests | 2h | Route, navbar, map tests. |
| dev-fullstack-2 | TASK-28-022: Integration (shared) | 1h | PR prep, final verification. |

**End of Day 5**: All tasks done. Build clean. Test count >= 1720. PR ready.

---

## 7. Item Completion Timeline

| Day | Items Completed | Running Test Count (est.) |
|-----|----------------|--------------------------|
| Day 1 | FIX-001 (profile name), readiness service, countdown component | ~1670 |
| Day 2 | Route architecture (/expeditions, /atlas), summary cards (partial) | ~1680 |
| Day 3 | NEW-002 (summary page), NEW-001 (gamification header), NEW-003 impl, FIX-002 (map pin) | ~1695 |
| Day 4 | Summary tests, CTA component, FIX-003 (auto-save) | ~1710 |
| Day 5 | NEW-004 (CTA integration), FIX-004 (phase revisit), nav tests, integration | ~1725 |

---

## 8. Test Strategy

### New Test Categories

| Area | Expected Tests | Coverage Target |
|------|---------------|-----------------|
| Trip readiness service | 8-10 | >= 80% |
| Countdown component | 5-6 | >= 80% |
| Summary page (cards, layout) | 10-12 | >= 80% |
| Next steps engine | 4-5 | >= 80% |
| WizardFooter component | 8-10 | >= 80% |
| CTA phase integration | 6 (1 per phase) | Smoke test per phase |
| Route rendering | 6-8 | >= 80% |
| Navbar restructure | 5-6 | >= 80% |
| Map pin / coordinates | 4-5 | >= 80% |
| Profile name fix | 2-3 | Regression |
| Auto-save | 3-4 | >= 80% |
| Phase revisit | 4-5 | >= 80% |
| **Total new tests** | **65-80** | |
| **Expected final count** | **~1725-1740** | |

### Manual Verification Protocol

Carrying forward the Sprint 27 lesson: for UI-layer changes (navigation, CTA positioning, map pins), unit tests are necessary but NOT sufficient. The following MANUAL-V checks are required:

#### MANUAL-V-S28-001: Navigation Structure
1. Navigate to `/dashboard` -> VERIFY: redirects to `/expeditions`.
2. Click "Expeditions" nav item -> VERIFY: trip cards render, no map.
3. Click "Meu Atlas" nav item -> VERIFY: gamification profile renders.
4. VERIFY: active nav item highlights correctly for each page.
5. Test on mobile (375px) -> VERIFY: hamburger menu shows all 3 items.

#### MANUAL-V-S28-002: Summary Page
1. Complete a trip (all 6 phases) -> navigate to summary.
2. VERIFY: 6 phase cards render with correct data.
3. VERIFY: Readiness percentage displays.
4. VERIFY: Countdown shows correct days.
5. VERIFY: "Next Steps" section shows relevant suggestions.
6. VERIFY: Incomplete phase shows "Complete this section" CTA.

#### MANUAL-V-S28-003: CTA Consistency
1. Navigate through Phase 1 to Phase 6.
2. VERIFY: All phases use sticky footer with Back (left) and Primary CTA (right).
3. VERIFY: Loading spinner on all async CTAs.
4. VERIFY: Disabled state is visually distinct, click shows feedback.
5. VERIFY: Labels follow standardized convention.

#### MANUAL-V-S28-004: Profile Name Persistence
1. Set name in profile form -> save.
2. Refresh page -> VERIFY: name still shows.
3. Log out and log in -> VERIFY: name persists.

#### MANUAL-V-S28-005: Map Pin
1. Create new trip, select destination.
2. Navigate to dashboard/atlas.
3. VERIFY: Pin appears at destination location.

#### MANUAL-V-S28-006: Phase Revisit
1. Complete Phase 1, advance to Phase 2.
2. Go back to Phase 1.
3. VERIFY: All previously entered data pre-populated.

---

## 9. Definition of Done

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes
- [ ] Commits use Conventional Commits with spec IDs and task IDs: `feat(SPEC-PROD-008): description [TASK-28-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] Prisma JSON writes use `as unknown as Prisma.InputJsonValue` pattern (if applicable)
- [ ] redirect() calls are OUTSIDE try/catch blocks (FIND-M-001)
- [ ] No hardcoded colors -- use theme tokens

### Sprint-Level DoD
- [ ] All 22 tasks marked complete
- [ ] Code review approved by tech-lead (structured review per template)
- [ ] Test count >= 1720 (target: ~1725-1740 from 1662 baseline)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] Security checklist passed for all PRs
- [ ] Bias/ethics checklist passed for all PRs
- [ ] QA conformance audit against all referenced specs
- [ ] ALL 6 MANUAL-V protocols executed and documented with PASS/FAIL
- [ ] No recurring bugs remain from this sprint's scope
- [ ] No spec drift detected
- [ ] All commits reference spec IDs
- [ ] Merged to master via PR -- no direct commits
- [ ] SPEC-STATUS.md updated with Sprint 28 specs
- [ ] Version bumped to v0.21.0

### Security Checklist
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized (Zod schemas)
- [ ] PII data not logged or exposed in responses
- [ ] Auth/authz correctly enforced on touched endpoints
- [ ] No SQL injection, XSS, or CSRF vectors introduced
- [ ] BOLA checks on: readiness calculation, summary page, atlas profile, map pin navigation
- [ ] redirect() calls outside try/catch blocks (FIND-M-001)
- [ ] Trip ownership verified before displaying data on summary and atlas pages

### Bias and Ethics Checklist
- [ ] No discriminatory logic based on nationality, gender, age, disability, religion
- [ ] Search/sort/filter algorithms treat all users equitably
- [ ] Error messages are neutral and non-judgmental
- [ ] No dark patterns in UX flows
- [ ] Gamification does not create pressure or anxiety (neutral "0 points" for new users)
- [ ] CTA labels are honest and clear (no misleading button text)
- [ ] Summary readiness percentage framing is encouraging, not judgmental

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: Navigation restructure specs (SPEC-PROD-008, SPEC-ARCH-002) not approved by Day 1 | Medium | High (blocks NEW-003) | Many specs already in Draft from Sprint 27. tech-lead coordinates with spec owners pre-sprint. dev-fullstack-2 starts with fixes (TASK-28-001/002) while specs are approved. |
| R-002: Summary page redesign takes longer than 14h | Medium | Medium | TASK-28-011 (5h) is the riskiest. If over by Day 3, descope "Next Steps" engine (TASK-28-012) to Sprint 29. Core summary still ships. |
| R-003: Gamification header not completed in Sprint 27 | Low | Low | Full 6h allocated in Sprint 28 as carry. If completed in S27, time becomes buffer. |
| R-004: CTA standardization has higher blast radius (touching all 6 wizards) | Medium | Medium | WizardFooter component (TASK-28-018) isolates the pattern. Integration (TASK-28-019) is mechanical replacement. SPEC-UX-009 should define minimal changes -- standardize, don't redesign. |
| R-005: Phase revisit (FIX-004) reveals missing data persistence in multiple phases | Medium | High | If investigation shows multiple phases lack data loading, estimate grows beyond 4h. Descope to fix only Phases 1-2 in Sprint 28, remaining in Sprint 29. |
| R-006: Map pin requires Prisma migration (destinationLat/Lon) that conflicts with other changes | Low | Medium | Run migration early (Day 1). Coordinate with TASK-28-016. Single migration for coordinates. |
| R-007: Budget overflow (48h planned, 50h budget, 2h margin) | Medium | Medium | Descope priority: FIX-003 (auto-save) first, then FIX-004 (phase revisit). Core features (NEW-001-004) are non-negotiable. |

---

## 11. Spec Creation Assignments (Pre-Sprint)

These specs must be created or approved BEFORE the sprint begins:

| Spec | Owner | Priority | Status | Action |
|------|-------|----------|--------|--------|
| SPEC-PROD-008 | product-owner | Critical | Draft (S27) | Review and approve |
| SPEC-ARCH-002 | architect | Critical | Draft (S27) | Review and approve |
| SPEC-UX-008 | ux-designer | Critical | Draft (S27) | Review and approve |
| SPEC-PROD-007 | product-owner | Critical | Draft (S27) | Review and approve |
| SPEC-PROD-009 | product-owner | High | Draft (S27) | Review and approve |
| SPEC-UX-009 | ux-designer | High | Draft (S27) | Review and approve |
| SPEC-PROD-006 | product-owner | Medium | Draft (S27) | Review and approve |
| SPEC-UX-007 | ux-designer | Medium | Draft (S27) | Review and approve |
| SPEC-UX-011 | ux-designer | Critical | -- | CREATE: Summary page visual spec |
| SPEC-ARCH-004 | architect | Critical | -- | CREATE: Summary page data architecture |
| SPEC-ARCH-005 | architect | High | -- | CREATE: Navigation route architecture (update) |
| SPEC-ARCH-006 | architect | Medium | -- | CREATE: Phase auto-save architecture |
| SPEC-PROD-010 | product-owner | High | -- | CREATE: Summary page product update |
| SPEC-PROD-011 | product-owner | High | -- | CREATE: Navigation product update |
| SPEC-PROD-012 | product-owner | Medium | -- | CREATE: CTA product update |
| SPEC-UX-012 | ux-designer | High | -- | CREATE: Navigation UX update |
| SPEC-UX-013 | ux-designer | Medium | -- | CREATE: CTA visual spec |
| SPEC-UX-014 | ux-designer | Low | -- | CREATE: Gamification header polish |
| SPEC-UX-015 | ux-designer | Low | -- | CREATE: Map pin interaction UX |

---

## 12. Sprint 29 Preview

| Item | Est. | Notes |
|------|------|-------|
| DnD time auto-adjustment | 12h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft. Third carry. |
| Interactive Mapbox atlas map | 8-10h | SPEC-ARCH-002 proposes Mapbox GL JS. Deferred from nav restructure. |
| FIX-003/004 carry (if descoped) | 3-7h | Only if these fixes overflow from Sprint 28. |
| Accumulated tech debt | 3-5h | DEBT-S6-003, DEBT-S7-002, DEBT-S8-005. |
| PDF/print summary export | 4-6h | Deferred from SPEC-PROD-007 out-of-scope. |

---

## 13. Coordination Notes

### For tech-lead (self)
- **Pre-sprint (Day 0)**: Push for approval of SPEC-PROD-007/008/009, SPEC-UX-008/009, SPEC-ARCH-002. These are all in Draft from Sprint 27 -- they need review, not creation from scratch.
- **Day 0**: Request creation of 7 new specs (SPEC-UX-011/012/013/014/015, SPEC-ARCH-004/005/006, SPEC-PROD-010/011/012).
- **Day 1**: Verify fixes TASK-28-001/002 are landed quickly. These are quick wins that build momentum.
- **Day 2**: Mid-check on route architecture (TASK-28-014). This is the structural foundation for NEW-003.
- **Day 3**: Critical checkpoint. Summary page, gamification header, and navigation restructure should all be implementation-complete. If any is delayed, assess descope options.
- **Day 4**: Review tests for summary page and CTA component. Start MANUAL-V protocols.
- **Day 5**: Final code review. Build + test gate. Ensure all MANUAL-V protocols documented.

### For devs
- dev-fullstack-1: You own the summary page (biggest feature) and CTA standardization. The readiness service (TASK-28-009) is the foundation -- get it right. The summary card redesign (TASK-28-011) is the highest-risk task at 5h.
- dev-fullstack-2: You own the navigation restructure (highest structural impact) and all fixes. Start with the two quick fixes (TASK-28-001/002) to build momentum on Day 1, then pivot to route architecture.
- BOTH: Run `npm run build` after completing each major task, not just at sprint end.
- BOTH: When touching Phase wizards (CTA integration, phase revisit), check imports use `@/i18n/navigation` -- this is a recurring violation.

### For spec owners
- product-owner: 3 specs need approval (SPEC-PROD-006/007/008/009 -- all already in Draft). 3 new product update specs needed (SPEC-PROD-010/011/012).
- ux-designer: 2 specs need approval (SPEC-UX-007/008/009 -- all already in Draft). 5 new UX specs needed (SPEC-UX-011/012/013/014/015).
- architect: 1 spec needs approval (SPEC-ARCH-002 -- already in Draft). 3 new arch specs needed (SPEC-ARCH-004/005/006).

---

> BLOCKED on: SPEC-PROD-007/008/009 + SPEC-ARCH-002 approval (blocks Day 1 tasks). SPEC-UX-008/009/011 approval (blocks Day 2-3 tasks). All fix items (TASK-28-001/002) are UNBLOCKED under SDD XS exception and can start Day 1. TASK-28-003 blocked on SPEC-ARCH-006.
