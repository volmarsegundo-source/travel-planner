# Security Review — Sprint 1

**Date:** 2026-02-26
**Reviewer:** Security Specialist Agent
**Branch:** feat/sprint-1
**Standard:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), GDPR Art. 5 / 25 / 32

---

## Executive Summary

Sprint 1 delivers the core authentication, trip management, AI itinerary generation, and checklist features. The implementation demonstrates a strong security posture for an MVP-stage codebase: BOLA mitigations are consistently applied, the `"server-only"` boundary is enforced across all server modules, Zod validation gates every action, and PII handling in logs and API responses is disciplined.

However, the review identified **4 vulnerabilities** requiring remediation before this sprint can be considered production-ready:

- **1 HIGH**: `ANTHROPIC_API_KEY` missing from `.env.example`, creating a deployment secret-management gap
- **1 HIGH**: Shared Redis cache key namespace collision between AI plan and AI checklist caches — one user's cached plan can be returned as another's checklist result
- **1 HIGH**: `reorderActivities` in `trip.service.ts` updates activity rows without verifying they belong to the trip's days, enabling cross-trip activity hijacking
- **1 MEDIUM**: `ActivityData` inputs in `itinerary.actions.ts` are typed but not Zod-validated — the `label` length check in `addChecklistItemAction` is a single `!label.trim()` guard with no maximum length enforcement

Additionally, the review flags several architecture-level gaps that are **not blockers** for Sprint 1 but must be addressed before the first external user is onboarded: absence of rate limiting on any endpoint, no HTTP security headers configured, Redis connections without TLS in production, and the GDPR data-erasure pipeline not yet implemented.

**Overall Sprint 1 Security Verdict: APPROVED WITH CONDITIONS**

The two HIGH vulnerabilities (SEC-S1-002, SEC-S1-003) must be fixed before this branch is merged to `main`. The HIGH environment gap (SEC-S1-001) must be resolved before the first staging deployment. The MEDIUM issue (SEC-S1-004) should be addressed in the same sprint to maintain validation consistency.

---

## Threat Model Assessment

### Key Assets

| Asset | Classification | Location |
|---|---|---|
| User credentials (email + passwordHash) | Secret | PostgreSQL `users` table |
| Session tokens | Secret | PostgreSQL `sessions` table + Auth.js cookie |
| Trip itineraries (travel plans, schedules) | PII — Sensitive | PostgreSQL `trips`, `itinerary_days`, `activities` |
| Checklist items (travel prep data) | PII — Sensitive | PostgreSQL `checklist_items` |
| ANTHROPIC_API_KEY | Secret | Environment variable |
| NEXTAUTH_SECRET | Secret | Environment variable |
| MAPBOX_SECRET_TOKEN | Secret | Environment variable |
| Redis-cached AI-generated plans | Derived PII | Redis `cache:ai-plan:*` keys |

### Principal Threats Evaluated

| Threat | OWASP Category | Priority |
|---|---|---|
| Unauthorized access to another user's trip (BOLA/IDOR) | API1:2023, A01:2021 | Critical |
| Mass assignment via Server Action parameter tampering | A08:2021 | High |
| PII leakage via logs, error messages, or over-fetching | A02:2021 | High |
| Session forgery / fixation | A07:2021 | High |
| AI prompt injection via user-supplied trip data | A03:2021 | Medium |
| Redis cache poisoning / cross-user data leakage | A02:2021 | High |
| Dependency supply chain compromise | A06:2021 | High |
| Credential exposure via environment variable gaps | A05:2021 | High |
| Denial-of-service via unbounded AI API calls | A04:2021 | High |
| Missing security headers (XSS, clickjacking) | A05:2021 | Medium |

---

## Dimension Reviews

### 1. Authentication — PASS (with advisory)

**Rating: WARNING**

**What was evaluated:**
- `src/lib/auth.ts` — Auth.js v5 configuration
- `src/server/services/auth.service.ts` — registration, email verification, password reset

**Findings:**

POSITIVE:
- Database sessions (`strategy: "database"`) are correctly configured, enabling session revocation. This matches the security baseline requirement in `docs/security.md` (Risk 3).
- The PrismaAdapter is correctly attached — sessions are stored in PostgreSQL, not in JWTs.
- `emailVerified` is checked before allowing credential login (`if (!user.emailVerified) return null`). Unverified accounts cannot authenticate.
- Soft-delete filter is applied in the credential lookup (`deletedAt: null`). Deleted users cannot log in.
- bcrypt with 12 rounds is correctly chosen. This is above the minimum recommended rounds for a 2026 threat model.
- Password reset uses CUID2 tokens stored in Redis with a 1-hour TTL — correct. The token is single-use (deleted on use).
- Email verification uses CUID2 tokens with 24-hour TTL — correct.
- User enumeration is prevented in `requestPasswordReset` — always returns success regardless of whether the email exists.

