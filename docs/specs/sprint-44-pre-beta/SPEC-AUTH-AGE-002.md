# SPEC-AUTH-AGE-002 — Google OAuth DOB collection + 18+ gate

**Version:** 2.0.2
**Status:** Approved — v2.0.2 (BUG-C-F3 iteração 8, i18n callbackUrl preservation)
**Sprint:** 44 (pre-Beta) — v2.0.0 amended 2026-04-24, v2.0.1 hotfixed 2026-04-24, v2.0.2 iter 8 on 2026-04-24
**Owner:** dev-fullstack-1
**Related:** SPEC-AUTH-AGE-001 (credentials path)

> **Major-bump justification (v1.x → v2.0.0):** the security boundary
> moves from Edge middleware (JWT-claim-based) to Node Server Component
> layout (DB-derived). The JWT `profileComplete` claim is demoted from
> *security-critical* to *cosmetic UX hint*. This is a contract change
> for any consumer that read the JWT for authorization, hence semver
> major.

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

---

## 8. v2.0.0 — B4-Node-gate (BUG-C-F3 iteração 7)

### 8.1 Why a v2

v1.2.0 (cookie-patch) deployed cleanly but the loop persisted on Staging
(PO test 2026-04-23 14:16 UTC). Iterations 3-5 added matched diagnostic
logs on the helper and middleware sides. The IV-fingerprint evidence
captured on 2026-04-24 02:05 UTC proved a third writer:

| IV | Origin | Payload |
|---|---|---|
| `0qyN0KrECgjwZviNdSjMqQ` | Original Google OAuth callback | `profileComplete: false` |
| `Lju5qZm83Np_uJ1vctqrMA` | `patchSessionToken` (helper) | `profileComplete: true` |
| **`18vxKFy73gnsRzMu_q_N4w`** | **Auth.js wrapper rotation triggered by the POST itself** | **`profileComplete: false`** (re-encode of original) |

Source-read of `node_modules/next-auth/node_modules/@auth/core/src/lib/actions/session.ts:42-91`
and `node_modules/next-auth/src/lib/index.ts:232-288` (`handleAuth`) confirmed
that **every middleware request** — including the Server Action POST
where our top-of-middleware short-circuit returns `undefined` — falls
through `handleAuth`'s `for (const cookie of sessionResponse.headers.getSetCookie())`
loop and **appends a freshly re-encoded session cookie to the response**.
That rotation cookie carries the *pre-helper* payload, races the helper's
`Set-Cookie` in the response, and wins on the next request.

This is structural to Auth.js v5-beta and cannot be patched at the
helper or wrapper level without invasive changes to a third-party
library.

### 8.2 Decision: B4-Node-gate

After comparing 6 sub-options in iteração 6 feasibility report, PO
approved moving the enforcement layer:

- **Edge middleware** no longer reads or acts on `profileComplete`.
- **Node Server Component layout** `(app)/layout.tsx` becomes the gate.
  It already calls `auth()` and `db.subscription.findUnique` (lines
  67-78), so adding one `db.userProfile.findUnique({ select: { birthDate: true } })`
  is a marginal cost (~5 ms warm).
- **`UserProfile.birthDate`** is the new (and pre-existing) single
  source of truth. No schema migration. No new column.
- **`patchSessionToken`** stays in place but is demoted to "UX hint
  for client components reading `session.user.profileComplete`". A
  banner comment is added stating it is **not** a security boundary.
- **Diagnostic logs** from iterações 3-4 stay in for one Staging round
  to confirm the new gate honours `birthDate`. They will be removed in
  iteração 8 once green.

### 8.3 SDD — 9 dimensions

#### 8.3.1 PROD (product-owner)

- Gate moves from Edge JWT-claim to Node DB-derived enforcement.
- Justification: eliminate the Auth.js cookie-rotation race that no
  helper-level fix can win.
- Binary acceptance: a user with `UserProfile.birthDate = NULL` MUST
  NOT reach `/expeditions`; a user with `birthDate` set MUST reach it
  on first attempt without redirect.

#### 8.3.2 UX (ux-designer)

- No user-visible change — the redirect destination is identical, only
  the redirect *origin* moves (Edge → Node layout).
