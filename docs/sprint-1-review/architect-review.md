# Architect Review — Sprint 1

**Date:** 2026-02-26
**Reviewer:** Architect Agent
**Branch:** feat/sprint-1
**Spec Reference:** docs/SPEC-001.md
**ADR References:** ADR-001, ADR-002 (docs/architecture.md)

---

## Executive Summary

Sprint 1 delivered a solid foundational implementation that largely follows the architectural constraints established in ADR-001 and ADR-002. The service layer, authorization model, and error hierarchy are well-structured and consistent. Four issues require attention before merge: a critical cache key collision between `ai.service.ts` functions, a mass-assignment vector in `trip.service.ts` `createTrip`, a violation of the env-vars convention in the Redis client, and a `MAX_TRIPS_PER_USER` business rule discrepancy between the spec (20) and the implementation (50). None of these are blockers for a hotfix cycle, but the cache collision and the mass-assignment issue must be resolved before the branch enters production.

---

## Dimension Reviews

### 1. Layering and Separation of Concerns

**Rating: WARNING**

The service layer (`src/server/services/`) is correctly isolated behind `"server-only"` imports and contains no HTTP or framework dependencies — a clean pass on the primary intent of ADR-002. Server Actions (`src/server/actions/`) correctly sit as the thin orchestration layer between Next.js and the service layer, handling auth, Zod parsing, and i18n error mapping.

However, `ai.actions.ts` contains a `persistItinerary` and `persistChecklist` helper that performs multi-step, stateful Prisma writes directly inside the action file rather than delegating to a service. This is a layer boundary violation: persistence logic belongs in a service (e.g., `ItineraryService` or `AiService`), not in an action. The action layer should only orchestrate calls; it should not contain domain logic or raw `db.*` calls.

Additionally, `ai.actions.ts` imports `db` directly from `@/server/db` — creating a second path to the database that bypasses the service layer entirely for the persist step. This makes the persist logic untestable in isolation and invisible to any future service-level middleware.

---

### 2. Authorization Model (BOLA)

**Rating: PASS**

Every service method correctly enforces ownership before data access:

- `TripService.getTripById`: fetches without `userId` filter, then compares `trip.userId !== userId` — correctly separates not-found (404) from forbidden (403).
- `TripService.updateTrip`: fetches minimal `{ id, userId }` first, checks ownership, then updates. No blind update by ID.
- `TripService.deleteTrip`: same pattern as update.
- `TripService.reorderActivities`: verifies trip ownership before any activity mutation. Critically, it does not verify that each `activity.id` actually belongs to the verified trip — see Issue 5.
- `ai.actions.ts`: performs a direct BOLA check via `db.trip.findFirst({ where: { id: tripId, userId: session.user.id } })` before calling `AiService`. This is correct.
- `AuthService`: registration and password-reset flows are user-enumeration safe (requestPasswordReset returns void regardless of email existence).
- Middleware correctly protects `/trips`, `/onboarding`, and `/account` path segments.

One nuance: `getTripById` fetches first without `userId` in the `where` clause, then does an in-memory ownership check. This is functionally correct (it correctly distinguishes 404 from 403) but marginally less efficient than a combined query. It is not a security defect.

---

### 3. Error Model

**Rating: WARNING**

The error class hierarchy in `src/lib/errors.ts` matches the spec exactly: `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError`. This is clean.

The warning is in `ai.service.ts`, where all three AI failure modes (`AI_TIMEOUT`, `AI_PARSE_ERROR`, `AI_SCHEMA_ERROR`) use the same human-readable message: `"errors.timeout"`. This means a schema validation failure and a parse error are indistinguishable to the consumer — they will both display a timeout message. The `message` field on `AppError` is documented as an i18n key in this codebase, so distinct keys are essential for user-facing clarity. This should be `"errors.aiParseError"` and `"errors.aiSchemaError"` respectively for the non-timeout cases.

A secondary concern: `trip.actions.ts` has a `mapErrorToKey` function that checks `instanceof AppError` and returns `error.message` directly as the i18n key. `ai.actions.ts` has a different `mapErrorToKey` that checks `instanceof Error` (the broader base class) and also returns `error.message`. The `AppError` check in `ai.actions.ts` would be swallowed into the `Error` branch, which is correct coincidentally but the intent differs between the two files — they should share a single implementation. This is a maintainability risk.

