# Architect Memory — Travel Planner

## Project State
- Sprint 9 review done 2026-03-06; Sprint 9 APPROVED WITH OBSERVATIONS (architect)
- Sprint 6 review done 2026-03-04; Sprint 6 APPROVED WITH OBSERVATIONS
- Sprint 5 complete; Sprint 2 (hardening) complete as of 2026-02-26
- ADR-001-002 (2026-02-23); ADR-003-005 (2026-02-26); ADR-006-007 (2026-03-01)
- ADR-005 revised 2026-03-04: corrected from "database sessions" to "JWT sessions"
- ADR-008 PENDING: engines convention (src/lib/engines/ vs src/server/services/)
- SPEC-001 written: docs/SPEC-001.md (2026-02-23)
- SPEC-005 written: docs/specs/SPEC-005-authenticated-navigation.md (2026-03-01)
- 588 tests passing, 0 failures

## Confirmed Tech Stack (ADR-001, Accepted 2026-02-23)
- Framework: Next.js 15 App Router (full-stack monolito modular)
- Language: TypeScript 5.x (strict, no `any`)
- Styling: Tailwind CSS 4 + shadcn/ui
- ORM: Prisma 7 (pure TS, schema-first, safe migrations)
- Database: PostgreSQL 16
- Cache/Sessions: Redis via ioredis (Upstash-compatible); singleton in src/server/cache/redis.ts
- Auth: Auth.js v5 / NextAuth v5 — JWT session strategy (PrismaAdapter for User/Account) — ADR-005 revised
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
- Session strategy: JWT (`session: { strategy: "jwt" }`) — ADR-005 corrected Sprint 6
- IDs in API: never expose auto-increment integers — always CUID2
- Trip cover: gradient name string + emoji string (no image URL in v1)
- Trip status: PLANNING (default), ACTIVE, COMPLETED, ARCHIVED — as const enum pattern
- MAX_ACTIVE_TRIPS = 20 (MVP business rule) — enforced in TripService
- ChecklistItem and ItineraryDay use onDelete: Cascade (derived/computed data)
- AI cache: MD5-keyed Redis 24h TTL; budget bucketing to nearest 500; month-level for checklist
- ADR-006: Route group (app) for authenticated layout — navbar via shared layout.tsx
- ADR-007: LanguageSwitcher moved to components/layout/ for reuse across public + auth zones
- CSP: nonce per request via middleware (Sprint 6); unsafe-inline only in style-src (Tailwind limitation)
- Rate limiter: atomic Lua script (INCR + conditional EXPIRE) via redis.eval (Sprint 6)

## Atlas Gamification (Sprint 9)
- Engines in src/lib/engines/ (phase-config isomorphic, points-engine + phase-engine server-only)
- 4 new Prisma models: UserProgress, ExpeditionPhase, PointTransaction, UserBadge
- Trip model extended: expeditionMode (bool, default true), currentPhase (int, default 1)
- Points denormalized in UserProgress (totalPoints + availablePoints) — O(1) reads
- PointTransaction as append-only audit trail (positive=earn, negative=spend)
- Badge idempotency via @@unique([userId, badgeKey])
- Phase ordering enforced: trip.currentPhase must match phaseNumber
- 8 phases per trip, created via ExpeditionPhase.createMany
- PhaseEngine.completePhase orchestrates in $transaction: mark completed + earn points + badge + rank + unlock next
- WELCOME_BONUS = 500 points; daily_login = 10 points; phase rewards sum to 2100
- String columns for rank/badge/status (not Prisma enums) — more flexible for additions

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
  - updateTrip: STILL USES SPREAD — must fix (DT-004)
- redirect() from next/navigation must NOT be inside try/catch blocks (throws internally)
- Prisma 7: use db.$extends (not deprecated db.$use) for global middleware/soft-delete
- Rate limiting: checkRateLimit() in src/lib/rate-limit.ts — atomic Lua script (fixed Sprint 6)
- i18n navigation: use src/i18n/navigation.ts exports (Link, redirect, usePathname, useRouter) — NOT next/link
- typedRoutes disabled in next.config.ts (incompatible with next-intl [locale] routing)

## Known Issues / Open Defects
### Resolved in Sprint 6
- ~~CRITICO: CSP unsafe-eval + unsafe-inline in script-src~~ RESOLVED (T-038)
- ~~ALTO: generateChecklistAction no rate limit~~ RESOLVED (T-041, 5 req/hr/user)
- ~~ALTO: Rate limiter race condition~~ RESOLVED (T-039, Lua script)
- ~~MEDIO: ADR-005 text vs code mismatch~~ RESOLVED (T-040)

### Still Open (pre-Sprint 9)
- ALTO: updateTrip uses implicit spread — mass assignment risk (DT-004)
- ALTO: ChecklistItem.priority field missing from Prisma schema — silently discarded
- ALTO: TrustSignals.tsx uses next/link instead of @/i18n/navigation — broken in prod (DT-010)
- MEDIO: OnboardingWizard.tsx uses useRouter from next/navigation instead of @/i18n/navigation (DT-011)
- MEDIO: getAnthropic() bypasses env.ts validation (reads process.env directly)
- MEDIO: Redis singleton not persisted in globalThis in production (connection leak risk)
- MEDIO: auth.ts uses process.env directly for Google credentials (should use env.ts)
- MEDIO: TrustSignals link to /account/delete points to nonexistent route (DT-014, Sprint 7)
- BAIXO: OnboardingWizard Step 3 back button tautological ternary (DT-013)

