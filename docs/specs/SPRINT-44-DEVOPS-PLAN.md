# Sprint 44 — Expedition Phase Reordering — DevOps Plan

**Spec ID**: INFRA-S44-001
**Related Specs**: SPEC-ARCH-S44-PHASE-REORDER, SPEC-PROD-S44-PHASE-REORDER
**Author**: devops-engineer
**Date**: 2026-04-15
**Environment**: all
**Status**: DRAFT — pending approvals

---

## 0. Context

Sprint 44 reorders the 6 expedition phases. Mapping (old -> new):

| Old # | Old name (pt)     | New # | New name (pt)     |
|-------|-------------------|-------|-------------------|
| 1     | O Sonho           | 1     | O Sonho           |
| 2     | Os Companheiros   | 2     | Os Companheiros   |
| 3     | A Preparação (Checklist) | **6** | (was 3) |
| 4     | A Logística      | **5** | (was 4) |
| 5     | O Guia           | **3** | (was 5) |
| 6     | O Roteiro        | **4** | (was 6) |

Forward mapping applied to `Trip.currentPhase` and `ExpeditionPhase.phaseNumber`:
`3->6, 4->5, 5->3, 6->4` (1 and 2 unchanged).

Inverse mapping (rollback):
`6->3, 5->4, 3->5, 4->6`.

Note: forward and inverse are symmetric on the affected rows (it is an involution on {3,4,5,6}). Running the same SQL twice returns the data to its original state — this has implications for idempotency detection (see §3.3).

Current state of infra relevant to this change (verified 2026-04-15):
- CI: `.github/workflows/ci.yml`, deploy: `.github/workflows/deploy.yml`, eval: `eval.yml`
- Vercel git-integration deploy (no `vercel.json` in repo)
- Prisma migrations in `prisma/migrations/` (18 migrations; latest `20260411120000_sprint43_premium_multidestinations`)
- No feature-flag framework present. `src/lib/env.ts` has no `*_ENABLED` flags today. `src/lib/flags*` does not exist.
- Redis via Upstash (REST + ioredis). TLS gated by `REDIS_TLS_REQUIRED`.
- No Grafana. Observability = Sentry + structured JSON logs + OpenTelemetry traces.

---

## 1. Feature Flag `PHASE_REORDER_ENABLED`

### 1.1 Decision: dual-layer flag (env var + DB override)

No existing flag framework — do **not** introduce LaunchDarkly/GrowthBook for a single flag (cost, vendor onboarding, Security review overhead, per `docs/security.md` supply-chain rules). Instead:

**Layer 1 — Environment variable (default / kill-switch):**
- `PHASE_REORDER_ENABLED` (`"true" | "false"`, default `"false"`)
- Added to `src/lib/env.ts` via `@t3-oss/env-nextjs` as `z.coerce.boolean().default(false)` server-side only
- Added to `.env.example` under a new `# ----- FEATURE FLAGS -----` section
- Set per Vercel Environment (Preview, Staging/Preview-protected, Production)

**Layer 2 — Database override (per-user cohort + runtime toggle without redeploy):**
- New table `FeatureFlag` (key, valueJson, updatedAt, updatedBy) — single migration
- New table `FeatureFlagAssignment` (flagKey, userId, enabled) for per-user cohorting
- Values cached in Redis (`flag:PHASE_REORDER_ENABLED`, TTL 60s) to avoid DB hit on every request
- Resolution order (server-side, read in a single helper `src/lib/flags/phase-reorder.ts`):
  1. If `FeatureFlagAssignment` row exists for `userId` -> use it
  2. Else if `FeatureFlag.valueJson.rolloutPercentage` set -> hash(userId) % 100 < percentage
  3. Else fall back to env var `PHASE_REORDER_ENABLED`

### 1.2 Scope

- **Global default** via env var (off by default everywhere)
- **Per-beta-cohort** via `FeatureFlagAssignment` (seed with beta list: product-owner provides cohort)
- **Per-rollout-percentage** via `FeatureFlag.valueJson.rolloutPercentage` (0, 5, 25, 50, 100)
- **Per-user** override for on-call debugging

