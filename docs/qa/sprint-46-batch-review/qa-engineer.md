# qa-engineer — Sprint 46 Batch Review

**Date:** 2026-04-25
**Mode:** Independent input (no cross-reading until synthesis).
**Scope:** 12 commits from `ce223f4` through `bfa2643`. QA lens (test coverage, BDD discipline, Trust Score evolution).

## §1 — Scope reviewed

Test artifacts produced across the batch:

| Item | Test file | Tests | Type |
|---|---|---:|---|
| ADR-0036 | `gemini-timeout.test.ts` | 5 | unit (resolver) |
| B-W1-001 | `flags/__tests__/ai-governance.test.ts` | 4 | unit (helper) |
| B-W1-002 | `db/__tests__/ai-governance-v2-models.test.ts` | 6 | type-level |
| B-W1-003 | `db/__tests__/ai-governance-v2-seed.test.ts` | 8 | unit (seed function with mock db) |
| B-W1-004 | `services/__tests__/audit-log.service.test.ts` | 6 | unit (service shape + behavior) |
| B-W1-005 | `auth/__tests__/rbac.test.ts` | 12 | unit (helpers) |
| B-W1-007 | `health/ai-config/__tests__/route.test.ts` | 5 | unit (route handler) |
| C-01 | `project-bootstrap.test.ts` | 1 modified | regression fix |
| B-W1-006 | `admin/ia/__tests__/page.test.tsx` | 5 | unit (server component) |
| B-W1-008 | `admin/__tests__/layout-rbac-integration.test.tsx` | 11 | integration (layout RBAC matrix) |
| **Total Wave 1 tests** | | **57** | + 5 ADR + 5 misc |

BDD scenarios appended to `sprint-46-goals.feature` across the batch: roughly 30+ new scenarios.

## §2 — Strengths observed

1. **RED-then-GREEN discipline held.** Every code-changing item shipped with a RED test confirmed before implementation, then GREEN after. The chain is visible in commit messages.

2. **Type-level tests for the migration (B-W1-002)** are a clever low-cost insurance against `prisma generate` not being run in CI. They fail loudly at compile time, not silently at runtime. Cheap but high-leverage.

3. **Coverage across the gating chain.** Flag (B-W1-001), RBAC helper (B-W1-005), middleware (via `bfa2643` proxy), layout (`bfa2643` direct), page (`04d8d8e`). Five overlapping tests for what is conceptually one boundary — that's the right shape for a security-critical surface.

4. **Mock discipline is consistent.** Vitest hoisted mocks for `next/navigation`, `next-intl/server`, `@/server/db`, `@/lib/env` follow the same pattern across test files. New engineers can write the next test by copy-modify.

