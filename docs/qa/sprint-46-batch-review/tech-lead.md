# tech-lead — Sprint 46 Batch Review

**Date:** 2026-04-25
**Mode:** Independent input (no cross-reading until synthesis).
**Scope:** 12 commits from `ce223f4` (Day 1) to `bfa2643` (Day 3, Wave 1 close).

## §1 — Scope reviewed

| Day | Commit | Item | LOC |
|---|---|---|---:|
| 1 | `ce223f4` | ADR-0036 impl (Gemini timeout env override) | +239 / −9 |
| 1 | `36076ee` | Profit/Ranking grounding report | +212 |
| 2 | `502b336` | Pendentes recommendations doc | +290 |
| 2 | `16a7e16` | 3 PO recommendations applied (R-01-A, R-02-B, R-03-A) | +349 / −5 |
| 2 | `29bd1a4` | B-W1-001 feature flag | +252 |
| 2 | `452ec7d` | B-W1-002 Prisma migration (5 models) | +658 |
| 2-3 | `04b1f3f` | B-W1-003 seed defaults | +519 |
| 3 | `01ad8a6` | B-W1-004 AuditLogService | +315 |
| 3 | `1c021db` | B-W1-005 RBAC + middleware | +257 / −3 |
| 3 | `f188686` | B-W1-007 health + C-01 + D-01 bundle | +308 / −6 |
| 3 | `04d8d8e` | B-W1-006 admin UI shell | +406 / −1 |
| 3 | `bfa2643` | B-W1-008 Wave 1 integration tests + CLOSE | +283 |

Areas touched: env schema, Prisma schema + migration, server services (audit log), middleware (RBAC), admin layout, admin page (server component), admin tabs (client component), i18n (PT+EN), CI test infrastructure.

## §2 — Strengths observed

1. **Per-item template held.** Every Wave 1 item shipped with: BDD scenarios → RED tests → impl → security smoke → trust score note → release notes → commit. The template scaled from S to M items without dropping discipline.

2. **Schema → seed → service layering is clean.** B-W1-002 (schema) → B-W1-003 (seed of defaults) → B-W1-004 (service) sequenced correctly. Each layer testable in isolation and built without leaking abstraction (e.g. seed function takes `PrismaClient` as injected param, not bound to global).

3. **Defense-in-depth at the RBAC boundary.** Middleware (B-W1-005) AND parent admin layout (B-W1-006) both check the same path-aware rule. Either alone would suffice; together they tolerate one drift without exposing the route.

4. **ADR-0036 compatibility check paid off.** Day 1's ADR §4 ("V2 Waves impact") explicitly verified zero rework risk for Waves 1-2; Wave 1 shipped with no schema or contract surprises traceable to Gemini-timeout decisions.

5. **Honesty flags are first-class.** Each commit's message and release notes explicitly enumerate flags. B-W1-008 explicitly closes two flags from earlier commits — that's a functioning honesty loop, not just record-keeping.

## §3 — Concerns identified

### P1 — High concern

- **Middleware unit-test gap remains.** B-W1-008 closes the integration test via the layout (defense-in-depth proxy) but the middleware itself has no direct unit test. The `auth()` HOF makes harnessing hard; the proposed Sprint 47 follow-up (extract middleware decision into a pure function) is the right move and shouldn't slip past Sprint 47.

### P2 — Medium concern

- **`HARDCODED_FALLBACK` in `health/ai-config/route.ts` duplicates seed defaults in `seed-ai-governance-v2.ts`.** Drift risk if one changes and the other doesn't. Already flagged in B-W1-007 release notes. Should be a shared constants module.

- **Seed not auto-run.** B-W1-003 release notes flag that Vercel does NOT auto-run `prisma db seed`. Staging/Prod operators must remember. If skipped, the health endpoint will show `degraded + fallback` indefinitely. Process risk: low (health endpoint is the canary), but documentation alone isn't a guarantee.

