# BUG-C-F3 Iteração 7 — EDD Trust Score

**Author:** qa-engineer (orchestration)
**Date:** 2026-04-24
**Spec:** SPEC-AUTH-AGE-002 v2.0.0 §8 (B4-Node-gate)
**Threshold:** ≥ 0.85 to authorise Staging deploy. ≥ 0.92 for Prod.

---

## 1. Methodology

Composite trust score across the five dimensions defined in SPEC §8.3.7.
Each dimension is scored 0.0-1.0, then weighted and summed.

| Dim | Weight | Source of evidence |
|---|---|---|
| Safety | 30% | BDD `auth-age-gate.feature` Scenarios 4 + 5; layout test `redirects when birthDate is null` |
| Accuracy | 25% | BDD Scenarios 3 + 5; layout test `redirects when UserProfile row does not exist`; SPEC v2.0.0 §8.3.4 (DB is SoT) |
| Performance | 20% | Reasoned estimate of +1 DB query; no bench in this iteration |
| UX | 15% | BDD Scenario 3 (no loop), absence of `auth.middleware.redirectToCompleteProfile` event after Staging deploy |
| i18n | 10% | BDD Scenario 2 (callbackUrl + locale preserved at the redirect target) |

## 2. Per-dimension scoring

### 2.1 Safety — 0.95

- Layout test `redirects when birthDate is null` ✅ green
- Layout test `redirects when UserProfile row does not exist` ✅ green
- Layout test `redirects to /auth/login when there is no session` ✅ green (regression coverage of the pre-existing auth check)
- BDD Scenario 5 (JWT-tamper resistance) is *structurally* satisfied because the layout queries DB regardless of the JWT claim. No automated test executes the tamper directly — it is asserted-by-construction. Manual confirmation acceptable for this iteration.
- Minor: Scenario 4 (under-18 path) is unchanged from SPEC v1.x — already tested in `profile.complete-profile.test.ts` and known green. Not a regression risk in this iteration.
- Deduction: −0.05 for absence of an automated end-to-end JWT-tamper test.

### 2.2 Accuracy — 0.95

- Layout reads `birthDate` directly from `UserProfile` (`db.userProfile.findUnique({ select: { birthDate: true } })`) — single round-trip, no caching layer that could go stale.
- The pre-existing `signIn` callback at `src/lib/auth.ts:73-79` already used the same `birthDate` derivation; the layout now mirrors that source, eliminating the cookie/JWT divergence path.
- Deduction: −0.05 for the test relying entirely on mocks (`db.userProfile.findUnique` mocked). A real-DB integration test is deferred to Sprint 46 alongside the broader E2E plan.

### 2.3 Performance — 0.82

- Empirical bench not run in this iteration. Reasoned estimate:
  - Postgres warm `findUnique` on PK with single-column projection: ~3-8 ms in our staging profile (based on existing `db.subscription.findUnique` calls in the same layout).
  - Cold connection-pool penalty: ~30-50 ms once per dyno.
- Layout already does at least three sequential awaits (`auth()`, `subscription.findUnique`, `PointsEngine.getBalance`); adding a fourth changes the worst-case from ~25 ms to ~30 ms warm. Negligible to the user.
- Optimisation opportunity (not blocking): coalesce `subscription.findUnique` and `userProfile.findUnique` into a single `db.user.findUnique({ include: { subscription: true, profile: true } })`. Out of scope for iteração 7.
- Deduction: −0.18 for absence of a real measurement and absence of the coalescing optimisation that an architect would normally insist on.

### 2.4 UX — 0.92

- BDD Scenario 3 (no loop) is structurally satisfied: there is exactly one gate now (the layout) and it derives from DB which the action just wrote. No race window remains.
- Diagnostic logs from iterações 3-4 are removed; absence of `auth.middleware.redirectToCompleteProfile` in Staging logs is the success signal.
- Deduction: −0.08 for not yet adding a `loading.tsx` skeleton that would smooth the +1 DB query latency on first load. Acceptable per SPEC §8.3.2.

### 2.5 i18n — 0.78

- Scenario 2 specifies `callbackUrl` should be the original path (e.g. `/pt-BR/expeditions`).
- Implementation simplification: layout redirects with a hardcoded `?callbackUrl=%2Fexpeditions` regardless of the original path the user was attempting. Locale is preserved by `redirect({ ..., locale })` (next-intl handles the prefix), but the *callbackUrl value itself* loses the user's original target if they were navigating to `/atlas` or a deep link.
- The PO-approved BDD Scenario 2 implies original-path preservation. The implemented behaviour does not. This is an honest deviation flagged here for PO awareness.
- Deduction: −0.22 to reflect the deviation. Recommendation: address in iteração 8 by reading the requested path from `headers().get("x-pathname")` (requires middleware to set that header — a small follow-up). Not blocking the deploy, since `/expeditions` is the canonical landing target post-DOB anyway.

