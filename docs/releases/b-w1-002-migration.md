# Release Notes — B-W1-002 AI Governance V2 Migration (Sprint 46 Day 2 cont.)

**Date:** 2026-04-24
**Item:** B-W1-002 (V2 Wave 1 longest-pole, size L)
**Spec:** SPEC-ARCH-AI-GOVERNANCE-V2 §4 + §8
**Migration:** `20260424120000_ai_governance_v2`
**Author:** release-manager (orchestration)

---

## TL;DR

Adds the storage layer for the AI Governance V2 Central. Five new Prisma models (`PromptVersion`, `PromptEvalResult`, `ModelAssignment`, `AiRuntimeConfig`, `AuditLog`) plus 5 new columns on `PromptTemplate` and 2 new columns on `AiInteractionLog`. Purely additive migration with no behaviour change at deploy — tables remain unread on the AI hot path until Wave 3 wires `AiConfigResolver` in S47.

## What changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | +5 models (~110 LOC). +5 fields + 4 relations + 1 index on `PromptTemplate`. +2 fields on `AiInteractionLog`. +7 back-relations on `User`. |
| `prisma/migrations/20260424120000_ai_governance_v2/migration.sql` (NEW) | Hand-written DDL: 7 ordered steps (alter prompt_templates, alter ai_interaction_logs, create prompt_versions, prompt_eval_results, model_assignments, ai_runtime_configs, audit_logs) with FKs + indexes per SPEC §4. |
| `src/server/db/__tests__/ai-governance-v2-models.test.ts` (NEW) | 6 type-level smoke tests asserting `@prisma/client` exports the 5 new model types with SPEC-correct field shapes. |
| `docs/specs/bdd/sprint-46-goals.feature` | +6 BDD scenarios (apply, revert, FK-safe, cascade rules, type generation, default-OFF behaviour). |
| `docs/qa/sprint-46-trust-score.md` | +§4 Day 2 cont. entry — composite 0.93 retained. |
| `docs/releases/b-w1-002-migration.md` (NEW) | This file. |

## Migration name divergence from SPEC

SPEC-ARCH §8.1 prescribes `20260417000001_ai_governance_v2`, but existing project migrations include `20260418130100_ai_consent_backfill_legacy` (Apr 18). Using the SPEC date would put our migration BEFORE existing ones, violating chronological order Prisma requires. **Resolution**: used today's date `20260424120000_ai_governance_v2`. Functionally identical; documented here for archaeology.

## Hand-written SQL caveat

Claude Code does not have Docker / DB access in this environment, so `npx prisma migrate dev` could not generate the SQL automatically. The SQL was hand-written using SPEC §4 as the model source-of-truth and SPEC §8.4 (downgrade SQL) as inverse-correctness check.

**Validation done**:
- `npx prisma generate` ✅ (schema syntactically valid)
- `tsc --noEmit` ✅
- 6/6 type-level smoke tests pass
- 163/163 broader regression sweep (`src/server` + `src/lib`)

**Validation NOT done locally** (requires DB):
- Actual `prisma migrate dev` execution against Postgres
- FK constraint enforcement at runtime
- Index creation timing on existing rows

These are validated by the CI / Vercel deploy step (`prisma migrate deploy`). The reviewer / PO should check Vercel deploy logs after push.

## Cascade rules summary (per SPEC §4)

| FK | Parent delete behaviour | Why |
|---|---|---|
| `prompt_versions.promptTemplateId` → `prompt_templates.id` | CASCADE | Version is meaningless without template |
| `prompt_versions.createdById` → `users.id` | SET NULL | Version persists; author detached on user delete |
| `prompt_eval_results.promptTemplateId` → `prompt_templates.id` | CASCADE | Same reasoning |
| `prompt_eval_results.promptVersionId` → `prompt_versions.id` | CASCADE | Eval is meaningless without version |
| `prompt_eval_results.ranById` → `users.id` | SET NULL | Result persists; runner detached |
| `prompt_templates.createdById` / `approvedById` → `users.id` | SET NULL | Template persists; user attribution detached |
| `model_assignments.updatedById` → `users.id` | SET NULL | Assignment persists; updater detached |
| `ai_runtime_configs.updatedById` → `users.id` | SET NULL | Config persists; updater detached |
| `audit_logs.actorUserId` → `users.id` | **CASCADE** | Per SPEC §4.6: when a user is deleted (LGPD/GDPR right-to-erasure), their audit trail goes with them |

The `audit_logs.actor` cascade is the most opinionated cascade in the migration — it deliberately erases audit history alongside the user record. Alternative would be SetNull preserving the action log without identifying the actor; PO chose Cascade per LGPD interpretation.

## Deploy plan

1. Push to `origin/master`.
2. Vercel `prebuild` runs `npx prisma generate` — validates schema.
3. Vercel deploy runs `npx prisma migrate deploy` — applies the new migration to Staging Postgres (per `.github/workflows/deploy.yml`).
4. **No env vars need to be set at deploy time** — `AI_GOVERNANCE_V2` flag from B-W1-001 is still default OFF.
5. **Local dev**: pull + run `npx prisma migrate dev` against the project's Docker Postgres.

## Rollback

```bash
git revert <commit-hash>
git push
```

This restores the schema; **the migration itself is harder to revert because Postgres data may have been written**. Two options:

- **A — Empty DB rollback** (Staging only, after a fresh apply): `git revert` + `npx prisma migrate reset` — safe because the new tables are empty.
- **B — Inverse SQL** (Production, if any rows were written): apply the SPEC §8.4 downgrade SQL manually before reverting code. **Backup first.**

Estimated time: < 10 min for option A (Staging fresh), ~ 30 min for option B (Production with data).

## Critical-path impact

**Unblocks**:
- **B-W1-003** (seed `ModelAssignment` + `AiRuntimeConfig` defaults — tables exist now).
- **B-W1-004** (`AuditLogService` append-only inserts — table exists).
- **B-W1-005** (RBAC — independent but logically follows).
- **B-W2-001+** (Wave 2 prompt CRUD — `PromptVersion` table exists).

V2 Wave 1: 2 of 8 tasks complete after this commit.

## Follow-ups (Sprint 46 Day 3+)

Per execution plan §3 schedule:
- **Day 3**: B-W1-003 seed (size M) + B-W1-004 AuditLogService (size M) + A-01 SEC-AUDIT continues
- **Day 4**: B-W1-005 RBAC + B-W1-006 UI shell + B-W1-008 tests start
- **Day 5**: Wave 1 review + gate

## References

- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §4 (data model) + §8 (migration plan)
- `docs/specs/sprint-46/SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` §3 Wave 1 task table (B-W1-002 row)
- `docs/sprint-planning/sprint-46-execution-plan.md` §2 Block B.1
- `prisma/schema.prisma` — updated schema (5 new models + 7 columns + 7 User back-relations)
- `prisma/migrations/20260424120000_ai_governance_v2/migration.sql` — DDL applied
