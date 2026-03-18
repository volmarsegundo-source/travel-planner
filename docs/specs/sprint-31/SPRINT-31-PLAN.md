---
title: "Sprint 31 Plan"
sprint: 31
version: "v0.26.0"
budget_hours: "45h"
created: "2026-03-17"
author: tech-lead
process: "SDD + EDD"
---

# Sprint 31 Planning Document

**Version**: 1.0.0
**Author**: tech-lead
**Date**: 2026-03-17
**Budget**: 45h (5 working days, 2 devs at ~4.5h/day each)
**Baseline**: v0.25.0, 2024 tests, build clean
**Process**: Spec-Driven Development (SDD) + Eval-Driven Development (EDD)
**Test Target**: 2090+ (from 2024 baseline)
**Theme**: Meu Atlas Rewrite + Phase Completion + Dashboard Quick-Access + UX Cleanups

---

## 0. Sprint Goal Statement

Deliver the Meu Atlas interactive map rewrite (Leaflet-based, replacing static SVG), refine the phase completion engine with explicit per-phase rules and visual consistency, add quick-access links to dashboard expedition cards, and clean up UX debt (profile link placement, badge interactivity, date validation, button replacement). This sprint completes the two features deferred from Sprint 30 (map rewrite) while addressing user-reported quality issues.

---

## 1. Scope Decision: What Fits in 45h

### Budget Analysis

| Feature | Estimate | Spec Readiness | User Impact | Verdict |
|---------|----------|----------------|-------------|---------|
| Meu Atlas rewrite (Leaflet) | 12-14h | SPEC-PROD-021 Draft (Sprint 30) | HIGH -- product identity feature | SPRINT 31 |
| Phase completion engine + progress bar colors | 8-10h | Existing TripReadinessService + new rules | HIGH -- affects all dashboards | SPRINT 31 |
| Dashboard quick-access links + status colors | 6-8h | New feature, low complexity | MEDIUM -- convenience | SPRINT 31 |
| UX cleanups (header, dates, remove complete button) | 4-6h | XS items, no spec required | HIGH -- perceived quality | SPRINT 31 |
| Tests + E2E | 8h | SPEC-QA-005/006/007/008 | N/A | SPRINT 31 |
| Buffer | 3h | N/A | N/A | Reserve |

### Budget Allocation

| Category | Hours | Pct |
|----------|-------|-----|
| Meu Atlas rewrite (full) | 13h | 29% |
| Phase completion engine + visual sync | 9h | 20% |
| Dashboard quick-access links | 7h | 16% |
| UX cleanups | 5h | 11% |
| Tests + E2E | 8h | 18% |
| Buffer | 3h | 6% |
| **Total** | **45h** | 100% |

---

## 2. Deferred to Sprint 32

| Item | Est. (h) | Reason for Deferral |
|------|----------|---------------------|
| Summary/Report rewrite (PDF + share + print) | 12-16h | Needs PDF library eval + SPEC-ARCH |
| DnD time auto-adjustment | 8-10h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft (eighth carry) |
| AI-generated report summaries | TBD | Not specced yet |

---

## 3. Spec Gate (SDD)

### Existing Specs (from Sprint 30 prep)

| Spec ID | Title | Status | Action |
|---------|-------|--------|--------|
| SPEC-PROD-021 | Meu Atlas -- Interactive World Map | Draft | REVIEW and APPROVE (Day 1) |

### New Specs Created for Sprint 31

| Spec ID | Title | Owner | Status | Covers |
|---------|-------|-------|--------|--------|
| SPEC-QA-005 | Atlas Map Test Strategy | qa-engineer | Draft | Map rendering, pins, popups, filters, mobile, dark mode |
| SPEC-QA-006 | Phase Completion Test Strategy | qa-engineer | Draft | Per-phase completion rules, auto-completion, progress bar |
| SPEC-QA-007 | Dashboard Quick-Access Test Strategy | qa-engineer | Draft | Quick-access link visibility, navigation, BOLA |
| SPEC-QA-008 | UX Cleanups Test Strategy | qa-engineer | Draft | Profile link, badge, date validation, button removal |
| SPEC-SEC-002-S31 | Sprint 31 Security Review | security-specialist | Draft | BOLA on map/report, date validation server-side, coordinates not PII |
| SPEC-INFRA-002-S31 | Sprint 31 Infrastructure | devops-engineer | Draft | Leaflet deps, dynamic import, no migrations, tile config |
| SPEC-RELEASE-002-S31 | v0.26.0 Release Plan | release-manager | Draft | Changelog, rollback, no breaking changes |
| SPEC-COST-002-S31 | Sprint 31 Cost Assessment | finops-engineer | Draft | OSM tiles free, Leaflet free, zero AI cost |
| SPEC-AI-002-S31 | Sprint 31 AI Impact Review | prompt-engineer | Draft | Zero AI impact confirmed |

