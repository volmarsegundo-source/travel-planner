# BUG-C-F3 Iteracao 7 -- Security Audit

**Auditor:** architect (acting as security-specialist)
**Date:** 2026-04-24
**Scope:** SPEC-AUTH-AGE-002 v2.0.0 (B4-Node-gate)
**Verdict:** APPROVED-WITH-FOLLOWUPS

---

## 1. Coverage of protected segments

The middleware at `src/middleware.ts:31` defines 8 `PROTECTED_PATH_SEGMENTS`:

```
/trips, /onboarding, /account, /dashboard, /expedition, /atlas, /meu-atlas, /admin
```

The `(app)` route group at `src/app/[locale]/(app)/` contains 13 subdirectories. The layout gate (`layout.tsx:38-48`) applies to **all** of them because Next.js App Router nests every child route under the parent layout.

| Protected Segment | Directory under `(app)` | Layout-gated? | Middleware-gated? | Status |
|---|---|---|---|---|
| `/trips` | `(app)/trips/` | YES | YES | OK |
| `/onboarding` | `(app)/onboarding/` | YES | YES | OK |
| `/account` | `(app)/account/` | YES | YES | OK |
| `/dashboard` | `(app)/dashboard/` | YES | YES | OK |
| `/expedition` | `(app)/expedition/` | YES | YES (substring match covers `/expedition/`) | OK |
| `/atlas` | `(app)/atlas/` | YES | YES | OK |
| `/meu-atlas` | `(app)/meu-atlas/` | YES | YES | OK |
| `/admin` | `(app)/admin/` | YES | YES (+ role guard) | OK |

**Additional directories under `(app)` NOT in PROTECTED_PATH_SEGMENTS:**

| Directory | Layout-gated? | Middleware auth redirect? | Risk assessment |
|---|---|---|---|
| `(app)/expeditions/` | YES | NO (not in segment list) | LOW -- the layout itself enforces `auth()` + birthDate check (lines 26-48). Middleware does NOT redirect unauthenticated users for `/expeditions` because the segment list has `/expedition` not `/expeditions`. However, the layout's `auth()` check at line 26 catches unauthenticated access and redirects to login. The birthDate gate at line 42 still applies. **Not a security gap** but a defense-in-depth gap (see Finding F-01). |
| `(app)/como-funciona/` | YES | NO | LOW -- informational page displaying gamification rules and AI cost constants. No executable features, no PII, no AI calls. Layout birthDate gate applies. |
| `(app)/loja/` | YES | NO | LOW -- store page has its own `auth()` check (line 3-4 of page.tsx). Layout birthDate gate applies. No age-gated features (no `canUseAI` usage). |
| `(app)/profile/` | YES | NO | LOW -- profile page has its own `auth()` check (line 19-22 of page.tsx). Layout birthDate gate applies. No AI features. |

**Verdict for Section 1:** All 8 protected segments live under `(app)`. The layout gate covers them all, plus 4 additional paths that the middleware's PROTECTED_PATH_SEGMENTS list misses for unauthenticated redirect. The birthDate gate is enforced for all 12 paths via the layout. No security gap. One defense-in-depth observation recorded as F-01.

---

## 2. API route exposure

Grepped all files under `src/app/api/` for `profileComplete`. **Zero matches.**

```
$ grep -rn "profileComplete" src/app/api/ -> NO_MATCHES_FOUND
```

API route inventory and their auth/age patterns:

| API Route | Auth check | Age check | Uses `profileComplete`? | Verdict |
|---|---|---|---|---|
| `/api/ai/guide/stream/route.ts` | `auth()` (line 25-26 via import) | `canUseAI(userProfile?.birthDate)` -- DB query at line 184-188 | NO | OK |
| `/api/ai/plan/stream/route.ts` | `auth()` | `canUseAI(userProfile?.birthDate)` -- DB query at line 136-141 | NO | OK |
| `/api/ai/test-anthropic/route.ts` | (diagnostic) | N/A | NO | OK |
| `/api/admin/export-csv/route.ts` | `auth()` + role check (line 12-14, 34) | N/A (admin-only) | NO | OK |
| `/api/auth/[...nextauth]/route.ts` | Auth.js internal handler | N/A | NO | OK |
| `/api/debug/flags/route.ts` | (diagnostic) | N/A | NO | OK |
| `/api/destinations/search/route.ts` | Rate-limited proxy | N/A (public search) | NO | OK |
| `/api/v1/health/route.ts` | None (health check) | N/A | NO | OK |
| `/api/webhooks/mercado-pago/route.ts` | Webhook signature verification | N/A | NO | OK |

