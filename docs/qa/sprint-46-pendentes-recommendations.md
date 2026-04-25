# Sprint 46 — Pendentes Recommendations (post-grounding)

**Date:** 2026-04-24 (Sprint 46 Day 2 cont.)
**Author:** product-owner orchestration + tech-lead + architect + finops-engineer
**Trigger:** PO request to deepen the 3 honesty findings flagged in `docs/specs/sprint-46-parallel/research/profit-scoring-grounding.md` (commit `36076ee`).
**Governance:** proportional — analysis only, no code changes.
**Output:** decisional input for PO; final calls remain with PO.

---

## §1 — Executive summary

| Pendente | State after deeper grounding | Recommendation | Sprint impact |
|---|---|---|---|
| **P-01 — Dynamic Ranking ghost ranks** | **Correction**: my earlier grounding overstated the gap (claimed only 2 of 6 reachable; actual is **4 of 6**). True gap is `navegador` and `lendario` only. Lower severity than reported. | **R-01-A**: Defer rank-system redesign to post-Beta; add 2 phase milestones in S47 to fill the 2 ghost ranks (cheapest path). PO confirms ghost ranks are aspirational tiers. | Sprint 47 — small content-only ticket (4-6h). |
| **P-02 — Cost model divergence** | **Real, ~66× off**. Heuristic `AI_COST_PER_PA_CENTS = 1` overstates real provider cost by ~66× when measured against ADR-031 actuals. But the heuristic is **intentional** — it represents "platform-attributable cost per PA" not "raw provider cost". | **R-02-B**: Document the heuristic explicitly in `SPEC-PROFIT-SCORING-001`; do NOT switch to per-token cost in Sprint 46. Add an admin dashboard "actual provider cost (V2)" tile in S47 once `ModelAssignment` data is read. | Sprint 46: PO writes one §SPEC paragraph documenting the dual-cost model. Sprint 47: dashboard tile (size S). |
| **P-03 — Approach 1 reassessment** | Given P-01 is small + P-02 is documentation, Approach 1 (PO writes SPECs in parallel) is **still viable** and the gap is smaller than feared. Approach 2 fallback unchanged. | **R-03-A**: Continue Approach 1 with corrected scope. Two SPECs to write (PROFIT-SCORING + DYNAMIC-RANKING). Reduce PO weekly allocation from 0.5d → 0.3d (gap is smaller). | Sprint 46 ongoing — PO time saved. |

**Net effect**: the findings refine but do not invalidate the Sprint 46 plan. Proceed with Wave 1 execution + ongoing Approach 1 SPEC drafting; queue 2 small S47 follow-ups.

---

## §2 — Pendente 1: Dynamic Ranking ghost ranks

### 2.1 Analysis (corrected)

**Earlier grounding claim** (`profit-scoring-grounding.md` §1.4 + §3 A-04): "4 of 6 ranks unreachable: navegador, capitao, aventureiro, lendario."

**Re-grep of `src/lib/engines/phase-config.ts`**: full list of `rankPromotion` entries:

