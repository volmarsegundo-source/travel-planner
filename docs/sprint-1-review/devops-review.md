# DevOps Review — Sprint 1
**Date:** 2026-02-26
**Reviewer:** DevOps Engineer Agent
**Branch:** feat/sprint-1
**Commits reviewed:** 8 (432f0dc through 8bed6dd)

---

## Executive Summary

The Sprint 1 infrastructure baseline is **well-structured and largely sound**. The CI/CD pipeline, Docker Compose setup, environment variable strategy, and observability foundations are all present and follow established project conventions. The primary blocking concern is the **divergence between the committed `ci.yml` and the full pipeline documented in `infrastructure.md`** — the committed workflow is a reduced version that is missing the Docker build/scan stage and the Semgrep SAST stage. Secondary concerns include the absence of Prisma migration files, a health endpoint that does not perform actual service checks, and a Playwright configuration that runs `npm run dev` in CI rather than the built production artifact.

The app is **not yet ready for staging deployment** in its current state but is close. Three items must be resolved before the first staging deploy. All other findings are warnings that should be addressed in Sprint 2.

---

## Machine Migration Note Assessment

**Context:** The developer's machine had Node.js v24 installed. Node.js was available at `/c/Program Files/nodejs/`. The project specification and production pipeline both target Node.js 20 LTS.

**Risk level: MEDIUM**

**Assessment:**

The `.nvmrc` file is present at the project root and correctly specifies `20`. The `package.json` `engines` field enforces `>=20.0.0`. The GitHub Actions CI pipeline pins `NODE_VERSION: "20"` and passes that to `actions/setup-node`. These three controls together mean the mismatch on the developer's machine does not propagate to CI or to any deployed environment.

However, the mismatch does create a local parity gap that introduces risk:

1. **npm lockfile drift**: npm v10 is required (`engines.npm: ">=10.0.0"`). Node.js v24 ships with npm v10, so this is not a problem in practice — but Node.js v20 ships with npm v10 as well, so the lockfile should be consistent. If the developer ran `npm install` under Node.js v24 and regenerated `package-lock.json`, the lock format version could differ from what Node.js 20 + npm 10 expects. This should be verified.

2. **Native module compilation**: Any dependency with native bindings (e.g., `bcryptjs` uses pure JS, `ioredis` does not compile native — both are safe) compiled under Node.js v24 ABI will fail under Node.js v20. The current dependency set does not include native bindings, so no immediate failure is expected.

3. **No enforcement on developer machine**: Without `nvm` or `fnm` available, the `.nvmrc` file is decorative. Engineers joining this project should install `nvm` or `fnm` as a prerequisite. This should be added to `docs/infrastructure.md` as a setup requirement.

**Recommended action for Sprint 2:** Add a `predev` or `check-node-version` npm script that fails with a clear error message if the running Node.js major version is not 20. Example: `node -e "if (parseInt(process.version.slice(1)) !== 20) { console.error('Error: Node.js 20 LTS required. Found: ' + process.version); process.exit(1); }"`.

---

## Dimension Reviews

### 1. Docker Compose

**Status: PASS**

File: `C:\travel-planner\docker-compose.yml`

| Check | Result | Notes |
|---|---|---|
| Image versions pinned | Pass | `postgres:16-alpine`, `redis:7-alpine` — matches production schema version |
| Named volumes defined | Pass | `postgres_data` and `redis_data` declared in `volumes:` block |
| PostgreSQL healthcheck | Pass | `pg_isready -U travel_planner -d travel_planner_dev` with 5s interval, 5 retries |
| Redis healthcheck | Pass | `redis-cli ping` with 5s interval, 5 retries |
| Port exposure | Pass | PostgreSQL 5432, Redis 6379 — standard ports, localhost-only by Docker default |
| `restart: unless-stopped` | Pass | Survives Docker Desktop restarts without manual intervention |
| No secrets committed | Pass | Password `local_dev_password_not_secret` is clearly a dev-only placeholder; not used in any other environment |
| Redis persistence | Pass | `redis_data` volume ensures local sessions/cache survive container restarts |
| `depends_on` with healthcheck | Warning | App startup is not managed by Docker Compose (Next.js runs directly with `npm run dev`), so `depends_on` is not relevant here. But new developers must know to wait for `healthy` status before running migrations. Document this explicitly. |