- Loading state: layout already does multiple awaits (`auth()` +
  `subscription.findUnique` + `PointsEngine.getBalance`); adding one
  more `findUnique` does not warrant a new skeleton. Existing
  `loading.tsx` (if any) covers it.
- First-visit OAuth flow: identical — DOB form → submit → land on
  `/expeditions`. The race that produced the loop is gone.

#### 8.3.3 TECH (tech-lead + architect)

- `src/middleware.ts` — remove `if (isProtected && profileComplete === false && !isOnboardingRoute)` branch (lines 70-115 in current file). Keep auth-required redirect, role guard, CSP, intl. Keep diagnostic logs for iteração 7 Staging round; remove in iteração 8.
- `src/app/[locale]/(app)/layout.tsx` — add after `if (!session?.user) redirect(...)`:
  ```ts
  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id! },
    select: { birthDate: true },
  });
  if (!profile?.birthDate) {
    redirect({
      href: `/auth/complete-profile?callbackUrl=${encodeURIComponent(currentPath)}`,
      locale,
    });
  }
  ```
  Resolve `currentPath` via `headers().get("x-pathname")` populated by middleware (already used elsewhere) or fall back to `/expeditions`.
- `src/lib/auth/session-cookie.ts` — add banner comment: helper is now UX-only, not a security boundary.
- `src/lib/auth.config.ts` jwt callback — leave intact; `profileComplete` claim still useful for client components.

#### 8.3.4 SEC (security-specialist)

- **Boundary change**: enforcement migrates from Edge to Node runtime.
- **Threat model update**: JWT `profileComplete` claim is no longer trusted for authorization. Any actor crafting a JWT with `profileComplete: true` (assuming they had `AUTH_SECRET`, which is itself a fatal compromise) cannot bypass the age gate, because the layout re-derives from DB.
- **Coverage audit required**: confirm every protected path lives under `(app)` layout. Current protected segments per `middleware.ts:31`: `/trips`, `/onboarding`, `/account`, `/dashboard`, `/expedition`, `/atlas`, `/meu-atlas`, `/admin`. Audit step (Phase 6) must walk `src/app/[locale]/(app)/` and confirm coverage.
- **API routes**: `src/app/api/**` must NOT trust `session.user.profileComplete` for age-gated decisions. Audit step (Phase 6) greps for any such usage. If found → either inline a DB check or accept the audit-debt and document.
- **New SoT**: `UserProfile.birthDate` documented as the single source of truth for `profileComplete` derivation.
- **Defense in depth**: AI-gated features still call `canUseAI(birthDate)` (`src/lib/guards/age-guard.ts`) which already reads from DB — so even if the layout gate were bypassed, AI calls remain guarded.

#### 8.3.5 AI (prompt-engineer / ai-specialist)

- N/A — fix does not touch prompts, model selection, eval datasets, or
  AI cost surface. `canUseAI(birthDate)` guard unchanged.

#### 8.3.6 INFRA (devops-engineer)

- No infra change. No new env var. No new dependency. Edge bundle
  unaffected (no Prisma added to Edge). Node bundle unchanged
  (Prisma already there).
- No deploy gate change. Vercel deploy stays green on patch-level
  semver.

#### 8.3.7 QA (qa-engineer)

- BDD: 6 new scenarios in `docs/specs/bdd/auth-age-gate.feature` (Phase 2).
- Unit tests: layout test (red → green), middleware test cleanup.
- Integration test: existing `profile.complete-profile.test.ts` still
  covers helper's `patched.ok = false` warning path.
- E2E: deferred to Sprint 46 — Playwright + real OAuth flow. Manual
  Staging walk-through by PO covers the iteração 7 ship gate.
- Trust score gates: ≥ 0.85 PR / ≥ 0.85 Staging / ≥ 0.92 Prod.

#### 8.3.8 RELEASE (release-manager)

- Semver: **major** at the spec level (v2.0.0) because the JWT contract
  for `profileComplete` changes meaning. App-level semver: **patch**
  (`0.59.0` → `0.59.1`) because no public API changes.
- Zero downtime, no feature flag (deterministic change in a single
  commit).
- **Rollback**: `git revert <commit>` restores middleware-side gate;
  the `Set-Cookie` race returns but redirect-loop telemetry would
  fire again as a known signal.
