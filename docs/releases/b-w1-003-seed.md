# Release Notes — B-W1-003 AI Governance V2 Seed Defaults (Sprint 46 Day 2-3)

**Date:** 2026-04-24
**Item:** B-W1-003 (V2 Wave 1 task 3/8, size M)
**Spec:** SPEC-ARCH-AI-GOVERNANCE-V2 §5.3.1 + §8.3
**Author:** release-manager (orchestration)

---

## TL;DR

Adds the default seed for the V2 governance storage layer: 3 `ModelAssignment` rows (plan/checklist/guide) + 13 `AiRuntimeConfig` rows (3 maxTokens, 3 temperature, 4 killSwitch, 3 rateLimitPerHour). Idempotent (Prisma upserts keyed on unique columns). Wired into `prisma/seed.ts` so `npx prisma db seed` populates everything in a single call.

## What changed

| File | Change |
|---|---|
| `prisma/seed-ai-governance-v2.ts` (NEW) | Exports `seedAiGovernanceV2Defaults(db)`. 3 + 13 upserts. Values match SPEC verbatim. JSON-encoded `value` column for `AiRuntimeConfig`. Empty `update: {}` preserves admin-tuned values across re-seeds. |
| `prisma/seed.ts` | +import + +invocation block at the end of `main()`. |
| `src/server/db/__tests__/ai-governance-v2-seed.test.ts` (NEW) | 8 GREEN tests: 3 ModelAssignment count + 3 ModelAssignment per-phase shapes + 1 AiRuntimeConfig count + 1 JSON-encoding + 1 SPEC-verbatim values + 1 idempotency. |
| `docs/specs/bdd/sprint-46-goals.feature` | +5 BDD scenarios (3 ModelAssignment defaults, 13 AiRuntimeConfig defaults, idempotency, flag-independence, SPEC verbatim). |
| `docs/qa/sprint-46-trust-score.md` | +§6 Day 2-3 entry. Composite 0.93 retained. |
| `docs/releases/b-w1-003-seed.md` (NEW) | This file. |

## Behavior summary

| Scenario | Resolution |
|---|---|
| `npx prisma db seed` on a fresh DB | 3 ModelAssignment + 13 AiRuntimeConfig rows created. |
| `npx prisma db seed` on a DB where seed already ran | Same row counts (no duplicates). `updatedAt` refreshes; other columns NOT overwritten (admin-tuned values preserved per `update: {}`). |
| `AI_GOVERNANCE_V2` flag OFF | Seed still runs. The flag gates runtime UI/API consumers, NOT the data layer. |
| Admin tunes `temperature.plan` to `0.5` via V2 admin UI (Sprint 47) | Re-running `npx prisma db seed` does NOT revert it to `0.7` — `update: {}` preserves admin choices. |
| SPEC §5.3.1 / §8.3 values change in a future SPEC bump | Re-seeding a fresh DB picks up the new values. Existing DBs need a manual data migration (out of scope here). |

## Tests

- **8/8 GREEN** in `src/server/db/__tests__/ai-governance-v2-seed.test.ts`
- **171/171 GREEN** in broader `src/server` + `src/lib` regression sweep
- `tsc --noEmit` clean

## Deploy plan

1. Push to `origin/master`.
2. Vercel `prebuild` runs `npx prisma generate` — schema unchanged from B-W1-002, generates clean.
3. Vercel deploy runs `npx prisma migrate deploy` — no new migration in this commit; storage is from B-W1-002 (`452ec7d`).
4. **Seed is NOT auto-run by Vercel** by default. To populate Staging/Prod defaults, run manually after deploy:
   ```bash
   npx prisma db seed
   ```
   Or wire `db seed` into a separate CI job (out of scope here).
5. **Local dev**: pull + run `npx prisma db seed` against Docker Postgres. Idempotent — safe to re-run.

## Rollback

Two options:

- **A — Code revert** (`git revert <hash>` + `git push`): removes the seed function from the codebase but **does NOT remove already-seeded rows from the DB**. Acceptable — rows are inert until Wave 3 reads them.
- **B — Data delete** (manual SQL on Staging/Prod):
  ```sql
  DELETE FROM ai_runtime_configs WHERE key LIKE 'maxTokens.%' OR key LIKE 'temperature.%' OR key LIKE 'killSwitch.%' OR key LIKE 'rateLimitPerHour.%';
  DELETE FROM model_assignments WHERE phase IN ('plan', 'checklist', 'guide');
  ```
  Necessary only if the seeded defaults are causing harm. Unlikely — they're not yet read.

Estimated time: < 2 min for option A, < 10 min for option B (with backup first).

## Critical-path impact

**Unblocks**:
- **B-W1-004** (`AuditLogService`) — independent, but logically next dev item per §3 schedule.
- **Wave 3 / S47** (`AiConfigResolver`) — when it reads `ModelAssignment` and `AiRuntimeConfig` tables, the rows are pre-populated.

V2 Wave 1: **3 of 8 tasks complete** after this commit.

## Follow-ups (Sprint 46 Day 3-5)

Per execution plan §3 schedule:
- **Day 3**: B-W1-004 AuditLogService (size M) + A-01 SEC-AUDIT continues
- **Day 4**: B-W1-005 RBAC + B-W1-006 UI shell + B-W1-008 tests start
- **Day 5**: Wave 1 review + gate

## References

- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §5.3.1 (AiRuntimeConfig allowlist) + §8.3 (ModelAssignment SQL)
- `docs/specs/sprint-46/SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` §3 Wave 1 task table (B-W1-003 row)
- `docs/sprint-planning/sprint-46-execution-plan.md` §2 Block B.1
- `prisma/seed-ai-governance-v2.ts` — seed function
- `prisma/seed.ts` — entry point integration
- B-W1-002 commit `452ec7d` — schema migration that created the target tables
- B-W1-001 commit `29bd1a4` — feature flag (gates runtime consumers, not seed)
