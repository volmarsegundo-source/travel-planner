# F-OPS-04 — Idempotent `seed:v2-only` script

**Sprint:** 46.5 fix bundle
**Date:** 2026-04-27
**Author:** dev-fullstack-1 (Sprint 46.5 autonomous)
**Predecessor:** Sprint 46 walk-through investigation v2 (commit `1806731`)

## Summary

Adds a wrapper script that invokes ONLY `seedAiGovernanceV2Defaults` (B-W1-003) without the full `prisma/seed.ts` side-effects (test user `test@test.com` with hardcoded password, 3 PromptTemplate upserts).

**Why a wrapper:** Staging already has 3 PromptTemplate rows from earlier sprints; running full `prisma db seed` would touch them via upsert, advance `updatedAt`, and surprise admins during walk-through audit. Worse — full seed in Prod would create live `test@test.com` credentials with valid `Test1234!` password, which is a security concern. The wrapper script restricts the operation to **only** the V2 governance defaults that are actually missing in Staging post-walk-through-investigation-v2.

The underlying function `seedAiGovernanceV2Defaults` was already idempotent by design (B-W1-003 used `upsert` with `update: {}` to preserve admin-tuned values on re-runs). F-OPS-04 just wraps it.

## Files

| Path | Status | Notes |
|---|---|---|
| `prisma/seed-v2-only.ts` | NEW | Wrapper that loads `.env.local`, prints pre/post counts, invokes only the V2 seed function. |
| `prisma/__tests__/seed-v2-only.test.ts` | NEW | 4 unit tests asserting idempotency contract: 3 ModelAssignment upserts, 13 AiRuntimeConfig upserts, all with `update: {}`, re-running produces same call shape. |
| `package.json` | MOD | Adds `seed:v2-only` script. |

## Tests

```
prisma/__tests__/seed-v2-only.test.ts          4/4  ✓
```

## Usage (operational)

```bash
DATABASE_URL=<staging-or-prod-url> npm run seed:v2-only
```

Output prints pre + post counts + delta:

```
[seed:v2-only] Running seedAiGovernanceV2Defaults (idempotent upsert)…
[seed:v2-only] Pre: model_assignments=0 ai_runtime_configs=0
[seed:v2-only] Post: model_assignments=3 ai_runtime_configs=13
[seed:v2-only] Inserted: model_assignments+3 ai_runtime_configs+13
[seed:v2-only] Done.
```

Re-running will print `+0 +0` (no-op) which is the idempotency proof.

## Honesty flags

- **HF-OPS-04-01 (P3)** — Operational scripts traditionally aren't unit-tested in this repo (no other entries in `prisma/__tests__/`). This test exists to lock in the idempotency contract that F-OPS-03 depends on.
- **HF-OPS-04-02 (P3)** — Wrapper does NOT seed PromptTemplate or KillSwitch rows. Those are in `prisma/seed.ts` and irrelevant for V2 defaults specifically. If a future Wave needs them in Staging/Prod, a dedicated wrapper (e.g. `seed:prompt-templates-only`) can be added.

## Sprint 46.5 progress

- F-OPS-01 ✅ (PO Vercel env)
- F-OPS-02 ✅ (PO Neon verification)
- **F-OPS-04 ✅** (this commit)
- F-OPS-03 — next, depends on operator running the script against Staging
- F-FIX-05, F-OPS-06, F-RETRO-07, F-S47-08, F-FINDING-09 — pending