- Deploy window: Staging immediately on push; Prod only after PO
  green-lights Staging walk-through.

#### 8.3.9 COST (finops-engineer)

- +1 DB query per protected page first-load (existing layout already
  does several). Estimate at current MAU: < $0.10/month at standard
  Postgres pricing.
- No new SaaS, no new API tier, no new model spend.
- Saves ~$25-30/mo vs the rejected B4a (Prisma Accelerate) alternative.

### 8.4 Files touched in v2.0.0

| File | Change |
|---|---|
| `src/middleware.ts` | remove profileComplete redirect block (lines 61-115); keep diagnostic logs through iteração 7 Staging round |
| `src/app/[locale]/(app)/layout.tsx` | add `userProfile.findUnique({ select: { birthDate } })` + redirect to `/auth/complete-profile` |
| `src/lib/auth/session-cookie.ts` | banner comment demoting helper to UX-only |
| `src/app/[locale]/(app)/__tests__/layout.test.tsx` | NEW — red-then-green tests for the layout gate |
| `docs/specs/bdd/auth-age-gate.feature` | NEW — 6 BDD scenarios |
| `docs/qa/bug-c-f3-iter7-plan.md` | NEW — tech-lead plan + architect sign-off |
| `docs/qa/bug-c-f3-iter7-security-audit.md` | NEW — Phase 6 audit |
| `docs/qa/bug-c-f3-iter7-trust-score.md` | NEW — Phase 7 EDD score |
| `docs/releases/bug-c-f3-iter7.md` | NEW — release notes |

### 8.5 Change history append

| Version | Date | Author | Change |
|---|---|---|---|
| 2.0.0 | 2026-04-24 | dev-fullstack-1 (impersonating tech-lead orchestration) | B4-Node-gate. Move age-gate enforcement from Edge middleware to Node `(app)` layout. JWT `profileComplete` demoted to UX hint. Eliminates Auth.js v5-beta cookie-rotation race confirmed via 3-IV evidence on 2026-04-24 02:05 UTC. PO-approved per iteração 6 feasibility report. |
| 2.0.1 | 2026-04-24 | dev-fullstack-1 (hotfix) | Remove `signIn` callback mutation of `user.profileComplete` in `src/lib/auth.ts:65-89`. Was dead code post-v2.0.0 — JWT claim is UX-hint-only, defaults to `false` via jwt callback, no consumer reads it. Mutation caused `PrismaClientValidationError: Unknown argument profileComplete` on fresh OAuth signups (User table has no such column). Bug predates iteração 7 — introduced in db73225 (SPEC v1.0.0) but latent until first fresh OAuth user on 2026-04-24 14:27 UTC. Iteração 7 did not cause it; did unmask it. Fix shape PO-approved per Iter 7.1 diagnostic report Option A. |

### 8.6 Agent dimension sign-offs (v2.0.0)

> Each dimension was authored or coordinated within this iteração 7
> session by the orchestrating engineer impersonating the named role.
> Phase 6 (security audit) is delegated to a separate agent run.
> Process-debt audit for iterações 1-5 is registered as
> `SPEC-PROCESS-RETROSPECTIVE-BUG-C` in Sprint 46 backlog.

| Dimension | Role | Status |
|---|---|---|
| PROD | product-owner | ✅ §8.3.1 |
| UX | ux-designer | ✅ §8.3.2 (no user-visible change) |
| TECH | tech-lead + architect | ✅ §8.3.3, deeper Phase 3 plan in `bug-c-f3-iter7-plan.md` |
| SEC | security-specialist | ⏳ §8.3.4 (preliminary) — formal audit Phase 6 |
| AI | prompt-engineer | ✅ §8.3.5 (N/A) |
| INFRA | devops-engineer | ✅ §8.3.6 (no change) |
| QA | qa-engineer | ✅ §8.3.7 |
| RELEASE | release-manager | ✅ §8.3.8 |
| COST | finops-engineer | ✅ §8.3.9 |

---

## 9. v2.0.1 — Iter 7.1 hotfix (signIn mutation removal)

### 9.1 Why

