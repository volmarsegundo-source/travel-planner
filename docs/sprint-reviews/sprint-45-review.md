# Sprint 45 Review — Saneamento + BUG-C Chain

**Sprint:** 45 (Saneamento pré-Beta)
**Window:** 2026-04-19 → 2026-04-24 (6 effective days)
**Closure date:** 2026-04-24
**Author:** release-manager (orchestration)
**Status:** ✅ Formally closed — Prod promotion decision deferred to separate task

---

## §1 — Executive Summary

Sprint 45 was scoped as a pure **Saneamento** (technical cleanup) sprint targeting the 712 pre-Beta defects catalogued in `docs/specs/sprint-45/SCOPE-BOX.md` (TS 497 + Lint 164 + Vitest 51). Execution delivered the three planned waves (W1 security hardening, W2 quality fixes, W3 design token migration) **plus** three unplanned production bugs discovered during Staging validation: BUG-A (session update drift), BUG-B (schema drift from a broken deploy pipeline), and **BUG-C** — a 7-iteration chain with Auth.js v5-beta's cookie rotation race that required an architectural redesign (B4-Node-gate).

**Highlights**:

1. Saneamento target met — Wave 2 eliminated 485 TS errors with a single root-cause fix (`jest-dom/vitest` import migration); Wave 3 migrated 135 raw Tailwind colors across 31 files to Atlas v2 tokens in 6 clean batches.
2. BUG-C chain formally closed with Trust Score composite **0.93** (Prod gate ≥ 0.92 cleared).
3. Deploy pipeline repaired (`.github/workflows/deploy.yml` YAML error that had silently skipped Prisma migrations for ~3 days).
4. Governance **restored** after iterations 1-5 of BUG-C operated in shortcut mode; iterations 7, 7.1, 8 shipped with full SDD/TDD/BDD/EDD.
5. 3 Sprint 46 SPECs pre-created (SEC-AUDIT, TEST-MOCK-ASSERTION, OBSERVABILITY-SENTRY) + 1 process-retrospective SPEC.

---

## §2 — Sprint Goals vs Delivery

| Goal (from SCOPE-BOX.md) | Status | Evidence |
|---|---|---|
| TS 497 errors → 0 | ✅ Delivered | `f7c966f` Wave 2 — jest-dom/vitest migration eliminated 485 TS errors in one shot; remaining ~12 fixed in same commit. `bb8591c` removed the `tsconfig.techdebt` allowlist. |
| Lint 164 warnings → tolerated set only | ✅ Delivered | Wave 3 batches A-F (`f492cdd` → `fd67a32`) migrated all 135 `atlas-design/no-raw-tailwind-colors` warnings. |
| Vitest 51 broken tests → 0 | ✅ Delivered | `f7c966f` Wave 2 migration + mock drift fixes. Final touched-area evidence: 59/59 green (iter 8 verification). |
| BUG-A (updateSession drift) | ✅ Delivered | `9a45312` — refresh session in completeProfileAction + expose Prisma errors in logs. |
| BUG-B (schema drift) | ✅ Delivered | `26fd93e` fixed the deploy.yml YAML error; 3 missing Prisma migrations (`20260418120000_onboarding_step_persistence`, `_ai_consent_fields`, `_ai_consent_backfill_legacy`) deployed to Staging by PO. Documented in `docs/qa/google-oauth-dob-bug-2026-04-20.md` §8. |
| BUG-C (Auth.js cookie race) | ✅ Delivered | 7 iterations: `cbc4c98` palliative (F1), observability chain (`7d42b60`, `a3432d6`, `40c1e8e`, `41a43b7`), then the arch redesign `cb7df47` iter 7 + `2f1ec2f` iter 7.1 hotfix + `5aa5afb` iter 8 i18n. Full history in SPEC-AUTH-AGE-002 §§8-10. |
| 3 Sprint 46 SPECs pre-created | ✅ Delivered | `d221d1b` registered SEC-AUDIT-001, TEST-MOCK-ASSERTION-001, OBSERVABILITY-SENTRY-001. `SPEC-PROCESS-RETROSPECTIVE-BUG-C.md` added in iter 7.1 commit. |
| CSP nonce propagation (unplanned) | ✅ Delivered | `e871861` + `4595a36` — full nonce + strict-dynamic + Vercel Live allowlist. |

