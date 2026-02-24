# SEC-SPEC-001: Security Review — Trip Creation & Management

**Status**: CLEARED WITH CONDITIONS
**Date**: 2026-02-23
**Reviewer**: security-specialist
**Related**: SPEC-001, DATA-TRACK-001, US-001
**References**: docs/security.md, docs/data-architecture.md

---

## Executive Summary

SPEC-001 (Trip Creation & Management) and DATA-TRACK-001 (Event Tracking) demonstrate strong alignment with the security baseline defined in `docs/security.md`. The authorization model correctly implements BOLA mitigation at the query layer, input validation follows the Zod allowlist pattern without `.passthrough()`, mass assignment is prevented through explicit field mapping, and all analytics events are free of PII. Two medium-severity findings require correction before merge — one is a functional defect in a code sample (redirect inside try/catch) that would cause broken redirects in production, and one is a gap in the soft-delete middleware implementation referencing a deprecated API without a fully specified replacement. Three low-severity findings and four conditional requirements must be addressed before or during implementation. The verdict is **CLEARED WITH CONDITIONS**: development may begin, but the conditions listed in Section 12 must be verified and corrected before any PR is merged.

---

## Review Scope

The following artifacts were reviewed in full:

- `docs/SPEC-001.md` — Prisma data model (Trip schema, indexes, soft-delete middleware), four Server Actions (`createTrip`, `updateTrip`, `archiveTrip`, `deleteTrip`), Zod validation schemas, TripService business logic, component architecture, caching strategy, error handling table, and testing strategy
- `docs/DATA-TRACK-001.md` — All seven event definitions, TypeScript interfaces, Zod schemas, hashing strategy, analytics dispatch pattern, GDPR compliance per-event table, and the funnel definition
- `docs/security.md` — Risk register (SEC-001 through SEC-020), minimum security requirements, GDPR/LGPD compliance checklist
- `docs/data-architecture.md` — BaseEvent schema, `track()` implementation, `hashUserId()` / `hashEntityId()` functions, consent strategy, and erasure pipeline

---

## Findings

### Critical Findings (must fix before implementation)

No critical findings were identified. The primary risks from the security baseline (BOLA/IDOR, mass assignment, missing auth) are correctly addressed in the spec.

---

### High Findings (must fix before merge)

None identified.

---

### Medium Findings (should fix before merge)

#### FIND-M-001: `redirect()` Inside `try/catch` in `createTrip` Code Sample

**Location**: SPEC-001, Section 4.1, `createTrip` Server Action implementation

**Description**: The code sample for `createTrip` calls `redirect()` inside the `try/catch` block at line 371:

```typescript
try {
  const trip = await TripService.createTrip(session.user.id, parsed.data);
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);  // <- INSIDE try/catch
} catch (error) {
  if (error instanceof AppError) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Nao foi possivel criar a viagem. Tente novamente em alguns instantes." };
}
```

In Next.js, `redirect()` throws an internal `NEXT_REDIRECT` error. The `catch` block will intercept this throw. Since `NEXT_REDIRECT` is not an instance of `AppError`, execution falls through to the generic `return { success: false, error: "..." }` branch. The redirect never executes; the user sees a generic error message on successful trip creation.

Section 11.4 of the same spec correctly documents this pitfall and shows the fix, creating a direct contradiction between the spec's normative code sample and its own implementation guidance.

**Security Impact**: Low. This is a functional defect, not a security vulnerability. However, the defect would be reproduced by developers who copy the code sample directly, and an incorrect error state could confuse monitoring systems into false positive error rate alerts.

**Required Fix**: The `createTrip` code sample in Section 4.1 must be corrected to match the pattern shown in Section 11.4:

```typescript
// CORRECT pattern — redirect() outside try/catch
let tripId: string;
try {
  const trip = await TripService.createTrip(session.user.id, parsed.data);
  tripId = trip.id;
} catch (error) {
  if (error instanceof AppError) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Nao foi possivel criar a viagem. Tente novamente em alguns instantes." };
}
revalidatePath("/trips");
redirect(`/trips/${tripId!}`);
```

