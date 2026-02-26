# Release Manager — Persistent Memory

## Project State

- **Current version**: 0.2.0 (Sprint 2 merged — BLOCKED pending Prisma migration)
- **Changelog**: exists at `C:\travel-planner\CHANGELOG.md` — entries for 0.1.0 and 0.2.0
- **Release risk register**: exists at `C:\travel-planner\docs\release-risk.md` — CIA-002 open
- **API contracts**: no public REST endpoints in MVP scope; `/api/v1/health` is the only live REST endpoint
- **Production users**: zero — system is in Bootstrap Phase 2
- **Deploy status**: BLOCKED — Sprint 2 schema changes have no versioned Prisma migration

## Versioning Baseline

- Initial release is **0.1.0** (not 1.0.0 — public API not yet stable; SemVer pre-1.0)
- Pre-1.0 breaking change policy: even in 0.x.x, any breaking change to an existing Server Action signature or data migration of existing data requires a MINOR bump and a migration guide
- 1.0.0 will be declared when the REST API is publicly stable

## Key Architectural Facts

- Stack: Next.js 15 App Router + Prisma 7 + PostgreSQL 16 + Redis (Upstash) + Auth.js v5
- All mutations use Server Actions — no REST endpoints in MVP scope for trips feature
- REST endpoints under `/api/v1/` are planned for future external integrations (mobile, webhooks)
- Soft delete is mandatory for all user-owned entities (Trip, User) — `deletedAt` field
- User data isolation enforced at query level: every Trip query includes `userId` in WHERE clause
- CUID2 is the ID strategy for all primary keys

## CIA Conventions Established

- CIA IDs: CIA-XXX format, sequential
- CIA-001 covers US-001 / SPEC-001 — closed
- CIA-002 covers Sprint 2 Hardening — OPEN, deploy BLOCKED
- Assessment template follows the standard format defined in the agent persona

## Sprint 2 Open Risks (CIA-002)

- RISK-001 CRITICO: No versioned Prisma migration created — `prisma migrate deploy` will not apply schema changes
- RISK-002 CRITICO: `ci.yml` triggers on `main`/`develop` but repo uses `master` — CI not running on PRs to master
- RISK-003 ALTO: `avatarUrl` removed without checking for existing data in staging/prod
- RISK-004 ALTO: Health check 503 behavior change — uptime monitors not yet updated
- RISK-005 ALTO: `deploy.yml` step is a placeholder `echo` — no real deploy happening
- RISK-006 ALTO: GitHub Actions secrets not confirmed (RAILWAY_TOKEN, STAGING_DATABASE_URL, etc.)

## Schema Changes Requiring Migration (Sprint 2)

- `users` table: ADD COLUMN `deactivated_at TIMESTAMP NULL`
- `users` table: DROP COLUMN `avatar_url` (verify data before dropping)
- CREATE TABLE `checklist_items` with FK to `trips`

## Communication Language

- All docs and team communication in **Portuguese**
- Code, variables, functions, commits in **English**
- Release notes for stakeholders written in **Portuguese**