Not supported: per-request flag (not needed — phase order is a user-scoped decision).

### 1.3 Runtime toggle without redeploy

An admin-only server action (`src/server/actions/admin/flags.actions.ts`) writes to `FeatureFlag` table and invalidates the Redis key. Protected by the existing admin `role` check (added in sprint 36 — `20260322230849_sprint36_purchase_and_role`).

Audit: every write appended to `FeatureFlagAudit` log. Security-specialist must approve the admin action before merge.

### 1.4 Dependencies with existing flags

None found — this is the first formal feature flag in the codebase. This change therefore also establishes the **flag framework** that future features will reuse. That's a scope choice product-owner and tech-lead should confirm; the alternative is an env-var-only flag (simpler, but no mid-sprint cohort changes without redeploy).

**Recommendation**: ship the env-var-only version in Sprint 44 and defer the DB layer to Sprint 45 if timeline is tight. Plan below covers both paths.

---

## 2. CI/CD Impact

### 2.1 Pipelines to modify

**`.github/workflows/ci.yml`** — add a matrix dimension:
```yaml
strategy:
  matrix:
    phase_reorder: ["true", "false"]
env:
  PHASE_REORDER_ENABLED: ${{ matrix.phase_reorder }}
```
Applied to `unit-tests`, `integration-tests`, and Playwright E2E jobs only. Lint/SAST/build are flag-agnostic — do not double them (keeps CI time bounded).

**`.github/workflows/deploy.yml`** — no structural change. Migration job already runs `prisma migrate deploy` on staging and production. The Sprint 44 data-migration is **not** a Prisma migration (see §3.2), so a new step is added:

```yaml
- name: Run Sprint 44 phase-reorder data migration
  if: env.RUN_S44_MIGRATION == 'true'
  run: npx tsx scripts/migrate-phase-order.ts --env=staging --confirm
  env:
    DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
    RUN_S44_MIGRATION: ${{ vars.RUN_S44_MIGRATION }}
```
Guarded by a repo variable (`vars.RUN_S44_MIGRATION`) so the job becomes a no-op after the first successful run.

### 2.2 Migration job timing

Order on staging:
1. `prisma migrate deploy` (adds `FeatureFlag` / `FeatureFlagAssignment` tables)
2. `scripts/migrate-phase-order.ts` (data remap)
3. Vercel build + deploy

Order on production:
1. Manual `workflow_dispatch` to `deploy-production` with version tag
2. `prisma migrate deploy` runs automatically
3. **Manual gate** — tech-lead runs `scripts/migrate-phase-order.ts --env=production --dry-run` locally against prod read-replica (or a Railway one-off) and reviews output
4. Approve and re-run deploy job with `RUN_S44_MIGRATION=true`
5. Enable flag at 0% in prod (DB row), then ramp

Rationale: the Vercel code deploy is backwards-compatible (dual-path — see §4.1), so **the data migration can run independently of deploy**. Separating them gives a clean rollback boundary.

### 2.3 Trust score gate

Trust score must remain >=0.80 for PRs touching phase logic. The eval matrix must be extended to cover both flag states. Proposed config (`eval.yml`):
```yaml
strategy:
  matrix:
    phase_reorder: ["true", "false"]
```
Both states must pass `npm run eval:gate`. If only one passes, PR is blocked. Coordinate with qa-engineer to add a dataset dimension labeling expected phase numbers.

### 2.4 Test matrix summary

| Test tier          | Flag OFF | Flag ON | Notes |
|--------------------|----------|---------|-------|
| Unit               | required | required | matrix in ci.yml |
| Integration        | required | required | matrix in ci.yml |
| E2E (Playwright)   | required | required | matrix in ci.yml, smoke suite |
| Eval (trust score) | required | required | matrix in eval.yml |
| SAST/lint/build    | once     | —       | flag-agnostic |

Estimated CI time impact: +35% on unit/integration/E2E jobs. Acceptable for the rollout window; remove the matrix after Sprint 46 cleanup.