**Finding:** The Docker Compose setup is correct and production-grade for local development. No blocking issues.

---

### 2. CI/CD Pipeline

**Status: WARNING — two missing stages**

File: `C:\travel-planner\.github\workflows\ci.yml`

The committed `ci.yml` is a **reduced version** of the pipeline specified in `docs/infrastructure.md`. Comparison:

| Stage | infrastructure.md spec | ci.yml (committed) | Gap |
|---|---|---|---|
| Lint & type-check | Yes | Yes | None |
| Unit + integration tests with coverage | Yes | Yes | None |
| Coverage threshold check | Yes (shell check in yaml) | No shell gate — uploads artifact only | Gap: threshold is enforced by Vitest config thresholds, not an explicit pipeline gate |
| Docker build & Trivy scan | Yes | No | **Missing stage** |
| Semgrep SAST | Yes | No (only `npm audit`) | **Missing stage** |
| npm audit | Yes | Yes | None |
| E2E tests (PR to main) | Yes | Yes | None |
| `deploy.yml` | Specified in docs | Not committed | Missing (expected for Sprint 1 — acceptable) |

**Critical observations:**

- The SAST stage in the committed `ci.yml` (lines 111-124) runs only `npm audit --audit-level=high`. It does not run Semgrep. The infrastructure spec and the pre-launch security checklist both require Semgrep with `p/secrets` ruleset. Hardcoded credentials will not be caught by `npm audit`.

- The Docker build and Trivy scan stage is absent. The pipeline commits code that is never container-validated in CI. A broken Dockerfile would only be discovered at deploy time.

- The E2E job's `webServer` block in `playwright.config.ts` (line 62) uses `npm run dev` (Turbopack dev server) rather than `npm run start` (production server). In CI, `npm run build` is executed before `npm run test:e2e`, but the Playwright config still starts the dev server for the E2E run. This means E2E tests run against a dev server in CI, not the built production artifact — defeating part of their purpose.

- Concurrency cancellation (`cancel-in-progress: true`) is correctly configured — fast-moving branches will cancel superseded runs and save runner minutes.

- Node.js is pinned to `20` via the top-level `env.NODE_VERSION` variable and correctly passed to every `actions/setup-node@v4` call. This is correct.

- `npm ci` is used throughout — correct. Never `npm install` in CI.

- Postgres and Redis service containers in the `test` and `e2e` jobs match the Docker Compose image versions (`postgres:16-alpine`, `redis:7-alpine`). Parity maintained.

---

### 3. Environment Variables

**Status: PASS**

File: `C:\travel-planner\.env.example`

| Check | Result | Notes |
|---|---|---|
| All required vars documented | Pass | DATABASE_URL, REDIS_URL, UPSTASH vars, NEXTAUTH_SECRET, NEXTAUTH_URL, Google OAuth, Mapbox public + secret, Sentry DSN + auth token, NEXT_PUBLIC_APP_URL, NODE_ENV |
| Placeholder values only | Pass | No real credentials — all values are clearly `YOUR_XXX` placeholders or documented local dev values |
| `NEXT_PUBLIC_` prefix usage | Pass | Only non-sensitive values use this prefix: Mapbox public token (pk.*), APP_URL, Sentry DSN (DSN is public-safe — only the auth token is secret) |
| `.env.local` in `.gitignore` | Pass | Confirmed in `.gitignore` |
| `SKIP_ENV_VALIDATION` documented | Pass | Commented out with a `# CI use only` note |
| Upstash REST vars documented | Pass | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` present |
| Discrepancy: env.ts vs .env.example | Warning | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are documented in `.env.example` but not declared in `src/lib/env.ts`. If these are needed by a production Upstash client they will bypass startup validation. |

**Finding:** `env.ts` correctly validates `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, and all other critical vars at startup. The `UPSTASH_REDIS_REST_*` vars are not validated, which is acceptable only if the current Redis client (`ioredis`) uses `REDIS_URL` in all environments and the Upstash REST vars are never accessed directly. If a future Upstash-specific client is introduced, these must be added to `env.ts`.

---

### 4. Node.js Version