---

### 4. Caching Strategy

**Rating: FAIL**

**Critical Issue: Cache key collision between `generateTravelPlan` and `generateChecklist`.**

Both methods in `ai.service.ts` use the prefix `cache:ai-plan:` followed by an MD5 hash. The hash inputs are structurally different (`destination:travelStyle:budgetRange:days:language` vs `destination:month:travelers:language`), so collisions are unlikely in practice — but the cache namespace is shared. If a checklist is cached under a key that is later requested as a plan (or vice versa), the `JSON.parse` will succeed but Zod validation on the caller side will fail silently (in the action, not the service). This is a latent bug.

The correct fix is to use distinct prefixes: `cache:ai-plan:` for itinerary plans and `cache:ai-checklist:` for checklists. This also violates the `CacheKeys` namespacing convention documented in `docs/architecture.md` (section: Naming Conventions) — keys should use a `CacheKeys.*` function, not inline string concatenation.

**Secondary issue:** The `USER_TRIPS` TTL (60 seconds, defined in `constants.ts`) is never used. `TripService` does not implement Redis caching for the trip list despite SPEC-001 specifying it. This means every list render hits PostgreSQL. This is not a correctness defect but is a deviation from the spec's caching requirement and will become a performance problem under load.

**Tertiary issue:** The Redis client in `src/server/cache/redis.ts` uses `process.env.REDIS_URL` directly instead of the validated `env` module (`@t3-oss/env-nextjs`). This bypasses startup validation — a missing `REDIS_URL` will silently fall back to `redis://localhost:6379` in production, which is a misconfiguration risk.

---

### 5. AI Integration

**Rating: PASS with reservations**

The overall resilience model for `AiService` is sound: a 55-second `AbortSignal.timeout` is passed to the SDK call, Zod validates the response shape before it is used, and a fallback MD5-keyed cache prevents duplicate API calls for identical parameters.

Positive observations:
- The `extractJsonFromResponse` utility handles markdown-fenced responses from the model, which is a realistic defensive measure.
- Budget bucketing to the nearest 500 units significantly improves cache hit rates for the plan generator.
- Month-level granularity for checklist cache keys is an appropriate trade-off between freshness and reuse.
- PII discipline is consistent: only `userId` is logged, never the destination or budget inputs.
- Model selection is sensible: `claude-sonnet-4-6` for the richer plan, `claude-haiku-4-5-20251001` for the simpler checklist.

Reservations:
- There is no per-user rate limiting on AI action calls. A single user could hammer `generateTravelPlanAction` in rapid succession, each call spending up to 55 seconds of compute and potentially triggering API costs. The `RATE_LIMIT` constants exist in `constants.ts` but are not applied to AI actions.
- The Anthropic client is instantiated fresh on every call (`AiService.getClient()`). The `@anthropic-ai/sdk` client is designed to be reused; instantiating per-call is wasteful but not incorrect. A module-level singleton would be preferable.
- `process.env.ANTHROPIC_API_KEY` is accessed directly instead of via the validated `env` module — same issue as Redis.

---

### 6. Schema Design

**Rating: WARNING**

The Prisma schema is well-structured and aligns with SPEC-001 in all core fields. Soft deletes, CUID-based IDs (via `@default(cuid())`), cascade deletes, and composite indexes are all present.

Issues found:

**CUID vs CUID2:** ADR-001 and SPEC-001 explicitly specify CUID2 (`@paralleldrive/cuid2`) for all primary keys. The schema uses Prisma's built-in `@default(cuid())`, which generates CUID **v1**, not CUID2. Auth.js adapter models (`Account`, `Session`, `VerificationToken`) also use `@default(cuid())`. This is an inconsistency with the stated architectural decision. CUID2 requires a custom `default` in the schema using `dbgenerated` or a Prisma `$extends` hook at creation time. The impact is low for MVP correctness but is a documented ADR violation.

**`Activity` model missing Trip-level ownership path:** `Activity` rows belong to `ItineraryDay` which belongs to `Trip`. There is no direct `tripId` foreign key on `Activity`. This means that authorizing an activity mutation requires a two-hop join (Activity → ItineraryDay → Trip). When `reorderActivities` updates activities by `id` directly without verifying they belong to the verified trip (only the trip's ownership is checked, not each activity's `dayId → tripId` chain), an attacker who knows activity IDs from another trip could reorder them. See Issue 5.