---

## 3. Data Migration Script

### 3.1 Proposed SQL (forward)

Single transaction, plpgsql for atomicity and audit trail:

```sql
BEGIN;

-- 1. Snapshot affected rows BEFORE (for verification + rollback audit)
CREATE TABLE IF NOT EXISTS _s44_phase_reorder_audit (
  id SERIAL PRIMARY KEY,
  entity TEXT NOT NULL,      -- 'Trip' or 'ExpeditionPhase'
  entity_id TEXT NOT NULL,
  old_phase INT NOT NULL,
  new_phase INT NOT NULL,
  direction TEXT NOT NULL,   -- 'forward' or 'rollback'
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Guard: fail if migration has already been applied forward
--    (We store a marker row so re-runs are safe — see §3.3 for idempotency.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _s44_phase_reorder_audit
    WHERE direction = 'forward' AND entity = '__marker__'
  ) THEN
    RAISE NOTICE 'Sprint 44 forward migration already applied — skipping.';
    RETURN;
  END IF;

  -- 3. Insert audit rows for Trip.currentPhase
  INSERT INTO _s44_phase_reorder_audit (entity, entity_id, old_phase, new_phase, direction)
  SELECT 'Trip', id, "currentPhase",
         CASE "currentPhase"
           WHEN 3 THEN 6
           WHEN 4 THEN 5
           WHEN 5 THEN 3
           WHEN 6 THEN 4
           ELSE "currentPhase"
         END,
         'forward'
  FROM "Trip"
  WHERE "currentPhase" IN (3,4,5,6);

  -- 4. Update Trip.currentPhase via temporary negative offset to avoid
  --    collisions during multi-step remap (e.g. 3->6 and 6->4 would clash).
  UPDATE "Trip" SET "currentPhase" = -"currentPhase" WHERE "currentPhase" IN (3,4,5,6);
  UPDATE "Trip" SET "currentPhase" = 6 WHERE "currentPhase" = -3;
  UPDATE "Trip" SET "currentPhase" = 5 WHERE "currentPhase" = -4;
  UPDATE "Trip" SET "currentPhase" = 3 WHERE "currentPhase" = -5;
  UPDATE "Trip" SET "currentPhase" = 4 WHERE "currentPhase" = -6;

  -- 5. Same remap on ExpeditionPhase.phaseNumber
  INSERT INTO _s44_phase_reorder_audit (entity, entity_id, old_phase, new_phase, direction)
  SELECT 'ExpeditionPhase', id::text, "phaseNumber",
         CASE "phaseNumber"
           WHEN 3 THEN 6 WHEN 4 THEN 5 WHEN 5 THEN 3 WHEN 6 THEN 4
           ELSE "phaseNumber"
         END,
         'forward'
  FROM "ExpeditionPhase"
  WHERE "phaseNumber" IN (3,4,5,6);

  UPDATE "ExpeditionPhase" SET "phaseNumber" = -"phaseNumber" WHERE "phaseNumber" IN (3,4,5,6);
  UPDATE "ExpeditionPhase" SET "phaseNumber" = 6 WHERE "phaseNumber" = -3;
  UPDATE "ExpeditionPhase" SET "phaseNumber" = 5 WHERE "phaseNumber" = -4;
  UPDATE "ExpeditionPhase" SET "phaseNumber" = 3 WHERE "phaseNumber" = -5;
  UPDATE "ExpeditionPhase" SET "phaseNumber" = 4 WHERE "phaseNumber" = -6;

  -- 6. Mark as applied
  INSERT INTO _s44_phase_reorder_audit (entity, entity_id, old_phase, new_phase, direction)
  VALUES ('__marker__', 'forward', 0, 0, 'forward');
END $$;

COMMIT;
```

Additional tables to inspect during script development (must be confirmed by architect — see §10):
- `PointTransaction.phaseNumber` — if it references phase numbers, remap
- `PhaseChecklistItem` — if scoped by phaseNumber, remap
- `UserBadge` — unlikely (badges are keyed by slug), confirm
- Any cached computed columns

