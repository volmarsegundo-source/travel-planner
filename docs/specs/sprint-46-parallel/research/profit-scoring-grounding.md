# Profit Scoring + Dynamic Ranking — Grounding Report

**Date:** 2026-04-24 (Sprint 46 Day 1, after Task A `ce223f4`)
**Author:** dev-fullstack-1 (impersonated for the grounding sweep)
**Purpose:** Factual basis for PO to draft `SPEC-PROFIT-SCORING-001` and `SPEC-DYNAMIC-RANKING-001` per execution plan §6 Approach 1 (Sprint Zero parallel).
**Read-only**: zero code changes. Zero invented numbers — every claim is line-anchored.

---

## §1 — Files identified

### 1.1 Profit Scoring (4 files in `src/`)

| Path | Lines | Role |
|---|---|---|
| `src/server/services/admin-dashboard.service.ts` | 1-540+ | **Primary owner.** Defines `AI_COST_PER_PA_CENTS = 1` constant; computes margin & per-user profit. |
| `src/app/[locale]/(app)/admin/dashboard/AdminDashboardClient.tsx` | (consumes) | UI: sort by `revenue` / `aiCost` / `profit` / `rank`; pagination; renders `PerUserProfitRow`. |
| `src/app/[locale]/(app)/admin/dashboard/page.tsx` | (consumes) | Server Component: SSR-fetches initial KPIs + first page of profit table. |
| `src/app/api/admin/export-csv/route.ts` | (consumes) | CSV export of per-user profit (max 10k rows per `CSV_MAX_ROWS`). |

### 1.2 Dynamic Ranking (3 files in `src/`)

| Path | Lines | Role |
|---|---|---|
| `src/types/gamification.types.ts` | 3-9 | `Rank` type — 6 tiers: `novato`, `desbravador`, `navegador`, `capitao`, `aventureiro`, `lendario`. |
| `src/lib/engines/points-engine.ts` | 272-285 | `PointsEngine.updateRank(userId, newRank, tx?)` — the ONLY mutation site for `currentRank`. |
| `src/lib/engines/phase-engine.ts` | 254-258 | `PhaseEngine.completePhase()` triggers `updateRank()` IF `definition.rankPromotion` is non-null. |
| `src/lib/engines/phase-config.ts` | 33, 144 | Phase definitions — TWO phases set `rankPromotion: "desbravador"`. NO other phases promote. |

### 1.3 Schema (Prisma)

- `prisma/schema.prisma`: `UserProgress.currentRank` field is the storage. Default `"novato"`. **NOT enumerated as a Postgres enum** — stored as `String`. (Confirmed via grep: no Prisma `enum Rank` declaration.)

### 1.4 Cost calculation

`src/lib/cost-calculator.ts` defines `MODEL_PRICING` per model — currently used for AI usage logging, **NOT for the profit calculation in admin-dashboard.service.ts.** The admin dashboard uses a separate flat `AI_COST_PER_PA_CENTS = 1` heuristic. **Two cost models coexist** — see §3 below.

---

## §2 — Business rules extracted (from code, line-anchored)

### 2.1 Profit Scoring — input

| Datum | Source | Path |
|---|---|---|
| Revenue per user | `Purchase` rows where `status: "confirmed"` | `admin-dashboard.service.ts:364-367` |
| AI spend (in PA points) | `PointTransaction` rows where `type: "ai_usage"` AND `amount: { lt: 0 }` | `admin-dashboard.service.ts:368-371` |
| Per-PA AI cost | Hardcoded `AI_COST_PER_PA_CENTS = 1` | `admin-dashboard.service.ts:12` |

### 2.2 Profit Scoring — calculation

```
totalPurchasedCents = sum( purchase.amountCents WHERE status='confirmed' )    // line 384-387
aiSpendPA           = sum( |pointTransaction.amount| WHERE type='ai_usage' )  // line 388-391
estimatedAiCostCents = aiSpendPA * AI_COST_PER_PA_CENTS                       // line 392
profitCents         = totalPurchasedCents - estimatedAiCostCents              // line 408
```

