# Onda 2 Regression Diagnosis — 2026-04-20

**Author:** dev-fullstack-1 (diagnosis only — no fixes applied)
**Trigger:** PO (Volmar) manual validation 2026-04-20 on Staging
**Staging URL:** https://travel-planner-eight-navy.vercel.app/pt
**Commits under investigation:** `510e638` (SPEC-LANDING-COPY-001), `d717ce9` (SPEC-AUTH-FORGOTPW-001)

---

## TL;DR (Executive Summary — 8 lines)

1. **NOT a deploy / cache / feature-flag regression.** The commits 510e638 and d717ce9 deployed correctly and are operating exactly as specified.
2. **The root cause is a specification gap**, not a regression. Tests 6, 7, 8, 10, 11 fail because the features PO expected were **never specified and never implemented**.
3. **SPEC-LANDING-COPY-001 explicitly declared "Copy rewrites of hero/AI/gamification sections" as OUT OF SCOPE** (Section 2). That spec only removed dead footer links + phantom hover affordances in the Destinations section.
4. **SPEC-AUTH-FORGOTPW-001 is exclusively about email delivery** via Resend. No scope for Header-on-page, "Cadastre-se grátis" link, or changing rate limit to 5/hour.
5. **New copy strings do not exist anywhere** in the repository (`messages/pt-BR.json`, `messages/en.json`, nor in any component). Old copy strings are still in `messages/pt-BR.json` lines 2435, 2442, 2494 — because no code change ever removed them.
6. **Lote C (Layout) worked** because SPEC-LANDING-LAYOUT-001 (commit `dda991d`) was correctly written AND correctly implemented. Lote B (Copy/ForgotPW) "failed" because the spec scope ≠ PO expectation.
7. **Fix path is NOT rollback/redeploy.** It is to author three new specs (COPY rewrites, forgot-password layout, rate-limit adjustment) and implement them — treat as new work, not regression recovery.
8. **Risk**: MEDIUM — no production outage, no data risk; but Beta-blocking expectations are unmet. Estimated fix effort: ~6–10h total (mostly i18n string changes + layout wrap).

---

## 1. Commit-vs-deploy audit

### 1.1 Commit 510e638 — what it actually changed

```
messages/en.json                                   |   4 +-
messages/pt-BR.json                                |   4 +-
src/components/features/landing/DestinationsSectionV2.tsx | 50 +++------
src/components/features/landing/FooterV2.tsx       |  31 ++---
+ tests + SPEC doc
```

The 4-line i18n edits added a `comingSoon` key and removed `viewAll`. **No hero / tools / 8-phases text was touched.**

### 1.2 Commit d717ce9 — what it actually changed

Added email-sender abstraction + Resend integration. Touched:
- `src/lib/env.ts` (RESEND_API_KEY, EMAIL_FROM)
- `src/server/actions/auth.actions.ts` (locale forwarding)
- `src/server/services/auth.service.ts` (dispatch via sender)
- New files under `src/server/services/email/*`

**No change to `src/app/[locale]/auth/forgot-password/page.tsx`.**
**No change to `src/components/features/auth/ForgotPasswordForm.tsx`.**
**No change to `src/app/[locale]/auth/layout.tsx`.**
**No change to rate-limit `3 / 900s` at `auth.actions.ts:90`.**

### 1.3 Deploy integrity

Git `master` points to `9466913` (subsequent commits are i18n gap fix, CI fixes, security CVE patch). Commits `510e638` and `d717ce9` are **both present and merged**; nothing reverted them. Vercel deploy `25b5LCW85` (per PO note) would have included both.

**Conclusion:** No deploy-pipeline regression. No cache staleness required to explain the observations. **The deployed code matches the specs.**

---

## 2. Source-code evidence

### 2.1 Old copy strings — still in pt-BR.json (by design of the spec)

```
messages/pt-BR.json:2435   "subtitle": "Planeje viagens incríveis em minutos — fácil, inteligente e divertido. A IA cuida dos detalhes, você aproveita a aventura."
messages/pt-BR.json:2442   "subtitle": "Nossa metodologia proprietária garante que nada seja esquecido, transformando cada etapa em uma experiência fluida."
messages/pt-BR.json:2494   "title":    "Ferramentas de planejamento com IA"
```

### 2.2 New copy strings — searched across entire repo