**The script must enumerate every phaseNumber column found via**:
```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE column_name ILIKE '%phase%number%' OR column_name = 'currentPhase';
```
The output must be reviewed in PR.

### 3.2 Location: standalone script, not a Prisma migration

`scripts/migrate-phase-order.ts` — a thin TS wrapper around the SQL above.

Reasons to keep it out of `prisma/migrations/`:
- Reversible by design (inverse SQL in the same file)
- Requires a manual dry-run step in production
- Must be gated by repo variable, not by Prisma's apply-on-deploy behaviour
- Allows retry without polluting Prisma's `_prisma_migrations` table
- Decouples schema migration timing from data migration timing (a hard rule for zero-downtime — architect has previously enforced this pattern)

The script supports:
```
npx tsx scripts/migrate-phase-order.ts --env=<dev|staging|production> --dry-run
npx tsx scripts/migrate-phase-order.ts --env=<...> --confirm
npx tsx scripts/migrate-phase-order.ts --env=<...> --rollback --confirm
npx tsx scripts/migrate-phase-order.ts --env=<...> --verify
```

`--dry-run` runs the transaction and `ROLLBACK`s, emitting a JSON summary of affected row counts per column. `--verify` runs only the validation queries from §3.4.

### 3.3 Idempotency

The migration is **not naturally idempotent** because the remap is an involution on {3,4,5,6}: running it twice reverses itself. Safeguards:

1. `__marker__` row in `_s44_phase_reorder_audit` — the plpgsql `DO $$` block checks for it and no-ops on second run
2. `--confirm` is required for any write run
3. The script prints the current marker state before executing and aborts if inconsistent
4. Rollback sets a new marker `('__marker__', 'rollback', 0, 0, 'rollback')` so a re-forward run is also guarded

This gives safe re-run semantics without schema changes or new lock tables.

### 3.4 Post-migration validation SQL

Run automatically by `--verify`:

```sql
-- A. No Trip or ExpeditionPhase should be outside the valid {1..6} range
SELECT COUNT(*) FROM "Trip" WHERE "currentPhase" NOT BETWEEN 1 AND 6;
SELECT COUNT(*) FROM "ExpeditionPhase" WHERE "phaseNumber" NOT BETWEEN 1 AND 6;
-- Both must be 0.

-- B. Audit row count must equal sum of Trip+ExpeditionPhase rows with affected phases
SELECT direction, COUNT(*) FROM _s44_phase_reorder_audit
WHERE entity <> '__marker__' GROUP BY direction;

-- C. Per-phase distribution before/after (snapshot comparison)
SELECT "currentPhase", COUNT(*) FROM "Trip" GROUP BY "currentPhase" ORDER BY 1;

-- D. Marker state
SELECT * FROM _s44_phase_reorder_audit WHERE entity = '__marker__';
```

The script fails non-zero if A > 0 or D shows conflicting markers. Result is logged as structured JSON to stdout for CI capture.

### 3.5 Backup strategy

Railway PostgreSQL backups:
- **Automatic daily backup** already configured per `docs/infrastructure.md`
- **Explicit pre-migration snapshot** via Railway CLI / dashboard **must** be taken within the 30 minutes preceding the production run, by devops-engineer
- Snapshot retention: minimum 7 days post-deploy
- Snapshot name format: `s44-phase-reorder-pre-YYYYMMDD-HHMM`

The Railway snapshot is the primary rollback vehicle beyond the 48h window (see §4.3). No `pg_dump` redundancy unless Railway snapshot fails — then fall back to manual `pg_dump --no-owner --no-acl > s44-pre-$(date +%s).sql` from a trusted jump host.

### 3.6 Downtime estimate

**Expected: zero**. Schema migration (Prisma) adds only new tables (FeatureFlag*) — non-blocking. Data migration is an `UPDATE` inside a single transaction; for the current row counts (low thousands per table in prod) it is sub-second. Vercel deploy is atomic per request. Write contention during the transaction window is the only risk — migration should run in a low-traffic window.

