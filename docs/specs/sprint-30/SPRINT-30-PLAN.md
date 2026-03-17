---
title: "Sprint 30 Plan"
sprint: 30
version: "v0.25.0"
budget_hours: "45h"
created: "2026-03-17"
author: tech-lead
process: "SDD + EDD"
---

# Sprint 30 Planning Document

**Version**: 1.0.0
**Author**: tech-lead
**Date**: 2026-03-17
**Budget**: 45h (5 working days, 2 devs at ~4.5h/day each)
**Baseline**: v0.24.0, 1869 tests (post Phase Navigation Redesign), build clean
**Process**: Spec-Driven Development (SDD) + Eval-Driven Development (EDD)
**Test Target**: 1940+ (from 1869 baseline)
**Theme**: Autocomplete Rewrite + Dashboard Overhaul + Bug Fixes

---

## 0. Sprint Goal Statement

Deliver a production-quality autocomplete rewrite with country flags, recent searches, and offline fallback; redesign the dashboard with sorting and filtering; and resolve all known bug backlog items. This sprint focuses on the two highest-impact user-facing rewrites while deferring the Map Page rewrite and Summary/Report rewrite to Sprint 31, where they can receive the attention they require.

---

## 1. Scope Decision: What Fits in 45h

### Budget Analysis

The user identified 4 candidate rewrites:

| Rewrite | Estimate | Spec Readiness | User Impact | Verdict |
|---------|----------|----------------|-------------|---------|
| Autocomplete rewrite | 10-12h | SPEC-PROD-017 Draft (exists) | HIGH -- every trip creation | SPRINT 30 |
| Dashboard rewrite | 8-10h | Needs new specs | HIGH -- primary landing surface | SPRINT 30 |
| Map page rewrite | 10-14h | Needs library eval + new specs | MEDIUM -- enhancement, not broken | DEFER to Sprint 31 |
| Summary/Report rewrite | 12-16h | Needs PDF/share/print specs | MEDIUM -- post-completion only | DEFER to Sprint 31 |
| Bug fixes | 4-6h | XS exceptions | HIGH -- user-reported pain | SPRINT 30 |

### Budget Allocation

| Category | Hours | Pct |
|----------|-------|-----|
| Autocomplete rewrite (full) | 12h | 27% |
| Dashboard rewrite (layout + sort + filter) | 10h | 22% |
| Bug fixes (prioritized backlog) | 5h | 11% |
| Test suites for all above | 10h | 22% |
| Integration testing + build verification | 3h | 7% |
| Buffer (overflow, unexpected blockers) | 5h | 11% |
| **Total** | **45h** | 100% |

### Why These Two Rewrites

1. **Autocomplete**: Touches every single trip creation flow. Current implementation (cmdk rewrite from Sprint 27) is functional but lacks country flags, recent searches, and offline fallback. SPEC-PROD-017 already drafted by product-owner -- lowest spec risk.

2. **Dashboard**: Primary landing surface after login. Current layout is serviceable but lacks sorting (by date, readiness) and filtering (active/completed/all). These are table-stakes features for any user with 2+ trips.

### Why Defer Map Page and Summary/Report

1. **Map page**: Requires a library evaluation (Leaflet vs Mapbox vs Google Maps) which is an architectural decision (SPEC-ARCH required). The current map pin implementation from Sprint 29 works. No user-reported urgency.

2. **Summary/Report**: PDF generation + share + print requires evaluating server-side PDF libraries (puppeteer vs react-pdf vs jsPDF), which is 4-6h of evaluation alone. At 12-16h total, it would consume the entire remaining budget and leave no room for bugs.

---

## 2. Deferred to Sprint 31

| Item | Est. (h) | Reason for Deferral | Prep Work for Sprint 30 |
|------|----------|--------------------|-----------------------|
| Map page rewrite | 10-14h | Needs SPEC-ARCH for library eval | Architect can draft SPEC-ARCH during Sprint 30 |
| Summary/Report rewrite (PDF + share + print) | 12-16h | Needs PDF library eval + new SPEC-PROD/ARCH | Product-owner can draft SPEC-PROD during Sprint 30 |
| DnD time auto-adjustment | 8-10h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft (sixth carry) | Needs architect decision on algorithm |

---

## 3. Spec Gate (SDD)

### Existing Specs

| Spec ID | Title | Status | Action |
|---------|-------|--------|--------|
| SPEC-PROD-017 | Destination Autocomplete Rewrite | Draft | REVIEW and APPROVE (Day 1-2) |