### Eval Datasets Created

| Dataset | File | Cases | Grader |
|---------|------|-------|--------|
| Atlas map rendering | docs/evals/datasets/atlas-map-rendering.json | 10 | Visual regression + data correctness |
| Phase completion states | docs/evals/datasets/phase-completion-states.json | 12 | State transition correctness |
| Dashboard quick-access | docs/evals/datasets/dashboard-quickaccess.json | 6 | Link visibility correctness |
| Date validation | docs/evals/datasets/date-validation.json | 8 | Input validation correctness |

### XS Exceptions (no spec required)

| Item | Justification |
|------|---------------|
| Profile link move (CLEANUP-001) | Cosmetic, < 1h, no behavior change |
| Badge pointer-events (CLEANUP-002) | Cosmetic, < 0.5h, removes interactivity |
| Button replacement (CLEANUP-004) | Text swap, < 0.5h |

### Definition of Ready (per feature)

Before any implementation task begins:

```
[ ] SPEC-PROD approved (or XS exception documented)
[ ] SPEC-QA approved (test strategy)
[ ] SPEC-SEC reviewed (security clearance)
[ ] SPEC-INFRA reviewed (infrastructure readiness)
[ ] Eval datasets created (EDD gate)
[ ] No open questions blocking implementation
```

---

## 4. Task Breakdown

### Dependency Map

```
Independent (can start Day 3):
  TASK-S31-001 (atlas: Leaflet setup + base map)
  TASK-S31-008 (phase completion: engine refinement)
  TASK-S31-014 (UX cleanups batch)

Atlas chain:
  TASK-S31-001 --> TASK-S31-002 --> TASK-S31-003 --> TASK-S31-004
  TASK-S31-003 --> TASK-S31-005 (parallel with 004)
  TASK-S31-004 + TASK-S31-005 --> TASK-S31-006 (atlas tests)
  TASK-S31-006 --> TASK-S31-007 (atlas eval gate)

Phase completion chain:
  TASK-S31-008 --> TASK-S31-009 --> TASK-S31-010
  TASK-S31-010 --> TASK-S31-011 (phase completion tests)

Dashboard quick-access chain:
  TASK-S31-012 --> TASK-S31-013 (quick-access tests, after phase completion)

UX cleanups:
  TASK-S31-014 (independent)
  TASK-S31-015 (date validation, depends on schema understanding)

Integration:
  ALL --> TASK-S31-016 (integration testing + build verification)

Parallelization:
  dev-fullstack-1: Atlas map (TASK-S31-001 through 007) + UX cleanups date validation (015)
  dev-fullstack-2: Phase completion (TASK-S31-008 through 011) + Dashboard quick-access (012-013) + UX cleanups batch (014)
```

### Tasks

---

#### Meu Atlas Rewrite (dev-fullstack-1, 13h)

##### TASK-S31-001: Leaflet setup + base map component with dark mode

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-021 RF-001, SPEC-INFRA-002-S31
- **Description**: Install leaflet + react-leaflet. Create `AtlasMap` component with Next.js dynamic import (ssr: false). Render world map centered on user's trips (auto-fit bounds) or default view (zoom 2, centered on equator) if no trips. Implement light/dark tile switching based on `prefers-color-scheme`. Add Leaflet CSS import in client component only. Include skeleton loading state during dynamic import.
- **Acceptance**: Map renders with OSM tiles (light) and CartoDB tiles (dark). Dynamic import verified (no Leaflet in server bundle). Skeleton shows during load. `npm run build` passes. At least 3 tests (render, dark mode toggle, skeleton).
- **Est**: 3h
- **Dependencies**: SPEC-PROD-021 approved
- **Day**: Day 3

