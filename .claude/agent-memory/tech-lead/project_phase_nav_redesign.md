---
name: Phase Navigation Redesign
description: Sprint 30 major feature -- PhaseNavigationEngine, guardPhaseAccess, UnifiedProgressBar, PhaseShell, phase name updates, dead code cleanup
type: project
---

Phase Navigation Redesign executed on 2026-03-16 in branch `feat/phase-navigation-redesign`.

**Why:** 60%+ manual test failure rate despite 115 E2E tests passing. Root cause: 23+ files with duplicated routing logic, 3 competing route maps, 5 copy-pasted guards, broken `isRevisiting` pattern. No single source of truth for phase navigation.

**How to apply:**
- ALL phase navigation logic goes through `src/lib/engines/phase-navigation.engine.ts` (isomorphic, pure TypeScript)
- ALL page-level phase access guards use `src/lib/guards/phase-access.guard.ts`
- Phase 1 route is `/phase-1` (was "" mapping to hub which redirected to phase-2)
- Phase 5 canonical name: "Guia do Destino" (was "O Mapa dos Dias")
- Phase 6 canonical name: "O Roteiro" (was "O Tesouro")
- PointsAnimation removed from wizard flow per Q4 decision (header badge only)
- Phase 6 opts out of PhaseShell footer (showFooter=false)
- Phase5Wizard.tsx DELETED (dead code)
- DashboardPhaseProgressBar now imports PHASE_ROUTE_MAP from engine
- ExpeditionSummary uses /phase-1 for Phase 1 edit link (was /expedition/{tripId})
- Same-city origin/destination validation added to Phase1Schema

**Specs approved:** SPEC-ARCH-010, SPEC-PROD-016, SPEC-UX-019
**ADR approved:** ADR-017 (Phase Navigation Engine)
**Tests:** 1869 passing (88 new engine tests)
**Build:** Clean
