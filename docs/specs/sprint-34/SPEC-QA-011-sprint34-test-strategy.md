# SPEC-QA-011: Sprint 34 Test Strategy

**Version**: 1.0.0
**Status**: Draft
**Author**: qa-engineer
**Reviewers**: tech-lead, architect
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Scope

Test strategy covering all Sprint 34 features:
- Footer save/discard (SPEC-UX-037, SPEC-ARCH-024)
- Phase 3 completion rules (SPEC-ARCH-025)
- Phase 4 conditional fields (SPEC-UX-038, SPEC-ARCH-026)
- OAuth flow (SPEC-UX-040, SPEC-ARCH-027)
- Phone validation (SPEC-UX-039)

**Trust score target**: >= 85%

## 2. Test Scenarios

### 2.1 Footer Save/Discard (15 scenarios)

| # | Scenario | Type | Priority |
|---|---|---|---|
| F-01 | 3-button layout renders correctly in desktop (>= 640px) | Unit | P0 |
| F-02 | Buttons stack vertically in mobile (< 640px) | Unit | P0 |
| F-03 | Clicking "Voltar" with clean state navigates immediately | Unit | P0 |
| F-04 | Clicking "Voltar" with dirty state opens dialog | Unit | P0 |
| F-05 | Clicking "Avancar" with dirty state opens dialog | Unit | P0 |
| F-06 | Dialog "Descartar" discards changes and navigates | Unit | P0 |
| F-07 | Dialog "Salvar e Continuar" saves then navigates | Unit | P0 |
| F-08 | Dialog "Cancelar" closes dialog, no navigation | Unit | P1 |
| F-09 | Escape key closes dialog | Unit | P1 |
| F-10 | Click outside dialog (overlay) closes dialog | Unit | P1 |
| F-11 | Toast "Dados salvos" appears after successful save | Unit | P1 |
| F-12 | Toast auto-dismisses after 3 seconds | Unit | P2 |
| F-13 | Focus trap works inside dialog | Unit | P1 |
| F-14 | "Salvar" button disabled when form is clean | Unit | P1 |
| F-15 | All buttons disabled during saving state | Unit | P1 |

### 2.2 Phase 3 Completion Rules (8 scenarios)

| # | Scenario | Type | Priority |
|---|---|---|---|
| P3-01 | All mandatory items checked -> status "completed" | Unit | P0 |
| P3-02 | Some mandatory items checked -> status "in_progress" | Unit | P0 |
| P3-03 | No items at all -> status "pending" | Unit | P0 |
| P3-04 | All mandatory done, some optional unchecked -> "completed" | Unit | P0 |
| P3-05 | Zero mandatory items with optionals -> "completed" (edge case) | Unit | P1 |
| P3-06 | Toggle item triggers syncPhaseStatus call | Integration | P0 |
| P3-07 | Progress bar updates after toggle without page reload | Integration | P1 |
| P3-08 | Optimistic UI shows correct status before server confirms | Integration | P2 |

### 2.3 Phase 4 Conditional Fields (12 scenarios)

| # | Scenario | Type | Priority |
|---|---|---|---|
| P4-01 | "Somente Ida" / "Ida e Volta" radio toggle renders | Unit | P0 |
| P4-02 | Selecting "Ida e Volta" creates return segment | Unit | P0 |
| P4-03 | Return segment has inverted departure/arrival places | Unit | P0 |
| P4-04 | Switching to "Somente Ida" removes return segments | Unit | P0 |
| P4-05 | "Ainda nao decidi" checkbox renders in Transport step | Unit | P0 |
| P4-06 | "Ainda nao decidi" checkbox renders in Accommodation step | Unit | P0 |
| P4-07 | "Ainda nao decidi" checkbox renders in Mobility step | Unit | P0 |
| P4-08 | Checking "Ainda nao decidi" reduces form opacity to 50% | Unit | P1 |
| P4-09 | With undecided checked, advance is allowed without data | Unit | P0 |
| P4-10 | Unchecking "Ainda nao decidi" restores validation | Unit | P0 |
| P4-11 | Mandatory asterisks appear on required fields | Unit | P1 |
| P4-12 | Server-side save stores undecided flags in metadata | Integration | P0 |

### 2.4 OAuth Flow (6 scenarios)

| # | Scenario | Type | Priority |
|---|---|---|---|
| O-01 | Google login button triggers OAuth redirect | Integration | P0 |
| O-02 | Apple login button triggers OAuth redirect | Integration | P0 |
| O-03 | Error banner appears on OAuth failure | Unit | P0 |
| O-04 | "Tente novamente" button retries OAuth flow | Unit | P1 |
| O-05 | Loading spinner appears during redirect | Unit | P1 |
| O-06 | Account linking prompt appears for existing email | Unit | P0 |

### 2.5 Phone Validation (5 scenarios)

| # | Scenario | Type | Priority |
|---|---|---|---|
| PH-01 | Input auto-formats Brazilian phone as user types | Unit | P0 |
| PH-02 | International formats accepted | Unit | P0 |
| PH-03 | Error shown for invalid phone (too short) | Unit | P0 |
| PH-04 | Only digits stored in database | Integration | P0 |
| PH-05 | `type="tel"` and `inputMode="tel"` present | Unit | P1 |

## 3. Total Test Count

| Category | Scenarios | P0 | P1 | P2 |
|---|---|---|---|---|
| Footer Save/Discard | 15 | 7 | 6 | 2 |
| Phase 3 Rules | 8 | 4 | 2 | 2 |
| Phase 4 Conditional | 12 | 8 | 3 | 1 |
| OAuth Flow | 6 | 4 | 2 | 0 |
| Phone Validation | 5 | 4 | 1 | 0 |
| **Total** | **46** | **27** | **14** | **5** |

## 4. Eval Datasets

Four eval datasets created in `docs/evals/datasets/`:

| Dataset | File | Cases | Purpose |
|---|---|---|---|
| Footer Save/Discard | `footer-save-discard.json` | 12 | Validate save/discard dialog behavior |
| Phase 3 Completion | `phase3-completion-rules.json` | 10 | Validate completion engine for Phase 3 |
| Phase 4 Conditional | `phase4-conditional-fields.json` | 10 | Validate ida/volta, undecided, mandatory |
| OAuth Flow | `oauth-flow.json` | 8 | Validate OAuth success/failure/linking |

## 5. Trust Score Components

| Dimension | Weight | Target |
|---|---|---|
| Functional correctness | 40% | >= 90% |
| Accessibility (ARIA, focus) | 20% | >= 80% |
| Error handling | 20% | >= 85% |
| Responsive behavior | 10% | >= 80% |
| Security validation | 10% | >= 85% |
| **Weighted Total** | **100%** | **>= 85%** |

## 6. Regression Scope

Sprint 34 changes touch:
- `WizardFooter.tsx` — must re-run all existing WizardFooter tests
- `phase-completion.engine.ts` — must re-run all 46 phase-engine tests
- `Phase4Wizard.tsx` — must re-run Phase4Wizard integration tests
- `auth.config.ts` / `auth.ts` — must re-run auth callback tests

Estimated regression: ~200 tests (subset of 1776 total).

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