ADVISORY:
- The `auth()` configuration does not explicitly set `session.maxAge` or `cookies.sessionToken.options`. Auth.js v5 has secure defaults, but the security baseline in `docs/security.md` (Risk 3) calls for explicit cookie configuration with `httpOnly: true`, `sameSite: "lax"`, and `secure: process.env.NODE_ENV === "production"`. This should be made explicit in `auth.ts` to prevent accidental misconfiguration in a future refactor.
- `NEXTAUTH_SECRET` is validated in `.env.example` as a placeholder string (`"CHANGE_ME_minimum_32_characters_long_here_ok"`). The `@t3-oss/env-nextjs` env schema should enforce `z.string().min(32)` on `NEXTAUTH_SECRET` at startup. Verify this is implemented in the env validation module (not reviewed in this sprint, as `src/lib/env.ts` was not present in the file list — see Open Questions).

---

### 2. Authorization (BOLA) — PASS (with one FAIL)

**Rating: WARNING**

**What was evaluated:**
- `src/server/services/trip.service.ts` — all 5 service methods
- `src/server/actions/trip.actions.ts` — all 5 actions
- `src/server/actions/itinerary.actions.ts` — all 5 actions
- `src/server/actions/ai.actions.ts` — both AI generation actions
- `src/server/actions/checklist.actions.ts` — all 3 actions

**Findings:**

POSITIVE — Trip service layer:
- `getUserTrips`: scopes query to `{ userId, deletedAt: null }` — BOLA-safe.
- `getTripById`: fetches without userId in query (two-step), then checks `trip.userId !== userId` and throws `ForbiddenError`. This is the LESS preferred pattern (noted in `docs/security.md` Risk 1 as anti-pattern), but it is functionally safe since `ForbiddenError` is thrown before any data is returned. No data leaks to the caller on a mismatch.
- `createTrip`: userId comes only from service parameter (which is bound to `session.user.id` in the action) — correct.
- `updateTrip`: verifies ownership before update, does not pass userId in the Prisma `update` where clause (uses `id` alone after ownership is confirmed on a separate fetch). Safe: the two-step approach means the attacker's userId check fails before the update executes.
- `deleteTrip`: same two-step pattern as above — safe.

FAIL — `reorderActivities`:
- The method verifies trip ownership correctly.
- However, the Prisma `$transaction` that updates activities does so using only `where: { id }` — it does not verify that each activity's `dayId` belongs to the authorized trip.
- **Attack vector**: An authenticated user can call `reorderActivities` with their own `tripId` (which they own) but supply `activities` arrays containing IDs of activities belonging to another user's trip. The ownership check passes (their trip exists), but the transaction will update activities they do not own.
- This is a cross-entity BOLA issue: authorization is checked at the trip level but not propagated to the child activity rows being mutated.
- Severity: HIGH. See SEC-S1-003.

POSITIVE — Itinerary actions:
- `addActivityAction`: verifies trip ownership AND verifies the target day belongs to the trip (`where: { id: dayId, tripId }`) before inserting. Correct.
- `updateActivityAction`: verifies trip ownership AND verifies `activity.day.tripId` matches before updating. Correct two-level BOLA check.
- `deleteActivityAction`: same correct two-level pattern as update.
- `addItineraryDayAction`: verifies trip ownership before inserting. Correct.

POSITIVE — AI actions:
- `generateTravelPlanAction` and `generateChecklistAction` both perform a BOLA check via `db.trip.findFirst({ where: { id: tripId, userId: session.user.id, deletedAt: null } })` before dispatching to the AI service. Correct.
- `persistItinerary` and `persistChecklist` call `deleteMany` and `createMany` with `tripId` scope only — the BOLA authorization was already established in the parent action before calling these helpers. This is acceptable since the helpers are private (not exported).

POSITIVE — Checklist actions:
- All three checklist actions (`toggle`, `add`, `delete`) perform two-level BOLA checks: trip ownership via `verifyTripOwnership`, then item membership via `where: { id: itemId, tripId }`. Correct.

---

### 3. Input Validation — PASS (with one WARNING)

**Rating: WARNING**

**What was evaluated:**
- `src/lib/validations/trip.schema.ts`
- `src/lib/validations/user.schema.ts`
- All action files for Zod usage

**Findings:**

