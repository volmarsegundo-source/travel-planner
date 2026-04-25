# Sprint 46 — Execution Plan (Scenario D, Phased)

**Status:** Draft — awaiting PO review before Week 1 execution.
**Author:** release-manager (orchestration) + product-owner + tech-lead + architect + qa-engineer + security-specialist (architect stand-in) + devops-engineer + finops-engineer.
**Date:** 2026-04-24
**Decision basis:** `docs/sprint-planning/sprint-46-planning.md` §4 Scenario D (PO-approved).
**Related artifacts:** 9 V2 SPECs in `docs/specs/sprint-46/`; 4 candidate SPECs in `docs/specs/sprint-46-candidates/`; `docs/specs/bdd/sprint-46-goals.feature`.

---

## §1 — Grounding summary (updates to planning doc)

### 1.1 Scope confirmed

Sprint 46 executes **Scenario D Phase 1** (S46):
- V2 Waves 1-2 (40 pts, 12-15d parallel per SPEC-TECHLEAD §2)
- 3 core governance SPECs (SEC-AUDIT, TEST-MOCK-ASSERTION, OBSERVABILITY-SENTRY)
- Critical tech debt: CI fix, EDD gates fix, Redis Staging decision
- Security follow-ups: F-01 LOW, F-02 MEDIUM
- SPEC-PROCESS-RETROSPECTIVE-BUG-C (iter 1-5 retroactive documentation)

**S47 will cover**: V2 Waves 3-5 (60 pts), Profit/Ranking (now reframed — see §6), iter 1-6 governance retroactive (if still pending), Beta readiness.

### 1.2 Major Phase 0 discovery — Profit/Ranking are NOT greenfield

Grep of `src/` reveals both concepts **already implemented**:

| Concept | Existing location | Current behaviour |
|---|---|---|
| Profit scoring | `src/server/services/admin-dashboard.service.ts:63-90` | `PerUserProfitRow` with `profitCents = totalPurchasedCents − estimatedAiCostCents` |
| Profit sorting | `src/app/[locale]/(app)/admin/dashboard/AdminDashboardClient.tsx:28` | Sort by `"revenue" \| "aiCost" \| "profit" \| "rank"` |
| User ranking | `UserProgress.currentRank` | Hardcoded tiers (novato → desbravador → navegador → capitao → aventureiro → lendario) via `PointsEngine` |

**Implication**: "Profit scoring rules" and "Dynamic ranking" are **refinements of existing features**, not greenfield builds. Scope shrinks dramatically from the planning-doc estimate. See §6 for three refined approaches.

### 1.3 V2 granularity confirmed

Wave 1 has 8 enumerated tasks (`T-W1-001`..`T-W1-008`) with sizes S/M/L and dependencies in SPEC-TECHLEAD §3. Wave 2 lists deliverables; I derive 9 tasks (`T-W2-001`..`T-W2-009`) below. **No Sprint Zero for V2 required**.

### 1.4 PO decisions (registered 2026-04-24)

Three decisions registered at sprint kickoff:

1. **C-04 Gemini timeout ADR**: KEPT in Sprint 46 as early-week priority. Rationale (PO): V2 Waves 1-2 include Prompt Registry work whose schema could be affected if the ADR picks Edge-migration as the direction. Deciding first avoids Wave 2 rework.
2. **Profit Scoring + Dynamic Ranking**: **Approach 1** — Sprint Zero parallel during S46. PO writes SPECs at 0.5 day/week cadence. Approach 3 (post-Beta deferral) remains valid fallback if PO load exceeds capacity.
3. **Sprint 46 retrospective format**: 5 agents independent inputs (PO + tech-lead + qa-engineer + security-specialist + architect) → PO synthesis → review loop. Eliminates single-author bias from Sprint 45. Full format in §9.

Sections 3 (schedule), 4 (DoD), 6 (Profit/Ranking), 7 (risk), 8 (success criteria), 9 (new) reflect these decisions.

---

## §2 — Executable items (Block A-E, 22 items)

Ownership assumes the project's 13-agent model. Effort ranges are the tech-lead's best estimate, not independently verified.

### Block A — Governance core (3 SPECs, ~15h)

| ID | Item | SPEC ref | Effort | Owner | DoD summary |
|---|---|---|---|---|---|
| A-01 | SPEC-SEC-AUDIT-001 execution: walk every SPEC-SEC-* + middleware + guards + encryption + rate-limit; produce findings log with P0/P1/P2 severities | `sprint-46-candidates/SPEC-SEC-AUDIT-001.md` | 6-10h | security-specialist (architect stand-in) | ≥1 anti-pattern removed; findings doc committed; SPEC v1.0.0→v1.1.0 |
| A-02 | SPEC-TEST-MOCK-ASSERTION-001: review rule + lint/static-analysis check for mock-only assertions | `sprint-46-candidates/SPEC-TEST-MOCK-ASSERTION-001.md` | 4-8h | qa-engineer + architect | rule doc + ≥3 test files refactored or documented-deferred |
| A-03 | SPEC-OBSERVABILITY-SENTRY-001: wire `@sentry/nextjs` for Server Action + middleware errors | `sprint-46-candidates/SPEC-OBSERVABILITY-SENTRY-001.md` | 3-5h | devops-engineer | Server Action error → Sentry within 60s; FinOps cost confirmation |