**`ChecklistItem` missing a Trip ownership relation:** `ChecklistItem` has a `tripId` field but no Prisma `@relation` declaration to `Trip`. This means Prisma does not enforce the foreign key at the ORM layer (though the database may enforce it via a raw FK). It also means cascade deletes on `Trip` will not automatically remove `ChecklistItem` rows via Prisma. This appears to be a schema omission.

**Auth.js models use `@default(cuid())` not CUID2:** This is expected since PrismaAdapter controls these models, but it should be documented as a known divergence from ADR-001 since these IDs flow into the `Session` and `Account` tables.

---

### 7. Type Safety

**Rating: PASS with reservations**

TypeScript types are consistently shared across layers. `TripCreateInput` and `TripUpdateInput` are derived from Zod schemas (`z.infer<typeof TripCreateSchema>`), ensuring the validation schema and the TypeScript type cannot drift. `ActionResult<T>` is a clean discriminated union. `PaginatedResult<T>` is generic and reusable.

Reservations:
- `trip.service.ts` uses `as Trip[]` and `as Trip` casts when returning Prisma results. Because `TRIP_SELECT` is a `const` object and Prisma's `select` should infer the return type precisely, these casts could mask a future field mismatch between the select projection and the `Trip` interface. The safer pattern is to derive `Trip` from `Prisma.TripGetPayload<{ select: typeof TRIP_SELECT }>`. This is a minor technical debt item.
- `ai.service.ts` line 219: `parsed.data as ItineraryPlan` is redundant — `parsed.data` is already typed as the inferred Zod type, which should be compatible. Same at line 305. These casts are harmless but indicate the developer may not have been aware that `z.infer<>` and the manual interface can be unified.
- `TripStatus` and `TripVisibility` are defined as manual string union types in `src/types/trip.types.ts`. These duplicate the Prisma-generated enum types. If a new enum value is added to the schema, both locations must be updated manually. The safer approach is to import `TripStatus` and `TripVisibility` directly from `@prisma/client`.

---

### 8. ADR Adherence

**Rating: WARNING**

| ADR Decision | Status | Notes |
|---|---|---|
| Next.js 15 App Router | PASS | Used correctly throughout |
| TypeScript strict, no `any` | PASS | No `any` found in reviewed files |
| Prisma 7 singleton via `src/server/db/client.ts` | PASS | Singleton pattern correct; `db.$extends` not yet needed |
| CUID2 for all primary keys | FAIL | Schema uses `@default(cuid())` (CUID v1), not CUID2 |
| Soft deletes on user-owned entities | PASS | `deletedAt` present on `User` and `Trip`; `Activity` and `ItineraryDay` cascade-deleted via relation |
| `server-only` on all server modules | PASS | All `src/server/**` files import `"server-only"` |
| Env vars via `@t3-oss/env-nextjs` | FAIL | `redis.ts` and `ai.service.ts` use `process.env` directly |
| Error classes: AppError hierarchy | PASS | Matches spec exactly; `ConflictError` added (appropriate extension) |
| Authorization before data access | PASS | Consistent across all service methods |
| Pagination on all list endpoints | PASS | `getUserTrips` paginated; `DEFAULT_PAGE_SIZE` = 20 |
| API error shape `{ error: { code, message, status, timestamp, requestId } }` | NOT EVALUATED | No API Route handlers reviewed (outside Sprint 1 scope) |
| `MAX_ACTIVE_TRIPS` = 20 | FAIL | Implemented as `MAX_TRIPS_PER_USER = 50` in `constants.ts` |
| Mass assignment prevention | FAIL | `createTrip` spreads `data` directly into `db.trip.create` |
| BOLA mitigation: userId in every where clause | PASS | Enforced in all service methods |

---

### 9. Scalability Concerns

**Rating: WARNING**

**`reorderActivities` uses an unbounded `db.$transaction` array.** If a trip has 100+ activities, this sends 100+ individual UPDATE statements in a single transaction. PostgreSQL handles this, but it is inefficient at scale. The architecturally preferred solution for bulk reorder is a single `UPDATE activities SET order_index = CASE id WHEN ... END WHERE id IN (...)` or use of a positional integer array. This is low priority for MVP but should be documented as technical debt.