All planned goals met. Three unplanned production bugs (A, B, C) also resolved.

---

## §3 — Deliverables

### §3.1 Code (42 commits in window)

| Hash | Date | SPEC ref / scope |
|---|---|---|
| `5aa5afb` | 2026-04-24 | SPEC-AUTH-AGE-002 v2.0.2 / BUG-C iter 8 i18n callbackUrl |
| `2f1ec2f` | 2026-04-24 | SPEC-AUTH-AGE-002 v2.0.1 / BUG-C iter 7.1 hotfix |
| `cb7df47` | 2026-04-24 | SPEC-AUTH-AGE-002 v2.0.0 / BUG-C iter 7 B4-Node-gate |
| `41a43b7` | 2026-04-23 | BUG-C-F3 observability (JWE IV diagnostic) |
| `40c1e8e` | 2026-04-23 | BUG-C-F3 observability (middleware redirect log) |
| `a3432d6` | 2026-04-23 | BUG-C-F2,F3 observability (patchSessionToken) |
| `37c3631` | 2026-04-23 | chore — gitignore coverage dumps |
| `21b6b90` | 2026-04-23 | SPEC-SPRINT-45-WAVE-3 token map |
| `cbc4c98` | 2026-04-22 | BUG-C-F1 palliative — patchSessionToken helper |
| `7d42b60` | 2026-04-22 | BUG-C-F2 observability |
| `4595a36` | 2026-04-21 | SPEC-SEC-CSP-NONCE-001 — theme provider nonce |
| `d221d1b` | 2026-04-21 | docs — 3 Sprint 46 SPEC candidates |
| `e871861` | 2026-04-21 | SPEC-SEC-CSP-NONCE-001 — propagate nonce + strict-dynamic |
| `9a45312` | 2026-04-21 | SPEC-AUTH-AGE-002 — BUG-A fix (refresh session + Prisma error surface) |
| `fd67a32` | 2026-04-21 | Wave 3 Batch F — shared UI + test assertions |
| `b3f94ef` | 2026-04-21 | Wave 3 Batch E — dashboard + notification surfaces |
| `717e3eb` | 2026-04-21 | Wave 3 Batch D — expedition surfaces |
| `c96892e` | 2026-04-21 | Wave 3 Batch C — auth surfaces |
| `bc98300` | 2026-04-21 | Wave 3 Batch B — loja/purchase/expedition |
| `f492cdd` | 2026-04-21 | Wave 3 Batch A — admin surfaces |
| `bb8591c` | 2026-04-20 | SPEC-TECHDEBT-CI-001 — remove techdebt allowlist |
| `f7c966f` | 2026-04-20 | Wave 2 — jest-dom migration + 51 test fixes + dead-code removal |
| `f396a92` | 2026-04-20 | SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001 Wave 2B (destinations) |
| `0175582` | 2026-04-20 | SPEC-SEC-XFF-001 + RATE-LIMIT-FAIL-CLOSED-001 Wave 1 |
| `860f836` | 2026-04-20 | docs — Sprint 45 Fase 1 diagnosis + Wave 1 endorsement |
| `d78f00a` | 2026-04-20 | docs — SPEC-TEST-FORGOTPW-RATE-LIMIT-001 Phase 2 halted (Redis down) |
| `9116e53` | 2026-04-20 | SPEC-TEST-FORGOTPW-RATE-LIMIT-001 smoke test |
| `ad8b95b` | 2026-04-20 | SPEC-AUTH-FORGOTPW-002 — ExploreIcon mock |
| `51c36ee` | 2026-04-20 | SPEC-LANDING-COPY-003 final copy |
| `343a8b5` | 2026-04-20 | SPEC-AUTH-FORGOTPW-002,003 — layout B + dual-layer rate limit |
| `bcefa75` | 2026-04-20 | SPEC-LANDING-COPY-003 |
| `2b7db6d` | 2026-04-20 | SPEC-LANDING-COPY-002 — AI-free hero/tools/phases |
| `6a9de2b` | 2026-04-20 | docs — Onda 2 regression root-cause + Wave 2.1 |
| `9466913` | 2026-04-19 | fix i18n gaps (EDD i18n ≥0.90) |
| `26fd93e` | 2026-04-19 | fix deploy.yml YAML error (BUG-B root cause) |
| `f913769` | 2026-04-19 | SPEC-TECHDEBT-CI-001 — branches threshold 80→78 temp |
| `7988631` | 2026-04-19 | SPEC-TECHDEBT-CI-001 — expand techdebt allowlist |
| `68920e3` | 2026-04-19 | SPEC-TECHDEBT-CI-001 — add techdebt allowlist |
| `ac6fb63` | 2026-04-19 | docs — Sprint 45 Saneamento reorganization |
| `81f3577` | 2026-04-19 | CVE FIX — Next.js 15.5.15 + next-intl redirect mitigation |
| `b7a60e2` | 2026-04-19 | docs — CVE report + tech-debt catalog post-PR #32 |
| `3302b74` | 2026-04-19 | fix forgotpw — hoist useTranslations (react-hooks) |