**Status: PASS with conditions**

| Control | Status | Notes |
|---|---|---|
| `.nvmrc` | Pass | Present, specifies `20` |
| `package.json engines` | Pass | `"node": ">=20.0.0"` |
| CI pipeline `NODE_VERSION` | Pass | `"20"` — pinned, not `"20.x"` or `"lts/*"` |
| Minor version pinning | Warning | `NODE_VERSION: "20"` resolves to the latest Node.js 20.x in CI. This is acceptable for security patches but can introduce subtle differences across runs. Consider pinning to `NODE_VERSION: "20.18.0"` (or latest known good 20.x LTS) for full reproducibility. |
| Developer machine enforcement | Fail | No `nvm`/`fnm` available on the Sprint 1 developer machine. `.nvmrc` is advisory only without these tools. Node.js v24 was used locally. |

---

### 5. Database Migrations

**Status: WARNING**

| Check | Result | Notes |
|---|---|---|
| Prisma schema defined | Pass | `prisma/schema.prisma` is complete with User, Trip, ItineraryDay, Activity, ChecklistItem |
| `prisma migrate deploy` in CI | Pass | Called in both `test` and `e2e` jobs before test execution |
| Migration files exist | FAIL | The `prisma/migrations/` directory does not exist. `prisma migrate deploy` reads from this directory. Without migration files, the CI command will either fail or be a no-op (depending on whether the schema has ever been formally migrated with `prisma migrate dev`). |
| Migration in deploy pipeline | Pass (documented) | `deploy.yml` spec includes migration step — but no `deploy.yml` is committed yet |
| `db:migrate:deploy` script | Pass | `package.json` has `"db:migrate:deploy": "prisma migrate deploy"` which maps correctly to the CI command |

**Critical finding (FAIL-5):** There is no `prisma/migrations/` directory. This means `npx prisma migrate deploy` in CI has nothing to apply. The CI may be passing because `SKIP_ENV_VALIDATION=true` is set and the test suite may not actually connect to the database, or because the CI service container accepts the schema via `prisma db push` implicitly. This must be resolved: `prisma migrate dev --name init` must be run locally to generate the first migration file and that directory committed to the repository.

---

### 6. Observability

**Status: PASS with conditions**

| Check | Result | Notes |
|---|---|---|
| Structured JSON logging | Pass | `src/lib/logger.ts` emits valid JSON with `timestamp`, `level`, `service`, `environment`, `event`, and optional `meta` spread |
| Log level coverage | Pass | `info`, `warn`, `error` methods all present |
| PII in logs | Pass | Logger accepts `meta: Record<string, unknown>` — no PII fields are logged by default. Call sites must respect the no-PII rule; Semgrep would catch violations if SAST were active. |
| traceId / spanId fields | Warning | The logger spec in `infrastructure.md` includes `traceId` and `spanId` fields for distributed tracing correlation. The actual `logger.ts` implementation does not include these. Without trace IDs, correlating logs to requests in production is significantly harder. |
| Error stack traces | Pass | `logger.error` logs only `error.message`, not `error.stack` — correct for production-safe logging |
| Sentry integration | Warning | `SENTRY_DSN` is in `.env.example` and env validation. However, `src/instrumentation.ts` is not present in the codebase (not reviewed — may exist but was not found). Sentry is not confirmed wired. |
| Health endpoint — basic | Pass | `GET /api/v1/health` exists and returns 200 with JSON |
| Health endpoint — service checks | FAIL | The health endpoint (`src/app/api/v1/health/route.ts`) returns `"database": "not_checked"` and `"redis": "not_checked"`. It does not actually probe PostgreSQL or Redis. A health endpoint that does not check its dependencies is not a health endpoint — it is a ping endpoint. |
| Metrics / dashboards | Warning | No Prometheus metrics, Datadog, or OpenTelemetry instrumentation is configured. For MVP on Vercel, Vercel Analytics covers basic traffic. But request rate, error rate, and P95 latency metrics are not tracked anywhere. Flag for Sprint 2. |
| Rate limiting | Pass | `RATE_LIMIT` constants defined in `src/lib/constants.ts`. Implementation assumed present based on prior sprint review. |

---

### 7. Build Output