**N+1 in `persistItinerary`:** The function in `ai.actions.ts` loops over `plan.days` and issues one `db.itineraryDay.create` per day sequentially (not in parallel, not via `createMany`). For a 14-day itinerary, this is 14 sequential round-trips before any activity inserts. It then does one `db.activity.createMany` per day. A `createMany` on all days at once (with a subsequent `createMany` on all activities, using the returned IDs) would be significantly faster, but requires a schema that allows activities to reference days by a stable deterministic key. This is an architectural limitation of the current schema (no `dayNumber` unique index scoped to trip for activity insertion). This should be addressed in the Itinerary Builder spec (SPEC-002).

**No Redis caching for `getUserTrips`:** As noted in dimension 4, the `USER_TRIPS` TTL constant is defined but unused. The spec required caching here. Under repeated page refreshes by the same user, every render hits the database.

---

### 10. Technical Debt

**Rating: WARNING**

Items that were identified as shortcuts or deferred work that must be tracked:

1. **Email delivery is a no-op.** `AuthService.sendVerificationEmail` stores a token in Redis but never actually sends an email. `requestPasswordReset` does the same. This is documented with `TODO (T-003)` comments, which is acceptable for Sprint 1, but a user who registers cannot verify their email — meaning credential login will permanently fail for new users until T-003 is implemented. The `Credentials` provider in `lib/auth.ts` correctly gates on `emailVerified`, which means registration is currently broken end-to-end for credentials users. This must be treated as a Sprint 2 blocker.

2. **`CHECKLIST_MODEL` constant references `claude-haiku-4-5-20251001`.** Model version strings should be externalized to the env-validated config or a constants file reviewed by the team, not hardcoded in the service. Model deprecation will require a code change rather than a config change.

3. **`listUserTripsAction` uses `pageSize = 10` as default** while `TripService.getUserTrips` uses `DEFAULT_PAGE_SIZE = 20`. These defaults are inconsistent — a caller using the action default gets half the records per page compared to a direct service call. The action should not define its own default; it should pass `DEFAULT_PAGE_SIZE` through.

4. **The `User` model has both `avatarUrl` and `image` fields.** This appears to be a merge artifact between the custom user schema and the Auth.js adapter requirement (`image` is the field name expected by the PrismaAdapter for OAuth profile pictures). Having two fields for the same concept is a data model inconsistency that should be resolved — either map `image` to `avatarUrl` via the Auth.js `profile` callback, or remove the custom `avatarUrl` field.

---

## Issues Found