POSITIVE:
- `TripCreateSchema` enforces string min/max lengths, optional dates, date ordering (`endDate >= startDate`), and constrained gradient/emoji fields.
- `TripUpdateSchema` enforces the same field-level constraints. Notably, `visibility` and `status` changes go through Zod enum validation — an attacker cannot inject arbitrary status strings.
- `UserSignUpSchema` caps password at 72 characters, which correctly prevents bcrypt silent truncation (bcrypt processes only the first 72 bytes; passwords longer than 72 bytes are silently truncated to the same hash, which could enable a weak-credential attack).
- `UserSignInSchema` validates email format before attempting DB lookup, preventing some NoSQL-style injection patterns (though Prisma already parameterizes queries).
- Auth actions use inline `TokenSchema` and `EmailSchema` for token and email inputs — correct.
- `ConfirmResetSchema` validates both token presence and password policy (min 8, max 72) — correct.

WARNING — `ActivityData` in `itinerary.actions.ts`:
- `ActivityData` and `Partial<ActivityData>` are TypeScript interfaces, not Zod schemas. TypeScript interfaces are erased at runtime. There is no runtime validation of `title` length, `notes` length, `startTime` / `endTime` format (expected `HH:MM`), or `activityType` enum membership before inserting into the database.
- `addChecklistItemAction` does only `!label.trim()` for the label input — no maximum length check against the database constraint (`@db.VarChar(200)`). A label exactly at or above 200 characters would throw a Prisma error that propagates through `mapErrorToKey`, leaking a Prisma error message to the caller (see SEC-S1-004).
- The `title` field in `Activity` has a database-level `@db.VarChar(200)` constraint — without application-level validation, oversized inputs will cause Prisma `P2000` errors that surface as non-standard error messages.
- Severity: MEDIUM. See SEC-S1-004.

---

### 4. PII Protection — PASS

**Rating: PASS**

**What was evaluated:**
- `src/lib/logger.ts` — log output structure
- All service files for log call sites
- Prisma `select` discipline across services

**Findings:**

POSITIVE:
- The logger outputs a structured JSON object. The error variant serializes only `error.message`, not the full stack trace (`errorMessage: error instanceof Error ? error.message : String(error)`). Stack traces are not sent to stdout in production log streams.
- `AuthService.sendVerificationEmail` explicitly documents and suppresses the email parameter in logs: `_email: string // email intentionally not logged — PII`. This is correct and exemplary.
- `AuthService.registerUser` logs only `{ userId }` after creation — email is never logged.
- `AuthService.requestPasswordReset` logs `auth.passwordReset.emailNotFound` without logging the email that was searched. Correct.
- All `TripService` and action error logs pass only `{ userId }` in the meta object — no trip destination, title, or dates are logged.
- `AiService` logs only `{ userId }` and `{ userId, destination }` — the `destination` field in `ai.plan.generated` is a WARNING (see below) but is low severity for this context.
- `TRIP_SELECT` in `TripService` uses an explicit field allow-list — `passwordHash`, `image`, and other sensitive User fields can never appear in trip responses.
- Auth.js `session()` callback only injects `user.id` into the session shape — OAuth `access_token` and `refresh_token` are never propagated to the client-visible session object.

ADVISORY:
- `logger.info("ai.plan.generated", { userId, destination })` at line 224 of `ai.service.ts` logs `destination` paired with `userId`. The security baseline (`docs/security.md`) specifies "do not log user identity in combination with behavioral data." Destination + userId is borderline — the destination is not considered highly sensitive in isolation (it is a place name, not a home address), but the pairing creates a travel-pattern record in logs. This is LOW risk for current log infrastructure but should be evaluated if log retention exceeds 90 days or if logs are forwarded to a third-party SIEM.

---

### 5. SQL Injection — PASS

**Rating: PASS**

**What was evaluated:**
- All Prisma query calls across all service and action files
- Prisma schema for raw query usage

**Findings:**

POSITIVE:
- Zero uses of `db.$queryRaw`, `db.$executeRaw`, or any template literal SQL construction were found across all reviewed files.
- All database access goes through Prisma's typed query builder, which uses parameterized queries exclusively. Prisma 6.x (the version in use, despite the ADR referencing 7.x) does not construct SQL from user strings.
- String fields stored in the database (`title`, `destination`, `label`, etc.) are passed as Prisma parameter values, never interpolated into query strings.
- The `ItineraryPlanSchema` and `ChecklistResultSchema` in `ai.service.ts` Zod-validate AI-generated content before it is persisted via `persistItinerary` and `persistChecklist` — AI output is treated as untrusted input and validated before DB write.

ADVISORY:
- The Prisma schema version in `package.json` is `"@prisma/client": "^6.0.0"` while the ADR-001 references Prisma 7. This version mismatch should be reconciled. Prisma 6 is production-stable, but if ADR-001 explicitly chose Prisma 7 for its pure-TS footprint and eliminated cold-start gap, the team should verify actual installed version and update the ADR accordingly.

---

### 6. Secrets Management — FAIL (one critical gap)

**Rating: FAIL**