**Status: PASS**

File: `C:\travel-planner\next.config.ts`

`output: "standalone"` is correctly set. This is required for the Dockerfile to copy `.next/standalone` and produce a minimal production image. The `withNextIntl` plugin wrapper preserves this config correctly. `NEXT_TELEMETRY_DISABLED=1` is set in the documented Dockerfile — telemetry disabled for production builds. No issues.

---

### 8. Dependency Pinning

**Status: WARNING**

File: `C:\travel-planner\package.json`

All dependencies use `^` (caret) ranges — they pin the major version but allow minor and patch updates. Example: `"next": "^15.1.0"` would accept `15.2.0`, `15.9.99`, etc.

| Aspect | Assessment |
|---|---|
| Production deps using `^` ranges | All 24 production dependencies use `^` |
| Dev deps using `^` ranges | All 18 dev dependencies use `^` |
| `package-lock.json` exists | Assumed yes (CI uses `npm ci` which requires it) |
| `npm ci` in CI | Pass — `npm ci` installs exactly what `package-lock.json` specifies, so the lock file provides exact pinning in CI |
| Local `npm install` risk | Warning — if a developer runs `npm install` rather than `npm ci`, they may pull newer versions and update the lock file unintentionally |

**Overall:** The use of `npm ci` in the CI pipeline mitigates most range risk. The lock file is the real source of truth. However, the lock file is not reviewed in the CI pipeline — if a developer commits an updated lock file with newer dependency versions, those versions are not automatically scanned. The Trivy and npm audit stages (when fully implemented) will catch known CVEs, but behavioral changes from minor bumps will not be caught until tests fail.

**Notable dependency concerns:**
- `next-auth: ^5.0.0-beta.25` — this is a **beta version in production use**. Beta versions may have breaking changes between patch releases. Pin this to an exact version: `"5.0.0-beta.25"` without the caret.
- `@anthropic-ai/sdk: ^0.78.0` — AI SDK in production dependencies. If this is used server-side only, ensure it is guarded with `server-only`.

---

### 9. Redis Configuration

**Status: PASS with conditions**

File: `C:\travel-planner\src\server\cache\redis.ts`

| Check | Result | Notes |
|---|---|---|
| `server-only` imported | Pass | First line of the file |
| Global singleton pattern | Pass | Prevents connection pool exhaustion in Next.js hot-reload (dev) and serverless warmup cycles |
| `lazyConnect: true` | Pass | Connection is deferred until first command — avoids boot failures if Redis is temporarily unavailable |
| `maxRetriesPerRequest: 3` | Pass | Reasonable retry budget before surfacing errors |
| `enableReadyCheck: true` | Pass | Confirms Redis is ready before accepting commands |
| Fallback to `redis://localhost:6379` | Warning | The fallback `?? "redis://localhost:6379"` is a safety net but also means a misconfigured production environment (missing `REDIS_URL`) will silently fail to connect to a non-existent local Redis rather than crashing at startup with a clear error. Prefer: throw if `REDIS_URL` is not set in non-development environments. This is partially mitigated by `env.ts` validation but `env.ts` gives `REDIS_URL` a default value too. |
| Error event handling | Warning | No `redis.on('error', ...)` handler is registered. An unhandled Redis error event in Node.js will throw an unhandled exception. In production, this can crash the process. A minimal error handler logging via `logger.error` should be added. |
| Production Upstash client | Warning | The code uses `ioredis` in all environments. The `.env.example` documents Upstash REST API vars, suggesting a future migration to `@upstash/redis`. When that happens, the client instantiation must change. This is an acknowledged design note, not a blocker. |
| Singleton not applied in production | Pass | `if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis` — correct. Serverless functions in production should not share global state across cold starts. |

---

### 10. E2E Test Environment

**Status: WARNING**

File: `C:\travel-planner\playwright.config.ts`

