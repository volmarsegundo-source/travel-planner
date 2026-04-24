# Release Notes — BUG-C-F3 Iteração 7 (B4-Node-gate)

**Date:** 2026-04-24
**App version bump:** patch (`0.59.0` → `0.59.1`)
**Spec:** SPEC-AUTH-AGE-002 v2.0.0 (major spec bump)
**Author:** release-manager (orchestration)

---

## TL;DR

Closes the BUG-C-F3 redirect loop by moving the OAuth age gate from
the Edge middleware to the Node `(app)` Server Component layout.
Single source of truth for the gate is now `UserProfile.birthDate`
in Postgres — the JWT `profileComplete` claim is demoted to a
client-side UX hint.

## Why this approach

Iterations 1-6 attempted six progressively more invasive fixes inside
the cookie-and-JWT layer. Iteração 5's IV-fingerprint evidence proved
that Auth.js v5-beta unconditionally re-encodes and writes the JWT
cookie on every middleware pass — including the Server Action POST
where our top-of-middleware short-circuit returns. That rotation
captures the *pre-helper* payload (`profileComplete: false`) and races
the helper's Set-Cookie in the response. No helper-level fix can win.

The fix relocates the enforcement to a runtime where the source of
truth (Postgres) is directly readable: the existing Node-runtime
`(app)` layout. One additional `findUnique({ select: { birthDate: true } })`
adds < 8 ms warm and eliminates the race by construction.

## What changed

| File | Change |
|---|---|
| `src/middleware.ts` | Removed the `profileComplete === false` redirect block + paired diagnostic logs. CSP, role guard, intl, auth-required redirect unchanged. |
| `src/app/[locale]/(app)/layout.tsx` | Added `db.userProfile.findUnique({ where: { userId }, select: { birthDate: true } })` after the existing session check; redirects to `/auth/complete-profile?callbackUrl=%2Fexpeditions` when birthDate is null/missing. |
| `src/lib/auth/session-cookie.ts` | Banner comment marking the helper as UX-only. Removed the `parseJweHeader`, `currentIv`/`newTokenIv` diagnostic logs, and the `sessionCookieNames` enumeration (all introduced as transient instrumentation in iterações 2-4). |
| `src/lib/auth/__tests__/session-cookie.test.ts` | Cleaned up `getAll`/logger mocks no longer needed. 5/5 tests still green. |
| `src/app/[locale]/(app)/__tests__/layout.test.tsx` | NEW — 4 tests covering the new gate (no-session, null birthDate, missing UserProfile row, present birthDate). |
| `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md` | Bumped to v2.0.0; added §8 with full evidence chain, 9-dimension SDD signoffs, files-touched table. |
| `docs/specs/bdd/auth-age-gate.feature` | NEW — 6 BDD scenarios. |
| `docs/qa/bug-c-f3-iter7-plan.md` | NEW — tech-lead plan + architect review. |
| `docs/qa/bug-c-f3-iter7-security-audit.md` | NEW — Phase 6 audit (architect-as-security). |
| `docs/qa/bug-c-f3-iter7-trust-score.md` | NEW — composite 0.90 (Staging GO, Prod HOLD). |
| `docs/releases/bug-c-f3-iter7.md` | NEW — this file. |

## Breaking change?

**No runtime breaking change.** The `Session` type still exposes
`session.user.profileComplete`. Client components that read it for UI
hints continue to work.

**Spec-level breaking change.** The contract for what
`session.user.profileComplete` *means* has changed: it is now a UX
hint, not an authorization claim. Any consumer (in this repo or
downstream) that read it for a security decision must migrate to
querying `UserProfile.birthDate` from the DB. Phase 6 security audit
confirms no in-repo consumer does this.

## Deploy plan

1. Push to `origin/master`.
2. Vercel auto-deploys to Staging.
3. PO walk-through (≈ 5 min):
   - Anonymous tab → Google OAuth → DOB form → submit → land on `/expeditions` without redirect loop.
   - Vercel logs filtered by `auth.middleware.redirectToCompleteProfile` should return **zero entries** (the event no longer exists).
   - Vercel logs filtered by `auth.oauth.dobAccepted` should appear once.
4. If green → close BUG-C chain.
5. **Prod is HOLD** until iteração 8 lifts the trust score from 0.90 to ≥ 0.92 (i18n callbackUrl preservation, ~30 LOC, ~30 min).

## Rollback

`git revert <commit-hash>` then `git push`. Restores the middleware-side
gate (which has the cookie race but at least *eventually* settles after
a re-sign). Vercel redeploys automatically. < 5 min total.

## Known follow-ups

| ID | Description | Sprint |
|---|---|---|
| Iter-8 i18n | Restore original-path callbackUrl (read `x-pathname` header set by middleware). | This sprint |
| Iter-8 cleanup | Confirm no other JWT-claim consumers exist (Phase 6 audit will list any if found). | This sprint |
| SPEC-PROCESS-RETROSPECTIVE-BUG-C | Audit why iterações 1-5 bypassed governance under urgency. | Sprint 46 |
| Layout query coalescing | Combine subscription + profile fetches in a single `db.user.findUnique({ include })`. | Sprint 46 |
| E2E: real OAuth flow | Playwright + ephemeral Google account. | Sprint 46 |