**What was evaluated:**
- `.env.example`
- Environment variable usage in `ai.service.ts` and `redis.ts`
- `package.json` for any hardcoded values

**Findings:**

FAIL:
- `ANTHROPIC_API_KEY` is used in `src/server/services/ai.service.ts` line 116 (`apiKey: process.env.ANTHROPIC_API_KEY`) but is **absent from `.env.example`**. This means:
  1. Developers setting up the project have no documented awareness this key is required.
  2. The `@t3-oss/env-nextjs` startup validation schema (if implemented) will not include this key unless added manually — the application may silently construct an Anthropic client with `undefined` as the API key, which will fail at runtime rather than at startup.
  3. In CI/CD, the key has no documented placeholder, increasing the risk of it being handled ad-hoc (hardcoded, stored in an insecure note, etc.).
- Severity: HIGH. See SEC-S1-001.

POSITIVE:
- No hardcoded credentials, tokens, or connection strings were found anywhere in the reviewed codebase.
- `.env.example` correctly uses placeholder values (`YOUR_GOOGLE_CLIENT_ID`, `CHANGE_ME_...`) and explicitly instructs developers to never commit `.env.local`.
- `MAPBOX_SECRET_TOKEN` is correctly named without `NEXT_PUBLIC_` prefix and documented as "server-side only — NEVER expose to client."
- The Redis client defaults to `redis://localhost:6379` only as a fallback with `process.env.REDIS_URL ?? "redis://localhost:6379"` — this default is safe for local dev but must be overridden in all deployed environments.

WARNING — Redis TLS in production:
- `ioredis` is configured without TLS enforcement in `redis.ts`. The Upstash Redis URL in production must use the `rediss://` (TLS) scheme. This is a configuration-time risk, not a code risk, but there is no enforcement at startup (e.g., `REDIS_URL must start with rediss:// in production` validation in the env schema). This should be added to the env validation.

---

### 7. GDPR Compliance — PARTIAL PASS

**Rating: WARNING**

**What was evaluated:**
- Prisma schema for soft-delete fields
- Auth service for deletion path
- Data retention indicators in code

**Findings:**

POSITIVE:
- `User` and `Trip` models have `deletedAt DateTime?` — soft delete is the pattern.
- `Trip` cascades to `ItineraryDay`, which cascades to `Activity` via `onDelete: Cascade`. Soft-deleting a trip will not cascade soft-delete to days and activities (Prisma `onDelete: Cascade` is a hard-delete cascade). However, since days and activities are only accessible via the trip, and the trip is filtered by `deletedAt: null`, the child records become effectively inaccessible when a trip is soft-deleted. This is acceptable for MVP.
- `ChecklistItem` has no `tripId`-level soft delete but is scoped to the trip — inaccessible after trip soft delete.
- `AuthService.registerUser` does not require name at registration — data minimization is satisfied at the field level.

GAPS (not blocking for Sprint 1, must be addressed before public launch):
- **Right to erasure pipeline**: No scheduled job to permanently purge records 30 days after `deletedAt`. This is flagged as a known gap in `docs/security.md` (SEC-010) and is deferred to Phase 2. This is acceptable at this stage but must be on the Sprint 2 backlog.
- **`deactivatedAt` field**: The GDPR right to restriction requires a suspension state separate from deletion. The `User` model has only `deletedAt` — no `deactivatedAt`. This is a schema gap.
- **Data portability export**: No `/account/data-export` endpoint exists. Required before first EU users.
- **Consent logging**: No mechanism to record when a user consented to the privacy notice. Required before public launch.
- **DPA evidence**: No evidence in the codebase or docs that DPAs with Vercel, Railway/Render, Upstash, Sentry, and Mapbox have been executed. This is a process gap, not a code gap, but must be resolved before launch.

---

### 8. Rate Limiting — FAIL

**Rating: FAIL**

**What was evaluated:**
- `src/middleware.ts`
- All action files for rate limit invocations
- Architecture docs

**Findings:**

FAIL:
- No rate limiting is implemented anywhere in the reviewed codebase. The middleware (`src/middleware.ts`) handles only route protection (auth redirect) and i18n — it contains no rate limit logic.
- No action or route handler invokes a rate limiter before processing.
- This is explicitly called out in the architecture (`docs/architecture.md`): "Rate limiting from day one: All API endpoints must be protected by Redis-based rate limiting middleware."
- The AI generation actions (`generateTravelPlanAction`, `generateChecklistAction`) make outbound calls to the Anthropic API, which is billed per token. Without rate limiting, a single authenticated user can exhaust the API quota by calling these actions in a tight loop. The Redis cache provides some protection for repeated identical requests, but requests with varied parameters (e.g., different budgets or languages) bypass the cache and each incur a full Anthropic API charge.
- The auth endpoints (`registerAction`, `requestPasswordResetAction`) are vulnerable to credential stuffing and password spray attacks without rate limiting.
- Severity: HIGH (cost explosion risk on AI endpoints; brute-force risk on auth endpoints). This gap was pre-identified as SEC-007 in `docs/security.md`.