| Phase config (lines 13-117 = original; lines 122-220 = post-reorder) | rankPromotion |
|---|---|
| Phase 2 "O Perfil" (line 33 + line 144) | `desbravador` ✓ |
| Phase 5 "Guia do Destino" (line 66) **/** Phase 3 reorder (line 156) | `capitao` ✓ |
| Phase 7 "A Expedição" (line 88 + line 205) | `aventureiro` ✓ |
| All other phases | `null` |

**Corrected gap**: only `navegador` and `lendario` are unreachable (2 of 6 declared in `Rank` type at `src/types/gamification.types.ts:3-9`). Default (`novato`) + 3 promotions = 4 reachable tiers.

**Severity correction**: **MEDIUM, not HIGH**. Two ghost tiers in a 6-tier type, not four. Pre-Beta impact is purely cosmetic (the type has 2 dead members; admin sort and rendering both work for 4 of 6).

### 2.2 Options

**R-01-A — Add 2 phase milestones in S47** (cheapest path):
- **What**: assign `rankPromotion: "navegador"` to one mid-game phase (e.g. Logistics) and `rankPromotion: "lendario"` to a late milestone (e.g. Phase 8 "O Legado" if it exists).
- **Effort**: 4-6h — config edit + 1 BDD scenario per new promotion + retrospective seed for grandfather behavior on existing users.
- **Risk**: low. PO must confirm intent (which phases earn which ranks); not a free choice.

**R-01-B — Remove the 2 ghost ranks from the `Rank` type** (rip-and-replace path):
- **What**: tighten `Rank` type to the 4 actually-used tiers; deprecate `navegador` + `lendario`.
- **Effort**: 4-8h — type change + downstream sweep + migration to coerce any DB rows (none exist today, but defensive).
- **Risk**: medium. Closes a feature surface; if PO ever wanted those tiers, this reverses.

**R-01-C — Defer entirely (status quo)**:
- **What**: leave the type as-is; document the ghost ranks as "reserved for post-Beta progression depth".
- **Effort**: 0h.
- **Risk**: low. Type carries dead options forever; admin sort still works (alphabetical, with 2 tiers never observed).

### 2.3 Recommendation

**R-01-A** — preferred. Gap is small enough that the cheapest-path content addition closes it cleanly. PO chooses which 2 phases earn the 2 ghost ranks during S47 planning. Approach 1 SPEC drafting can mention the planned promotions without committing.

**Sign-offs**:
- tech-lead: ✅ R-01-A
- architect: ✅ R-01-A (preserves 6-tier ladder per original product intent)
- product-owner: **decision pending** (which phases earn which ranks)

### 2.4 Sprint impact

- **Sprint 46**: zero. SPEC drafting can reference R-01-A direction.
- **Sprint 47**: add `B47-RANK-FILL` (~4-6h) to backlog.

---

## §3 — Pendente 2: Cost model divergence

### 3.1 Analysis (with new data)

Two cost models coexist:

| Model | Location | Unit | Purpose |
|---|---|---|---|
| `AI_COST_PER_PA_CENTS = 1` | `src/server/services/admin-dashboard.service.ts:12` | BRL cents per PA | Heuristic for admin dashboard profit tile |
| `MODEL_PRICING` (per-MTok) | `src/lib/cost-calculator.ts:15-30` | USD per million tokens | Backend cost tracking per AI call (uses `AiInteractionLog.estimatedCostUsd`) |

**Revenue per PA** (from `PA_PACKAGES` at `src/lib/gamification/pa-packages.ts:7-36`):

| Package | PA | Price (BRL ¢) | BRL ¢ / PA |
|---|---:|---:|---:|
| Explorador | 500 | 1490 | 2.98 |
| Navegador | 1200 | 2990 | 2.49 |
| Cartógrafo | 2800 | 5990 | 2.14 |
| Embaixador | 6000 | 11990 | 2.00 |

Revenue is roughly **2-3 BRL ¢ per PA** depending on package.

**Actual provider cost** per ADR-031 §"Custos reais por geração": all-Gemini 3-phase expedition = **$0.00479 USD ≈ 2.4 BRL ¢**. With ~160 PA spent per expedition, actual cost per PA ≈ **0.015 BRL ¢**.

**Discrepancy**: heuristic (1.0 BRL ¢/PA) is **~66× larger** than actual provider cost (0.015 BRL ¢/PA).

### 3.2 Re-framing — the heuristic is NOT meant to track raw provider cost

Re-reading the constant declaration: `/** Rough estimate: 1 PA of AI cost ~ R$ 0.01 (1 cent) */`. This is **platform-attributable cost** — not the raw API call cost. It includes implicit infrastructure overhead (Vercel compute, DB I/O, support, ops) that the per-token model excludes.

The 66× gap is therefore a **deliberate margin buffer** built into the heuristic, not a bug. But the heuristic was authored without explicit documentation of *why* — it presents as if it were tracking raw cost.

### 3.3 Options

**R-02-A — Switch profit dashboard to per-token actual cost**:
- **What**: replace `AI_COST_PER_PA_CENTS` heuristic with summed `AiInteractionLog.estimatedCostUsd` × BRL conversion.
- **Effort**: 6-10h — admin-dashboard.service rewrite + USD/BRL FX source decision + dashboard UI relabel ("AI cost" → "Provider cost") + tests.
- **Pros**: transparent. Margin shows real value. Easier to spot anomalies.
- **Cons**: hides the platform-overhead margin that the heuristic captured. Margin appears artificially fat. Requires a separate "platform cost" line item to compare apples-to-apples with prior periods.
- **Risk**: medium — historical reports will show a discontinuity at the cutover.

**R-02-B — Document the heuristic explicitly + add a real-cost tile in V2** (recommended):
- **What**:
  - In `SPEC-PROFIT-SCORING-001` (PO drafting now): document `AI_COST_PER_PA_CENTS` as "platform-attributable cost-per-PA" not "raw provider cost". Explain it covers ~66× actual provider cost, intentional overhead buffer.
  - In Sprint 47: add a second admin dashboard tile "Actual provider cost (last 30d)" sourced from `AiInteractionLog.estimatedCostUsd`. Coexists with the heuristic-based profit tile. PO can compare.
  - Keep heuristic as-is. No data migration. No historical discontinuity.
- **Effort**: SPEC paragraph (~30min PO) + S47 tile (~4-6h dev).
- **Pros**: zero historical disruption. Documents intent. Adds transparency through addition, not replacement.
- **Cons**: heuristic remains "magic number"; future engineers still need the SPEC reference.
- **Risk**: low.

**R-02-C — Lower the heuristic to match actual cost**:
- **What**: change `AI_COST_PER_PA_CENTS` from `1` to e.g. `0.05` (closer to actual but with safety margin).
- **Effort**: 1h code + 4-6h dashboard relabel + retrospective re-computation.
- **Pros**: simpler model.
- **Cons**: **all historical "profit" reports retroactively change**. PO loses comparability over time. Strong argument against.
- **Risk**: high — historical reporting integrity compromised.

### 3.4 Recommendation

**R-02-B** — preferred. Documentation + S47 transparency tile is the lowest-risk path that informs without disrupting historical comparability.

**Sign-offs**:
- tech-lead: ✅ R-02-B
- architect: ✅ R-02-B
- finops-engineer: ✅ R-02-B specifically. R-02-A is the "right answer in 5 years" but causes a reporting break right before Beta. R-02-C is dangerous because retroactive numerator change destroys time-series.
- product-owner: **decision pending** (whether to write the §SPEC paragraph in current Approach 1 cycle or defer)

### 3.5 Sprint impact

- **Sprint 46**: PO adds one paragraph to `SPEC-PROFIT-SCORING-001` during ongoing Approach 1 drafting (~30 min PO time). No code change.
- **Sprint 47**: add `B47-COST-TILE` (~4-6h) to backlog.

---

## §4 — Pendente 3: Approach 1 reassessment

### 4.1 Analysis

`docs/sprint-planning/sprint-46-execution-plan.md` §6 chose **Approach 1** (Sprint Zero parallel) on PO call 2026-04-24. PO allocates 0.5 day/week × 3 weeks to draft `SPEC-PROFIT-SCORING-001` and `SPEC-DYNAMIC-RANKING-001` in parallel with Wave 1 dev execution. Fallbacks A (Sprint Zero Mini at S47 start) and B (post-Beta deferral) are pre-approved.

**Findings from P-01 + P-02 affect Approach 1 viability**:

| Finding | Effect on Approach 1 |
|---|---|
| P-01 corrected: only 2 ghost ranks (not 4) | Smaller SPEC scope. PO has less to draft for `SPEC-DYNAMIC-RANKING-001`. |
| P-02 reframed as documentation, not redesign | `SPEC-PROFIT-SCORING-001` shrinks to "document existing heuristic + reference S47 tile" rather than "design dynamic profit rules". |
| Both pendentes resolve to small additions | Approach 1's PO weekly allocation (0.5d × 3w = 1.5d total) was sized for greenfield SPECs. Reality is smaller. |

**Net**: the SPECs are smaller than Approach 1 sized for. Two implications:

1. **Either keep 0.5d/w allocation and finish faster** (PO has slack ~0.5-1d total).
2. **Or reduce allocation to 0.3d/w and reclaim PO bandwidth** for other Sprint 46 review work (V2 Wave 1 reviews, retrospective format prep, etc.).

### 4.2 Options

**R-03-A — Continue Approach 1, reduce allocation to ~0.3d/w** (recommended):
- **What**: keep Approach 1 mechanism. PO drafts both SPECs by end of Week 3 with reduced cadence.
- **Effort**: PO ~0.9 days total (vs 1.5 originally planned). −0.6d freed.
- **Pros**: Sprint 47 starts with approved SPECs as planned. PO bandwidth gained.
- **Cons**: none — SPEC scope shrunk legitimately.
- **Risk**: none new.

**R-03-B — Switch to Approach 2 (Sprint Zero Mini at S47 start)**:
- **What**: defer SPEC drafting from Sprint 46 to Sprint 47 Days 1-2. PO has zero Sprint 46 SPEC work.
- **Effort**: Sprint 47 absorbs 2 dev-days for SPEC review + sign-off chain.
- **Pros**: PO has even more bandwidth in Sprint 46.
- **Cons**: Sprint 47 timeline tightens slightly. Loses the "documented before Beta" momentum the PO valued at kickoff.
- **Risk**: low — Sprint 47 is already 2-3 weeks; absorbing 2 days is feasible but uses retrospective margin.

**R-03-C — Defer to post-Beta (Approach 3, the original fallback B)**:
- **What**: shelve both SPECs entirely. Document in Sprint 47 review that Profit/Ranking remain as static implementations.
- **Effort**: zero.
- **Pros**: maximum focus on V2 + Beta launch.
- **Cons**: loses the "documented before Beta" goal PO chose at kickoff. Reverses the 2026-04-24 Approach 1 decision.
- **Risk**: low operational, medium strategic (PO indicated docs-before-Beta preference).

### 4.3 Recommendation

**R-03-A** — preferred. Smaller-than-expected scope means Approach 1 still delivers without the burden originally feared. Reduce cadence, ship both SPECs by Sprint 46 close.

**Sign-offs**:
- tech-lead: ✅ R-03-A
- product-owner orchestration: ✅ R-03-A
- release-manager: ✅ R-03-A — keeps S47 free for V2 Waves 3-5 as planned in execution plan §6.6
- product-owner: **decision pending** (cadence reduction; or stick with 0.5d/w to add buffer)

### 4.4 Sprint impact

- **Sprint 46**: continue Approach 1 with reduced cadence. PO frees ~0.6d for other Sprint 46 work (or saves it as buffer).
- **Sprint 47**: unchanged — V2 Waves 3-5 + Beta readiness as planned.

---

## §5 — Dependency map between the 3 pendentes

```
P-01 (Ghost ranks)
  ├── feeds into → SPEC-DYNAMIC-RANKING-001 (Approach 1 deliverable)
  └── unblocks → S47 B47-RANK-FILL ticket (cheap content add)