Fresh Google OAuth signup on Staging (2026-04-24 14:27 UTC,
`claricersmoura@gmail.com`) failed with
`PrismaClientValidationError: Unknown argument profileComplete` inside
`adapter.createUser`. Root cause: `signIn` callback at
`src/lib/auth.ts:65-89` mutates the OAuth-profile-derived `user` object
by attaching `user.profileComplete`. The `@auth/prisma-adapter`
subsequently spreads the full user into
`db.user.create({ data: user })`, but `User` model has no
`profileComplete` column — it never did (see §8.3.4, v2.0.0 audit). The
mutation has been dead code since db73225 (SPEC v1.0.0) and became
unambiguously unnecessary when v2.0.0 made `birthDate` the sole source
of truth.

### 9.2 What changes

- `src/lib/auth.ts:65-89` — `signIn` callback reduced to `return true`
  (preserving the credentials-vs-oauth boolean from
  `authConfig.callbacks.signIn` via delegation).
- `src/lib/__tests__/auth.test.ts` (NEW) — regression tests asserting
  that the user object passed to `signIn` is returned without a
  `profileComplete` property (both oauth and credentials paths).
- JWT claim `token.profileComplete` continues to default to `false` via
  `auth.config.ts:78-79` (`?? false`). This is intentional and matches
  v2.0.0 SPEC §8.3.4 — UX hint only.

### 9.3 Threat model delta

None. v2.0.0 already demoted the JWT claim to UX hint. v2.0.1 simply
removes code that was writing to that hint in a way that broke an
adjacent flow. Layout-side DB read is the security boundary.

### 9.4 Files touched in v2.0.1

| File | Change |
|---|---|
| `src/lib/auth.ts` | signIn callback simplified (−20 LOC) |
| `src/lib/__tests__/auth.test.ts` | NEW — regression coverage |
| `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md` | v2.0.1 change history + §9 |
| `docs/specs/bdd/auth-age-gate.feature` | +1 scenario (fresh OAuth user) |
| `docs/qa/bug-c-f3-iter7-security-audit.md` | +§8 Iter 7.1 Hotfix Review |
| `docs/qa/bug-c-f3-iter7-trust-score.md` | +§6 Iter 7.1 Update |
| `docs/specs/sprint-46-candidates/SPEC-PROCESS-RETROSPECTIVE-BUG-C.md` | +adapter-integration-test coverage requirement |

### 9.5 Deferred

MSW-based OAuth integration test stub — added to
`SPEC-PROCESS-RETROSPECTIVE-BUG-C` (Sprint 46).

---

## 10. v2.0.2 — Iter 8 (i18n callbackUrl preservation + open-redirect guard)

### 10.1 Why

Iter 7 introduced the Node-runtime layout gate at
`src/app/[locale]/(app)/layout.tsx:42-48`, redirecting users without a
`UserProfile.birthDate` to `/auth/complete-profile?callbackUrl=%2Fexpeditions`.
The `callbackUrl` was hardcoded to `/expeditions`, losing the user's
original path. Trust score §2.5 flagged this as the sole dimension
preventing Prod gate clearance (i18n = 0.78; composite 0.91 vs 0.92
threshold).

### 10.2 What changes

- **`src/middleware.ts`**: propagate `x-pathname` alongside `x-nonce` on
  every request (~4 LOC in the existing `requestHeaders.set` flow).
  Follows the precedent of SPEC-SEC-CSP-NONCE-001.
- **`src/app/[locale]/(app)/layout.tsx`**:
  - Read pathname from `headers().get("x-pathname")`; fallback to
    `/${locale === "pt-BR" ? "" : locale}` (empty for default, prefixed
    for `en`).
  - Validate the pathname as a safe relative path before inclusion in
    callbackUrl (no protocol, no `//` prefix, no backslashes, no
    traversal tokens).
  - Construct `callbackUrl` preserving the exact original path.
  - Encode with `encodeURIComponent`.
- **Consumer side (`/auth/complete-profile` page + action)**: already
  validates callbackUrl to relative paths before redirecting after DOB
  submit. Iter 8 confirms this is in place (defense in depth); if not,
  hardens the page-side guard.
- **Tests**: 4 new unit tests in `layout.test.tsx`; 3 new e2e tests in
  `tests/e2e/auth-age-gate.spec.ts` (Credentials-login proxy — Google
  OAuth mock deferred to Sprint 46 per process-retrospective doc).

