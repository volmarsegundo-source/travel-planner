---
name: Sprint 30 Phase Navigation Crisis
description: Critical product review triggered by 60%+ manual test failure rate in v0.23.0 — phase navigation is architecturally broken despite 115 E2E tests passing
type: project
---

Phase navigation has been the primary recurring failure source since Sprint 25. SPEC-PROD-001 was approved and marked "Implemented" but QA conformance is only partial (7/18 ACs per SPEC-STATUS.md). The same 5 bugs have been "fixed" multiple times:

1. Phase guards block valid navigation (users get stuck)
2. Revisiting completed phase shows empty form (DEF-004, third carry as T-S29-005)
3. Progress bar behavior inconsistent across phases
4. Phase 6 has no Back button (explicitly deferred in SPEC-PROD-001 Out of Scope)
5. After Phase 6 completion, progress bar shows all phases as inactive

**Why:** E2E tests pass but cover happy path only. Manual testing reveals navigation sequencing, guard logic, and state restoration failures that automated tests don't catch (lesson documented from Sprint 22-S and v0.17.0 manual testing).

**Critical finding from phase-config.ts:** The config file defines 8 phases (O Chamado, O Explorador, O Preparo, A Logistica, O Mapa dos Dias, O Tesouro, A Expedicao, O Legado) but only 6 are active in the product. Phases 7-8 are future roadmap. There is a naming discrepancy — phase names in config differ from what was described in the critical product review prompt and memory. The authoritative 6-phase sequence per SPEC-PROD-001 is: Phase 1 "O Chamado", Phase 2 "O Explorador", Phase 3 "O Preparo", Phase 4 "A Logistica", Phase 5 "A Conexao", Phase 6 "O Roteiro".

**How to apply:** Any sprint planning involving phase navigation must account for this as a systemic, architectural issue — not a collection of individual bugs. Recommend a dedicated navigation consolidation sprint before new feature development.
