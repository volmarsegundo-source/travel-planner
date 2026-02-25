# Sprint 2 Review — Travel Planner

## Tech Lead Review

**Reviewer**: tech-lead
**Date**: 2026-02-25
**Branch**: feat/sprint-2
**Head commit**: 58665ed — feat(sprint-2): rate limiting, persistence, security headers, ADRs
**Scope**: Rate limiting, itinerary/checklist persistence, security headers, ADR-003/004/005

---

### CRITICAL (blocks next sprint)

- **`src/server/services/itinerary.service.ts:87`** — `getItineraryPlan` uses `include` instead of an explicit `select` on `ItineraryDay`. This violates the SR-005 rule (every Prisma query must have an explicit `select` to prevent unintended column exposure). The `include` pulls all scalar columns from `ItineraryDay` — including any future columns added to the schema — without team awareness. Per architecture.md conventions and our Sprint 1 security findings, all Prisma queries in service files must use an explicit `select`. Required fix: replace `include: { activities: { ... } }` with a fully-enumerated `select` block on both `ItineraryDay` and `Activity`.

- **`src/server/services/itinerary.service.ts:231-244`** — `reorderActivities` silently ignores the `dayNumber` field in the `updates` array when a cross-day move is requested. The comment reads "For simplicity we update orderIndex only; dayId updates require day lookup." This means cross-day drag-and-drop (AC-002 of US-007) is committed to DB with a broken `orderIndex` referencing the wrong day — the activity stays on its original day regardless of what the user dragged. This is a data integrity bug and a User Story acceptance criterion miss. Either the function must resolve `dayNumber` to `dayId` and update both fields in the transaction, or the `dayNumber` field must be removed from the interface contract and AC-002 marked incomplete. Shipping a silent data corruption path is not acceptable.

- **`src/components/features/trips/PlanGeneratorWizard.tsx:49-54`** — The `LOADING_MESSAGES` array contains four hardcoded Portuguese strings ("Analisando o destino...", "Montando o itinerário...", etc.) outside the i18n system. This violates the Sprint 1 DoD requirement ("Todos os textos traduzidos em PT-BR e EN") and the team convention that all user-visible strings must go through `next-intl`. English users will see Portuguese loading messages. The same issue appears at lines 122-123 ("Gerando seu plano...") and throughout the "confirm" step (lines 139-145, 157-158, 163, 167-173, 185-188) where all labels ("Confirmar viagem", "Destino", "Período", "Viajantes", "Orçamento", "Continuar", "Qual é o seu estilo de viagem?", "Gerar plano com IA") are hardcoded in Portuguese. AC-001 of US-015 is not satisfied by this component.

---

### WARNING (must be fixed within 2 sprints)

- **`src/server/actions/itinerary.actions.ts` and `src/server/actions/checklist.actions.ts` — all mutation endpoints** — None of the new Server Actions validate or sanitize the `data` argument passed from the client. `addActivity` accepts `{ title: string; description?: string; startTime?: string; category?: string }` with no length limits, no allowlist on `category`, and no XSS sanitization on `title` or `description`. `addChecklistItem` accepts `text: string` with no max length. A Zod schema guard at the action boundary (before the service call) is required per architecture conventions. Without it, arbitrarily long strings can be written to PostgreSQL, and the `category` field is cast directly to `ActivityType` without enum validation at line 166 — an invalid category string will cause a Prisma runtime error that surfaces as an opaque 500 rather than a user-friendly validation error.

- **`src/server/lib/rate-limit.ts:27-32`** — The implementation has a race condition between `INCR` and `EXPIRE` under concurrent load. If two requests arrive simultaneously and both receive `count === 1` from `INCR`, both will call `EXPIRE`, which is benign (idempotent). However, if the Redis instance is pipelined or the `INCR` and `EXPIRE` are not atomic, a request could increment past the limit before the TTL is set, creating a permanently-live key with no expiry (Redis returns `-1` for TTL). The correct implementation uses a Lua script or `SET key 0 EX windowSeconds NX` + `INCR` in a pipeline to guarantee atomicity. This is a low-probability race for MVP traffic but must be addressed before production at any meaningful scale.