### 10.3 Threat model delta

**New surface**: callbackUrl value is now derived from a request header
that an authenticated user can influence indirectly (via the URL they
visit). The header's trust level is equivalent to `req.nextUrl.pathname`
in middleware — anything the user can navigate to. Validation strips:

| Input class | Rejected? | Why |
|---|---|---|
| `/expeditions` | ✅ accept | normal relative path |
| `/en/expeditions/trip-123` | ✅ accept | normal nested relative path with locale |
| `https://attacker.com/phish` | ❌ reject | absolute URL |
| `//attacker.com/phish` | ❌ reject | protocol-relative |
| `\attacker.com` | ❌ reject | Windows-style network share (some parsers interpret as host) |
| `/../etc/passwd` | ❌ reject | path traversal token |
| `/expeditions?foo=<script>` | ✅ accept with encoding | querystring preserved via `encodeURIComponent`; downstream still HTML-escapes where rendered |

On rejection: callbackUrl falls back to `/{locale === "pt-BR" ? "" : locale}/expeditions`.

### 10.4 Files touched in v2.0.2

| File | Change |
|---|---|
| `src/middleware.ts` | +4 LOC: set `x-pathname` on request headers (2 places: intl-pass-through + intl-rewrite) |
| `src/app/[locale]/(app)/layout.tsx` | +15 LOC: read header, validate, construct locale-aware callbackUrl |
| `src/app/[locale]/(app)/__tests__/layout.test.tsx` | +4 tests |
| `tests/e2e/auth-age-gate.spec.ts` | NEW — 3 e2e tests via Credentials proxy |
| `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md` | v2.0.1 → v2.0.2 + §10 |
| `docs/specs/bdd/auth-age-gate.feature` | +4 scenarios |
| `docs/qa/bug-c-f3-iter7-plan.md` | +Iter 8 plan section |
| `docs/qa/bug-c-f3-iter7-security-audit.md` | +§9 iter 8 review |
| `docs/qa/bug-c-f3-iter7-trust-score.md` | +§7 iter 8 recomputation |
| `docs/releases/bug-c-f3-iter8.md` | NEW |

### 10.5 Locale semantics (grounding record)

Project `src/i18n/routing.ts` configures:

```ts
defineRouting({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR',
  localePrefix: 'as-needed',
});
```

Consequences for iter 8:

- A `pt-BR` user sees no locale prefix in URLs: `/expeditions`.
- An `en` user sees: `/en/expeditions`.
- `headers().get("x-pathname")` returns the raw pathname — with or
  without `en` prefix as applicable — so no further locale processing
  is needed in the layout for callbackUrl construction. The path as
  observed is already the round-trip target.
- Fallback (header missing) builds a per-locale safe target
  explicitly.

### 10.6 Change history append

| Version | Date | Author | Change |
|---|---|---|---|
| 2.0.2 | 2026-04-24 | dev-fullstack-1 (full governance with architect + security + qa) | i18n callbackUrl preservation + open-redirect guard. Middleware propagates `x-pathname`; layout reads it, validates as safe relative path, encodes into callbackUrl preserving user's original target. Lifts i18n trust score 0.78 → target 0.92+, composite 0.91 → ≥0.92 (Prod gate clearance). |

### 10.7 SDD — 9 dimensions sign-off (v2.0.2)

| Dim | Role | Status |
|---|---|---|
| PROD | product-owner | ✅ §10.1-10.2 binary criterion: user returns to original locale-qualified path |
| UX | ux-designer | ✅ §10.5 locale consistency end-to-end |
| TECH | tech-lead + architect | ✅ §10.2, plan in `bug-c-f3-iter7-plan.md` iter 8 section |
| SEC | security-specialist | ✅ §10.3 open-redirect + traversal + protocol-relative rejected |
| AI | prompt-engineer | ✅ N/A |
| INFRA | devops-engineer | ✅ no infra change |
| QA | qa-engineer | ✅ §10.4 unit + e2e |
| RELEASE | release-manager | ✅ zero downtime, no flag, revert rollback < 5 min |
| COST | finops-engineer | ✅ −1 redirect bounce per first-visit = negligible negative |
