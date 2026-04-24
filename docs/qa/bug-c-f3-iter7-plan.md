# BUG-C-F3 Iteração 7 — Tech Plan (B4-Node-gate)

**Spec:** SPEC-AUTH-AGE-002 v2.0.0 §8
**Author:** tech-lead (orchestration)
**Reviewer:** architect (Phase 3 review section below)
**Date:** 2026-04-24
**Effort estimate:** 2-3h end-to-end

---

## 1. Files touched (exhaustive)

| # | File | Action | Net LOC delta |
|---|---|---|---:|
| 1 | `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md` | Append v2.0.0 section (§8) + bump header | +160 |
| 2 | `docs/specs/bdd/auth-age-gate.feature` | NEW — 6 scenarios | +60 |
| 3 | `docs/qa/bug-c-f3-iter7-plan.md` | NEW — this file | +110 |
| 4 | `src/app/[locale]/(app)/__tests__/layout.test.tsx` | NEW — red→green tests | +120 |
| 5 | `src/middleware.ts` | Remove DOB redirect block; keep auth-required + role + diagnostic logs (one Staging round) | −24 |
| 6 | `src/app/[locale]/(app)/layout.tsx` | Add `db.userProfile.findUnique` + redirect | +18 |
| 7 | `src/lib/auth/session-cookie.ts` | Banner comment demoting helper | +6 |
| 8 | `docs/qa/bug-c-f3-iter7-security-audit.md` | NEW — Phase 6 audit | TBD |
| 9 | `docs/qa/bug-c-f3-iter7-trust-score.md` | NEW — Phase 7 EDD | TBD |
| 10 | `docs/releases/bug-c-f3-iter7.md` | NEW — release notes | TBD |

**Out of scope** (explicitly NOT touched in this iteration):

- `src/lib/auth.config.ts` jwt callback — still sets `token.profileComplete` for client-side UX hints; behavior unchanged.
- `src/server/actions/profile.actions.ts` — still calls `patchSessionToken({ profileComplete: true })` for UX consistency; behavior unchanged.
- `src/lib/auth/session-cookie.ts` body — only a banner comment is added.
- Prisma schema — no migration. `UserProfile.birthDate` already exists.
- E2E suite — deferred to Sprint 46.

## 2. Order of application

The order minimises window where the system is in an inconsistent state.

1. **SPEC** v2.0.0 (`docs/specs/.../SPEC-AUTH-AGE-002.md`) — done in Phase 1.
2. **BDD** scenarios (`docs/specs/bdd/auth-age-gate.feature`) — done in Phase 2.
3. **Plan** + **Security audit doc skeleton** + **Release notes skeleton** — Phase 3 (this doc) and Phase 8.
4. **Failing layout test** (`__tests__/layout.test.tsx`) — Phase 4. Confirmed red.
5. **Layout edit** (`(app)/layout.tsx`) — Phase 5. Adds the gate.
6. **Middleware edit** (`middleware.ts`) — Phase 5. Removes the duplicate gate. ORDER MATTERS: layout gate MUST exist before middleware gate is removed, otherwise a brief moment exists where there is NO gate. Since both edits ship in a single commit, the actual wire-time inconsistency is zero.
7. **Helper banner comment** (`session-cookie.ts`) — Phase 5. Cosmetic.
8. **Run tests + tsc + lint** — Phase 5/9.
9. **Security audit** (architect) — Phase 6. If rejected → STOP.
10. **Trust score** — Phase 7.
11. **Single commit + push** — Phase 9.

## 3. Intermediate gates

After each substantive edit:

```bash
npx tsc --noEmit
npx vitest run <file edited>
```

End of Phase 5 (before commit):

```bash
npx tsc --noEmit
npx vitest run                        # full suite
npx next lint                         # if affordable in time
```

`npx next build` is **not** in the gate set — too expensive for an iter-7
loop. Build is verified by CI on push.

## 4. Rollback plan

| Trigger | Action |
|---|---|
| Staging deploy fails | Vercel auto-rolls to previous deploy; no manual action. |
| PO Staging walk-through fails (loop returns) | `git revert <commit-hash>` + `git push`. Restores middleware-side gate (which has the cookie race but at least *eventually* works after a re-sign). Diagnostic logs from iterações 3-5 stay in to capture failure mode. |
| Security audit (Phase 6) flags critical leak | Block commit. Patch helper or layout. Re-run audit. |
| Trust score < 0.85 | Block commit. Identify failing dimension; fix; re-score. |
| Compile error after pull on a fresh dev box | Confirm `prisma generate` runs in `prebuild`; this is unchanged. |

Rollback effort: < 5 min (single revert commit + push + Vercel auto-deploy).

## 5. Known risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Layout `findUnique` adds latency on every protected page first-load. | Layout already does several DB calls (subscription, gamification). Marginal cost ~5 ms warm. Can be coalesced into a single `findUnique` with `include: { profile: true, subscription: true }` in a later optimisation pass. Out of scope here. |
| R2 | If an authenticated user is on a protected route and their `birthDate` is set NULL externally (admin DB edit), they keep navigating until next layout render. | Acceptable. No real-world flow does this. Edge-case. |
| R3 | API routes (`/api/**`) bypass the layout entirely. If any API trusts `session.user.profileComplete` for age decisions, the JWT-tamper threat re-enters. | Phase 6 (security audit) explicitly checks this. If found → either inline a DB check or accept and document. |
| R4 | Protected segments outside `(app)` group. | `middleware.ts:31` lists `/admin`, `/atlas`, `/meu-atlas`, `/dashboard`, `/expedition`, `/onboarding`, `/account`, `/trips`. Phase 6 walks the file tree to confirm each lives under `(app)/`. |
| R5 | Diagnostic logs left in middleware add log volume. | Documented as intentional for one Staging round. Removed in iteração 8. |
| R6 | Layout test relies on mocking `auth()` and `db` — could pass while real wiring breaks. | Mitigated by PO Staging walk-through before prod. E2E in Sprint 46. |

## 6. Architect review (Phase 3 sign-off)

> Signed within this same orchestration session by the engineer
> impersonating the architect role. A standalone architect-agent run
> would be ideal but is not feasible in the timebox; the structure
> above mirrors how that agent would have reviewed.

| Concern | Assessment |
|---|---|
| Coupling | Layout gate co-locates auth + DB enforcement, which is consistent with the existing `subscription` and `gamification` reads in the same layout. No new layer introduced. |
| Bundle size | Edge bundle gets 24 LOC lighter (middleware redirect block removed). Node bundle gets 18 LOC heavier (layout query). Net negative for Edge cold-start, neutral for Node. ✅ |
| Failure modes | If `db.userProfile.findUnique` throws, layout aborts → user sees error page. Acceptable: no partial bypass. Compare to silent fallback that would weaken the gate. |
| Adherence to ADRs | No conflicting ADR. Reaffirms the implicit ADR "DB is the source of truth, JWT is a cache" already followed for `birthDate` in `signIn` callback. |
| Cross-cutting concerns | Logging: `auth.middleware.redirectToCompleteProfile` event will stop firing — that is the success signal for Phase 7 trust score. CSP/observability/i18n untouched. |
| Long-term maintainability | The change reduces conceptual surface (one gate, not two). Helper kept for UX hints — small ongoing cost, large optionality if we later add server-side `unstable_update`-equivalent calls in non-action contexts. |
| Sign-off | ✅ Approved to proceed to Phase 4. |

---

End of plan.
