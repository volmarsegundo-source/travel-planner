---
spec-id: SPEC-QA-009
title: Sprint 32 Regression Test Plan — Stabilization v0.26.0
version: 1.1.0
status: Draft
author: qa-engineer
sprint: 32
reviewers: [tech-lead, architect]
---

# SPEC-QA-009: Sprint 32 Regression Test Plan — Stabilization v0.26.0

**Strategy ID**: QA-SPEC-009
**Related Specs**: SPEC-PROD-025, SPEC-PROD-023, SPEC-PROD-016, SPEC-ARCH-016, SPEC-ARCH-010
**Author**: qa-engineer
**Date**: 2026-03-19
**Sprint**: 32
**Baseline**: v0.26.0 — ~78% pass rate (85/109 passing), 122/123 E2E passing

---

## 1. Contexto

Sprint 32 e um sprint de estabilizacao. O objetivo e elevar a taxa de aprovacao de ~78% para >= 95%, corrigindo os 8 bugs P0 e 5 bugs P1 identificados nos testes de v0.26.0. Nenhuma feature nova sera adicionada — apenas correcoes e testes de regressao.

Este documento define o plano de testes completo, mapeando cada bug a cenarios de teste especificos com rastreabilidade ate os ACs dos specs relacionados.

---

## 2. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Phase transition error (P0-001) | Alta | Critico | P0 |
| Phase completion revert (P0-002) | Alta | Critico | P0 |
| Phase 4 false completion (P0-003) | Media | Critico | P0 |
| Phase 6 auto-generation (P0-004) | Media | Alto | P0 |
| Progress bar skip (P0-005) | Media | Alto | P0 |
| Back navigation advance (P0-006) | Alta | Critico | P0 |
| Report i18n (P1-004) | Baixa | Medio | P1 |
| Report completeness (P1-005) | Baixa | Medio | P1 |
| Regressao em transicoes que funcionavam (1->2, 3->4, 4->5) | Baixa | Critico | P0 |

---

## 3. Test Pyramid

```
        [E2E]          <- 8 critical journeys (one per P0 bug + full expedition flow)
       [Integration]   <- PhaseCompletionService.buildSnapshot + DB state
      [Unit Tests]     <- phase-completion.engine, phase-navigation.engine, pure logic
```

**Unit**: Funcoes puras em `phase-completion.engine.ts` e `phase-navigation.engine.ts` — todas as combinacoes de input que correspondem aos P0 bugs.

**Integration**: `PhaseCompletionService.buildSnapshot()` construindo snapshot correto a partir do DB; `PhaseCompletionService.checkAndCompleteTrip()` atualizando status; `advanceFromPhaseAction` com inputs validos.

**E2E**: Fluxo completo de expedicao 1-6, transicoes P0-001, revert de completion P0-002, Phase 4 sem dados P0-003, Phase 6 auto-generation P0-004, progress bar guard P0-005, back navigation P0-006.

---

## 4. Test Scenarios — P0 Bugs

### 4.1 P0-001: Phase Transition Error (Phase 2->3 e Phase 5->6)

**Spec Ref**: SPEC-PROD-025 AC-001, AC-002, AC-003

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-001-01 | advanceFromPhase(2) retorna nextPhase=3 | Trip em phase 2 com dados validos, checklist nao requerido | `advanceFromPhaseAction(tripId, 2)` | `success: true, data.nextPhase: 3` | Unit | P0 |
| U-001-02 | advanceFromPhase(5) retorna nextPhase=6 | Trip em phase 5 com guia gerado | `advanceFromPhaseAction(tripId, 5)` | `success: true, data.nextPhase: 6` | Unit | P0 |
| U-001-03 | getNextPhase(2) retorna 3 | N/A | `getNextPhase(2)` | `3` | Unit | P0 |
| U-001-04 | getNextPhase(5) retorna 6 | N/A | `getNextPhase(5)` | `6` | Unit | P0 |
| U-001-05 | resolveAccess(3, 3, [1,2]) permite first_visit | Phase 3 e o current phase | `resolveAccess(3, 3, [1,2])` | `allowed: true, mode: "first_visit"` | Unit | P0 |
| U-001-06 | resolveAccess(6, 6, [1,2,3,4,5]) permite first_visit | Phase 6 e o current phase | `resolveAccess(6, 6, [1,2,3,4,5])` | `allowed: true, mode: "first_visit"` | Unit | P0 |

#### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-001-01 | Phase 2->3 sem erro | Login -> navegar para Phase 2 da expedicao -> preencher dados -> clicar "Proximo" | URL contem `/phase-3`, nenhuma tela de erro, nenhum console.error | P0 |
| E2E-001-02 | Phase 5->6 sem erro | Login -> navegar para Phase 5 -> gerar guia (ou verificar existente) -> clicar "Proximo" | URL contem `/phase-6`, nenhuma tela de erro | P0 |
| E2E-001-03 | Fluxo completo 1->2->3->4->5->6 | Login -> criar expedicao -> avancar sequencialmente por todas as fases | Cada transicao bem-sucedida, URL final contem `/phase-6` | P0 |

---

### 4.2 P0-002: Phase Completion Not Reverting

**Spec Ref**: SPEC-PROD-023, SPEC-ARCH-016

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-002-01 | evaluatePhase3 all required done -> "completed" | `{ totalRequired: 5, completedRequired: 5, hasAnyItems: true }` | `evaluatePhaseCompletion(3, snapshot)` | `status: "completed"` | Unit | P0 |
| U-002-02 | evaluatePhase3 some unchecked -> "in_progress" | `{ totalRequired: 5, completedRequired: 3, hasAnyItems: true }` | `evaluatePhaseCompletion(3, snapshot)` | `status: "in_progress"` | Unit | P0 |
| U-002-03 | evaluatePhase3 no items -> "pending" | `{ totalRequired: 0, completedRequired: 0, hasAnyItems: false }` | `evaluatePhaseCompletion(3, snapshot)` | `status: "pending"` | Unit | P0 |
| U-002-04 | evaluatePhase3 all done then one unchecked -> "in_progress" | Snapshot muda de `completedRequired: 5` para `completedRequired: 4` | `evaluatePhaseCompletion(3, snapshot)` chamado duas vezes | Primeiro: `"completed"`, segundo: `"in_progress"` | Unit | P0 |
| U-002-05 | isExpeditionComplete false quando phase 3 incompleta | Phase 3 `in_progress`, demais `completed` | `isExpeditionComplete(snapshot)` | `false` | Unit | P0 |

#### Integration Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| I-002-01 | Toggle checklist item atualiza snapshot | DB com checklist items para phase 3, todos completos | Desmarcar um item via `togglePhase3ItemAction` -> rebuild snapshot | `evaluatePhaseCompletion(3, snapshot).status === "in_progress"` | Integration | P0 |
| I-002-02 | checkAndCompleteTrip nao completa se phase 3 incompleta | Trip com todas phases completas exceto phase 3 | `checkAndCompleteTrip(tripId, userId)` | Retorna `false`, trip.status != "COMPLETED" | Integration | P1 |

#### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-002-01 | Check all Phase 3 items -> Concluida | Login -> Phase 3 -> marcar todos os items obrigatorios | Status label mostra "Concluida" ou "Completed" | P0 |
| E2E-002-02 | Uncheck one item -> Em andamento | Continuacao de E2E-002-01 -> desmarcar um item obrigatorio | Status label muda para "Em andamento" ou "In Progress" | P0 |

---

### 4.3 P0-003: Phase 4 Marked Complete Without Data

**Spec Ref**: SPEC-PROD-023, SPEC-ARCH-016

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-003-01 | evaluatePhase4 zero transport + zero accommodation -> "pending" | `{ transportSegmentCount: 0, accommodationCount: 0 }` | `evaluatePhaseCompletion(4, snapshot)` | `status: "pending"` | Unit | P0 |
| U-003-02 | evaluatePhase4 com 1 transport -> "completed" | `{ transportSegmentCount: 1, accommodationCount: 0 }` | `evaluatePhaseCompletion(4, snapshot)` | `status: "completed"` | Unit | P0 |
| U-003-03 | evaluatePhase4 com 1 accommodation -> "completed" | `{ transportSegmentCount: 0, accommodationCount: 1 }` | `evaluatePhaseCompletion(4, snapshot)` | `status: "completed"` | Unit | P0 |
| U-003-04 | evaluatePhase4 ambos presentes -> "completed" | `{ transportSegmentCount: 2, accommodationCount: 1 }` | `evaluatePhaseCompletion(4, snapshot)` | `status: "completed"` | Unit | P0 |
| U-003-05 | isExpeditionComplete false quando phase 4 pending | Phase 4 `pending`, demais `completed` | `isExpeditionComplete(snapshot)` | `false` | Unit | P0 |

#### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-003-01 | Phase 4 skip sem dados nao marca completa | Login -> Phase 4 -> avancar sem preencher transport ou accommodation | Progress bar Phase 4 NAO mostra estado "completed" (gold/checkmark) | P0 |