The same correction must be applied to `updateTrip` when its full implementation is written, since it also calls `redirect()` per its side effects description.

---

#### FIND-M-002: Soft-Delete Middleware Uses Deprecated `db.$use` API

**Location**: SPEC-001, Section 3.2, Prisma Middleware for soft delete

**Description**: The spec defines the global soft-delete middleware using `db.$use()`:

```typescript
db.$use(async (params, next) => { ... });
```

Section 11.4 (Pitfall #7) acknowledges that `db.$use` is deprecated in Prisma 5+ and that Prisma 7 uses `db.$extends`. However, the normative implementation in Section 3.2 still shows `db.$use`, and no replacement code using `db.$extends` is provided. Open Question OQ-005 defers this to the developer, but without a concrete implementation reference.

**Security Impact**: Medium. The soft-delete middleware is a security control (SEC-009 in the risk register). If a developer follows the Section 3.2 code sample using `db.$use` and the behavior is silently broken in Prisma 7 (either not applied or causing a runtime error), soft-deleted records could be exposed in query results. This directly undermines the data isolation guarantee.

**Required Fix**: Before implementation begins, the architect must verify the correct Prisma 7 `db.$extends` pattern for the soft-delete middleware and update Section 3.2 with working code. The deprecated `db.$use` sample should be replaced with a confirmed `db.$extends` implementation. Until this is resolved, developers must not implement the soft-delete layer from Section 3.2 alone.

**Reference**: OQ-005 in SPEC-001. This finding elevates OQ-005 from an open question to a blocking requirement.

---

### Low / Informational Findings

#### FIND-L-001: `coverEmoji` Field Lacks Input Allowlist

**Location**: SPEC-001, Section 3.3 (validation rules) and Section 4.1 (`TripCreateSchema`)

**Description**: The `coverEmoji` field is validated only by `z.string().max(10)`. Any Unicode string up to 10 characters is accepted, including control characters, null bytes, bidirectional override characters (U+202E), and zero-width joiners used in emoji sequences. While React auto-escapes output (mitigating XSS), storing arbitrary Unicode in the database has operational risks: display inconsistency across platforms, log injection via bidirectional control characters, and potential storage surprises with multi-byte sequences.

**Recommended Fix**: Add a regex validation or an explicit allowlist of accepted emoji values. If the product intends to allow any standard emoji, a Unicode property escape regex is sufficient:

```typescript
coverEmoji: z
  .string()
  .regex(/^\p{Emoji}(\p{Emoji_Modifier}|\u{FE0F}|\u{200D}\p{Emoji})*$/u, "Emoji invalido")
  .max(10)
  .default("✈️"),
```

Alternatively, define an explicit enum of the 20-30 supported emoji values, which is the safer approach. The `COVER_GRADIENTS` enum pattern used for `coverGradient` is the model to follow.

---

#### FIND-L-002: `confirmationTitle` in `TripDeleteSchema` Has No Maximum Length

**Location**: SPEC-001, Section 4.1, `deleteTrip` input schema

**Description**: The `TripDeleteSchema` defines `confirmationTitle` as `z.string()` with no length constraint. Since trip titles are capped at 100 characters (enforced at creation), and `confirmationTitle` must match the title, this is technically bounded — but the Zod schema does not encode this constraint. A request with an arbitrarily large `confirmationTitle` would pass schema validation and be compared against the stored title before failing, creating a minor unnecessary string comparison of unbounded input.

**Recommended Fix**: Add `.max(100)` to the `confirmationTitle` field in `TripDeleteSchema` to match the maximum title length:

```typescript
confirmationTitle: z.string().max(100),
```

---

#### FIND-L-003: Redis Cache Key for Trip Detail Uses Raw `tripId` Without `userId` Scope

**Location**: SPEC-001, Section 9.2, Cache Keys

**Description**: The cache key `trips:detail:{tripId}` stores trip detail data keyed only by the trip's CUID2 identifier, without scoping to `userId`. This is architecturally correct because the authorization check happens in `TripService.getTripById()` at the Prisma query level — a user who does not own the trip will receive a `NotFoundError` before any cache lookup. However, the current design means that trip detail data for a given trip is shared in the cache across any code path that requests that tripId.

If a future code path ever reads from the cache before performing an auth check (e.g., a public sharing feature that partially reuses this cache key), the isolation guarantee would be broken. This is not a current vulnerability but a design fragility that should be documented.

**Recommended Fix (low priority)**: Document in `src/server/cache/keys.ts` that `tripDetail` cache entries must only ever be read after an ownership check has been performed. Alternatively, scope the key to `trips:detail:{userId}:{tripId}` to make the isolation explicit in the cache layer. Evaluate when the shared trip feature (visibility: PUBLIC) is designed.

---

## SPEC-001 Security Checklist

### Authorization Model

- [x] BOLA prevention: ownership check pattern verified in all Server Actions — `userId` from session is passed to `TripService` on every call; Section 7.1 defines the correct pattern explicitly
- [x] No horizontal privilege escalation possible — `TripService.getTripById(userId, tripId)` returns `NotFoundError` when userId does not match (no information leakage via ForbiddenError timing difference)
- [x] Auth check is first operation in every Server Action — `const session = await auth()` is the first statement in `createTrip`; all other Server Actions must follow the same pattern (verified by description; full implementation bodies for `updateTrip`, `archiveTrip`, `deleteTrip` are not shown but are required to match)
- [x] Session `userId` is used — not input `userId` — confirmed at Section 7.3; `userId` is explicitly listed in the mass assignment prevention table

### Input Validation

- [x] Zod schemas present for all Server Actions — `TripCreateSchema`, `TripUpdateSchema`, `TripArchiveSchema`, `TripDeleteSchema` all defined
- [x] No `.passthrough()` used — schemas use default `.strip()` behavior; Section 7.2 and 7.3 confirm this explicitly
- [x] Field allowlist (no mass assignment) verified — Section 7.3 explicitly lists protected fields and shows explicit Prisma field mapping
- [x] String lengths constrained — all string fields have `.max()` constraints in the Zod schema
- [x] Date range validation present — `.refine()` on `endDate >= startDate` in both Create and Update schemas; `startDate` not-in-past enforced on create

### Data Model Security

- [x] No sensitive fields exposed to client unnecessarily — `TripCardData` and `TripDetailData` types are specified as explicit subsets of the Trip model; Section 11.4 Pitfall #6 reinforces this requirement
- [x] Soft delete enforced (`deletedAt` never bypassed) — Prisma middleware specified in Section 3.2; FIND-M-002 above identifies the deprecated API risk
- [x] CUID2 used for IDs (not predictable integers) — confirmed in schema `@id @default(cuid())` and Section 3.1 design notes
- [x] No PII stored in analytics events — verified across all seven events in DATA-TRACK-001

### Server Actions Security

- [x] `"use server"` scope is correct — directive present in the implementation sample
- [x] `import "server-only"` is present — confirmed in Section 4.1 code sample; enforces build-time server boundary
- [ ] Rate limiting reference present — **PARTIAL**: the spec references rate limiting in `docs/security.md` (SEC-007) but does not specify how rate limiting will be applied to Server Actions in MVP. Next.js Server Actions are not REST endpoints and do not have a URL that can be easily rate-limited at the middleware layer. The spec does not address this gap. See Conditional Requirement CR-001 below.
- [x] Error messages do not leak internals — generic messages used in all error paths; `AppError.message` is a safe application-defined string, not a Prisma/SQL error

---

## DATA-TRACK-001 Security Checklist

- [x] No PII in any event property verified — all seven events reviewed; `title`, `destination`, `description`, `confirmationTitle`, raw `tripId`, and raw `userId` are explicitly excluded from every event; GDPR compliance table in DATA-TRACK-001 documents this per-event
- [x] User ID hashing confirmed — `user_id_hash` = `hashUserId(userId)` using `SHA-256(ANALYTICS_SALT + ":" + userId)`; present in `BaseEvent` inherited by all events
- [x] Trip entity ID hashing confirmed — `trip_id_hash` = `hashEntityId("trip", tripId)` using `ANALYTICS_ENTITY_SALT`; separate salt from user salt prevents cross-correlation
- [x] Server-side only dispatch confirmed — all events dispatched from `TripService` layer or Server Components; `import "server-only"` on `src/lib/analytics/events/trip-events.ts`; no client-side dispatch paths
- [ ] Consent gate confirmed — **PARTIAL**: DATA-TRACK-001 documents that `hasAnalyticsConsent()` is checked inside `track()`, and OQ-DATA-004 explicitly acknowledges that this must be confirmed before implementation. The `track()` code sample in `docs/data-architecture.md` (lines 479-514) does NOT include a `hasAnalyticsConsent()` check in the implementation body. This is a gap between specification and reference implementation. See FIND-CONSENT below and Conditional Requirement CR-002.

#### FIND-CONSENT: `track()` Reference Implementation Missing Consent Gate

**Location**: `docs/data-architecture.md`, `src/server/analytics/track.ts` implementation

**Description**: The `track()` function shown in `data-architecture.md` does not include a call to `hasAnalyticsConsent()`. DATA-TRACK-001 correctly states that the consent check is inside `track()`, but the reference implementation does not show it. Developers implementing the `track()` function from `data-architecture.md` would produce a tracking pipeline that fires events without consent verification.

**Required Fix**: The `track()` implementation in `data-architecture.md` must be updated to include the consent check as its first guard:

```typescript
export async function track(options: TrackOptions): Promise<void> {
  // Consent gate — must be first check before any processing
  if (!hasAnalyticsConsent()) {
    return; // Silently discard — user has not consented to analytics
  }

  const { userId, anonymousId, eventName, properties = {}, context } = options;
  // ... rest of implementation
}
```

This is classified as a condition for clearance, not a blocker for the spec itself (it is in a different document), but it must be resolved before any analytics instrumentation is written.

---

## GDPR / LGPD Compliance

- [x] Data minimization respected in spec — Trip model collects only fields necessary for itinerary planning; `description` and `coverEmoji` are optional; no passport, document, or payment fields in scope
- [x] Retention policy defined — `docs/data-architecture.md` defines retention per data type: user data (account lifetime + 30 days), analytics events (1 year in PostHog), sessions (30 days Redis TTL), logs (30-90 days)
- [x] Right to erasure pathway exists — `onDelete: Cascade` on the User model in SPEC-001 schema ensures all trips cascade-delete with the user; `ErasureService` in `data-architecture.md` handles PostHog deletion via `analytics.deleteUser(userIdHash)` and hard PostgreSQL delete
- [x] No travel data in logs — SPEC-001 Section 7 does not include any logging statements with PII; error messages are generic; Section 8 confirms error messages do not include field values
- [x] Trip `visibility` defaults to `PRIVATE` — confirmed in Prisma schema (`@default(PRIVATE)`) and Section 3.1 design notes
- [x] `confirmationTitle` (trip title text) explicitly excluded from `trip_deleted` event — DATA-TRACK-001 documents this explicitly in the GDPR compliance table and forbidden fields list
- [x] Two separate salts (`ANALYTICS_SALT`, `ANALYTICS_ENTITY_SALT`) prevent cross-correlation between user identity events and entity-specific events — confirmed in data-architecture.md hashing strategy
- [x] Analytics erasure pathway: PostHog `deleteUser(userIdHash)` removes all events linked to the user hash within the 30-day GDPR deadline — confirmed in `ErasureService` and DATA-TRACK-001 GDPR erasure section

---

## Security Requirements for Developers

The following requirements are mandatory before any code is merged to `main`. They supplement — but do not replace — the checklist in `docs/security.md`.

### SR-001: Correct `redirect()` Pattern in All Server Actions

Every Server Action that calls `redirect()` after a successful mutation must structure the code so that `redirect()` is called **outside** any `try/catch` block. The pattern in SPEC-001 Section 11.4 is the normative reference. The incorrect pattern in Section 4.1 must not be reproduced in implementation. This applies to `createTrip`, `updateTrip`, and any future Server Actions.

**Verification**: Code reviewer must confirm that no `redirect()` call appears inside a `try` or `catch` block in any Server Action.

### SR-002: Prisma Soft-Delete Middleware Must Use Confirmed Prisma 7 API

Before implementing the global soft-delete middleware, the developer must confirm the correct Prisma 7 `db.$extends` pattern with the data team or Prisma documentation, and the tech-lead must approve the implementation before merge. The deprecated `db.$use` pattern in Section 3.2 of SPEC-001 must not be used.

**Verification**: Tech-lead reviews the `src/server/db/client.ts` implementation and confirms the extension API is correct for the project's Prisma version.

### SR-003: Full Server Action Bodies for `updateTrip`, `archiveTrip`, `deleteTrip`

SPEC-001 shows the full implementation body only for `createTrip`. The implementations for `updateTrip`, `archiveTrip`, and `deleteTrip` must each:

1. Call `await auth()` as the absolute first statement
2. Parse input with the corresponding Zod schema before any service call
3. Pass `session.user.id` (never input userId) to the TripService method
4. Place `redirect()` outside any `try/catch` block (if used)
5. Return the standardized error shape on failure

**Verification**: Security reviewer checks all four Server Action implementations at PR review time.

### SR-004: `track()` Function Must Include Consent Gate as First Check

The `track()` function implementation must call `hasAnalyticsConsent()` as its first operation and return early (silently) if consent has not been granted. This must be implemented before any analytics events are instrumented. The reference implementation in `data-architecture.md` must be updated to reflect this requirement.

**Verification**: Code reviewer confirms `hasAnalyticsConsent()` call is present and is first in `track()`; integration test confirms events are not dispatched when consent cookie is absent.

### SR-005: Explicit `select` on All Prisma Queries in TripService

All `db.trip.findFirst`, `db.trip.findMany`, `db.trip.findUnique`, and `db.trip.create` calls in `TripService` must include an explicit `select` clause. No call may return the full Prisma model object. This implements SEC-002 (PII minimization in API responses).

**Verification**: Code reviewer checks every Prisma call in `src/server/services/trip.service.ts` for the presence of a `select` clause.

### SR-006: `coverEmoji` Input Must Be Restricted at Schema Level

The Zod schema for `coverEmoji` must add either a Unicode emoji regex or an explicit enum of accepted values before merge. The current `z.string().max(10)` is insufficient. See FIND-L-001 above.

### SR-007: `confirmationTitle` Must Have Length Constraint

Add `.max(100)` to `confirmationTitle` in `TripDeleteSchema`. See FIND-L-002 above.

### SR-008: Verify ANALYTICS_ENTITY_SALT Is Different From ANALYTICS_SALT

Both environment variables are required. Before first deployment, the devops-engineer must verify that the two salts are different values. The env validation in `src/lib/env.ts` does not enforce this constraint programmatically (it cannot), so it must be a documented deployment checklist item.

---

## Conditional Clearance

The following conditions must be verified during PR review. Implementation may proceed now, but no PR that implements any of these areas may be merged until the condition is satisfied.

### CR-001: Rate Limiting Coverage for Server Actions

**Condition**: The spec references SEC-007 (rate limiting) but does not specify the mechanism for applying rate limits to Server Actions. Unlike REST Route Handlers, Server Actions are invoked via POST to `/_next/action` with hashed action IDs. The Next.js middleware can intercept these requests. Before the first trip mutation is deployed, the tech-lead and devops-engineer must agree on the rate limiting strategy for Server Actions and document it.

**Acceptable approaches**:
a) Apply rate limiting in Next.js `middleware.ts` for all `POST /_next/action` requests, scoped by `session.user.id` extracted from the session cookie
b) Apply rate limiting inside the TripService methods using a Redis sliding window counter
c) Apply rate limiting as a wrapper utility called inside each Server Action after auth