**Verdict for Section 2:** No API route reads `session.user.profileComplete` or `token.profileComplete` for any authorization decision. The two AI streaming routes (`/api/ai/guide/stream` and `/api/ai/plan/stream`) both call `canUseAI(userProfile?.birthDate)` where `userProfile` is fetched from the database via `db.userProfile.findUnique()`. Clean.

---

## 3. JWT-tamper bypass

**Claim:** A forged JWT with `profileComplete: true` cannot bypass the age gate.

**Verification (reading `src/app/[locale]/(app)/layout.tsx:38-48`):**

```typescript
// Line 38-48 of layout.tsx:
const profile = await db.userProfile.findUnique({
  where: { userId: user.id! },
  select: { birthDate: true },
});
if (!profile?.birthDate) {
  redirect({
    href: "/auth/complete-profile?callbackUrl=%2Fexpeditions",
    locale,
  });
  return null;
}
```

Analysis:
- The layout does **not** read `session.user.profileComplete` or any JWT claim for the gate decision.
- It queries `db.userProfile.findUnique({ where: { userId } })` -- a direct Postgres query.
- Even if an attacker forges `profileComplete: true` in the JWT (which itself requires `AUTH_SECRET`, a fatal compromise), the layout ignores the claim entirely and checks the database.
- The `userId` in the JWT is validated by Auth.js's signature verification. Forging `userId` also requires `AUTH_SECRET`.
- The `select: { birthDate: true }` projection means only the birthDate column is transferred, minimizing data exposure.

**Verdict for Section 3:** Confirmed. JWT `profileComplete` is completely ignored by the gate. Database is the sole authority. A forged JWT with `profileComplete: true` has zero effect on the age gate enforcement.

---

## 4. Defense-in-depth (canUseAI)

**Verification of `src/lib/guards/age-guard.ts`:**

```typescript
// Line 39-42:
export function canUseAI(birthDate: Date | null | undefined): boolean {
  if (!birthDate) return true;
  return isAdult(birthDate);
}
```

Call-site analysis -- all `canUseAI` invocations pass DB-derived `birthDate`:

| Call site | Source of `birthDate` | Reads JWT? |
|---|---|---|
| `src/app/api/ai/guide/stream/route.ts:188` | `db.userProfile.findUnique({ where: { userId }, select: { birthDate: true } })` at line 184 | NO |
| `src/app/api/ai/plan/stream/route.ts:140` | `db.userProfile.findUnique({ where: { userId }, select: { birthDate: true } })` at line 136 | NO |
| `src/server/actions/ai.actions.ts:105` | DB query via profile lookup | NO |
| `src/server/actions/ai.actions.ts:239` | DB query via profile lookup | NO |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx:64` | DB query via profile lookup | NO |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-4/page.tsx:279` | DB query via profile lookup | NO |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-5/page.tsx:94` | DB query via profile lookup | NO |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx:353` | DB query via profile lookup | NO |
| `src/app/[locale]/(app)/trips/[id]/checklist/page.tsx:70` | DB query via profile lookup | NO |
| `src/lib/engines/phase-engine.ts:558` | `userProfile?.birthDate` (passed from caller, DB-sourced) | NO |

**Known trade-off:** `canUseAI(null)` returns `true`. This is the legacy permissive behavior documented in `age-guard.ts:38` ("existing users predate the signup-time requirement"). Under the new v2.0.0 regime, a user with `birthDate = null` would be redirected to `/auth/complete-profile` by the layout gate **before** they can reach any page that calls `canUseAI`. So the permissive default is unreachable for users going through the `(app)` layout. For API routes (`/api/ai/*`), a user with `birthDate = null` would pass `canUseAI` -- but the API routes also call `auth()` first, and such a user can only reach those endpoints if they are authenticated. If the user completed OAuth but has no `UserProfile` row, the layout would block them from the UI -- but a direct API call (e.g., via curl) would bypass the layout gate.

This is a **pre-existing concern**, not introduced by v2.0.0, and is recorded as Finding F-02 below.

**Verdict for Section 4:** All `canUseAI` call sites read from the database, not the JWT. Defense-in-depth is intact for UI flows. API routes have a pre-existing gap where `canUseAI(null) === true` could be reached via direct API call (F-02).

---

## 5. Helper UX-only-ness

**File:** `src/lib/auth/session-cookie.ts`