If row counts grow before rollout, re-estimate with `EXPLAIN (ANALYZE)` on staging.

---

## 4. Rollback Plan

### 4.1 Code dual-path (mandatory pre-req)

The application code merged in Sprint 44 **must** support both orderings based on `PHASE_REORDER_ENABLED` resolved per user. That means:
- Phase label maps exist for both old and new orderings
- Phase-engine (`src/lib/engines/phase-engine.ts`, `phase-navigation.engine.ts`) reads the flag and branches
- Any stored `phaseNumber` is interpreted by the flag state for that user at read time — with one critical rule: **when the data migration has been applied, the stored number is already in the new order**. The flag then only controls UI ordering and validation logic, not the storage schema.

This is the contract that makes "flag OFF -> old behaviour" possible without reverting data. Architect must confirm the dual-path design in SPEC-ARCH-S44 before devs start coding.

### 4.2 Rollback scenarios

| Scenario | Trigger | Action | Time-to-rollback |
|----------|---------|--------|------------------|
| **A. Flag disable (preferred)** | User complaints, bug reports, minor eval regression | Admin toggles `FeatureFlag.PHASE_REORDER_ENABLED.enabled = false` OR sets rollout% to 0 | < 2 min (Redis TTL + 1) |
| **B. Code revert** | Critical code-path bug unrelated to flag | Vercel instant-rollback to previous deploy; data stays migrated (dual-path code in N-1 required, OR acceptable because storage = new order and flag reads from N-1 code treat it as new) | < 5 min |
| **C. Data rollback** | Data corruption or integrity violation from the migration | Run `scripts/migrate-phase-order.ts --env=production --rollback --confirm`, then verify | 5-15 min |
| **D. Point-in-time restore** | Catastrophic corruption beyond the audit table | Railway snapshot restore | 30-60 min (incurs downtime) |

### 4.3 Reverse SQL

Same structure as §3.1 but inverse mapping (6->3, 5->4, 3->5, 4->6), with:
- Marker check: requires `('__marker__', 'forward')` to exist, inserts `('__marker__', 'rollback')`
- Audit rows written with `direction='rollback'`
- Same negative-offset pivot to avoid collisions

### 4.4 Maximum rollback window

**48 hours after the data migration completes.** After 48h, the rollback SQL is considered unsafe because any new `Trip` or `ExpeditionPhase` rows created with the new ordering will be remapped back to old numbers (they have no audit entry and will be blindly inverted).

A safer post-48h rollback uses audit rows only:
```sql
UPDATE "Trip" t
SET "currentPhase" = a.old_phase
FROM _s44_phase_reorder_audit a
WHERE a.entity = 'Trip' AND a.entity_id = t.id
  AND a.direction = 'forward' AND a.applied_at >= NOW() - INTERVAL '30 days';
```
New rows (no audit row) are left alone. Rollback past 48h requires architect + tech-lead joint approval.

### 4.5 Step-by-step production rollback procedure

1. On-call raises P0/P1 in `#incidents`
2. Decide scenario (A/B/C/D) with tech-lead — default to **A** unless data integrity is at stake
3. If **A**: toggle flag via admin action, wait 90s, verify Sentry error rate returns to baseline, post update
4. If **B**: run Vercel rollback from dashboard, verify health endpoint, post update
5. If **C**: follow the `docs/runbooks/RUN-S44-phase-rollback.md` runbook (to be authored pre-deploy, linked from this plan)
6. Post-incident: write post-mortem within 48h, update runbook

---

## 5. Observability During Rollout

### 5.1 Metrics to monitor

