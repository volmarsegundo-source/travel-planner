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

### 1.4 Outstanding inputs

- **Gemini timeout ADR** — prompt said "Prod promotion is separate; Profit/Ranking Claude proposes approach". Gemini ADR not explicitly listed in S46 kickoff scope; planning doc §2.1(b) classifies it as MUST pre-Beta. **Assumption**: Gemini ADR lands in S46 as a 1-2d work item owned by tech-lead + architect; flagged under Block C below. If PO intends Gemini for S47, flip classification. Call out below for PO.

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
| C-04 | **Gemini timeout ADR** (Edge migration vs Claude fallback) + chosen-option implementation | 2-5d | tech-lead + architect + devops-engineer | **Flagged for PO — assumption is Gemini lands in S46. If S47 instead, move this row.** |

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

### Week 1 (days 1-5): foundation unblock

| Day | Thread 1 (dev-1) | Thread 2 (dev-2) | Non-dev agents |
|---|---|---|---|
| 1 | B-W1-001 (flag) + B-W1-002 (migration start) | C-01 (CI fix, 0.5h) → D-01 (F-01, 0.25h) → B-W1-005 (RBAC) | A-01 kickoff (SEC-AUDIT discovery phase) |
| 2 | B-W1-002 cont. + B-W1-003 (seed) | B-W1-005 cont. + B-W1-006 (UI shell) | A-01 cont. + C-02 (EDD fix, 1-2h) |
| 3 | B-W1-004 (AuditLogService) | B-W1-006 cont. + B-W1-007 (health) | A-01 findings draft + C-03 (Redis decision draft) |
| 4 | B-W1-004 tests | B-W1-008 start (integration tests) | A-02 kickoff (MOCK-ASSERTION rule) + D-02 (F-02 canUseAI) |
| 5 | **Wave 1 review + gate** | Wave 1 review + gate | A-01 commit + A-02 cont. + C-03 decision commit |

Critical path: **B-W1-001 → B-W1-002 → B-W1-004 → B-W2-001**. Any slip propagates.

### Week 2 (days 6-10): prompt editor + observability

| Day | Thread 1 (dev-1) | Thread 2 (dev-2) | Non-dev agents |
|---|---|---|---|
| 6 | B-W2-001 (API endpoints) | B-W2-006 (editor UI start) | A-02 wrap-up + A-03 kickoff (Sentry forwarder) |
| 7 | B-W2-002 (versioning) + B-W2-003 start (validations) | B-W2-006 cont. + B-W2-007 (diff viewer) | A-03 cont. + E-02 adapter tests (jwt callback) |
| 8 | B-W2-003 cont. | B-W2-007 cont. + B-W2-008 (preview) | A-03 commit + E-02 session callback |
| 9 | B-W2-004 (warnings) + B-W2-005 (token count) | B-W2-008 cont. + B-W2-009 start | E-01 retrospective doc draft |
| 10 | **Mid-sprint gate** (V2 W2 backend ≥ 80% coverage) | Mid-sprint gate (V2 W2 UI complete) | C-04 Gemini ADR published |

Critical path continues: **B-W1-004 → B-W2-001 → B-W2-003 → B-W2-009**.

### Week 3 (days 11-15): wave 2 close + retrospective + buffer

| Day | Thread 1 | Thread 2 | Non-dev agents |
|---|---|---|---|
| 11 | B-W2-009 (validation tests) | B-W2-009 (UI tests) | E-01 commit |
| 12 | Wave 2 integration | Wave 2 integration | C-04 implementation (Gemini fix) start |
| 13 | Wave 2 gate + Trust Score | Wave 2 gate + Trust Score | C-04 implementation cont. |
| 14 | **Buffer day** (15%) | **Buffer day** | Sprint 46 retrospective prep + Sprint 47 planning input |
| 15 | Sprint close gate + release notes | — | Sprint 46 review doc + Trust Score close-out |

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

- [ ] ADR with 2 options + chosen direction + rationale.
- [ ] Implementation landed (either Edge migration or Claude fallback).
- [ ] Staging smoke: Phase 5 + Phase 6 generations complete in < 55 s (beneath Vercel Hobby cap).
- [ ] tech-lead + architect + devops sign-off.

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

## §6 — Profit Scoring + Dynamic Ranking — 3 refined approaches

**Reframe from §1.2 grounding finding**: both concepts already exist in code. The question is not "build" but "refine" — what rules / dynamic behaviour should the PO layer on top?

Without a written scope doc from the PO, I propose three approaches. **No decision taken here.**

### Approach 1 — Sprint Zero parallel (was "Approach 1" in planning §6)

**Refined**: PO (with product-owner agent assist) writes `SPEC-PROFIT-SCORING-001` and `SPEC-DYNAMIC-RANKING-001` during Sprint 46 Week 1-2, in parallel with dev execution. S47 consumes the SPECs.

**Activities** (PO side, ~1-2d total):
- Week 1: PO drafts outline of what rules should be configurable (e.g. per-tier profit multipliers, per-cohort rank thresholds). Product-owner agent writes first-pass SPEC with 9 dimensions.
- Week 2: review by tech-lead + architect; finalize SPEC.

**Pros**: S47 starts with concrete SPEC; no delay.
**Cons**: PO attention split with S46 execution reviews.
**Effort impact on S46 dev**: zero.
**Risk**: PO time-slice may slip; SPECs may land mid-S47.

### Approach 2 — S47 starts with 3-5d Sprint Zero Mini

**Refined**: S47 week 1 is "Sprint Zero Mini" — all agents converge on Profit/Ranking SPECs + scoping. S47 weeks 2-3 execute V2 Waves 3-5 + Beta readiness.