### Block B — V2 Foundation (Waves 1-2, ~40 pts)

#### B.1 — V2 Wave 1 (esqueleto + auth + feature flag, 5-6d)

Source: `SPEC-TECHLEAD-AI-GOVERNANCE-V2` §3.

| ID | Item | Size | Owner | Depends |
|---|---|---|---|---|
| B-W1-001 | Feature flag `AI_GOVERNANCE_V2` + `isAiGovernanceV2Enabled()` helper in `src/lib/env.ts` | S | dev-fullstack-1 | — |
| B-W1-002 | Prisma migration `20260417000001_ai_governance_v2` (5 new models + field additions) | L | dev-fullstack-1 | B-W1-001 |
| B-W1-003 | Seed `ModelAssignment` + `AiRuntimeConfig` (hardcoded defaults) | M | dev-fullstack-1 | B-W1-002 |
| B-W1-004 | `AuditLogService` (append-only insert) | M | dev-fullstack-1 | B-W1-002 |
| B-W1-005 | RBAC middleware: role `admin-ai` gate on `/api/admin/ai/*` and `/admin/ia` | M | dev-fullstack-2 | B-W1-001 |
| B-W1-006 | Admin UI shell: aba IA + 4 tabs skeleton (Dashboard, Prompts, Modelos, Outputs) | M | dev-fullstack-2 | B-W1-005 |
| B-W1-007 | Health check endpoint `GET /api/health/ai-config` (healthy/degraded/unhealthy) | S | dev-fullstack-2 | B-W1-002 |
| B-W1-008 | Unit + integration tests for Wave 1 (≥ 80% coverage on new services) | M | both devs | B-W1-004, B-W1-006 |

#### B.2 — V2 Wave 2 (editor de prompts + versionamento, 7-9d)

Source: `SPEC-TECHLEAD-AI-GOVERNANCE-V2` §3 (deliverables list, tasks derived below). Wave 2 SPEC refs: `SPEC-PROD AC-13..AC-21`, `SPEC-ARCH §5.1`, `SPEC-AI §§2-3`.

| ID | Item | Size | Owner | Depends |
|---|---|---|---|---|
| B-W2-001 | API endpoints `GET/POST /api/admin/ai/prompts` + `PATCH /api/admin/ai/prompts/:id` | M | dev-fullstack-1 | B-W1-004 |
| B-W2-002 | Immutable `PromptVersion` model + auto-increment semver patch bump | M | dev-fullstack-1 | B-W2-001 |
| B-W2-003 | 8 blocking validations V-01..V-08 (placeholders, token budget, PII, API key, internal URL) | L | dev-fullstack-1 | B-W2-001 |
| B-W2-004 | 4 warning validations W-01..W-04 | M | dev-fullstack-1 | B-W2-003 |
| B-W2-005 | Token-count heuristic `ceil(chars/3.5)` | S | dev-fullstack-1 | B-W2-001 |
| B-W2-006 | UI: template list + editor with placeholder highlighting | L | dev-fullstack-2 | B-W1-006 |
| B-W2-007 | UI: side-by-side diff viewer | M | dev-fullstack-2 | B-W2-002 |
| B-W2-008 | UI: preview panel with mock data | M | dev-fullstack-2 | B-W2-006 |
| B-W2-009 | Wave 2 tests — V-02 blocks forbidden placeholder, V-06 blocks real PII, diff renders (≥ 80% coverage on validations) | M | both devs | B-W2-003, B-W2-007 |

### Block C — Critical tech debt (3-5d)

| ID | Item | Effort | Owner | Notes |
|---|---|---|---|---|
| C-01 | CI fix: `tests/unit/scripts/project-bootstrap.test.ts:69` skip on CI when `.env.local` absent | 0.5h | devops-engineer | Single-line assertion change + comment |
| C-02 | EDD Eval Gates: fix exit code so `npm run eval:gate` exits 0 on pass | 1-2h | qa-engineer + devops | Pre-existing since pre-Sprint-45 |
| C-03 | Redis Staging provider decision (Upstash paid / Vercel KV / self-hosted) + ADR + smoke test | 2-4h | devops-engineer + finops-engineer | Decision doc required before any V2 Wave that depends on Staging Redis |
| C-04 | **Gemini timeout ADR** (Edge migration vs Claude fallback) + chosen-option implementation. **PO-confirmed priority 2026-04-24**: ADR Week 1 Days 1-3, implementation Days 4-8. Hard gate for B-W2-001 start (if ADR changes PromptVersion schema). | 2-5d | tech-lead + architect draft; devops-engineer + dev-fullstack-1 implement | **PO decision §1.4**: landed in S46. |

### Block D — Security follow-ups (2-4h)

| ID | Item | Effort | Owner | Source |
|---|---|---|---|---|
| D-01 | F-01 LOW: add `/expeditions` to `PROTECTED_PATH_SEGMENTS` in `src/middleware.ts:31` | 0.25h | dev-fullstack-1 | iter 7 security audit §7 |
| D-02 | F-02 MEDIUM: `canUseAI(null)` returns `false`; audit callers for permissive assumption | 2-3h | security-specialist + dev-fullstack | iter 7 security audit §7 |

### Block E — Retroactive governance (4-8h)

