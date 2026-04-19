# deploy.yml Investigation Report -- 2026-04-19

**Investigator**: devops-engineer
**Workflow**: `.github/workflows/deploy.yml`
**Status**: Failing instantly (0s duration, 0 jobs created) on every push to master

---

## 1. Workflow Summary

`deploy.yml` defines two jobs:

- **deploy-staging**: Triggered on push to `master`. Checks out code, installs deps, runs `prisma migrate deploy` against `STAGING_DATABASE_URL`, then prints a message (Vercel handles actual deploy via Git integration).
- **deploy-production**: Triggered on push to `production` branch OR manual `workflow_dispatch` with a version input. Same pattern: checkout (with optional tag ref for dispatch), deps, `prisma migrate deploy` against `PRODUCTION_DATABASE_URL`, echo message, optional health check via `vars.PRODUCTION_URL`.

Both deploy steps are `echo` placeholders -- Vercel's Git integration handles the actual deployment. The workflow's real value is running Prisma migrations against the correct database before Vercel deploys the new code.

## 2. Blast Radius

**Medium-Low.** This workflow does NOT gate Vercel deployments. Vercel deploys automatically on push to `master` regardless of this workflow's outcome. However:

- Prisma database migrations are NOT being applied before deploys. If any pending migration exists, the deployed code will run against a stale schema, causing runtime errors.
- The production health check (lines 66-73) never executes, so post-deploy verification is absent.
- Every push to master generates a red X failure badge, creating alert fatigue and masking real CI failures.

## 3. Root Cause

**YAML syntax error on line 64, column 87.**

```yaml
# Line 64 (BROKEN):
        run: echo "Vercel deploys production automatically via Git integration (branch: production)"
```

The substring `(branch: production)` contains a colon followed by a space (`: `). In YAML, `: ` is the key-value mapping indicator. The shell double quotes (`"..."`) are NOT YAML string delimiters -- YAML does not recognize them as quoting. The parser interprets `production)` as a mapping value, which creates an indentation conflict with the surrounding structure.

**Proof:**
```
$ node -e "require('js-yaml').load('run: echo \"text (branch: production)\"')"
# => YAMLException: bad indentation of a mapping entry

$ node -e "require('js-yaml').load('run: echo \"text without colon\"')"
# => OK
```

GitHub Actions uses the same YAML 1.1/1.2 parsing rules. The workflow file is syntactically invalid YAML, so GitHub rejects it before creating any jobs -- explaining the 0-job, 0-second, no-log failure pattern.

**Confirmed across all 5 recent runs:**
- All show `conclusion: failure`, `jobs: []`, `startedAt == updatedAt` (instant).
- `gh run view <id> --log-failed` returns "log not found" (no jobs ever started).

## 4. Category

**YAML syntax error** -- unquoted colon-space inside a `run:` value.

## 5. Fix Plan

Replace the bare `run:` value with a YAML block scalar (`|`) so the entire shell command is treated as a literal string, immune to colon interpretation.

### Diff

```diff
--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -61,7 +61,8 @@ jobs:
           DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

       - name: Deploy to production
-        run: echo "Vercel deploys production automatically via Git integration (branch: production)"
+        run: |
+          echo "Vercel deploys production automatically via Git integration (branch: production)"

       - name: Verify deployment health
         if: vars.PRODUCTION_URL != ''
```

**Alternative fix** (also valid -- wrap in YAML single quotes):
```diff
-        run: echo "Vercel deploys production automatically via Git integration (branch: production)"
+        run: 'echo "Vercel deploys production automatically via Git integration (branch: production)"'
```

Both approaches have been validated locally with js-yaml. The block scalar (`|`) approach is preferred because it matches the style already used on lines 68-73 of the same file and is idiomatic for GitHub Actions workflows.

### Secondary Issues (not blocking, but noted)

| Issue | Line | Severity | Notes |
|---|---|---|---|
| Both deploy steps are `echo` placeholders | 37, 64 | Info | C-003 in memory -- known since Sprint 2. Migrations are the real work. |
| `RAILWAY_TOKEN` is single secret for staging+prod | N/A | Low | A-003 in memory -- violates least-privilege but not the cause of this failure. |
| No `concurrency` group defined | N/A | Low | Unlike ci.yml and eval.yml, deploy.yml has no concurrency control. Rapid pushes could run migrations in parallel. |

## 6. Decision Recommendation

**RECOMMEND AUTO-FIX.**

This is a one-line YAML formatting fix. No new secrets, no infra changes, no structural refactor required. The fix changes zero runtime behavior -- it only corrects the YAML syntax so the parser can read the file.

The exact edit to apply:

**File**: `.github/workflows/deploy.yml`
**Line 64**: Replace `run: echo "Vercel deploys production automatically via Git integration (branch: production)"` with a block scalar form.

After applying, validate locally:
```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy.yml','utf8').replace(/\r\n/g,'\n')); console.log('Valid')"
```

---

*Report generated 2026-04-19 by devops-engineer. Diagnosis only -- no changes applied.*