### New Specs Required

| Spec ID | Title | Owner | Priority | Covers |
|---------|-------|-------|----------|--------|
| SPEC-UX-020 | Autocomplete Rewrite Visual Spec | ux-designer | Critical (Day 1) | Mobile overlay, result format, flag rendering, recent searches UI |
| SPEC-ARCH-011 | Autocomplete Provider Evaluation | architect | Critical (Day 1) | Nominatim vs Google Places, recent search storage model, offline fallback architecture |
| SPEC-PROD-018 | Dashboard Sorting and Filtering | product-owner | Critical (Day 1) | Sort by date/readiness, filter by status, empty states |
| SPEC-UX-021 | Dashboard Rewrite Visual Spec | ux-designer | High (Day 1) | Sort/filter controls, card layout refinement, responsive behavior |
| SPEC-ARCH-012 | Dashboard Query Optimization | architect | Medium (Day 2) | Efficient Prisma queries for sort/filter, pagination strategy |
| SPEC-QA-001 | Sprint 30 Test Strategy | qa-engineer | High (Day 2) | Eval datasets, trust score baseline, acceptance test plan |

### XS Exceptions (no spec required)

| Item | Justification |
|------|---------------|
| Bug fixes < 2h each | Bug fix under XS threshold, covered by existing specs |
| Tech debt items < 2h | Pure refactoring with no behavior change |

### Definition of Ready (per rewrite)

Before any implementation task begins, ALL of the following must be checked:

```
[ ] SPEC-PROD approved (product requirements)
[ ] SPEC-UX approved (visual/interaction spec)
[ ] SPEC-ARCH approved (technical architecture)
[ ] SPEC-QA approved (test strategy + eval criteria)
[ ] Eval datasets created (EDD gate)
[ ] Trust score baseline set (EDD gate)
[ ] No open questions blocking implementation
```

### Approval Gate Summary

**Day 1 (spec writing)**: All 6 specs written and submitted for review.
**Day 2 (cross-review)**: All specs approved. Eval datasets created. Trust score baseline set.
**Day 3-7 (implementation)**: Implementation proceeds per task breakdown.
**Day 8 (QA + eval)**: Full test suite + eval gates pass.
**Day 9-10 (fixes + final)**: Fix any issues, final testing, PR preparation.

---

## 4. Bug Backlog (Prioritized)

### P1 Bugs (fix in Sprint 30)

| Bug ID | Description | Est. (h) | Source |
|--------|-------------|----------|--------|
| BUG-S30-001 | TransportStep does not pre-fill trip origin/destination | 1.5h | BUG-P1-004 (Sprint 25, confirmed) |
| BUG-S30-002 | Phase6Wizard has no back button (missing ExpeditionProgressBar) | 1h | BUG-P1-008 (Sprint 25, confirmed) -- NOTE: Phase 6 opts out of PhaseShell footer per ADR-017, verify if back navigation is still needed via separate mechanism |
| BUG-S30-003 | ExpeditionHubPage "coming soon" uses hardcoded gray colors instead of theme tokens | 0.5h | Outstanding debt |

### P2 Bugs (fix if buffer allows)

| Bug ID | Description | Est. (h) | Source |
|--------|-------------|----------|--------|
| BUG-S30-004 | DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented | 1h | Sprint 6 debt |
| BUG-S30-005 | DEBT-S18-002: account.actions.ts has two hashUserId functions | 0.5h | Sprint 18 debt |
| BUG-S30-006 | DEBT-S6-004: style-src 'unsafe-inline' in prod CSP | 1h | Sprint 6 debt |

**Total P1 bugs**: 3h
**Total P2 bugs**: 2.5h (buffer-dependent)

---

## 5. Task Breakdown

### Dependency Map

```
Independent (can start Day 3):
  TASK-S30-001 (autocomplete: provider evaluation result applied)
  TASK-S30-008 (dashboard: service layer for sort/filter)
  TASK-S30-014 (bug fixes batch 1)

Autocomplete chain:
  TASK-S30-001 --> TASK-S30-002 --> TASK-S30-003 --> TASK-S30-004
  TASK-S30-002 --> TASK-S30-005 (parallel with 003)
  TASK-S30-003 + TASK-S30-004 + TASK-S30-005 --> TASK-S30-006 (autocomplete tests)
  TASK-S30-006 --> TASK-S30-007 (autocomplete eval gate)

Dashboard chain:
  TASK-S30-008 --> TASK-S30-009 --> TASK-S30-010 --> TASK-S30-011
  TASK-S30-009 --> TASK-S30-012 (dashboard tests, parallel with 010)
  TASK-S30-010 + TASK-S30-011 + TASK-S30-012 --> TASK-S30-013 (dashboard eval gate)

Bug fixes:
  TASK-S30-014 (independent)
  TASK-S30-015 (P2 bugs, buffer-dependent)

Integration:
  ALL --> TASK-S30-016 (integration testing + build verification)

Parallelization:
  dev-fullstack-1: Autocomplete rewrite (TASK-S30-001 through 007)
  dev-fullstack-2: Dashboard rewrite (TASK-S30-008 through 013) + bug fixes (014-015)
```