**Resolution**: The chosen approach must be documented in a new ADR or as an addition to the existing architecture documentation. This condition does not block initial development of the business logic but must be resolved before the feature is deployed to any user-accessible environment.

**Risk if unresolved**: SEC-007 (rate limit bypass) remains open. A user could flood the `createTrip` action to exhaust the `assertTripLimitNotReached()` check in race conditions or trigger excessive database writes.

### CR-002: Consent Gate Implementation Verified Before Analytics Instrumentation

**Condition**: OQ-DATA-004 must be resolved before any analytics event is instrumented. The `hasAnalyticsConsent()` function must be implemented and verified to return correct values in Server Components (via `cookies()` from `next/headers`). The consent banner UX must be implemented before any P0 event is added to production code.

**Responsible parties**: ux-designer (consent banner spec), dev-fullstack-1 (consent cookie implementation), security-specialist (approval of consent banner behavior).

### CR-003: Soft-Delete Middleware Confirmed Working Before Integration Tests

**Condition**: Integration tests in `tests/integration/trip.service.integration.test.ts` must include a test case specifically verifying that soft-deleted trips do not appear in `findMany` results. This test must pass against the actual Prisma 7 extension implementation — not against a mocked database. This test is the acceptance criterion for FIND-M-002.

**Test case required**:
```typescript
it("should not return soft-deleted trips in findMany", async () => {
  // Create a trip, soft-delete it, then query — must return zero results
});
```

