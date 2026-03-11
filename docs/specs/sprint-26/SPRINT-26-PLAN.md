# Sprint 26 Planning Document

**Version**: 1.0.0
**Author**: tech-lead
**Date**: 2026-03-11
**Budget**: 40h (5 working days, 2 devs at 4h/day each)
**Baseline**: v0.18.0, 1612 tests, build clean, lint clean
**Process**: Spec-Driven Development (SDD)

---

## 1. Prioritization & Scope Decision

### Budget Analysis

| Item | Priority | Est. (PO) | Est. (TL) | Specs Required | Decision |
|------|----------|-----------|-----------|----------------|----------|
| ITEM-1: Autocomplete UX fix | P1 | 4h | 4h | SPEC-UX-001 | IN |
| ITEM-2: Guide redesign | P1 | 8h | 9h | SPEC-PROD-003, SPEC-UX-002 | IN |
| ITEM-3: Phase transitions | P1 | 4h | 4h | SPEC-UX-003 | IN |
| ITEM-4: Preferences pagination | P1 | 6h | 6h | SPEC-UX-004 | IN |
| ITEM-5: DnD time adjustment | P2 | 10h | 12h | SPEC-PROD-004, SPEC-ARCH-001 | **DEFERRED to Sprint 27** |
| ITEM-6: Dashboard visual polish | P2 | 6h | 6h | SPEC-UX-005 | IN |
| ITEM-7: Expedition completion summary | P2 | 8h | 9h | SPEC-PROD-005 | IN |
| ITEM-8: Remaining Sprint 25 ACs E2E | P2 | 4h | 0h | N/A | **FOLDED INTO QA** |

### Included: 38h (2h buffer)

| Item | Hours | Justification |
|------|-------|---------------|
| ITEM-1 | 4h | P1, low risk, standalone fix |
| ITEM-2 | 9h | P1, guide is a core feature, touches AI output rendering |
| ITEM-3 | 4h | P1, phase transitions are central to expedition UX |
| ITEM-4 | 6h | P1, preferences are 10 categories -- pagination is usability-critical |
| ITEM-6 | 6h | P2, completes SPEC-PROD-002 deferred ACs (AC-002/003/004/005) |
| ITEM-7 | 9h | P2, completes SPEC-PROD-002 AC-009 -- expedition summary is the capstone UX |

### Deferred to Sprint 27

| Item | Hours | Reason |
|------|-------|--------|
| ITEM-5: DnD time adjustment | 12h | Largest item, requires both SPEC-PROD and SPEC-ARCH, high complexity (drag-and-drop with time recalculation). Does not fit in 40h without displacing P1 work. Also needs SPEC-ARCH-001 which may require architect review time. |
| ITEM-8: E2E validation | 0h | Not a dev task. Sprint 25 remaining ACs will be validated as part of QA conformance audit during Sprint 26. qa-engineer owns this. |

### Deferred Sprint 25 ACs Addressed

This sprint completes the following ACs deferred from Sprint 25:

| AC | Spec | Addressed By |
|----|------|-------------|
| AC-017: Phase 6 "Complete Expedition" action | SPEC-PROD-001 | ITEM-7 (expedition completion summary) |
| AC-002: Trip card phase progress mini-bar | SPEC-PROD-002 | ITEM-6 (dashboard visual polish) |
| AC-003: Single primary action on trip card | SPEC-PROD-002 | ITEM-6 |
| AC-004: Archived trip state | SPEC-PROD-002 | ITEM-6 |
| AC-005: No dead links on trip cards | SPEC-PROD-002 | ITEM-6 |
| AC-009: Expedition completion summary | SPEC-PROD-002 | ITEM-7 |
| AC-011: Data from store (not form state) | SPEC-PROD-002 | ITEM-7 |

---

## 2. Spec Dependency Map (SDD Gate)

All specs below MUST reach "Approved" status before their corresponding tasks can begin implementation. This is the SDD gate -- no exceptions.