### Tasks

---

#### Autocomplete Rewrite (dev-fullstack-1, 22h)

##### TASK-S30-001: Autocomplete API layer -- provider adapter + offline fallback
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-017 RF-001/004/008, SPEC-ARCH-011
- **Description**: Implement a provider-agnostic autocomplete API route that wraps the chosen provider (Nominatim or Google Places per SPEC-ARCH-011 decision). Include: (a) provider adapter interface with `search(query, locale): AutocompleteResult[]`, (b) offline fallback with ~200 top world cities (static JSON), (c) 3-second timeout triggering fallback, (d) error handling for 4xx/5xx, (e) debounce enforcement at API level (min 2 chars). Route: `src/app/api/destinations/autocomplete/route.ts` (replaces or extends existing `search/route.ts`).
- **Acceptance**: API returns results with name, region, country, countryCode (ISO-2), lat, lon. Falls back to local cities on timeout or error. Min 2 char enforcement. Rate limit preserved. At least 6 tests.
- **Est**: 3h
- **Dependencies**: SPEC-ARCH-011 approved
- **Day**: Day 3

##### TASK-S30-002: Autocomplete component -- core rewrite with flags and ARIA
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-017 RF-001/002/005/006/007/012/013/014, SPEC-UX-020
- **Description**: Rewrite DestinationAutocomplete.tsx as a fully accessible combobox. Replace cmdk dependency. Implement: (a) ARIA combobox pattern (role=combobox, aria-expanded, aria-activedescendant, role=listbox/option), (b) country flag emoji rendering from ISO-2 code with aria-hidden, (c) result format: "flag Name -- Region, Country", (d) keyboard navigation (ArrowDown/Up, Enter, Escape), (e) 300ms debounce, (f) 4-8 results, (g) loading spinner, (h) Radix Portal for dropdown rendering (preserving Sprint 27 fix). Selected value stores metadata (lat/lon, countryCode) internally.
- **Acceptance**: All RF-001/002/005/006/007/012/013/014 acceptance criteria pass. Screen reader announces city + region + country (no emoji). Keyboard-navigable. Portal renders above parent overflow. At least 8 tests.
- **Est**: 4h
- **Dependencies**: TASK-S30-001
- **Day**: Day 3-4

##### TASK-S30-003: Autocomplete -- recent searches persistence
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-017 RF-003, SPEC-ARCH-011
- **Description**: Implement recent searches storage for authenticated users. Max 5 entries. Persist to database (UserProfile JSON field or dedicated table per SPEC-ARCH-011 decision). On empty field focus, show recent searches with "Buscas recentes" label. Individual removal and "Limpar todas" action. i18n for all labels.
- **Acceptance**: Select destination -> next visit shows in recents. Max 5 stored (FIFO). Remove individual works. Clear all works. Persisted across sessions. i18n PT-BR + EN. At least 5 tests.
- **Est**: 2h
- **Dependencies**: TASK-S30-002
- **Day**: Day 4-5

##### TASK-S30-004: Autocomplete -- mobile full-screen overlay
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-017 RF-009/010/011, SPEC-UX-020
- **Description**: For viewports <= 640px, replace dropdown with full-screen overlay. Implement: (a) fixed-position overlay covering entire screen, (b) search input at top + "Cancelar" button, (c) result list below, (d) keyboard auto-opens, (e) min 44px touch targets with >= 4px gap, (f) results visible above virtual keyboard (position: fixed or equivalent). Cancel closes overlay without selection.
- **Acceptance**: AC-005, AC-006 pass. Touch targets meet 44px minimum. Virtual keyboard does not obscure results. Cancel exits cleanly. At least 4 tests.
- **Est**: 2h
- **Dependencies**: TASK-S30-002
- **Day**: Day 5