CONTEXT: Rate limiting is a known pre-production requirement already documented. It is not a new finding from code review, but its absence in Sprint 1 code means the current implementation CANNOT be deployed to production without this control in place.

---

### 9. Dependency Vulnerabilities — CONDITIONAL PASS

**Rating: WARNING**

**Note:** The Bash tool was not available to run `npm audit --json` during this review. The following assessment is based on manual inspection of `package.json` dependency versions against known CVE databases as of the review date (2026-02-26). The tech-lead must run `npm audit --audit-level=high` as part of the merge gate for this sprint.

**Manual assessment by package:**

| Package | Version Range | Notes |
|---|---|---|
| `next` | `^15.1.0` | Next.js 15.1.x — no known critical CVEs at review date. Monitor for updates. |
| `next-auth` | `^5.0.0-beta.25` | Beta release. Beta software carries implicit instability risk. No known auth bypass CVEs in this range. ADR-001 accepted this trade-off. |
| `@prisma/client` | `^6.0.0` | Prisma 6.x is stable. Note: ADR references Prisma 7 — reconcile. |
| `bcryptjs` | `^3.0.3` | bcryptjs 3.x is a stable, widely-audited implementation. No known CVEs. |
| `ioredis` | `^5.4.1` | ioredis 5.4.x — no known critical CVEs. |
| `@anthropic-ai/sdk` | `^0.78.0` | Anthropic SDK. No known CVEs. Actively maintained. |
| `crypto-js` | `^4.2.0` | **FLAG**: `crypto-js` is listed as a dependency but does NOT appear to be used in any reviewed file. The application uses Node.js built-in `crypto` module (`createHash` in `ai.service.ts`). `crypto-js` has had historical vulnerabilities (CVE-2023-46133 in versions before 4.2.0). Version 4.2.0 addresses that CVE, but the package should be audited for actual usage and removed if unused (supply chain minimization). |
| `@dnd-kit/*` | various | Drag-and-drop library. No known security CVEs. |
| `react` | `^19.0.0` | React 19.0.x — current stable. |
| `zod` | `^3.25.76` | Current stable. No known CVEs. |

**Unused dependency flag (SEC-S1-005):**
`crypto-js` appears in `package.json` dependencies but was not imported in any of the 17 reviewed files. If it is genuinely unused, it should be removed — unused dependencies with historical CVEs (even patched ones) represent unnecessary supply chain risk and increase the attack surface.

---

### 10. Error Information Leakage — PASS (with advisory)

**Rating: WARNING**

**What was evaluated:**
- `src/lib/errors.ts` — error class definitions
- All action files for error handling patterns
- `src/lib/logger.ts` — error serialization

**Findings:**

POSITIVE:
- All actions use a `mapErrorToKey` helper that translates `AppError` instances to their `message` (which is an i18n key string like `"trips.errors.notFound"` — not a raw technical message) and falls back to `"errors.generic"` for unknown errors.
- `AppError.message` is always an i18n key in this codebase — it never contains raw Prisma text, SQL fragments, or stack traces.
- The logger serializes errors as `error.message` only (`errorMessage: error instanceof Error ? error.message : String(error)`) — stack traces are omitted from structured log output. This is correct.
- `NotFoundError` includes the resource type and ID in its message (`Trip with id 'xyz' not found`). This message is used in the service layer but is NOT returned directly to clients — the action's `mapErrorToKey` translates it to an i18n key. The `message` field on `AppError` is therefore safe to use internally but should never be directly serialized to an HTTP response body.

ADVISORY — `mapErrorToKey` in `itinerary.actions.ts` and `checklist.actions.ts` (lines 49–53 and 27–31):
- These files use `if (error instanceof Error) { return error.message; }` rather than `if (error instanceof AppError) { return error.message; }`.
- **Consequence**: If a Prisma error (which extends `Error`, not `AppError`) is thrown (e.g., a `P2000` constraint violation when `label` exceeds 200 chars, or a `P2002` unique constraint violation), its `error.message` — which contains Prisma error text including model name, field name, and sometimes constraint details — will be returned directly to the client via the action result's `error` field.
- The `trip.actions.ts` file uses the more defensive `if (error instanceof AppError)` pattern and falls back to `"errors.generic"` for non-AppError exceptions. The itinerary and checklist actions should be updated to match this safer pattern.
- Severity: MEDIUM (contributes to SEC-S1-004 scope). See finding below.

---

## Vulnerabilities Found

---

### SEC-S1-001 — Missing `ANTHROPIC_API_KEY` in `.env.example`