##### TASK-S31-002: Map pins with status-based colors and accessibility

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-021 RF-001/RF-002
- **Description**: Fetch user trips with coordinates via server component data pass (BOLA-enforced). Render Leaflet markers at each trip's (lat, lon). Pin colors: gold/green for completed (all 6 phases), blue with CSS pulse animation for active (1+ phase complete), gray for planned (phase 1 not complete). Pin shape/size MUST differ per status (not color-only) for accessibility. Trips without coordinates excluded from map, passed to fallback list. Custom Leaflet icon using divIcon or SVG markers.
- **Acceptance**: 3 distinct pin visual states (color + shape/size). Only trips with valid lat/lon rendered. BOLA enforced (userId filter). `data-pin-status` attribute on each marker for test hooks. At least 4 tests (3 pin states, coordinate-less exclusion).
- **Est**: 3h
- **Dependencies**: TASK-S31-001
- **Day**: Day 3-4

##### TASK-S31-003: Pin popup with expedition data and CTAs

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-021 RF-003
- **Description**: On pin click, render Leaflet popup (or custom React component bound to marker) containing: destination name, formatted dates (locale-aware), status badge, phase progress ("N/6"), primary CTA ("Continuar Expedicao" / "Ver Summary" / "Iniciar" based on status), secondary CTA ("Ver Detalhes"). Popup closes on outside click or Escape key. Mobile: render as bottom sheet (fixed position, slide-up) instead of centered popup when viewport <= 640px.
- **Acceptance**: Popup shows correct data for clicked trip. CTA text matches status. Popup closes on outside click and Escape. Mobile bottom sheet at 375px. At least 4 tests (popup content, CTA text per status, close behavior, mobile variant).
- **Est**: 3h
- **Dependencies**: TASK-S31-002
- **Day**: Day 4-5

##### TASK-S31-004: Filter chips and empty state

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-021 RF-005/RF-007
- **Description**: Render filter chip row above map: "Todas" (default), "Concluidas", "Em Progresso", "Planejadas". Clicking a filter shows/hides pins by status. URL search param updated (shareable). Empty state: when no trips exist, show map + "Voce ainda nao tem expedicoes" + "Criar Expedicao" CTA. When filter yields no results, show map + "Nenhuma expedicao com este filtro" message. i18n for all labels. Below map: "Expedicoes sem localizacao" section listing coordinate-less trips.
- **Acceptance**: Filters correctly show/hide pins. URL params update. Empty state renders for zero trips. Empty filter state renders. Fallback list shows coordinate-less trips. i18n PT-BR + EN. At least 4 tests (filter, empty state, empty filter, fallback list).
- **Est**: 2h
- **Dependencies**: TASK-S31-003
- **Day**: Day 5

##### TASK-S31-005: Pin clustering for duplicate destinations

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-021 RF-004
- **Description**: When 2+ trips share coordinates within 50km radius, render a numbered cluster marker instead of individual pins. Use Leaflet.markerCluster plugin (MIT license) or custom implementation. Click cluster to expand and show individual trip list. Click individual trip from list to open popup (RF-003).
- **Acceptance**: 2 trips at same city cluster into "2" badge. Click cluster shows list. Click list item opens popup. At least 2 tests (cluster creation, cluster expansion).
- **Est**: 1h
- **Dependencies**: TASK-S31-003
- **Day**: Day 5

##### TASK-S31-006: Atlas map comprehensive test suite

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-QA-005 (all E2E scenarios)
- **Description**: Comprehensive test suite covering: (a) map renders with correct pin count (2 tests), (b) pin colors match status (3 tests), (c) popup content correctness (3 tests), (d) filter functionality (3 tests), (e) empty state (2 tests), (f) coordinate-less fallback list (2 tests), (g) mobile bottom sheet (2 tests), (h) dark mode tile swap (1 test), (i) BOLA on data fetch (1 test), (j) dynamic import SSR guard (1 test), (k) cluster behavior (1 test).
- **Acceptance**: >= 21 new tests. Coverage >= 80% on atlas map files. All SPEC-QA-005 E2E scenarios have test assertions. No regressions.
- **Est**: 3h
- **Dependencies**: TASK-S31-001 through TASK-S31-005
- **Day**: Day 6-7

