# Sprint 32 Hotfix — Deep Navigation/Status Redesign Review

**Versao**: v0.27.1
**Data**: 2026-03-20
**Branch**: feat/navigation-status-fix (merged to master)
**Tag**: v0.27.1
**Baseline**: v0.27.0 (2172 unit tests)

---

## 1. Resumo Executivo

Hotfix de v0.27.0 baseado em auditoria profunda que identificou 13 conflitos no sistema de navegacao e status de fases. As causas raiz eram fundamentais: `totalPhases = 8` (DB) vs 6 (ativo), `currentPhase` sem cap em 6, e 3 barras de progresso com logica incompativel. Os patches anteriores nao funcionavam porque atacavam sintomas, nao causas.

---

## 2. Auditoria Profunda — 13 Conflitos Identificados

| # | Severidade | Conflito | Fix |
|---|-----------|---------|-----|
| CONFLICT-001 | CRITICAL | `totalPhases = trip.phases.length` retorna 8, nao 6 | FIX-01: `TOTAL_ACTIVE_PHASES` |
| CONFLICT-008 | CRITICAL | `deriveExpeditionStatus` nunca retorna "completed" (6 >= 8 = false) | FIX-01 (cascade) |
| CONFLICT-013 | CRITICAL | `PhaseEngine.completePhase` seta `currentPhase = 7` | FIX-02: cap em `TOTAL_ACTIVE_PHASES` |
| CONFLICT-003 | CRITICAL | `DashboardPhaseProgressBar` renderiza 8 fases | FIX-03: filtro para 6 fases |
| CONFLICT-002 | MAJOR | Dois sistemas de conclusao paralelos | FIX-09/12: idempotent + sync |
| CONFLICT-007 | MAJOR | `resolveAccess` retorna "revisit" para fases puladas | FIX-04: "first_visit" para nao-concluidas |
| CONFLICT-004 | MAJOR | `ExpeditionProgressBar` com route map errado | FIX-05: deletado |
| CONFLICT-005 | MAJOR | `ExpeditionProgressBar` sem `completedPhases` prop | FIX-05: deletado |
| CONFLICT-010 | MAJOR | Phase 6 `router.refresh()` causa flip de modo | FIX-06: removido |
| CONFLICT-006 | MINOR | Dashboard bar nao usa `canNavigateToPhase()` | FIX-08: usa engine |
| CONFLICT-009 | MINOR | Dashboard e wizard com regras de navegacao diferentes | FIX-08 (cascade) |
| CONFLICT-011 | MINOR | Logica de revisit inconsistente entre wizards | FIX-04 (cascade) |
| CONFLICT-012 | INFO | Phase 2 revisit descarta edits | FIX-07: salva antes de navegar |

---

## 3. Fixes Implementados

### P0 — Root Fixes

| Fix | Descricao | Arquivo | Cascata |
|-----|-----------|---------|---------|
| FIX-01 | `totalPhases = TOTAL_ACTIVE_PHASES` (6) | trip.service.ts | FIX-16, FIX-19 |
| FIX-02 | Cap `currentPhase` em 6 (nao 7/8) | phase-engine.ts | FIX-16, FIX-17 |
| FIX-09 | Actions catch PHASE_ORDER/ALREADY_COMPLETED como sucesso | expedition.actions.ts | Elimina "Algo deu errado" |

### P1 — Navigation + Completion

| Fix | Descricao | Arquivo |
|-----|-----------|---------|
| FIX-03 | Dashboard renderiza apenas 6 fases ativas | DashboardPhaseProgressBar.tsx |
| FIX-04 | Fases puladas retornam "first_visit" (nao "revisit") | phase-navigation.engine.ts |
| FIX-05 | Deletado ExpeditionProgressBar + PhaseProgressBar | 2 arquivos deletados |
| FIX-08 | Dashboard usa `canNavigateToPhase()` do engine | DashboardPhaseProgressBar.tsx |
| FIX-10 | Preferences carregadas do DB no revisit de Phase 2 | phase-2/page.tsx |
| FIX-11 | Phase 3 chama `router.refresh()` apos toggle | Phase3Wizard.tsx |
| FIX-12 | Phase 4 advance chama `syncPhaseStatus` | expedition.actions.ts |

### P2 — UX + Completion

| Fix | Descricao | Arquivo |
|-----|-----------|---------|
| FIX-06 | Removido `router.refresh()` em Phase 6 apos sync | Phase6Wizard.tsx |
| FIX-07 | Phase 2 revisit salva dados antes de navegar | Phase2Wizard.tsx |
| FIX-13 | Autocomplete inclui estado (City, State, Country) | DestinationAutocomplete.tsx |
| FIX-15 | Pin de mapa usa atlas-gold para fases 1-3 | build-geojson.ts |

### Cascade Fixes (sem codigo adicional)

| Fix | Descricao | Resolvido por |
|-----|-----------|--------------|
| FIX-16 | "Ver Guia"/"Ver Roteiro" iam para "Fase 7" | FIX-01 + FIX-02 |
| FIX-17 | Navegacao bidirecional quebrada | FIX-02 + FIX-04 |
| FIX-19 | Expedicao auto-complete nunca disparava | FIX-01 (6 >= 6 agora = true) |

---

## 4. Arquivos Deletados

| Arquivo | Motivo |
|---------|--------|
| `ExpeditionProgressBar.tsx` | Legacy — route map errado, sem completedPhases |
| `PhaseProgressBar.tsx` | Legacy — substituido por StepProgressIndicator |
| `ExpeditionProgressBar.test.tsx` | Testes do componente deletado |

---

## 5. Resultados de Testes

### Unitarios
- **2157 passando** (2172 - 15 deletados com componentes legacy)
- **0 falhas**
- **Build limpo**

### E2E (pendente deploy no staging)
- Executado apos merge + push + tag v0.27.1

---

## 6. Analise de Cascata

```
FIX-01 (totalPhases=6)
  |-> FIX-19 resolvido (expedition auto-complete funciona: 6>=6)
  |-> FIX-16 parcialmente resolvido (dashboard mostra fases corretas)

FIX-02 (currentPhase cap=6)
  |-> FIX-16 resolvido (nunca entra em "Phase 7" state)
  |-> FIX-17 resolvido (back/forward nav funciona com currentPhase correto)

FIX-04 (skipped = first_visit)
  |-> FIX-17 resolvido (navegacao bidirecional com modos corretos)
  |-> CONFLICT-011 resolvido (wizards recebem accessMode correto do guard)

FIX-05 (delete legacy bars)
  |-> CONFLICT-004 resolvido (route map errado removido)
  |-> CONFLICT-005 resolvido (logica sem completedPhases removida)
```

---

## 7. Single-Source-of-Truth — Estado Atual

| Aspecto | Antes (v0.27.0) | Depois (v0.27.1) |
|---------|-----------------|-------------------|
| Phase count | 3 constantes (6, 8, prop) | 1 constante: `TOTAL_ACTIVE_PHASES = 6` |
| Progress bars | 4 componentes (3 ativos) | 2 componentes (UnifiedProgressBar + DashboardPhaseProgressBar) |
| Route maps | 2 maps (canonical + legacy) | 1 map: `PHASE_ROUTE_MAP` |
| Navigability check | 2 logicas (engine + ad-hoc) | 1 logica: `canNavigateToPhase()` do engine |
| Revisit detection | Inconsistente (skipped = revisit) | Correto (skipped = first_visit) |
| currentPhase cap | 8 (TOTAL_PHASES) | 6 (TOTAL_ACTIVE_PHASES) |

---

*Documento gerado em 2026-03-20. Revisado por tech-lead.*
