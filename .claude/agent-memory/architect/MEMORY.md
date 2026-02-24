# Architect Memory — Travel Planner

## Project State
- Greenfield project, Phase 1 bootstrap complete; Phase 2 spec writing in progress
- ADR-001 and ADR-002 written in docs/architecture.md (2026-02-23)
- SPEC-001 written: docs/SPEC-001.md (2026-02-23) — Trip Creation & Management (US-001)
- No source code exists yet — architecture doc is the foundation

## Confirmed Tech Stack (ADR-001, Accepted 2026-02-23)
- Framework: Next.js 15 App Router (full-stack monolito modular)
- Language: TypeScript 5.x (strict, no `any`)
- Styling: Tailwind CSS 4 + shadcn/ui
- ORM: Prisma 7 (pure TS, schema-first, safe migrations)
- Database: PostgreSQL 16
- Cache/Sessions: Redis via Upstash (serverless-compatible)
- Auth: Auth.js v5 / NextAuth v5 (self-hosted, no vendor lock-in — GDPR)
- Maps: Mapbox GL JS 3.x
- State: TanStack Query v5
- Forms: React Hook Form + Zod
- Testing: Vitest + Playwright
- CI/CD: GitHub Actions
- Hosting target: Vercel (frontend) + Railway/Render (DB)
- Errors: Sentry + OpenTelemetry

## Key Architectural Decisions
- Auth.js chosen over Clerk: user data stays on our infra (GDPR)
- Prisma chosen over Drizzle: safer migrations for team, Prisma 7 removed cold start gap
- Mapbox chosen over Google Maps: cost + customization
- Monolith over microservices: 2-dev team, MVP stage
- CUID2 for all primary keys (not UUID)
- Soft deletes on all user-owned entities (deletedAt)
- IDs in API: never expose auto-increment integers — always CUID2
- Trip cover: gradient name string + emoji string (no image URL in v1)
- Trip status: PLANNING (default), ACTIVE, COMPLETED, ARCHIVED — as const enum pattern
- MAX_ACTIVE_TRIPS = 20 (MVP business rule) — enforced in TripService, not only client

## Critical Conventions (must be in every spec)
- `src/server/` is server-only (import "server-only" required)
- Prisma client singleton only in `src/server/db/client.ts`
- Env vars validated via `@t3-oss/env-nextjs` at startup
- Error classes: AppError, NotFoundError, UnauthorizedError, ForbiddenError
- Authorization checked BEFORE data access in every handler
- All list endpoints paginated (default 20, max 100)
- API error shape: { error: { code, message, status, timestamp, requestId } }
- Soft delete: never hard DELETE user data, use deletedAt
- BOLA mitigation: always include userId in Prisma where clause (never fetch by id alone)
- Mass assignment: never spread user input into Prisma create/update — map fields explicitly
- redirect() from next/navigation must NOT be inside try/catch blocks (throws internally)
- Prisma 7: use db.$extends (not deprecated db.$use) for global middleware/soft-delete

## Specs Written
- SPEC-001 (2026-02-23): Trip Creation & Management — docs/SPEC-001.md
  - Covers: Prisma Trip schema, TripService, 4 Server Actions, 4 pages, component tree
  - Open questions: OQ-001 (auto status transitions), OQ-002 (destination field evolution),
    OQ-003 (listTrips default filter), OQ-004 (useActionState signature), OQ-005 (Prisma 7 extensions)
  - Blocked on: security-specialist review + tech-lead review before Approved

## Next Specs to Write
- SPEC-002: Itinerary Builder (US-002) — depends on SPEC-001 approved + Trip entity in DB
- SPEC-003: User Authentication (US-003) — parallel to SPEC-001 in Sprint 1

## Open Questions (blocking future specs)
- Payment integration scope (PCI-DSS impact)
- Mobile app plan (BFF pattern needed?)
- Multi-tenancy / B2B agent accounts (schema impact)
- Analytics platform: PostHog selected (see docs/data-architecture.md)
- Email notifications provider
- OQ-003 from SPEC-001: default filter for TripService.listTrips (must resolve before dev)

## File Locations
- Architecture: docs/architecture.md
- API contracts: docs/api.md (not yet created)
- Tasks/backlog: docs/tasks.md
- UX patterns: docs/ux-patterns.md
- Security: docs/security.md
- Data architecture: docs/data-architecture.md
- SPEC-001: docs/SPEC-001.md
- Agent definitions: .claude/agents/