**Activities** (~3-5d team-wide):
- Day 1-2: PO + product-owner draft SPECs with 9 dimensions.
- Day 3: tech-lead + architect technical review; architect writes `SPEC-ARCH-PROFIT-SCORING` if infra changes needed.
- Day 4: security + finops review; BDD scenarios written.
- Day 5: SPECs approved; S47 execution kicks off.

**Pros**: Focused scoping; full team alignment.
**Cons**: S47 execution window shrinks to 2 weeks for V2 Waves 3-5 (60 pts) — tight.
**Effort impact on S46**: zero.
**Risk**: V2 Waves 3-5 slippage if Sprint Zero overruns.

### Approach 3 — Post-Beta deferral

**Refined**: Since Profit/Ranking already exist as static implementations, the "dynamic rules" refinement is **not a Beta blocker**. Defer entirely to post-Beta. S47 remains focused on V2 Waves 3-5 + Beta readiness.

**Activities**: none in S46/S47.
**Pros**: Sprint 47 stays at its planned size; Beta ships sooner.
**Cons**: Profit/Ranking rules feature lands post-Beta.
**Effort impact on S46/S47**: zero.
**Risk**: **Low**. The current static implementations are functional; dynamic rules are enhancement, not fix.

### Recommendation conditional (not binding)

- **If PO considers dynamic rules a Beta gate**: Approach 2 (S47 Sprint Zero Mini) — it's the cleanest boundary.
- **If PO wants to parallelize**: Approach 1 — but PO attention must be available.
- **If PO wants Beta soonest**: **Approach 3 (post-Beta)** — my best-fit given the grounding discovery that these features already functionally exist.

### Decision inputs for PO

1. Does the admin dashboard (`PerUserProfitRow` sort) already surface enough profit visibility for Beta users? If yes → Approach 3.
2. Are dynamic rank thresholds needed for any Beta marketing / retention flow? If yes → Approach 1 or 2.
3. How much PO time is available for SPEC drafting during S46? If zero → Approach 2 or 3.

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

### 7.2 Process (product-owner + release-manager)

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R46-P01 | Single-author retrospective bias (Sprint 45 lesson L-02) | P1 | Schedule Sprint 46 retrospective as 3-agent round: PO + tech-lead + qa-engineer contribute independently before synthesis |
| R46-P02 | Unplanned bug discovery (Sprint 45 had 5 in 6 days) | P1 | 15% buffer (Day 14) + scope-cut playbook on path §3 |
| R46-P03 | PO burnout after intense Sprint 45 | P1 | Approach 3 for Profit/Ranking minimises PO attention this sprint; ensure PO has at least 2 non-review days |
| R46-P04 | Governance slippage under perceived urgency (Sprint 45 Stop item St-01) | P1 | Crisis-governance minimum from E-01 codified Day 9; apply to any urgency-mode commit |

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

- **3 P1 Technical + 4 P1 Process + 2 P1 Security = 9 active P1 risks**. 15% buffer absorbs 1-2. More than 3 simultaneous P1 realizations → scope cut decision by Day 10.
- All P0 risks already burned during Sprint 45 (Auth.js rotation race, schema drift, CSP nonce). No P0 carrying into Sprint 46.

---

## §8 — Success criteria

### 8.1 Must-have (gate condition for Sprint 46 close)

- [ ] **Block A (3 SPECs)**: all 3 closed with DoD checkmarks.
- [ ] **V2 Wave 1**: foundation functional with flag toggle.
- [ ] **V2 Wave 2**: prompt editor CRUD + versioning + V-01..V-08 validations working.
- [ ] **Trust Score composite ≥ 0.93** (no regression from Sprint 45 close).
- [ ] **Zero open P0 or unresolved P1 security findings** from A-01.
- [ ] Sprint 46 review doc + retrospective doc committed.

### 8.2 Should-have (strong goal; miss = note in retrospective)

- [ ] **Block C (tech debt)**: C-01 + C-02 closed (CI + EDD). C-03 decision doc landed. C-04 Gemini ADR published.
- [ ] **F-01 + F-02** resolved (Block D).
- [ ] **Sprint 46 retrospective with independent input from ≥ 3 agents** (not single-author).
- [ ] BDD file `sprint-46-goals.feature` expanded with Wave-specific scenarios (Phase 8 of this kickoff).

### 8.3 Could-have (bonus; miss = Sprint 47 carry-over)

- [ ] Approach chosen for Profit/Ranking (§6) and initial SPEC drafted if Approach 1 or 2.
- [ ] Sprint 47 planning doc started.

### 8.4 Gate condition failure response

If Must-have §8.1 is not all ✅ on Day 14 (buffer day):
1. tech-lead + PO triage which Must-haves are at risk.
2. Scope-cut playbook from §3 applies (move test coverage / Wave 2 UI polish to S47 start).
3. Sprint extension of up to 3 additional days allowed ONCE (budget warning).
4. If extension still insufficient → Sprint 46 declared "partial close" with transparent S47 scope expansion + retrospective entry "why didn't we cut earlier".

---

## §9 — BDD expansion (Phase 8 deliverable)

`docs/specs/bdd/sprint-46-goals.feature` is expanded in this commit with:
- **Wave 1 end-to-end acceptance scenario** (feature flag toggle + migration revert + health check 3-state).
- **Wave 2 end-to-end acceptance scenario** (draft creation + validation blocks + diff render + audit log).
- **CI fix verification scenario** (runner without `.env.local` passes).
- **EDD Eval Gates fix verification scenario** (exit code 0 on pass).

See `docs/specs/bdd/sprint-46-goals.feature` for the full scenario text.

---

## §10 — Sign-off

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