| # | Severity | Description | File | Line | Recommended Fix |
|---|---|---|---|---|---|
| 1 | HIGH | Cache key namespace collision: both `generateTravelPlan` and `generateChecklist` use the prefix `cache:ai-plan:`, meaning a collision in hash inputs would cause one function to deserialize the other's cached data silently | `src/server/services/ai.service.ts` | 135, 241 | Change checklist cache key prefix to `cache:ai-checklist:`. Introduce `CacheKeys.aiPlan(hash)` and `CacheKeys.aiChecklist(hash)` helpers in `src/server/cache/keys.ts` |
| 2 | HIGH | Mass assignment in `createTrip`: `db.trip.create({ data: { ...data, userId } })` spreads the entire validated input object. If the Zod schema is ever extended with a field that maps to a privileged column (e.g., `status`, `visibility`, `deletedAt`), an attacker could set those fields via the action input. SPEC-001 and architecture.md both explicitly prohibit this pattern | `src/server/services/trip.service.ts` | 106–108 | Map fields explicitly: `data: { title: data.title, destination: data.destination, description: data.description, startDate: data.startDate, endDate: data.endDate, coverGradient: data.coverGradient, coverEmoji: data.coverEmoji, userId }` |
| 3 | HIGH | `MAX_TRIPS_PER_USER` is 50 in `constants.ts` but the spec (SPEC-001 §3, AC-007, architecture memory) defines it as 20. This is a business rule violation that will allow users to create 2.5x more trips than designed | `src/lib/constants.ts` | 1 | Change to `export const MAX_TRIPS_PER_USER = 20;` |
| 4 | MEDIUM | `redis.ts` reads `process.env.REDIS_URL` directly, bypassing the `@t3-oss/env-nextjs` validated config. A missing env var silently falls back to localhost. Same pattern in `ai.service.ts` for `ANTHROPIC_API_KEY` | `src/server/cache/redis.ts:8`, `src/server/services/ai.service.ts:117` | Both files | Import `env` from `@/lib/env` and use `env.REDIS_URL` and `env.ANTHROPIC_API_KEY` |
| 5 | MEDIUM | `reorderActivities` verifies trip ownership but does not verify that the submitted `activity.id` values belong to days within that trip. An authenticated user who knows another user's activity IDs could reorder them by passing a valid `tripId` they own alongside foreign activity IDs | `src/server/services/trip.service.ts` | 194–201 | Before the `$transaction`, query `db.activity.findMany({ where: { id: { in: activityIds }, day: { tripId } } })` and assert the count matches the input length |
| 6 | MEDIUM | `persistItinerary` performs N sequential `db.itineraryDay.create` calls (one per day) instead of a bulk operation. For a 14-day plan this is 14 round-trips plus 14 `createMany` calls = 28 database round-trips minimum | `src/server/actions/ai.actions.ts` | 35–58 | Move this logic to a dedicated `ItineraryService.replaceItinerary` method and use `createMany` for days where Prisma's return values allow (or wrap in a transaction with explicit ID pre-generation) |
| 7 | MEDIUM | `persistItinerary` and `persistChecklist` use `deleteMany` followed by inserts with no wrapping transaction. A failed insert after a successful `deleteMany` leaves the trip with no itinerary/checklist — a destructive data loss scenario | `src/server/actions/ai.actions.ts` | 33–58, 68–84 | Wrap the entire delete + insert sequence in `db.$transaction(async (tx) => { ... })` |
| 8 | MEDIUM | Error message `"errors.timeout"` is reused for `AI_PARSE_ERROR` and `AI_SCHEMA_ERROR` — these are structurally different failures that will display an incorrect timeout message to the user | `src/server/services/ai.service.ts` | 212, 217 | Use `"errors.aiParseError"` and `"errors.aiSchemaError"` as the i18n message keys for those error codes |
| 9 | MEDIUM | `ChecklistItem` model has a `tripId` field but no `@relation` directive to `Trip`. Prisma will not enforce referential integrity at the ORM level and cascade delete from `Trip` will not remove `ChecklistItem` rows | `prisma/schema.prisma` | 174–187 | Add `trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)` and add `checklist ChecklistItem[]` to the `Trip` model |
| 10 | MEDIUM | Schema uses `@default(cuid())` (CUID v1) on all models, diverging from the ADR-001 decision to use CUID2. This affects collision resistance and sortability guarantees stated in the ADR | `prisma/schema.prisma` | 33, 51, 63, 72, 95, 133, 153, 174 | Implement CUID2 generation via a Prisma `$extends` hook on `beforeCreate` or use a custom default string. Document this as ADR-003 if CUID v1 is intentionally accepted for Auth.js adapter compatibility |
| 11 | LOW | `listUserTripsAction` default `pageSize` is 10, but `TripService.getUserTrips` default `pageSize` is `DEFAULT_PAGE_SIZE` (20). Inconsistent defaults between the action and service layer | `src/server/actions/trip.actions.ts` | 124 | Remove the `pageSize = 10` default from the action signature. Import and use `DEFAULT_PAGE_SIZE` from `@/lib/constants` |
| 12 | LOW | `TripStatus` and `TripVisibility` are manually redefined as string union types in `src/types/trip.types.ts` instead of being imported from `@prisma/client`. If the schema enums change, two files must be updated | `src/types/trip.types.ts` | 1–2 | `import type { TripStatus, TripVisibility } from "@prisma/client";` and remove the manual definitions |
| 13 | LOW | `User` model has both `avatarUrl` (custom field) and `image` (Auth.js adapter field), creating two columns for the same semantic concept | `prisma/schema.prisma` | 78–79 | Remove `avatarUrl` and map Auth.js `image` field via the `profile` callback in `lib/auth.ts`, or document which field is canonical |
| 14 | LOW | `mapErrorToKey` is duplicated between `trip.actions.ts` and `ai.actions.ts` with slightly different type guards (`instanceof AppError` vs `instanceof Error`). The `ai.actions.ts` version is more permissive and will return raw error messages for non-AppError exceptions | `src/server/actions/trip.actions.ts:17–21`, `src/server/actions/ai.actions.ts:19–24` | Extract to `src/lib/action-utils.ts` with the correct `instanceof AppError` guard and export for reuse |
| 15 | LOW | `AiService.getClient()` instantiates a new `Anthropic` client on every call. The SDK client is designed to be reused and holds connection pools internally | `src/server/services/ai.service.ts` | 114–118 | Promote to a module-level singleton using the same `globalForX` pattern as Prisma and Redis |