### CR-004: Full Server Action Implementations Match the Security Pattern

**Condition**: The full implementation bodies for `updateTrip`, `archiveTrip`, and `deleteTrip` were not included in SPEC-001. The architect must add these implementations to SPEC-001 (or a supplementary spec note) before the feature is considered fully specified. Until then, SR-003 applies as a manual review requirement.

---

## Verdict

**CLEARED WITH CONDITIONS**

SPEC-001 and DATA-TRACK-001 reflect strong security design. The BOLA/IDOR mitigation pattern is correctly specified and enforced at the Prisma query layer. Mass assignment is prevented through explicit field mapping and Zod field allowlists without `.passthrough()`. Authentication is first in every documented Server Action. Soft delete is enforced. Analytics events contain no PII, use separate salts for user and entity identifiers, are dispatched server-side only, and include a documented consent gate.

Two medium findings (FIND-M-001, FIND-M-002) require corrections to spec code samples before developers begin implementation — specifically, the redirect/try-catch defect and the deprecated Prisma middleware API. These corrections do not require re-review but must be verified at the first PR review.

Four conditional requirements (CR-001 through CR-004) must be resolved as part of the implementation and PR review process. None of these block the start of development, but each is a prerequisite for merging code to main.

Development may begin on all areas not blocked by FIND-M-002. Implementation of the Prisma soft-delete middleware must wait for the Prisma 7 `db.$extends` implementation to be confirmed and documented.

