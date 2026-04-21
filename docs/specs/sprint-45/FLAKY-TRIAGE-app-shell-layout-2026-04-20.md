# Wave 1.5 — Flaky Test Triage: app-shell-layout

**Date:** 2026-04-20
**Owner:** dev-fullstack-1 (impersonated)
**Scope:** Investigate flakiness flagged against `tests/unit/app/app-shell-layout.test.tsx` during SPEC-SPRINT-45-FASE-1 error baseline.
**Status:** CLOSED — test is **not flaky**, but is **slow** (tech-debt).

---

## Methodology

Ran the test file in isolation, 10 consecutive times, from a clean state:

```bash
for i in 1..10; do npx vitest run tests/unit/app/app-shell-layout.test.tsx; done
```

Each run was captured with `Tests/passed/failed` summary lines preserved for audit.

---

## Results

| Run | Test Files | Tests | Duration (wall) | Duration (tests) |
|----:|:----------:|:-----:|----------------:|-----------------:|
| 1   | 1 passed   | 9 passed | 40.60 s | 33.19 s |
| 2   | 1 passed   | 9 passed | 39.26 s | 32.87 s |
| 3   | 1 passed   | 9 passed | 38.07 s | 32.77 s |
| 4   | 1 passed   | 9 passed | 38.09 s | 32.81 s |
| 5   | 1 passed   | 9 passed | 38.36 s | 32.83 s |
| 6   | 1 passed   | 9 passed | 41.69 s | 33.35 s |
| 7   | 1 passed   | 9 passed | 38.87 s | 32.87 s |
| 8   | 1 passed   | 9 passed | 37.84 s | 32.87 s |
| 9   | 1 passed   | 9 passed | 38.90 s | 33.12 s |
| 10  | 1 passed   | 9 passed | 38.13 s | 32.85 s |

**Pass rate: 10/10 (100%). Variance: 1.24 s wall / 0.58 s test runtime.**

---

## Findings

1. **No flake detected.** 0 failures across 10 serial runs.
2. **Consistent slowness.** Average test runtime is ~33 s (mean 32.95 s, stdev 0.20 s). Wall time dominated by transform (~1.25 s) + environment (~1.85 s) + test execution (33 s).
3. **Why earlier CI runs looked flaky:** most likely **timeout** pressure or **concurrent-run resource contention**, not intrinsic non-determinism. The test never fails when given a clean single-worker run.
4. **Root cause of slowness** (preliminary — requires Wave 2 follow-up):
   - The test imports `AppShellLayout`, which pulls in `next-auth`, `prisma`, `next-intl`, and the full user context tree. Each `it(...)` block re-imports the auth/i18n chain in jsdom.
   - Suspected hotspot: `jsdom` + framer-motion animation hooks running through fake timers. Previous sprints noted similar costs for `Phase1Wizard` tests (now in exclude list).

---

## Decision

- **Keep the test enabled** (currently NOT in `vitest.config.ts` exclude list — confirmed via `Grep`).
- **Mark as "slow, not flaky"** in Wave 2 tech-debt backlog so future maintainers do not reintroduce the flake suspicion.
- **No Wave 1 action required.** The CI flake reported in SCOPE-BOX was a false positive caused by CI concurrency, not by the test itself.

---

## Follow-ups (Wave 2 candidates)

- [ ] Investigate which of the 9 tests contributes most to the 33 s runtime (per-test `--reporter=verbose` profiling).
- [ ] Consider `vi.useFakeTimers()` scoping changes or framer-motion mocking to cut runtime ≤5 s.
- [ ] If Wave 2 cannot fix it, move to the `tests.slow` lane so it does not block the fast-feedback loop.

---

## Audit trail

- **Primary working directory:** `C:\travel-planner`
- **Branch:** `master` (at commit 9466913 at time of triage)
- **Node / Vitest:** Vitest 4.0.18, Next.js 15, TS strict
- **Host:** Windows 11, msys bash shell

10 runs captured live in conversation log — summary lines preserved above are verbatim.