---

### 4.4 P0-004: Phase 6 Not Auto-Generating

**Spec Ref**: SPEC-PROD-023

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-004-01 | evaluatePhase6 zero itinerary days -> "pending" | `{ itineraryDayCount: 0 }` | `evaluatePhaseCompletion(6, snapshot)` | `status: "pending"` | Unit | P0 |
| U-004-02 | evaluatePhase6 com itinerary days -> "completed" | `{ itineraryDayCount: 3 }` | `evaluatePhaseCompletion(6, snapshot)` | `status: "completed"` | Unit | P0 |

#### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-004-01 | Phase 6 auto-generation na primeira visita | Login -> navegar para Phase 6 (com trip completa ate phase 5) -> aguardar | Indicador de geracao visivel (skeleton/spinner), itinerario comeca a ser populado | P0 |

---

### 4.5 P0-005: Progress Bar Phase Skip (Phase 3 -> Phase 6)

**Spec Ref**: SPEC-PROD-016, SPEC-ARCH-010

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-005-01 | resolveAccess(6, 3, [1,2]) -> blocked | currentPhase=3, completed=[1,2] | `resolveAccess(6, 3, [1,2])` | `allowed: false, mode: "blocked"` | Unit | P0 |
| U-005-02 | canNavigateToPhase(3, 6, [1,2]) -> false | currentPhase=3, completed=[1,2] | `canNavigateToPhase(3, 6, [1,2])` | `false` | Unit | P0 |
| U-005-03 | getPhaseState(6, 3, [1,2]) -> "locked" | currentPhase=3, completed=[1,2] | `getPhaseState(6, 3, [1,2])` | `"locked"` | Unit | P0 |
| U-005-04 | canNavigateToPhase(3, 4, [1,2]) -> true (non-blocking) | currentPhase=3, completed=[1,2] | `canNavigateToPhase(3, 4, [1,2])` | `true` (Phase 4 is non-blocking) | Unit | P1 |
| U-005-05 | resolveAccess(4, 3, [1,2]) -> allowed (non-blocking) | currentPhase=3, completed=[1,2] | `resolveAccess(4, 3, [1,2])` | `allowed: true` | Unit | P1 |

#### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-005-01 | Click Phase 6 na progress bar com Phase 3 incompleta | Login -> Phase 3 -> clicar segmento Phase 6 na barra de progresso | URL NAO muda para `/phase-6`, permanece em `/phase-3` (ou Phase 6 nao e clicavel) | P0 |

---

### 4.6 P0-006: Cannot Advance Phase 2->3 Via Back Navigation

**Spec Ref**: SPEC-PROD-025 AC-004, AC-005

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-006-01 | resolveAccess(2, 6, [1,2,3,4,5]) -> revisit | currentPhase=6, todos completos, voltando para phase 2 | `resolveAccess(2, 6, [1,2,3,4,5])` | `allowed: true, mode: "revisit"` | Unit | P0 |
| U-006-02 | resolveAccess(3, 6, [1,2,3,4,5]) -> revisit | Apos revisit de phase 2, avancando para phase 3 | `resolveAccess(3, 6, [1,2,3,4,5])` | `allowed: true, mode: "revisit"` | Unit | P0 |
| U-006-03 | shouldRedirect(3, 6, [1,2,3,4,5]) -> no redirect | Estado de navegacao apos back navigation completa | `shouldRedirect(3, 6, [1,2,3,4,5])` | `{ redirect: false, target: 3 }` | Unit | P0 |

#### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-006-01 | Back 6->5->4->3->2 then forward 2->3 | Login -> expedicao avancada -> navegar 6->2 via "Voltar" -> clicar "Proximo" em Phase 2 | URL contem `/phase-3`, nenhum erro | P0 |

---

## 5. Test Scenarios — P1 Bugs

### 5.1 P1-004: Report i18n

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-P1-004-01 | Report exibe valores traduzidos, nao chaves DB | Report component renderizado com dados mockados e locale "pt" | Verificar texto renderizado | Texto contem valor traduzido (ex: "Internacional") e NAO a chave crua (ex: "international") | Unit | P1 |
| U-P1-004-02 | Report exibe valores traduzidos em EN | Report component renderizado com dados mockados e locale "en" | Verificar texto renderizado | Texto contem "International" e NAO "international" (lowercase DB key) | Unit | P1 |

### 5.2 P1-005: Report Completeness

#### Unit Tests