##### TASK-S30-005: Autocomplete -- i18n and error states
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-017 RF-008/015/016
- **Description**: Add all autocomplete UI strings to PT-BR and EN i18n files: placeholder, "Buscas recentes", "Limpar", "Sem resultados", "Busca indisponivel no momento", labels. Implement locale-aware result display (Portuguese city/country names when available from provider). API error state shows inline message + activates offline fallback without closing dropdown.
- **Acceptance**: All UI strings in both locales. Error state shows message + fallback results. Locale preference passed to provider. At least 3 tests.
- **Est**: 1h
- **Dependencies**: TASK-S30-002
- **Day**: Day 5

##### TASK-S30-006: Autocomplete -- comprehensive test suite
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-017 (all 14 ACs), SPEC-QA-001
- **Description**: Comprehensive test suite covering all 14 acceptance criteria from SPEC-PROD-017. Includes: (a) search by city, IATA code, airport name, landmark (4 tests), (b) result format with flag + region + country (2 tests), (c) recent searches CRUD (4 tests), (d) offline fallback on timeout and error (3 tests), (e) debounce and min 2 chars (2 tests), (f) ARIA attributes and keyboard navigation (4 tests), (g) mobile overlay open/close (3 tests), (h) metadata storage on selection (2 tests), (i) screen reader announcement format (2 tests), (j) i18n string presence (2 tests).
- **Acceptance**: >= 28 new tests. All 14 SPEC-PROD-017 ACs have test assertions. >= 80% coverage on autocomplete files. BOLA test for recent searches endpoint.
- **Est**: 3h
- **Dependencies**: TASK-S30-001 through TASK-S30-005
- **Day**: Day 6-7

##### TASK-S30-007: Autocomplete -- eval gate verification
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-QA-001 (EDD)
- **Description**: Run eval suite for autocomplete feature. Verify trust score meets baseline. Check for drift. If eval gate fails, diagnose and fix root cause before proceeding.
- **Acceptance**: `npm run eval:gate` passes. Trust score >= 0.8 (staging threshold). No drift > 10%. Results logged.
- **Est**: 1h
- **Dependencies**: TASK-S30-006
- **Day**: Day 7

---

#### Dashboard Rewrite (dev-fullstack-2, 18h)

##### TASK-S30-008: Dashboard service layer -- sort and filter queries
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-018, SPEC-ARCH-012
- **Description**: Extend TripService (or create DashboardService) with methods for: (a) `getTripsForDashboard(userId, { sortBy, sortOrder, filterStatus })` returning trips with sorting (by createdAt, departureDate, readinessScore) and filtering (active/completed/all), (b) efficient Prisma queries with explicit select clauses (SR-005), (c) readiness score computation (from TripReadinessService) included in sort, (d) pagination support (limit/offset) for future scaling. All queries enforce BOLA (userId filter).
- **Acceptance**: Service returns sorted/filtered trips. BOLA enforced on all queries. Explicit select clauses. At least 6 tests (2 sort, 2 filter, 1 BOLA, 1 empty state).
- **Est**: 3h
- **Dependencies**: SPEC-ARCH-012 approved
- **Day**: Day 3

##### TASK-S30-009: Dashboard UI -- sort/filter controls
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-018, SPEC-UX-021
- **Description**: Add sort and filter controls to the dashboard page. Sort dropdown: "Data de criacao", "Data de partida", "Progresso" (readiness). Filter tabs or dropdown: "Todas", "Ativas", "Concluidas". Controls render above the trip card grid. State managed via URL search params (shareable/bookmarkable). Default: sort by createdAt desc, filter all. i18n for all labels.
- **Acceptance**: Sort changes order of trip cards. Filter shows/hides trips by status. URL updates on control change. Default state renders correctly. i18n PT-BR + EN. At least 5 tests.
- **Est**: 3h
- **Dependencies**: TASK-S30-008
- **Day**: Day 4

##### TASK-S30-010: Dashboard UI -- card layout refinement
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-021
- **Description**: Refine ExpeditionCard layout per SPEC-UX-021. Ensure: (a) consistent card heights (min-height, not fixed), (b) TripCountdownInline renders correctly within card, (c) readiness badge visible on each card, (d) responsive grid (2 columns desktop, stacked mobile), (e) empty state when no trips match filter ("Nenhuma expedicao encontrada"), (f) all colors use theme tokens (fix hardcoded grays from debt log).
- **Acceptance**: Cards render with consistent visual quality. Empty state displays correctly. Theme tokens used throughout. Responsive layout works at 375px and 1280px. At least 4 tests.
- **Est**: 2h
- **Dependencies**: TASK-S30-009
- **Day**: Day 5

