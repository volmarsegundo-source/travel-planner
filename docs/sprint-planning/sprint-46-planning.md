# Sprint 46 — Planning Document (candidate for PO decision)

**Status:** Draft — decisional input only. Sprint 46 kickoff is a separate task.
**Author:** product-owner + tech-lead + architect (orchestration)
**Date:** 2026-04-24
**Source artifacts:** `docs/specs/sprint-46/` (9 V2 SPECs, 4889 lines, approved 2026-04-17), `docs/specs/sprint-46-candidates/` (4 additional SPECs + BACKLOG.md), `docs/sprint-reviews/sprint-45-review.md`, `docs/sprint-reviews/sprint-45-retrospective.md`.

---

## §0 — Grounding summary

### 0.1 Discovery correction

The `BACKLOG.md` authored in Sprint 45 review Phase 2 omitted the **9 AI Governance V2 SPECs** that live at `docs/specs/sprint-46/`. Those SPECs were approved on 2026-04-17 (commit `093c62f`), *before* Sprint 45 kickoff (commit `ac6fb63`, 2026-04-19). The reorganization commit explicitly names AI Governance V2 as Sprint 46 scope. This planning doc supersedes the earlier BACKLOG.md framing.

### 0.2 The real Sprint 46 input pool

| Category | Count | Source |
|---|---|---|
| AI Governance V2 SPECs (Waves 1-5 flagship) | 9 | `docs/specs/sprint-46/` |
| AI Governance V2 post-Beta (Wave 6 A/B testing) | part of above | `SPEC-TECHLEAD-AI-GOVERNANCE-V2` §2 |
| Sprint 46 candidate SPECs (BUG-C triggered) | 4 | `docs/specs/sprint-46-candidates/` |
| BACKLOG items (explicit) | 18 (B46-01..B46-18) | `docs/specs/sprint-46-candidates/BACKLOG.md` |
| Pre-Beta items with source doc **missing** | 2 | Profit scoring rules, Dynamic ranking |
| Pre-Beta items with partial source | 1 | Gemini primary no-timeout (only risk-assessment doc) |
| Pre-Beta items now mapped to V2 | 1 (expands to 6 sub-items) | 6 AI Governance items → V2 |

---

## §1 — Per-item estimation

### 1.1 AI Governance V2 (the flagship — 6 waves from SPEC-TECHLEAD consolidated plan)

Numbers below are **author-provided** (SPEC-TECHLEAD v1.1.0 §2), not independently reverified. Calendar assumes 2 devs in parallel.

| Wave | Title | Effort pts | Days | Discovery risk | Deps / Infra prereqs | Governance |
|---|---|---:|---:|---|---|---|
| 1 | Esqueleto + Auth + Feature Flag | 15 | 5-6d | **Medium** — schema of 5 new Prisma models (PromptVersion, PromptEvalResult, ModelAssignment, AiRuntimeConfig, AuditLog) can surface adapter-contract gotchas | Migration, seed, `AI_GOVERNANCE_V2` flag in `env.ts` | Full SDD+TDD+BDD+EDD |
| 2 | Editor de Prompts + Versionamento | 25 | 7-9d | **High** — largest wave; UI + backend + immutable versioning semantics | Wave 1 shipped; RBAC `admin-ai-approver` role decision | Full |
| 3 | Modelo/Timeout Real-Time + Config | 20 | 5-7d | **Medium** — hot-path DB polling (every AI call hits DB). Requires graceful degradation design | Wave 1; polling cache TTL decision | Full |
| 4 | Curadoria de Outputs (bias/hallucination/risk) | 20 | 5-7d | **High** — LLM-as-judge cost variance, new curation UI | Wave 3 (needs AI calls to curate); eval harness | Full |
| 5 | Eval Integrado (Promptfoo) | 20 | 6-8d | **Medium** — existing promptfoo infra (`pf:eval` scripts already wired); integrate into Draft→Gate→Active flow | Wave 2 + 4 | Full |
| 6 | A/B Testing (post-Beta, optional) | 15 | 5-7d | **High** — statistical framework; traffic splitting | All prior waves | Full |
| **Sum Waves 1-5** | | **100** | **28-37d (4-6 cal-wks)** | | | |
| **Sum + Wave 6** | | **115** | **33-44d** | | | |

