# Release Notes — B-W1-007 + C-01 + D-01 bundle (Sprint 46 Day 3)

**Date:** 2026-04-25
**Items:** B-W1-007 (size S) + C-01 (size XS) + D-01 (size XS)
**Specs:** SPEC-ARCH-AI-GOVERNANCE-V2 §5.6 (health) + Iter 7 security audit F-01 + Sprint 45 retro Stop St-05
**Author:** release-manager (orchestration)

## TL;DR

Three small wins bundled. **B-W1-007**: public AI-config health endpoint (`GET /api/health/ai-config`). **C-01**: CI hygiene fix for `project-bootstrap.test.ts` (gitignored `.env.local` assertion). **D-01**: explicit `/expeditions` in middleware `PROTECTED_PATH_SEGMENTS` (Iter 7 F-01 follow-up).

## Files

| File | Item | Change |
|---|---|---|
| `src/app/api/health/ai-config/route.ts` (NEW) | B-W1-007 | `GET` handler returning ok/degraded per SPEC §5.6. Fallback to hardcoded defaults on DB error. Always 200 (operational endpoint); 503 only if even fallback fails. |
| `src/app/api/health/ai-config/__tests__/route.test.ts` (NEW) | B-W1-007 | 5 GREEN tests (DB-populated → ok, DB-empty → degraded, DB-throw → degraded, fallback shape, ISO timestamp). |
| `tests/unit/scripts/project-bootstrap.test.ts` | C-01 | `configureEnv` test: skip `.env.local` existence assert on CI runners (gitignored). Asserts only the boolean return contract when absent. |
| `src/middleware.ts` | D-01 | `/expeditions` added explicitly to `PROTECTED_PATH_SEGMENTS`. Comment references Iter 7 F-01. |
| `docs/qa/sprint-46-trust-score.md` | all | +§9 bundled entry. Composite 0.9340 retained. |
| `docs/releases/b-w1-007-c01-d01-bundle.md` (NEW) | all | This file. |

## Tests

- 5/5 GREEN in `health/ai-config/__tests__/route.test.ts`
- 10/10 GREEN in `project-bootstrap.test.ts` (was previously failing on CI)
- `tsc --noEmit` clean

## Behavior at deploy

- `/api/health/ai-config` becomes available; uptime monitors can be wired immediately. Until B-W1-003 seed is run on the target environment, returns `degraded` + `fallback` (recoverable signal).
- CI runs of `project-bootstrap.test.ts` will pass on fresh runners.
- D-01: `/expeditions` already required auth via substring match; explicit entry makes intent visible — zero behavior change.

## Critical-path impact

- **B-W1-007**: Wave 1 task 6/8 done. Remaining critical items: B-W1-006 (UI shell) and B-W1-008 (Wave 1 integration tests).
- **C-01**: removes a long-standing CI noise floor that was masking real failures.
- **D-01**: closes Iter 7 F-01 LOW finding.

## Rollback

`git revert <hash>` reverts all three. Each is independent and small. < 5 min.

## Out-of-scope reminder

This bundle does NOT include:
- B-W1-006 (admin UI shell — heaviest Wave 1 item; deferred)
- B-W1-008 (Wave 1 integration tests — depends on B-W1-006)
- C-02 (EDD Eval Gates fix — not bundled here)
- D-02 (canUseAI(null) F-02 MEDIUM — not bundled here)
- C-03 (Redis Staging provider decision — PARAR programmed; needs PO call)

## References

- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §5.6 (health response contract) + §6.2 (graceful degradation)
- `docs/qa/bug-c-f3-iter7-security-audit.md` F-01 LOW (D-01 source)
- `docs/sprint-reviews/sprint-45-retrospective.md` Stop St-05 (CI noise rationale for C-01)