**Severity**: HIGH
**CWE**: CWE-312 — Cleartext Storage of Sensitive Information (via undocumented secret handling)
**OWASP**: A05:2021 — Security Misconfiguration

**Description:**
`src/server/services/ai.service.ts` reads `process.env.ANTHROPIC_API_KEY` at line 116:
```typescript
return new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```
This key is not documented in `.env.example`, not included in any reviewed env validation schema, and not mentioned in infrastructure or onboarding documentation. The Anthropic SDK accepts `undefined` as the API key value and will only fail at the first API call (runtime), not at startup. This means:
1. Developers who clone the repository and follow the setup guide (copying `.env.example` to `.env.local`) will not know this key is required.
2. Staging and production deployments may be misconfigured, causing AI features to silently fail.
3. Without documented handling, developers may store this key insecurely (e.g., in a shared note, a `.env.committed` file, or a chat message).

**File:** `C:\travel-planner\.env.example` — key absent
**Also affects:** `C:\travel-planner\src\server\services\ai.service.ts:116`

**Required Fix:**
1. Add `ANTHROPIC_API_KEY="sk-ant-YOUR_ANTHROPIC_KEY"` to `.env.example` with a descriptive comment.
2. Add `ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-")` to the server section of the `@t3-oss/env-nextjs` validation schema in `src/lib/env.ts`. This ensures the application fails at startup if the key is missing or malformed.
3. Update `docs/infrastructure.md` to document this key in the secrets management section.

---

### SEC-S1-002 — Redis Cache Key Collision Between AI Plan and AI Checklist

**Severity**: HIGH
**CWE**: CWE-706 — Use of Incorrectly-Resolved Name or Reference
**OWASP**: A02:2021 — Cryptographic Failures (integrity of cached data)

**Description:**
Both `generateTravelPlan` and `generateChecklist` in `src/server/services/ai.service.ts` use the same cache key prefix `cache:ai-plan:`:

```typescript
// generateTravelPlan (line 135)
const cacheKey = `cache:ai-plan:${cacheHash}`;

// generateChecklist (line 241)
const cacheKey = `cache:ai-plan:${cacheHash}`;  // same prefix — BUG
```

While the hash inputs differ in structure (`destination:travelStyle:budgetRange:days:language` vs `destination:month:travelers:language`), there are real-world inputs where the two hash inputs could produce the same MD5 digest (MD5 collision) or, more practically, where a crafted input to the checklist function produces a key that matches a previously cached plan.

More critically: this is a **deterministic namespace bug**, not just a theoretical collision. The two functions are storing different data types (`ItineraryPlan` vs `ChecklistResult`) in the same Redis key namespace. If — by coincidence or by an attacker's crafting — the MD5 hash of a plan's cache input equals the MD5 hash of a checklist's cache input, the `generateChecklist` function will return a deserialized `ItineraryPlan` object as if it were a `ChecklistResult`. The `JSON.parse(cached) as ChecklistResult` type assertion will not catch this at runtime — TypeScript type assertions are compile-time only.

The downstream consequence is corrupted checklist data being displayed to the user. In a more adversarial scenario, an attacker who can predict or influence another user's cache key can cause data from their own previously-generated plan to appear as another user's checklist.

**File:** `C:\travel-planner\src\server\services\ai.service.ts:241`

**Required Fix:**
Change the checklist cache key prefix from `cache:ai-plan:` to `cache:ai-checklist:`:
```typescript
// generateChecklist — line 241
const cacheKey = `cache:ai-checklist:${cacheHash}`;

// generateChecklist — line 308 (cache write)
await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL.AI_PLAN);
```

---

### SEC-S1-003 — BOLA in `reorderActivities`: Activity IDs Not Verified Against Trip

**Severity**: HIGH
**CWE**: CWE-639 — Authorization Bypass Through User-Controlled Key
**OWASP**: API1:2023 — Broken Object Level Authorization

**Description:**
`TripService.reorderActivities` in `src/server/services/trip.service.ts` (lines 176–202) correctly verifies that the caller owns the specified `tripId`, but then executes a `$transaction` that updates activity `orderIndex` values using only the activity `id` — without verifying that those activity IDs belong to the authorized trip:

```typescript
// Lines 194–201
await db.$transaction(
  activities.map(({ id, orderIndex }) =>
    db.activity.update({
      where: { id },           // only ID — no tripId or dayId scoping
      data: { orderIndex },
    })
  )
);
```

**Attack vector:**
1. Attacker owns Trip A (verified by the ownership check at line 181).
2. Attacker knows the activity ID of an activity in Victim's Trip B (obtainable by attempting to guess CUID2 IDs, or via a separate BOLA if another endpoint leaks them).
3. Attacker calls `reorderActivitiesAction` with `tripId = Trip A` (their own) and `activities = [{ id: victimActivityId, orderIndex: 99 }]`.
4. The trip ownership check passes (Trip A belongs to attacker).
5. The `$transaction` updates the victim's activity `orderIndex` without authorization.