| ID | Item | Effort | Owner | Source |
|---|---|---|---|---|
| E-01 | SPEC-PROCESS-RETROSPECTIVE-BUG-C §1-2: BUG-C retrospective doc + crisis-governance minimum in `SDD-PROCESS.md` | 3-5h | product-owner + tech-lead | `SPEC-PROCESS-RETROSPECTIVE-BUG-C.md` §§1-2 |
| E-02 | SPEC-PROCESS-RETROSPECTIVE-BUG-C §3.1: adapter-integration tests for remaining Auth.js callbacks (jwt + session) | 1-3h | qa-engineer + architect | Same SPEC §3.1 |

**Note**: §3.2 (MSW OAuth stub) and §3.3 (retroactive audit of pre-db73225 specs) remain in **S47 scope** per Scenario D planning. Block E is the documentation/quick-coverage slice; the full harness slides to S47.

### Totals

| Block | Items | Aggregate effort |
|---|---:|---|
| A — Governance core | 3 | 13-23h |
| B.1 — V2 Wave 1 | 8 | 5-6d (2 devs parallel) |
| B.2 — V2 Wave 2 | 9 | 7-9d (2 devs parallel) |
| C — Tech debt | 4 | 3-6d |
| D — Security | 2 | 2-4h |
| E — Retroactive | 2 | 4-8h |
| **Grand total** | **28** | **12-15d parallel dev + 15-25h for non-dev agents (A/E)** |

**The prompt's target was "~18-25 items". We landed at 28** — slightly higher because V2 Waves 1-2 are enumerated at task granularity. The non-V2 blocks alone total 11 items which fits the band.

---

## §3 — 3-week schedule + critical path

Calendar assumes 2 devs in parallel for V2; 1 dedicated non-dev agent per Block-A/D/E item; 15% buffer applied.

### Week 1 (days 1-5): foundation unblock + Gemini ADR

| Day | Thread 1 (dev-1) | Thread 2 (dev-2) | Non-dev agents |
|---|---|---|---|
| 1 | B-W1-001 (flag) + B-W1-002 (migration start) | C-01 (CI fix, 0.5h) → D-01 (F-01, 0.25h) → B-W1-005 (RBAC) | A-01 kickoff (SEC-AUDIT discovery) + **C-04 ADR draft — tech-lead + architect** |
| 2 | B-W1-002 cont. + B-W1-003 (seed) | B-W1-005 cont. + B-W1-006 (UI shell) | A-01 cont. + C-02 (EDD fix, 1-2h) + **C-04 ADR cont.** |
| 3 | B-W1-004 (AuditLogService) | B-W1-006 cont. + B-W1-007 (health) | A-01 findings draft + C-03 (Redis decision draft) + **C-04 ADR publish + PO sign-off on direction** |
| 4 | B-W1-004 tests | B-W1-008 start (integration tests) | A-02 kickoff (MOCK-ASSERTION rule) + D-02 (F-02 canUseAI) + **C-04 implementation start (devops lead)** |
| 5 | **Wave 1 review + gate** | Wave 1 review + gate | A-01 commit + A-02 cont. + C-03 decision commit + **C-04 implementation cont.** |

Critical path: **B-W1-001 → B-W1-002 → B-W1-004 → [C-04 ADR publish Day 3] → B-W2-001**. C-04 ADR publication Day 3 is a **hard gate** for B-W2-001 start: if the ADR picks Edge migration, PromptVersion model schema may need adjustment before API endpoints are locked. B-W2-001 starts Day 6, giving a 3-day buffer between C-04 ADR and Wave 2 dependency — acceptable.

### Week 2 (days 6-10): prompt editor + observability

| Day | Thread 1 (dev-1) | Thread 2 (dev-2) | Non-dev agents |
|---|---|---|---|
| 6 | B-W2-001 (API endpoints) | B-W2-006 (editor UI start) | A-02 wrap-up + A-03 kickoff (Sentry forwarder) |
| 7 | B-W2-002 (versioning) + B-W2-003 start (validations) | B-W2-006 cont. + B-W2-007 (diff viewer) | A-03 cont. + E-02 adapter tests (jwt callback) |
| 8 | B-W2-003 cont. | B-W2-007 cont. + B-W2-008 (preview) | A-03 commit + E-02 session callback |
| 9 | B-W2-004 (warnings) + B-W2-005 (token count) | B-W2-008 cont. + B-W2-009 start | E-01 retrospective doc draft + **C-04 implementation wrap-up + staging smoke** |
| 10 | **Mid-sprint gate** (V2 W2 backend ≥ 80% coverage + C-04 smoke ≥ Phase 5/6 < 55s) | Mid-sprint gate (V2 W2 UI complete) | PO Sprint Zero parallel — Profit Scoring SPEC Week 2 checkpoint |

Critical path continues: **B-W1-004 → B-W2-001 → B-W2-003 → B-W2-009**.

### Week 3 (days 11-15): wave 2 close + retrospective + buffer