- **`src/server/actions/auth.actions.ts:30`** — The IP address for rate limiting is read from `x-forwarded-for` without taking only the first value: `(await headers()).get("x-forwarded-for") ?? "unknown"`. On a multi-hop proxy, this header contains a comma-separated list (`"client-ip, proxy1-ip, proxy2-ip"`). Using the raw string as a Redis key means the rate limit is per-unique-proxy-chain, not per-client. The correct fix is `.split(",")[0]?.trim() ?? "unknown"`. This appears in both `registerUser` (line 30) and `requestPasswordReset` (line 94).

- **`next.config.ts:21`** — The Content-Security-Policy includes `'unsafe-eval'` for `script-src` with the comment "required by Next.js dev + turbopack". This directive must be removed from the production CSP. In development it is acceptable, but the current implementation applies the same headers unconditionally to all environments via `headers()`. The fix is to conditionally include `'unsafe-eval'` only when `process.env.NODE_ENV !== "production"`. Shipping `'unsafe-eval'` to production violates OWASP A05:2021 and significantly weakens XSS mitigations.

- **`src/server/services/checklist.service.ts:49`** — The `category` field received from the AI output is cast directly with `cat.id as DbChecklistCategory` without validation against the actual enum values. If the AI returns an unexpected category string (e.g. `"SAFETY"` instead of `"HEALTH"`), the Prisma `createMany` call will throw a runtime error. The cast should be guarded by an explicit membership check against the `DbChecklistCategory` enum before insertion, with a fallback to `"OTHER"`. The same pattern appears in `addChecklistItem` at line 140 (`category as DbChecklistCategory`).

- **`src/server/services/itinerary.service.ts:202-205`** — `deleteActivity` calls `db.activity.update` without an explicit `select` clause. Per SR-005 and ADR-005, all non-auth queries must include an explicit `select` to prevent accidental exposure of new fields. The same issue is present in `toggleChecklistItem` at `src/server/services/checklist.service.ts:122-125` and `deleteChecklistItem` at line 176-179. Mutation queries that do not need the return value should use `select: { id: true }` to minimize data transfer.

- **`src/components/features/itinerary/ItineraryView.tsx:39`** and **`src/components/features/trips/PlanGeneratorWizard.tsx:100`** — Both components call Server Actions (`saveChecklist` / `saveItineraryPlan`) as fire-and-forget with `.catch()`. This means a DB persistence failure is silently swallowed after the user is already navigated away. There is no retry mechanism, no user notification, and no telemetry event. While the sessionStorage fallback prevents data loss in the current tab, the user's data will not persist across devices or sessions. The `console.error` call helps in development, but production needs a structured error event (e.g. Sentry capture or a toast notification visible before navigation). This is acceptable as a temporary pattern per ADR-003 but must be resolved before Sprint 2B when the sessionStorage fallback is removed.

- **`docs/tasks.md` — Sprint 2 tasks not defined** — The tasks file has no Sprint 2 task breakdown (T-015 to T-021). The committed code in this sprint corresponds to work that was not formally planned in `docs/tasks.md`. Rate limiting, persistence services, security headers, and ADRs are significant deliverables that should appear as explicit tasks with spec references, acceptance criteria, and assignments. For Sprint 3, all tasks must be planned in the standard format before the first commit.

---

### INFO (nice to have)

- **`src/server/lib/rate-limit.ts`** — The function performs three sequential Redis round-trips: `INCR`, then conditionally `EXPIRE`, then `TTL`. On Upstash (HTTP-based Redis), each round-trip adds latency. This could be collapsed to two calls using a Lua script (INCR + conditional EXPIRE in one command), then one TTL call, or eliminated entirely by computing `resetInSeconds` from `windowSeconds - (Date.now()/1000 % windowSeconds)` for fixed windows. Low priority for MVP traffic.