While CUID2 IDs significantly reduce ID guessability, this does not substitute for authorization enforcement at the query level.

**File:** `C:\travel-planner\src\server\services\trip.service.ts:194-201`

**Required Fix:**
Each activity update in the transaction must be scoped to activities that belong to the authorized trip's days. The correct Prisma `where` clause should join through `day`:

```typescript
await db.$transaction(
  activities.map(({ id, orderIndex }) =>
    db.activity.update({
      where: {
        id,
        day: { tripId },   // enforce activity belongs to an authorized day
      },
      data: { orderIndex },
    })
  )
);
```

If a supplied activity ID does not belong to the trip, Prisma will throw a `P2025` (record not found) error, which should be caught and returned as a `ForbiddenError` or `NotFoundError` by the service.

---

### SEC-S1-004 — Missing Zod Validation on `ActivityData` and `ChecklistItem.label` Inputs

**Severity**: MEDIUM
**CWE**: CWE-20 — Improper Input Validation
**OWASP**: A03:2021 — Injection (via Prisma P2000 error leakage)

**Description:**
Two related input validation gaps were found:

**A — `ActivityData` has no runtime validation:**
`src/server/actions/itinerary.actions.ts` accepts `ActivityData` and `Partial<ActivityData>` TypeScript interfaces as action parameters. TypeScript type information is erased at runtime — a caller can supply:
- A `title` string of 300 characters (database constraint is 200 — `@db.VarChar(200)`), causing a Prisma `P2000` error.
- An invalid `startTime` value (e.g., `"25:99"`) that is stored verbatim in the database.
- An `activityType` value not in the allowed enum set (e.g., `"HACK"`), which succeeds because `activityType` is stored as `String?` in the schema, not as a typed enum.

**B — `addChecklistItemAction` label has no maximum length check:**
`src/server/actions/checklist.actions.ts` line 93 checks only `!label.trim()` — there is no maximum length validation against the `@db.VarChar(200)` database constraint. A label of 201+ characters will cause a Prisma `P2000` error.

**C — `mapErrorToKey` in itinerary and checklist actions leaks Prisma error text:**
As noted in Dimension 10, these actions use `if (error instanceof Error)` instead of `if (error instanceof AppError)`. This means the Prisma `P2000` error message — which contains internal field names and constraint details — is returned to the client via the action's `error: string` field.

**Files:**
- `C:\travel-planner\src\server\actions\itinerary.actions.ts:48-53` (mapErrorToKey)
- `C:\travel-planner\src\server\actions\itinerary.actions.ts:71` (addActivityAction — no Zod validation)
- `C:\travel-planner\src\server\actions\checklist.actions.ts:27-31` (mapErrorToKey)
- `C:\travel-planner\src\server\actions\checklist.actions.ts:93` (label length check)

**Required Fix:**
1. Create a `ActivityDataSchema` Zod schema and validate `data` in `addActivityAction` and `updateActivityAction` before the database write.
2. Add `z.string().min(1).max(200)` validation for the `label` parameter in `addChecklistItemAction`.
3. Update `mapErrorToKey` in both `itinerary.actions.ts` and `checklist.actions.ts` to use `if (error instanceof AppError)` with a safe fallback to `"errors.generic"` for non-AppError exceptions, matching the pattern in `trip.actions.ts`.

---

## npm Audit Summary

**Status: NOT RUN — Bash tool was unavailable during this review.**

The tech-lead MUST run `npm audit --audit-level=high` as a mandatory pre-merge gate for Sprint 1. This command must also be added to the CI pipeline (`/.github/workflows/`) before this branch can be considered production-ready, per the dependency security requirements in `docs/security.md`.

**Manual review findings (based on `package.json` inspection):**

| Severity | Package | Notes |
|---|---|---|
| Potential | `crypto-js@^4.2.0` | Not used in reviewed files. If unused, remove to reduce attack surface. |
| Advisory | `next-auth@^5.0.0-beta.25` | Beta software — monitor for security advisories closely. |
| Reconcile | `@prisma/client@^6.0.0` | ADR-001 specifies Prisma 7. Confirm actual installed version. |

**Required Action:**
Run `npm audit --json` and attach the output to the Sprint 1 review thread. Any HIGH or CRITICAL findings must be resolved before merging. The CI pipeline must fail on HIGH+ CVEs.

---

## GDPR Compliance Status