| Day | Thread 1 | Thread 2 | Non-dev agents |
|---|---|---|---|
| 11 | B-W2-009 (validation tests) | B-W2-009 (UI tests) | E-01 commit + **5-agent retrospective inputs Day 1** (PO + tech-lead + qa + sec + architect each start own file) |
| 12 | Wave 2 integration | Wave 2 integration | 5-agent retrospective inputs continue |
| 13 | Wave 2 gate + Trust Score | Wave 2 gate + Trust Score | 5-agent inputs committed + PO synthesis starts |
| 14 | **Buffer day** (15%) | **Buffer day** | Retrospective synthesis + PO Sprint Zero — Profit/Ranking SPECs final review by tech-lead + architect |
| 15 | Sprint close gate + release notes | — | Retrospective review loop + Sprint 46 review doc + Trust Score close-out + Sprint 47 planning input |

### Critical path

**B-W1-001 → B-W1-002 → B-W1-004 → B-W2-001 → B-W2-003 → B-W2-009 → Sprint close**.

Length: ~11 working days (3 weeks minus buffer minus close). Parallelism reduces wall-clock; if any node slips by >1 day, one of:
- Move `B-W2-009` (test coverage) to S47 start-of-sprint (DoD-as-debt)
- Trim Wave 2 scope to backend-only + basic UI (defer diff + preview to S47)
- Remove C-04 Gemini from S46 (was flagged assumption anyway)

**Parallelizable off-critical-path**: Block A (3 SPECs) + Block D (2 fixes) + Block E (2 items) + C-01/C-02/C-03. Total ~20-30h across the sprint, distributable across the non-dev agent roster (qa, sec, ops, architect, PO, tech-lead).

---

## §4 — Definition of Done per item

DoD is binary — every criterion is yes/no.

### A-01 SEC-AUDIT execution

- [ ] `docs/qa/sec-audit-findings-2026-04-XX.md` committed with ≥1 entry per SPEC-SEC-* file walked.
- [ ] Each finding tagged P0/P1/P2 per SPEC §3 rubric.
- [ ] ≥1 anti-pattern actually removed from `src/` (not just documented).
- [ ] `SPEC-SEC-AUDIT-001.md` bumped v0.1.0 → v1.1.0 with change-history row.
- [ ] security-specialist + architect sign-off inline in the findings doc.
- [ ] Trust Score Safety dim ≥ 0.95 post-audit.

### A-02 MOCK-ASSERTION rule

- [ ] Rule documented in `docs/specs/SDD-PROCESS.md` as new "Mock assertion policy" section.
- [ ] Lint rule (ESLint custom or `eslint-plugin-vitest`) OR grep-based pre-commit check committed.
- [ ] ≥3 existing test files refactored to match rule OR documented in `docs/qa/mock-assertion-deferred.md` with rationale.
- [ ] qa-engineer + tech-lead sign-off.
- [ ] SPEC-TEST-MOCK-ASSERTION-001 bumped v0.1.0 → v1.1.0.

### A-03 OBSERVABILITY-SENTRY

- [ ] `@sentry/nextjs` wired via `src/lib/logger.ts` error forward.
- [ ] Server Action error reaches Sentry dashboard within 60 s (manual smoke).
- [ ] Middleware error reaches Sentry (manual smoke).
- [ ] `finops-engineer` confirms projected cost ≤ upper bound in `sprint-46-planning.md` §9 (+$0-26/mo).
- [ ] devops-engineer sign-off.

### B-W1-001..008 V2 Wave 1

- [ ] All 8 "Criterio de pronto" items in SPEC-TECHLEAD §3 Wave 1 checked.
- [ ] Migration applies AND reverts cleanly in Staging.
- [ ] Flag OFF hides admin/ia tab; flag ON shows it (visual diff).
- [ ] Health check endpoint responds in 3 states.
- [ ] ≥ 80% coverage on new services.
- [ ] Wave-scoped trust score ≥ 0.90.
- [ ] tech-lead + qa-engineer sign-off.

### B-W2-001..009 V2 Wave 2

- [ ] All 6 "Criterio de pronto" items in SPEC-TECHLEAD §3 Wave 2 checked.
- [ ] V-01..V-08 all produce blocking errors in unit tests.
- [ ] V-06 blocks `ada@example.com` and `123.456.789-00` (CPF).
- [ ] Diff viewer renders for any 2 versions.
- [ ] Audit log row written on every prompt write.
- [ ] ≥ 80% coverage on validations.
- [ ] Wave-scoped trust score ≥ 0.90.
- [ ] tech-lead + qa-engineer sign-off.

### C-01 CI bootstrap test fix

- [ ] Test passes on a fresh CI runner with no `.env.local`.
- [ ] Commit message references `SPEC-TECHDEBT-CI-001` (or successor).

### C-02 EDD Eval Gates fix

- [ ] `npm run eval:gate` exit code 0 on pass, 1 on real failure.
- [ ] README / eval docs updated if exit-code behaviour documented.

### C-03 Redis Staging provider decision

- [ ] ADR `docs/architecture/ADR-XXX-redis-staging.md` committed.
- [ ] Provider chosen (Upstash / KV / self-hosted) with cost rationale.
- [ ] Staging Redis smoke: set + get round-trip in < 100 ms.
- [ ] devops + finops sign-off.

### C-04 Gemini timeout ADR + fix