| Metric | Source | Baseline | Alert threshold |
|--------|--------|----------|-----------------|
| Error rate per phase | structured logs + Sentry grouping `event = "phase.error"` with `phaseNumber` tag | < 0.5% | > 1% sustained 5 min |
| Phase completion time (p95) | existing phase-engine telemetry span `phase.complete` | per phase baseline | > 2x baseline |
| PA (Points-Awarded) total per phase | PointTransaction insert rate | per phase baseline | > 3 sigma drop |
| Phase transition success rate | `phase.transition.ok` / `phase.transition.attempt` | > 99% | < 97% sustained 5 min |
| Flag resolution failures | new metric `flag.resolve.error{key="PHASE_REORDER_ENABLED"}` | 0 | > 0 |
| Trust score (eval) | `npm run eval:scheduled` nightly | >= 0.80 | < 0.80 |
| Migration audit drift | cron SQL query comparing `Trip.currentPhase` distribution vs audit | stable | any anomaly |

All tags must exclude PII — `userId` must be hashed before attaching to a metric label (existing project rule).

### 5.2 Sentry alerts

Add three new Sentry alert rules (tagged `release: v0.23.0-s44`):
1. `event.type=error AND tag:feature=phase-reorder` rate > 1% over 5 min -> P1 Slack `#incidents`
2. `message CONTAINS "phase mismatch"` -> P0 Slack + page on-call
3. `tag:flag.state=on AND level=error` spike 3x baseline -> P1

### 5.3 Dashboard

No Grafana in this project. Create a Sentry dashboard `Sprint 44 — Phase Reorder` with widgets for each metric above. Linked from runbook.

### 5.4 Automatic abort criteria

The rollout is auto-aborted (flag forced to 0%) by a nightly cron job `scripts/guard-phase-reorder.ts` if any of:
- Error rate per affected phase > 2x the 7-day baseline over a 15-min window
- Phase completion time p95 > 2x baseline sustained 30 min
- Trust score drops below 0.80 in the nightly eval run
- `__marker__` row missing or duplicated in audit table

The guard writes `FeatureFlag.PHASE_REORDER_ENABLED.enabled = false`, posts to `#incidents`, and opens a Linear ticket. Manual re-enable is required.

---

## 6. Environment Propagation

| Env | Flag default | Data migration | Unlock order |
|-----|--------------|----------------|--------------|
| Local dev | `true` (dev ergonomics) | devs run `scripts/migrate-phase-order.ts --env=dev --confirm` once | first |
| Preview (Vercel PR) | `false` | N/A — preview uses staging DB (confirm with architect) | second |
| Staging | `false` initially, flip to `true` for full-stack test | auto on deploy once per staging env | second |
| Production | `false` initially, ramp 0% -> 5% -> 25% -> 100% over 5 days | manual gated run | last |

Preview envs share the staging DB per current Railway setup, so a single staging data migration covers both. Confirm this with the **architect** before starting Sprint 44 — if previews ever switch to ephemeral DBs, this plan needs a seed step.

Flag values are **per-environment in Vercel** and **per-environment in the DB** (since `FeatureFlag` table is scoped by the DB the env points at). No cross-env leakage.

---

## 7. Secrets / Config Changes

### 7.1 New env vars

| Name | Required | Default | Notes |
|------|----------|---------|-------|
| `PHASE_REORDER_ENABLED` | no | `"false"` | boolean, server-side only |
| `PHASE_REORDER_ROLLOUT_PERCENT` | no | `"0"` | 0..100, optional bypass of DB layer for env-only mode |

Both added to:
- `.env.example` in a new `# ----- FEATURE FLAGS -----` block
- `src/lib/env.ts` server block with Zod coercion
- `docs/infrastructure.md` env var reference table
- `docs/dev-testing-guide.md` (dev setup section)

No new secrets (these are not sensitive). No new AWS/Vercel/Upstash secrets.

### 7.2 Vercel dashboard

Add the two env vars to Preview, Staging, and Production environments before merging the flag code. Track via `#ops` channel checklist.

---

## 8. Cache Invalidation (Redis / Upstash)

Known phase-scoped Redis keys (grep results from `src/**` — to be verified by devs during implementation):
- Rate limiter keys are generic (`rl:*`) — unaffected
- Destination search cache (`dest:*`) — unaffected
- Any `phase:*` or `trip:<id>:phase:*` keys (if present — architect to confirm during SPEC-ARCH review) — **must** be flushed after the data migration
- Feature-flag cache `flag:PHASE_REORDER_ENABLED` (new) — TTL 60s, invalidated on admin write

