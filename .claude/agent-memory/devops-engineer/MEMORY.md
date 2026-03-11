# DevOps Engineer Memory — Travel Planner

## Project Stack (confirmed from architecture.md)
- Next.js 15 (App Router) + TypeScript 5 — monolito modular
- PostgreSQL 16 via Prisma 7 ORM
- Redis via Upstash (serverless-compatible)
- Auth.js v5 (NextAuth)
- Vercel (frontend hosting) + Railway/Render (PostgreSQL)
- Docker + Docker Compose (local dev parity + production container)
- GitHub Actions CI/CD
- Sentry error tracking, OpenTelemetry tracing
- Vitest (unit/integration), Playwright (E2E)

## Key Infrastructure Decisions (INFRA-001)
- Two GitHub Actions workflows: `ci.yml` (all PRs) and `deploy.yml` (main merges)
- Staging deploys automatically on push to master; production requires manual approval (workflow_dispatch)
- Docker image published to GitHub Container Registry (ghcr.io)
- Node.js version locked to 20 LTS for CI/local parity
- Coverage threshold enforced at 80% — blocks merge if below
- Trivy scans for CRITICAL/HIGH CVEs — blocks publish if found
- Semgrep SAST with `p/secrets p/owasp-top-ten` catches hardcoded credentials and OWASP issues
- REDIS_TLS_REQUIRED=true (not NODE_ENV) controls Redis TLS enforcement — NODE_ENV is "production" in local builds too
- Health endpoint uses Promise.allSettled for DB + Redis — returns HTTP 503 when degraded
- Playwright uses npm run start (not dev) in CI — controlled by process.env.CI ternary in webServer.command

## Open Issues (tracked since Sprint 2, updated Sprint 6)
- C-001: RESOLVED — Dockerfile now exists in repo
- C-002: RESOLVED — ci.yml and deploy.yml both target `master` (actual branch)
- C-003: PENDING — deploy.yml deploy steps are `echo` placeholders — no real deploy happens
- C-004: prisma/migrations/ directory missing — prisma migrate deploy has nothing to apply
- A-001: PENDING — Trivy uses docker run (not trivy-action) — no SARIF upload to GitHub Security tab
- A-003: PENDING — RAILWAY_TOKEN is single secret for both staging+production — violates least privilege

## Sprint 6 Infrastructure Changes
- CSP nonce per request via middleware (crypto.randomUUID)
- style-src still uses 'unsafe-inline' (Tailwind/Radix limitation) — acceptable for MVP
- x-nonce header forwarded but not yet consumed by layout — document before inline scripts needed
- Rate limiter atomized with Redis Lua script (INCR + conditional EXPIRE)
- Lua scripts confirmed compatible with Upstash
- Rate limit fallback: allowed=true when Redis is down
- REDIS_HOST/REDIS_PORT in .env.example but NOT consumed by code (REDIS_URL only)
- Playwright CI: workers=1, timeout=90s, retries=2 — optimized for GitHub Actions runners

## Secrets Hierarchy
- Local: `.env.local` (gitignored, never committed)
- CI/Staging/Production: GitHub Secrets scoped by Environment
- Vercel Environment Variables injected at build/runtime
- `NEXT_PUBLIC_` prefix: only safe for non-sensitive values (Mapbox pk.* token)

## Critical Rules for This Project
- `server-only` package must be imported in all `src/server/` files
- All env vars validated at startup via `@t3-oss/env-nextjs` in `src/lib/env.ts`
- Health check endpoint: `GET /api/v1/health` — checks PostgreSQL + Redis
- Structured JSON logging mandatory — no plaintext logs
- Never log: PII, emails, passwords, API keys, passport numbers
- Soft delete (deletedAt) enforced on User and Trip — never hard DELETE
- Rate limiting via Redis counters from day 1

## Environment Separation
- development: Docker Compose local (PostgreSQL port 5432, Redis port 6379)
- staging: Vercel Preview + Railway staging DB (auto-deploy on main)
- production: Vercel Production + Railway production DB (manual approval gate)

## Files Owned
- `docs/infrastructure.md` — main infra spec and CI/CD documentation
- `docs/runbooks/` — incident runbooks (to be created per incident type)
- `.github/workflows/ci.yml` — CI pipeline (to be created)
- `.github/workflows/deploy.yml` — deploy pipeline (to be created)
- `docker-compose.yml` — local dev services
- `Dockerfile` — production container

## Spec-Driven Development (SDD) — Starting Sprint 25

SDD is the mandated development methodology from Sprint 25 onward. All work must trace back to approved specs. DevOps responsibilities under SDD:

### CI/CD Enforces Spec Compliance
- Commit messages SHOULD reference spec IDs: `feat(SPEC-PROD-XXX): description`
- PR descriptions must include conformance statement: "Implements SPEC-XXX vX.Y.Z"
- CI pipeline PR checks should validate spec references are present
- No merge without spec traceability for feature/fix commits

### Infrastructure Changes Require SPEC-ARCH
- Every infra change (new resource, config change, pipeline modification) requires a SPEC-ARCH-XXX
- Spec must include rollback strategy and monitoring plan
- No environment variable additions without spec reference

### Deployment Strategy Documented per Spec
- Each SPEC-ARCH defines deployment approach (rolling, canary, blue-green)
- Feature flag requirements captured in the spec
- Rollback trigger conditions explicit and measurable

### Observability Aligned with Spec Performance Budgets
- Performance budgets from specs map to monitoring alerts (latency, throughput)
- Error budgets from specs map to SLO definitions
- Each spec's constraints produce measurable metrics in dashboards

### SDD Guide Location
- `docs/specs/templates/GUIDE-DEVOPS-SDD.md` — full integration guide

## Upstash Redis Warning
Free tier has strict limits. Monitor from day 1. Provision paid tier at 70% capacity.
Alert configured in architecture risk register.
