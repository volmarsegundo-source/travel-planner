# SPEC-AUTH-AGE-002 — Google OAuth DOB collection + 18+ gate

**Version:** 1.2.0
**Status:** Approved (automatic follow-up to Wave 2)
**Sprint:** 44 (pre-Beta)
**Owner:** dev-fullstack-1
**Related:** SPEC-AUTH-AGE-001 (credentials path)

---

## 1. Problem (line-exact root cause)

SPEC-AUTH-AGE-001 closed the age-gate on the Credentials (email/password)
signup path by requiring `dateOfBirth` via `UserSignUpSchema`
(`src/lib/validations/user.schema.ts`) and persisting it to
`UserProfile.birthDate` (`prisma/schema.prisma:366`).

However, the **Google OAuth path remains unguarded**. Evidence:

- `src/lib/auth.ts:43-100` defines the top-level NextAuth config with
  `PrismaAdapter`. On first Google sign-in, the adapter calls
  `db.user.create({ data: { email, name, image, emailVerified } })` — there
  is no DOB field available and no `UserProfile` row is ever created
  (`src/server/services/auth.service.ts` is bypassed entirely).
- `src/lib/auth.config.ts:60-101` defines three callbacks (`signIn`, `jwt`,
  `session`). None of them enforce DOB. The `signIn` callback only checks
  `!!user?.id` for credentials (line 64-66) and returns `true` for everyone
  else (line 67).
- `src/middleware.ts:52-72` protects `/trips`, `/expeditions`, etc. behind a
  simple `!req.auth` redirect. An authenticated user without a DOB has full
  access to the product, including AI-gated features.
- `src/lib/guards/age-guard.ts:canUseAI` (after AGE-001) returns `true` when
  `birthDate == null` — consistent with "unknown age → don't block", but for
  Google users this means **every** Google-authenticated account is treated
  as adult by default.

Net effect: a minor can sign up via Google and use AI features — defeating
the legal/compliance intent of AGE-001.

## 2. Scope

**In scope:**
- Add a `dateOfBirth` guard to the authenticated app shell that redirects
  to `/auth/complete-profile` whenever the logged-in user has no
  `UserProfile.birthDate`.
- Ship the `/auth/complete-profile` route with a DOB-only form.
- Server action `completeProfileAction(formData)`:
  - Validates DOB via the same Zod schema logic used in AGE-001
    (reusing `isAdult` from `src/lib/guards/age-guard.ts`).
  - If **adult**: upsert `UserProfile { userId, birthDate }` and redirect
    to `/expeditions`.
  - If **minor**: log `auth.oauth.dobRejected` at info level (no PII),
    sign the user out, redirect to `/auth/age-rejected`.
- Rate-limit the complete-profile action (5 attempts / 15 min per userId).
- `/auth/age-rejected` static page with localized messaging.
- Middleware hook: when accessing any protected route, if the user's JWT
  has `profileComplete === false` and the path is not `/auth/complete-profile`
  or `/auth/age-rejected` or `/api/*`, redirect to complete-profile.
- JWT callback: expose `profileComplete` boolean on the token, refreshed by
  the session after a successful DOB submission (via `unstable_update`).
- BDD test coverage for the 5 scenarios.

