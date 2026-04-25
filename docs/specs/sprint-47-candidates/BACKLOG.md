# Sprint 47 — Consolidated Backlog (Candidate)

**Status:** Draft — input to Sprint 47 planning (not Sprint 47 kickoff).
**Source:** Sprint 46 Day 2 cont. PO decisions (R-01-A, R-02-B) + the planning doc §10 V2 Waves 3-5 scope already approved.
**Author:** product-owner + tech-lead (orchestration).
**Date:** 2026-04-24.

---

## Prioritization rubric

- **P0** — blocks Beta launch.
- **P1** — closes critical Sprint 46 follow-up debt.
- **P2** — structural improvement; no active incident.
- **P3** — cosmetic / ergonomic.

---

## P0 / P1 — V2 Waves 3-5 (Sprint 47 flagship per execution plan §6.6)

These items are the core Sprint 47 critical path, already scoped in `docs/specs/sprint-46/SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` §3.

| ID | Item | Effort | Priority | Source |
|---|---|---|---|---|
| **B47-W3** | V2 Wave 3 — Modelo/Timeout Real-Time + AiConfigResolver (consumes ADR-0036 env tier as middle fallback) | 20 pts (5-7d, 2 devs parallel) | P0 | SPEC-TECHLEAD §3 |
| **B47-W4** | V2 Wave 4 — Curadoria de Outputs + LLM-as-judge sampling | 20 pts (5-7d) | P0 | SPEC-TECHLEAD §3 |
| **B47-W5** | V2 Wave 5 — Eval Integrado (Promptfoo) + Draft→Gate→Active flow | 20 pts (6-8d) | P0 | SPEC-TECHLEAD §3 |
| **B47-MSW** | MSW OAuth stub + age-gate E2E suite (5 scenarios) | 6-10h | P1 | SPEC-PROCESS-RETROSPECTIVE-BUG-C §3.2 |
| **B47-ITER1-6-RETRO** | iter 1-6 BUG-C retroactive governance audit + retrospective doc | 8-12h | P1 | SPEC-PROCESS-RETROSPECTIVE-BUG-C §1-2 |

---

## P2 — Sprint 46 Day 2 cont. PO decisions

### B47-RANK-FILL — Dynamic Ranking ghost ranks fill (R-01-A)

- **Source**: `docs/qa/sprint-46-pendentes-recommendations.md` §2 R-01-A (PO-approved 2026-04-24)
- **Effort**: 4-6h
- **Priority**: P2
- **Trigger**: `Rank` type at `src/types/gamification.types.ts:3-9` declares 6 tiers; 2 of them (`navegador`, `lendario`) have no `rankPromotion` entry in `src/lib/engines/phase-config.ts` and are therefore unreachable in production. Cosmetic gap — system functions with 4 reachable tiers — but the type carries dead options.
- **Scope**:
  - PO chooses which 2 phases earn `navegador` and `lendario` (likely a mid-game phase + a late-milestone phase like "O Legado" Phase 8).
  - Update `phase-config.ts` `rankPromotion` entries for the chosen phases (one in each PHASE_DEFINITIONS block — original + reorder — to maintain feature-flag parity).
  - Add 1 BDD scenario per new promotion to `auth-age-gate.feature` or a new `gamification-ranking.feature`.
  - Optional: grandfather seed for users who already met the milestone before this ticket lands.
- **Acceptance criteria**:
  - All 6 tiers in `Rank` type are reachable via at least one phase completion.
  - PHASE_DEFINITIONS and PHASE_DEFINITIONS_REORDERED both have parity (same ranks reachable; only phase ordering differs).
  - BDD scenarios pass for the 2 new promotions.
  - No regression in the 4 currently-reachable tiers.
- **Dependencies**: none direct on V2 Waves 3-5; can run in parallel.
- **Owner (proposed)**: dev-fullstack-1 with PO sign-off on which phases earn which ranks.

### B47-COST-TILE — Cost model transparency tile (R-02-B)

- **Source**: `docs/qa/sprint-46-pendentes-recommendations.md` §3 R-02-B (PO-approved 2026-04-24) + `docs/specs/sprint-46-parallel/SPEC-PROFIT-SCORING-001.md` §4
- **Effort**: 4-6h
- **Priority**: P2
- **Trigger**: admin dashboard surfaces "profit" computed via heuristic `AI_COST_PER_PA_CENTS = 1` (platform-cost approximation, not raw provider cost). PO + finops want a parallel "actual provider cost" tile to spot-check the heuristic against vendor invoice reality without disrupting historical reports.
- **Scope**:
  - New tile in admin dashboard: "Provider cost (last 30d)".
  - Source: `SUM(AiInteractionLog.estimatedCostUsd) WHERE createdAt >= NOW() - INTERVAL '30 days'`.
  - Convert USD to BRL for display (FX source TBD at Sprint 47 planning — likely fixed rate from `src/lib/currency.ts` if it exists, or env-driven).
  - Coexists with the existing heuristic-based "Profit" tile — does NOT replace it.
  - Visual treatment: secondary tile / collapsible panel; primary KPIs unchanged.
  - No data migration. No retroactive change to historical "profit" numbers.
