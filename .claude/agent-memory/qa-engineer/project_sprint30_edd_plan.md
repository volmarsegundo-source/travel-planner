---
name: Sprint 30 EDD Plan
description: Sprint 30 covers 4 rewrites (autocomplete, map, dashboard, summary) with eval datasets, graders, and CI/CD gates. Trust score target 0.90+.
type: project
---

Sprint 30 delivers 4 feature rewrites with full EDD coverage.

**Why:** Current trust score is ~0.84. UX dimension is 0.70 (lowest), Accuracy is 0.80. Sprint 30 targets 0.90+ composite by improving autocomplete quality and dashboard/map UX.

**How to apply:**
- All QA specs are in `docs/specs/sprint-30/SPEC-QA-001..004`
- 4 eval datasets totaling 44 test cases in `docs/evals/datasets/`
- 3 new grader stubs in `docs/evals/graders/`
- Summary plan: `docs/specs/sprint-30/EDD-SPRINT-30-PLAN.md`
- SPEC-PROD for map, dashboard, and summary NOT yet created (risk: SPEC-QA-002/003/004 may need revision)
- Autocomplete rewrite spec: SPEC-PROD-017 (approved, 14 ACs)
- CI/CD gates: PR >= 0.80, Staging >= 0.85, Production >= 0.90
- 18 new E2E scenarios planned (7 P0, 11 P1)
- Existing autocomplete E2E tests (10) need refactoring for new component structure