- **`AdminNav` not extended with `/admin/ia` link.** B-W1-006 intentionally left this out to minimize coupling. Result: route is reachable only by direct URL until Wave 2 wires the nav. Acceptable for the short Wave 1 → Wave 2 gap; needs to land in Wave 2.

### P3 — Low concern / observation

- **Tab state in URL via `?tab=` re-renders the server component on tab change.** Trade-off PO might revisit if the tab content becomes expensive (Wave 4 dashboard). Today: irrelevant (skeletons).

- **Migration filename divergence from SPEC.** B-W1-002 used today's date instead of SPEC §8.1's prescribed name to maintain Prisma chronological ordering. Documented in commit; fine call.

- **Two cost models still coexist** (heuristic + per-token MODEL_PRICING). R-02-B documented this is intentional. Sprint 47's `B47-COST-TILE` will surface the divergence as an admin tile. Trust the documentation pact; don't re-litigate.

## §4 — Honesty flags consumed

Validation pass on flags raised in earlier commits:

| Origin | Flag | Resolution status |
|---|---|---|
| `f188686` | Middleware integration test deferred | ✅ Resolved by `bfa2643` via layout-as-proxy. |
| `04d8d8e` | Layout RBAC drift not catchable in B-W1-006 tests | ✅ Resolved by `bfa2643` 11-test matrix. |
| `f188686` | C-01 fix is permissive when `.env.local` absent | ⏸ Acknowledged trade-off; F-01 framing prioritized "loud-on-CI" — no follow-up needed. |
| `f188686` | `HARDCODED_FALLBACK` duplicates seed defaults | ⏸ Open; will cause drift if either side changes. **P2 above.** |
| `04d8d8e` | AdminNav not extended with /admin/ia link | ⏸ Open; needs Wave 2. **P2 above.** |
| `502b336` | Earlier grounding overstated ghost-rank count | ✅ Self-corrected in commit body. |
| `502b336` | Cost-model "divergence" framing was overstated | ✅ Reframed via R-02-B as intentional design. |

5 flags resolved. 2 remain open and tracked above.

## §5 — Trust Score lens (Performance + Accuracy)

- **Performance (0.82, unchanged across batch)**: every Wave 1 commit was net-zero on hot-path performance. The deduction stems from no real benchmark — still true. **Action**: Sprint 47 should attempt at least one Wave 3 hot-path microbench (`AiConfigResolver` polling overhead) to validate the SPEC's "<20ms p99" target.
- **Accuracy (0.95→0.96 in `bfa2643`)**: drift-prevention test value is real. Continue this pattern — every cross-cutting change should ship a drift test for the boundary it crosses.

## §6 — Recommendations for Sprint 47 backlog

| ID | Recommendation | Effort |
|---|---|---|
| B47-MW-PURE-FN | Extract middleware RBAC decision into a pure function unit-testable from both middleware and layout. Closes the P1 here. | 2-3h |
| B47-FALLBACK-CONST | Shared constants module for `HARDCODED_FALLBACK` and seed defaults. P2 here. | 1-2h |
| B47-NAV-IA-LINK | Wave 2 task to extend `AdminNav` with `/admin/ia` entry, gated by feature flag. | 1h |
| B47-WAVE3-MICROBENCH | Run a hot-path microbench during Wave 3 to verify SPEC §6.2 polling-overhead target. | 2-3h |

(Note: `B47-RANK-FILL` and `B47-COST-TILE` already in Sprint 47 BACKLOG from `16a7e16`.)

## §7 — Review-specific honesty flags

- **I did not exercise the live system.** This review reads commits, tests, and docs. I did not run `npm run dev`, click through `/admin/ia`, or inspect Vercel deploy logs. If the runtime behavior diverges from the test contract, this review won't catch it.
- **I am the same orchestrator who wrote the commits being reviewed.** A truly independent reviewer would have stronger detection of motivated reasoning. The 4-agent format mitigates by providing 3 other lenses, but it cannot fully substitute for fresh eyes.
