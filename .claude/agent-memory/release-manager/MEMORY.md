# Release Manager -- Persistent Memory

## Project State

- **Current version**: 0.13.0 in package.json (Sprint 19 on feat/sprint-19 branch)
- **Changelog**: individual changelogs at `C:\travel-planner\docs\changelogs\CHANGELOG-vX.Y.Z.md`
- **Release risk register**: exists at `C:\travel-planner\docs\release-risk.md` -- CIA-001 closed, CIA-002 open, CIA-003 closed, CIA-004 closed, CIA-005 closed (Sprint 19)
- **API contracts**: no public REST endpoints in MVP scope; `/api/v1/health` is the only live REST endpoint; `/api/ai/plan/stream` is internal SSE endpoint
- **Production users**: zero -- system is in Bootstrap Phase (pre-deploy)
- **Deploy status**: BLOCKED -- deploy.yml still placeholder (RISK-005)

## Versioning Baseline

- Initial release is **0.1.0** (not 1.0.0 -- public API not yet stable; SemVer pre-1.0)
- Pre-1.0 breaking change policy: even in 0.x.x, any breaking change to an existing Server Action signature or data migration of existing data requires a MINOR bump and a migration guide
- 1.0.0 will be declared when the REST API is publicly stable
- Version history: 0.1.0 -> 0.2.0 -> ... -> 0.12.0 -> 0.13.0 (Sprint 19)

## Key Architectural Facts

- Stack: Next.js 15 App Router + Prisma 7 + PostgreSQL 16 + Redis (Upstash) + Auth.js v5
- All mutations use Server Actions -- no REST endpoints in MVP scope for trips feature
- REST endpoints under `/api/v1/` are planned for future external integrations (mobile, webhooks)
- Soft delete is mandatory for all user-owned entities (Trip, User) -- `deletedAt` field
- User data isolation enforced at query level: every Trip query includes `userId` in WHERE clause
- CUID2 is the ID strategy for all primary keys
- Security headers now set dynamically in middleware.ts (not next.config.ts) -- Sprint 6 change
- CSP uses per-request nonce (crypto.randomUUID()) since Sprint 6
- Account deletion uses PII anonymization (SHA-256 hash) + soft delete in atomic transaction -- Sprint 7
- Streaming itinerary generation now persists to DB before [DONE] with Redis generation lock -- Sprint 19
- Itinerary persistence extracted to shared service (`itinerary-persistence.service.ts`) -- Sprint 19

## CIA Conventions Established

- CIA IDs: CIA-XXX format, sequential
- CIA-001 covers US-001 / SPEC-001 -- closed
- CIA-002 covers Sprint 2 Hardening -- OPEN (some risks still pending)
- CIA-003 covers Sprint 6 -- closed (non-breaking, MINOR)
- CIA-004 covers Sprint 7 -- closed (non-breaking, MINOR)
- CIA-005 covers Sprint 19 -- closed (non-breaking, MINOR, 0.12.0 -> 0.13.0)
- Next ID: CIA-006

## Open Risks (cross-sprint)

- RISK-003 ALTO: `avatarUrl` removed without checking existing data (Sprint 2)
- RISK-004 ALTO: Health check 503 -- monitors not updated (Sprint 2)
- RISK-005 ALTO: `deploy.yml` is placeholder (Sprint 2)
- RISK-006 ALTO: GitHub Actions secrets not confirmed (Sprint 2)
- RISK-007 MEDIO: `next-auth` pinned on beta 5.0.0-beta.30 (Sprint 2)
- RISK-008 MEDIO: Schema diagram outdated in architecture.md (Sprint 2, worsened Sprint 7: preferredLocale missing)
- RISK-009 BAIXO: `typedRoutes` disabled (Sprint 2)
- RISK-010 MEDIO: `/api/*` routes lost security headers after Sprint 6 CSP migration (Sprint 6)
- RISK-011 BAIXO: CSP nonce not propagated to HTML layout (Sprint 6)
- RISK-012 FECHADO: OnboardingWizard useRouter fixed in Sprint 7
- RISK-013 BAIXO: userId logged in cleartext in updateUserProfile (Sprint 7)
- RISK-014 BAIXO: "Portugues (Brasil)" missing accent in ProfileForm (Sprint 7)
- RISK-015 MEDIO: Footer authenticated links /terms, /privacy, /support -> 404 (Sprint 7)
- RISK-016 BAIXO: aria-label="Loading" hardcoded English in skeletons (Sprint 7)

## Communication Language

- All docs and team communication in **Portuguese**
- Code, variables, functions, commits in **English**
- Release notes for stakeholders written in **Portuguese**

## Sprint Review Format

- Reviews stored at `C:\travel-planner\docs\sprint-reviews\SPRINT-XXX-release-manager-review.md`
- Changelogs stored at `C:\travel-planner\docs\changelogs\CHANGELOG-vX.Y.Z.md`
- Completed reviews: Sprint 5, Sprint 6, Sprint 7, Sprint 19

## Sprint 19 Key Changes (for reference)

- New files: `itinerary-persistence.service.ts`, `stream-progress.ts`, `currency.ts`
- Modified: `stream/route.ts` (persistence + lock), `Phase6Wizard.tsx` (progress UI + key prop), `account.actions.ts` (cascade delete), `phase-engine.ts` (getHighestCompletedPhase), `trip.service.ts` (completedPhases fix)
- Types expanded: `GuideSectionData` (+type, +details), `GuideSectionKey` (+4 keys)
- No schema migration, no new env vars, no new npm deps