### 1.2 Sprint 46 candidates (BUG-C-triggered)

| ID | Item | Effort | Discovery risk | Deps | Infra | Governance |
|---|---|---|---|---|---|---|
| B46-01 | SPEC-SEC-AUDIT-001: audit every SEC spec for theater | 6-10h | **High** — may surface more latent bugs (CSP nonce precedent) | Independent | None | Full (findings become new specs) |
| B46-02 | SPEC-TEST-MOCK-ASSERTION-001: mock-assertion rule | 4-8h | Medium | Independent | None | Proportional (adds process rule) |
| B46-03 | SPEC-PROCESS-RETROSPECTIVE-BUG-C + MSW OAuth stub + adapter tests + retroactive audit | 12-20h (multi-part) | **High** — retroactive audit can find additional gaps in pre-db73225 specs | B46-02 clarifies mock rules | MSW harness | Full |
| B46-04 | Rate-limit global fail-closed ADR | 2-4h | Low | Depends on B46-06 (Sentry alert precondition) | None | Proportional (ADR only) |
| B46-05 | CI fix: `project-bootstrap.test.ts:69` | 0.5h | Low | Independent | None | Minimal |
| B46-06 | SPEC-OBSERVABILITY-SENTRY-001: Sentry forward | 3-5h | Low | Independent | Sentry dashboard config | Proportional |
| B46-07 | EDD Eval Gates exit-code fix | 1-2h | Low | Independent | None | Minimal |
| B46-08 | Redis Staging provider decision | 2-4h | Medium (cost/compat unknown) | Independent | Redis provisioning | Decision doc + smoke |
| B46-09 | SMTP / Resend config | 2-4h | Low | Independent | Resend account | Smoke test |
| B46-10 | `sanitizeCallbackUrl` consistency | 0.5h + tests | Low | Independent | None | Minimal (TDD) |
| B46-11 | F-01: `/expedition` vs `/expeditions` list | 0.25h | Low | Independent | None | Minimal |
| B46-12 | F-02: `canUseAI(null)` permissive default | 2-3h | Medium — callers may rely on `true` default | Independent | None | Full (security surface) |
| B46-13 | Playwright E2E age-gate + OAuth | (covered by B46-03) | — | B46-03 | MSW | — |
| B46-14 | Coverage branches 78→80 | 2-4h | Low | Independent | None | Proportional |
| B46-15 | 2 slow coverage-mode tests | 3-5h | Medium | Independent | None | Proportional |
| B46-16 | 4 S44 injection-resistance failures (IR-024) | **TBD — source doc unknown** | Unknown | Depends on locating source | None | Full (security) |
| B46-17 | Layout query coalescing | 1-2h | Low | None (opt.) | None | Minimal |
| B46-18 | Diagnostic hygiene cleanup | 0.5h | Low | None | None | Minimal |
| **Sum (excluding 16)** | | **44-81h** (≈ 6-10 dev-days single thread) | | | | |

### 1.3 Pre-Beta items (from §2 below)

| Pre-Beta item | Classification | Effort | Source |
|---|---|---|---|
| Gemini primary no-timeout | **MUST** (AI infra blocker) | TBD — needs decision doc first | Partial source: `RISK-ASSESSMENT-EDGE-RUNTIME.md` |
| Profit scoring rules | Classification deferred | TBD | **source doc missing** |
| Dynamic ranking | Classification deferred | TBD | **source doc missing** |
| 6 AI Governance sub-items | **MUST** (already scoped via V2) | Included in Waves 1-5 (100 pts / 28-37d) | `SPEC-AI-GOVERNANCE-V2` + 8 siblings |

### 1.4 Totals (rough, for scenario sizing)

| Slice | Best case | Worst case |
|---|---:|---:|
| V2 Waves 1-5 (2 devs parallel) | 28 days | 37 days |
| BACKLOG B46-01..18 (excluding B46-16 unknown) | 6 days | 10 days |
| Gemini decision + implementation (ADR + fix) | 1 day | 4 days |
| Profit scoring + Dynamic ranking (if MUST pre-Beta) | — (undefined) | — (undefined) |
| **Combined max (V2 + backlog + Gemini)** | **35 days** | **51 days** |

