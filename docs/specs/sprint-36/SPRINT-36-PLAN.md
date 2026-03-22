# Sprint 36 — Orchestration Plan

**Tema**: WizardFooter Global + Gamification Wave 2
**Versao alvo**: v0.31.0
**Budget**: 50h
**Baseline**: v0.30.0 (2325 unit tests, 124 E2E, build clean)
**Data**: 2026-03-22

---

## 1. Sprint Goal

Entregar footer padronizado com dirty-state detection em todas as 6 fases da expedicao, e a Wave 2 do sistema de gamificacao (badges, pacotes PA, admin dashboard).

---

## 2. Spec Map

### Focus 1 — WizardFooter Global (UX Gap Closure)

| Spec ID | Title | Owner | Status |
|---|---|---|---|
| SPEC-PROD-039 | WizardFooter Global Implementation | product-owner | Draft |
| SPEC-UX-041 | SaveDiscardDialog Design | ux-designer | Draft |
| SPEC-ARCH-028 | useFormDirty Hook + Dirty-State Architecture | architect | Draft |

### Focus 2 — Gamification Wave 2

| Spec ID | Title | Owner | Status |
|---|---|---|---|
| SPEC-PROD-040 | Badge System (16 Badges, 4 Categories) | product-owner | Draft |
| SPEC-PROD-041 | PA Packages (Pay-as-you-go) | product-owner | Draft |
| SPEC-PROD-042 | Admin Dashboard with Profit Tracking | product-owner | Draft |
| SPEC-UX-042 | Badge Showcase + Unlock Animation | ux-designer | Draft |
| SPEC-UX-043 | PA Package Purchase Page | ux-designer | Draft |
| SPEC-UX-044 | Admin Dashboard Layout | ux-designer | Draft |
| SPEC-ARCH-029 | Badge Evaluation Engine | architect | Draft |
| SPEC-ARCH-030 | Payment Integration (Mock) | architect | Draft |
| SPEC-ARCH-031 | Admin Dashboard Data Aggregation | architect | Draft |

### Cross-Cutting

| Spec ID | Title | Owner | Status |
|---|---|---|---|
| SPEC-SEC-006 | Security Review | security-specialist | Draft |
| SPEC-QA-012 | Test Strategy + Eval Datasets | qa-engineer | Draft |
| SPEC-AI-006 | AI Impact Review | prompt-engineer | Draft |
| SPEC-INFRA-006 | Infrastructure | devops-engineer | Draft |
| SPEC-RELEASE-006 | v0.31.0 Release Plan | release-manager | Draft |
| SPEC-COST-006 | Cost Assessment | finops-engineer | Draft |
| DATA-ARCH | Data Architecture Assessment | data-engineer | Draft |

**Total: 18 specs + 1 data assessment**

---

## 3. Track Breakdown

### Track 1 — dev-fullstack-1: WizardFooter Global (~20h)

| # | Task | Est. | Spec | Depends On |
|---|---|---|---|---|
| T1.1 | Extract useFormDirty hook | 2h | ARCH-028 | — |
| T1.2 | Create SaveDiscardDialog component | 3h | UX-041 | — |
| T1.3 | Enhance WizardFooter props | 1h | ARCH-028 | T1.1 |
| T1.4 | Refactor Phase4Wizard to use hook | 2h | ARCH-028 | T1.1, T1.2 |
| T1.5 | Apply to Phase 1 (4 steps) | 3h | PROD-039 | T1.3, T1.4 |
| T1.6 | Apply to Phase 2 (preferences) | 2h | PROD-039 | T1.3 |
| T1.7 | Apply to Phase 3 (checklist) | 2h | PROD-039 | T1.3 |
| T1.8 | Verify Phase 5/6 (read-only footer) | 1h | PROD-039 | T1.3 |
| T1.9 | Unit tests (hook + dialog + phases) | 3h | QA-012 | T1.4-T1.8 |
| T1.10 | E2E tests (6 scenarios) | 1h | QA-012 | T1.9 |

### Track 2 — dev-fullstack-2: Gamification Wave 2 (~28h)