```
SPEC-UX-001 (Autocomplete)    --> TASK-26-001, TASK-26-002
SPEC-PROD-003 + SPEC-UX-002   --> TASK-26-003, TASK-26-004, TASK-26-005
SPEC-UX-003 (Phase transitions) --> TASK-26-006, TASK-26-007
SPEC-UX-004 (Preferences)     --> TASK-26-008, TASK-26-009
SPEC-UX-005 (Dashboard)       --> TASK-26-010, TASK-26-011
SPEC-PROD-005 (Completion)    --> TASK-26-012, TASK-26-013, TASK-26-014
```

Specs to be written (owners):
- SPEC-UX-001: ux-designer (Autocomplete UX pattern)
- SPEC-PROD-003: product-owner (Guide redesign -- what and why)
- SPEC-UX-002: ux-designer (Guide redesign -- visual/interaction spec)
- SPEC-UX-003: ux-designer (Phase transition animations/feedback)
- SPEC-UX-004: ux-designer (Preferences pagination/grouping)
- SPEC-UX-005: ux-designer (Dashboard trip card visual spec)
- SPEC-PROD-005: product-owner (Expedition completion summary -- what and why)

**BLOCKER**: Sprint 26 dev work cannot start until at least some specs are Approved. Tech-lead will coordinate spec creation in priority order so devs can start on approved items while remaining specs are finalized.

Spec approval priority order (to maximize parallel dev work):
1. SPEC-UX-001 (smallest, unblocks ITEM-1 early)
2. SPEC-UX-003 (small, unblocks ITEM-3 early)
3. SPEC-UX-004 (medium, unblocks ITEM-4)
4. SPEC-UX-005 (medium, unblocks ITEM-6)
5. SPEC-PROD-003 + SPEC-UX-002 (largest, guide redesign)
6. SPEC-PROD-005 (depends on understanding dashboard state from ITEM-6)

---

## 3. Task Breakdown

### ITEM-1: Autocomplete UX Fix [4h]

#### TASK-26-001: Fix destination autocomplete debounce and result display
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-001
- **Description**: Fix the DestinationAutocomplete component UX issues per spec. Likely includes debounce timing, result list styling, empty state handling, and keyboard navigation improvements.
- **Acceptance**: Autocomplete behaves per all ACs in SPEC-UX-001. Keyboard navigation works (arrow keys, Enter to select, Escape to dismiss). No network requests on every keystroke.
- **Est**: 3h
- **Dependencies**: None (standalone component)

#### TASK-26-002: Tests for autocomplete UX fix
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-001
- **Description**: Unit and interaction tests for the fixed DestinationAutocomplete component. Test debounce, keyboard navigation, empty state, error state, selection behavior.
- **Acceptance**: >= 80% coverage on DestinationAutocomplete. All SPEC-UX-001 ACs have corresponding test assertions.
- **Est**: 1h
- **Dependencies**: TASK-26-001

---

### ITEM-2: Guide Redesign [9h]

#### TASK-26-003: Redesign guide data structure and AI prompt
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-003 (data requirements), SPEC-UX-002 (presentation)
- **Description**: Update the guide generation prompt and response schema to match the redesigned guide structure defined in SPEC-PROD-003. Update Zod validation schema for guide response. Ensure backward compatibility with existing guides (graceful degradation, as established in T-S20-001).
- **Acceptance**: New guide generation produces output matching SPEC-PROD-003 structure. Old guides (pre-redesign) still render without errors. prompt-engineer and finops-engineer consulted on token impact.
- **Est**: 4h
- **Dependencies**: None (backend, can start independently)
- **Cross-cutting**: Notify prompt-engineer for prompt review, finops-engineer for token cost assessment.

#### TASK-26-004: Redesign DestinationGuideWizard UI
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-002
- **Description**: Rebuild the DestinationGuideWizard component to match the new visual spec. New layout, section rendering, expandable/collapsible sections per UX spec.
- **Acceptance**: Guide renders per SPEC-UX-002 visual spec. Both new and legacy guide data render correctly. Responsive on mobile (375px) and desktop (1280px).
- **Est**: 3h
- **Dependencies**: TASK-26-003 (needs to know the new data structure)

#### TASK-26-005: Tests for guide redesign
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-003, SPEC-UX-002
- **Description**: Unit tests for new guide schema validation, guide service changes, and DestinationGuideWizard rendering (new format + legacy graceful degradation).
- **Acceptance**: >= 80% coverage on guide service and schema. Backward compatibility tests pass. Build clean.
- **Est**: 2h
- **Dependencies**: TASK-26-003, TASK-26-004

