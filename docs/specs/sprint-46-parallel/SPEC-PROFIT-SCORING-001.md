# SPEC-PROFIT-SCORING-001 — Admin Dashboard Profit Computation

**Version:** 0.1.0 (seed — PO-led drafting under Approach 1, Sprint Zero parallel)
**Status:** Draft
**Sprint:** 46 (Approach 1 parallel) → execution Sprint 47+
**Owner:** product-owner (Volmar)
**Reviewers:** tech-lead, architect, security-specialist, finops-engineer
**Trigger:** Sprint 45 closure flagged Profit Scoring as a pre-Beta item with no source SPEC. Sprint 46 grounding (`docs/specs/sprint-46-parallel/research/profit-scoring-grounding.md`, commit `36076ee`) discovered both the feature and a heuristic that needed explicit documentation.

---

## §1 — Status (this seed commit)

This SPEC is being drafted by the PO at 0.3 day/week cadence per execution plan §6.3 (Sprint 46) — see `docs/qa/sprint-46-pendentes-recommendations.md` R-03-A for the cadence-reduction rationale.

The current commit seeds the SPEC with **§4 Cost Model — Platform Heuristic** per R-02-B. The 9-dimension SDD body (PROD/UX/TECH/SEC/AI/INFRA/QA/RELEASE/COST) will be filled across Weeks 1-3 of Sprint 46 by the PO.

---

## §2 — Problem statement (placeholder)

Profit per user is computed in `src/server/services/admin-dashboard.service.ts` and surfaced via the admin dashboard. The implementation pre-dates this SPEC (introduced in earlier sprints; first identified during Sprint 46 grounding). This SPEC captures the existing intent + opens the door for refinement post-Beta.

PO will fill this section in Week 1 (Profit Scoring draft — SPEC-PROD).

---

## §3 — User story (placeholder)

PO will fill this section in Week 1 (Profit Scoring draft — SPEC-UX).

---

## §4 — Cost Model — Platform Heuristic (R-02-B, this commit)

### 4.1 Two cost models coexist (intentional)

The codebase has **two distinct cost surfaces**:

| Model | Location | Unit | Purpose |
|---|---|---|---|
| **Platform heuristic** | `src/server/services/admin-dashboard.service.ts:12` (`AI_COST_PER_PA_CENTS = 1`) | BRL ¢ per Atlas Point spent | Drives the admin dashboard "profit" tile + per-user `profitCents` row |
| **Provider per-token cost** | `src/lib/cost-calculator.ts:15-30` (`MODEL_PRICING`) | USD per million tokens | Tracks raw API call cost on `AiInteractionLog.estimatedCostUsd` |

These are **not redundant**. They answer different questions:

- The **heuristic** answers: *"After all platform overhead (compute, DB, ops, support, infra) what is Atlas's effective cost-per-PA?"* — chosen as 1 BRL ¢ to provide a deliberate margin buffer.
- The **per-token** answers: *"What does the AI provider invoice for this specific call?"* — used for FinOps cost tracking, model selection, and ADR-031 cost comparisons.

### 4.2 Empirical validation (read-only, no change required)

Cross-checked against shipped data:

- **Revenue per PA** (from `src/lib/gamification/pa-packages.ts`): packages range 2.00-2.98 BRL ¢/PA depending on tier (Embaixador → Explorador). Average ≈ 2.4 BRL ¢/PA.
- **Heuristic cost per PA** (`AI_COST_PER_PA_CENTS = 1`): 1.00 BRL ¢/PA.
- **Implied platform margin per PA**: ~1-2 BRL ¢/PA (40-66% gross).
- **Actual provider cost per PA** (per ADR-031 §"Custos reais"): all-Gemini 3-phase expedition ≈ $0.00479 USD ≈ 2.4 BRL ¢ for ~160 PA spent ≈ **0.015 BRL ¢/PA**.

The heuristic is approximately **66× larger** than the raw provider cost. The buffer captures non-AI overhead (Vercel compute time billed for the AI request envelope, DB writes for `AiInteractionLog`, request-scoped Redis usage, support/ops amortization, headroom for vendor price drift).

### 4.3 Decision (R-02-B from `sprint-46-pendentes-recommendations.md`)

**The heuristic is correct as designed.** It will not be changed in Sprint 46.

In Sprint 47, an additional admin dashboard tile (`B47-COST-TILE`) will surface "Actual provider cost (last 30d)" sourced from `SUM(AiInteractionLog.estimatedCostUsd)` for the same period. **Both tiles coexist** so the admin can compare:

- "Profit (heuristic)" — current behavior, preserves historical comparability.
- "Provider cost (actual)" — new tile, surfaces vendor invoice reality.

**No retroactive change to historical reports.** No data migration. PO can spot-check the heuristic against actual cost any time without disrupting time-series analysis.

### 4.4 Forbidden alternatives (rejected during R-02 review)

- **R-02-A (replace heuristic with per-token)** — rejected: causes a permanent discontinuity in historical "profit" reports; obscures the platform-cost overhead the heuristic intentionally captures.
- **R-02-C (lower the constant to match raw cost)** — rejected: retroactively changes all historical "profit" numbers; destroys time-series integrity. Dangerous.

### 4.5 Future revisitation triggers

Revisit this section if any of:

1. Vendor (Anthropic / Google) pricing drifts > 25% from the values in `cost-calculator.ts MODEL_PRICING`.
2. Platform overhead changes materially (e.g. tier upgrade, new infra service).
3. PO needs per-tier or per-cohort profit reporting (out of scope here).
4. The S47 transparency tile reveals systematic over- or under-estimation that the PO wants the heuristic to absorb.

---

## §5 — Acceptance criteria (placeholder)

PO will fill in Week 1-2 (SPEC-PROD).

---

## §6 — Technical plan (placeholder)

PO will fill in Week 2 (SPEC-TECH).

---

## §7 — Security considerations (placeholder)

PO will fill in Week 2 (SPEC-SEC). Initial seed: heuristic exposes no PII; admin-dashboard tile is RBAC-gated.

---

## §8 — QA plan (placeholder)

PO will fill in Week 2 (SPEC-QA).

---

## §9 — Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-04-24 | dev-fullstack-1 (seed for PO drafting) | Initial seed with §4 Cost Model section (R-02-B). Other sections are placeholders for PO to fill at 0.3 day/week cadence per execution plan §6.3. |

---

## §10 — References

- `docs/specs/sprint-46-parallel/research/profit-scoring-grounding.md` — initial grounding report (commit `36076ee`)
- `docs/qa/sprint-46-pendentes-recommendations.md` — R-02-B decision rationale (commit `502b336`)
- `docs/sprint-planning/sprint-46-execution-plan.md` §6 — Approach 1 mechanics
- `src/server/services/admin-dashboard.service.ts` — current heuristic implementation
- `src/lib/cost-calculator.ts` — per-token MODEL_PRICING source of truth
- `src/lib/gamification/pa-packages.ts` — revenue-per-PA implied by package pricing
- `docs/architecture.md` ADR-031 — Gemini primary + cost actuals
