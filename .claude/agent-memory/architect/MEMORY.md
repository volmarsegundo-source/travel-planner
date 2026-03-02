# Architect Memory — Travel Planner

## Project State
- Sprint 5 started 2026-03-01; SPEC-005 written
- Sprint 2 (hardening) complete as of 2026-02-26; Sprint 2 arch review done
- ADR-001-002 (2026-02-23); ADR-003-005 (2026-02-26); ADR-006-007 (2026-03-01)
- SPEC-001 written: docs/SPEC-001.md (2026-02-23) — Trip Creation & Management (US-001)
- SPEC-005 written: docs/specs/SPEC-005-authenticated-navigation.md (2026-03-01) — Sprint 5 nav + fixes
- Source code exists: trips CRUD, AI itinerary/checklist, i18n (next-intl), auth, health check

## Confirmed Tech Stack (ADR-001, Accepted 2026-02-23)
- Framework: Next.js 15 App Router (full-stack monolito modular)
- Language: TypeScript 5.x (strict, no `any`)
- Styling: Tailwind CSS 4 + shadcn/ui
- ORM: Prisma 7 (pure TS, schema-first, safe migrations)
- Database: PostgreSQL 16
- Cache/Sessions: Redis via ioredis (Upstash-compatible); singleton in src/server/cache/redis.ts
- Auth: Auth.js v5 / NextAuth v5 — DATABASE session strategy (PrismaAdapter) — see ADR-005
- AI: Anthropic SDK, claude-sonnet-4-6 (itinerary), claude-haiku-4-5-20251001 (checklist)
- i18n: next-intl with [locale] routing, locales: pt-BR (default), en — see ADR-004
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
- Soft deletes on all user-owned entities (deletedAt); deactivatedAt separate for account suspension
- Session strategy: JWT (auth.ts has `session: { strategy: "jwt" }`); ADR-005 text says "database" but code uses JWT
- IDs in API: never expose auto-increment integers — always CUID2
- Trip cover: gradient name string + emoji string (no image URL in v1)
- Trip status: PLANNING (default), ACTIVE, COMPLETED, ARCHIVED — as const enum pattern
- MAX_ACTIVE_TRIPS = 20 (MVP business rule) — enforced in TripService, not only client
- ChecklistItem and ItineraryDay use onDelete: Cascade (derived/computed data, not user primary data)
- AI cache: MD5-keyed Redis 24h TTL; budget bucketing to nearest 500; month-level for checklist
- ADR-006: Route group (app) for authenticated layout — navbar via shared layout.tsx
- ADR-007: LanguageSwitcher moved to components/layout/ for reuse across public + auth zones

## Critical Conventions (must be in every spec)
- `src/server/` is server-only (import "server-only" required)
- Prisma client singleton only in `src/server/db/client.ts`
- Redis client singleton in `src/server/cache/redis.ts` (ioredis)
- CacheKeys helper in `src/server/cache/keys.ts`
- Env vars validated via `@t3-oss/env-nextjs` in `src/lib/env.ts` at startup
- Error classes: AppError, NotFoundError, UnauthorizedError, ForbiddenError (src/lib/errors.ts)
- mapErrorToKey() helper in `src/lib/action-utils.ts` — maps AppError to i18n key
- Authorization checked BEFORE data access in every handler
- All list endpoints paginated (default 20, max 100)
- API error shape: { error: { code, message, status, timestamp, requestId } }
- Soft delete: never hard DELETE user data, use deletedAt
- BOLA mitigation: always include userId in Prisma where clause (never fetch by id alone)
- Mass assignment: never spread user input into Prisma create/update — map fields explicitly
  - createTrip: fixed in Sprint 2 (explicit field mapping)
  - updateTrip: STILL USES SPREAD — must fix in Sprint 3 (DT-004)
- redirect() from next/navigation must NOT be inside try/catch blocks (throws internally)
- Prisma 7: use db.$extends (not deprecated db.$use) for global middleware/soft-delete
- Rate limiting: checkRateLimit() in src/lib/rate-limit.ts — BUT has race condition (INCR+EXPIRE not atomic)
- i18n navigation: use src/i18n/navigation.ts exports (Link, redirect, usePathname, useRouter) — NOT next/link
- typedRoutes disabled in next.config.ts (incompatible with next-intl [locale] routing)

## Known Issues / Open Defects (from Sprint 2 arch review)
- CRITICO: CSP has unsafe-eval + unsafe-inline in script-src — neutralizes XSS protection
- ALTO: generateChecklistAction has no rate limit (financial exposure to Anthropic API)
- ALTO: ChecklistItem.priority field missing from Prisma schema — silently discarded
- ALTO: Rate limiter race condition (INCR + EXPIRE not atomic — use Lua script)
- ALTO: updateTrip uses implicit spread — mass assignment risk if schema expands
- MEDIO: getAnthropic() bypasses env.ts validation (reads process.env directly)
- MEDIO: Redis singleton not persisted in globalThis in production (connection leak risk on Railway/Render)
- MEDIO: auth.ts uses process.env directly for Google credentials (should use env.ts)
- MEDIO: Architecture diagram still shows Redis as session store (sessions are JWT per actual code; ADR-005 text inconsistent)
- MEDIO: ADR-005 says "database session strategy" but auth.ts uses `session: { strategy: "jwt" }` — text vs code mismatch

## Specs Written
- SPEC-001 (2026-02-23): Trip Creation & Management — docs/SPEC-001.md
- SPEC-005 (2026-03-01): Authenticated Navigation & Fixes — docs/specs/SPEC-005-authenticated-navigation.md

## File Locations
- Architecture: docs/architecture.md
- API contracts: docs/api.md
- Tasks/backlog: docs/tasks.md
- UX patterns: docs/ux-patterns.md
- Security: docs/security.md
- Data architecture: docs/data-architecture.md
- SPEC-001: docs/SPEC-001.md
- SPEC-005: docs/specs/SPEC-005-authenticated-navigation.md
- Agent definitions: .claude/agents/
- i18n routing: src/i18n/routing.ts
- i18n navigation wrapper: src/i18n/navigation.ts
- Rate limiter: src/lib/rate-limit.ts
- Action error mapper: src/lib/action-utils.ts
- AI service: src/server/services/ai.service.ts
- LoginForm: src/components/features/auth/LoginForm.tsx
- Header (public): src/components/layout/Header.tsx
- LanguageSwitcher: src/components/landing/LanguageSwitcher.tsx (to move to components/layout/ per ADR-007)

## Sprint 5 Findings
- LoginForm bug: missing catch block in handleCredentialsSubmit — signIn may throw instead of returning { ok: false }
- Auth session strategy is JWT (code), not database (ADR-005 text) — clarify in future ADR revision
- Authenticated routes have no shared layout — each page renders raw content without navbar
- Existing back links in sub-pages (itinerary, checklist, generate) are plain text links, not breadcrumbs
- LanguageSwitcher in components/landing/ but needed in both public and auth zones