##### TASK-S30-011: Dashboard -- loading states and optimistic updates
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-018, SPEC-UX-021
- **Description**: Add skeleton loading states for dashboard while trips load. On sort/filter change, show brief loading indicator (skeleton or spinner). Implement optimistic update for sort -- client-side sort on already-loaded data when no server round-trip needed (e.g., sorting by a field already in the response). Server-side sort only for readiness score (requires computation).
- **Acceptance**: Skeleton shows during initial load. Sort/filter transitions are smooth. No flash of unsorted content. At least 3 tests.
- **Est**: 1h
- **Dependencies**: TASK-S30-009
- **Day**: Day 5

##### TASK-S30-012: Dashboard -- comprehensive test suite
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-001
- **Description**: Test suite for dashboard rewrite: (a) service layer sort by 3 criteria (3 tests), (b) service layer filter by 3 states (3 tests), (c) BOLA enforcement (2 tests), (d) sort controls render and update URL (3 tests), (e) filter controls render and update URL (3 tests), (f) empty state rendering (2 tests), (g) card layout responsive behavior (2 tests), (h) skeleton loading state (2 tests), (i) theme token compliance check (1 test).
- **Acceptance**: >= 21 new tests. >= 80% coverage on dashboard files. BOLA tests included. No regressions.
- **Est**: 3h
- **Dependencies**: TASK-S30-008 through TASK-S30-011
- **Day**: Day 6-7

##### TASK-S30-013: Dashboard -- eval gate verification
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-001 (EDD)
- **Description**: Run eval suite for dashboard feature. Verify trust score meets baseline.
- **Acceptance**: `npm run eval:gate` passes. Trust score >= 0.8. No drift > 10%.
- **Est**: 1h
- **Dependencies**: TASK-S30-012
- **Day**: Day 7

---

#### Bug Fixes (dev-fullstack-2, 5h)

##### TASK-S30-014: P1 bug fixes batch
- **Assigned**: dev-fullstack-2
- **Spec ref**: XS exception (bug fixes)
- **Description**: Fix 3 P1 bugs: (a) BUG-S30-001: TransportStep does not receive/pre-fill trip origin and destination -- pass origin/destination from trip data to TransportStep props, pre-populate departure/arrival place fields. (b) BUG-S30-002: Phase6Wizard back navigation -- Phase 6 opts out of PhaseShell footer per ADR-017; add a minimal "Back to Phase 5" link/button that uses PhaseNavigationEngine.getPreviousPhaseRoute(). (c) BUG-S30-003: ExpeditionHubPage hardcoded gray colors -- replace with theme tokens.
- **Acceptance**: TransportStep shows origin/destination pre-filled. Phase 6 has back navigation to Phase 5. No hardcoded gray colors on hub page. At least 4 tests (1 transport pre-fill, 1 phase 6 back, 2 regression).
- **Est**: 3h
- **Dependencies**: None (can start Day 3)
- **Day**: Day 3-4

##### TASK-S30-015: P2 bug fixes (buffer-dependent)
- **Assigned**: dev-fullstack-2
- **Spec ref**: XS exception (tech debt)
- **Description**: If buffer allows: (a) DEBT-S6-003: Add analytics events for onboarding.completed and onboarding.skipped. (b) DEBT-S18-002: Remove duplicate hashUserId in account.actions.ts, use only the imported hashForLog.
- **Acceptance**: Analytics events fire on onboarding completion/skip. Single hashUserId implementation. No behavior change. At least 2 tests.
- **Est**: 1.5h
- **Dependencies**: None
- **Day**: Day 8 (buffer)

---

#### Cross-Cutting

##### TASK-S30-016: Integration testing and build verification
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: All
- **Description**: Final integration: `npm run build`, full test suite, `npm run lint`, `npm run i18n:check`, verify test count >= 1940. Fix any integration issues. Run `npm run eval:gate` for full suite. Prepare PR.
- **Acceptance**: Build clean. Lint clean. i18n check passes. Test count >= 1940. Eval gate passes. PR ready with spec conformance checklist.
- **Est**: 3h (1.5h per dev)
- **Dependencies**: All other tasks
- **Day**: Day 8

---

## 6. Dev Assignment Summary