| Check | Result | Notes |
|---|---|---|
| PostgreSQL service in E2E CI job | Pass | `postgres:16-alpine` with healthcheck in the `e2e` job |
| Redis service in E2E CI job | Pass | `redis:7-alpine` with healthcheck in the `e2e` job |
| Chromium-only in CI | Pass | `npx playwright install --with-deps chromium` — only Chromium installed in CI, which is correct for cost and speed |
| Browsers in playwright.config.ts | Warning | The config defines 6 projects: chromium, desktop-1280, firefox, webkit, Mobile Chrome, smoke. In CI, only Chromium is installed. Running `npm run test:e2e` without `--project` would attempt all projects and fail for Firefox and WebKit. The E2E job should explicitly pass `--project=chromium` or `--project=smoke` to avoid failures from missing browsers. |
| `webServer.command` uses dev server | Warning | Line 62: `command: "npm run dev"`. In CI, this starts Turbopack dev server after `npm run build` has been executed. The E2E tests therefore run against the dev server, not the built artifact. The `webServer` block should use `npm run start` in CI (`reuseExistingServer: !process.env.CI` suggests CI should start its own server — so the command should be `npm run start` when `CI=true`). |
| `retries: process.env.CI ? 2 : 0` | Pass | Flaky test mitigation in CI — correct |
| `workers: process.env.CI ? 1 : undefined` | Pass | Serial execution in CI avoids race conditions on shared DB state |
| `forbidOnly: !!process.env.CI` | Pass | Prevents accidental `.only` commits reaching CI |
| Playwright report retention | Pass | 7-day artifact retention on failure |
| E2E skipped on non-main PRs | Acceptable | `if: github.base_ref == 'main'` — E2E only runs on PRs targeting main. This is a reasonable tradeoff for CI speed. |

---

## Issues Found

| ID | Severity | Description | File | Fix Required |
|---|---|---|---|---|
| INFRA-REV-001 | HIGH | `prisma/migrations/` directory does not exist. `prisma migrate deploy` in CI has no migration files to apply. Tests may be running against an un-migrated (or `db push`-pushed) schema. | `prisma/migrations/` (missing) | Run `npx prisma migrate dev --name init` locally, commit the generated `migrations/` directory. |
| INFRA-REV-002 | HIGH | The committed `ci.yml` is missing the Docker build + Trivy scan stage present in `infrastructure.md`. A broken Dockerfile will not be caught in CI. | `C:\travel-planner\.github\workflows\ci.yml` | Add the `build-and-scan` job from the infrastructure spec to the committed workflow. |
| INFRA-REV-003 | HIGH | The committed `ci.yml` SAST stage runs only `npm audit`. Semgrep with `p/secrets` ruleset is absent. Hardcoded credentials will not be detected. | `C:\travel-planner\.github\workflows\ci.yml` lines 111-124 | Add Semgrep step to the SAST job as specified in `infrastructure.md`. |
| INFRA-REV-004 | MEDIUM | Health endpoint returns `"not_checked"` for database and Redis — it does not probe either service. | `C:\travel-planner\src\app\api\v1\health\route.ts` | Implement actual `db.$queryRaw\`SELECT 1\`` and `redis.ping()` checks as documented in `infrastructure.md`. |
| INFRA-REV-005 | MEDIUM | Playwright `webServer.command` uses `npm run dev` (Turbopack dev server) in CI instead of `npm run start` (production server). E2E tests do not validate the production build. | `C:\travel-planner\playwright.config.ts` line 62 | Change to `command: process.env.CI ? "npm run start" : "npm run dev"` and ensure the build step precedes the E2E job (it already does). |
| INFRA-REV-006 | MEDIUM | No Redis `on('error')` event handler. Unhandled Redis error events in Node.js throw uncaught exceptions that can crash the server process. | `C:\travel-planner\src\server\cache\redis.ts` | Add `redis.on('error', (err) => logger.error('redis.connection.error', err))` after client instantiation. |
| INFRA-REV-007 | MEDIUM | `next-auth` is pinned to a beta version (`^5.0.0-beta.25`) with a caret, allowing automatic minor/patch upgrades within the beta series. Beta-to-beta upgrades can contain breaking changes. | `C:\travel-planner\package.json` line 43 | Remove the caret: `"next-auth": "5.0.0-beta.25"` to lock to a specific beta. Update intentionally only after reviewing the changelog. |
| INFRA-REV-008 | LOW | `logger.ts` does not include `traceId`/`spanId` fields specified in the observability standard. Log correlation across service calls will be manual. | `C:\travel-planner\src\lib\logger.ts` | Add optional `traceId?: string` to the meta shape and document the convention for passing request trace IDs. |
| INFRA-REV-009 | LOW | Playwright config defines Firefox, WebKit, and Mobile Chrome projects, but CI only installs Chromium. Running `npm run test:e2e` without `--project` in CI will fail for missing browsers. | `C:\travel-planner\.github\workflows\ci.yml` line 191 | Change E2E run command to `npm run test:e2e -- --project=chromium` in CI, or install all browsers (slower). |
| INFRA-REV-010 | LOW | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are documented in `.env.example` but absent from `src/lib/env.ts`. If these vars are used in any code path, they will not be validated at startup. | `C:\travel-planner\src\lib\env.ts` | Add both vars to `env.ts` server config as optional `z.string()` — or remove them from `.env.example` if they are not yet used. |
| INFRA-REV-011 | LOW | Node.js version pinned to `"20"` in CI rather than a specific patch version (e.g., `"20.18.0"`). Minor security patches are applied automatically, which is generally desirable, but exact reproducibility is lost. | `C:\travel-planner\.github\workflows\ci.yml` line 14 | Acceptable as-is for now. For maximum reproducibility, pin to `"20.18.0"` and update deliberately. |
| INFRA-REV-012 | LOW | No `deploy.yml` workflow is committed. The `infrastructure.md` spec documents it in detail, but it does not exist as a file. | `.github/workflows/deploy.yml` (missing) | Create `deploy.yml` before the first staging deploy. This is expected for Sprint 1 scope. |
| INFRA-REV-013 | INFO | Developer machine ran Node.js v24 locally with no version manager available. `.nvmrc` specifies `20` but cannot be enforced without `nvm`/`fnm`. | `C:\travel-planner\.nvmrc` | Add node version check to `predev` script. Update `docs/infrastructure.md` prerequisites to require `nvm` or `fnm`. |