| # | Task | Est. | Spec | Depends On |
|---|---|---|---|---|
| T2.1 | Prisma migration (Purchase + role) | 1h | ARCH-030, DATA | — |
| T2.2 | Badge registry (16 definitions) | 2h | ARCH-029 | — |
| T2.3 | Badge evaluation engine | 4h | ARCH-029 | T2.2 |
| T2.4 | Badge API routes | 1h | ARCH-029 | T2.3 |
| T2.5 | Badge showcase UI | 3h | UX-042 | T2.4 |
| T2.6 | Badge unlock toast + animation | 2h | UX-042 | T2.3 |
| T2.7 | PA packages constant + validation | 1h | ARCH-030 | — |
| T2.8 | Mock payment provider | 2h | ARCH-030 | — |
| T2.9 | Purchase flow (actions + UI) | 3h | UX-043 | T2.7, T2.8 |
| T2.10 | Purchase history page | 1h | UX-043 | T2.9 |
| T2.11 | Admin layout + guard (3 layers) | 2h | ARCH-031, SEC-006 | T2.1 |
| T2.12 | Admin KPIs + aggregation service | 3h | ARCH-031 | T2.11 |
| T2.13 | Admin charts + user table | 2h | UX-044 | T2.12 |
| T2.14 | Unit tests (badge + payment + admin) | 3h | QA-012 | T2.3-T2.13 |
| T2.15 | E2E tests (11 scenarios) | 2h | QA-012 | T2.14 |

### Parallel Activities

| Task | Agent | Est. |
|---|---|---|
| Spec review + approval | tech-lead | 2h |
| Security audit of PRs | security-specialist | 1h |
| Eval gate validation | qa-engineer | 1h |
| Sprint review document | all reviewers | 2h |

---

## 4. Dependencies Between Tracks

```
Track 1 (Footer) ────────────── Independent ──────────────── Track 2 (Gamification)
   │                                                              │
   └── Both depend on: spec approval (tech-lead, ~2h)            │
   └── Both depend on: Prisma migration if role needed ───────────┘
```

Tracks are **largely independent**. The only shared dependency is the Prisma migration (Purchase model + User.role), which Track 2 creates first. Track 1 does not need the migration.

---

## 5. Definition of Ready (DoR)

- [x] All 18 specs written
- [ ] All specs approved by tech-lead
- [ ] Security CRITICAL items acknowledged (SEC-036-006/007/008/013/027/028)
- [ ] Eval datasets created (4 datasets, 49 scenarios)
- [ ] No open questions
- [ ] ATLAS-GAMIFICACAO-APROVADO.md referenced in all relevant specs

---

## 6. Definition of Done (DoD)

- [ ] All tasks completed per track
- [ ] Unit tests: +80 minimum (target ~2443)
- [ ] E2E tests: +15 minimum (target ~141)
- [ ] Build clean
- [ ] Lint clean
- [ ] Eval gate passes (trust >= 0.85)
- [ ] Security checklist completed (SPEC-SEC-006 Section 9)
- [ ] i18n: all new keys in en.json + pt-BR.json
- [ ] Sprint review document committed
- [ ] Tag v0.31.0 created

---

## 7. Risk Register

| ID | Risk | Prob | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Phase4 regression after hook extraction | Med | High | Snapshot test + E2E | dev-fullstack-1 |
| R2 | WizardFooter breaks Phase 1-3 nav | Med | Med | Per-phase E2E test | dev-fullstack-1 |
| R3 | Badge false positives | Low | Low | Idempotent + criteria validation | dev-fullstack-2 |
| R4 | Mock payment credits without validation | Low | Med | Server-side price lookup | dev-fullstack-2 |
| R5 | Admin route accessible to non-admin | Low | Critical | 3-layer defense + E2E | dev-fullstack-2 |
| R6 | Budget overrun (50h) | Med | Med | Cut admin charts to P2 | tech-lead |

---

## 8. Timeline

| Day | Track 1 | Track 2 | Cross-cutting |
|---|---|---|---|
| 1 | T1.1-T1.2 (hook + dialog) | T2.1-T2.2 (migration + registry) | Spec review |
| 2 | T1.3-T1.4 (footer + Phase 4) | T2.3-T2.4 (badge engine + API) | — |
| 3 | T1.5-T1.6 (Phase 1-2) | T2.5-T2.6 (badge UI + animation) | — |
| 4 | T1.7-T1.8 (Phase 3 + 5/6) | T2.7-T2.9 (payment + purchase) | Security audit |
| 5 | T1.9-T1.10 (tests) | T2.10-T2.11 (history + admin guard) | — |
| 6 | — | T2.12-T2.13 (admin KPIs + charts) | — |
| 7 | — | T2.14-T2.15 (tests) | Eval gate, review |

---

## 9. Eval Gates

| Gate | Dataset | Scenarios | Target |
|---|---|---|---|
| PR | footer-dirty-state-global | 15 | >= 0.80 |
| PR | badge-unlock-criteria | 16 | >= 0.80 |
| PR | pa-purchase-flow | 10 | >= 0.80 |
| PR | admin-dashboard-metrics | 8 | >= 0.80 |
| Staging | All 4 datasets | 49 | >= 0.85 |