- [ ] ADR with 2 options + chosen direction + rationale, **published by end of Day 3**.
- [ ] **Gate check on Day 3**: PO reviews ADR direction; architect + tech-lead co-sign. B-W2-001 start (Day 6) is **blocked** until this gate passes.
- [ ] If ADR picks "Edge migration" direction: `PromptVersion` and `AiConfigResolver` schema review by architect to confirm no Wave 2 API contract changes required (or document required changes explicitly).
- [ ] Implementation landed (either Edge migration or Claude fallback) by end of Day 9.
- [ ] Staging smoke: Phase 5 + Phase 6 generations complete in < 55 s (beneath Vercel Hobby cap), captured Day 10 (mid-sprint gate).
- [ ] finops-engineer confirms cost delta (Edge tier billing change OR Anthropic credit refill) within projected envelope (`sprint-46-planning.md` §9 C-04 row).
- [ ] tech-lead + architect + devops-engineer + finops-engineer sign-off inline in the ADR.

### D-01 F-01 fix

- [ ] `/expeditions` segment in `PROTECTED_PATH_SEGMENTS`.
- [ ] Unit test asserts middleware catches unauthenticated access to `/expeditions/trip-123`.

### D-02 F-02 fix

- [ ] `canUseAI(null)` returns `false`.
- [ ] Every caller audited; no breakage from default change.
- [ ] BDD scenario covers "null birthDate → AI blocked".
- [ ] security-specialist sign-off.

### E-01 BUG-C retrospective

- [ ] `docs/sprint-reviews/BUG-C-RETROSPECTIVE-2026-04-24.md` committed.
- [ ] Crisis-governance minimum section added to `docs/specs/SDD-PROCESS.md`.
- [ ] PO + tech-lead sign-off.

### E-02 Adapter-integration tests

- [ ] `src/lib/__tests__/auth.test.ts` extended for `jwt` + `session` callbacks.
- [ ] Tests assert `Object.keys(token)` ⊆ JWT-valid fields; `Object.keys(session)` matches `Session` type.
- [ ] qa-engineer sign-off.

---

## §5 — Governance tier per item

Governance tier = the smallest acceptable governance envelope per SPEC-PROCESS-RETROSPECTIVE-BUG-C "crisis minimum" concept (to be codified in E-01).

| Tier | Artifacts required | Applicable |
|---|---|---|
| **Full (SDD+TDD+BDD+EDD+13-agent)** | SPEC change-history, failing test first, BDD scenario update, 9-dim trust score, ≥3 agent sign-offs | Behavior-changing code on critical paths |
| **Proportional (TDD+EDD)** | Failing test first, test coverage, 1-2 agent sign-off | Localized fixes with well-bounded impact |
| **Docs-only** | Written artifact, 1-2 agent sign-off | Retrospective or process docs, no code change |

| Item | Tier | Justification |
|---|---|---|
| A-01 SEC-AUDIT | Full | Security-boundary audit; findings may cascade to more commits |
| A-02 MOCK-ASSERTION | Proportional | Process rule + lint; no runtime behavior change |
| A-03 OBSERVABILITY-SENTRY | Proportional | Wiring only; observability-class change |
| B-W1-001..008 | Full per SPEC-TECHLEAD | Wave 1 coverage ≥ 80%, integration tests, migration reversibility |
| B-W2-001..009 | Full per SPEC-TECHLEAD | Wave 2 validations are security-relevant (PII scrub, API key detection) |
| C-01 CI fix | Proportional | One-line fix; CI proves correctness |
| C-02 EDD fix | Proportional | Exit-code fix; CI proves correctness |
| C-03 Redis ADR | Docs-only (+ smoke) | Decision doc + smoke, no production behavior change yet |
| C-04 Gemini ADR + fix | Full | Production AI path; affects every user |
| D-01 F-01 | Proportional | One-line middleware change; unit test suffices |
| D-02 F-02 | Full | Permissive-default change could break existing flows; needs caller audit + BDD |
| E-01 Retrospective | Docs-only | No code change |
| E-02 Adapter tests | Proportional | Test additions; no production code change |

### 5.1 What "Proportional" simplifies

- Skip BDD scenario if existing coverage already documents the behaviour.
- Skip 9-dim trust score if only one dimension is affected (score that one dim).
- Reduce sign-off from 3+ agents to 1-2 (the owner + one reviewer).
- SPEC change-history still required but not a new section (row append sufficient).

### 5.2 What "Docs-only" simplifies further

- No test requirement (no code under test).
- No trust score recomputation.
- One sign-off (the author) + review by a second reader.

---

## §6 — Profit Scoring + Dynamic Ranking — Approach 1 (PO decision, 2026-04-24)

**Decision registered**: Approach 1 — Sprint Zero parallel during Sprint 46.

**PO rationale (from kickoff 2026-04-24)**: "1-2 days of PO attention is acceptable; compensates for the desire to have these documented before Beta."

### 6.1 Structure

PO (Volmar) produces `SPEC-PROFIT-SCORING-001` and `SPEC-DYNAMIC-RANKING-001` in parallel to Sprint 46 execution. Both SPECs must reach **approved** status before Sprint 46 closes, so Sprint 47 can consume them in Wave 3+ planning.

### 6.2 Deliverables

| Path | Purpose |
|---|---|
| `docs/specs/sprint-46-parallel/SPEC-PROFIT-SCORING-001.md` | 9-dimension SPEC covering configurable profit rules on top of existing `PerUserProfitRow` |
| `docs/specs/sprint-46-parallel/SPEC-DYNAMIC-RANKING-001.md` | 9-dimension SPEC covering dynamic rank threshold rules on top of existing `UserProgress.currentRank` |
| `docs/specs/sprint-46-parallel/research/` | Existing implementation snapshots + edge cases discovered during SPEC writing |