---

## Appendix: Risk Register Status Update

The following risks from `docs/security.md` are addressed by SPEC-001 and DATA-TRACK-001:

| Risk ID | Risk | Status After This Review |
|---|---|---|
| SEC-001 | BOLA/IDOR | Mitigated by spec — pattern enforced at query layer with `userId` in all `where` clauses |
| SEC-002 | PII in logs/errors/responses | Mitigated by spec — explicit `select`, generic error messages, no PII logging; SR-005 required |
| SEC-005 | Mass assignment via Server Actions | Mitigated by spec — explicit Zod schemas, explicit Prisma field mapping, no spread |
| SEC-009 | Missing `deletedAt` filter | Partially mitigated — middleware specified but Prisma 7 API needs confirmation (FIND-M-002) |
| SEC-011 | XSS via user content | Mitigated — React auto-escaping covers all Trip fields; no `dangerouslySetInnerHTML` in scope |
| SEC-007 | Rate limit bypass | Open — CR-001 must resolve mechanism for Server Action rate limiting |
| SEC-012 | Direct DB access from route handlers | Mitigated — `import "server-only"` enforced; Prisma access via service layer only |

Risks not in scope for this feature (SEC-003, SEC-004, SEC-006, SEC-008, SEC-010, SEC-013 through SEC-020) remain open and are addressed by other specs.

---

*Security review conducted by: security-specialist*
*Next required review: PR review for each implementation PR (see SR-001 through SR-008)*
*Re-review required if: spec is changed significantly after this clearance, or if new external integrations are added*