**Aggregate KPI** (admin-dashboard.service.ts:120-173 `getKPIs`):
```
totalRevenueCents      = aggregate(purchase.amountCents WHERE status='confirmed')   // line 129-132
totalAiPaSpent         = sum( |pointTransaction.amount| WHERE type='ai_usage' )    // line 155-158
estimatedAiCostCents   = totalAiPaSpent * AI_COST_PER_PA_CENTS                     // line 159
marginCents            = totalRevenueCents - estimatedAiCostCents                  // line 162
```

**Enhanced KPIs** (admin-dashboard.service.ts:178-233 `getEnhancedKPIs`):
```
arpu                = round( totalRevenueCents / payingUsers )                          // line 207-209
conversionRate      = round( payingUsers / totalUsers * 10000 ) / 100                   // line 210-212
grossMarginPercent  = round( (totalRevenue - aiCost) / totalRevenue * 10000 ) / 100     // line 215-221
```

### 2.3 Profit Scoring — output

| Field | Type | Where consumed |
|---|---|---|
| `profitCents` | `number` (signed; can be negative) | UI sort key `"profit"`, CSV export, per-user table cell |
| `marginCents` | `number` | KPI tile (top of dashboard) |
| `grossMarginPercent` | `number` (e.g. `15.50`) | KPI tile alongside arpu |

### 2.4 Profit Scoring — side effects

**None.** `getKPIs`, `getEnhancedKPIs`, `getPerUserProfit` are all **pure read operations**. No DB writes, no event emission, no observability beyond standard request logging.

### 2.5 Dynamic Ranking — actual mechanism today

**Ranking is NOT dynamic in any data-driven sense today.** It is **milestone-based**:

```
PhaseEngine.completePhase(userId, phaseId)                   // phase-engine.ts:254
  IF (phaseDefinition.rankPromotion IS NOT NULL)              // line 256
    PointsEngine.updateRank(userId, phaseDefinition.rankPromotion)  // line 257
```

Per `phase-config.ts`:
- 2 phases set `rankPromotion: "desbravador"` (lines 33, 144).
- **No other phases promote.**
- The 4 ranks above `desbravador` (`navegador`, `capitao`, `aventureiro`, `lendario`) are **declared in the type but never assigned anywhere in code**.

So today: every user is either `novato` (default) or `desbravador` (after completing the milestone phase). There is no scheduled re-evaluation, no points threshold, no profit-driven promotion.

The admin dashboard sorts by `currentRank` (`admin-dashboard.service.ts:344-347`) but with only 2 effective values, sort discrimination is minimal.

---

## §3 — Implicit assumptions in code (likely deliberate; require PO confirmation)