##### TASK-S31-007: Atlas map eval gate verification

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-QA-005 (EDD)
- **Description**: Run eval suite for atlas map feature. Verify trust score meets baseline. Check for drift. If eval gate fails, diagnose and fix.
- **Acceptance**: `npm run eval:gate` passes. Trust score >= 0.8. No drift > 10%.
- **Est**: 1h
- **Dependencies**: TASK-S31-006
- **Day**: Day 7

---

#### Phase Completion Engine (dev-fullstack-2, 9h)

##### TASK-S31-008: Refine per-phase completion rules in TripReadinessService

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-006 Section 2 (Phase Completion Rules)
- **Description**: Review and refine the existing TripReadinessService to ensure per-phase completion logic matches the rules defined in SPEC-QA-006. Specifically: (a) Phase 1: complete when destination + startDate + endDate all non-null, (b) Phase 2: complete when travelerType set AND (solo OR passengers non-empty for family/group), (c) Phase 3: complete when ALL mandatory checklist items checked (not just "checklist exists"), (d) Phase 4: complete when transport OR accommodation exists (current logic), (e) Phases 5/6: complete when expeditionPhase.status === "completed" (current logic). Add explicit `PhaseCompletionChecker` utility with per-phase methods for testability. Export `PhaseStatus` type: "complete" | "in_progress" | "pending".
- **Acceptance**: Each phase has an explicit, testable completion check. Phase 3 checks mandatory item completion (not just count). Status mapping: complete/in_progress/pending is consistent. At least 8 tests (each phase x 2 states minimum).
- **Est**: 3h
- **Dependencies**: None (can start Day 3)
- **Day**: Day 3

##### TASK-S31-009: Progress bar and dashboard card visual sync

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-006 Section 5 (Status-to-Visual Mapping)
- **Description**: Ensure DashboardPhaseProgressBar, ExpeditionProgressBar, and ExpeditionCard all use the same status-to-color mapping: (a) complete = gold/green filled, (b) in_progress = blue with pulse animation, (c) pending = gray. Extract shared `getPhaseStatusColor(status)` and `getPhaseStatusIcon(status)` utilities to avoid duplication across the 3 progress bars. Dashboard card indicator (badge/border) must match the overall expedition status derived from phase readiness.
- **Acceptance**: All 3 progress bar variants use same color logic. Dashboard card indicator matches readiness. Shared utility extracted and used. At least 4 tests (color mapping for 3 states + card indicator).
- **Est**: 2h
- **Dependencies**: TASK-S31-008
- **Day**: Day 4

##### TASK-S31-010: Auto-completion trigger when all 6 phases done

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-006 E2E-QA006-007
- **Description**: Implement or verify auto-completion logic: when TripReadinessService detects all 6 phases have status "complete", update the expedition status to "completed". This should fire on any phase status update (not requiring user to click a "complete" button). If gamification points are awarded for expedition completion, ensure they fire exactly once. Guard against double-completion (idempotent).
- **Acceptance**: Completing the 6th phase automatically sets expedition to "completed". Points awarded once (not duplicated on page reload). Re-evaluating a completed expedition does not re-trigger. At least 3 tests (trigger, idempotency, not-yet-complete).
- **Est**: 2h
- **Dependencies**: TASK-S31-008
- **Day**: Day 4-5

##### TASK-S31-011: Phase completion comprehensive test suite

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-006 (all scenarios)
- **Description**: Test suite: (a) each phase x complete/partial/pending (18 tests minimum: 6 phases x 3 states), (b) readiness percentage calculation with various weights (3 tests), (c) auto-completion trigger and idempotency (3 tests), (d) BOLA on TripReadinessService (1 test), (e) progress bar color consistency (3 tests for 3 status values).
- **Acceptance**: >= 28 new tests. Coverage >= 80% on phase completion and readiness files. All SPEC-QA-006 E2E scenarios covered. No regressions to existing readiness tests.
- **Est**: 2h
- **Dependencies**: TASK-S31-008 through TASK-S31-010
- **Day**: Day 5-6

---

#### Dashboard Quick-Access Links (dev-fullstack-2, 7h)