---

### ITEM-3: Phase Transitions [4h]

#### TASK-26-006: Implement phase transition feedback
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-UX-003
- **Description**: Add visual feedback (loading states, transitions, progress indicators) when navigating between expedition phases. Per SPEC-UX-003 interaction spec. Must not introduce layout shift (CLS = 0).
- **Acceptance**: Phase navigation has visible feedback per SPEC-UX-003. No CLS introduced. Transition completes in under 500ms (per SPEC-PROD-001 constraint). Accessible (screen readers announce phase change).
- **Est**: 3h
- **Dependencies**: None (touches existing navigation, independent of other items)

#### TASK-26-007: Tests for phase transition feedback
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-UX-003
- **Description**: Tests for transition states, loading indicators, accessibility announcements during phase navigation.
- **Acceptance**: All SPEC-UX-003 ACs have test coverage.
- **Est**: 1h
- **Dependencies**: TASK-26-006

---

### ITEM-4: Preferences Pagination [6h]

#### TASK-26-008: Implement preferences pagination/grouping
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-004
- **Description**: Refactor the PreferencesSection component to handle 10 categories with pagination or logical grouping per SPEC-UX-004. Currently all 10 categories render in a single view which is overwhelming. Implement the pagination/grouping pattern defined in the UX spec.
- **Acceptance**: Preferences display per SPEC-UX-004 pattern. All 10 categories accessible. Gamification points still awarded correctly. No data loss on pagination navigation. Keyboard navigable.
- **Est**: 4h
- **Dependencies**: None (standalone component refactor)

#### TASK-26-009: Tests for preferences pagination
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-004
- **Description**: Tests for pagination state, category rendering per page/group, gamification point calculation across pages, data persistence when navigating between pages.
- **Acceptance**: >= 80% coverage on refactored PreferencesSection. Gamification integration tested.
- **Est**: 2h
- **Dependencies**: TASK-26-008

---

### ITEM-6: Dashboard Visual Polish [6h]

#### TASK-26-010: Implement trip card redesign
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-005, SPEC-PROD-002 (AC-002, AC-003, AC-004, AC-005)
- **Description**: Redesign ExpeditionCard component per SPEC-UX-005 visual spec. Add phase progress mini-bar (AC-002), single primary action button (AC-003), archived state visual indicator (AC-004), remove any remaining dead links (AC-005). Replace hardcoded gray colors with theme tokens (addresses existing debt: ExpeditionHubPage).
- **Acceptance**: Trip cards match SPEC-UX-005 visual spec. Phase progress visible on each card. Archived trips show read-only "View" action. No dead links. No hardcoded colors. Keyboard navigable per SPEC-PROD-002 accessibility constraints.
- **Est**: 4h
- **Dependencies**: None (dashboard component, independent)

#### TASK-26-011: Tests for trip card redesign
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-005, SPEC-PROD-002
- **Description**: Tests for trip card rendering states (active, completed, archived), phase progress display, primary action routing, absence of legacy buttons (regression), keyboard navigation.
- **Acceptance**: All SPEC-PROD-002 AC-002/003/004/005 have test assertions. Regression test: legacy buttons do not reappear.
- **Est**: 2h
- **Dependencies**: TASK-26-010

---

### ITEM-7: Expedition Completion Summary [9h]

#### TASK-26-012: Build expedition summary data aggregation service
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-005, SPEC-PROD-002 AC-009
- **Description**: Create a service that aggregates data from all 6 phases for a completed trip. Must read from database (not form state, per SPEC-PROD-002 AC-011). Include: Phase 1 (destination, origin, dates, name, bio), Phase 2 (traveler type, accommodation pref, pace, budget, passengers), Phase 3 (checklist completion count), Phase 4 (transport segment count, accommodation count, mobility selections), Phase 5 (guide generation date), Phase 6 (itinerary day count). Must enforce BOLA check (trip belongs to authenticated user). Booking codes must be masked per SPEC-PROD-002 security constraint.
- **Acceptance**: Service returns complete aggregated data for a trip. BOLA check enforced. Booking codes masked. Explicit select clauses on all Prisma queries (per SR-005). No PII logged.
- **Est**: 4h
- **Dependencies**: None (backend service, can start independently)