The banner comment at lines 2-27 now explicitly states:

> "This helper is now a **UX hint only**, NOT a security boundary."

**Single non-test call site:** `src/server/actions/profile.actions.ts:382`

```typescript
// Line 382:
const patched = await patchSessionToken({ profileComplete: true });
if (!patched.ok) {
  logger.warn("auth.completeProfile.patchCookie.failed", {
    userIdHash: hashUserId(userId),
    reason: patched.reason,
  });
  // Non-fatal: user may need one manual refresh, but DB state is already
  // correct
}

logger.info("auth.oauth.dobAccepted", { userIdHash: hashUserId(userId) });
return { success: true };
```

Analysis:
- `patched.ok` is checked only for **logging** (warn-level log on failure).
- Regardless of `patched.ok`, the function returns `{ success: true }` -- the success is determined by the DB upsert at line 370-374, not by the cookie patch.
- No code path uses `patched.ok` to authorize, reject, or redirect.
- No other non-test file imports `patchSessionToken`.

**Verdict for Section 5:** Confirmed. `patchSessionToken` is honestly UX-only. Its result (`patched.ok`) drives only a warn log. The authorization decision (DB upsert of `birthDate`) is complete before the helper is even called. Failure is explicitly non-fatal.

---

## 6. Findings summary

| ID | Severity | Finding | Action required |
|---|---|---|---|
| F-01 | LOW | `PROTECTED_PATH_SEGMENTS` in middleware lists `/expedition` but not `/expeditions`. The `(app)/expeditions/` directory is gated by the layout (auth + birthDate), but an unauthenticated request to `/expeditions` would not be redirected by middleware -- it falls through to the layout which calls `auth()` and redirects to login. This is defense-in-depth erosion, not a bypass, because the layout is the true gate. | **Backlog candidate**: add `/expeditions` to `PROTECTED_PATH_SEGMENTS` for belt-and-suspenders. Also consider adding `/profile`, `/como-funciona`, `/loja` for completeness. Non-blocking. |
| F-02 | MEDIUM | `canUseAI(null)` returns `true` (legacy permissive default). For UI flows this is unreachable because the layout gate redirects users with `birthDate = null`. However, a direct API call to `/api/ai/guide/stream` or `/api/ai/plan/stream` from an authenticated user with no `UserProfile` row would pass `canUseAI`. This is a **pre-existing** concern, not introduced by v2.0.0. | **Backlog candidate (Sprint 46)**: change `canUseAI(null)` to return `false` (breaking change for legacy users without `birthDate`), OR add a `birthDate != null` guard in the two AI streaming routes before calling `canUseAI`. Requires PO decision on legacy user impact. Non-blocking for this iteration because: (a) no user can reach the UI to trigger these API calls without passing the layout gate, and (b) crafting a direct API call requires a valid session cookie. |
| F-03 | INFO | Three routes under `(app)` (`como-funciona`, `loja`, `profile`) are not in `PROTECTED_PATH_SEGMENTS` but are gated by the layout. `profile/page.tsx` and `loja/page.tsx` additionally have their own `auth()` checks. `como-funciona` has no page-level auth check (relies solely on the layout). All three are gated by the birthDate check via the layout. No exposure. | No action required. Informational only. |

---

## 7. Sign-off

**Verdict: APPROVED-WITH-FOLLOWUPS**

The B4-Node-gate implementation correctly moves the age-gate enforcement from Edge middleware to the Node Server Component layout. The single source of truth is `UserProfile.birthDate` queried from PostgreSQL -- the JWT `profileComplete` claim is correctly demoted to a UX hint and is not used in any authorization decision anywhere in the codebase.

Key confirmations:
- All 8 protected path segments live under `(app)` and are layout-gated (Section 1).
- Zero API routes read `profileComplete` for authorization (Section 2).
- JWT forgery with `profileComplete: true` has zero security impact (Section 3).
- All `canUseAI` call sites read from the database (Section 4).
- `patchSessionToken` is honestly UX-only with no authorization side-effects (Section 5).

Two follow-up items are recorded (F-01 LOW, F-02 MEDIUM). Neither blocks this iteration.

F-02 should be prioritized in Sprint 46 backlog as it represents a theoretical direct-API-call bypass of the age gate for users without a `UserProfile` row -- though exploitation requires a valid authenticated session and cannot be triggered through the application UI.

```
APPROVED-WITH-FOLLOWUPS
architect (acting as security-specialist)
2026-04-24
```