Invalidation plan (post-data-migration, same maintenance window):

```bash
# Upstash CLI (or REST)
redis-cli --tls -u "$UPSTASH_REDIS_URL" --scan --pattern 'trip:*:phase:*' | \
  xargs -I{} redis-cli --tls -u "$UPSTASH_REDIS_URL" DEL {}
```

Scripted in `scripts/migrate-phase-order.ts` under a `--flush-cache` flag so the devops-engineer runs it as step 3 of production rollout. Safe to re-run.

If any phase-scoped key pattern is discovered mid-sprint, it must be added to this plan before production deploy — no silent additions.

---

## 9. CDN / Edge Cache

Vercel's CDN:
- Static assets — not phase-aware, nothing to revalidate
- ISR / RSC cached pages — dashboard, expedition pages have `dynamic = "force-dynamic"` or user-scoped `revalidateTag` (verify per page during impl)
- Middleware responses — not cached

Action items:
1. Run `grep -rn "revalidateTag\|unstable_cache\|export const revalidate" src/app/ src/server/` — list all cached boundaries touching phases
2. After production data migration, hit Vercel Deploy Hook `revalidate` endpoint OR call `revalidatePath('/[locale]/expedition/[tripId]', 'layout')` from a one-off API route protected by admin auth
3. Purge by tag: `revalidateTag('trip:${tripId}')` for any trip whose `currentPhase` was remapped (can be generated from the audit table)

No third-party CDN — Vercel is the only edge layer.

---

## 10. Pending Decisions

| # | Decision | Owner | Needed by |
|---|----------|-------|-----------|
| D1 | Feature-flag backend: env-only (simple) vs env + DB (framework) | tech-lead + product-owner | Sprint 44 kickoff |
| D2 | Rollout schedule: ramp 0->5->25->50->100 over how many days? | product-owner + devops-engineer | Sprint 44 planning |
| D3 | Production maintenance window for data migration | devops-engineer + tech-lead | 48h before deploy |
| D4 | Who runs `scripts/migrate-phase-order.ts` in production (buddy system required) | devops-engineer + one of: tech-lead, architect | deploy day -1 |
| D5 | Confirm every `phaseNumber` column enumerated (Trip, ExpeditionPhase, PointTransaction?, PhaseChecklistItem?) | architect | SPEC-ARCH-S44 draft |
| D6 | Preview envs share staging DB — confirm | architect | Sprint 44 kickoff |
| D7 | Cohort list for beta users | product-owner | before 5% rollout |
| D8 | Cache key audit — list all Redis keys containing `phase` | dev-fullstack-1 | implementation phase |
| D9 | SPEC-SEC review for admin flag-toggle action | security-specialist | before merge of flag framework |
| D10 | Trust-score eval dataset needs flag-state dimension | qa-engineer | Sprint 44 planning |
| D11 | If flag framework is deferred to Sprint 45, does env-only meet PM needs for beta cohort? | product-owner | Sprint 44 kickoff |

---

## 11. Files to be Created / Modified (DevOps scope)

**New**:
- `scripts/migrate-phase-order.ts`
- `scripts/guard-phase-reorder.ts`
- `docs/runbooks/RUN-S44-phase-rollback.md`
- `src/lib/flags/phase-reorder.ts` (helper — dev-fullstack writes, devops reviews)
- Prisma migration `<timestamp>_add_feature_flags` (if DB layer approved)

**Modified**:
- `.github/workflows/ci.yml` (matrix + flag env)
- `.github/workflows/deploy.yml` (migration step)
- `.github/workflows/eval.yml` (matrix)
- `.env.example`
- `src/lib/env.ts`
- `docs/infrastructure.md` (new section: feature flags + Sprint 44 migration runbook reference)

---

> WARNING Ready with conditions — resolve before apply: D1, D3, D4, D5, D6, D9 must be answered before any code or infra change lands. D2, D7, D10 must be answered before production ramp-up.