### 6.3 PO weekly allocation (0.3 day/week cadence — R-03-A applied 2026-04-24)

**Rationale (R-03-A from `docs/qa/sprint-46-pendentes-recommendations.md`)**: deeper grounding revealed both SPECs are smaller than originally feared:

- Dynamic Ranking — 2 ghost ranks to fill (not 4 as the original grounding overstated). `B47-RANK-FILL` registered in Sprint 47 BACKLOG handles the content addition.
- Profit Scoring — heuristic is intentional design, not a calculation bug. SPEC-PROFIT-SCORING-001 §4 documents this; no implementation change in S46.

PO weekly allocation reduced 0.5d → 0.3d. Total Sprint 46 PO commitment: ~1 day (down from 2). Frees ~0.6 days for other Sprint 46 review surfaces or buffer.

| Week | Day block | Activity |
|---|---|---|
| 1 | 0.3 day | Profit Scoring §2-3 draft — SPEC-PROD + SPEC-UX dimensions (§4 already seeded by R-02-B commit) |
| 2 | 0.3 day | Profit Scoring §5-8 cont. — SPEC-TECH + SPEC-SEC + SPEC-QA dimensions |
| 2 | 0.3 day | Dynamic Ranking SPEC §2-3 draft — SPEC-PROD + SPEC-UX (note: scope shrunk per R-01-A; ghost ranks deferred to S47 B47-RANK-FILL) |
| 3 | 0.3 day | Dynamic Ranking cont. + both SPECs reviewed by tech-lead + architect |

### 6.4 Ownership

- **Author**: PO (Volmar).
- **Reviewers**: tech-lead, architect, security-specialist (per dimension as applicable).
- **Sign-off gate**: both SPECs in `Approved` status before Sprint 46 closing. If not met, fallback per §6.6.

### 6.5 Risks + mitigations

| Risk | Mitigation |
|---|---|
| PO split attention impacts BOTH sprint execution AND SPEC quality | 0.5 day/week is *dedicated* — no blending with execution review calls during that block |
| Week 2 check shows SPECs taking > 1 day/week actual | Escalate to PO for re-evaluation; fallback to Approach 3 (post-Beta deferral) on the spot is acceptable without guilt |
| PO cognitive load trending toward burnout | Self-monitored; deferral is the safe default, not a failure |

### 6.6 Gate to Sprint 47

Both SPECs in approved state before Sprint 47 planning kicks off. Two fallback paths:

- **Fallback A**: Sprint 47 absorbs remaining SPEC work in a "Sprint Zero Mini" Day 1-3 block (was Approach 2 in planning doc §4).
- **Fallback B**: SPECs deferred post-Beta entirely (was Approach 3). No Beta-launch impact because the static implementations are already functional.

**Either fallback is pre-approved** — PO does not need a new decision round if Approach 1 slips. Sprint 47 planning picks whichever fits capacity.

---

## §7 — Risk register

Per-agent dimension. Severities: P0 blocks Sprint 46 close; P1 impacts quality; P2 tracked but tolerable.

### 7.1 Technical (tech-lead)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R46-T01 | V2 Wave 1 migration reveals schema conflict with existing `AiKillSwitch` model | P1 | SPEC-TECHLEAD §6.2 INC-09 already plans the migration; test revert in staging before production |
| R46-T02 | V2 Wave 2 validation logic (V-01..V-08) more complex than estimated | P1 | Size L in plan; mitigate by pushing V-04..V-08 to S47 if mid-sprint trust score wavers |
| R46-T03 | Redis Staging decision blocks A-03 Sentry if Sentry needs Redis for rate-limit | P2 | Sentry doesn't require Redis; reconfirm A-03 has no hidden dep |
| R46-T04 | V2 polling DB hot-path latency exceeds 20 ms budget | P1 | Wave 3 concern not Wave 1-2; flag for S47 review |
| R46-T05 | C-04 Gemini ADR discovers deeper incompatibility (Edge migration blocks current Server Action auth refresh chain) | P1 | ADR surfaces incompatibility BEFORE fix; rollback to Claude fallback keeps AI working |
| R46-T06 | **C-04 ADR cascading into Wave 2 rework** — if ADR picks Edge migration and `PromptVersion` / AiConfigResolver schema is affected, B-W2-001 (API endpoints) may need contract changes mid-sprint | **P1** | C-04 ADR publish is a **hard gate on Day 3** (before B-W2-001 starts Day 6). Architect signs off on schema-compat review inline in ADR. If ADR picks Claude fallback (simpler path), no schema impact. |