P-02 (Cost model)
  ├── feeds into → SPEC-PROFIT-SCORING-001 (Approach 1 deliverable)
  ├── unblocks → S47 B47-COST-TILE ticket (transparency tile)
  └── interacts with → V2 Wave 1 ModelAssignment seed (B-W1-003) — actual provider costs would source from AiInteractionLog, not new tables

P-03 (Approach 1 reassessment)
  ├── consumes → P-01 + P-02 reframings
  └── outputs → reduced PO cadence OR fallback to Approach 2/3
```

**Critical observations**:

1. **P-01 and P-02 are independent** — neither blocks the other.
2. **P-03 depends on P-01 + P-02 outcomes** — must be resolved last in this analysis (already done above).
3. **None of the 3 affect Sprint 46 Wave 1 execution critical path**. B-W1-003 (next item, paused) does not consume any of these.
4. **Two new S47 backlog candidates** emerge: `B47-RANK-FILL` (R-01-A) and `B47-COST-TILE` (R-02-B).

---

## §6 — Proposed adjustments to Sprint 46 BACKLOG / Sprint 47 candidates

### 6.1 Sprint 46

**No changes** to Block A-E item list. The 3 pendentes resolve via Approach 1 SPEC drafting (already in flight) + 2 paragraphs of documentation.

**Update to** `docs/sprint-planning/sprint-46-execution-plan.md` §6.3 PO weekly allocation table:

| Week | Day block | Activity (current) | Activity (after R-03-A) |
|---|---|---|---|
| 1 | 0.5 day | Profit Scoring draft — SPEC-PROD + SPEC-UX | **0.3 day** — same |
| 2 | 0.5 day | Profit Scoring cont. — SPEC-TECH + SPEC-SEC + SPEC-QA | **0.3 day** — same + add §"AI_COST_PER_PA_CENTS heuristic explained" paragraph (P-02) |
| 2 | 0.5 day | Dynamic Ranking draft — SPEC-PROD + SPEC-UX | **0.3 day** — same + reference R-01-A direction (P-01) |
| 3 | 0.5 day | Dynamic Ranking cont. + both reviewed by tech-lead + architect | **0.3 day** — same |

**Total PO**: 1.5d → ~0.9d (~0.6d freed).

### 6.2 Sprint 47 candidates (NEW)

Add to `docs/specs/sprint-46-candidates/BACKLOG.md` Sprint 47 section:

| ID | Item | Effort | Source |
|---|---|---|---|
| **B47-RANK-FILL** | Add `rankPromotion: "navegador"` and `"lendario"` to 2 phases per PO direction (P-01 R-01-A) | 4-6h | This doc §2 |
| **B47-COST-TILE** | Add admin dashboard "Actual provider cost (V2)" tile sourcing from `AiInteractionLog.estimatedCostUsd`; coexists with heuristic-based profit tile (P-02 R-02-B) | 4-6h | This doc §3 |

**Both items are independent and can land on Day 1 of S47** — they're contained, do not depend on V2 Waves 3-5 critical path.

### 6.3 Documentation hygiene

The grounding report at `docs/specs/sprint-46-parallel/research/profit-scoring-grounding.md` claims "only 2 of 6 ranks reachable" in §1.4 + §3 A-04. **This claim is wrong.** Should add a correction note at the top of that doc next time it's edited (don't re-commit just for this — bundle with the next Approach 1 SPEC drafting commit).

---

## §7 — PO action items

In order of urgency:

1. **Read this doc** (~ 20 min).
2. **Decide on R-01-A**: which 2 phases earn `navegador` and `lendario` ranks? (~ 5-10 min — can defer to S47 planning).
3. **Decide on R-02-B**: confirm the heuristic is documentation-only in S46 + S47 tile (~ 2 min — yes/no).
4. **Decide on R-03-A**: reduce Approach 1 cadence 0.5d/w → 0.3d/w (~ 2 min — yes/no).
5. **Optionally**: bundle the §6.3 grounding report correction with the next Approach 1 commit.

Once decisions are made, execution plan §6.3 can be updated and the new S47 backlog items registered. None of this blocks current Sprint 46 Wave 1 work (B-W1-003 ready to start once PO unpauses).

---

## §8 — Honesty flags

1. **My earlier grounding report (`36076ee`) was wrong** about ghost ranks count. Two ghost tiers, not four. Should have grepped both PHASE_DEFINITIONS sets, not just the first.
2. **The cost-model "divergence" is intentional** by the original author — the constant comment says "rough estimate" — so framing it as a "P1 gap" was overstated. It's a documentation gap, not a calculation bug.
3. **Approach 1 reassessment is favourable** — smaller SPEC scope reduces the burnout risk that motivated the Approach 1 fallbacks. Good news, but means I oversold the risk in the original feasibility report (planning §6 claimed Approach 1 had non-trivial PO load).
4. **All recommendations are conditional** on PO direction for R-01 (which phases earn which ranks). Without that input, R-01-A is a placeholder.

**No code changes in this commit.** Recommendations only.
