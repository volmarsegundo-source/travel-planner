# Sprint 45 Retrospective — Start / Stop / Continue

**Sprint:** 45 (Saneamento + BUG-C chain)
**Window:** 2026-04-19 → 2026-04-24 (6 days)
**Author:** product-owner (orchestration)
**Date:** 2026-04-24
**Paired doc:** `docs/sprint-reviews/sprint-45-review.md`

> This retrospective distills the lessons from the shipped Sprint 45 artifacts
> (`SPEC-AUTH-AGE-002` change history v1 → v2.0.2, BUG-C plan + security audit
> + trust score, release notes iter 7/8, process-retrospective SPEC). It is
> not a blame document — it names what worked, what didn't, and concrete
> actionable changes for Sprint 46.

---

## Start (begin doing)

### S-01 — Adapter-integration tests for every auth callback

**Rationale**: iter 7 tests passed 24/24 green for the layout gate while a latent adapter-contract bug (`signIn` mutation + `adapter.createUser`) had been shipping to prod since SPEC v1.0.0. Unit tests that mocked `auth()` return values bypassed the exact code path that failed on fresh OAuth signup.

**Concretely**:
- Add `src/lib/__tests__/auth.test.ts` (done in iter 7.1) as template.
- Extend to every NextAuth callback that returns user/account/session data.
- Codify as required coverage item in `SPEC-PROCESS-RETROSPECTIVE-BUG-C` §3.1.
- Acceptance: test asserts `Object.keys(user)` ⊆ Prisma `User` columns (or the equivalent adapter contract).

### S-02 — Explicit governance check at the start of every iteration, not just the big ones

**Rationale**: iter 1-5 of BUG-C skipped full governance under urgency pressure. This was only caught on iter 6 when the feasibility report halted to report findings before fix. By then, 5 commits had landed without SPEC history, without failing-first tests, and without security review.

**Concretely**:
- New section in `docs/specs/SDD-PROCESS.md`: "Crisis governance minimum" — the smallest artifact set acceptable even under urgency (proposed: 1 SPEC change-history entry, 1 failing test before fix, 1 line in security audit doc).
- Every commit that references a BUG-X chain MUST cite the SPEC change-history row.
- Tracked via commit-message regex in CI (pre-push hook or optional GH Action).

### S-03 — Sentry forward for Server Actions + middleware

**Rationale**: BUG-B (`P2022: onboardingStep column not exist`) and BUG-C (`CSP nonce silent-fail`) were both diagnosed only after PO copied Vercel logs into the conversation. `logger.error` is stdout-only; staging errors disappear once the 1-hour Vercel tail scrolls.

**Concretely**:
- Execute `SPEC-OBSERVABILITY-SENTRY-001` (Sprint 46 P2 backlog item B46-06).
- Acceptance: Server Action errors visible in Sentry dashboard within 60 s of occurrence.

### S-04 — "Is this bug latent since when?" checklist item during diagnosis

**Rationale**: iter 7.1 BUG-C hotfix revealed the regression had been latent since db73225 (SPEC v1.0.0). If the diagnostic had asked "when did this code path stop being covered?" earlier, the gap would have been visible sooner.

**Concretely**:
- Add to diagnostic report template: "When was this code path last changed? Did the change have test coverage for the failing assertion?"
- Apply retroactively to iter 1-5 commits during `SPEC-PROCESS-RETROSPECTIVE-BUG-C` §2 audit.

### S-05 — Locale semantics grounding step before any i18n-touching change

**Rationale**: iter 8 nearly proceeded with `en-US` locale scenarios, but the actual project locales are `pt-BR` + `en` with `localePrefix: 'as-needed'`. The Phase 0 grounding step caught the mismatch and corrected it before BDD scenarios were codified.

**Concretely**:
- Include "Read `src/i18n/routing.ts` and confirm locale codes" as a required checklist item in any spec touching auth flow URLs, redirects, or callbackUrl handling.

---

## Stop (stop doing)

### St-01 — Skipping governance in "debug mode" under perceived urgency

**Rationale**: iter 1-5 of BUG-C produced 5 commits that lack SPEC history entries, failing-first tests, and security audit lines. The perceived savings (speed) were smaller than the actual costs (iter 7.1 hotfix, scrambled retrospective audit, trust-score rebuild).

**Concretely**:
- Governance is *lighter* under urgency (S-02 crisis minimum), but never zero.
- If it *feels* like "we don't have time for SPEC / tests / audit", that's the signal that urgency is distorting judgment — pause and apply the crisis minimum.

### St-02 — Mocking `auth()` without also testing the adapter chain

**Rationale**: unit tests that return a pre-cooked session from `auth()` mock cannot detect adapter-contract violations. They verified a post-session-resolution code path while the real bug was in the pre-session path.

**Concretely**:
- Any test that mocks `auth()` MUST have a sibling test (unit or integration) that exercises the flow into `auth()` — including `adapter.createUser`, `signIn` callback mutations, JWT encode/decode, etc.
- Enforced via B46-02 (`SPEC-TEST-MOCK-ASSERTION-001`).

### St-03 — Treating JWT claims as source of truth for security decisions