#### TASK-26-013: Build expedition completion summary UI
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-005, SPEC-PROD-002 AC-009, SPEC-PROD-001 AC-017
- **Description**: Create the ExpeditionSummary component and wire it into the expedition flow. Accessible from: (a) Phase 6 "Complete Expedition" action (SPEC-PROD-001 AC-017), and (b) dashboard trip card for completed trips. Display all 6 phases data in a consolidated view per spec. Missing data shows "Not provided" indicator (per SPEC-PROD-002 AC-012). All labels locale-aware (per SPEC-PROD-002 AC-010). Proper heading hierarchy for accessibility.
- **Acceptance**: Summary page renders all 6 phases data. Accessible via Phase 6 completion and dashboard. Locale-aware formatting. Missing data indicators. Screen reader friendly (heading hierarchy, labeled values).
- **Est**: 3h
- **Dependencies**: TASK-26-012 (needs the aggregation service)

#### TASK-26-014: Tests for expedition completion summary
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-005, SPEC-PROD-002
- **Description**: Unit tests for aggregation service (all phases data, BOLA check, masked booking codes, missing data handling). Component tests for ExpeditionSummary (rendering all phases, missing data indicators, locale formatting, accessibility).
- **Acceptance**: >= 80% coverage on summary service and component. All SPEC-PROD-002 AC-009/010/011/012 assertions. BOLA test. Build clean.
- **Est**: 2h
- **Dependencies**: TASK-26-012, TASK-26-013

---

## 4. Dependency Map

```
Independent (can start Day 1):
  TASK-26-001 (autocomplete fix)
  TASK-26-003 (guide data/prompt)
  TASK-26-006 (phase transitions)
  TASK-26-008 (preferences pagination)
  TASK-26-010 (trip card redesign)
  TASK-26-012 (summary service)

Sequential chains:
  TASK-26-001 --> TASK-26-002
  TASK-26-003 --> TASK-26-004 --> TASK-26-005
  TASK-26-006 --> TASK-26-007
  TASK-26-008 --> TASK-26-009
  TASK-26-010 --> TASK-26-011
  TASK-26-012 --> TASK-26-013 --> TASK-26-014
```

---

## 5. Dev Assignment Summary

### dev-fullstack-1 (20h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-26-003 | Guide data/prompt | 4h | Day 1-2 |
| TASK-26-005 | Guide tests | 2h | Day 3 |
| TASK-26-006 | Phase transitions | 3h | Day 2-3 |
| TASK-26-007 | Phase transition tests | 1h | Day 3 |
| TASK-26-012 | Summary service | 4h | Day 3-4 |
| TASK-26-013 | Summary UI | 3h | Day 4-5 |
| TASK-26-014 | Summary tests | 2h | Day 5 |
| **Buffer** | | 1h | |

### dev-fullstack-2 (18h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-26-001 | Autocomplete fix | 3h | Day 1 |
| TASK-26-002 | Autocomplete tests | 1h | Day 1 |
| TASK-26-004 | Guide UI redesign | 3h | Day 2-3 |
| TASK-26-008 | Preferences pagination | 4h | Day 3-4 |
| TASK-26-009 | Preferences tests | 2h | Day 4 |
| TASK-26-010 | Trip card redesign | 4h | Day 4-5 |
| TASK-26-011 | Trip card tests | 2h | Day 5 |
| **Buffer** | | 2h | |

---

## 6. Execution Plan (Day-by-Day)

### Day 1 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-26-003: Guide data/prompt restructure | 4h | Backend. Coordinate with prompt-engineer on prompt changes. Notify finops-engineer. |
| dev-fullstack-2 | TASK-26-001: Autocomplete UX fix | 3h | Frontend. Standalone component. |
| dev-fullstack-2 | TASK-26-002: Autocomplete tests | 1h | Tests immediately after fix. |

**End of Day 1**: Autocomplete fix complete (ITEM-1 done). Guide backend in progress.