##### TASK-S31-012: Quick-access links on ExpeditionCard

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-007 Section 2 (Quick-Access Link Rules)
- **Description**: Add quick-access link section to ExpeditionCard component. Render links conditionally: (a) "Ver Checklist" when phase 3 checklist items count > 0, (b) "Ver Guia" when phase 5 status === "completed", (c) "Ver Roteiro" when phase 6 status === "completed", (d) "Gerar Relatorio" button when phases 3+5+6 all completed (disabled otherwise, with aria-disabled="true"). Links navigate to correct localized URLs. Data comes from TripReadinessService phase readiness array already loaded for dashboard. i18n for all labels. Accessible: aria-labels include destination name, keyboard-focusable, touch targets >= 44px.
- **Acceptance**: Links appear/disappear based on phase status. "Gerar Relatorio" enabled only with all 3 prerequisites. BOLA inherited from dashboard data fetch. Correct localized URLs. aria-labels present. At least 6 tests (visibility per state, navigation, disabled state, BOLA).
- **Est**: 4h
- **Dependencies**: TASK-S31-008 (uses PhaseCompletionChecker output)
- **Day**: Day 5-6

##### TASK-S31-013: Quick-access comprehensive test suite

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-007 (all scenarios)
- **Description**: Test suite: (a) link visibility for full expedition (1 test), (b) link visibility for phases 1-3 only (1 test), (c) link visibility for new expedition (1 test), (d) report button disabled states (2 tests: 2/3 met, 0/3 met), (e) navigation targets correct (3 tests), (f) BOLA on direct URL access (1 test), (g) aria-labels present (1 test).
- **Acceptance**: >= 10 new tests. All SPEC-QA-007 E2E scenarios covered. Coverage >= 80% on quick-access files.
- **Est**: 2h
- **Dependencies**: TASK-S31-012
- **Day**: Day 6-7

---

#### UX Cleanups (split between devs, 5h)

##### TASK-S31-014: Profile link, badge, button replacement

- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-QA-008 CLEANUP-001/002/004
- **Description**: (a) CLEANUP-001: Remove profile/account link from AuthenticatedNavbar top nav. Ensure it exists ONLY in UserMenu dropdown. (b) CLEANUP-002: Set `pointer-events: none` on gamification badge in header. Remove any onClick handler. Set `role="status"`. Ensure it does NOT render as `<a>`, `<button>`, or `<Link>`. (c) CLEANUP-004: Remove "Completar Expedicao" button/text from dashboard and expedition pages. Replace with "Ver Expedicoes" link navigating to expeditions list. i18n for "Ver Expedicoes" / "View Expeditions".
- **Acceptance**: Profile link not in top nav, present in dropdown. Badge has pointer-events: none. No "Completar Expedicao" text in rendered output. "Ver Expedicoes" renders correctly. At least 4 tests (1 per cleanup + 1 i18n).
- **Est**: 2h
- **Dependencies**: None (can start Day 3)
- **Day**: Day 3

##### TASK-S31-015: Date validation (client + server enforcement)

- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-QA-008 CLEANUP-003, SPEC-SEC-002-S31 SEC-S31-005
- **Description**: Strengthen date validation in trip schema and server actions: (a) startDate must be today or later (reject past dates), (b) endDate must be strictly after startDate (reject same-day, reject start > end), (c) Enforce in shared Zod schema (used by both client form and server action), (d) Add i18n error messages for all validation failures. Update Phase1Wizard date inputs to disable past dates in the date picker UI. Ensure `createExpeditionAction` and any `updateTrip` actions use the same schema.
- **Acceptance**: Past start date rejected (client + server). Same-day rejected. Start > end rejected. Valid dates accepted. Server-side enforcement verified independently. i18n error messages in PT-BR + EN. At least 6 tests (4 invalid cases + 2 valid cases).
- **Est**: 3h
- **Dependencies**: None (can start Day 3)
- **Day**: Day 4

---

#### Cross-Cutting

##### TASK-S31-016: Integration testing and build verification

- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: All
- **Description**: Final integration: `npm run build`, full test suite, `npm run lint`, `npm run i18n:check`, verify test count >= 2090. Verify Leaflet NOT in server bundle. Fix any integration issues. Run `npm run eval:gate` for full suite. Prepare PR with spec conformance checklist.
- **Acceptance**: Build clean. Lint clean. i18n check passes. Test count >= 2090. Eval gate passes. Leaflet absent from server chunks. PR ready.
- **Est**: 3h (1.5h per dev)
- **Dependencies**: All other tasks
- **Day**: Day 8

---

## 5. Dev Assignment Summary

### dev-fullstack-1 (20h total -- Atlas Map + Date Validation)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-S31-001 | Leaflet setup + base map + dark mode | 3h | Day 3 |
| TASK-S31-002 | Map pins with status colors + a11y | 3h | Day 3-4 |
| TASK-S31-003 | Pin popup + mobile bottom sheet | 3h | Day 4-5 |
| TASK-S31-004 | Filter chips + empty state | 2h | Day 5 |
| TASK-S31-005 | Pin clustering | 1h | Day 5 |
| TASK-S31-006 | Atlas comprehensive tests | 3h | Day 6-7 |
| TASK-S31-007 | Atlas eval gate | 1h | Day 7 |
| TASK-S31-015 | Date validation (client + server) | 3h | Day 4 |
| TASK-S31-016 | Integration (shared) | 1.5h | Day 8 |
| **Total** | | **20.5h** | |
| **Buffer available** | | **2h** | |

### dev-fullstack-2 (21.5h total -- Phase Completion + Quick-Access + UX)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-S31-014 | UX cleanups (profile, badge, button) | 2h | Day 3 |
| TASK-S31-008 | Phase completion engine refinement | 3h | Day 3 |
| TASK-S31-009 | Progress bar + card visual sync | 2h | Day 4 |
| TASK-S31-010 | Auto-completion trigger | 2h | Day 4-5 |
| TASK-S31-011 | Phase completion tests | 2h | Day 5-6 |
| TASK-S31-012 | Quick-access links on ExpeditionCard | 4h | Day 5-6 |
| TASK-S31-013 | Quick-access tests | 2h | Day 6-7 |
| TASK-S31-016 | Integration (shared) | 1.5h | Day 8 |
| **Total** | | **18.5h** | |
| **Buffer available** | | **4h** | |

---

## 6. Spec Review Schedule (Day-by-Day)

### Day 1 -- Spec Finalization + Cross-Review

| Agent | Deliverable | Deadline |
|-------|-------------|----------|
| tech-lead | SPEC-QA-005/006/007/008 written (this document) | Done |
| tech-lead | SPEC-SEC-002, SPEC-INFRA-002, SPEC-RELEASE-002, SPEC-COST-002, SPEC-AI-002 written | Done |
| tech-lead | Eval datasets created (4 datasets, 36 total cases) | Done |
| product-owner | SPEC-PROD-021 reviewed and finalized | EOD 1 |

### Day 2 -- Approval Gate

| Activity | Participants | Deadline |
|----------|-------------|----------|
| Review SPEC-PROD-021 | tech-lead, architect, ux-designer | AM |
| Review SPEC-QA-005/006/007/008 | tech-lead, qa-engineer | AM |
| Review SPEC-SEC-002-S31 | tech-lead, security-specialist | PM |
| Review SPEC-INFRA-002-S31 | tech-lead, devops-engineer | PM |
| **All specs approved** | tech-lead (gate) | **EOD 2** |
| finops-engineer cost briefing | finops-engineer | EOD 2 |

### Day 3-7 -- Implementation

| Day | dev-fullstack-1 | dev-fullstack-2 |
|-----|-----------------|-----------------|
| Day 3 | TASK-S31-001 (Leaflet setup, 3h) + TASK-S31-002 (start, 1h) | TASK-S31-014 (UX cleanups, 2h) + TASK-S31-008 (phase engine, 2.5h) |
| Day 4 | TASK-S31-002 (finish, 2h) + TASK-S31-015 (date validation, 3h) | TASK-S31-008 (finish, 0.5h) + TASK-S31-009 (visual sync, 2h) + TASK-S31-010 (auto-complete, 2h) |
| Day 5 | TASK-S31-003 (popup, 3h) + TASK-S31-004 (filters, 1.5h) | TASK-S31-011 (phase tests, 2h) + TASK-S31-012 (quick-access, 2.5h) |
| Day 6 | TASK-S31-004 (finish, 0.5h) + TASK-S31-005 (clusters, 1h) + TASK-S31-006 (tests, 2h) | TASK-S31-012 (finish, 1.5h) + TASK-S31-013 (quick-access tests, 2h) |
| Day 7 | TASK-S31-006 (finish, 1h) + TASK-S31-007 (eval, 1h) | Buffer / overflow |

