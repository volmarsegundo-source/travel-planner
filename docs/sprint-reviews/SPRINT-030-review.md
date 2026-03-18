# Sprint 30 Review — Atlas Travel Planner (v0.25.0)

**Date**: 2026-03-17
**Version**: 0.25.0
**Tag**: v0.25.0
**Process**: Spec-Driven Development (SDD) + Eval-Driven Development (EDD)
**Budget**: 45h
**Branch**: feat/sprint-30

---

## Summary

Sprint 30 delivered 2 major rewrites + 4 bug fixes using full SDD+EDD process. All features had approved specs before coding. 19 spec documents created, 4 eval datasets defined.

**Key stats:**
- Tests: 2024 (from 1900, +124)
- Build: clean
- Test suites: 133 (from 126, +7)
- New files: 14 created, 18 modified
- Specs: 19 documents across 9 spec types

---

## Delivered Features

### dev-fullstack-1: Autocomplete Rewrite (SPEC-PROD-017, SPEC-ARCH-011)
- GeocodingProvider interface (mirrors AiProvider pattern)
- Mapbox Geocoding v6 primary, Nominatim fallback (ADR-018)
- Redis cache 7-day TTL
- New DestinationAutocomplete: opaque dropdown, flag emojis, skeleton loading
- Keyboard navigation, ARIA combobox, 44px touch targets
- 88 new tests

### dev-fullstack-2: Dashboard Rewrite + Bug Fixes (SPEC-PROD-019, SPEC-ARCH-013)
- ExpeditionsDashboard: filter chips, sort dropdown, CSS Grid 1/2/3 cols
- ExpeditionCardRedesigned: status-accented cards, contextual CTA
- 73 new tests

### Bug Fixes
| Bug | Fix | Spec |
|-----|-----|------|
| Phase 5->6 re-advance | Skip duplicate completePhase5Action on revisit | SPEC-PROD-016 |
| Schengen->Internacional | Badge display uses "international" key | SPEC-PROD-024 |
| Points header update | revalidatePath("/") in point-awarding actions | SPEC-PROD-022 |
| Dates mandatory | handleStep3Next requires dates unless flexibleDates | SPEC-PROD-024 |

---

## SDD Compliance
- 19 spec documents created across 9 types (PROD, UX, ARCH, QA, SEC, INFRA, RELEASE, COST, AI)
- All specs approved before coding
- All commits reference spec IDs
- No spec drift detected

## EDD Compliance
- 4 eval datasets (44 test cases) created
- 3 eval graders defined
- Trust score baseline updated
- CI/CD gates defined (PR >= 0.80, staging >= 0.85, production >= 0.90)

## Architecture Decisions
| ADR | Decision |
|-----|----------|
| ADR-018 | Mapbox Geocoding v6 primary, Nominatim fallback |

## Deferred to Sprint 31
- Map page rewrite (SPEC-PROD-018, SPEC-ARCH-012)
- Summary/Report rewrite (SPEC-PROD-020, SPEC-ARCH-014)