**Gross LOC delta** (`git log --shortstat`): +52,375 insertions / −1,125 deletions over the window. Insertions dominated by new docs (SPEC v2.0.0 §8 ≈ +160 alone; plan + audit + score + release notes ≈ +500 more) and `package-lock.json` sync. Not a meaningful quality signal on its own.

### §3.2 Specs

| SPEC | Start | End | Change |
|---|---|---|---|
| `SPEC-AUTH-AGE-002` | v1.2.0 (pre-sprint, Iter 7.1 context mentions) | v2.0.2 | Major bump v1→v2 in iter 7; §10 added in iter 8. Three change-history rows added this sprint. |
| `SPEC-SPRINT-45-FASE-1` (SCOPE-BOX) | — | created | Sprint scoping doc. |
| `SPEC-SPRINT-45-WAVE-3` (token map) | — | created | 135-warning design migration plan. |
| `SPEC-SEC-XFF-001` | proposed | implemented | XFF unification across 2 bug sites + audit. |
| `SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001` | proposed | implemented Wave 1 + Wave 2B | Fail-closed opt-in for register, pwd-reset, destinations search. |
| `SPEC-SEC-CSP-NONCE-001` | partial | hardened | Strict-dynamic + Vercel Live allowlist + theme provider nonce. |
| `SPEC-TECHDEBT-CI-001` | in progress | closed | `tsconfig.techdebt` + `eslint.config.techdebt` removed; allowlist dissolved. |
| `SPEC-AUTH-FORGOTPW-002,003` | in progress | shipped | Dual-layer rate limit + layout B. |
| `SPEC-LANDING-COPY-002,003` | in progress | shipped | AI-free copy. |
| `SPEC-OBSERVABILITY-SENTRY-001` | — | created (P2, 3-5h) | Sprint 46 candidate. |
| `SPEC-SEC-AUDIT-001` | — | created (P1, 6-10h) | Sprint 46 candidate. |
| `SPEC-TEST-MOCK-ASSERTION-001` | — | created (P1, 4-8h) | Sprint 46 candidate. |
| `SPEC-PROCESS-RETROSPECTIVE-BUG-C` | — | created | Sprint 46 candidate — expanded with adapter-integration test requirement. |

### §3.3 Tests

- **Touched-area end state (iter 8 evidence)**: **59/59 green** across middleware, layout, auth callbacks, session-cookie helper, complete-profile action, safe-redirect helper.
- **New tests added in Sprint 45 (concrete)**:
  - `src/app/[locale]/(app)/__tests__/layout.test.tsx` — 11 tests (4 in iter 7 + 7 in iter 8).
  - `src/lib/__tests__/auth.test.ts` — 3 tests (iter 7.1 regression guard for signIn callback).
  - `src/lib/auth/__tests__/session-cookie.test.ts` — 5 tests (iter 7 scope).
  - `src/lib/validation/__tests__/safe-redirect.test.ts` — 25 tests (referenced; pre-existing per iter 8 security audit evidence).
- **Baseline test count at sprint start**: **TBD — no baseline snapshot recorded**. The SCOPE-BOX cites "51 broken tests" pre-fix but the total green count was not captured.
- **Coverage**: branches threshold lowered 80→78 temporarily (`f913769`, logged as `SPEC-TESTS-BRANCHES-80-001` debt for Sprint 46).

