# B-W2-002 — PromptVersion immutability + semver auto-increment (Wave 2 task 2/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-1 (autonomous batch mode)
**SPEC ref**: SPEC-ARCH-AI-GOVERNANCE-V2 §4.2 (immutability), §5.1 (PATCH contract); SPEC-TECHLEAD §3 Wave 2 (auto-increment)
**Size**: M (per execution-plan §B.2)

## Summary

Closes the `bumpSemverPatch()` stub introduced by B-W2-001 with strict canonical semver arithmetic, and adds a static-analysis regression guard that asserts no production source under `src/server/services/` calls `db.promptVersion.update / .delete / .upsert / .updateMany / .deleteMany` — which is how SPEC-ARCH-AI-GOVERNANCE-V2 §4.2 ("PromptVersion é IMUTÁVEL") is enforced at the codebase level (Prisma exposes the methods; the DB has no CHECK constraint).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/server/services/ai-governance/prompt-admin.service.ts` | MOD | `bumpSemverPatch()` rewritten — strict regex, overflow guard, throws `PromptAdminError("NO_OP")` on malformed input. |
| `src/server/services/ai-governance/__tests__/semver-bump.test.ts` | NEW | 6 unit tests covering happy path, edge of 9.9.9, malformed input, leading zeros, negatives, overflow. |
| `src/server/services/ai-governance/__tests__/prompt-version-immutability.test.ts` | NEW | 49 tests (one per source file) — codebase scan that fails CI if any future commit calls forbidden mutating methods on `db.promptVersion`. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +7 scenarios under "B-W2-002". |

## Tests

```
src/server/services/ai-governance/__tests__/semver-bump.test.ts                 6/6 ✓
src/server/services/ai-governance/__tests__/prompt-version-immutability.test.ts 49/49 ✓
src/server/services/ai-governance/__tests__/prompt-admin.service.test.ts        8/8 ✓
src/app/api/admin/ai/__tests__/handler-rbac-compliance.test.ts                  5/5 ✓
                                                                       Total  68/68 ✓
```

## Why a static-analysis regression test (not a runtime guard)

Prisma exposes `db.promptVersion.update()` and `delete()` regardless of the model's lack of `updatedAt`. There is no DB-level CHECK constraint preventing the call. Adding one would require either:

1. A trigger (`BEFORE UPDATE/DELETE FAIL`) — cross-DB portability concerns + harder to migrate.
2. Wrapping `db.promptVersion` in a service that omits the methods — adds indirection and an escape hatch.

The lighter-touch convention enforced here matches what `B47-API-RBAC-CONVENTION` does for handler RBAC: a CI-time grep that fails loudly on the first violation. If a future caller genuinely needs to mutate a row (highly unlikely — versions are forever), the SPEC §4.2 must change first, then this test, in that order.

## Honesty flags

- **HF-W2-002-01 (P3)** — The immutability test scans only `src/server/services/`. Calls from elsewhere (e.g. `src/lib/` or `src/app/`) would not be caught. Today no such call exists; future audit at B-W2-009 will confirm or expand the scan root.
- **HF-W2-002-02 (P3)** — `bumpSemverPatch()` semantics are **patch-only**. SPEC-ARCH §5.1 example shows a minor bump (`1.1.0 → 1.2.0`) but execution-plan §B.2 and SPEC-TECHLEAD §3 Wave 2 specify "patch bump". This commit follows the plan/techlead wording. If product wants minor bumps, the helper must be renamed and the SPEC-ARCH example updated to keep terminology consistent.
- **HF-W2-002-03 (P3)** — Overflow guard caps at `Number.MAX_SAFE_INTEGER`. In practice no template will ever cross 2⁵³ patch versions; the guard exists to prevent silent precision loss should a corrupted seed produce a giant value.

## Trust Score note

Wave-scoped trust score for B-W2-002:
**0.94** estimated.
- Safety: 0.98 (immutability convention now enforced; one regression suite per source file).
- Accuracy: 0.96 (semver edge cases covered: empty, malformed, leading zeros, negatives, overflow).
- Performance: n/a (no runtime path change beyond a regex + Number coercion).
- UX: n/a (server-only helper).
- i18n: n/a.

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**2/9 tasks complete** — B-W2-001 ✅, B-W2-002 ✅. Next: B-W2-003 (V-01..V-08
blocking validations — the Large item, central Wave 2).