| ID | Scenario | Given | When | Then | Type | Priority |
|---|---|---|---|---|---|---|
| U-P1-005-01 | Report Phase 1 inclui todos os campos | Report renderizado com dados completos de Phase 1 | Verificar presenca dos campos | Nome, data de nascimento, destino, origem, data inicio, data fim, tipo de viagem — todos presentes | Unit | P1 |
| U-P1-005-02 | Report Phase 2 inclui todos os campos | Report renderizado com dados completos de Phase 2 | Verificar presenca dos campos | Preferencias, pace, orcamento, tipo de viajante — todos presentes | Unit | P1 |
| U-P1-005-03 | Report campos ausentes exibem placeholder | Report renderizado com dados parciais (destino ausente) | Verificar presenca de placeholder | Campo exibe "Nao informado" / "Not provided" ao inves de espaco vazio | Unit | P1 |

---

## 6. Regression Test Suite

Estes cenarios verificam que as correcoes dos P0s nao introduziram regressoes em funcionalidades que ja funcionavam.

| ID | Scenario | Existing Test File | Type | Priority |
|---|---|---|---|---|
| REG-001 | Phase 1->2 transition | `phase-navigation.e2e.spec.ts` | E2E | P0 |
| REG-002 | Phase 3->4 transition | Novo (Sprint 32) | E2E | P0 |
| REG-003 | Phase 4->5 transition | Novo (Sprint 32) | E2E | P0 |
| REG-004 | Progress bar renders 6 segments | `phase-navigation.e2e.spec.ts` | E2E | P0 |
| REG-005 | Locked phase redirect | `phase-navigation.e2e.spec.ts` | E2E | P0 |
| REG-006 | Hub page redirects to current phase | `phase-navigation.e2e.spec.ts` | E2E | P1 |
| REG-007 | BOLA: user B cannot access user A trips | Existente | E2E | P0 |
| REG-008 | Login + registration flow | `login.spec.ts`, `registration.spec.ts` | E2E | P1 |
| REG-009 | Dashboard expedition cards load | `dashboard.spec.ts` | E2E | P1 |

---

## 7. AC Coverage Summary (Traceability Matrix)

### SPEC-PROD-025 ACs

| AC | Description | Test IDs | Type |
|---|---|---|---|
| AC-001 | Phase 2->3 sem erro | U-001-01, U-001-03, U-001-05, E2E-001-01 | Unit + E2E |
| AC-002 | Phase 5->6 sem erro | U-001-02, U-001-04, U-001-06, E2E-001-02 | Unit + E2E |
| AC-003 | Fluxo completo 1->6 sem erro | E2E-001-03 | E2E |
| AC-004 | Avancar 2->3 apos back navigation 6->2 | U-006-01, U-006-02, U-006-03, E2E-006-01 | Unit + E2E |
| AC-005 | Avancar 2->3 apos salto direto via progress bar | U-006-01, E2E-006-01 | Unit + E2E |
| AC-006 | Nenhuma sequencia valida causa erro | E2E-001-03, E2E-006-01 | E2E |
| AC-007 | Transicoes 1->2, 3->4, 4->5 sem regressao | REG-001, REG-002, REG-003 | E2E |
| AC-008 | Navegacao reversa funcional | E2E-006-01 | E2E |
| AC-009 | Mensagem de erro contextualizada | Manual (exploratory) | Manual |
| AC-010 | Botao "Tentar novamente" funcional | Manual (exploratory) | Manual |
| AC-011 | Animacao de transicao sem flickering | Manual (visual) | Manual |
| AC-012 | Transicao < 2s em 4G | Performance (Lighthouse/Playwright) | Performance |

### SPEC-PROD-023 ACs (Phase Completion)

| AC | Description | Test IDs | Type |
|---|---|---|---|
| Phase 3 revert | Completion reverte ao desmarcar items | U-002-01..05, I-002-01..02, E2E-002-01..02 | Unit + Int + E2E |
| Phase 4 false complete | Nao marca complete sem dados | U-003-01..05, E2E-003-01 | Unit + E2E |
| Phase 6 auto-gen | Auto-generation na primeira visita | U-004-01..02, E2E-004-01 | Unit + E2E |
| Expedition complete | Todas 6 phases = expedition complete | U-002-05, U-003-05 | Unit |

---

## 8. Performance Targets

| Metric | Target | Test Method |
|---|---|---|
| Phase transition render | < 2,000ms at P95 | Playwright `page.waitForURL` timing |
| Phase completion engine evaluation | < 5ms (pure function) | Vitest bench |
| PhaseCompletionService.buildSnapshot | < 100ms P95 | Integration test timing |
| Progress bar interaction response | < 300ms (click to navigation start) | Playwright timing |