### 7.2 Process (product-owner + release-manager)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R46-P01 | Single-author retrospective bias (Sprint 45 lesson L-02) | P1 | **RESOLVED by §9 decision** — 5-agent independent inputs + review loop is the format. Risk shifts from "will we do it" to "can all 5 agents contribute in Week 3" (tracked as R46-P05 below) |
| R46-P02 | Unplanned bug discovery (Sprint 45 had 5 in 6 days) | P1 | 15% buffer (Day 14) + scope-cut playbook on path §3 |
| R46-P03 | PO parallel load — Approach 1 for Profit/Ranking splits PO attention across S46 execution AND SPEC writing | **P1** | 0.5 day/week dedicated to SPECs (no blending). Week 2 check: if actual > 1 day/week, fallback to Approach 3 without guilt. See §6.5 mitigations. |
| R46-P04 | Governance slippage under perceived urgency (Sprint 45 Stop item St-01) | P1 | Crisis-governance minimum from E-01 codified Day 9; apply to any urgency-mode commit |
| R46-P05 | Multi-agent retrospective (§9) blocked — one of 5 agents unable to contribute by Day 13 | P2 | Documented-absence is acceptable; synthesis notes "agent X did not contribute because Y". Silent omission is not. Gate per §9.5 |

### 7.3 Security (security-specialist / architect stand-in)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R46-S01 | SEC-AUDIT (A-01) finds more P1 items than Sprint 46 can absorb | P1 | Accept the finding log into S47 backlog; don't block S46 close on remediation |
| R46-S02 | F-02 (`canUseAI(null)` change) reveals callers that depend on permissive default (data-import pipelines, admin seed scripts) | P1 | D-02 DoD includes caller audit; if breakage found, add a named allowlist |
| R46-S03 | V2 Wave 2 validations miss a PII variant (e.g. RG, CNH) | P2 | V-06 has core set; expansion to Brazilian-specific IDs tracked as Sprint 47 follow-up if gap found |

### 7.4 FinOps (finops-engineer)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R46-F01 | Sentry tier upgrade exceeds projected $0-26/mo due to A-03 error volume | P2 | A-03 DoD gates on finops cost confirmation within 24 h of go-live |
| R46-F02 | Redis provider choice (C-03) ends up at higher cost than Upstash free tier | P2 | ADR documents alternatives; finops sign-off on choice |
| R46-F03 | Gemini fix option (C-04) — Edge runtime migration may change Vercel tier billing model | P2 | ADR includes cost comparison; finops reviews before implementation |

### 7.5 DevOps (devops-engineer)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R46-D01 | CI fix (C-01) masks more runner-env-dependent test failures | P2 | Run CI 3× after C-01 fix; look for new red |
| R46-D02 | C-03 Redis Staging provisioning takes longer than 2-4h (vendor onboarding) | P2 | Start provisioning on Day 1; don't block V2 Wave 1 which doesn't need Redis |

### 7.6 Aggregate exposure

- **6 P1 Technical (R46-T01..T06) + 4 P1 Process (P02-P04 active; P01 resolved by §9; +P03 new from Approach 1) + 3 P1 Security = 13 active P1 risks**. 15% buffer absorbs 1-2. More than 3 simultaneous P1 realizations → scope cut decision by Day 10.
- All P0 risks already burned during Sprint 45 (Auth.js rotation race, schema drift, CSP nonce). No P0 carrying into Sprint 46.
- Two **new** P1 risks introduced by PO decisions 2026-04-24: **R46-P03** (PO parallel load from Approach 1 Profit/Ranking) and **R46-T06** (C-04 ADR Wave 2 cascading).

---

## §8 — Success criteria

### 8.1 Must-have (gate condition for Sprint 46 close)

- [ ] **Block A (3 SPECs)**: all 3 closed with DoD checkmarks.
- [ ] **V2 Wave 1**: foundation functional with flag toggle.
- [ ] **V2 Wave 2**: prompt editor CRUD + versioning + V-01..V-08 validations working.
- [ ] **C-04 Gemini ADR + implementation**: published Day 3, staging smoke Phase 5/6 < 55s by Day 10.
- [ ] **Trust Score composite ≥ 0.93** (no regression from Sprint 45 close).
- [ ] **Zero open P0 or unresolved P1 security findings** from A-01.
- [ ] **Multi-agent retrospective (§9)**: 5 input files + synthesis + review loop complete, OR documented-absence for any missing agent (per §9.5).
- [ ] Sprint 46 review doc + retrospective doc committed.

### 8.2 Should-have (strong goal; miss = note in retrospective)

- [ ] **Block C (tech debt)**: C-01 + C-02 closed (CI + EDD). C-03 decision doc landed.
- [ ] **F-01 + F-02** resolved (Block D).
- [ ] **Profit Scoring + Dynamic Ranking SPECs in Approved status** — signals Approach 1 success. Fallback A or B (§6.6) triggers if not.
- [ ] BDD file `sprint-46-goals.feature` expanded with Wave-specific + C-04 + retrospective + Profit/Ranking scenarios (Phase 8 of this kickoff + this close commit).

### 8.3 Could-have (bonus; miss = Sprint 47 carry-over)

- [ ] Sprint 47 planning doc started.
- [ ] V2 Wave 3 spike / scoping pre-work (non-binding preview of S47 critical path).

### 8.4 Gate condition failure response

If Must-have §8.1 is not all ✅ on Day 14 (buffer day):
1. tech-lead + PO triage which Must-haves are at risk.
2. Scope-cut playbook from §3 applies (move test coverage / Wave 2 UI polish to S47 start).
3. Sprint extension of up to 3 additional days allowed ONCE (budget warning).
4. If extension still insufficient → Sprint 46 declared "partial close" with transparent S47 scope expansion + retrospective entry "why didn't we cut earlier".

---

## §9 — Sprint 46 Retrospective Format (PO decision, 2026-04-24)

