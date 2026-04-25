# Release Notes — B-W1-005 RBAC Helper + Middleware Gate (Sprint 46 Day 3)

**Date:** 2026-04-25
**Item:** B-W1-005 (V2 Wave 1 task 5/8, size M)
**Spec:** SPEC-ARCH-AI-GOVERNANCE-V2 §7.7
**Author:** release-manager (orchestration)

## TL;DR

Two-tier RBAC for the AI Governance Central. New helper `src/lib/auth/rbac.ts` + middleware extension allowing `admin | admin-ai | admin-ai-approver` to access `/admin/ia` (other `/admin/*` paths stay admin-only). API handlers (Wave 2+) will use the same helper for per-action checks (read+edit vs promote).

## Files

| File | Change |
|---|---|
| `src/lib/auth/rbac.ts` (NEW) | `hasAiGovernanceAccess(role)` — admin / admin-ai / admin-ai-approver. `hasAiGovernanceApproverAccess(role)` — admin / admin-ai-approver only. Pure functions, Edge-safe. |
| `src/lib/auth/__tests__/rbac.test.ts` (NEW) | 12 GREEN tests covering both helpers across 4 valid roles + 5 invalid inputs. |
| `src/middleware.ts` | Existing `/admin` block extended: `/admin/ia` checks `hasAiGovernanceAccess`; other `/admin/*` stays admin-only. Imports `hasAiGovernanceAccess`. |
| `docs/specs/bdd/sprint-46-goals.feature` | +7 scenarios. |
| `docs/qa/sprint-46-trust-score.md` | +§8 Day 3 entry. Safety 0.98→0.99 (+0.01); composite 0.9310→0.9340. |
| `docs/releases/b-w1-005-rbac.md` (NEW) | This file. |

## Behavior

| Path | admin | admin-ai | admin-ai-approver | user / other |
|---|:-:|:-:|:-:|:-:|
| `/admin/ia` and sub-paths | ✅ | ✅ | ✅ | redirect → /expeditions |
| `/admin/dashboard` (and other `/admin/*`) | ✅ | redirect | redirect | redirect |
| Other protected routes (`/expeditions`, `/atlas`, etc.) | ✅ | ✅ | ✅ | ✅ (auth-only) |

API routes (`/api/admin/ai/*`) are NOT gated by middleware (line 40: API routes return early). Wave 2+ handlers MUST call `hasAiGovernanceAccess` / `hasAiGovernanceApproverAccess` themselves. Documented in `rbac.ts` JSDoc.

## Tests

- 12/12 GREEN in `rbac.test.ts`
- `tsc --noEmit` clean
- Middleware test in `tests/unit/scripts/middleware-tests` deferred — middleware integration tests are best done with full Next.js test harness, currently captured by Wave 1 integration tests B-W1-008.

## Critical-path impact

Unblocks B-W1-006 (admin UI shell — needs the route to be reachable for non-admin testing) and B-W2-* (API handlers consume the helper). V2 Wave 1: **5 of 8 tasks complete**.

## Behavior at deploy

Zero observable change unless a user has `admin-ai` or `admin-ai-approver` role. No such users exist in the project DB today; roles are added via direct admin DB edit (no UI to assign roles in V1). Once Wave 2+ ships role-assignment UI, the gate becomes relevant.

## Rollback

`git revert <hash>` reverts both the helper and the middleware extension. Backward-compatible: existing `admin` role still works after revert. < 5 min.

## References

- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §7.7 (RBAC matrix)
- `src/middleware.ts` — extended admin route block
- `src/lib/auth/rbac.ts` — helper source