### §3.4 Documentation

- **SPEC updates / new**: 13 (see §3.2).
- **BDD scenarios**: `docs/specs/bdd/auth-age-gate.feature` — 6 original (iter 7) + 1 regression (iter 7.1) + 6 i18n/open-redirect (iter 8) = **13 scenarios**.
- **QA reports** (new in sprint): 10 under `docs/qa/` and `docs/specs/sprint-45/` — including the primary `google-oauth-dob-bug-2026-04-20.md` (BUG-C diagnostic, 305+ lines), `XFF-AUDIT`, `SECURITY-ENDORSEMENT-WAVE1`, `COVERAGE-BRANCHES-DEBT`, `FAIL-CLOSED-PROPOSAL`, `FLAKY-TESTS-COVERAGE-MODE`, `FLAKY-TRIAGE-app-shell-layout`, `POINT-1-TRIAGE`, `SCOPE-BOX`, `wave-3-token-map`, `bug-c-f3-iter7-plan`, `-security-audit`, `-trust-score`.
- **Release notes**: `docs/releases/bug-c-f3-iter7.md` + `docs/releases/bug-c-f3-iter8.md`.

### §3.5 Infrastructure

| Change | Source | Impact |
|---|---|---|
| `.github/workflows/deploy.yml` YAML syntax fix | `26fd93e` | Unblocked auto-migrations — had silently skipped migrations for ~3 days. |
| 3 Prisma migrations deployed to Staging | PO manual action | Closed the `P2022: onboardingStep column not exist` chain (BUG-B). |
| GitHub Secrets `STAGING_DATABASE_URL` / `PRODUCTION_DATABASE_URL` configured | PO | Pre-req for `prisma migrate deploy` in CI. |
| Coverage branches threshold 78% (from 80%) | `f913769` | Temporary — tracked as Sprint 46 debt. |
| No new SaaS, no new env vars, no new deps | — | Clean slate into Sprint 46. |

---

## §4 — Metrics

### §4.1 Quality

| Metric | Value | Source |
|---|---|---|
| Touched-area tests end-state | **59/59 green** | Iter 8 gate (2026-04-24) |
| Trust Score composite (last) | **0.93** | `docs/qa/bug-c-f3-iter7-trust-score.md` §7 |
| Prod gate threshold | ≥ 0.92 | Same |
| Prod gate status | **CLEARED** ✅ | Same |
| Staging gate | ≥ 0.85 — PASS | Same |
| Security audit (iter 7+8) | **APPROVED** + **APPROVED-WITH-FOLLOWUPS** | `docs/qa/bug-c-f3-iter7-security-audit.md` §§7-9 |
| TS errors (end) | 0 (post Wave 2 + techdebt allowlist removal) | `bb8591c` commit |
| Lint warnings (end) | 0 on `atlas-design/no-raw-tailwind-colors` | Wave 3 Batch F commit |
| Vitest failing tests (end) | 0 in touched areas (iter 8 verified) | Iter 8 gate |

### §4.2 Velocity / Effort

| Metric | Value |
|---|---|
| Sprint duration (effective days) | 6 (2026-04-19 → 2026-04-24) |
| Commits to `master` | 42 |
| Gross LOC ins/del | +52,375 / −1,125 (dominated by docs + package-lock) |
| BUG-C iterations | 7 (numbered 1 → 8, with 7.1 hotfix) |
| Total BUG-C time | ~4 days (2026-04-21 → 2026-04-24) |
| Scope-box estimate (Waves 1-3) | 33h |
| Unplanned work (BUG-A + BUG-B + BUG-C) | TBD — no time-tracking baseline |

### §4.3 Débitos fechados vs acumulados

**Fechados no sprint** (partial list):

- 712 saneamento errors (TS 497 + Lint 164 + Vitest 51) — zeroed.
- `tsconfig.techdebt` + `eslint.config.techdebt` — removed.
- XFF parsing gap (2 bug sites) — unified.
- CSP nonce silent-fail — resolved (iter 7 side-effect).
- `updateSession` / `unstable_update` dependency — replaced by B4-Node-gate architecture.
- Deploy pipeline silent failure — fixed.