- **`src/server/services/itinerary.service.ts:123-129`** — `getItineraryPlan` returns an `ItineraryPlan` with empty `destination: ""`, `travelStyle: ""`, and `highlights: []`. The itinerary page (`src/app/(auth)/trips/[id]/itinerary/page.tsx:36-43`) merges these with sessionStorage metadata when available, but the comment at line 121 ("Callers should merge with session data if needed") is informal. A more robust approach would store `destinationName` on the `Trip` model (which already exists) and join it in `getItineraryPlan`, avoiding the partial-data problem entirely. Consider for Sprint 3.

- **`src/server/services/itinerary.service.ts:59`** — `tx.activity.createMany` does not return created IDs (Prisma `createMany` does not support `returning` on PostgreSQL without raw SQL). This is acceptable for now but worth documenting as a known limitation if callers ever need the created activity IDs.

- **`src/server/services/checklist.service.ts:94`** — The non-null assertion `categoryMap.get(catId)!.items.push(...)` is safe given the `has()` check on the previous line, but a null-safe alternative (`categoryMap.get(catId)?.items.push(...)`) would be more idiomatic and consistent with the team's TypeScript strict mode stance.

- **`src/app/(auth)/trips/[id]/itinerary/page.tsx`** — The page is a `"use client"` component that calls a Server Action directly. This is correct and intentional (DB-first load with sessionStorage fallback per ADR-003). However, the `loading` state is never set back to `true` when `tripId` changes (the `useEffect` dependency includes `tripId` and `router` but does not reset `loading` before the async call). If navigation between trips occurs without a full page reload, the stale plan would momentarily render before the new one loads.

- **`next.config.ts`** — The `X-XSS-Protection: 1; mode=block` header is deprecated in modern browsers (Chrome 78+) and considered legacy. It can be safely removed without security regression since CSP provides a stronger mitigation. Removing it reduces header payload and avoids confusion in security audits.

- **`src/server/services/ai.service.ts:160`** — `JSON.parse(cached) as ItineraryPlan` and `JSON.parse(cached) as ChecklistCategory[]` (lines 160, 204) trust the cached value without runtime validation. A corrupt or stale Redis value could cause a runtime crash downstream. Wrapping the cache-hit parse in a try/catch that falls through to the API call would make the cache resilient to schema changes between deployments.

---

### Tasks verified complete

The following Sprint 2 deliverables are implemented and evidenced by code:

- Rate limiting infrastructure (`checkRateLimit`, Redis INCR+EXPIRE, `RateLimit` constants) — `src/server/lib/rate-limit.ts`
- Rate limiting on `ai.actions.ts` (`generateTripPlan`, `generateTripChecklist`) — keyed by `userId`
- Rate limiting on `auth.actions.ts` (`registerUser`, `requestPasswordReset`) — keyed by IP
- Input length cap on `places.actions.ts` (100 char max)
- `itinerary.service.ts` with full CRUD: `saveItineraryPlan`, `getItineraryPlan`, `addActivity`, `deleteActivity`, `reorderActivities` — all BOLA-safe via `assertOwnership`
- `checklist.service.ts` with full CRUD: `saveChecklist`, `getChecklist`, `toggleChecklistItem`, `addChecklistItem`, `deleteChecklistItem` — all BOLA-safe
- Server Actions for itinerary and checklist: auth guard on every action, `handleError` pattern consistent
- `itinerary.actions.ts` and `checklist.actions.ts`: `auth()` called at the top of every exported function
- DB-first load with sessionStorage fallback on itinerary page (ADR-003 migration)
- `saveItineraryPlan` called from `PlanGeneratorWizard` after generation
- `saveChecklist` called from `ItineraryView` after checklist generation
- Security headers in `next.config.ts`: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP
- ADR-003 (sessionStorage handoff), ADR-004 (model selection), ADR-005 (password in User model) documented in `docs/architecture.md`
- Unit tests for `rate-limit.ts` (9 cases), `itinerary.service.ts` (17 cases), `checklist.service.ts` (18 cases), `ai.actions.ts` (7 cases)
- `env.ANTHROPIC_API_KEY` used in `ai.service.ts` (no hardcoded key — FIND-M-001 fix confirmed)
- `redirect()` placement in `auth.actions.ts` is OUTSIDE try/catch on all three redirect flows (FIND-M-001 pattern correct)

