# SPEC-QA-012: Sprint 36 Test Strategy

**Version**: 1.0.0
**Status**: Draft
**Author**: qa-engineer
**Reviewers**: tech-lead, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Baseline**: 2325 unit tests, 124 E2E tests

---

## 1. Test Matrix

| Feature | Unit | Integration | E2E | Eval |
|---|---|---|---|---|
| useFormDirty hook | 10 | — | — | — |
| SaveDiscardDialog | 8 | — | 2 | — |
| WizardFooter (Phase 1-4) | 8 | 8 | 4 | 15 |
| WizardFooter (Phase 5-6) | 4 | — | 2 | — |
| Badge registry | 16 | — | — | — |
| Badge engine | 16 | 3 | — | 16 |
| Badge showcase UI | 6 | — | 2 | — |
| Mock payment provider | 6 | — | — | — |
| Purchase flow | 8 | 4 | 3 | 10 |
| PA credit (available only) | 3 | — | — | — |
| Refund | 4 | — | 1 | — |
| Admin guard | 3 | — | 2 | — |
| Admin KPIs | 4 | — | — | 8 |
| Admin revenue chart | 3 | — | — | — |
| Admin user table | 4 | — | 1 | — |
| **TOTAL** | **~103** | **~15** | **~17** | **49** |

### Expected Post-Sprint Counts
- Unit tests: 2325 + ~118 = **~2443**
- E2E tests: 124 + ~17 = **~141**

---

## 2. E2E Scenarios

### WizardFooter (6 scenarios)

| ID | Scenario | Phase |
|---|---|---|
| E2E-S36-001 | Edit Phase 1 field → click Voltar → dialog appears → Save → data persisted | 1 |
| E2E-S36-002 | Edit Phase 2 preferences → click Avançar → dialog → Discard → next phase loads | 2 |
| E2E-S36-003 | Edit Phase 3 checklist → ESC dismisses dialog | 3 |
| E2E-S36-004 | Phase 4 dirty-state works same as before refactor (regression) | 4 |
| E2E-S36-005 | Phase 5 has no save button, only Voltar + Avançar | 5 |
| E2E-S36-006 | Phase 6 has Voltar + Ver Expedições, no save | 6 |

### Badge System (2 scenarios)

| ID | Scenario |
|---|---|
| E2E-S36-007 | Complete first expedition → "primeira_viagem" badge unlocked + toast |
| E2E-S36-008 | Open Meu Atlas → badge grid renders with locked/unlocked states |

### Purchase Flow (4 scenarios)

| ID | Scenario |
|---|---|
| E2E-S36-009 | Open purchase page → select Explorador → confirm → PA balance +500 |
| E2E-S36-010 | Purchase history shows completed transaction |
| E2E-S36-011 | Insufficient balance → redirect to purchase page |
| E2E-S36-012 | totalPoints remains unchanged after purchase |

### Admin Dashboard (5 scenarios)

| ID | Scenario |
|---|---|
| E2E-S36-013 | Non-admin navigates to /admin/dashboard → redirected to /expeditions |
| E2E-S36-014 | Admin sees KPI cards with data |
| E2E-S36-015 | Admin searches user table by email |
| E2E-S36-016 | Admin switches revenue period (daily/weekly/monthly) |
| E2E-S36-017 | Admin user list does NOT show passwordHash/passport/phone |

---

## 3. Trust Score Target

| Gate | Target | Dimensions |
|---|---|---|
| PR | >= 0.80 | Structure, Security, i18n |
| Staging | >= 0.85 | Structure, Security, i18n, UX-flow, Accessibility |

---

## 4. Eval Datasets

| Dataset | File | Scenarios | Grader |
|---|---|---|---|
| Footer dirty-state | `footer-dirty-state-global.json` | 15 | Code |
| Badge unlock criteria | `badge-unlock-criteria.json` | 16 | Code |
| PA purchase flow | `pa-purchase-flow.json` | 10 | Code |
| Admin dashboard metrics | `admin-dashboard-metrics.json` | 8 | Code |

---

## 5. Risk Areas

| Area | Risk | Extra Coverage |
|---|---|---|
| Phase4Wizard refactor | Regression | Snapshot test + E2E |
| Phase 1-3 first-time footer | New behavior | Each phase tested individually |
| PA credit logic | availablePoints vs totalPoints | Dedicated assertion in 3 tests |
| Admin access control | Security critical | 3-layer verification test |
| Badge idempotency | Race condition | Concurrent award test |

---

## 6. Test Data Requirements

- Test user with admin role
- Test user with multiple completed trips (for badge testing)
- Test user with PA balance (for purchase testing)
- Seed data: `npm run dev:users` extended with admin user
- Mock payment provider configured in test environment

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — Sprint 36 test strategy |
