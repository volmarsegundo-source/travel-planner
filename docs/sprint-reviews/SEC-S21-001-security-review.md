# Security Review: Sprint 21

**Review ID**: SEC-S21-001
**Reviewer**: security-specialist
**Date**: 2026-03-10
**Status**: APPROVED WITH OBSERVATIONS

---

## Scope

Files reviewed for this security audit:

| File | Task |
|---|---|
| `src/server/services/transport.service.ts` | T-S21-005 |
| `src/server/services/accommodation.service.ts` | T-S21-005 |
| `src/server/actions/transport.actions.ts` | T-S21-005 |
| `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` | T-S21-007 |
| `src/lib/validations/trip.schema.ts` | T-S21-006 |
| `src/components/features/expedition/Phase4Wizard.tsx` | T-S21-005 |
| `src/components/features/expedition/Phase1Wizard.tsx` | Sprint 20 origin field |
| `src/lib/validations/expedition.schema.ts` | Sprint 20 origin field |
| `src/lib/validations/transport.schema.ts` | T-S21-005 |
| `src/lib/crypto.ts` | T-S21-005 (encryption primitives) |
| `src/lib/hash.ts` | Logger PII mitigation |
| `src/server/actions/expedition.actions.ts` | Origin validation server-side |

---

## 1. Transport Service (`transport.service.ts`)

### Findings

**PASS** - `import "server-only"` present (line 1).

**PASS** - BOLA check present in both `saveSegments` (line 20-23) and `getSegments` (line 65-68). Uses `findFirst` with `{ id: tripId, userId, deletedAt: null }` -- correctly filters by userId AND excludes soft-deleted records. Error message is generic ("Trip not found or unauthorized"), no existence leakage.

**PASS** - `bookingCode` is encrypted via `encrypt()` before storage (line 48): `bookingCodeEnc: seg.bookingCode ? encrypt(seg.bookingCode) : null`.

**PASS** - On read, `bookingCodeEnc` is explicitly set to `undefined` (line 78), preventing encrypted ciphertext from reaching the client. Decrypted value is exposed as `bookingCode` for authorized users only.

**PASS** - Max segments enforced server-side (line 26-29) via `MAX_TRANSPORT_SEGMENTS` constant.

**PASS** - Transaction used for delete-then-create (line 33), preventing partial state on failure.

**INFO** - No SQL injection risk; all queries go through Prisma parameterized queries.

### FIND-S21-001: Spread operator leaks DB fields to client
- **Severity**: LOW
- **File**: `src/server/services/transport.service.ts:75`
- **Description**: The `getSegments` method uses `...seg` spread, then overrides `bookingCodeEnc: undefined`. While this works, the spread copies ALL database fields (including `id`, `tripId`, `createdAt`, `updatedAt`) to the returned object. If new sensitive columns are added to the model in the future, they will be automatically exposed. A whitelist approach (explicitly picking fields) would be safer.
- **Impact**: Currently no sensitive data is leaked beyond what is expected. This is a defense-in-depth recommendation.
- **Recommendation**: Consider explicit field mapping instead of spread. Not blocking.

---

## 2. Accommodation Service (`accommodation.service.ts`)

### Findings

**PASS** - `import "server-only"` present (line 1).

**PASS** - BOLA check present in both `saveAccommodations` (line 20-23) and `getAccommodations` (line 63-66). Same secure pattern as transport service.

**PASS** - `bookingCode` encrypted before storage (line 45). `bookingCodeEnc` set to `undefined` on read (line 76).

**PASS** - Max accommodations enforced server-side (line 27-29).

**Same observation as FIND-S21-001** applies (spread operator on line 73).

---

## 3. Transport Actions (`transport.actions.ts`)

### Findings

**PASS** - `"use server"` directive present (line 1).

**PASS** - `import "server-only"` present (line 2).

**PASS** - Auth check is the FIRST statement in every action:
  - `saveTransportSegmentsAction` (line 24-25)
  - `getTransportSegmentsAction` (line 53-54)
  - `saveAccommodationsAction` (line 77-78)
  - `getAccommodationsAction` (line 105-106)
  - `saveLocalMobilityAction` (line 128-129)
  - `getLocalMobilityAction` (line 178-179)

**PASS** - Zod validation on all write actions:
  - `z.array(TransportSegmentSchema).safeParse(segments)` (line 27)
  - `z.array(AccommodationSchema).safeParse(accommodations)` (line 79)
  - `LocalMobilitySchema.safeParse(mobility)` (line 131)

**PASS** - No mass assignment: all data passes through Zod schemas that whitelist fields. `userId`, `id`, `tripId`, `createdAt`, `updatedAt` cannot be injected by user input.