### Tasks NOT complete or missing evidence

- **AC-002 of US-007** (drag-and-drop between days) — `reorderActivities` does not update `dayId` when `dayNumber` is provided. The cross-day move is silently broken at the DB layer (CRITICAL issue above).
- **AC-001 of US-015** (100% interface translated) — `PlanGeneratorWizard.tsx` contains at least 12 hardcoded Portuguese strings outside the i18n system (CRITICAL issue above).
- **No Sprint 2 task plan in `docs/tasks.md`** — The rate limiting and persistence work was shipped without corresponding task entries (T-015 to T-021 remain in backlog, unassigned to this sprint's deliverables).
- **No E2E tests for Sprint 2 scenarios** — The DoD requires E2E passing for happy path + edge cases. No Playwright specs were added for rate limiting, persistence, or the DB-first load path.
- **No unit tests for `itinerary.actions.ts` and `checklist.actions.ts`** — The action layer tests exist only for `ai.actions.ts`. Auth guards, error handling, and the `ActionResult` discriminated union for the new action files are not independently tested.

---

### Security Checklist

- [x] No hardcoded credentials, tokens, or API keys — `env.ANTHROPIC_API_KEY` used correctly
- [x] `redirect()` outside try/catch in all Server Actions — pattern correct in `auth.actions.ts`
- [x] BOLA guards present: `assertOwnership` called before every write in both new services
- [x] `auth()` called at the top of every new Server Action
- [x] No PII logged in new code — error logs use `err.message` only, no email/userId values
- [x] Soft delete pattern consistent — `deletedAt: null` filter present in read queries
- [ ] Input validation missing on `addActivity` and `addChecklistItem` — no Zod schema at action boundary (WARNING above)
- [ ] `category` field not validated against enum before DB insert — runtime crash vector (WARNING above)
- [ ] `x-forwarded-for` IP not split on comma — rate limit bypass possible (WARNING above)
- [ ] `'unsafe-eval'` in CSP not gated to non-production environments (WARNING above)
- [ ] `getItineraryPlan` uses `include` instead of explicit `select` (CRITICAL above)
- [ ] Cross-day reorder silently drops `dayId` update — data integrity bug (CRITICAL above)

---

### Verdict: BLOCK

Two CRITICAL issues must be resolved before Sprint 3 can begin:

1. `getItineraryPlan` must use an explicit `select` clause (SR-005 compliance).
2. `reorderActivities` must either implement the cross-day `dayId` update or the feature must be explicitly descoped and AC-002 of US-007 marked as not done.
3. Hardcoded Portuguese strings in `PlanGeneratorWizard` must be moved to the i18n system before any further UI work proceeds (AC-001 of US-015 is a Sprint 1 DoD requirement carried forward).

Four WARNING items (CSP `unsafe-eval` in production, IP header parsing, missing input validation, unvalidated category enum casts) must be tracked as Sprint 3 items with owners assigned before the BLOCK is lifted.

> BLOCK on: (1) `reorderActivities` cross-day data integrity bug, (2) `getItineraryPlan` missing explicit select, (3) hardcoded i18n strings in PlanGeneratorWizard. Resolve all three and re-request tech-lead review.

---

## Architect Review

**Reviewer**: architect (performed by Claude Sonnet 4.6 — Opus rate-limited)
**Date**: 2026-02-25
**Branch**: feat/sprint-2
**Scope**: Layer integrity, ADR compliance, scalability, missing migrations

---

### CRITICAL

- **`src/server/services/itinerary.service.ts:87`** — `getItineraryPlan` uses `include` instead of explicit `select` on both `ItineraryDay` and `Activity`. ADR-001 and `docs/security.md` (SR-005) mandate explicit `select` in all Prisma service queries to prevent silent field exposure. The `include` pulls all scalar columns from both models, including any future-added columns (travel notes, passport references, pricing data) without team review. Required fix: replace `include: { activities: { ... } }` with a fully-enumerated `select` block on both models. (Duplicates Tech Lead CRITICAL-1 — listed here because it is also an ADR-001 architectural violation.)

- **`src/server/services/itinerary.service.ts:42-44` and `src/server/services/checklist.service.ts:33`** — Both `saveItineraryPlan` and `saveChecklist` issue hard-delete `deleteMany` calls inside their transactions (not soft-deletes). ADR-001 and `docs/security.md` §"Data Protection" rule 7 require soft-delete (`deletedAt`) for all user-owned data — `ItineraryDay`, `Activity`, and `ChecklistItem` are user-owned resources. Hard-deleting these on re-generation destroys the data irrecoverably, breaking GDPR right-to-erasure audit trails and preventing undo/history features. Fix: convert to soft-delete pattern (set `deletedAt = now()` on the replaced rows) or document as a justified exception in a new ADR if hard-delete is intentional for this "replace" semantics. Without an ADR documenting the exception, this is an undocumented ADR-001 violation.

---

### WARNING

- **`src/server/services/itinerary.service.ts:210-244`** — `reorderActivities` accepts `dayNumber` in its type contract (`updates: Array<{ id: string; orderIndex: number; dayNumber?: number }>`) but never uses it — the comment explicitly notes this limitation. This means the public interface of the service is lying about its capabilities. Either remove `dayNumber` from the type until the cross-day feature is implemented, or implement it. Shipping an interface that accepts inputs it silently ignores is an architectural smell and a data integrity risk.

- **`src/server/actions/itinerary.actions.ts` and `src/server/actions/checklist.actions.ts`** — Neither action file has `import "server-only"`. Services have it correctly; the convention from ADR-001 requires all server-layer modules (services AND actions) to include the guard to prevent accidental client import. Action files with `"use server"` are protected at runtime by Next.js, but the `import "server-only"` lint guard at module level is still required per team convention.

- **No DB indexes committed for `itineraryDay(tripId)` and `activity(dayId)`** — The new persistence service queries `itineraryDay.findMany({ where: { tripId } })` and `activity.findMany({ where: { dayId } })` without composite indexes on those foreign keys. Prisma does not automatically create indexes on foreign key columns (unlike Rails/Django). For trips with many days and activities, these queries will perform sequential scans. A Prisma migration adding `@@index([tripId])` on `ItineraryDay` and `@@index([dayId])` on `Activity` should have been included in this sprint. Flag for Sprint 3.

- **`src/server/services/itinerary.service.ts:159-163` and `src/server/services/checklist.service.ts:139-143`** — `addActivity` and `addChecklistItem` both use `findFirst` with `orderBy: { orderIndex: "desc" }` to determine the next `orderIndex`. Under concurrent requests (two users editing the same trip simultaneously, or a race on a slow connection), both calls could read the same max `orderIndex`, resulting in two activities with the same `orderIndex`. This should be resolved using `MAX(orderIndex)` in a transaction or by adding a unique constraint and handling conflict. Low probability for MVP but documented here.

- **`src/server/services/itinerary.service.ts:170`** — `db.activity.create` (in `addActivity`) has no `select` clause. Per ADR-001 and SR-005 (explicit select in all service queries), this returns the full `Activity` model object. The function signature is `Promise<void>` so the return value is discarded, but the data still crosses the wire from DB to application server. Add `select: { id: true }`.

- **`docs/architecture.md` — No ADR for hard-delete-on-regenerate pattern** — The decision to use `deleteMany` (hard delete) inside the save-plan transaction is an architectural decision with GDPR implications. It must be documented as an ADR (or as an exception note in ADR-005) before Sprint 3. The decision might be intentional (AI-generated content is not user-authored and can be regenerated), but it must be explicit and reviewed.

---

### INFO

- `assertOwnership` in both new service files performs a separate Prisma query per mutation (2 DB round-trips: one for ownership, one for the operation). For MVP traffic this is fine. For Sprint 3+ high-throughput paths, consider embedding `userId` in the main query WHERE clause (as documented in the security baseline's "Correct pattern") to eliminate the extra round-trip. The current approach is functionally correct but suboptimal.

- `getItineraryPlan` reconstructs a partial `ItineraryPlan` with `destination: ""`, `travelStyle: ""`, `highlights: []`. The itinerary page merges this with sessionStorage. When sessionStorage is cleared (different device, new tab after clearing browser data), the plan header is blank. The `Trip` model already has `destinationName` — a JOIN in `getItineraryPlan` would resolve this without sessionStorage dependency.

- The `ActionResult<T>` type is redefined identically in both `itinerary.actions.ts` and `checklist.actions.ts`. Extract to a shared type in `@/types/actions.ts` to avoid drift when the shape needs updating.

---

### ADRs to update

- **ADR-001**: Add note clarifying whether the soft-delete rule applies to AI-generated content replacement operations (the `deleteMany` in save-plan/save-checklist). This is an open architectural question that must be resolved.
- **New ADR-006**: Rate limiting strategy — sliding window INCR+EXPIRE vs. Lua atomic script, limits per endpoint type, IP extraction rules. The rate-limit design was implemented without a decision record.

### Verdict: BLOCK

Two architectural violations block Sprint 3: (1) `getItineraryPlan` `include` violation of ADR-001/SR-005, and (2) hard-delete `deleteMany` in save operations without an ADR exception documenting the GDPR-sensitive decision. The missing `import "server-only"` in action files and missing DB indexes are WARNINGs to be scheduled in Sprint 3.

---

## Security Review

**Reviewer**: security-specialist (performed by Claude Sonnet 4.6 — Opus rate-limited)
**Date**: 2026-02-25
**Branch**: feat/sprint-2
**Scope**: OWASP Top 10, auth guards, BOLA, PII, rate limiting, LGPD

---

### CRITICAL (deploy blocked)

- **`src/server/services/itinerary.service.ts:42-44` and `src/server/services/checklist.service.ts:33`** — Hard-delete (`deleteMany`) on user-owned data during plan/checklist regeneration. CWE-312 (Sensitive Data in Non-Volatile Memory Cleared Prematurely) / GDPR Art. 17. When a user regenerates their AI plan, all previous `ItineraryDay` and `Activity` records are permanently destroyed. This eliminates the audit trail required for GDPR right-to-erasure requests (erasure must be provable — you cannot prove you erased data that was already hard-deleted under different semantics), prevents point-in-time recovery of user-authored edits mixed into AI content, and removes data that may be needed for analytics (what the user generated before vs. after). An erasure pipeline cannot distinguish "deleted at user request" from "deleted by system on regeneration" in the current model. Minimum fix: add `replacedAt` timestamp to `ItineraryDay` and soft-delete replaced rows, or document a clear GDPR exception that AI-generated content without user edits is not subject to erasure audit — requires DPO sign-off if operating under GDPR/LGPD.

- **`src/server/services/itinerary.service.ts:231-244`** — `reorderActivities` silently ignores `dayNumber` updates. This is not only a data integrity bug (flagged by Tech Lead) but a **security concern**: the action accepts a `dayNumber` field from the client, processes it (adds it to the type contract), and silently discards it. CWE-20 (Improper Input Validation). This creates a deceptive contract — the client believes the server processed a cross-day move, but the activity remains on the original day with a new `orderIndex` that makes no sense in context. From a security standpoint, accepting client input that is silently ignored is a form of incomplete input validation that can mask adversarial probing of the endpoint's actual behavior.

---

### WARNING (fix before next sprint)

- **`src/server/actions/itinerary.actions.ts:64-83` and `src/server/actions/checklist.actions.ts:82-96`** — `addActivity` and `addChecklistItem` accept string inputs (`title`, `description`, `text`, `category`) with no Zod validation, no length limits, and no allowlist on `category`. Per `docs/security.md` §"Input Validation" rule 1: "All Server Actions and API Route Handlers must validate input using Zod schemas before processing." OWASP A03:2021 Injection. An attacker can write strings of arbitrary length (multi-MB) to PostgreSQL, exhausting storage and triggering Prisma errors that surface raw DB error messages. The `category` cast to `ActivityType` without enum validation (`data.category as AiActivity["category"]`) will cause a Prisma runtime crash on any invalid string, creating a denial-of-service vector. Fix: add Zod schemas at the action boundary before calling services.

- **`src/server/lib/rate-limit.ts:27-31`** — The INCR+EXPIRE sequence is not atomic. Between the `INCR` call (line 27) and the `EXPIRE` call (line 31), the Redis connection could fail, leaving an INCR'd key with no TTL (infinite retention). On Upstash (HTTP-based Redis), this risk is higher than on a persistent TCP connection. A key with no expiry means a user who triggers a connection failure after their first request is permanently rate-limited without recourse. CWE-362 (Race Condition). Fix: use a Lua script (`EVAL "local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c" 1 key window`) for atomic INCR+EXPIRE.

- **`src/server/actions/auth.actions.ts:30` and `:94`** — `x-forwarded-for` header used as-is for rate-limit key without splitting on comma. On multi-hop proxy chains (Vercel → CDN → client), the header is `"client-ip, proxy-ip"`. The full string is used as the Redis key, meaning two clients behind different proxy chains have different keys even if they share the same origin IP. More critically, an attacker who controls a proxy can inject arbitrary IP strings into the `x-forwarded-for` header to bypass rate limiting. Fix: take only the first IP (`header.split(",")[0]?.trim()`). Also consider using `x-real-ip` (set by Vercel) as the primary source. OWASP A05:2021 Security Misconfiguration.

- **`next.config.ts:21`** — `'unsafe-eval'` in CSP applied unconditionally to all environments including production. This is required in development for Turbopack but significantly weakens XSS protection in production. OWASP A05:2021. Fix: `process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : ""` in the `script-src` directive.

- **`next.config.ts:11`** — `Permissions-Policy: geolocation=()` blocks geolocation for all origins including self. `docs/security.md` §"Security headers" specifies `geolocation=(self)` to allow the application's own origin (needed for the Mapbox map feature in the itinerary view). The current `geolocation=()` will silently block the browser geolocation API for the app itself, breaking future location-based features. This is a security misconfiguration that may not surface until the feature is built.

- **LGPD/GDPR — `ItineraryDay`, `Activity`, `ChecklistItem` not covered in erasure pipeline** — These three new models hold user-trip data that is subject to right-to-erasure (GDPR Art. 17 / LGPD Art. 18). The GDPR checklist in `docs/security.md` requires a scheduled purge job for all user-owned data 30 days after `User.deletedAt` is set. Neither model is referenced in the erasure pipeline documentation. When a user requests account deletion, their itinerary and checklist data must be purged within 30 days. Flag for data-engineer to update `docs/data-architecture.md` and the purge job.

---

### INFO

- `assertOwnership` uses `where: { id: tripId, userId, deletedAt: null }` which correctly prevents BOLA at the query level. This matches the "Correct pattern" in `docs/security.md` §Risk 1 — no post-fetch ownership check is used anywhere in the new code. Good.
- No hardcoded secrets, API keys, or connection strings in any committed file. `env.ANTHROPIC_API_KEY` is correctly used in `ai.service.ts`.
- `handleError` logs `err.message` only — no PII, no stack traces exposed to client. Good.
- `checklist.service.ts:73-81` uses explicit `select` — SR-005 compliant. Good.
- Rate-limit keys `rl:auth:{ip}` and `rl:ai-plan:{userId}` do not encode PII in readable form (userId is a CUID2, not email). Good.
- No new npm dependencies were added in this sprint — dependency audit not required.

---

### LGPD checklist (Sprint 2 scope)

- [x] No PII in logs — error handlers log `err.message` only
- [x] No PII in Redis rate-limit keys (CUID2 userId, not email)
- [x] `auth()` called first in all 10 new Server Actions
- [x] BOLA guard (`assertOwnership`) on all mutations — userId from session only
- [x] No hardcoded credentials or secrets
- [x] Soft delete on `Activity` (individual `deleteActivity`) and `ChecklistItem` (individual `deleteChecklistItem`) — `deletedAt` pattern correct
- [ ] Hard delete (`deleteMany`) on `ItineraryDay` and `ChecklistItem` during regeneration — LGPD erasure audit gap (CRITICAL above)
- [ ] `ItineraryDay`, `Activity`, `ChecklistItem` not in erasure pipeline — must be added before accepting first real user
- [ ] No Zod validation on `addActivity`/`addChecklistItem` — injection risk (WARNING above)
- [ ] `x-forwarded-for` not split — rate-limit bypass possible (WARNING above)

### Verdict: BLOCK

Two CRITICAL issues block any production deploy: (1) hard-delete during regeneration breaks GDPR erasure audit trail, (2) `reorderActivities` accepts-and-discards client input without validation. Three WARNINGs (missing Zod on mutation actions, rate-limit atomicity, CSP `unsafe-eval` in production) must be tracked as Sprint 3 P0 items.

---

## Consolidated Verdict — Sprint 2

| Reviewer | Verdict | Critical Issues |
|---|---|---|
| Tech Lead | BLOCK | 3 |
| Architect | BLOCK | 2 |
| Security | BLOCK | 2 |

> Note: Several CRITICAL issues are shared between reviewers (e.g., `getItineraryPlan include`, `reorderActivities` silent data corruption). Unique critical issue count: **4**.

### Overall: 🚫 SPRINT BLOCKED — resolve all CRITICAL issues before Sprint 3

### Priority action items (ordered by severity)

1. **[CRITICAL — security + architect]** Hard-delete in `saveItineraryPlan`/`saveChecklist` breaks GDPR erasure audit trail — convert to soft-delete or document ADR exception — **owner: dev-fullstack-1** — **deadline: before Sprint 3**

2. **[CRITICAL — tech-lead + architect]** `getItineraryPlan` uses `include` instead of explicit `select` — violates ADR-001/SR-005 — **owner: dev-fullstack-1** — **deadline: before Sprint 3**

3. **[CRITICAL — tech-lead + security]** `reorderActivities` accepts `dayNumber` but silently ignores it — silent data corruption + deceptive contract — either implement cross-day move or remove `dayNumber` from interface — **owner: dev-fullstack-2** — **deadline: before Sprint 3**

4. **[CRITICAL — tech-lead]** Hardcoded Portuguese strings in `PlanGeneratorWizard.tsx` (12+ strings outside i18n) — AC-001 of US-015 not satisfied — **owner: dev-fullstack-2** — **deadline: before Sprint 3**

5. **[WARNING — security]** No Zod validation on `addActivity` and `addChecklistItem` — arbitrary-length strings written to DB — **owner: dev-fullstack-1** — **deadline: Sprint 3 week 1**

6. **[WARNING — tech-lead + security]** `x-forwarded-for` not split on comma — rate-limit key is per-proxy-chain, not per-client — **owner: dev-fullstack-1** — **deadline: Sprint 3 week 1**

7. **[WARNING — tech-lead + security]** `'unsafe-eval'` in CSP applied to production — **owner: dev-fullstack-1** — **deadline: Sprint 3 week 1**

8. **[WARNING — security]** Rate-limit INCR+EXPIRE not atomic — fix with Lua script — **owner: dev-fullstack-1** — **deadline: Sprint 3 week 1**

9. **[WARNING — architect]** Missing `import "server-only"` in `itinerary.actions.ts` and `checklist.actions.ts` — **owner: dev-fullstack-1** — **deadline: Sprint 3 week 1**

10. **[WARNING — architect]** No DB indexes on `itineraryDay(tripId)` and `activity(dayId)` — add Prisma migration — **owner: dev-fullstack-2** — **deadline: Sprint 3 week 1**

11. **[WARNING — security]** `ItineraryDay`, `Activity`, `ChecklistItem` not in LGPD erasure pipeline — **owner: data-engineer** — **deadline: Sprint 3 before first real user**

12. **[WARNING — architect]** Document hard-delete-on-regenerate as ADR-006 exception (or convert to soft-delete) — **owner: architect** — **deadline: Sprint 3 week 1**