---

## §2 — Pre-Beta items analysis

### 2.1 Item-by-item

**(a) Profit scoring rules** — ❌ **NOT FOUND**.
Searched `grep -r "profit scor\|Profit scor" docs/` — only matches are the backlog doc and sprint-45 review (my own docs referring to it as "unknown"). No SPEC, no ADR, no ticket.
**Recommended action**: PO must confirm what this refers to. Candidates: (a) pricing/monetisation scoring for subscription plans (tied to `Subscription` model); (b) AI output scoring (but that's V2 curation); (c) something else. **If truly unscoped, move to a dedicated Sprint Zero pre-Beta task** where product-owner + ai-specialist produce a SPEC before Sprint 46 can commit to it.

**(b) Gemini primary no-timeout** — ⚠️ **PARTIAL SOURCE**.
Source: `docs/RISK-ASSESSMENT-EDGE-RUNTIME.md` (2026-04-20 risk register). Context: Vercel Hobby 60s serverless limit; Gemini takes 35-50s per phase; Phase 5/6 timeouts recurrent. Two options documented:
- **Option 1**: Migrate AI-streaming routes to Edge runtime (Gemini SDK is Edge-compatible; Buffer-free). Risk: R-09 BOLA if JWT not fresh-verified.
- **Option 2**: Keep Node runtime but refill Anthropic credits + activate automatic Gemini→Claude fallback on timeout.
**Classification**: **MUST** (pre-Beta) — this is an AI infra blocker that affects every user on Phase 5/6.
**Recommended action**: produce an ADR (1d) choosing Edge vs Claude-fallback; then implement (1-3d). ADR authorship is quick; ship decision belongs on Sprint 46 kickoff.

**(c) Dynamic ranking** — ❌ **NOT FOUND**. Same situation as (a). No SPEC, no code reference, no infra doc. **Recommend Sprint Zero scoping task.**

**(d) 6 AI Governance items** — ✅ **FOUND, mapped to V2**.
- Prompt Registry → `PromptVersion` model in V2 Wave 1 + Editor in Wave 2.
- Policy Engine → Curation/validation rules in V2 Wave 4 (bias/hallucination/risk).
- Cost Dashboard → V2 Wave 3 Model/Timeout config exposes cost metrics.
- FinOps Alerts → V2 OPS spec observability + SPEC-OBSERVABILITY-SENTRY-001 (B46-06) integration.
- Observability → `SPEC-OPS-AI-GOVERNANCE-V2` + B46-06 combined.
- Output Validation → V2 Wave 4 Curadoria + V2 Wave 5 Eval Integrado.

### 2.2 Pre-Beta classification summary

| Item | MUST / SHOULD / COULD | Action |
|---|---|---|
| 6 AI Governance items | **MUST** | Covered by V2 Waves 1-5 (100 pts) — execute in Sprint 46 |
| Gemini primary no-timeout | **MUST** | Add ADR + implementation to Sprint 46 (~2-5d) |
| Profit scoring rules | **TBD** (unscoped) | Sprint Zero task required before Sprint 46 commits |
| Dynamic ranking | **TBD** (unscoped) | Sprint Zero task required before Sprint 46 commits |

---

## §3 — Scope scenarios

All durations assume **2 devs in parallel** (per V2 TECHLEAD spec). Add 15-20% buffer for unknowns (see §4).

### Scenario A — Minimalist (Governance + 4 Sprint 46 candidate SPECs only)

**Scope** (excludes V2 flagship):
- B46-01 SPEC-SEC-AUDIT
- B46-02 SPEC-TEST-MOCK-ASSERTION
- B46-03 SPEC-PROCESS-RETROSPECTIVE-BUG-C + MSW OAuth stub + adapter tests + retroactive audit
- B46-06 SPEC-OBSERVABILITY-SENTRY
- B46-05 + B46-07 CI fixes

**Out of scope**: V2 flagship work, all pre-Beta items, Redis/SMTP decisions, all security follow-ups except F-02.

**Effort**: ~25-43h (3-6 dev-days single thread; 2-4 days with 2 devs).

**Duration**: **1-1.5 calendar weeks**.

**Trade-offs**:
- ✅ Tight focus; entirely doable in one short sprint.
- ✅ Closes the BUG-C-triggered debt class comprehensively.
- ❌ **AI Governance V2 delay**: shifts 4-6 weeks of already-approved flagship work to Sprint 47+, pushing Beta 1-2 months further.
- ❌ Gemini timeout remains unmitigated; users continue hitting Phase 5/6 timeouts on Hobby tier.
- ❌ Pre-Beta items Profit scoring / Dynamic ranking not even scoped.

### Scenario B — Balanced (V2 Waves 1-3 + BUG-C governance + Gemini ADR)

**Scope**:
- V2 **Waves 1-3 only** (Esqueleto + Prompt Editor + Model/Timeout realtime) — 60 pts, 17-22d.
- B46-01, B46-02, B46-03, B46-06 in parallel (different devs/agents).
- B46-05, B46-07, B46-11 (trivial fixes; ~1h total).
- Gemini ADR + implementation (option 1 or 2; 2-5d).
- Redis Staging provider decision (B46-08, 2-4h).
- Defer: V2 Waves 4-5, B46-12 (canUseAI), B46-14/15 (coverage), Profit scoring + Dynamic ranking.

**Effort**:
- V2 Waves 1-3: 17-22d (2 devs parallel → 12-16 cal-days).
- Governance (B46-01/02/03/06): 25-43h; can overlap with V2 if a third person/agent.
- Gemini + Redis + trivial fixes: ~3-4 additional dev-days.

**Duration**: **3-4 calendar weeks**.

**Trade-offs**:
- ✅ Ships core V2 value (prompts editable in admin, models/timeouts hot-reload).
- ✅ Closes BUG-C debt without postponing a full sprint.
- ✅ Solves Gemini timeout.
- ⚠️ V2 Waves 4-5 (Curadoria + Eval) deferred to Sprint 47 — means V2 Beta-launches without automatic output curation or gated promotion.
- ⚠️ Sprint 45 retrospective warned against urgency-driven scope creep (→ Stop item St-01). Balancing V2 partial with governance is at the edge of sustainable.
- ❌ Profit scoring + Dynamic ranking still unscoped.

### Scenario C — Comprehensive (V2 Waves 1-5 complete + BUG-C governance + all pre-Beta MUST)

**Scope**:
- Full V2 Waves 1-5 (100 pts, 28-37d).
- All P1 BACKLOG items (B46-01 through B46-08).
- Gemini decision + fix.
- F-01 + F-02 security follow-ups.
- Sprint Zero for Profit scoring + Dynamic ranking **before Sprint 46 starts** (1-2d for scoping + SPEC authorship).

**Out of scope**: V2 Wave 6 (A/B testing — post-Beta), all P3 items.

**Effort**:
- V2 Waves 1-5: 28-37d (2 devs parallel → 20-26 cal-days).
- P1 backlog (B46-01..08): ~5-8 dev-days.
- Sprint Zero: 1-2 dev-days.
- Gemini: 2-5 dev-days.
- Security follow-ups: ~4-6h.

**Duration**: **5-7 calendar weeks** (with aggressive parallelization and no imprevistos).

**Trade-offs**:
- ✅ Sprint 46 delivers Beta-ready state end-to-end.
- ✅ V2 flagship + governance + pre-Beta all land together.
- ❌ **Largest sprint ever attempted in this project** — prior sprints are ~1-2 weeks; this is 5-7. Burnout risk real.
- ❌ Sprint 45 surfaced 5 unplanned bugs (A/B/C); Scenario C has zero buffer for similar discoveries.
- ❌ Long-running sprints have higher drift risk (SPEC vs code).

### Scenario D — Phased Beta Sprint (proposal born from §2 analysis)

**Rationale**: Scenario C is too long; Scenario B abandons V2 mid-stream. Split into two sequential but tightly scoped sprints.

**Sprint 46 — V2 foundation + governance + urgent infra** (3 weeks target):
- V2 Waves 1-2 (Esqueleto + Prompt Editor) — 40 pts, 12-15d.
- B46-01..08 (P1 backlog).
- Gemini ADR + implementation.
- Redis + SMTP decisions.
- Sprint Zero for Profit scoring / Dynamic ranking done **in parallel** by PO (not blocking dev work).

**Sprint 47 — V2 completion + Beta readiness** (2-3 weeks target):
- V2 Waves 3-5 (Model/Timeout + Curadoria + Eval) — 60 pts, 16-22d.
- Profit scoring + Dynamic ranking (now scoped).
- F-01, F-02 security follow-ups.
- Full pre-Beta smoke + PO acceptance.

**Trade-offs**:
- ✅ Sprint size stays within project's demonstrated capacity (≤3 weeks).
- ✅ V2 Foundation ships early (admin can start editing prompts before everything is done).
- ✅ Scoping tasks for unknown items don't block execution.
- ✅ Each sprint has natural rollback granularity.
- ⚠️ Two sprints vs one = more planning/review ceremony overhead.
- ⚠️ V2 Waves 3-5 hold back the full Beta readiness ~2-3 additional weeks vs Scenario C best case.

---

## §4 — Risk assessment + buffer

### 4.1 Risk register per scenario

| Risk | A | B | C | D |
|---|---|---|---|---|
| V2 scope creep — a wave takes 1.5× estimate | n/a | Medium impact | **High** | Medium (per-sprint) |
| BUG-C retroactive audit uncovers another latent bug | Medium | Medium | Medium | Low (dedicated sprint 1 slot) |
| Gemini ADR decision drags (needs finops input) | n/a | Medium | Medium | Low (decoupled) |
| Redis provider choice causes ops rework | Low | Low | Medium | Low |
| Profit scoring / Dynamic ranking discovered to be MUST pre-Beta during Sprint Zero | n/a | High disruption | Medium (Sprint Zero first) | Low (Sprint Zero parallel) |
| New critical bug (Sprint 45 precedent: 5 discovered in 6 days) | Low-Medium | Medium | **High** (no buffer) | Low-Medium (per sprint) |
| Governance slippage under time pressure (Sprint 45 retrospective Stop St-01) | Low | Medium | **High** | Medium |
| Auth.js v5-beta upstream breaking change | Low | Low | Medium | Low |

### 4.2 Recommended buffer

- **Scenario A**: 10% (3-4h) — tight scope, low discovery risk.
- **Scenario B**: 15% (~3-4 cal-days) — V2 partial + governance convergence.
- **Scenario C**: **25%** (~7-10 cal-days) — compensates for zero discovery slack.
- **Scenario D**: 15% per sprint (~2-3 cal-days each) — natural fault tolerance between sprints.

### 4.3 Schedule-risk interpretation

The Sprint 45 retrospective called out (St-01): *"skipping governance in 'debug mode' under perceived urgency"* and (St-05): *"deferring CI/infra fixes that fail silently"* as Stop items. Scenarios C and B both carry time pressure that historically correlates with those stop-items being violated. Scenario D is structurally protective against that pattern.

---

## §5 — Recommendation + Decision framework

### 5.1 Conditional recommendation

- **If PO prioritises Beta velocity over sustainable pace**: Scenario C — pay the burnout cost, land everything in one sprint.
- **If PO prioritises sustainable pace + early visible V2 value**: **Scenario D** — most aligned with project's demonstrated sprint capacity and Sprint 45 retrospective lessons. My best-fit suggestion.
- **If PO prioritises closing BUG-C debt strictly before any new V2 work**: Scenario A — short, clean, but delays flagship.
- **If PO prioritises V2 flagship partial + governance**: Scenario B — middle path but risks V2 half-shipped for 2+ sprints.

### 5.2 Five-question decision framework for PO

1. **External Beta deadline?** If yes and < 6 weeks out → Scenario C or D-compressed; otherwise D relaxed.
2. **How did the iter 1-5 shortcut (where governance was skipped) feel in retrospect — worth the speed or painful?** If painful → avoid C's time pressure; D or A.
3. **Are Profit scoring / Dynamic ranking actually MUST pre-Beta, or did they get put on the list speculatively?** If speculative, defer → Scenario D.
4. **Team capacity signal**: 2 devs + Claude Code agents are genuinely parallel, or do they converge on the same review/approval bottleneck? If the latter, effort estimates are overstated; reduce sprint size accordingly.
5. **What is the bar for Beta "ready"?** If "all 6 AI Governance items shipped end-to-end" → V2 Waves 1-5 required. If "AI controllable by admin even if not fully curated" → V2 Waves 1-3 suffice (Scenario D sprint 1 stop point).

### 5.3 Prerequisites before Sprint 46 kickoff

- [ ] This planning doc reviewed and approved by PO.
- [ ] Scenario chosen (A / B / C / D) and committed.
- [ ] Sprint 45 Prod promotion decided (commits `cb7df47` + `2f1ec2f` + `5aa5afb`).
- [ ] Profit scoring + Dynamic ranking status resolved: either located in an existing SPEC, or Sprint Zero scoping task kicked off.
- [ ] Gemini ADR outline drafted (even 1 page — choose direction before Sprint 46 commits to the fix).
- [ ] Redis Staging provider preliminary choice (full decision can land during sprint but preferred direction should be voiced now).
- [ ] PO explicitly declares: "ready to start Sprint 46".

---

## §7 — Trust Score targets for Sprint 46 closing

Baseline anchor: Sprint 45 closed with composite **0.93** (iter 8 trust score §7). Sprint 46 must not regress.

| Dimension | Weight | Sprint 45 closing | Sprint 46 target | Justification |
|---|---:|---:|---:|---|
| Safety | 30% | 0.97 | **≥ 0.95** | `SPEC-SEC-AUDIT-001` may surface new anti-patterns; temporary dip tolerated while findings are triaged. Recovery expected by sprint close. |
| Accuracy | 25% | 0.95 | **≥ 0.95** | No regression tolerated. V2 polling DB reads preserve accuracy as long as graceful-degradation fallback lands in Wave 1. |
| Performance | 20% | 0.82 | **≥ 0.85** | V2 observability (+ `SPEC-OBSERVABILITY-SENTRY-001`) gives real measurement for the first time; score improvement expected once baseline is captured. |
| UX | 15% | 0.95 | **≥ 0.90** | V2 admin tab adds surface area; transitional UX inconsistencies possible during Waves 1-3. |
| i18n | 10% | 0.93 | **≥ 0.93** | Iter 8 fix must be preserved — no regression. |
| **Composite** | 100% | **0.93** | **≥ 0.93** | **No regression allowed; growth optional.** |

**Gate condition**: if composite < 0.93 at Sprint 46 close, treat as regression — Sprint 46 does not close without a documented mitigation plan (equivalent to iter 7.1 hotfix precedent).

**Per-wave gate** (applicable in scenarios B, C, D): every V2 wave that ships must score **≥ 0.90** on a wave-scoped trust score before the next wave starts. This catches regressions wave-by-wave instead of at sprint close.

---

## §8 — Security considerations per scenario

Produced by security-specialist (architect stand-in) based on the audit items currently in flight.

| Dimension | Scenario A | Scenario B | Scenario C | Scenario D |
|---|---|---|---|---|
| `SPEC-SEC-AUDIT-001` shipped | ✅ | ✅ | ✅ | ✅ S46 |
| F-01 LOW (`/expedition` segment) | ❌ deferred | ✅ | ✅ | ✅ S46 |
| F-02 MEDIUM (`canUseAI(null)` permissive) | ❌ deferred | ✅ | ✅ | ✅ S46 |
| CI/EDD silent failure fixes | ❌ deferred | ✅ | ✅ | ✅ S46 |
| Iter 1-6 retroactive audit | ❌ deferred | ❌ deferred | ✅ | ✅ S47 |
| V2 SEC spec (`SPEC-SEC-AI-GOVERNANCE-V2`) executed | ❌ | Partial (Waves 1-2) | ✅ | Partial S46 + Full S47 |

### 8.1 Risk narrative per scenario

- **Scenario A**: Closes only the `SPEC-SEC-AUDIT-001` line item; F-01 + F-02 + retroactive audit all slide. **MEDIUM** debt accrual. F-02 has been latent since at least Sprint 11 (per iter 7 audit §7); leaving it to drift further is a policy choice the PO must own.
- **Scenario B**: Closes AUDIT + F-01 + F-02 + CI infrastructure. Retroactive audit of iter 1-6 slides. Acceptable — retroactive is hygiene, not live incident risk. **LOW** debt accrual.
- **Scenario C**: Closes everything. **BUT**: 5-7 week sprint triggers Sprint 45 retrospective Stop item St-01 ("skipping governance under urgency"). Security rigor requires focused attention; exhausted reviewers approve more. **Paradox: the most comprehensive scope may deliver the lowest-quality audit.**
- **Scenario D**: S46 closes AUDIT + F-01 + F-02 + CI. S47 closes iter 1-6 retroactive + Beta-readiness security sweep. **LOWEST** risk profile — paced rigor matches the nature of audit work.

### 8.2 Security recommendation

**Scenarios B or D preferred from a security standpoint.** Scenario A defers too much MEDIUM-class debt. Scenario C has a self-defeating time-pressure paradox. Between B and D, prefer D if the sprint team is already carrying Sprint 45 fatigue; prefer B if energy is fresh and scope discipline holds.

---

## §9 — Cost projection (FinOps)

Produced by finops-engineer — all figures preliminary. Each line requires provider-specific verification before Sprint 46 kickoff. Assumes current tier baselines.

| Line item | A | B | C | D (S46) | D (S47) |
|---|---:|---:|---:|---:|---:|
| Sentry tier upgrade (observability + V2 forwarder volume) | +$0-26/mo | +$0-26 | +$0-26 | +$0-26 | — |
| Redis provider (Upstash paid tier / Vercel KV) | — | +$10-30 | +$10-30 | +$10-30 | — |
| SMTP Resend (Beta email) | — | — | +$0-20 | — | +$0-20 |
| V2 Cost Dashboard infra (reads existing Prisma, minor DB load) | — | +$0-5 | +$0-10 | +$0-5 | +$0-5 |
| V2 eval run cost (Promptfoo, already wired) | — | — | +$2.80-22/mo | — | +$2.80-22/mo |
| V2 LLM-as-judge curation (~400 samples/mo) | — | — | +$1.40/mo | — | +$1.40/mo |
| MSW CI minutes (E2E runs) | +$1-5/mo | +$1-5 | +$1-5 | +$1-5 | +$0-2 |
| **Total estimated/mo** | **+$1-31** | **+$11-66** | **+$15-113** | **+$11-66** | **+$2.80-49** |

### 9.1 Observations

- Largest line items are **Sentry tier + Redis** — both depend on the chosen plan and traffic volume. Numbers above assume current Sprint 45 traffic; Beta launch could 10× them.
- V2 Waves 1-3 alone do not trigger eval/curation costs; those land in Waves 4-5.
- MSW in CI is marginal cost (CI minutes only; no subscription tier change).
- All figures are preliminary estimates — finops-engineer must re-verify with provider pricing pages before Sprint 46 kickoff, especially if Prod promotion bumps traffic.

### 9.2 Cost gate

None of the scenarios require a budget-approval conversation on their own — all fit under a normal "infra tier adjustment" envelope. The escalation trigger would be V2 eval cost spiking beyond ~$25/mo (Scenario C/D-S47 upper bound), which suggests more runs than the SPEC projected. Monitor via SPEC-OBSERVABILITY-SENTRY-001 once wired.

---

## §10 — BDD scenarios reference

Delivered at: **`docs/specs/bdd/sprint-46-goals.feature`** (created in Phase 6, this commit).

The feature file contains 12 scenarios across 5 applicability groups:

1. **All scenarios (3 scenarios)** — core SPECs shipped: SEC-AUDIT, TEST-MOCK-ASSERTION, OBSERVABILITY-SENTRY.
2. **V2 (scenarios B/C/D, 2 scenarios)** — Wave 1 foundation + Wave 2 prompt editor.
3. **Pre-Beta (scenario C or D-S46 depending on scope, 1 scenario)** — Gemini timeout ADR + implementation.
4. **Sprint Zero prerequisites (conditional, 2 scenarios)** — Profit scoring + Dynamic ranking scope definition.
5. **Cross-cutting governance + infra gates (ALL scenarios, 4 scenarios)** — no-shortcuts gate, retrospective depth, Redis provider, CI loud-fail.

Acceptance criteria for each scenario are phrased for closing-review evaluation — they answer "did Sprint 46 close cleanly on this dimension?" rather than "does the code work?". Code-level acceptance remains inside each individual SPEC.

---

## §11 — Correction Notice — Sprint 45 Review BACKLOG.md

**Finding during Sprint 46 Planning Phase 0**:

The `BACKLOG.md` committed in `a813412` (Sprint 45 Review Phase 2) omitted **9 V2 SPECs** located in `docs/specs/sprint-46/`. Those SPECs were approved on 2026-04-17 (commit `093c62f`) — **before Sprint 45 started** (commit `ac6fb63`, 2026-04-19) — and constitute **100-115 effort points / 28-44 days** of work that IS the main Sprint 46 flagship.

Additionally, 3 of the 4 pre-Beta items originally flagged as "source unknown" have updated classifications:

| Item | Sprint 45 review status | Sprint 46 planning status |
|---|---|---|
| 6 AI Governance items | "source unknown" | ✅ **FOUND** — mapped to V2 Waves 1-5 |
| Gemini primary no-timeout | "source unknown" | ⚠️ **PARTIAL** — `RISK-ASSESSMENT-EDGE-RUNTIME.md` has context + options; ADR pending |
| Profit scoring rules | "source unknown" | ❌ **STILL UNLOCATED** — Sprint Zero required |
| Dynamic ranking | "source unknown" | ❌ **STILL UNLOCATED** — Sprint Zero required |

### Correction approach

This planning doc supersedes `BACKLOG.md` as the authoritative Sprint 46 scope source. `BACKLOG.md` in `a813412` remains on record as a historical snapshot of Sprint 45 closing-state knowledge. Future Sprint 46 execution references this planning doc, not BACKLOG.md.

**No re-commit** of `a813412`. The correction lives inside this planning doc (§11) as a visible record, consistent with the project's append-only change-history convention.

### Action item at Sprint 46 kickoff

Re-issue an updated `BACKLOG.md` as part of Sprint 46 setup — marked as **v2**, with **all** items visible:

- 9 V2 SPECs (Waves 1-6).
- 18 original BACKLOG items (B46-01 through B46-18).
- Sprint Zero items for Profit scoring and Dynamic ranking (if PO keeps them in scope).

### Lessons learned to include in Sprint 46 retrospective

- **Grounding phase must grep ALL `docs/specs/*` subdirectories**, not rely on labelled backlog docs alone. `docs/specs/sprint-46/` had been silently present during Sprint 45 review Phase 0 but was not scanned.
- **Sprint Review docs should include an "artifacts inventory" section** that explicitly lists every SPEC folder scanned, so omissions become visible on review.
- **Author-of-convenience bias**: my Sprint 45 review BACKLOG.md leaned on the 4 candidate SPECs I had just authored, silently treating them as the flagship. The 9 pre-existing V2 SPECs had no author in my session context, so they weren't surfaced by default. Countermeasure: grounding checklist item "list every SPEC folder, not just ones I've touched".

---

## §12 — Appendix: Planning artifact inventory

| Path | Purpose | Status |
|---|---|---|
| `docs/specs/sprint-46/` (9 files, 4889 lines) | V2 flagship SPECs — APPROVED 2026-04-17 | ✅ ready to execute |
| `docs/specs/sprint-46-candidates/` (4 SPECs + BACKLOG) | BUG-C-triggered candidates | ✅ ready |
| `docs/sprint-reviews/sprint-45-review.md` | Sprint 45 closure | ✅ (omission corrected in §11 above) |
| `docs/sprint-reviews/sprint-45-retrospective.md` | Start/Stop/Continue | ✅ |
| `docs/RISK-ASSESSMENT-EDGE-RUNTIME.md` | Gemini timeout context | ✅ |
| `docs/specs/bdd/sprint-46-goals.feature` | Sprint 46 DoD scenarios | ✅ (Phase 6, this commit) |
| `docs/sprint-planning/sprint-46-planning.md` | This doc | ✅ 12 sections |

---

## Status

Phases 0-11 complete. Sprint 46 kickoff pending PO scenario choice per §6 framework.