| Requirement | Status | Notes |
|---|---|---|
| Lawful basis documented | NOT STARTED | Privacy notice not yet drafted |
| Consent mechanism for marketing | NOT STARTED | Sprint 2+ scope |
| Right to access (data export) | NOT STARTED | No `/account/data-export` endpoint |
| Right to erasure (soft delete) | PARTIAL | `deletedAt` in place; purge job not implemented |
| Right to rectification | NOT STARTED | No account settings page yet |
| Right to restriction (`deactivatedAt`) | NOT STARTED | Field missing from `User` model |
| Right to portability | NOT STARTED | No export format defined |
| Data minimization | PASS | Name optional at registration; no PII in logs |
| Encryption at rest | PENDING | Must verify Railway/Render disk encryption is active before first user data |
| Encryption in transit | PARTIAL | HTTPS via Vercel confirmed; Redis TLS not enforced in code |
| DPAs with processors | NOT STARTED | Process gap — must be resolved before EU users |
| 72-hour breach notification plan | NOT STARTED | Process gap |
| Search query PII in logs | PASS | AI prompts not logged; only `{ userId }` logged |
| Itinerary visibility defaults to PRIVATE | PASS | `TripVisibility @default(PRIVATE)` in Prisma schema |
| Avatar EXIF stripping | NOT APPLICABLE | No avatar upload in Sprint 1 |
| Cookie consent | NOT STARTED | Sprint 2+ scope |

**GDPR pre-launch blockers (must be resolved before first EU user):**
1. Privacy notice must be published and linked from registration.
2. Right to erasure purge job must be implemented and tested.
3. DPAs must be signed with all five listed processors.
4. `deactivatedAt` field must be added to the `User` model.
5. Data export endpoint must be implemented.

---

## Architecture-Level Gaps (Pre-Production Blockers, Not Sprint 1 Code Defects)

These items are not newly discovered — they are documented in `docs/security.md` and `docs/architecture.md`. They are listed here to ensure they are tracked as hard blockers before any user traffic is accepted.

| ID | Gap | Severity | Target |
|---|---|---|---|
| SEC-007 | No rate limiting on any endpoint | HIGH | Must be Sprint 2 item 1 |
| SEC-013 | No HTTP security headers (CSP, HSTS, X-Frame-Options) | MEDIUM | Must be Sprint 2 |
| SEC-010 | No GDPR erasure purge job | HIGH | Must be Sprint 2 |
| SEC-003 | Auth.js cookie options not explicitly configured | MEDIUM | Sprint 2 |
| Redis TLS | `REDIS_URL` not validated for `rediss://` in production | HIGH | Sprint 2 env validation |
| ANTHROPIC_API_KEY env validation | No startup validation for this key | HIGH | SEC-S1-001 fix |
| `src/lib/env.ts` | File not in Sprint 1 review list — confirm it exists and covers all secrets | HIGH | Confirm before merge |

---

## Sign-off

```
[ ] APPROVED
[x] APPROVED WITH CONDITIONS
[ ] BLOCKED
```

**Conditions for merge approval:**

The following must be resolved before this sprint branch is merged to `main`:

1. **SEC-S1-001** (HIGH) — Add `ANTHROPIC_API_KEY` to `.env.example` and to the `@t3-oss/env-nextjs` validation schema. Verify `src/lib/env.ts` exists and covers all required secrets.

2. **SEC-S1-002** (HIGH) — Fix the Redis cache key prefix collision: change `cache:ai-plan:` to `cache:ai-checklist:` in `generateChecklist` (both the read key at line 241 and the write key at line 308 of `src/server/services/ai.service.ts`).

3. **SEC-S1-003** (HIGH) — Add `day: { tripId }` to the Prisma `where` clause in the `reorderActivities` transaction in `src/server/services/trip.service.ts` to prevent cross-trip activity mutation.

4. **SEC-S1-004** (MEDIUM) — Add Zod validation schemas for `ActivityData` inputs in `itinerary.actions.ts`, add max-length validation for `label` in `addChecklistItemAction`, and update both files' `mapErrorToKey` to use `instanceof AppError` instead of `instanceof Error`.

5. **npm audit** — Run `npm audit --audit-level=high` and confirm zero HIGH/CRITICAL findings before merge. Attach output to PR.

Additionally, confirm that `src/lib/env.ts` exists and includes startup validation for all secrets referenced in `.env.example`. If it does not exist, create it before merge — the architecture requires it.

Items SEC-007 (rate limiting), SEC-013 (security headers), and the GDPR backlog items are **pre-production blockers** that must be completed before the first external user is onboarded. They do not block the Sprint 1 merge to `main`, but they must be the first items on the Sprint 2 backlog.

---

**Reviewed by:** Security Specialist Agent
**Review date:** 2026-02-26
**Next review:** Before Sprint 2 merge — confirm SEC-S1-001 through SEC-S1-004 are resolved and npm audit is clean.