### dev-fullstack-1 (22h total -- Autocomplete Rewrite)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-S30-001 | Autocomplete API layer + offline fallback | 3h | Day 3 |
| TASK-S30-002 | Autocomplete component rewrite (core + ARIA + flags) | 4h | Day 3-4 |
| TASK-S30-003 | Recent searches persistence | 2h | Day 4-5 |
| TASK-S30-004 | Mobile full-screen overlay | 2h | Day 5 |
| TASK-S30-005 | i18n and error states | 1h | Day 5 |
| TASK-S30-006 | Autocomplete comprehensive tests | 3h | Day 6-7 |
| TASK-S30-007 | Autocomplete eval gate | 1h | Day 7 |
| TASK-S30-016 | Integration (shared) | 1.5h | Day 8 |
| **Total** | | **17.5h** | |
| **Buffer available** | | **4.5h** | |

### dev-fullstack-2 (23h total -- Dashboard + Bugs)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-S30-014 | P1 bug fixes (3 bugs) | 3h | Day 3-4 |
| TASK-S30-008 | Dashboard service layer (sort/filter) | 3h | Day 3 |
| TASK-S30-009 | Dashboard UI sort/filter controls | 3h | Day 4 |
| TASK-S30-010 | Dashboard card layout refinement | 2h | Day 5 |
| TASK-S30-011 | Dashboard loading states | 1h | Day 5 |
| TASK-S30-012 | Dashboard comprehensive tests | 3h | Day 6-7 |
| TASK-S30-013 | Dashboard eval gate | 1h | Day 7 |
| TASK-S30-015 | P2 bug fixes (buffer) | 1.5h | Day 8 |
| TASK-S30-016 | Integration (shared) | 1.5h | Day 8 |
| **Total** | | **19h** | |
| **Buffer available** | | **3h** | |

---

## 7. Spec Review Schedule (Day-by-Day)

### Day 1 -- Spec Writing (all agents, no code)

| Agent | Deliverable | Deadline |
|-------|-------------|----------|
| product-owner | SPEC-PROD-017 finalized (autocomplete -- exists, review) | EOD 1 |
| product-owner | SPEC-PROD-018 draft (dashboard sort/filter) | EOD 1 |
| ux-designer | SPEC-UX-020 draft (autocomplete visual) | EOD 1 |
| ux-designer | SPEC-UX-021 draft (dashboard visual) | EOD 1 |
| architect | SPEC-ARCH-011 draft (autocomplete provider eval) | EOD 1 |
| architect | SPEC-ARCH-012 draft (dashboard query optimization) | EOD 1 |

### Day 2 -- Cross-Review and Approval

| Activity | Participants | Deadline |
|----------|-------------|----------|
| Review SPEC-PROD-017 | tech-lead, architect, ux-designer | AM |
| Review SPEC-PROD-018 | tech-lead, architect, ux-designer | AM |
| Review SPEC-UX-020, SPEC-UX-021 | product-owner, tech-lead, architect | AM |
| Review SPEC-ARCH-011, SPEC-ARCH-012 | tech-lead, security-specialist | PM |
| qa-engineer writes SPEC-QA-001 | qa-engineer | PM |
| **All specs approved** | tech-lead (gate) | **EOD 2** |
| Eval datasets created | qa-engineer | EOD 2 |
| Trust score baseline set | qa-engineer + prompt-engineer | EOD 2 |
| finops-engineer cost briefing | finops-engineer | EOD 2 |

### Day 3-7 -- Implementation

| Day | dev-fullstack-1 | dev-fullstack-2 |
|-----|-----------------|-----------------|
| Day 3 | TASK-S30-001 (API layer, 3h) + TASK-S30-002 (start, 1.5h) | TASK-S30-008 (service, 3h) + TASK-S30-014 (bugs, 1.5h) |
| Day 4 | TASK-S30-002 (finish, 2.5h) + TASK-S30-003 (start, 1h) | TASK-S30-009 (controls, 3h) + TASK-S30-014 (bugs finish, 1.5h) |
| Day 5 | TASK-S30-003 (finish, 1h) + TASK-S30-004 (2h) + TASK-S30-005 (1h) | TASK-S30-010 (card layout, 2h) + TASK-S30-011 (loading, 1h) + buffer |
| Day 6 | TASK-S30-006 (tests, 2h) | TASK-S30-012 (tests, 2h) |
| Day 7 | TASK-S30-006 (finish, 1h) + TASK-S30-007 (eval, 1h) | TASK-S30-012 (finish, 1h) + TASK-S30-013 (eval, 1h) |

### Day 8 -- QA + Eval Gates + Integration

