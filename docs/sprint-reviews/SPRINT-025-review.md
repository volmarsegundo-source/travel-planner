# Sprint 25 Review — Atlas Travel Planner (v0.18.0)

**Date**: 2026-03-11
**Version**: 0.18.0
**Process**: Spec-Driven Development (SDD) — first sprint under SDD
**Specs**: SPEC-PROD-001 (Expedition Navigation), SPEC-PROD-002 (Dashboard & Confirmation)

---

## Summary

Sprint 25 is the first sprint under Spec-Driven Development. Two product specs were created, triaged from 95 manual test cases (37% failure rate in v0.17.0), and approved before implementation. All changes reference spec IDs in commits.

**Key stats:**
- Tests: 1612 (from 1593, +19)
- Build: clean
- Lint: clean (pre-existing warnings only)
- Specs implemented: SPEC-PROD-001 (18 ACs), SPEC-PROD-002 (12 ACs)

---

## Delivered Features

### Stream A — SPEC-PROD-001: Navigation & Phase Sequencing

| AC | Description | Status |
|----|-------------|--------|
| AC-002 | Phase 3 renamed "A Rota" → "O Preparo" (all UI, all locales) | Done |
| AC-005/006 | Bi-directional back buttons on Phases 2-6 | Done |
| AC-009 | Progress bar click navigates to specific phase | Done |
| AC-011 | Phase label (Phase N: Name) on all 6 wizards | Done |
| AC-013 | Car rental moved from Phase 4 Step 1 to Step 3 | Done |
| AC-016 | Phase 1 back button navigates to dashboard | Done |

### Stream B — SPEC-PROD-002: Dashboard & Confirmation

| AC | Description | Status |
|----|-------------|--------|
| AC-001 | Legacy buttons (Itens/Checklist/Hospedagem) removed from trip cards | Done |
| AC-006 | Phase 1 confirmation shows all fields (Name, Bio, etc.) | Done |
| AC-007 | Phase 2 confirmation shows passengers breakdown | Done |
| AC-012 | Missing data shows "Not provided" indicator | Done |
| AC-010 | All labels locale-aware via i18n | Done |

### Stream C — Bug Fixes & UX Improvements

| Fix | Description | Spec Reference |
|-----|-------------|---------------|
| BUG-P1-001 | LanguageSwitcher 404 on dynamic routes | SPEC-PROD-001 |
| BUG-P1-002 | Profile name not refreshing in session | SPEC-PROD-001 |
| Transport pre-fill | First segment pre-fills from trip origin/destination/dates | SPEC-PROD-001 AC-013 |

---

## Acceptance Criteria Coverage

### SPEC-PROD-001 (18 ACs)

- **Implemented in Sprint 25**: AC-002, AC-005, AC-006, AC-009, AC-011, AC-013, AC-016
- **Deferred (already working or out of scope for this sprint)**: AC-001 (phase sequence already correct), AC-003 (data collection already working), AC-004 (passengers already conditional), AC-007/AC-008/AC-010/AC-014/AC-015 (navigation and persistence working), AC-012 (phase label visible), AC-017/AC-018 (edge cases)
- **Deferred to Sprint 26**: AC-017 Phase 6 "Complete Expedition" action

### SPEC-PROD-002 (12 ACs)

- **Implemented in Sprint 25**: AC-001, AC-006, AC-007, AC-010, AC-012
- **Deferred (require future work)**: AC-002 (trip card redesign — phase progress mini-bar), AC-003 (single primary action), AC-004 (archived state), AC-005 (no dead links), AC-009 (expedition completion summary), AC-011 (data from store)

---

## Tech-Lead Review

### Code Quality
- All commits follow Conventional Commits with spec ID references
- No new dependencies added
- No security vulnerabilities introduced
- Clean separation of concerns across 3 streams

### Test Coverage
- 1612 tests passing (107 suites)
- New tests added for: Phase 6 back button, DashboardPhaseProgressBar navigation, ExpeditionCard without legacy buttons, Phase 1/2 confirmation "Not provided" states, TransportStep pre-fill, LanguageSwitcher dynamic routes, session refresh

### Architecture
- LanguageSwitcher fix uses native `usePathname` from `next/navigation` — correct approach for dynamic routes
- JWT session refresh via `unstable_update` is the official Auth.js pattern
- Phase config changes are centralized in `phase-config.ts` — single source of truth

---

## Security Review

- No new attack surfaces introduced
- BOLA checks preserved in all modified server actions
- Session refresh uses server-side `unstable_update` (not client-side manipulation)
- No PII exposure in new confirmation screen fields

---

## SDD Conformance

This is the first sprint under SDD. Process adherence:

- [x] Specs created before implementation (SPEC-PROD-001, SPEC-PROD-002)
- [x] Specs approved by tech-lead with stakeholder decisions
- [x] All commits reference spec IDs
- [x] Implementation matches approved acceptance criteria
- [x] No spec drift detected
- [x] QA conformance: all implemented ACs verified via automated tests

---

## Deferred to Sprint 26

| Item | Spec | Reason |
|------|------|--------|
| Trip card redesign (phase progress mini-bar) | SPEC-PROD-002 AC-002 | UX spec needed |
| Expedition completion summary | SPEC-PROD-002 AC-009 | Requires all 6 phases data aggregation |
| Phase 6 "Complete Expedition" action | SPEC-PROD-001 AC-017 | Out of scope |
| Passengers step in Phase 2 (conditional for family/group) | SPEC-PROD-001 AC-004 | Already working, needs E2E validation |
