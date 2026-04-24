# SPEC-PROCESS-RETROSPECTIVE-BUG-C — Retrospective of BUG-C governance debt

**Status:** Candidate — Sprint 46 backlog
**Type:** Process retrospective + test-coverage remediation
**Owner:** tech-lead (driver), product-owner (sign-off)
**Priority:** High (blocking next Auth.js-adjacent change)
**Created:** 2026-04-24 (during Iter 7.1 hotfix)

---

## 1. Context

The BUG-C chain (see `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md`
§7-§9) took 7.1 iterations over 9 days (2026-04-15 → 2026-04-24) to
close. Two distinct classes of debt surfaced and must be addressed
before Sprint 46 closes.

## 2. Process debt (iterations 1-5 shortcut)

Iterations 1-5 bypassed SDD/TDD/BDD/EDD governance under urgency
pressure. Iteração 7 restored the full flow (9 phases). Iter 7.1
applied proportional governance (7 phases, compressed) because the
hotfix was a pure deletion.

### Required retrospective outcomes

- Document the decision-making chain that led to iter 1-5 bypassing
  governance. Who approved the shortcut? At what point did debt
  accumulate?
- Define a "crisis governance minimum" — the smallest set of SDD/TDD
  artifacts that MUST accompany even an urgency-mode fix. Proposal:
  (a) 1-line SPEC change-history entry, (b) 1 failing test before fix,
  (c) 1 line in the existing security audit doc.
- Codify when full 9-phase governance is required vs when compressed
  is acceptable. Binary criteria, not judgment calls.

## 3. Coverage debt (root of Iter 7.1 bug)

The signIn-callback mutation that caused the Iter 7.1
`PrismaClientValidationError` **had zero test coverage** from the
moment it was introduced (commit `db73225`, SPEC v1.0.0). The bug
was latent for ~9 days before the first fresh OAuth user hit it.

### Root cause of the coverage gap

- No `src/lib/__tests__/auth.test.ts` existed until Iter 7.1.
- No integration test exercised `OAuth profile → signIn → adapter.createUser → Prisma`.
- All auth-adjacent tests (`session-cookie`, `profile.complete-profile`,
  `layout`) mocked `auth()` to return a pre-cooked session, skipping
  the adapter entirely.

### Required coverage additions (Sprint 46 scope)

#### 3.1 Adapter-integration tests for auth callbacks

Every Auth.js callback that receives or returns user/account/session
data must have at least one test that asserts the output shape matches
the adapter contract. Specifically:

| Callback | Adapter consumer | Test assertion |
|---|---|---|
| `signIn({ user })` | `adapter.createUser(user)` on fresh signup | `Object.keys(user)` ⊆ `User` Prisma columns |
| `jwt({ token, user })` when `user` is present | none directly, but token must contain only JWT-valid fields | same principle — no DB-write side effects |
| `session({ session, token })` | client-side | no adapter write, but response shape must match `Session` type |

Iter 7.1 added coverage for (1). Sprint 46 task: extend to (2) and (3).

#### 3.2 MSW OAuth integration stub

Implement a Playwright + MSW harness that stubs the Google OAuth
token exchange and runs a full OAuth callback flow against the real
NextAuth handlers + PrismaAdapter (with a test DB). One end-to-end
test: "fresh user via OAuth → redirected to complete-profile → DOB
submit → lands on /expeditions".

This closes the gap identified in Iter 7.1 §4 (diagnostic report).

#### 3.3 Retroactive audit of SPEC v1.0.0 auth callbacks

Walk every callback defined at the time of `db73225` and confirm
each has the adapter-integration test defined in 3.1. Likely to
surface ~2-3 more latent gaps similar to the one Iter 7.1 hit.

## 4. Definition of Done

- Retrospective document committed at `docs/sprint-reviews/BUG-C-RETROSPECTIVE-2026-04-24.md`.
- Crisis governance minimum codified in `docs/specs/SDD-PROCESS.md` as a new section.
- Adapter-integration test coverage items 3.1, 3.2, 3.3 implemented and passing.
- Trust score gate for Auth.js-adjacent changes set to require adapter-integration coverage on the changed callback before merge.

## 5. Related specs and artifacts

- `docs/specs/sprint-44-pre-beta/SPEC-AUTH-AGE-002.md` — v2.0.1
- `docs/qa/bug-c-f3-iter7-plan.md` — Iter 7 plan
- `docs/qa/bug-c-f3-iter7-security-audit.md` — Iter 7 + 7.1 audit
- `docs/qa/bug-c-f3-iter7-trust-score.md` — Iter 7 + 7.1 score
- `docs/releases/bug-c-f3-iter7.md` — Iter 7 release notes
- `docs/qa/google-oauth-dob-bug-2026-04-20.md` — original bug report