| Activity | Owner |
|----------|-------|
| Full eval suite run | qa-engineer + both devs |
| Integration build verification | both devs (TASK-S30-016) |
| P2 bug fixes if buffer | dev-fullstack-2 (TASK-S30-015) |
| Security review of new endpoints | security-specialist |

### Day 9-10 -- Fixes + Final Testing

| Activity | Owner |
|----------|-------|
| Fix any eval gate failures | Responsible dev |
| Fix code review findings | Both devs |
| Manual verification protocol | Both devs |
| Final `npm run build` + `npm run eval:gate` | Both devs |
| PR creation + spec conformance checklist | tech-lead |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: SPEC-ARCH-011 provider decision delays implementation | Medium | High | Start offline fallback (provider-agnostic) first. Provider adapter is pluggable. |
| R-002: Autocomplete mobile overlay is harder than estimated | Medium | Medium | 2h estimate includes complexity buffer. Can defer polish to Sprint 31 if core works. |
| R-003: Dashboard Prisma queries for readiness-based sort are slow | Low | Medium | SPEC-ARCH-012 should address with denormalized readiness field or computed column. |
| R-004: cmdk removal breaks existing tests | Medium | Low | cmdk is only in DestinationAutocomplete. Rewrite replaces entirely -- old tests become new tests. |
| R-005: Spec writing/review takes longer than 2 days | Low | High | SPEC-PROD-017 already exists. Limit scope of other specs to essential decisions only. |
| R-006: Bug fixes reveal deeper issues | Medium | Medium | P1 bugs are well-understood (Sprint 25 root-cause done). 5h buffer available. |

---

## 9. EDD (Eval-Driven Development) Integration

### Eval Datasets Required

| Feature | Dataset | Grader | Owner |
|---------|---------|--------|-------|
| Autocomplete search quality | 50 city queries (ambiguous + IATA + landmarks) | Precision/recall grader | qa-engineer |
| Autocomplete offline fallback | 20 queries with simulated API failure | Fallback activation rate | qa-engineer |
| Autocomplete accessibility | 10 screen reader interaction flows | ARIA compliance checker | qa-engineer |
| Dashboard sort accuracy | 15 trips with varied dates/readiness | Sort order verifier | qa-engineer |
| Dashboard filter accuracy | 15 trips with varied statuses | Filter correctness checker | qa-engineer |

### Trust Score Targets

| Dimension | Baseline | Target | Threshold |
|-----------|----------|--------|-----------|
| Search quality | N/A (new) | >= 0.85 | 0.8 |
| Accessibility | 0.9 (current) | >= 0.9 | 0.85 |
| UI responsiveness | N/A (new) | >= 0.9 | 0.85 |
| Data integrity (BOLA) | 0.95 | >= 0.95 | 0.9 |

---

## 10. Test Strategy

### New Test Categories

| Area | Expected Tests | Coverage Target |
|------|---------------|-----------------|
| Autocomplete API layer (provider + fallback) | 6-8 | >= 80% |
| Autocomplete component (core + ARIA + flags) | 8-10 | >= 80% |
| Autocomplete recent searches | 5-6 | >= 80% |
| Autocomplete mobile overlay | 4-5 | >= 80% |
| Autocomplete i18n + error states | 3-4 | >= 80% |
| Dashboard service (sort/filter) | 6-8 | >= 80% |
| Dashboard UI controls | 5-6 | >= 80% |
| Dashboard card layout | 4-5 | >= 80% |
| Dashboard loading states | 3 | >= 80% |
| Bug fixes (transport pre-fill, phase 6 back, theme) | 4-5 | Regression |
| P2 bugs (if done) | 2-3 | Regression |
| **Total new tests** | **50-63** | |
| **Expected final count** | **~1919-1932** | |

**Note**: Combined with any incidental test additions during implementation, target is 1940+.

### Manual Verification Protocol

#### MANUAL-V-S30-001: Autocomplete Rewrite
1. Type "rio" in Phase 1 destination field.
2. VERIFY: Results appear within 600ms total (300ms debounce + 300ms render).
3. VERIFY: Results include flag emoji + name + region + country.
4. VERIFY: Arrow keys navigate results, Enter selects.
5. VERIFY: Escape closes dropdown.
6. VERIFY: Screen reader announces city + region + country (no emoji).
7. Focus empty field.
8. VERIFY: Recent searches appear (if any exist).