| ID | Assumption | Location | Why surprising |
|---|---|---|---|
| **A-01** | `AI_COST_PER_PA_CENTS = 1` is a **flat heuristic** ("rough estimate"). Comment line 11: "1 PA of AI cost ~ R$ 0.01 (1 cent)". | `admin-dashboard.service.ts:11-12` | It diverges from the per-model pricing in `cost-calculator.ts` (Gemini 2.0 Flash $0.10/MTok input / $0.40/MTok output → much cheaper than $0.01/PA depending on PA-to-token mapping). **Two cost models coexist.** |
| **A-02** | Profit calc uses `Purchase.amountCents WHERE status='confirmed'` only. Refunded / disputed / pending purchases are excluded silently. | `admin-dashboard.service.ts:130, 365` | No filter for refund chargebacks → "profit" can lag refund events. |
| **A-03** | `aiSpendPA` is `|amount|` of negative `ai_usage` transactions. Implies all AI charges are recorded as **negative point transactions** with `type='ai_usage'`. | `admin-dashboard.service.ts:155-158, 388-391` | If any AI feature debits via a different mechanism (e.g. direct cost, sub-account), it's silently excluded. |
| **A-04** | `currentRank` defaults to `"novato"` and is mutated **only during phase completion**, never on a points threshold or scheduled job. | `points-engine.ts:36, 64, 90`; `phase-engine.ts:254-258` | The rank ladder of 6 tiers exists in the type but only 2 are reachable today. |
| **A-05** | Rank sort in admin uses Prisma `orderBy: { progress: { currentRank: 'asc' } }` — **alphabetical sort on the string field**, not by tier ordinal. | `admin-dashboard.service.ts:345-347` | `"capitao"` sorts before `"desbravador"` alphabetically, not by progression. The UI may render in a non-progression order. |
| **A-06** | CSV export caps at `CSV_MAX_ROWS = 10_000`. | `admin-dashboard.service.ts:15` | Silent truncation if user count exceeds 10k — admin may not see complete picture. |
| **A-07** | `grossMarginPercent` is rounded to 2 decimals. ARPU is rounded to integer cents. | `admin-dashboard.service.ts:207-221` | No documentation of why these precisions specifically. |
| **A-08** | `payingUsers` filtering uses `distinct: ["userId"]` over confirmed purchases. A user who refunded their only purchase still counts as "paying". | `admin-dashboard.service.ts:190-194` | Inflates the conversion-rate denominator-numerator over time. |
| **A-09** | Active users = updated in last 30 days. Hardcoded threshold. | `admin-dashboard.service.ts:137` | No env override; not aligned with any documented retention SLA. |
| **A-10** | KPI computation runs on every dashboard page load (not cached, not pre-aggregated). | `admin-dashboard.service.ts:120-152` | Performance scales linearly with `Purchase` + `PointTransaction` row count. At Beta scale (10×) this could become slow. |

---

## §4 — Questions for PO

### §4.1 High priority (block SPEC drafting)

1. **A-01**: Is `AI_COST_PER_PA_CENTS = 1` the correct cost model post-Beta, or should profit scoring use the actual `MODEL_PRICING` from `cost-calculator.ts`? (If yes → schema for storing per-call cost on `PointTransaction` likely needed.)
2. **A-02**: Should profit subtract refunded purchases? If yes, what's the refund signal — `Purchase.status` enum extension?
3. **A-04 + Dynamic Ranking framing**: Is "Dynamic Ranking" intended to mean (a) rank reacts to points thresholds, (b) rank reacts to profit tier, (c) rank reacts to recent activity, (d) rank stays milestone-based but more milestones get added, or (e) something else? **The ranks 3-6 (`navegador`...`lendario`) are unreachable today** — is that the gap to close?
4. **A-05**: Should rank sort be by tier-ordinal (progression) or alphabetical (current behavior)?
5. **A-08**: Does "paying user" count include users whose only purchase was refunded?

### §4.2 Lower priority (can be answered during SPEC drafting)

6. **A-03**: Are there AI charge paths that bypass `pointTransaction` with `type='ai_usage'`? (E.g. admin internal calls, batch jobs.)
7. **A-06**: Should CSV export warn / paginate when > 10k rows? Or keep silent truncation?
8. **A-07**: What precision does the business want for `grossMarginPercent`? 2 decimals = sensible default; should it be configurable?
9. **A-09**: 30-day active-user definition — confirm or change. Some products use 7d, 14d, or sliding windows.
10. **A-10**: Is per-request KPI computation acceptable indefinitely, or does Beta scale require pre-aggregation (materialized view, scheduled refresh)?
11. **Rule additivity**: if PO defines new profit rules (tier multipliers, promo discounts), are they **additive** (stack) or **replace** the base calculation?
12. **Backfill policy**: when new profit/ranking rules ship, should historical data be retro-computed or only forward-looking?
13. **Time-window scoping**: should KPIs be all-time (current default) or have a default period filter (e.g. last 90 days)?
14. **Per-tier customization**: should `Rank` tiers carry numeric "minimum points / minimum spend / minimum trips" thresholds? If so, configurable in admin or hardcoded?
15. **Audit logging**: if rank promotion becomes data-driven, should every promotion emit an audit log row (similar to V2 `AuditLog` model)?