Patterns searched:
- "Do começo ao fim, do seu jeito"
- "Viagens que combinam com você"
- "Organize, descubra, viaje"
- "Roteiros que se adaptam a você"
- "Checklist personalizado para cada viagem"
- "Guia personalizado do destino"
- "Transforme cada fase da viagem"

Result: **Zero matches in any file (messages/*.json, components, docs/specs).**

### 2.3 Forgot-password layout — architectural choice, not a regression

`src/app/[locale]/auth/layout.tsx` is a **deliberate** minimal wrapper (Sprint 40 V2 design):
```tsx
// "LoginFormV2 and RegisterForm are full-page components (split-screen 60/40)
//  that handle their own layout including nav, branding, and footer.
//  No V1 wrapper (Header, Footer, card container) should be applied here."
export default function AuthLayout({ children }) { return <>{children}</>; }
```

`ForgotPasswordForm.tsx` renders the Sprint 40 `BrandPanel` (left 60%) + form (right 40%). It has **no marketing Header** and **no link to signup** by design. This is consistent with LoginFormV2 and RegisterForm.

### 2.4 Rate limit — actual value in code

`src/server/actions/auth.actions.ts:90`:
```ts
const rl = await checkRateLimit(`pwd-reset:${ip}`, 3, 900);
```

That is **3 requests per 900 seconds (15 min)**, not 5/hour. SPEC-AUTH-FORGOTPW-001 treated the existing limiter as a contract to respect, and does not change it.

---

## 3. Root-cause classification per failing test

| # | Test | Symptom PO saw | Root cause | Spec that should have covered it | Effort to fix |
|---|---|---|---|---|---|
| 6 | Copy sem mencionar "IA" | Old "A NOVA ERA… / Planeje viagens incríveis… / A IA cuida dos detalhes…" still visible | **No spec authored** to rewrite hero/tools/8-phases copy. SPEC-LANDING-COPY-001 explicitly excluded this scope. | **MISSING** — needs new SPEC-LANDING-COPY-002 | ~2h (i18n strings only) |
| 7 | Textos novos aplicados | 7/7 new strings absent | Same as #6 — never written. | **MISSING** (same spec) | Included above |
| 8 | Forgot password com Header completo | Split-screen `BrandPanel`, no marketing nav | Sprint 40 V2 design decision — auth layout is intentionally minimal. No spec requires a marketing Header on this route. | **MISSING** — needs new SPEC-AUTH-FORGOTPW-002 (layout) | ~2h |
| 10 | Link "Cadastre-se grátis" no forgot-password | Absent | `ForgotPasswordForm.tsx` only links back to login. Sprint 40 design. | **MISSING** (same spec as #8) | ~30min |
| 11 | Rate limit 5/hora | Current limit is 3/15min | Neither the rate-limit contract nor the PO expectation is in any spec. | **MISSING** — needs SPEC-AUTH-FORGOTPW-003 or amendment | ~30min |

**Clusters:**
- **Cluster A (tests 6, 7):** 1 missing spec for landing copy rewrites.
- **Cluster B (tests 8, 10):** 1 missing spec for auth-V2 page layout (Header + signup link).
- **Cluster C (test 11):** 1 missing spec (or spec amendment) to change rate limit.
- **All three are additive work**, not fix-a-bug work.

---

## 4. Why Lote C (Layout) worked and Lote B (Copy/ForgotPW) did not

| Dimension | Lote C (SPEC-LANDING-LAYOUT-001) | Lote B Copy (SPEC-LANDING-COPY-001) | Lote B ForgotPW (SPEC-AUTH-FORGOTPW-001) |
|---|---|---|---|
| Spec scope matched PO expectation? | YES — spec explicitly removed AI Preview image, Lisboa balloon, "Saiba como funciona" | NO — spec explicitly excluded hero/AI copy rewrites | NO — spec was email delivery only |
| Implementation matched spec? | YES | YES | YES |
| Deployed to staging? | YES (same deploy) | YES (same deploy) | YES (same deploy) |
| PO test passes? | YES | NO (tests 6, 7) | NO (tests 8, 10, 11) |

**Conclusion:** The deploy pipeline is healthy. The ONLY difference is **scope coverage in the specs themselves**.

---

## 5. What is NOT the root cause (ruled out)

- ❌ **Wrong file edited** (e.g., `pt-BR.json` vs `pt.json`): only `pt-BR.json` + `en.json` exist; the app consumes them correctly (confirmed by successful i18n gate on 9466913).
- ❌ **Vercel edge cache staleness**: the old strings are still in the committed source — cache has nothing to do with it.
- ❌ **Feature flag**: no flag gates these strings or this page; `git grep` of the relevant keys in `FooterV2` etc. shows direct rendering.
- ❌ **Merge mistake reverting changes**: `git log --all` shows no revert commits; the two target commits are still in the linear history.
- ❌ **Deploy hash mismatch**: master HEAD (9466913) includes both commits.
- ❌ **Silent Onda 1 regression**: Tests 1–5 passed per PO; LAYOUT-001 deltas are confirmed in source.

---

## 6. Proposed fix plan (awaiting PO approval — DO NOT EXECUTE YET)

### 6.1 SPEC-LANDING-COPY-002 — Hero & sections copy rewrite (NEW)
- **Scope:** Update ~7 strings in `messages/pt-BR.json` + `messages/en.json` for hero badge, hero subtitle, tools section title/bullets, 8-phases subtitle.
- **Files:** 2 (i18n only). No component changes.
- **Effort:** ~2h (copy + PT→EN parity + unit test that scans against forbidden old strings).
- **Trust gate:** unit test gate ≥ 0.85.

### 6.2 SPEC-AUTH-FORGOTPW-002 — Auth-V2 page layout for forgot-password (NEW)
- **Scope:** Decide whether to (a) wrap `/auth/forgot-password` with the marketing Header+Footer, OR (b) add a secondary nav + signup link inside `BrandPanel`. Option (b) is consistent with the Sprint 40 V2 design language; option (a) breaks it.
- **Files:** `ForgotPasswordForm.tsx` or new `AuthPageHeader.tsx`; possibly `auth/layout.tsx`.
- **Effort:** ~2h depending on option.
- **Requires UX-agent alignment** before implementation (decision (a) vs (b)).

### 6.3 SPEC-AUTH-FORGOTPW-003 — Rate limit adjustment (NEW or amendment)
- **Scope:** Change `checkRateLimit('pwd-reset:${ip}', 3, 900)` to `(5, 3600)` per PO expectation.
- **Files:** `src/server/actions/auth.actions.ts:90`, matching test expectations.
- **Effort:** ~30min.
- **Security review required** (security-specialist sign-off): is 5/hour still safe vs abuse?

### 6.4 E2E regression prevention (Phase 4 in the original workflow)

Add Playwright smoke tests to run against staging after every deploy:
- `landing-pt.spec.ts` — asserts new hero/tools/8-phases strings present; asserts old strings absent.
- `forgot-password-layout.spec.ts` — asserts Header + "Cadastre-se grátis" link.
- `forgot-password-rate-limit.spec.ts` — asserts 429 on the 6th request within 1h.

These become a gated CI/EDD check for future pre-Beta waves.

---

## 7. Process root cause — why this regression of expectation happened

The PO-level label "Onda 2" collapsed **two different deliverables** into one perceived feature-set:
- What was **specified** (remove dead links in footer/destinations; deliver password reset emails).
- What was **expected** (rewrite marketing copy; redesign forgot-password page; tighten rate limit).

**Recommendation for process (finops/tech-lead):** Every "wave" should enumerate the SPEC-IDs it contains in `docs/specs/SPEC-STATUS.md`. PO pre-validation on staging should check against that SPEC list — not against an implicit mental model. Had that check been done, tests 6–11 would have been classified "not in scope for Wave 2" rather than "failed."

---

## 8. Stopping criteria per task instructions

- More than 3 root causes? **NO** — three clusters, but they share one root cause: spec-gap between PO expectation and written specs. Proceeding normally.
- Change to CI/CD or shared infra? **NO** — all fixes are code-level (one i18n file, one component, one line of rate-limit config) + new Playwright tests.
- Silent Onda 1 regression? **NO** — LAYOUT-001 source diff confirms the removed elements are still absent from the code.

**Awaiting PO decision** on whether to authorize authoring + implementing SPEC-LANDING-COPY-002, SPEC-AUTH-FORGOTPW-002, and SPEC-AUTH-FORGOTPW-003.
