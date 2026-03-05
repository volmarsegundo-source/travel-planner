# Release Manager -- Persistent Memory

## Project State

- **Current version**: 0.5.0 (Sprint 5 merged; Sprint 6 pending merge -- bump to 0.6.0 required)
- **Changelog**: exists at `C:\travel-planner\CHANGELOG.md` -- entries for 0.1.0 through 0.5.0
- **Release risk register**: exists at `C:\travel-planner\docs\release-risk.md` -- CIA-001 closed, CIA-002 open, CIA-003 closed
- **API contracts**: no public REST endpoints in MVP scope; `/api/v1/health` is the only live REST endpoint
- **Production users**: zero -- system is in Bootstrap Phase (pre-deploy)
- **Deploy status**: BLOCKED -- Sprint 2 schema migration resolved (RISK-001 closed Sprint 3), but deploy.yml still placeholder (RISK-005)

## Versioning Baseline

- Initial release is **0.1.0** (not 1.0.0 -- public API not yet stable; SemVer pre-1.0)
- Pre-1.0 breaking change policy: even in 0.x.x, any breaking change to an existing Server Action signature or data migration of existing data requires a MINOR bump and a migration guide
- 1.0.0 will be declared when the REST API is publicly stable
- Version history: 0.1.0 -> 0.2.0 -> 0.3.0 -> 0.4.0 -> 0.5.0 -> 0.6.0 (pending)

## Key Architectural Facts

- Stack: Next.js 15 App Router + Prisma 7 + PostgreSQL 16 + Redis (Upstash) + Auth.js v5
- All mutations use Server Actions -- no REST endpoints in MVP scope for trips feature
- REST endpoints under `/api/v1/` are planned for future external integrations (mobile, webhooks)
- Soft delete is mandatory for all user-owned entities (Trip, User) -- `deletedAt` field
- User data isolation enforced at query level: every Trip query includes `userId` in WHERE clause
- CUID2 is the ID strategy for all primary keys
- Security headers now set dynamically in middleware.ts (not next.config.ts) -- Sprint 6 change
- CSP uses per-request nonce (crypto.randomUUID()) since Sprint 6

## CIA Conventions Established

- CIA IDs: CIA-XXX format, sequential
- CIA-001 covers US-001 / SPEC-001 -- closed
- CIA-002 covers Sprint 2 Hardening -- OPEN (some risks still pending)
- CIA-003 covers Sprint 6 -- closed (non-breaking, MINOR)
- Next ID: CIA-004

## Open Risks (cross-sprint)

- RISK-003 ALTO: `avatarUrl` removed without checking existing data (Sprint 2)
- RISK-004 ALTO: Health check 503 -- monitors not updated (Sprint 2)
- RISK-005 ALTO: `deploy.yml` is placeholder (Sprint 2)
- RISK-006 ALTO: GitHub Actions secrets not confirmed (Sprint 2)
- RISK-007 MEDIO: `next-auth` pinned on beta (Sprint 2)
- RISK-008 MEDIO: Schema diagram outdated in architecture.md (Sprint 2)
- RISK-009 BAIXO: `typedRoutes` disabled (Sprint 2)
- RISK-010 MEDIO: `/api/*` routes lost security headers after Sprint 6 CSP migration (Sprint 6)
- RISK-011 BAIXO: CSP nonce not propagated to HTML layout (Sprint 6)
- RISK-012 BAIXO: OnboardingWizard uses `next/navigation` useRouter instead of `@/i18n/navigation` (Sprint 6)

## Communication Language

- All docs and team communication in **Portuguese**
- Code, variables, functions, commits in **English**
- Release notes for stakeholders written in **Portuguese**

## Sprint Review Format

- Reviews stored at `C:\travel-planner\docs\sprint-reviews\SPRINT-XXX-release-manager-review.md`
- Completed reviews: Sprint 5 (SPRINT-005-release-manager-review.md), Sprint 6 (SPRINT-006-release-manager-review.md)