---

## §5 — Potential gaps in current implementation

| Gap | Severity (perceived) | Notes |
|---|---|---|
| Ranks 3-6 (`navegador`, `capitao`, `aventureiro`, `lendario`) are declared but never assigned. | **High** if PO intended a full progression ladder | Type is dead-code territory beyond `desbravador`. |
| No tests found for `getPerUserProfit` / `getKPIs` (search: `find src -name "*admin-dashboard*test*"` returns nothing). | **High** for a money-touching service | If PO commits to refining rules, regression coverage must come first. |
| Two cost models (`AI_COST_PER_PA_CENTS` flat vs `MODEL_PRICING` per-token) coexist with no comment reconciling them. | Medium | Real cost may diverge from displayed cost meaningfully. |
| Rank sort alphabetical (A-05) — likely wrong UX. | Medium | Single-line fix when SPEC defines ordinal. |
| No materialized aggregation for KPIs — every dashboard load = full table scans. | Low at current scale, **High at Beta** | Performance debt. |
| No audit log for rank changes. | Medium for compliance / ops introspection | Easy to add when rank logic is restructured. |
| `rank` sort key in admin is unique to alphabetical Prisma sort but UI client also sorts; potential double-sort ambiguity. | Low | Verify with code-trace before SPEC. |

---

## §6 — Relationship between Profit Scoring and Dynamic Ranking

Today, the two systems are **independent**:

- Profit Scoring lives in `admin-dashboard.service.ts` (read-only KPI computation).
- Ranking lives in `points-engine.ts` + `phase-engine.ts` (milestone-driven, no profit input).

If PO's intent is **rank reacts to profit tier** (one of the candidate framings in Q-3 above), the systems need explicit coupling:

- A new "rank rule" surface (e.g. `RankRule { minProfitCents, minPoints, ... }`).
- A scheduled job or per-event recompute (e.g. on every purchase confirmation).
- Migration of the milestone-based rank logic in `phase-engine.ts` to coexist with rule-based logic.

Alternative framing — **rank is decorative, profit is operational** — keeps the two independent and reduces SPEC scope. The PO should pick the framing in §4.1 Q-3.

---

## §7 — Search effort transparency

Search patterns used to ground this report:

```
grep -ri "profit" --include="*.ts" --include="*.tsx" src/      # 4 hits
grep -ri "Profit" src/                                          # confirms 4 hits
grep -rn "currentRank" src/lib/engines/                         # 5 hits in points-engine
grep -rn "AI_COST_PER_PA_CENTS" src/                            # 3 hits, all in admin-dashboard
grep -rn "rankPromotion" src/                                   # 4 hits (config + engine + types)
find src -name "*admin-dashboard*test*"                         # zero results
find src -name "cost-calculator*"                               # 1 file
```

Files NOT searched (out of scope):
- `node_modules/` — third-party, not relevant.
- `prisma/migrations/` — migration history, not behavior.
- Existing SPECs in `docs/specs/` — PO may want to consult separately for prior intent.

---

## §8 — Recommended PO action items

1. Read this report (~ 30 min).
2. Answer Questions 1-5 (§4.1) — these unblock SPEC drafting (~ 30-60 min).
3. Decide framing for "Dynamic Ranking" per Q-3 — single biggest decision (~ 10 min focused).
4. Schedule first SPEC drafting session per execution plan §6.3 (Week 1, 0.5 day).

Once Q-3 is answered, the SPEC scope is bounded enough to start `SPEC-PROFIT-SCORING-001` and `SPEC-DYNAMIC-RANKING-001` drafts.

---

**End of grounding report.** Zero code changes. Ready for PO consumption.