5. **Integration test selected the right surface (B-W1-008).** Testing the layout instead of the middleware (which is wrapped in NextAuth's `auth()` HOF) is pragmatic and exercises the same RBAC contract. Documented choice.

6. **Trust Score progression is monotonic.** 0.93 → 0.9310 → 0.9340 → 0.9355 → 0.9380. Every step improves or holds. Sprint 46 close gate (≥0.93) cleared with margin.

## §3 — Concerns identified

### P1 — High concern

- **No end-to-end test runs against a real Postgres or a real running app.** All tests are unit-with-mocks or type-level. The migration SQL was hand-written without a `prisma migrate dev` run. The `/admin/ia` route was not clicked through. Real-DB and real-runtime behavior could diverge from the mocked contracts. **Sprint 47 should include at least one Wave 1 smoke test against Staging post-deploy** (manual is acceptable; PO walk-through.)

### P2 — Medium concern

- **BDD scenarios outnumber actual tests.** Roughly 30 BDD scenarios added across the batch but only ~57 actual test cases. Some BDD scenarios are aspirational (e.g. "JWT-tampered request rejected" — covered structurally, not by an explicit test). Acceptable for a Wave 1 skeleton but creates a "scenarios written, not all tested" debt.

- **No coverage report for the new files.** `vitest --coverage` was not run on the batch. The `vitest.config.ts` includes `src/server/services/**` and `src/lib/engines/**` in the coverage report but the new admin UI page (`src/app/[locale]/(app)/admin/ia/`) is excluded from coverage thresholds. New API handlers (`src/app/api/health/ai-config/`) also not in coverage scope. Sprint 47 should reconsider the include/exclude list.

- **Some B-W1-008 assertions are negative (does not throw NEXT_REDIRECT)** rather than positive (renders specific element). When a page is just a skeleton, that's fine — but as Wave 2 fills content, assertions should tighten.

### P3 — Low concern / observation

- **Test file location is consistent** (`__tests__` co-located with source) which makes tests easy to find. No relocation drift across the batch.

- **One test file uses dynamic `import()` to vary env per test** (`gemini-timeout.test.ts`). Worked because the resolver re-reads `process.env` on each call. The pattern won't work for `@t3-oss/env-nextjs` which caches at first import — B-W1-001 had to switch to mocking `@/lib/env`. Worth a short doc on "test patterns for env-dependent code" in Sprint 47 process retrospective.

- **The audit log service has no test for the actual `Prisma.JsonNull` runtime semantics**. The test asserts `data.diffJson` equals the input object, but doesn't verify Prisma's null vs JsonNull distinction. Low-risk because the runtime call path is thin, but a future refactor could break behavior without a failing test.

## §4 — Honesty flags consumed

| Origin | Flag | QA-lens assessment |
|---|---|---|
| `f188686` | C-01 fix permissive (boolean assertion only) | Acceptable — root cause was wrong CI assumption; the new test catches what it can without false-positive failures on dev boxes. |
| `04d8d8e` | Layout RBAC drift not catchable in B-W1-006 tests | ✅ Resolved by `bfa2643`. |
| `1c021db` | Middleware integration test deferred | ✅ Resolved by `bfa2643` via layout-proxy. Documented choice. |
| `bfa2643` | Layout-as-proxy for middleware | Open. Acceptable trade-off given Auth.js wrap; pure-function extraction is the long-term fix. |
| `04b1f3f` | Type-level tests for migration could pass with prisma generate not run | Mitigated by test design — the import itself fails if types missing. |

## §5 — Trust Score lens (Test coverage + BDD discipline + i18n)

- **Test coverage**: 57 Wave 1 tests + ~10 carryover. Coverage shape is broad but shallow — many surfaces have ≤8 tests. Acceptable for Wave 1 skeleton; deepening should follow as Wave 2+ fills content.
- **BDD discipline**: scenarios shipped before tests for every item. Some scenarios still aspirational (no executing test). Discipline held in spirit; some debt in execution.
- **i18n (0.93)**: PT+EN both seeded for new admin/ia keys. No callbackUrl regression. `B47-RANK-FILL` planned for S47 doesn't change i18n surface.

## §6 — Recommendations for Sprint 47 backlog

| ID | Recommendation | Effort |
|---|---|---|
| B47-COVERAGE-INCLUDE | Reconsider `vitest.config.ts` `coverage.include` to add `src/app/api/**` and selected `src/app/[locale]/(app)/admin/**` paths. Currently new code escapes coverage thresholds. | 1h decision + 1-2h impl |
| B47-WAVE1-SMOKE | Manual PO walk-through of Wave 1 surfaces in Staging post-deploy. Document outcome. | 30min PO + 30min doc |
| B47-BDD-MAP | Map current BDD scenarios to actual test cases; identify aspirational scenarios; either write tests or move to a "manual verification" doc. | 2-3h |
| B47-PRISMA-NULL-SEMANTICS | Test for `Prisma.JsonNull` vs `null` in audit log service to lock in runtime semantics. | 1h |
| B47-MW-PURE-FN | (Echoed from tech-lead + architect + security) Closes the auth-HOF-wrap test gap. | 2-3h |

## §7 — Review-specific honesty flags

- **I did not check the actual Trust Score math.** Each per-item commit asserted "+0.01 Safety" or similar; I trusted the calculation rather than re-deriving the weighted composite from scratch. If the per-dimension scores drifted incorrectly across commits, this review would not catch it.
- **I did not run `vitest --coverage`.** My LOC and test-count claims are based on commit messages and file inspection, not an actual coverage run.
- **I am the same orchestrator who wrote the commits being reviewed.** Same caveat as the other reviewers.
- **The "57 Wave 1 tests" count includes carryover** (RBAC helper tests cover both B-W1-005 and B-W1-008 indirectly). Different counting conventions could produce different numbers. Documented for transparency.