**Out of scope:**
- Backfill of existing Google users (pre-Beta: assume the staging DB is
  wiped; production won't have pre-existing Google accounts).
- Collecting first/last name through the same form (not requested;
  Google already provides `name`).
- Apple OAuth DOB (mirrors Google — same mechanism; add as follow-up).

## 3. Acceptance criteria (BDD-style)

```gherkin
Scenario 1 — New Google user redirected to complete-profile
  Given a first-time Google OAuth sign-in with email "new.google@example.com"
  When NextAuth completes the OAuth callback
  Then a User row exists but no UserProfile.birthDate
  And accessing any /expeditions, /trips, /atlas route redirects the visitor
      to "/auth/complete-profile"

Scenario 2 — Adult completes profile successfully
  Given a Google-authenticated user without a birthDate
  When they submit "/auth/complete-profile" with "1990-05-15"
  Then the server computes age >= 18 via isAdult()
  And a UserProfile row is upserted with birthDate = 1990-05-15
  And the session is refreshed with profileComplete = true
  And the visitor is redirected to "/expeditions"

Scenario 3 — Minor is blocked and signed out
  Given a Google-authenticated user without a birthDate
  When they submit "/auth/complete-profile" with a DOB < 18 years ago
  Then NO UserProfile row is created
  And an info event "auth.oauth.dobRejected" is logged (no email, no DOB)
  And signOut() is invoked
  And the visitor is redirected to "/auth/age-rejected"

Scenario 4 — Dashboard bypass is blocked
  Given a Google-authenticated user without a birthDate
  When they navigate directly to "/expeditions/xyz"
  Then they are redirected to "/auth/complete-profile"
  And /expeditions/xyz is the encoded callbackUrl

Scenario 5 — User with existing DOB skips the gate
  Given a user whose UserProfile.birthDate = "1990-05-15"
  When they navigate to "/expeditions"
  Then no redirect occurs and the page renders normally
```

## 4. Technical plan

### 4.1 Reuse from AGE-001

- `isAdult(dateOfBirth, referenceDate?)` at `src/lib/guards/age-guard.ts` —
  already isomorphic (server-only marker removed in AGE-001).
- `UserProfile.birthDate` Prisma column at `prisma/schema.prisma:366`.
- Zod refinement pattern from `src/lib/validations/user.schema.ts`.
- i18n keys: `auth.errors.ageUnderage`, `auth.errors.dateInvalid`,
  `auth.dateOfBirth`.

### 4.2 JWT / session

In `src/lib/auth.config.ts`:

- `jwt` callback: when `user` is present (initial sign-in),
  `trigger === "update"` refresh, or on every request — persist a boolean
  `token.profileComplete`. For the initial OAuth sign-in, default to `false`;
  credentials path sets `true` (AGE-001 already enforces DOB at signup).
- `session` callback: surface `profileComplete` on `session.user`.

Because the Edge config must not touch Prisma, the initial value for Google
users comes from the **`signIn` callback in `src/lib/auth.ts`** (Node.js),
which queries `UserProfile.birthDate` once and stores the result on
`user.profileComplete` (propagated into the JWT by the existing `jwt`
callback).

### 4.3 Middleware gate (Edge-safe)

In `src/middleware.ts`, after the existing protected-path redirect (line 68):

```ts
const isOnboardingRoute =
  pathname.includes("/auth/complete-profile") ||
  pathname.includes("/auth/age-rejected");

const profileComplete =
  (req.auth as { user?: { profileComplete?: boolean } })?.user?.profileComplete;

if (req.auth && profileComplete === false && !isOnboardingRoute && isProtected) {
  const url = new URL("/auth/complete-profile", req.url);
  url.searchParams.set("callbackUrl", pathname);
  return Response.redirect(url);
}
```

Also add `/auth/complete-profile` and `/auth/age-rejected` to the
`PROTECTED_PATH_SEGMENTS` exclusions so they are reachable while
profile-incomplete.

### 4.4 Complete-profile page

`src/app/[locale]/auth/complete-profile/page.tsx` — server component that
renders `<CompleteProfileForm />`. Auth-guarded: redirects to
`/auth/login` if no session.

`src/components/features/auth/CompleteProfileForm.tsx` — client component
with one `dateOfBirth` input, `AtlasButton` submit, error rendering. On
success → `router.push("/expeditions")`. On minor → redirect to
`/auth/age-rejected`.

### 4.5 Server action

`src/server/actions/profile.actions.ts` adds:

```ts
export async function completeProfileAction(formData: FormData): Promise<ActionResult>;
```

- Rate limit: `complete-profile:${userId}`, 5 attempts / 900s.
- Validates `dateOfBirth` via a local schema reusing `isAdult`.
- On adult: `db.userProfile.upsert({ where: { userId }, create: ..., update: { birthDate } })`.
- On minor: `signOut()` from auth.ts, redirect param carries the minor flag.

### 4.6 Age-rejected page

`src/app/[locale]/auth/age-rejected/page.tsx` — static localized content.

### 4.7 i18n keys (new)

Both `messages/en.json` and `messages/pt-BR.json`:

```
"auth": {
  "completeProfile": {
    "title": "One last step",
    "subtitle": "We need your date of birth to comply with our age policy.",
    "submit": "Continue",
    "submitting": "Saving…"
  },
  "ageRejected": {
    "title": "We're sorry",
    "body": "Atlas is available only for people aged 18 or older.",
    "backToLanding": "Back to home"
  }
}
```

### 4.8 Files touched

| File | Change |
|---|---|
| `src/lib/auth.config.ts:60-101` | extend `jwt`/`session` with `profileComplete` |
| `src/lib/auth.ts:43-100` | `signIn` callback queries `UserProfile.birthDate` for OAuth users |
| `src/middleware.ts:52-85` | profile-complete gate |
| `src/app/[locale]/auth/complete-profile/page.tsx` | NEW |
| `src/app/[locale]/auth/age-rejected/page.tsx` | NEW |
| `src/components/features/auth/CompleteProfileForm.tsx` | NEW |
| `src/server/actions/profile.actions.ts` | add `completeProfileAction` |
| `src/lib/validations/user.schema.ts` | export `DateOfBirthSchema` for reuse |
| `messages/en.json`, `messages/pt-BR.json` | add `completeProfile`, `ageRejected` keys |
| `src/server/actions/__tests__/profile.complete-profile.test.ts` | NEW |
| `src/components/features/auth/__tests__/CompleteProfileForm.test.tsx` | NEW |

## 5. SDD dimensions (9)

- **PROD**: Closes the only remaining 18+ bypass before Beta launch.
- **UX**: One-step interstitial. Minor path is dead-end (signOut → age-rejected page). Adult path is invisible after first sign-in.
- **TECH**: Reuses `isAdult` + `UserProfile.birthDate` — zero migration. JWT-based flag keeps middleware Edge-safe.
- **SEC**: Does not leak email or DOB in logs. `signOut()` invalidates session. Rate-limited.
- **AI**: No direct AI cost. Downstream: AI-gated features already use `canUseAI(birthDate)` — DOB persisted here feeds that guard.
- **INFRA**: Zero new infra.
- **QA**: 5 BDD scenarios + form-level unit tests.
- **RELEASE**: Minor. Existing Google-signed-in staging users (if any) will be redirected once — acceptable.
- **COST**: Zero — middleware check is a cookie read; one DB write per new OAuth user.

## 6. Trust gates (elevated per PO)

- **PR**: ≥ 0.85
- **Staging**: ≥ 0.90
- **Prod**: ≥ 0.92
- Weights: Safety 40% + Accuracy 25% + UX 15% + i18n 10% + Performance 10%

## 7. Change History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-04-15 | dev-fullstack-1 | Initial approved spec — Google OAuth DOB gate |
| 1.1.0 | 2026-04-21 | dev-fullstack-1 | BUG-C-F1 fix (`9a45312`): added `updateSession({ user: { profileComplete: true } })` after DOB upsert to break middleware redirect loop; surfaced Prisma errors in logs. |
| 1.2.0 | 2026-04-22 | dev-fullstack-1 | BUG-C-F3 fix: replaced `updateSession` (unstable_update) with direct cookie patch via new `patchSessionToken` helper (`src/lib/auth/session-cookie.ts`). Root cause confirmed via observability patch (`7d42b60`): `unstable_update` silently no-ops inside Next.js 15 Server Actions because `sessionStore.value` cannot be reconstructed from the synthetic Request's cookie header. Upstream issues: nextauthjs/next-auth#11694, #13205, #13173, #7342. Upgrade to beta.31 does not fix (release notes: no source changes). Helper uses public `encode`/`decode` from `next-auth/jwt`. |

### Files touched in v1.2.0

| File | Change |
|---|---|
| `src/lib/auth/session-cookie.ts` | NEW — `patchSessionToken` helper using `next-auth/jwt` `encode`/`decode` |
| `src/lib/auth/__tests__/session-cookie.test.ts` | NEW — 5 unit tests (no-secret, no-cookie, decode-failed, happy path, payload merge) |
| `src/server/actions/profile.actions.ts` | remove `updateSession` + observability logs; call `patchSessionToken({ profileComplete: true })` with warn-but-don't-fail fallback |
| `src/server/actions/__tests__/profile.complete-profile.test.ts` | mock `patchSessionToken` instead of `updateSession`; drop `next/headers.cookies` stub; add failure-path assertion |
