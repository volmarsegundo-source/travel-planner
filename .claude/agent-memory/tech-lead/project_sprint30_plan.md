---
name: Sprint 30 Planning State
description: Sprint 30 scope, schedule, assignments, and key decisions -- Autocomplete Rewrite + Dashboard Overhaul + Bug Fixes
type: project
---

Sprint 30 planned on 2026-03-17. Theme: Autocomplete Rewrite + Dashboard Overhaul + Bug Fixes.

**Why:** v0.24.0 shipped Phase Navigation Redesign (1869 tests). Four rewrites proposed but only 2 fit in 45h budget. Autocomplete and Dashboard are highest user impact.

**How to apply:**
- Budget: 45h (2 devs, 10 days including 2 spec days)
- Baseline: v0.24.0, 1869 tests, build clean
- Test target: 1940+
- dev-fullstack-1: Autocomplete rewrite (TASK-S30-001 through 007, 17.5h)
- dev-fullstack-2: Dashboard rewrite + bug fixes (TASK-S30-008 through 016, 19h)
- Days 1-2: Spec writing + cross-review + approval gate
- Days 3-7: Implementation
- Days 8-10: QA + eval gates + fixes + PR

**Scope IN:**
- Autocomplete rewrite: provider adapter, offline fallback, flags, ARIA, recent searches, mobile overlay (12h)
- Dashboard rewrite: sort/filter service, UI controls, card refinement, loading states (10h)
- P1 bugs: TransportStep pre-fill, Phase6 back nav, theme tokens (3h)
- Tests + eval gates (10h)

**Scope OUT (deferred to Sprint 31):**
- Map page rewrite (needs library eval)
- Summary/Report rewrite (needs PDF library eval)
- DnD time auto-adjustment (seventh carry)

**New specs (all Draft):**
- SPEC-PROD-017 (exists), SPEC-PROD-018, SPEC-UX-020, SPEC-UX-021, SPEC-ARCH-011, SPEC-ARCH-012, SPEC-QA-001

**Key risk:** SPEC-ARCH-011 provider decision blocks autocomplete implementation. Mitigation: provider adapter is pluggable, start with offline fallback first.