**Decision registered**: 5-agent independent inputs → PO synthesis → review loop.

**PO rationale**: Sprint 45 retrospective flagged single-author bias (memo §L-02). Sprint 46 eliminates it by having 5 agents contribute independent perspectives before any synthesis.

### 9.1 Objective

Eliminate single-author bias flagged in `sprint-45-retrospective.md`. Produce Sprint 46 retrospective with independent input from 5 agents before any synthesis.

### 9.2 Agents + dimensions (5 slots)

1. **product-owner (PO / Volmar)** — product outcomes, scope delivery, PO cognitive load / capacity signals, PO-facing friction.
2. **tech-lead** — technical execution, code quality, architectural fit, critical-path adherence, scope-cut decisions if invoked.
3. **qa-engineer** — test coverage, BDD/TDD discipline, trust score evolution, red-green-refactor adherence.
4. **security-specialist** (architect stand-in) — security findings from A-01, threat model deltas, audit outcomes, governance-minimum adherence.
5. **architect** — system-level coherence, V2 Waves 1-2 integration quality, ADR outcomes (C-04), debt decisions.

### 9.3 Process

**Step 1 — Independent contribution (no cross-reading)**

Each agent writes own input to `docs/sprint-reviews/sprint-46-retro-inputs/{agent}.md` with:
- **What worked** (3-5 items with specific code / commit / SPEC references)
- **What didn't** (3-5 items with specific references)
- **What to change** (3-5 items actionable in Sprint 47)
- Cross-cutting observations (optional)

Agents MUST NOT read each other's drafts before committing their own. Inputs committed by Day 13 (Week 3 Day 3).

**Step 2 — Synthesis (PO-led with full transparency)**

PO reads all 5 inputs, produces consolidated `docs/sprint-reviews/sprint-46-retrospective.md` with:
- Start / Stop / Continue merged from 5 inputs, grouped by theme
- **Divergences between agents explicitly noted** — if tech-lead says X worked and qa-engineer says X didn't, the disagreement appears in the doc (not hidden)
- Action items with owner + deadline

Synthesis committed by Day 14.

**Step 3 — Review loop**

All 5 agents review the synthesis. Each can add, contest, or confirm. Final version PO-signed on Day 15.

### 9.4 Deliverables at Sprint 46 close

- 5 input files: `docs/sprint-reviews/sprint-46-retro-inputs/product-owner.md`, `tech-lead.md`, `qa-engineer.md`, `security-specialist.md`, `architect.md`.
- Synthesis: `docs/sprint-reviews/sprint-46-retrospective.md`.
- Action items tracked with owner + deadline inside the synthesis doc.

### 9.5 Gate condition

**Sprint 46 does not formally close without this multi-agent retrospective.** Missing any of the 5 inputs or skipping the review loop blocks close. If an agent slot cannot contribute (scheduling conflict), that MUST be documented in the synthesis as "agent X did not contribute because Y" — no silent omissions.

This is a hard gate codified in §8 Must-have.

---

## §10 — BDD expansion (Phase 8 deliverable)

`docs/specs/bdd/sprint-46-goals.feature` is expanded with:
- **Wave 1 end-to-end acceptance scenario** (feature flag toggle + migration revert + health check 3-state).
- **Wave 1 RBAC guards** (403 for non-`admin-ai` users).
- **Wave 2 prompt editor validations** (V-02 placeholder, V-06 PII, V-05 API key; audit log on valid save).
- **Wave 2 immutable versioning** (no UPDATE on historical rows).
- **Wave 2 diff viewer** (side-by-side + token count heuristic).
- **CI fix verification scenario** (runner without `.env.local` passes).
- **EDD Eval Gates fix verification scenario** (exit code 0 on pass, 1 on fail).

See `docs/specs/bdd/sprint-46-goals.feature` for the full scenario text. Additional scenarios covering C-04 Gemini ADR DoD, multi-agent retrospective gate, and Profit/Ranking SPEC approval gate are added in this kickoff-close commit (§6.5 of the feature file).

---

## §11 — Sign-off

| Agent | Dimension | Sign-off |
|---|---|---|
| product-owner | Scope + decisions (including §6 framing) | ✅ (draft; PO final sign at top of doc) |
| tech-lead | Item breakdown + schedule + critical path | ✅ |
| architect | V2 SPECs alignment + ADR items | ✅ |
| qa-engineer | DoD + success criteria + BDD | ✅ |
| security-specialist (architect stand-in) | Risk §7.3 + governance tier §5 | ✅ |
| devops-engineer | Schedule §3 + tech debt Block C + §7.5 | ✅ |
| finops-engineer | Cost risks §7.4 + A-03 gate | ✅ |
| release-manager | Success criteria §8 + gate failure response §8.4 | ✅ orchestrator |
| ux-designer | N/A — no UX-specific deliverables in S46 (V2 UI follows SPEC-UX-AI-GOVERNANCE-V2 already approved) | — |
| ai-specialist | N/A — V2 validations per SPEC-AI (approved); no new prompts in S46 | — |
| prompt-engineer | Same as ai-specialist | — |
| data-engineer | N/A | — |

**Prerequisite for kickoff execution (Week 1 Day 1)**: PO reviews this plan + signs off on §6 Profit/Ranking approach choice.