### Day 8 -- QA + Eval Gates + Integration

| Activity | Owner |
|----------|-------|
| Full eval suite run | qa-engineer + both devs |
| Integration build verification | both devs (TASK-S31-016) |
| Security review of map data endpoint | security-specialist |
| Leaflet server-bundle verification | devops-engineer |

### Day 9-10 -- Fixes + Final Testing

| Activity | Owner |
|----------|-------|
| Fix any eval gate failures | Responsible dev |
| Fix code review findings | Both devs |
| Manual verification protocol | Both devs |
| Final `npm run build` + `npm run eval:gate` | Both devs |
| PR creation + spec conformance checklist | tech-lead |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: Leaflet SSR crash | High (if not dynamic imported) | Critical | SPEC-INFRA-002 mandates dynamic import. Verified at build. |
| R-002: OSM tile server slow/down during testing | Low | Medium | CartoDB as backup. Tests use mocked tiles. |
| R-003: Phase completion rule changes break existing tests | Medium | Medium | Refine, do not rewrite. Existing tests are regression baseline. |
| R-004: markerCluster plugin incompatible with react-leaflet 4.x | Medium | Low | Fallback: custom cluster with divIcon. 1h estimate has buffer. |
| R-005: Date validation breaks existing trip creation flows | Medium | High | Run full E2E after schema change. Existing trips with past dates are grandfathered (validation only on create/update). |
| R-006: Quick-access data increases dashboard API payload size | Low | Low | Data already in TripReadinessService response. No extra query. |

---

## 8. EDD (Eval-Driven Development) Integration

### Eval Datasets

| Feature | Dataset File | Cases | Grader |
|---------|-------------|-------|--------|
| Atlas map rendering | atlas-map-rendering.json | 10 | Visual regression + data correctness |
| Phase completion states | phase-completion-states.json | 12 | State transition correctness |
| Dashboard quick-access | dashboard-quickaccess.json | 6 | Link visibility correctness |
| Date validation | date-validation.json | 8 | Input validation correctness |

### Trust Score Targets

| Dimension | Baseline | Target | Threshold |
|-----------|----------|--------|-----------|
| Map rendering | N/A (new) | >= 0.85 | 0.8 |
| Phase completion accuracy | N/A (refined) | >= 0.90 | 0.85 |
| Dashboard data integrity | 0.95 | >= 0.95 | 0.9 |
| Input validation | N/A (new) | >= 0.95 | 0.9 |

---

## 9. Test Strategy

### New Test Categories

| Area | Expected Tests | Coverage Target |
|------|---------------|-----------------|
| Atlas map (base + pins + popup + filters + clusters) | 21+ | >= 80% |
| Phase completion engine (per-phase rules + readiness) | 28+ | >= 80% |
| Quick-access links (visibility + navigation + BOLA) | 10+ | >= 80% |
| UX cleanups (profile, badge, button) | 4+ | Regression |
| Date validation (client + server) | 6+ | >= 80% |
| **Total new tests** | **69+** | |
| **Expected final count** | **~2093+** | |

### Manual Verification Protocol

#### MANUAL-V-S31-001: Atlas Map Rendering
1. Navigate to `/pt/meu-atlas` with 3+ trips.
2. VERIFY: Map renders with tiles visible within 3s.
3. VERIFY: Pins show correct colors (gold, blue, gray).
4. VERIFY: Pin shapes differ per status (not color-only).
5. Click a pin.
6. VERIFY: Popup shows correct destination, dates, status, phase progress.
7. VERIFY: CTA text matches trip status.
8. Click outside popup.
9. VERIFY: Popup closes.

#### MANUAL-V-S31-002: Atlas Map Mobile
1. Set viewport to 375px.
2. Navigate to `/pt/meu-atlas`.
3. VERIFY: Map fills viewport.
4. Tap a pin.
5. VERIFY: Bottom sheet slides up from bottom.
6. VERIFY: Touch targets >= 44px.
7. Swipe down or tap outside.
8. VERIFY: Bottom sheet closes.

