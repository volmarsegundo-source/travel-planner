# Release Notes — BUG-C-F3 Iteração 8 (i18n callbackUrl preservation)

**Date:** 2026-04-24
**App version bump:** patch (`0.59.1` → `0.59.2`)
**Spec:** SPEC-AUTH-AGE-002 v2.0.2 (minor spec bump)
**Author:** release-manager (orchestration)

---

## TL;DR

Closes the BUG-C chain for Prod gate clearance. Iter 7 introduced the
Node-runtime age-gate in `(app)/layout.tsx` with a hardcoded
`?callbackUrl=%2Fexpeditions` that lost the user's original path.
Iter 8 fixes it: middleware propagates `x-pathname`, layout validates
it as a safe relative path (open-redirect + traversal + protocol-relative
rejected), and constructs a locale-aware callbackUrl.

## Why iter 7's simplification needed lifting

Iter 7 Trust Score i18n = 0.78 (weight 10%) was the sole blocker to Prod
promotion. PO traveling to `/en/expeditions/trip-123/planner` (a valid
deep link) and completing DOB landed back on `/expeditions` (no locale,
no trip id). Same user, different intended destination.

## What changed

| File | Change |
|---|---|
| `src/middleware.ts` | Set `x-pathname` request header on both the intl-pass-through and intl-rewrite branches, alongside the existing `x-nonce` propagation. +6 LOC. |
| `src/app/[locale]/(app)/layout.tsx` | Read `x-pathname` from `next/headers`, validate as safe relative path, fall back to locale-aware default on rejection, interpolate into the age-gate callbackUrl. +22 LOC. |
| `src/app/[locale]/(app)/__tests__/layout.test.tsx` | +7 new tests across 3 scenarios (locale preservation, deep-link preservation, open-redirect guard). |
| `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md` | v2.0.1 → v2.0.2; +§10 (iter 8 scope, threat delta, files, 9-dim signoff). |
| `docs/specs/bdd/auth-age-gate.feature` | Scenario 2 updated for correct locale semantics; +6 new scenarios. |
| `docs/qa/bug-c-f3-iter7-plan.md` | +Iter 8 Appendix (plan, design, risks, architect signoff). |
| `docs/qa/bug-c-f3-iter7-security-audit.md` | +§9 Iter 8 Review. Verdict: APPROVED. |
| `docs/qa/bug-c-f3-iter7-trust-score.md` | +§7 Iter 8 Update. Composite 0.91 → 0.93 (Prod gate cleared). |
| `docs/specs/sprint-46-candidates/SPEC-PROCESS-RETROSPECTIVE-BUG-C.md` | Expanded §3.2 with target E2E scenarios for MSW OAuth stub. |
| `docs/releases/bug-c-f3-iter8.md` | NEW — this file. |

## Breaking change?

**No runtime breaking change.** Users with `birthDate` set continue
browsing normally. Users without `birthDate` continue to be redirected
to the DOB form — now with a callbackUrl that actually points back to
where they were trying to go.

**Spec-level minor bump.** v2.0.2 strengthens SPEC §8 by documenting
the `x-pathname` header dependency between middleware and layout.

## Deploy plan

1. Push to `origin/master`.
2. Vercel auto-deploys to Staging.
3. PO walk-through (≈ 5 min):
   - `pt-BR` user: navigate to `/expeditions/trip-123/planner` pre-DOB → redirected with callbackUrl `/expeditions/trip-123/planner` → submit DOB → land on `/expeditions/trip-123/planner`.
   - `en` user: same flow with `/en/...` prefix.
   - Attempt `?callbackUrl=https://attacker.com` manually on the complete-profile URL → ensure server falls back to safe default.
4. If green → **authorise Prod promotion**.

## Rollback

`git revert <commit-hash>` then `git push`. Restores the hardcoded
`callbackUrl=%2Fexpeditions` behavior (Iter 7 state — working, just not
i18n-correct). < 5 min total.

## Known follow-ups (Sprint 46)

- **MSW OAuth stub + age-gate E2E suite** (`SPEC-PROCESS-RETROSPECTIVE-BUG-C` §3.2) — closes unit-test-only coverage gap.
- **`sanitizeCallbackUrl` helper consistency** — extend to reject `..` and mid-path `\` to match the stricter inline validation the layout now uses. Non-blocking (layout is the outer boundary).
- **Adapter-integration tests** for remaining auth callbacks (`SPEC-PROCESS-RETROSPECTIVE-BUG-C` §3.1, from Iter 7.1).
- **Process-retrospective doc** for iter 1-5 shortcut debt.

## BUG-C chain closure

With Iter 8, the BUG-C chain is formally closed pending PO Staging green and Prod promotion:

| Iter | Fix | Ship date | Result |
|---|---|---|---|
| BUG-A | Infinite redirect loop (initial) | 2026-04-18 | Partial — revealed deeper issue |
| BUG-B | Prisma schema drift | 2026-04-20 | Fixed |
| BUG-C F1 | `updateSession` after DOB upsert (commit `9a45312`) | 2026-04-21 | Did not clear loop — `unstable_update` silent no-op |
| BUG-C F2 | Observability patch (commit `7d42b60`) | 2026-04-21 | Confirmed `unstable_update` no-op |
| BUG-C F3 Iter 1-6 | `patchSessionToken` helper, IV diagnostics, middleware logs | 2026-04-22 → 2026-04-24 | Diagnostic chain; proved Auth.js rotation race |
| **BUG-C F3 Iter 7** | **B4-Node-gate** (cb7df47) | **2026-04-24** | **Staging loop resolved** |
| **BUG-C F3 Iter 7.1** | **signIn mutation removal** (2f1ec2f) | **2026-04-24** | **Fresh-OAuth regression fixed** |
| **BUG-C F3 Iter 8** | **i18n callbackUrl preservation** (this release) | **2026-04-24** | **Prod gate cleared** |

9 days. 7 iterations. 5 bugs. Cadeia fechada.