**PASS** - Error logging uses `hashUserId()` (lines 44, 64, 95, 116, 169, 201), not raw userId. This addresses BUG-S7-001 pattern.

**PASS** - Error messages returned to client are generic strings, no stack traces or internal details leaked.

### FIND-S21-002: tripId parameter not validated before use
- **Severity**: LOW
- **File**: `src/server/actions/transport.actions.ts:20-23`
- **Description**: The `tripId` parameter in all 6 actions is accepted as a raw `string` without Zod validation (no format check, no max length). While the BOLA check in the service layer will reject invalid IDs (Prisma `findFirst` returns null for non-matching IDs), an attacker could pass extremely long strings or special characters that reach the database query before rejection.
- **Impact**: Prisma parameterizes all queries, so SQL injection is not possible. Risk is limited to potential increased DB query overhead with very long strings.
- **Recommendation**: Add `z.string().cuid()` or `z.string().max(30)` validation for `tripId` in each action. Not blocking.

---

## 4. Progress Bar Navigation (`DashboardPhaseProgressBar.tsx`)

### Findings

**PASS** - Clickable links are gated correctly (line 40): `const isClickable = tripId && (isCompleted || isCurrent)`. Only completed and current phases render as `<Link>`. Future/coming-soon phases render as `<div>` (line 108-118).

**PASS** - Coming-soon phases (phaseNumber >= 7) are explicitly non-clickable with reduced opacity (line 39, 57-58).

**PASS** - Link href uses template literal with `tripId` and `phaseNum` (line 97): `/expedition/${tripId}/phase-${phaseNum}`. The `phaseNum` comes from `PHASE_DEFINITIONS` (a static constant), not user input.

**PASS** - `tripId` is received as a prop from a server component (not from URL/user input on this component level). Authorization is enforced at the server action/page level, not here.

**PASS** - Proper ARIA attributes: `role="group"`, `aria-label` on segments.

**INFO** - Client-side `isClickable` is a UX guard only; the server-side phase engine must also enforce phase access. This is the correct layered approach (defense in depth).

---

## 5. Passenger Cap (`trip.schema.ts`)

### Findings

**PASS** - `MAX_TOTAL_PASSENGERS = 20` constant exported (line 71).

**PASS** - Individual type caps enforced: each of `adults`, `children.count`, `seniors`, `infants` has `.max(MAX_PASSENGERS_PER_TYPE)` (20).

**PASS** - Total cap refinement is correct (lines 112-120):
```typescript
data.adults + data.children.count + data.seniors + data.infants <= MAX_TOTAL_PASSENGERS
```

**PASS** - `MIN_ADULTS = 1` enforced (line 78) -- at least one adult required.

**PASS** - Children ages array length must match `children.count` (lines 105-110).

**PASS** - All numbers are `.int()` -- no fractional passengers.

### FIND-S21-003: Per-type max is same as total max
- **Severity**: INFO
- **File**: `src/lib/validations/trip.schema.ts:67-68`
- **Description**: `MAX_PASSENGERS_PER_TYPE` (20) equals `MAX_TOTAL_PASSENGERS` (20). This means the per-type cap is effectively redundant -- the total cap will always trigger first if someone sends 20 adults + 1 child. This is not a security issue but a potential business logic clarification opportunity.
- **Recommendation**: Consider whether per-type caps should be lower (e.g., 10 per type). Informational only.

---

## 6. Phase4Wizard (`Phase4Wizard.tsx`)

### Findings

**PASS** - Client component (`"use client"` line 1). No `import "server-only"` expected.

**PASS** - No `dangerouslySetInnerHTML` usage anywhere in the component. All user-provided data (`destination`, `tripType`, `startDate`) is rendered via JSX text interpolation, which React auto-escapes. No XSS vector.

**PASS** - `tripId` is used only in server action calls (`saveTransportSegmentsAction(tripId, ...)`, etc.) and in `router.push()` for client-side navigation. Both paths are safe: server actions have auth + BOLA checks; `router.push` is a client-side Next.js navigation (no open redirect risk).

**PASS** - Error messages are either translation keys or generic strings -- no server internals leaked to UI.

**PASS** - `destination` and `tripType` are props from a server component; they originate from DB data that was already validated at write time.

**INFO** - `formatDeadlineFromDays` helper (line 522-537) wraps `new Date()` in try/catch. Safe against malformed date strings.

---

## 7. Phase1Wizard and Origin Field

### Findings

**PASS** - Origin field rendered with `<DestinationAutocomplete>` component (line 398-403), same component used for destination. This provides consistent input handling.

**PASS** - `origin` is trimmed before submission (line 168): `origin: origin.trim() || undefined`.