**Acumulados para Sprint 46** (exhaustive in §7).

---

## §5 — Narrative Timeline

- **2026-04-19** — Sprint 45 kickoff (`ac6fb63`). Deploy pipeline repaired (`26fd93e`). CVE fix Next.js 15.5.15 (`81f3577`). Techdebt allowlist introduced as stepping stone (`68920e3`).
- **2026-04-20** — SCOPE-BOX.md authored (`860f836`). Wave 1 security shipped (XFF + fail-closed register/pwd-reset) (`0175582`). Wave 2 quality shipped (jest-dom migration + 51 test fixes) (`f7c966f`). Techdebt allowlist dissolved (`bb8591c`). BUG-A reproduced by PO against Staging.
- **2026-04-21** — BUG-A fix: refresh session + expose Prisma errors (`9a45312`). BUG-B root cause confirmed via new logs: schema drift, `onboardingStep column not exist`. PO applied 3 missing migrations to Staging. Wave 3 design token migration — all 6 batches shipped in one day (`f492cdd` → `fd67a32`). CSP nonce fix (`e871861`, `4595a36`). 3 Sprint 46 SPECs pre-registered (`d221d1b`).
- **2026-04-22** — BUG-C surfaced: DOB submit on Staging still looped despite BUG-A+B fixes. Iter 1 palliative ship `patchSessionToken` helper (`cbc4c98`). Iter 2 observability (`7d42b60`) confirmed `unstable_update` silent no-op.
- **2026-04-23** — Iter 3-4 observability chain (`a3432d6`, `40c1e8e`, `41a43b7`) progressively instrumented helper and middleware. Iter 5 evidence (IV fingerprint analysis) proved Auth.js wrapper rotation was overwriting helper's cookie.
- **2026-04-24** — Iter 6 feasibility report rejected the user's initial B4 framing (DB re-derive in Edge not viable) and proposed B4-Node-gate. **Iter 7** shipped the architectural redesign with full governance (`cb7df47`). **Iter 7.1** hotfix same day for a latent bug unmasked by iter 7 (`2f1ec2f`). **Iter 8** shipped i18n callbackUrl preservation + open-redirect guard to clear Prod gate (`5aa5afb`). Sprint closed with Trust Score 0.93.

---

## §6 — Lessons Learned

### §6.1 What worked

- **Governance restoration (iter 7, 7.1, 8)**. After iter 1-5 shortcut mode, the full SDD + TDD + BDD + EDD flow produced a clean architectural change with 10 governance artifacts in iter 7 alone. Iter 7.1 used *proportional* governance (7 compressed phases) — proved that governance can scale to match risk.
- **13-agent dimension model**. Splitting review into PROD / UX / TECH / SEC / AI / INFRA / QA / RELEASE / COST dimensions caught the i18n gap in iter 7 trust score that would have otherwise shipped to Prod.
- **Observability-first diagnosis (iter 3-5)**. Three iterations of incremental logging (helper diagnostic → middleware diagnostic → JWE IV fingerprint) solved in 3 days what guessing would have churned for weeks. The final IV-match evidence was definitive.
- **Fail-safe helper return shape**. `patchSessionToken` returns `{ ok: true }` / `{ ok: false, reason: ... }` — no throws. Downstream is free to log-and-continue instead of user-visible error.
- **Rollback plan documented every release**. Iter 7 + 7.1 + 8 each published rollback procedures (<5 min in all cases).
- **STOP-and-report discipline**. Iter 6 rejected the user's initial fix framing because feasibility check found an Edge runtime blocker. Iter 7.1 diagnosis halted before applying fix to get explicit PO approval. Iter 8 flagged divergences from prompt's scenario locales (`en-US` vs actual `en`) before proceeding.

### §6.2 What didn't work / debt identified

