# Release Manager -- Persistent Memory

## Project State

- **Current version**: 0.17.0 in package.json (Sprint 24 complete)
- **Changelog**: individual changelogs at `C:\travel-planner\docs\changelogs\CHANGELOG-vX.Y.Z.md`
- **Release risk register**: exists at `C:\travel-planner\docs\release-risk.md` -- CIA-001 closed, CIA-002 open, CIA-003 closed, CIA-004 closed, CIA-005 closed (Sprint 19), CIA-006 closed (Sprint 20)
- **API contracts**: no public REST endpoints in MVP scope; `/api/v1/health` is the only live REST endpoint; `/api/ai/plan/stream` is internal SSE endpoint
- **Production users**: zero -- system is in Bootstrap Phase (pre-deploy)
- **Deploy status**: BLOCKED -- deploy.yml still placeholder (RISK-005)
- **Release checklist template**: `docs/specs/templates/TEMPLATE-RELEASE-CHECKLIST.md`

## Versioning Baseline

- Initial release is **0.1.0** (not 1.0.0 -- public API not yet stable; SemVer pre-1.0)
- Pre-1.0 breaking change policy: even in 0.x.x, any breaking change to an existing Server Action signature or data migration of existing data requires a MINOR bump and a migration guide
- 1.0.0 will be declared when the REST API is publicly stable
- Version history: 0.1.0 -> 0.2.0 -> ... -> 0.14.0 (Sprint 20) -> 0.15.0 -> 0.16.0 (Sprint 23) -> 0.17.0 (Sprint 24)

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
- Account deletion cascade now includes TransportSegment + Accommodation -- Sprint 20
- Streaming itinerary generation now persists to DB before [DONE] with Redis generation lock -- Sprint 19
- Itinerary persistence extracted to shared service (`itinerary-persistence.service.ts`) -- Sprint 19
- userId hashed with SHA-256 in all gamification logs (PointsEngine + PhaseEngine) -- Sprint 20, SEC-S19-001

## CIA Conventions Established

- CIA IDs: CIA-XXX format, sequential
- CIA-001 covers US-001 / SPEC-001 -- closed
- CIA-002 covers Sprint 2 Hardening -- OPEN (some risks still pending)
- CIA-003 covers Sprint 6 -- closed (non-breaking, MINOR)
- CIA-004 covers Sprint 7 -- closed (non-breaking, MINOR)
- CIA-005 covers Sprint 19 -- closed (non-breaking, MINOR, 0.12.0 -> 0.13.0)
- CIA-006 covers Sprint 20 -- closed (non-breaking, MINOR, 0.13.0 -> 0.14.0)
- Next ID: CIA-007

## Open Risks (cross-sprint)

- RISK-003 ALTO: `avatarUrl` removed without checking existing data (Sprint 2)
- RISK-004 ALTO: Health check 503 -- monitors not updated (Sprint 2)
- RISK-005 ALTO: `deploy.yml` is placeholder (Sprint 2)
- RISK-006 ALTO: GitHub Actions secrets not confirmed (Sprint 2)
- RISK-007 MEDIO: `next-auth` pinned on beta 5.0.0-beta.30 (Sprint 2)
- RISK-008 MEDIO: Schema diagram outdated in architecture.md (Sprint 2, worsened Sprint 7+20: TransportSegment, Accommodation, passengers, origin, localMobility, preferences all missing)
- RISK-009 BAIXO: `typedRoutes` disabled (Sprint 2)
- RISK-010 MEDIO: `/api/*` routes lost security headers after Sprint 6 CSP migration (Sprint 6)
- RISK-011 BAIXO: CSP nonce not propagated to HTML layout (Sprint 6)
- RISK-012 FECHADO: OnboardingWizard useRouter fixed in Sprint 7
- RISK-013 FECHADO: userId hash applied in Sprint 20 (SEC-S19-001)
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
- Completed reviews: Sprint 5, Sprint 6, Sprint 7, Sprint 19, Sprint 20

## Sprint 20 Key Changes (for reference)

- New models: TransportSegment, Accommodation (schema-only, UI in Sprint 21)
- New fields: Trip.passengers (JSON), Trip.origin, Trip.localMobility, UserProfile.preferences (JSON)
- New files: preferences.service.ts, preferences.schema.ts, transport.schema.ts, PreferencesSection.tsx, PreferenceCategory.tsx, PreferenceChip.tsx, PreferenceProgressBar.tsx
- Modified: Phase1Wizard (reorder + profile skip), Phase2Wizard (passenger selector), PointsEngine + PhaseEngine (userId hash), account.actions.ts (cascade), ExpeditionCard (remove dup buttons), DestinationGuideWizard (guard undefined sections)
- 3 migrations: add_user_preferences, add_transport_and_accommodation, add_passengers_to_trip
- No new env vars, no new npm deps
- SEC-S19-001 resolved (RISK-013 closed)
- Phase 4 renamed from "preparation" to "logistics"

## Spec-Driven Development (SDD) -- Starting Sprint 25

- **SDD officially mandated starting Sprint 25** -- all features require a spec before implementation
- **Current version at SDD start**: v0.17.0 (Sprint 24 complete)
- **Changelog entries must reference spec IDs** (e.g., `[SPEC-PROD-XXX]`, `[SPEC-ARCH-XXX]`)
- **Release notes must link to implemented specs** -- each feature tied to its originating spec
- **Breaking changes must reference ADR** -- architecture spec ADRs required for any breaking change
- **Version bump rules under SDD**:
  - MAJOR = breaking spec change (existing contract violated)
  - MINOR = new spec implemented (backward-compatible feature)
  - PATCH = spec-conforming bugfix (no new behavior)
- **Spec conformance audit (QA-CONF-XXX) must pass before release approval** -- no exceptions
- **Release checklist template**: `docs/specs/templates/TEMPLATE-RELEASE-CHECKLIST.md`
- **All commits should reference spec IDs** in their messages
- **Spec status must be "Implemented" before release** -- partially implemented specs block release
- **CIA assessments under SDD** reference spec IDs in the "Related Spec / PR" field