**PASS** - Server-side validation in `Phase1Schema` (expedition.schema.ts line 11): `origin: z.string().max(150).optional()`. Max length of 150 characters enforced server-side.

**PASS** - Client-side `maxLength` attributes on profile fields (phone: 20, country/city: 100, bio: 500) match their Zod schema counterparts.

**PASS** - `createExpeditionAction` validates all input through `Phase1Schema.safeParse(data)` (expedition.actions.ts line 32).

### FIND-S21-004: Origin field has no minimum length or content validation
- **Severity**: LOW
- **File**: `src/lib/validations/expedition.schema.ts:11`
- **Description**: The `origin` field schema is `z.string().max(150).optional()`. Unlike `destination` which has `.min(1)`, origin accepts any string including whitespace-only strings (e.g., `"   "`). While `.trim()` is applied client-side before submission, the Zod schema itself does not enforce `.trim()` server-side.
- **Impact**: A crafted request could store whitespace-only origin values in the database. This is a data quality issue rather than a security vulnerability.
- **Recommendation**: Add `.trim()` to the Zod schema: `z.string().trim().max(150).optional()`.

---

## 8. Encryption Module (`crypto.ts`)

### Findings

**PASS** - `import "server-only"` (line 1) -- cannot be imported in client bundles.

**PASS** - AES-256-GCM with 96-bit IV and 128-bit auth tag. This is the NIST-recommended configuration.

**PASS** - Random IV per encryption (`randomBytes(IV_LENGTH)` line 30). No IV reuse.

**PASS** - Key validation checks length (64 hex = 32 bytes) and hex-only characters (lines 13-19).

**PASS** - Key is loaded from environment variable, never hardcoded.

---

## 9. Logging and PII

### Findings

**PASS** - All actions use `hashUserId(session.user.id)` for logging, not raw userId.

**PASS** - `hashUserId` uses SHA-256 truncated to 12 hex chars -- deterministic for correlation, non-reversible.

**PASS** - No booking codes, payment data, or other PII appear in log statements.

---

## Summary of Findings

| ID | Severity | File | Description | Action Required |
|---|---|---|---|---|
| FIND-S21-001 | LOW | transport.service.ts:75, accommodation.service.ts:73 | Spread operator on DB objects could leak future columns | Recommend whitelist approach |
| FIND-S21-002 | LOW | transport.actions.ts (all actions) | `tripId` not Zod-validated (format/length) | Recommend `z.string().cuid()` |
| FIND-S21-003 | INFO | trip.schema.ts:67-68 | Per-type max = total max (redundant) | Clarify business intent |
| FIND-S21-004 | LOW | expedition.schema.ts:11 | Origin field accepts whitespace-only strings server-side | Recommend `.trim()` in Zod |

---

## Checklist Summary

| Security Control | Transport Service | Accommodation Service | Actions | Progress Bar | Passengers | Phase4Wizard | Origin |
|---|---|---|---|---|---|---|---|
| `server-only` import | PASS | PASS | PASS | N/A (client) | N/A (shared) | N/A (client) | N/A |
| BOLA check | PASS | PASS | PASS (via service) | N/A | N/A | N/A | N/A |
| Auth first statement | N/A | N/A | PASS (all 6) | N/A | N/A | N/A | PASS |
| Zod validation | N/A | N/A | PASS (all writes) | N/A | PASS | N/A | PASS |
| Encryption at rest | PASS | PASS | N/A | N/A | N/A | N/A | N/A |
| No ciphertext to client | PASS | PASS | N/A | N/A | N/A | N/A | N/A |
| No mass assignment | PASS | PASS | PASS | N/A | N/A | N/A | PASS |
| No XSS vectors | N/A | N/A | N/A | PASS | N/A | PASS | PASS |
| PII in logs | N/A | N/A | PASS (hashed) | N/A | N/A | N/A | PASS |
| Soft-delete respected | PASS | PASS | PASS | N/A | N/A | N/A | N/A |

---

## Verdict

**APPROVED WITH OBSERVATIONS**

All critical security controls are correctly implemented:
- BOLA authorization on every data access path
- Booking codes encrypted with AES-256-GCM before storage, ciphertext never exposed to client
- Auth check as first statement in every server action
- Zod validation on all user inputs
- No XSS, injection, or mass assignment vectors identified
- PII properly hashed in logs

The 3 LOW findings and 1 INFO finding are non-blocking. They represent defense-in-depth improvements that should be addressed in a future sprint:
- FIND-S21-001 and FIND-S21-002 reduce attack surface area
- FIND-S21-004 improves data integrity

No CRITICAL or HIGH findings. No blocking issues.

> APPROVED WITH OBSERVATIONS -- cleared for release. Address FIND-S21-001, FIND-S21-002, and FIND-S21-004 in Sprint 22 backlog.