### Day 2 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-26-006: Phase transition feedback | 3h | Frontend. Independent of guide work. |
| dev-fullstack-1 | TASK-26-007: Phase transition tests | 1h | Tests immediately after. |
| dev-fullstack-2 | TASK-26-004: Guide UI redesign | 3h | Frontend. Depends on TASK-26-003 (guide data structure defined on Day 1). |
| dev-fullstack-2 | Start TASK-26-008: Preferences pagination | 1h | Begin component analysis. |

**End of Day 2**: Phase transitions complete (ITEM-3 done). Guide UI in progress.

### Day 3 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-26-005: Guide tests | 2h | Tests for both backend (TASK-26-003) and frontend (TASK-26-004). |
| dev-fullstack-1 | TASK-26-012: Summary service (start) | 2h | Backend. Begin data aggregation service. |
| dev-fullstack-2 | TASK-26-008: Preferences pagination (continue) | 3h | Continue from Day 2. |
| dev-fullstack-2 | TASK-26-009: Preferences tests (start) | 1h | Begin test writing. |

**End of Day 3**: Guide redesign complete (ITEM-2 done). Preferences pagination near complete. Summary service started.

### Day 4 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-26-012: Summary service (finish) | 2h | Complete aggregation service. |
| dev-fullstack-1 | TASK-26-013: Summary UI | 2h | Start UI component (depends on service). |
| dev-fullstack-2 | TASK-26-009: Preferences tests (finish) | 1h | Complete test suite. |
| dev-fullstack-2 | TASK-26-010: Trip card redesign | 3h | Start dashboard visual polish. |

**End of Day 4**: Preferences pagination complete (ITEM-4 done). Summary service complete. Trip card redesign in progress.

### Day 5 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-26-013: Summary UI (finish) | 1h | Complete UI component. |
| dev-fullstack-1 | TASK-26-014: Summary tests | 2h | Service + UI tests. |
| dev-fullstack-1 | Buffer / build verification / PR prep | 1h | Run full build + lint. Fix any issues. |
| dev-fullstack-2 | TASK-26-010: Trip card redesign (finish) | 1h | Complete component. |
| dev-fullstack-2 | TASK-26-011: Trip card tests | 2h | Tests for all card states. |
| dev-fullstack-2 | Buffer / build verification / PR prep | 1h | Run full build + lint. Fix any issues. |

**End of Day 5**: All items complete. Dashboard polish done (ITEM-6 done). Expedition summary done (ITEM-7 done). Full build verification.

---

## 7. Item Completion Timeline

| Day | Items Completed | Running Test Count (est.) |
|-----|----------------|--------------------------|
| Day 1 | ITEM-1 (Autocomplete) | ~1620 |
| Day 2 | ITEM-3 (Phase transitions) | ~1628 |
| Day 3 | ITEM-2 (Guide redesign) | ~1640 |
| Day 4 | ITEM-4 (Preferences pagination) | ~1650 |
| Day 5 | ITEM-6 (Dashboard), ITEM-7 (Summary) | ~1665 |

---