### Sprint 9 Debt
- ALTO: DT-S9-001 — spendPoints no $transaction (TOCTOU race condition, saldo negativo possivel)
- MEDIO: DT-S9-002 — Trip type + TRIP_SELECT missing expeditionMode/currentPhase
- MEDIO: DT-S9-003 — ADR-008 pending (engines vs services convention)
- MEDIO: DT-S9-004 — Inconsistency Prisma enums (Trip) vs string columns (gamification)
- BAIXO: DT-S9-005 — Welcome bonus uses type "purchase" instead of "welcome_bonus"
- BAIXO: DT-S9-006 — getTransactionHistory missing pageSize max 100 cap
- BAIXO: DT-S9-007 — recordDailyLogin potential double-award under concurrency
- BAIXO: DT-S9-008 — AI_COSTS and SpendPointsSchema.type enum drift risk

## Rate Limits (current)
- generateTravelPlanAction: 10 req/hr/user (ai:plan:{userId})
- generateChecklistAction: 5 req/hr/user (ai:checklist:{userId})
- registerAction: 5 req/15min
- loginAction: 10 req/15min

## Specs Written
- SPEC-001 (2026-02-23): Trip Creation & Management — docs/SPEC-001.md
- SPEC-005 (2026-03-01): Authenticated Navigation & Fixes — docs/specs/SPEC-005-authenticated-navigation.md

## File Locations (Sprint 9 additions)
- Gamification types: src/types/gamification.types.ts
- Phase config (isomorphic): src/lib/engines/phase-config.ts
- Points engine (server-only): src/lib/engines/points-engine.ts
- Phase engine (server-only): src/lib/engines/phase-engine.ts
- Gamification schemas: src/lib/validations/gamification.schema.ts
- Migration: prisma/migrations/20260306143505_atlas_gamification_models/

## File Locations
- Architecture: docs/architecture.md
- API contracts: docs/api.md
- Tasks/backlog: docs/tasks.md
- UX patterns: docs/ux-patterns.md
- Security: docs/security.md
- Data architecture: docs/data-architecture.md
- Sprint reviews: docs/sprint-reviews/
- SPEC-001: docs/SPEC-001.md
- SPEC-005: docs/specs/SPEC-005-authenticated-navigation.md
- Agent definitions: .claude/agents/
- i18n routing: src/i18n/routing.ts
- i18n navigation wrapper: src/i18n/navigation.ts
- Rate limiter: src/lib/rate-limit.ts (atomic Lua script)
- Action error mapper: src/lib/action-utils.ts
- AI actions: src/server/actions/ai.actions.ts
- AI service: src/server/services/ai.service.ts
- LoginForm: src/components/features/auth/LoginForm.tsx
- TrustSignals: src/components/features/auth/TrustSignals.tsx
- OnboardingWizard: src/components/features/onboarding/OnboardingWizard.tsx
- ProgressIndicator: src/components/features/onboarding/ProgressIndicator.tsx
- Header (public): src/components/layout/Header.tsx
- LanguageSwitcher: src/components/layout/LanguageSwitcher.tsx
- Auth layout: src/app/[locale]/auth/layout.tsx (Header + Footer)
- AppShellLayout: src/app/[locale]/(app)/layout.tsx
- Middleware: src/middleware.ts (auth + i18n + CSP nonce)

## Sprint 9 Findings
- Engines pattern (static class methods) pragmatic for MVP — essentially namespaces
- phase-config.ts correctly isomorphic (no server-only) for client import of definitions
- points-engine and phase-engine are effectively server services but in src/lib/engines/
- spendPoints has TOCTOU race condition — needs $transaction wrapping before production
- Trip type/TRIP_SELECT not updated with gamification fields — integration gap
- String columns vs Prisma enums inconsistency should be documented in ADR-008
- Welcome bonus type "purchase" is semantically wrong — should be "welcome_bonus"
- 119 new tests, all unit (mock-heavy); integration tests with real DB would add confidence
- expeditionMode defaults true on ALL trips including pre-existing — acceptable for MVP only

## Sprint 6 Findings
- CSP nonce via crypto.randomUUID() in Edge middleware — production removes unsafe-eval from script-src
- style-src still has unsafe-inline (Tailwind limitation, accepted trade-off)
- Middleware accumulates 4 responsibilities (auth, i18n, route protection, CSP) — monitor complexity
- OnboardingWizard is monolithic (397 lines) — extract steps if it grows
- Fixed window rate limiter has 2x burst at window boundary — acceptable for MVP
- TrustSignals uses wrong Link import (next/link vs @/i18n/navigation) — MUST fix Sprint 7
- buildCsp() not exported from middleware — tests replicate logic instead of testing directly