---

## Deployment Readiness

**Can the app be deployed to a staging environment today?**

**No — three blockers must be resolved first.**

| Blocker | Issue ID | Effort |
|---|---|---|
| No Prisma migration files — schema cannot be applied to fresh DB | INFRA-REV-001 | 15 min |
| Missing Docker build/Trivy scan in CI — security gate incomplete | INFRA-REV-002 | 2 hours |
| Missing Semgrep SAST in CI — credential detection absent | INFRA-REV-003 | 1 hour |

Once those three are resolved, the remaining medium-severity items (INFRA-REV-004 through INFRA-REV-007) should be addressed before the first production deploy but are not blockers for a staging deployment.

**What is working well:**
- Docker Compose local environment is correctly configured with healthchecks and named volumes
- Environment variable strategy is sound: `.env.example` is complete, `.env.local` is gitignored, `env.ts` validates at startup
- Node.js version is consistently specified across `.nvmrc`, `package.json engines`, and CI pipeline
- `output: "standalone"` is correctly set for containerized deployment
- Vitest coverage thresholds are enforced at 80% across lines, functions, branches, and statements
- `npm ci` is used throughout CI (never `npm install`)
- Postgres and Redis service container images in CI match Docker Compose versions
- Logger emits valid structured JSON and does not log PII by default
- `server-only` is imported in `redis.ts` and `client.ts`
- Prisma singleton pattern prevents connection pool exhaustion in development hot-reload

---

## Sign-off

- [ ] APPROVED
- [x] APPROVED WITH CONDITIONS
- [ ] BLOCKED

**Conditions to resolve before staging deploy (Sprint 2, first task):**
1. INFRA-REV-001: Generate and commit Prisma initial migration (`prisma migrate dev --name init`)
2. INFRA-REV-002: Add Docker build + Trivy scan stage to committed `ci.yml`
3. INFRA-REV-003: Add Semgrep SAST step to committed `ci.yml`

**Conditions to resolve before production deploy:**
4. INFRA-REV-004: Implement real service checks in the health endpoint
5. INFRA-REV-005: Fix Playwright `webServer.command` to use production server in CI
6. INFRA-REV-006: Add Redis error event handler
7. INFRA-REV-007: Remove caret from `next-auth` beta version pin
8. INFRA-REV-012: Commit `deploy.yml` workflow