---

## ADR Updates Required

The following new architectural decisions were made implicitly during Sprint 1 implementation and should be formally recorded:

### ADR-003: AI Feature Integration — Claude API via Anthropic SDK

**Context:** Sprint 1 introduced an `AiService` using the `@anthropic-ai/sdk` to generate itinerary plans and pre-trip checklists. No ADR existed for this.

**Decisions made in implementation:**
- Model selection: `claude-sonnet-4-6` for plans, `claude-haiku-4-5-20251001` for checklists (cost vs quality trade-off)
- Timeout: 55 seconds via `AbortSignal.timeout`
- Cache: MD5-keyed Redis with 24h TTL, with budget bucketing and month-level date granularity for better hit rates
- Response format: JSON-only prompt with Zod schema validation of output
- Error codes: `AI_TIMEOUT` (504), `AI_PARSE_ERROR` (502), `AI_SCHEMA_ERROR` (502)

**Should be documented in `docs/architecture.md` as ADR-003.**

---

### ADR-004: next-intl for Internationalization

**Context:** `middleware.ts` integrates `next-intl` with the Auth.js middleware wrapper, and `next.config.ts` uses `createNextIntlPlugin`. This is an undocumented stack addition not in ADR-001.

**Decisions made in implementation:**
- i18n handled by `next-intl` wrapping the Auth.js middleware
- Locale routing inferred from `src/i18n/routing.ts`
- Folder structure uses `[locale]` dynamic segment (confirmed by the working directory context)

**Should be documented in `docs/architecture.md` as ADR-004.**

---

### ADR-005: Auth.js Database Session Strategy (not JWT)

**Context:** `lib/auth.ts` uses `session: { strategy: "database" }` with `PrismaAdapter`. This means sessions are stored in PostgreSQL (the `Session` table), not as JWTs. This has implications for horizontal scaling (all nodes share the same session store), performance (every request involving `auth()` hits the DB to validate the session), and the future Redis session store plan from ADR-001.

**ADR-001 originally stated Redis for sessions**; the implementation uses the PostgreSQL-backed PrismaAdapter database strategy instead. This is a meaningful divergence that must be documented.

**Should be documented in `docs/architecture.md` as ADR-005 and should note the trade-off: PrismaAdapter database sessions are simpler to implement with Auth.js but add a DB read per authenticated request.**

---

## Sign-off

- [ ] APPROVED — ready to merge
- [x] APPROVED WITH CONDITIONS — fix listed issues before merge
- [ ] BLOCKED — critical issues must be resolved

**Conditions for merge (must-fix before production):**

1. **Issue 1 (HIGH):** Fix cache key namespace collision in `ai.service.ts` — `cache:ai-plan:` prefix used for both plans and checklists.
2. **Issue 2 (HIGH):** Fix mass assignment in `TripService.createTrip` — map fields explicitly, do not spread `data`.
3. **Issue 3 (HIGH):** Correct `MAX_TRIPS_PER_USER` from 50 to 20 to match the spec and business rule.
4. **Issue 7 (MEDIUM):** Wrap `persistItinerary` and `persistChecklist` in a `db.$transaction` to prevent data loss on partial failure.
5. **Issue 9 (MEDIUM):** Add missing `@relation` to `ChecklistItem` model and run a migration.

**Conditions for merge (should-fix, may be tracked as follow-up tickets):**

Issues 4, 5, 6, 8, 10, 11, 12, 13, 14, 15 — none are showstoppers individually, but Issues 4 and 5 should be resolved within the next sprint cycle.

**ADRs 003, 004, and 005 must be written and merged into `docs/architecture.md` in parallel with this branch**, since they document decisions already made in code.

---

*Review conducted by: Architect Agent | 2026-02-26*
*Next review required: after conditions above are addressed — re-review dimensions 4, 6, and 8 only.*