## 8. Definition of Done

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes (stricter than tests -- catches ESLint+TS issues)
- [ ] Commits use Conventional Commits with spec IDs: `feat(SPEC-UX-001): description [TASK-26-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] Prisma JSON writes use `as unknown as Prisma.InputJsonValue` pattern

### Sprint-Level DoD
- [ ] All 14 tasks marked complete
- [ ] Code review approved by tech-lead (structured review per template)
- [ ] Test count >= 1650 (target: ~1665 from 1612 baseline)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] Security checklist passed for all PRs
- [ ] Bias/ethics checklist passed for all PRs
- [ ] QA conformance audit against all referenced specs
- [ ] Sprint 25 deferred ACs validated (SPEC-PROD-001 AC-017, SPEC-PROD-002 AC-002/003/004/005/009/011)
- [ ] No spec drift detected
- [ ] All commits reference spec IDs
- [ ] Merged to master via PR -- no direct commits
- [ ] SPEC-STATUS.md updated with new specs

### Security Checklist (applies to all PRs)
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized (Zod schemas)
- [ ] PII data not logged or exposed in responses
- [ ] Auth/authz correctly enforced on touched endpoints
- [ ] No SQL injection, XSS, or CSRF vectors introduced
- [ ] Booking codes masked in summary display (SPEC-PROD-002 constraint)
- [ ] BOLA checks present on all data access paths
- [ ] redirect() calls outside try/catch blocks (FIND-M-001)

### Bias & Ethics Checklist
- [ ] No discriminatory logic based on nationality, gender, age, disability, religion
- [ ] Search/sort/filter algorithms treat all users equitably
- [ ] Error messages are neutral and non-judgmental
- [ ] No dark patterns in UX flows

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: Specs not approved in time to start Day 1 | Medium | High (blocks all dev work) | Prioritize spec approval in order listed in Section 2. Devs start on first approved specs while remaining specs complete review. |
| R-002: Guide redesign scope creep (lesson from Sprint 19) | Medium | Medium (could consume 12h+ instead of 9h) | Strict adherence to SPEC-PROD-003 scope. Devs flag any scope increase immediately. Tech-lead rejects work beyond approved spec. |
| R-003: Expedition summary aggregation is more complex than estimated | Low | Medium (could push Day 5 schedule) | 2h buffer available. If needed, defer test task TASK-26-014 to early Sprint 27 (not ideal but acceptable). |
| R-004: Prompt changes for guide redesign increase AI token cost | Low | Low (cost, not timeline) | finops-engineer and prompt-engineer review prompt changes before merge (TASK-26-003 cross-cutting note). |
| R-005: Prisma JSON type issues on new guide data structure | Low | Low (known pattern, documented fix) | Team knows the `as unknown as Prisma.InputJsonValue` pattern (Sprint 20 lesson). Document in task notes. |
| R-006: Build passes but stricter ESLint catches issues late | Low | Medium (delays merge) | Both devs run `npm run build` daily, not just on Day 5. Build verification is part of every task completion. |
| R-007: Trip card redesign conflicts with expedition summary navigation | Low | Low | Both items reference SPEC-PROD-002. tech-lead ensures consistent navigation behavior in code review. TASK-26-010 and TASK-26-013 are by different devs -- coordinate via shared spec. |

---

## 10. Sprint 27 Preview (Deferred Items)

| Item | Est. | Notes |
|------|------|-------|
| ITEM-5: DnD time adjustment | 12h | Needs SPEC-PROD-004 + SPEC-ARCH-001. Request architect to begin SPEC-ARCH-001 during Sprint 26. |
| Any carryover from Sprint 26 | TBD | Buffer should prevent this, but plan for it. |
| Retroactive specs for critical existing features | TBD | Per SDD adoption plan (Sprint 26-27). |
| DEBT-S6-003: Analytics events | 2h | Persistent debt, low priority. |
| DEBT-S7-002: AppError/TripError refactor | 3h | Persistent debt. |

---

## 11. Coordination Notes

### For tech-lead
- Day 0 (pre-sprint): Ensure at minimum SPEC-UX-001 and SPEC-UX-003 are Approved so Day 1-2 work is unblocked
- Day 1: Verify prompt-engineer and finops-engineer are briefed on TASK-26-003 (guide prompt changes)
- Day 3: Mid-sprint check -- all P1 items should be complete or near complete
- Day 5: Final build verification, PR reviews, spec conformance check

### For devs
- TASK-26-003 owner (dev-fullstack-1): Share the new guide data structure with dev-fullstack-2 by end of Day 1 so TASK-26-004 can proceed on Day 2
- TASK-26-010 owner (dev-fullstack-2): Coordinate with TASK-26-013 owner (dev-fullstack-1) on trip card navigation to completed expedition summary
- Both devs: Run `npm run build` after completing each task, not just at sprint end

### For spec owners
- ux-designer: 7 UX specs needed. Prioritize SPEC-UX-001 and SPEC-UX-003 (smallest, highest urgency)
- product-owner: 2 product specs needed (SPEC-PROD-003, SPEC-PROD-005). SPEC-PROD-003 needed by Day 1
- architect: Begin drafting SPEC-ARCH-001 (DnD time adjustment) for Sprint 27 readiness

---

> BLOCKED on: SPEC-UX-001, SPEC-UX-002, SPEC-UX-003, SPEC-UX-004, SPEC-UX-005, SPEC-PROD-003, SPEC-PROD-005 approval. Dev work cannot begin until specs reach Approved status. Tech-lead will coordinate spec creation in priority order to unblock Day 1 tasks first.