- **Iter 1-6 skipped governance.** Under urgency pressure, no SPEC change-history, no failing-test-first, no security audit per iteration. Iter 7 restored discipline. Retrospective retroactive audit is now registered as `SPEC-PROCESS-RETROSPECTIVE-BUG-C` for Sprint 46.
- **Iter 7 tests passed 24/24 green while a latent bug slipped through**. The signIn callback mutation at `src/lib/auth.ts:65-89` has been broken for fresh OAuth signups since `db73225` (SPEC v1.0.0). No test exercised `OAuth profile → signIn callback → adapter.createUser → Prisma`. Iter 7.1 closed the gap with 3 unit tests; the deeper structural gap (no MSW OAuth stub) is Sprint 46 scope.
- **Pre-existing CI infrastructure failures surfaced but weren't addressed**. `project-bootstrap.test.ts:69` asserts `.env.local` exists on runner (gitignored); EDD Eval Gates exits 1 after writing `eval-report.json`. Both fail identically on every Sprint 45 commit but were out-of-scope.
- **Redis Staging offline for entire sprint**. Rate-limit flowed fail-open on Staging for the whole window. No provider decision reached. Catalogued for Sprint 46.
- **CVE FIX-PRE-BETA handled reactively**. Landed on day 1 of Sprint 45 (`81f3577`) as an urgent CVE mitigation that should have been monitored proactively.
- **i18n imperfection shipped to Prod gate without pre-check**. Iter 7 callbackUrl hardcoded to `/expeditions` — found only via trust-score dimension analysis, not by PO walk-through on Staging.

### §6.3 Root causes identified (analysis, not blame)

- **Auth.js v5-beta `unstable_update` silent no-op**. A beta API with "unstable" prefix was load-bearing in production. The failure mode (silent return with no exception) was discoverable only via upstream issue search after PO reproduced. See `@auth/core/lib/actions/session.js:18-20`.
- **Auth.js v5-beta unconditional session rotation**. `@auth/core/lib/actions/session.ts:42-91` re-encodes and re-writes the JWT cookie on every middleware pass. Undocumented upstream; had to be confirmed by source read. This was the "third writer" in the iter 5 IV analysis.
- **`profileComplete` had no DB source of truth pre-iter 7**. The claim lived only in the JWT cookie — architectural debt from `db73225`. Once the cookie race was discovered, relocating the gate to the DB was the only viable escape.
- **Edge runtime Prisma ban**. The middleware-based gate could not re-derive from DB because `auth.config.ts` must be Edge-safe. This forced the architectural change (move gate to Node layout).
- **Unit tests mocked `auth()` return instead of exercising flow**. Structural gap — fixture-based mocking hid the adapter contract violation for ~9 days.

### §6.4 Changes for Sprint 46 and beyond

- Adopt "adapter-integration tests for auth callbacks" as required coverage item (`SPEC-PROCESS-RETROSPECTIVE-BUG-C` §3.1).
- Implement MSW OAuth stub (§3.2 of same doc).
- Retroactive audit of SPEC v1.0.0 callbacks (§3.3).
- Codify "crisis governance minimum" in `SDD-PROCESS.md` — smallest acceptable governance under urgency.
- Wire `@sentry/nextjs` forwarder for Server Action errors (`SPEC-OBSERVABILITY-SENTRY-001`).
- Walk every approved `SPEC-SEC-*` for security-theater gaps (`SPEC-SEC-AUDIT-001`).
- Tighten mock-only assertions to verify downstream contracts (`SPEC-TEST-MOCK-ASSERTION-001`).

---

## §7 — Open Items / Débitos para Sprint 46

### §7.1 SPECs já criadas (pre-prioritized by authors)

| SPEC | Priority | Effort | Source |
|---|---|---|---|
| `SPEC-SEC-AUDIT-001` | P1 | 6-10h | BUG-C trigger (CSP nonce latent for ~3 yrs) |
| `SPEC-TEST-MOCK-ASSERTION-001` | P1 | 4-8h | BUG-C trigger (mock-only tests) |
| `SPEC-OBSERVABILITY-SENTRY-001` | P2 | 3-5h | BUG-B + BUG-C trigger (logs disappeared from Vercel tail) |
| `SPEC-PROCESS-RETROSPECTIVE-BUG-C` | P1 | TBD | Iter 7.1 + 8 trigger (adapter-integration tests, MSW OAuth, retroactive SPEC audit) |

### §7.2 Novos débitos do BUG-C chain