**Rationale**: pre-iter 7, `profileComplete` lived only in the JWT cookie. When Auth.js v5-beta's session rotation raced the helper's Set-Cookie, the cookie was out of sync with DB state. Trusting the JWT meant trusting a racy cache as if it were authoritative.

**Concretely**:
- DB is the source of truth for security-relevant booleans. JWT may carry *hints* for UX but not *decisions* for authorization.
- New ADR candidate for Sprint 46: "DB vs JWT — when is it OK to trust the cookie?" — could be part of B46-01 (`SPEC-SEC-AUDIT-001`).

### St-04 — Shipping i18n changes without verifying against actual locale config

**Rationale**: iter 7 hardcoded `?callbackUrl=%2Fexpeditions` assuming pt-BR URL shape; this silently broke `en` deep links. Only caught because the trust-score dimension breakdown isolated i18n at 0.78.

**Concretely**:
- Any PR touching redirects or callback URLs MUST include the per-locale test case (at minimum pt-BR and en).
- Add to PR template as checkbox if we adopt PR templates.

### St-05 — Deferring CI/infra fixes that fail silently

**Rationale**: `project-bootstrap.test.ts:69` (asserts `.env.local` on runner) and EDD Eval Gates (exits 1 on pass) have been failing on every commit for the whole sprint. They were documented but not fixed. When real regressions land, noise-floor masks signal.

**Concretely**:
- Any CI step that fails identically across N consecutive commits is a P1 infra debt, not a "known issue".
- B46-05 + B46-07 (Sprint 46 P1 backlog) handle these.

---

## Continue (keep doing)

### C-01 — Red-green-refactor TDD discipline when applied

**Rationale**: iter 7 Phase 4 produced 3 demonstrably RED tests before fix; Phase 5 made them GREEN. Iter 8 produced 3 RED + 4 accidentally-GREEN (where pt-BR default coincided with hardcoded fallback) and called that out honestly. The red-then-green evidence is the single clearest quality signal we have.

**Concretely**:
- Keep. Every iter 7/7.1/8 phase that followed the pattern produced correct code first try.

### C-02 — 13-agent model with dimension separation

**Rationale**: splitting Trust Score into Safety / Accuracy / Performance / UX / i18n caught the iter 7 i18n gap that would have otherwise shipped to Prod. No single reviewer thinks about all five dimensions equally well; the separation forces each to be scored explicitly.

**Concretely**:
- Keep the 9-dimension SPEC (PROD/UX/TECH/SEC/AI/INFRA/QA/RELEASE/COST) structure.
- Keep per-dimension sign-off at the bottom of every major SPEC.

### C-03 — Observability-first diagnosis (incremental logs before fix attempts)

**Rationale**: BUG-C iter 3-4-5 added progressively more targeted logs instead of guessing fixes. Three iterations of logs produced definitive IV-match evidence that pointed at Auth.js wrapper rotation. A single guess-fix commit would have wasted a cycle.

**Concretely**:
- When a bug reproduces but the root cause isn't obvious, log first, fix second.
- Paired logs (helper + middleware) are powerful — same information from two vantage points catches race conditions.

### C-04 — Rollback plan documented in every release

**Rationale**: iter 7, 7.1, 8 each published rollback procedures with time estimates (<5 min in every case). When the iter 7.1 regression surfaced, the rollback path was pre-documented and low-stress to evaluate (we didn't rollback; we hotfixed, because the diagnostic showed it was a pre-existing bug independent of the commit).

**Concretely**:
- Continue documenting rollback in every release notes doc.
- Include "rollback effort in wall-clock time" as a checklist item.

### C-05 — Stop-and-report when diagnostic is ambiguous

**Rationale**: iter 6 feasibility report halted the fix-application pipeline to report findings. Iter 7.1 stopped before applying fix to get explicit PO approval on Option A vs B vs C. Iter 8 Phase 0 flagged locale-code divergences before proceeding. In all three cases, stopping saved downstream rework.

**Concretely**:
- Continue the PARAR-and-report discipline. The cost of stopping is one response round-trip; the cost of proceeding on a wrong assumption is a commit + revert + rework.

### C-06 — Fail-safe return shapes (no throws in boundary helpers)

**Rationale**: `patchSessionToken` returns `{ ok: true }` / `{ ok: false, reason: ... }` instead of throwing. Call site at `completeProfileAction:382` handled the `!ok` case with a `logger.warn` + continue — which prevented a user-visible error even when the helper failed.

**Concretely**:
- Continue. Any new boundary helper (DB, cookie, external service) should return a typed result instead of throwing.

---

## Meta-retrospective: the retrospective itself

This retrospective was authored in a single orchestration session immediately after sprint close — which is faster than the typical post-sprint ceremony. Two trade-offs:

- **Pro**: context is fresh; specific line references and commit hashes are accurate.
- **Con**: participants (all 13 agent dimensions) did not independently reflect; this is one author's synthesis of the shipped artifacts.

**For Sprint 46 retrospective**: schedule a proper review round where each agent dimension contributes independently (even if still within a single session, have each subagent produce its own bullet list first, then synthesize). This avoids authorship bias.
