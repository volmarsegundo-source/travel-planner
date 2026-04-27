# Sprint 47 — Consolidated Backlog (Candidate)

**Status:** Draft — input to Sprint 47 planning (not Sprint 47 kickoff).
**Source:** Sprint 46 Day 2 cont. PO decisions (R-01-A, R-02-B) + the planning doc §10 V2 Waves 3-5 scope already approved.
**Author:** product-owner + tech-lead (orchestration).
**Date:** 2026-04-24 (last updated 2026-04-25 after Sprint 46 P1 follow-ups landed).

> **Update 2026-04-25**: Two P1 items from the 4-agent batch-review synthesis (commit `a8bef3a` §10.3) — `B47-MW-PURE-FN` and `B47-API-RBAC-CONVENTION` — were moved from this backlog to Sprint 46 per PO autonomous-execution authorization (pre-Wave 2 hardening). Both shipped in commits `8a3c486` and `26233e8`. They are removed from the §"Items moved IN from batch review" addendum below for full audit.

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

## P2 — Sprint 46.5 process corrections (added 2026-04-27)

These two items are the systemic follow-ups to the Sprint 46 walk-through "shipping vapor" findings (commits `9717506` + `1806731`). The specific case was resolved in Sprint 46.5 (commits `68bb0e5` + `a878f62` + `0376691`); these items prevent recurrence.

### B47-FLAGS-REGISTRY — Honesty flags formal registry (P2)

- **Source**: Sprint 46 walk-through investigation v2 §11.3 + Sprint 46.5 retrospective input ("shipping vapor" pattern §4.2)
- **Effort**: 2-3h
- **Priority**: P2
- **Trigger**: Sprint 46 published ~50 honesty flags across 17 commits as Markdown text in release notes. None had owner / target sprint / status tracking. The B-W1-006 flag #4 ("AdminNav not extended") survived 11 commits without follow-up and became the F-WALK-02 root cause exposed during walk-through.
- **Scope**:
  - Create `docs/qa/honesty-flags-registry.md` with columns: ID, source commit, severity (P1/P2/P3), owner, target sprint, status (open / in-progress / resolved / wont-fix).
  - Backfill all flags from Sprint 46 release notes (~50 entries) — requires read pass over `docs/releases/b-w1-*.md`, `b-w2-*.md`, `f-fix-*.md`, `f-ops-*.md`.
  - Add a CI/pre-commit hook (or weekly script) that flags release notes containing honesty flags but no corresponding registry entry.
  - Update `docs/process/ADOPTION-CHECKLIST.md` (or create) to require "registry entry created" as part of release note publication.
- **Acceptance criteria**:
  - Registry exists with all Sprint 46 flags backfilled.
  - At least 1 flag marked "resolved" by Sprint 47 (e.g. B-W1-006 flag #4 already closed by F-FIX-05 in Sprint 46.5).
  - New flags from Sprint 47+ commits land in the registry alongside the release note.
- **Dependencies**: none.
- **Owner (proposed)**: tech-lead + qa-engineer (registry stewardship).

### B47-UI-DOD-DISCOVER — UI Definition of Done with discoverability (P2)

- **Source**: Sprint 46 walk-through investigation v2 §11.3 + Sprint 46.5 wave-close-staging-readiness checklist §4
- **Effort**: 1-2h
- **Priority**: P2
- **Trigger**: Existing DoD for UI items required RTL tests + a11y class tokens but did not require "feature is reachable via primary navigation". Sprint 46 Wave 2 met the existing DoD but produced features admins could not reach (F-WALK-02 root cause).
- **Scope**:
  - Create `docs/process/definition-of-done.md` (or extend `ADOPTION-CHECKLIST.md`) with explicit DoD bullet: "Every new UI route MUST be reachable via primary navigation in the same Sprint that adds the route. Direct-URL-only access requires explicit rationale in release notes + ticket for next-sprint navigation extension."
  - Add forbidden anti-patterns: "Nav not extended — intentional during Wave N" without ticket; "Access via direct URL" as permanent solution; flag-gated nav items where flag ON Staging differs from Prod.
  - Cross-reference `wave-close-staging-readiness.md` §4 (Sprint 46.5 deliverable).
- **Acceptance criteria**:
  - DoD doc exists and is referenced from `ADOPTION-CHECKLIST.md`.
  - tech-lead PR review template updated to ask "is this UI route discoverable via primary nav?".
  - At least 1 retro Sprint 46 retrospective entry references this DoD (already done in `docs/sprint-reviews/sprint-46-retrospective-inputs/shipping-vapor-pattern.md` §4.2).
- **Dependencies**: none.
- **Owner (proposed)**: tech-lead + ux-designer (review).

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

## Items added IN from batch-review (synthesis §10.3) — Sprint 46 Day 3+

The 4-agent batch review of Sprint 46 commits (`ce223f4..bfa2643`) surfaced one consolidated P1 plus 9 P2 items. PO consumed two P1s into Sprint 46 (see header note); the remainder are added here for Sprint 47 planning consideration.

| ID | Item | Source | Effort | Priority |
|---|---|---|---|---|
| ~~B47-MW-PURE-FN~~ | ~~Extract middleware RBAC decision to pure function~~ | All 4 agents | 2-3h | ~~P1~~ → **DONE** in S46 (`8a3c486`) |
| ~~B47-API-RBAC-CONVENTION~~ | ~~HOF wrappers + compliance test for `/api/admin/ai/**`~~ | security | 4-6h | ~~P1~~ → **DONE** in S46 (`26233e8`) |
| B47-WAVE1-SMOKE | Manual PO walk-through of Wave 1 surfaces in Staging post-deploy | qa | 30min PO + doc | P1 (PO action) |
| B47-FALLBACK-CONST | Shared constants module — `HARDCODED_FALLBACK` ↔ seed defaults | tech-lead + architect | 1-2h | P2 |
| B47-NAV-IA-LINK | Extend `AdminNav` with `/admin/ia` entry (gated by `AI_GOVERNANCE_V2`) | tech-lead + architect | 1h | P2 (Wave 2 dep.) |
| B47-COVERAGE-INCLUDE | Vitest coverage scope expansion to `src/app/api/**` + selected admin/** | qa | 1-3h | P2 |
| B47-XPATH-WARN | Warn log when middleware fails to set `x-pathname` | security | 30min | P2 |
| B47-BDD-MAP | BDD-to-test mapping audit (identify aspirational scenarios) | qa | 2-3h | P2 |
| B47-SEC-AUDIT-WAVE1 | SPEC-SEC-AUDIT-001 walk on Wave 1 surfaces (RBAC, audit, layout, page) | security | 4-6h | P2 |
| B47-V1-V2-DEPRECATION-PLAN | V1 `/admin/ai-governance` ↔ V2 `/admin/ia` coexistence roadmap | architect | 30min doc | P2 |
| B47-SEED-AUTO | Decide on `prisma db seed` auto-wiring at Vercel deploy | tech-lead, architect | 1-2h | P2 |
| B47-WAVE3-MICROBENCH | Hot-path microbench during Wave 3 (`AiConfigResolver` polling) | tech-lead | 2-3h | P2 |
| B47-PRISMA-NULL-SEMANTICS | Test `Prisma.JsonNull` vs `null` distinction in audit log | qa | 1h | P3 |

**Net carry-over to Sprint 47**: ~17-31h (was ~22-37h before two P1s consumed).

---

## Status

This BACKLOG is **input to Sprint 47 planning** — not a commitment. Final Sprint 47 scope decided at Sprint 47 kickoff (after Sprint 46 close).