- **Acceptance criteria**:
  - Both tiles visible on `/admin/dashboard` for users with admin role.
  - "Provider cost" tile updates within 30d sliding window.
  - Hover tooltip on each tile explains the difference (heuristic vs vendor-actual).
  - No regression in existing dashboard tiles.
  - Unit tests cover both tiles independently.
- **Dependencies**:
  - SPEC-PROFIT-SCORING-001 §4 must be in approved state (Sprint 46 Approach 1 deliverable — currently in draft).
  - `AiInteractionLog.estimatedCostUsd` field already exists (no schema change needed).
- **Owner (proposed)**: dev-fullstack-2.

---

## P2 / P3 — Carryover from Sprint 46 review BACKLOG

These items remain pending from `docs/specs/sprint-46-candidates/BACKLOG.md` § (Sprint 45 review output) and were not consumed in Sprint 46. They are eligible for Sprint 47 if capacity allows — none are P0.

| ID | Item | Effort | Priority | Notes |
|---|---|---|---|---|
| B46-09 (carryover) | SMTP / Resend config for Beta password reset | 2-4h | P2 | Pre-Beta blocker; could merge into Beta-readiness work |
| B46-10 | `sanitizeCallbackUrl` helper consistency (reject `..` and mid-path `\`) | 30 min + tests | P2 | Layout already stricter; non-blocking |
| B46-11 | F-01: `/expedition` vs `/expeditions` segment list | 15 min | P2 | Defense-in-depth; layout is real gate |
| B46-12 | F-02: `canUseAI(null)` permissive default | 2-3h | P2 | Pre-existing security finding |
| B46-14 | Coverage branches threshold 78→80 (Wave 2.8b residual) | 2-4h | P2 | CI threshold alignment |
| B46-15 | 2 slow coverage-mode tests | 3-5h | P2 | Test-perf hygiene |
| B46-16 | 4 S44 injection-resistance failures (IR-024 Cyrillic homoglyph) | TBD | P2 | Source doc location unknown |

---

## Pre-Beta blockers (still unresolved at Sprint 46 close)

These remain from Sprint 45 review and need PO source-doc resolution before Sprint 47 commits:

- Profit Scoring rules — partially addressed by SPEC-PROFIT-SCORING-001 (this sprint) + B47-COST-TILE (S47).
- Dynamic Ranking — partially addressed by SPEC-DYNAMIC-RANKING-001 (this sprint, in draft) + B47-RANK-FILL (S47).
- Gemini timeout — closed in Sprint 46 Day 1 via ADR-0036 + impl (commits `f0d4805`, `ce223f4`).
- 6 AI Governance items — closed via V2 Waves 1-5 (Sprint 46 ships Wave 1; Sprint 47 ships Waves 3-5).

---

## Sequencing proposal (Sprint 47, ~3 weeks)

**Week 1**:
- B47-W3 starts (critical path).
- B47-MSW (MSW OAuth stub) in parallel — independent track.
- B47-RANK-FILL (P2) slotted as "stretch" or completed in Day 1-2.
- B47-COST-TILE (P2) slotted alongside B47-RANK-FILL.

**Week 2**:
- B47-W3 wraps + B47-W4 starts.
- B47-ITER1-6-RETRO (P1) writeup in parallel — non-dev track.

**Week 3**:
- B47-W5 + Beta readiness sweep.
- Pre-Beta blocker triage; SMTP/Resend if not already done.

P2/P3 carryovers from Sprint 46 candidates BACKLOG slot in as capacity allows.

---

## Cross-references

- `docs/specs/sprint-46-candidates/BACKLOG.md` — Sprint 46 candidate items (some carryover here).
- `docs/qa/sprint-46-pendentes-recommendations.md` — R-01-A + R-02-B + R-03-A rationale.
- `docs/sprint-planning/sprint-46-execution-plan.md` §6.6 — Approach 1 fallbacks A/B (relevant if SPECs not approved by Sprint 46 close).
- `docs/specs/sprint-46/SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` §3 — V2 Waves 3-5 detailed scope.
- `docs/specs/sprint-46-candidates/SPEC-PROCESS-RETROSPECTIVE-BUG-C.md` — iter 1-6 retro scope.

---

## Status

This BACKLOG is **input to Sprint 47 planning** — not a commitment. Final Sprint 47 scope decided at Sprint 47 kickoff (after Sprint 46 close).