#### MANUAL-V-S30-002: Autocomplete Mobile Overlay
1. Set viewport to 375px.
2. Focus autocomplete field.
3. VERIFY: Full-screen overlay opens with search + Cancel.
4. VERIFY: Results visible above virtual keyboard.
5. VERIFY: Touch targets >= 44px.
6. Tap Cancel.
7. VERIFY: Overlay closes, field unchanged.

#### MANUAL-V-S30-003: Autocomplete Offline Fallback
1. Disconnect network (DevTools offline).
2. Type "paris" in destination field.
3. VERIFY: Results appear from offline fallback (cities list).
4. VERIFY: No error message visible (silent fallback).

#### MANUAL-V-S30-004: Dashboard Sort/Filter
1. Create 3+ trips with different dates and readiness levels.
2. VERIFY: Sort by "Data de criacao" orders correctly.
3. VERIFY: Sort by "Data de partida" orders correctly.
4. VERIFY: Sort by "Progresso" orders by readiness percentage.
5. VERIFY: Filter "Ativas" shows only active trips.
6. VERIFY: Filter "Concluidas" shows only completed.
7. VERIFY: Empty state message when filter yields no results.

#### MANUAL-V-S30-005: Bug Fixes
1. Create trip with origin "Sao Paulo" and destination "Paris".
2. Navigate to Phase 4 TransportStep.
3. VERIFY: Departure place pre-filled with "Sao Paulo", arrival with "Paris".
4. Navigate to Phase 6.
5. VERIFY: Back navigation to Phase 5 is available.

---

## 11. Definition of Done

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes
- [ ] Commits use Conventional Commits with spec IDs and task IDs: `feat(SPEC-PROD-017): description [TASK-S30-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] Prisma JSON writes use `as unknown as Prisma.InputJsonValue` pattern (if applicable)
- [ ] redirect() calls are OUTSIDE try/catch blocks (FIND-M-001)
- [ ] No hardcoded colors -- use theme tokens
- [ ] Flag emojis use aria-hidden="true"

### Sprint-Level DoD
- [ ] All 16 tasks marked complete (TASK-S30-015 optional/buffer)
- [ ] Code review approved by tech-lead (structured review per template)
- [ ] Test count >= 1940 (target: ~1930 from 1869 baseline + 60 new)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] i18n check passes (`npm run i18n:check`)
- [ ] Eval gate passes (`npm run eval:gate`)
- [ ] Security checklist passed (reviewed by security-specialist)
- [ ] No bias risks identified in search results or dashboard sorting
- [ ] All manual verification protocols executed and documented
- [ ] Merged to main via PR -- no direct commits
- [ ] Changelog entry references SPEC-PROD-017, SPEC-PROD-018, and all bug IDs

### Security & Privacy Checklist (Sprint 30 specific)
- [ ] Autocomplete API rate-limited (existing rate limit preserved)
- [ ] Recent searches stored per-user with BOLA enforcement (no cross-user leakage)
- [ ] No PII in autocomplete API logs (user search queries are not PII but should not be verbose-logged)
- [ ] Offline fallback city list contains no sensitive data
- [ ] Dashboard queries enforce userId filter (BOLA)
- [ ] Sort/filter URL params sanitized (no injection vector)

### Bias & Ethics Checklist (Sprint 30 specific)
- [ ] Autocomplete results do not discriminate by destination country
- [ ] Offline fallback city list is geographically diverse (not biased toward Western cities)
- [ ] Dashboard sorting treats all trips equitably (no hidden ranking boost)
- [ ] Error messages are neutral ("Busca indisponivel" not "Voce errou")

---

## 12. Sprint 31 Prep (parallel with Sprint 30 implementation)

During Sprint 30, the following specs should be drafted for Sprint 31:

| Spec ID | Title | Owner | Sprint 30 Action |
|---------|-------|-------|-----------------|
| SPEC-PROD-019 | Map Page Rewrite | product-owner | Draft during Sprint 30 |
| SPEC-ARCH-013 | Map Library Evaluation (Leaflet vs Mapbox vs Google Maps) | architect | Draft + evaluate during Sprint 30 |
| SPEC-PROD-020 | Summary/Report Export (PDF + Share + Print) | product-owner | Draft during Sprint 30 |
| SPEC-ARCH-014 | PDF Generation Architecture | architect | Draft + evaluate during Sprint 30 |
| SPEC-PROD-004 | DnD Time Auto-Adjustment | product-owner | Finalize (seventh carry from Sprint 26) |
| SPEC-ARCH-001 | DnD Time Auto-Adjustment Architecture | architect | Finalize |