---

## 9. Test Data Requirements

- **Synthetic user**: `e2e-sprint32-{timestamp}@playwright.invalid`
- **Expedition states needed**:
  - Fresh expedition (Phase 1)
  - Expedition at Phase 3 with checklist items (mix of checked/unchecked)
  - Expedition at Phase 4 with zero transport/accommodation
  - Expedition at Phase 5 with guide generated
  - Expedition with all 6 phases completed
- **Payment data**: N/A (nenhum fluxo de pagamento neste sprint)
- **Sandbox**: E2E tests run against Vercel staging deployment

---

## 10. Manual Exploratory Testing Areas

Areas complexas demais para automacao ou que requerem julgamento visual:

1. **Animacao de transicao entre fases** — verificar ausencia de flickering, tela branca intermediaria, e respeito a `prefers-reduced-motion`
2. **Mensagens de erro contextualizadas** — simular falha de rede durante transicao, verificar que a mensagem e util e nao generica
3. **Botao "Tentar novamente"** — verificar foco automatico, acessibilidade por teclado, e que re-tentativa funciona
4. **Mobile breakpoints** — verificar progress bar em telas < 375px (possivel truncamento)
5. **Screen reader** — verificar que erros de transicao sao anunciados via `aria-live`

---

## 11. Out of Scope

| Item | Razao |
|---|---|
| Phase 7/8 (coming soon) | Nao implementadas |
| Payment flow | Nao existe neste produto atualmente |
| AI quality (guide content, itinerary quality) | Coberto por eval framework, nao por testes de regressao |
| Autocomplete Mapbox | Estavel desde Sprint 30, sem mudancas neste sprint |
| Atlas Map rendering | Estavel desde Sprint 31, sem mudancas neste sprint |

---

## 12. QA Test Execution Plan

### Pre-conditions

1. Todas as correcoes dos P0s merged na branch de sprint
2. Build limpo (`npm run build` sem erros)
3. Unit tests passando (`npm run test`)
4. Staging deployment atualizado

### Ordem de execucao

1. **Unit tests** — rodar primeiro, falha aqui bloqueia integracao
2. **Integration tests** — rodar apos units passarem
3. **E2E P0 tests** — cenarios criticos com automacao
4. **E2E regression** — suite completa existente + novos
5. **Manual exploratory** — areas listadas na secao 10
6. **Performance** — medir transicoes contra targets

### Criterios de aprovacao

- **P0 tests**: 100% passing (zero falhas toleradas)
- **P1 tests**: >= 95% passing
- **Regression suite**: zero regressoes em funcionalidades existentes
- **Performance**: todas as metricas dentro dos targets
- **Open P0 bugs**: zero (condicao obrigatoria para sign-off)

---

## 13. Eval Criteria (EDD)

| Metrica | Threshold | Grader | Dataset |
|---------|-----------|--------|---------|
| Phase transition success rate | 100% | Programatico | phase-transition-fixes.json |
| Completion engine accuracy | 100% | Programatico | completion-engine-fixes.json |
| Report field completeness | >= 95% | Programatico | report-completeness.json |
| Response latency (phase advance p95) | < 500ms | Heuristico | -- |
| Test coverage (new code) | >= 80% | Vitest | -- |

### Trust Score Target
- Sprint 32 target: >= 85
- Composition: Test Coverage (25%) + Eval Pass Rate (30%) + Spec Conformance (20%) + Security Audit (15%) + Debt Ratio (10%)

### CI/CD Eval Gates
- Pre-merge: `npm run eval:gate` must pass (threshold 0.85)
- Post-deploy: E2E against staging (122+ tests passing)
- Drift check: `npm run eval:drift` (max 10% from baseline)

### Eval Datasets

| Dataset | Cases | Pass Threshold | Bug Coverage |
|---------|-------|----------------|--------------|
| `phase-transition-fixes.json` | 10 | 100% | P0-001, P0-005, P0-006 |
| `completion-engine-fixes.json` | 12 | 100% | P0-002, P0-003, P0-004 |
| `report-completeness.json` | 8 | 95% | P1-004, P1-005 |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | qa-engineer | Documento inicial — Sprint 32 stabilization test plan |
| 1.1.0 | 2026-03-19 | qa-engineer | Adicionada secao 13 — Eval Criteria (EDD) com 3 datasets, trust score target, CI/CD gates |