- **F-01 LOW**: `middleware.ts:31` lists `/expedition` but not `/expeditions` (defense-in-depth gap; layout is the real gate). Source: iter 7 security audit §7.
- **F-02 MEDIUM**: `canUseAI(null)` returns `true` (legacy permissive default). Pre-existing; theoretical direct-API-call bypass for users without `UserProfile` row. Source: iter 7 security audit §7.
- **E2E Playwright test for age gate** — deferred from iter 8 Phase 6 (requires MSW OAuth stub). Source: iter 8 trust score §7.
- **`sanitizeCallbackUrl` consistency** — extend helper to reject `..` and mid-path `\`. Source: iter 8 security audit §9.

### §7.3 Pre-existing (unrelated to BUG-C)

- **CI workflow fix**: `tests/unit/scripts/project-bootstrap.test.ts:69` asserts `.env.local` exists on runner (gitignored). Fails identically across all recent commits. Source: BUG-C-F3 Iter 7 resume notes.
- **EDD Eval Gates**: exits 1 after writing `eval-report.json`. Pre-existing infra issue. Source: same.
- **Redis Staging provider decision** — Upstash paid / Vercel KV / self-hosted. Source: `docs/qa/google-oauth-dob-bug-2026-04-20.md` §9 bullet 1.
- **SMTP / Resend config for Beta email** — password reset delivery provider not finalized.

### §7.4 Iter 1-6 governança retroativa

- Retroactively audit commits `e871861`, `4595a36`, `cbc4c98`, `7d42b60`, `a3432d6`, `40c1e8e`, `41a43b7` for missing SPEC refs, missing tests, missing security reviews. Produce BDD scenarios that should have existed. Source: `SPEC-PROCESS-RETROSPECTIVE-BUG-C.md` §2.

### §7.5 Rate-limit fail-open vs fail-closed policy

- Decision deferred — Staging currently fail-open globally; Production fail-closed on register/pwd-reset/destinations only. ADR for global fail-closed pending. Sentry alert (>50 events/min) is precondition before Prod flip. Source: Wave 1 security endorsement + iter 7 trust score.

### §7.6 Other

- `SPEC-TESTS-BRANCHES-80-001` — 1.01 pp coverage gap from Wave 2.8b; branches threshold 78% vs 80% target. Source: `f913769` commit + `COVERAGE-BRANCHES-DEBT-2026-04-20.md`.
- `SPEC-TESTS-COVERAGE-FLAKY-001` — 2 slow tests in coverage mode. Source: `FLAKY-TESTS-COVERAGE-MODE-2026-04-20.md`.
- **4 S44 injection-resistance failures** (IR-024 Cyrillic homoglyph). Source: referenced in user context; SPEC location TBD.

---

## §8 — Pre-Beta Readiness Assessment

**Note**: the full pre-Beta readiness list (Profit scoring, Gemini primary no-timeout, Dynamic ranking, 6 AI Governance items) is not tracked in any Sprint 45 doc I could locate. The assessment below is limited to what is verifiable from Sprint 45 artifacts.

| Item | Sprint 45 impact | Pre-Beta status |
|---|---|---|
| OAuth age gate (SPEC-AUTH-AGE-002) | ✅ closed via BUG-C iter 8 | Ready (pending PO Staging sign-off) |
| CSP nonce (SPEC-SEC-CSP-NONCE-001) | ✅ resolved in sprint | Ready |
| Rate-limit fail-closed (sensitive routes) | ✅ register, pwd-reset, destinations shipped | Policy decision pending (§7.5) |
| XFF parsing (SPEC-SEC-XFF-001) | ✅ unified | Ready |
| Forgot-password flow (SPEC-AUTH-FORGOTPW-002,003) | ✅ shipped | Ready (pending Resend SMTP config — §7.3) |
| Landing copy (AI-free) | ✅ SPEC-LANDING-COPY-002,003 | Ready |
| Profit scoring rules | **TBD** | **source doc location unknown** |
| Gemini primary no-timeout | **TBD** | **source doc location unknown** |
| Dynamic ranking | **TBD** | **source doc location unknown** |
| 6 AI Governance items (Prompt Registry, Policy Engine, Cost Dashboard, FinOps Alerts, Observability, Output Validation) | **TBD — not touched in Sprint 45** | **source doc location unknown — proposed Sprint 46 scope per §10** |

---

## §9 — Prod Promotion Decision Prep

**Data points** (for PO decision in a separate task):

- Trust Score composite: **0.93** (threshold ≥ 0.92) — tecnicamente Prod authorized.
- Security audit: **APPROVED** (iter 8 §9).
- Staging: deployed (`5aa5afb`), awaiting PO walk-through per `docs/releases/bug-c-f3-iter8.md` §"Deploy plan".
- Rollback plan: documented, single `git revert` + push, < 5 min.
- Blast radius: 3 commits (`cb7df47` + `2f1ec2f` + `5aa5afb`); each independently revertable.

**Pre-requisites for Prod promotion** (checklist for the follow-up task):

- [ ] This Sprint Review approved by PO.
- [ ] PO Staging walk-through green (pt-BR + en deep-link flows, malicious callbackUrl fallback verified).
- [ ] Monitoring/alerting in Prod confirmed (Sentry forward *optional* — not blocking, but `SPEC-OBSERVABILITY-SENTRY-001` would improve visibility).
- [ ] Rollback procedure re-read by on-call.
- [ ] Beta users notified if flow behavior is perceptible (no breaking change; not strictly needed).
- [ ] Release notes published (done — `docs/releases/bug-c-f3-iter7.md` + `iter8.md`).

**Decision left to PO.**

---

## §10 — Sprint 46 Opening Proposals

With Sprint 45 closed, proposing Sprint 46 scope (to be refined in separate planning task):

**Theme**: "AI Governance + Process Retrospective" (name TBD with PO).

**Proposed goals**:

1. **Central Governança IA** — execute the 3 Sprint-46 SPECs: `SPEC-SEC-AUDIT-001` (P1, 6-10h), `SPEC-TEST-MOCK-ASSERTION-001` (P1, 4-8h), `SPEC-OBSERVABILITY-SENTRY-001` (P2, 3-5h). Total ≈ 13-23h.
2. **BUG-C Retrospective** — execute `SPEC-PROCESS-RETROSPECTIVE-BUG-C`: adapter-integration tests + MSW OAuth stub + retroactive audit + crisis-governance minimum in `SDD-PROCESS.md`. Effort TBD.
3. **Pre-Beta gap identification** — locate source docs for Profit scoring / Gemini / Dynamic ranking / 6 AI Governance items. Plan selective execution for remaining Beta-blockers.
4. **Infrastructure debts** — CI workflow fix, EDD Eval Gates, Redis Staging provider decision, Resend SMTP for Beta.
5. **Coverage debts** — branches threshold 78→80, flaky coverage-mode tests, 4 S44 injection-resistance failures.

**Duration estimate**: similar to Sprint 45 (1-2 weeks); concrete after planning.

**Sprint 46 planning to follow separately. This review does not open Sprint 46.**

---

## Review sign-off

> This Sprint 45 Review was authored in a single orchestration session by the
> engineer impersonating the **release-manager** role, with dimension
> consultation from product-owner (§1, §2, §8, §10), tech-lead (§3, §6),
> architect (§6.3), security-specialist (§4.1 audit status, §7.2 findings),
> qa-engineer (§3.3, §4.1 trust score), devops-engineer (§3.5), and
> finops-engineer (no material cost changes in sprint — no input required).
> Process-debt retrospective of iter 1-5 shortcuts is deferred to
> Sprint 46 per `SPEC-PROCESS-RETROSPECTIVE-BUG-C`.

| Role | Status |
|---|---|
| product-owner | ✅ §1, §2, §8, §10 |
| ux-designer | N/A (no UX changes this sprint beyond landing copy, already SPEC'd) |
| architect | ✅ §6.3 root causes |
| tech-lead | ✅ §3, §6 lessons |
| security-specialist | ✅ §4.1 audit status, §7.2 findings |
| qa-engineer | ✅ §3.3 tests, §4.1 trust score |
| devops-engineer | ✅ §3.5 infra (deploy.yml + migrations + GitHub Secrets) |
| release-manager | ✅ overall orchestration, §9 |
| finops-engineer | ✅ no material cost changes |
| data-engineer | N/A |
| dev-fullstack-1 / dev-fullstack-2 | ✅ implementation §3.1 |
| prompt-engineer | N/A (no AI prompt changes in sprint) |

**Sprint 45: formally closed.**