## 3. Composite

| Dim | Score | Weight | Weighted |
|---|---:|---:|---:|
| Safety | 0.95 | 0.30 | 0.285 |
| Accuracy | 0.95 | 0.25 | 0.2375 |
| Performance | 0.82 | 0.20 | 0.164 |
| UX | 0.92 | 0.15 | 0.138 |
| i18n | 0.78 | 0.10 | 0.078 |
| **Composite** | | **1.00** | **0.9025** |

## 4. Decision

**Composite trust score: 0.90.**

Threshold for Staging: ≥ 0.85 → **PASS** ✅
Threshold for Prod: ≥ 0.92 → **MARGINAL FAIL** ❌ (0.02 below)

### Recommendation

- **Authorise Staging deploy on this commit.** The Staging round will produce the empirical evidence (PO walk-through + Vercel log absence of `auth.middleware.redirectToCompleteProfile`) that lifts Performance and UX dimensions back into the > 0.90 range.
- **Do NOT auto-promote to Prod yet.** Prod gate requires:
  - The i18n callbackUrl improvement (iteração 8, ~30 LOC) to lift i18n ≥ 0.90, AND
  - One Staging round of empirical evidence that the loop is fixed.
- After Staging green, recompute and gate prod release on the new score.

## 5. Trust score history (this bug)

| Iteração | Date | Composite | Verdict |
|---|---|---:|---|
| 1-2 | 2026-04-15 → 2026-04-21 | n/a | bypassed governance (debug mode) |
| 3-6 | 2026-04-21 → 2026-04-24 | n/a | diagnostic-only, no fix shipped |
| **7** | **2026-04-24** | **0.90** | **Staging GO; Prod HOLD** |

---

## 6. Iter 7.1 Update — 2026-04-24

### Trigger

Staging PO walk-through surfaced a pre-existing latent bug: fresh Google OAuth signup fails with `PrismaClientValidationError: Unknown argument profileComplete` (origin: `src/lib/auth.ts:65-89` mutation, present since SPEC v1.0.0 commit `db73225`). Iter 7 did not introduce the bug — it unmasked it via the first real fresh-user walk-through.

Option A (remove mutation) applied. Governance: proportional (unit TDD + security smoke + BDD + SPEC v2.0.1 + this score update).

### Re-scoring

| Dim | v2.0.0 | v2.0.1 | Δ | Reason |
|---|---:|---:|---:|---|
| Safety | 0.95 | **0.97** | +0.02 | Adds regression test for signIn mutation. Layout gate intact. |
| Accuracy | 0.95 | 0.95 | 0 | Unchanged — same SoT. |
| Performance | 0.82 | 0.82 | 0 | Unchanged — no new query. |
| UX | 0.92 | **0.94** | +0.02 | Fresh OAuth signup now actually works end-to-end (was previously broken for any first-time user). |
| i18n | 0.78 | 0.78 | 0 | Still pending Iter 8 callbackUrl preservation. |

### Composite v2.0.1

| Dim | Score | Weight | Weighted |
|---|---:|---:|---:|
| Safety | 0.97 | 0.30 | 0.291 |
| Accuracy | 0.95 | 0.25 | 0.2375 |
| Performance | 0.82 | 0.20 | 0.164 |
| UX | 0.94 | 0.15 | 0.141 |
| i18n | 0.78 | 0.10 | 0.078 |
| **Composite v2.0.1** | | **1.00** | **0.9115** |

### Decision

**Composite: 0.91 (≈ 0.9115).**

- Staging gate ≥ 0.85 → **PASS** ✅
- Prod gate ≥ 0.92 → **MARGINAL FAIL** ❌ (0.01 below)

Position unchanged: **Staging GO, Prod HOLD.** The 0.01 gap to the prod gate is entirely attributable to the i18n dimension, which Iter 8 will address by restoring original-path `callbackUrl` from `headers().get("x-pathname")`. That single change is projected to lift i18n to ~0.92, which carries the composite to ~0.925 and clears the Prod gate.

### History update

| Iteração | Date | Composite | Verdict |
|---|---|---:|---|
| 1-2 | 2026-04-15 → 2026-04-21 | n/a | bypassed governance (debug mode) |
| 3-6 | 2026-04-21 → 2026-04-24 | n/a | diagnostic-only, no fix shipped |
| 7 | 2026-04-24 | 0.90 | Staging GO; Prod HOLD |
| **7.1** | **2026-04-24** | **0.91** | **Staging GO; Prod HOLD** (regression fixed; i18n still blocks Prod) |