#### MANUAL-V-S31-003: Atlas Map Dark Mode
1. Enable dark mode (prefers-color-scheme: dark).
2. Navigate to `/pt/meu-atlas`.
3. VERIFY: Dark tiles render (no white/light tiles).
4. VERIFY: Pins remain visible on dark background.

#### MANUAL-V-S31-004: Phase Completion Visual
1. Have 3 trips with different completion levels.
2. Navigate to dashboard.
3. VERIFY: Progress bar segments match phase statuses.
4. VERIFY: Card indicators match overall expedition status.
5. VERIFY: Color consistency between progress bar and card indicator.

#### MANUAL-V-S31-005: Quick-Access Links
1. Have trip with phases 1-6 complete.
2. Navigate to dashboard.
3. VERIFY: All 4 quick-access items visible on that card.
4. Click "Ver Checklist".
5. VERIFY: Navigates to checklist page for that trip.
6. Navigate back.
7. Check trip with only phases 1-3.
8. VERIFY: Only "Ver Checklist" visible. Others absent.

#### MANUAL-V-S31-006: Date Validation
1. Navigate to Phase 1 wizard (new expedition).
2. Try setting start date to yesterday.
3. VERIFY: Date is blocked or error shown.
4. Set start date to March 25, end date to March 20.
5. VERIFY: Error message shown.
6. Set valid dates (March 25 - March 30).
7. VERIFY: Form submits successfully.

---

## 10. Definition of Done

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes
- [ ] Commits use Conventional Commits with spec IDs and task IDs: `feat(SPEC-PROD-021): description [TASK-S31-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] Prisma JSON writes use `as unknown as Prisma.InputJsonValue` pattern (if applicable)
- [ ] redirect() calls are OUTSIDE try/catch blocks (FIND-M-001)
- [ ] No hardcoded colors -- use theme tokens
- [ ] Leaflet loaded via dynamic import only (no server-side import)

### Sprint-Level DoD
- [ ] All 16 tasks marked complete
- [ ] Code review approved by tech-lead (structured review per template)
- [ ] Test count >= 2090 (target: ~2093 from 2024 baseline + 69 new)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] i18n check passes (`npm run i18n:check`)
- [ ] Eval gate passes (`npm run eval:gate`)
- [ ] Security checklist passed (SPEC-SEC-002-S31)
- [ ] No bias risks identified
- [ ] All manual verification protocols executed and documented
- [ ] Merged to main via PR -- no direct commits
- [ ] Changelog entry references SPEC-PROD-021 and all SPEC-QA IDs

### Security & Privacy Checklist (Sprint 31 specific)
- [ ] Map pin data queries include userId filter (BOLA)
- [ ] Report data access uses BOLA on all data sources
- [ ] Booking codes in reports remain masked
- [ ] Date validation enforced server-side (not just client)
- [ ] No new API keys or secrets introduced
- [ ] No PII in map API responses
- [ ] Leaflet loaded via dynamic import (no SSR)
- [ ] No new dependencies with known CVEs

### Bias & Ethics Checklist (Sprint 31 specific)
- [ ] Pin status colors do not rely on color alone (shape/size accessibility)
- [ ] Filter chips do not discriminate by destination
- [ ] Map tile set provides global coverage (not biased to certain regions)
- [ ] Empty state messages are neutral and encouraging
- [ ] Date validation error messages are neutral (not judgmental)

---

## 11. Sprint 32 Prep (parallel with Sprint 31 implementation)

During Sprint 31, the following specs should be drafted for Sprint 32:

| Spec ID | Title | Owner | Sprint 31 Action |
|---------|-------|-------|-----------------|
| SPEC-PROD-020 | Summary/Report Export (PDF + Share + Print) | product-owner | Draft during Sprint 31 |
| SPEC-ARCH-014 | PDF Generation Architecture | architect | Draft + evaluate during Sprint 31 |
| SPEC-PROD-004 | DnD Time Auto-Adjustment | product-owner | Finalize (eighth carry from Sprint 26) |
| SPEC-ARCH-001 | DnD Time Auto-Adjustment Architecture | architect | Finalize |
