# Sprint 32 Patch Review — v0.27.1

**Release**: v0.27.1 (patch)
**Tag**: `dbd1d23`
**Data**: 2026-03-20
**Branch**: feat/navigation-status-fix (merged to master)
**Tipo**: Patch release — bug fixes only, zero features novas
**Baseline**: v0.27.0 (2172 unit tests, 121/130 E2E)

---

## 1. Contexto

O v0.27.0 (Sprint 32) corrigiu 7 bugs P0 e 4 melhorias UX, mas os mesmos bugs de navegacao continuaram aparecendo em testes manuais. Apos 5+ tentativas de patches pontuais, foi conduzida uma auditoria profunda (deep audit) que identificou **13 conflitos sistematicos** — as correcoes anteriores atacavam sintomas, nao causas raiz.

**Processo seguido (SDD-compliant)**:
1. Investigacao exaustiva do codebase (grep em todos os arquivos)
2. Documentacao em `docs/investigation/NAVIGATION-STATUS-DEEP-AUDIT.md`
3. Identificacao de 13 conflitos com severidade e causa raiz
4. Proposta de single-source-of-truth
5. Implementacao de 19 fixes
6. Verificacao completa (unit + E2E + build)

---

## 2. Auditoria Profunda — 13 Conflitos

### Conflitos Criticos (P0)

| # | Conflito | Causa Raiz | Impacto |
|---|---------|-----------|---------|
| CONFLICT-001 | `totalPhases = trip.phases.length` retorna **8** | DB tem 8 linhas ExpeditionPhase (fases 7-8 "coming soon") | `deriveExpeditionStatus()` nunca retorna "completed" (6 >= 8 = false) |
| CONFLICT-008 | `deriveExpeditionStatus` nunca funciona | Consequencia direta de CONFLICT-001 | Expedicoes nunca sao marcadas como concluidas |
| CONFLICT-013 | `PhaseEngine.completePhase` seta `currentPhase = 7` | `Math.min(phaseNumber + 1, TOTAL_PHASES)` onde `TOTAL_PHASES = 8` | Usuarios empurrados para estado "Fase 7 chegando" |
| CONFLICT-003 | `DashboardPhaseProgressBar` renderiza 8 fases | Itera sobre `PHASE_DEFINITIONS` (8 entradas) | "A Fase 7 esta chegando!" visivel no dashboard |

### Conflitos Maiores (P1)

| # | Conflito | Causa Raiz |
|---|---------|-----------|
| CONFLICT-002 | Dois sistemas de conclusao paralelos | PhaseEngine (status-based) vs PhaseCompletionEngine (data-based) |
| CONFLICT-007 | `resolveAccess` retorna "revisit" para fases nunca concluidas | Nao diferencia "concluida" de "pulada" |
| CONFLICT-004 | `ExpeditionProgressBar` com route map errado | Phase 1 = `""` ao inves de `"/phase-1"` |
| CONFLICT-005 | `ExpeditionProgressBar` sem `completedPhases` prop | Usa `phaseNum < currentPhase` (nao distingue concluida de pulada) |
| CONFLICT-010 | Phase 6 `router.refresh()` causa flip de modo | "first_visit" vira "revisit" mid-session |

### Conflitos Menores (P2)

| # | Conflito | Causa Raiz |
|---|---------|-----------|
| CONFLICT-006 | Dashboard bar nao usa `canNavigateToPhase()` | Logica ad-hoc ao inves do engine |
| CONFLICT-009 | Dashboard e wizard com regras diferentes | Dois caminhos de navegabilidade |
| CONFLICT-011 | Logica de revisit inconsistente entre wizards | Cada wizard calcula `isRevisiting` de forma diferente |
| CONFLICT-012 | Phase 2 revisit descarta edits silenciosamente | Guard navega sem salvar dados |

---

## 3. Os 19 Fixes — Com Causa Raiz e Cascata

### Root Fixes (2 mudancas de 1 linha que resolvem 7 bugs)

| Fix | Mudanca | Arquivo:Linha | Bugs Resolvidos |
|-----|---------|--------------|-----------------|
| **FIX-01** | `totalPhases: trip.phases.length` → `totalPhases: TOTAL_ACTIVE_PHASES` | `trip.service.ts:248` | FIX-16, FIX-19, CONFLICT-001, CONFLICT-008 |
| **FIX-02** | `Math.min(phaseNumber + 1, TOTAL_PHASES)` → `Math.min(phaseNumber + 1, TOTAL_ACTIVE_PHASES)` | `phase-engine.ts:272` | FIX-16, FIX-17, CONFLICT-013 |

### Fixes Diretos (12 mudancas explicitas)

| Fix | Prioridade | Descricao | Arquivo |
|-----|-----------|-----------|---------|
| FIX-03 | P1 | Dashboard renderiza apenas 6 fases ativas | DashboardPhaseProgressBar.tsx |
| FIX-04 | P1 | Fases puladas retornam `"first_visit"` (nao `"revisit"`) | phase-navigation.engine.ts |
| FIX-05 | P1 | Deletado ExpeditionProgressBar + PhaseProgressBar (legacy) | 3 arquivos deletados |
| FIX-06 | P2 | Removido `router.refresh()` em Phase 6 apos sync | Phase6Wizard.tsx |
| FIX-07 | P2 | Phase 2 revisit salva dados via `updatePhase2Action` antes de navegar | Phase2Wizard.tsx |
| FIX-08 | P2 | Dashboard bar usa `canNavigateToPhase()` do engine | DashboardPhaseProgressBar.tsx |
| FIX-09 | P0 | Actions catch `PHASE_ORDER_VIOLATION` / `PHASE_ALREADY_COMPLETED` como sucesso | expedition.actions.ts |
| FIX-10 | P1 | Preferences carregadas do DB no revisit de Phase 2 | phase-2/page.tsx + Phase2Wizard.tsx |
| FIX-11 | P1 | Phase 3 chama `router.refresh()` apos toggle de checklist | Phase3Wizard.tsx |
| FIX-12 | P1 | Phase 4 advance chama `syncPhaseStatus` para verificar dados | expedition.actions.ts |
| FIX-13 | P1 | Autocomplete mostra formato completo (City, State, Country) | DestinationAutocomplete.tsx |
| FIX-15 | P1 | Pin de mapa usa atlas-gold para fases de planejamento (1-3) | build-geojson.ts |

### Cascade Fixes (5 bugs resolvidos sem codigo adicional)

| Fix | Bug | Resolvido por | Mecanismo |
|-----|-----|--------------|-----------|
| FIX-14 | Preferences perdem selecoes entre paginas | FIX-10 | State management no parent |
| FIX-16 | "Ver Guia"/"Ver Roteiro" vao para "Fase 7" | FIX-01 + FIX-02 | `currentPhase` nunca chega a 7 |
| FIX-17 | Navegacao bidirecional quebrada | FIX-02 + FIX-04 | `currentPhase` correto + modos corretos |
| FIX-18 | Phase 6 nao marca complete | FIX-09 | `syncPhase6CompletionAction` ja funciona (idempotent) |
| FIX-19 | Expedicao auto-complete nunca dispara | FIX-01 | `6 >= 6` agora e `true` (antes era `6 >= 8 = false`) |

---

## 4. Diagrama de Cascata

```
FIX-01 (totalPhases: 8 → 6)          FIX-02 (currentPhase cap: 8 → 6)
    |                                     |
    +--→ CONFLICT-001 resolvido           +--→ CONFLICT-013 resolvido
    |    (deriveExpeditionStatus           |    (sem estado "Phase 7")
    |     agora funciona)                  |
    |                                     +--→ FIX-16 resolvido
    +--→ FIX-19 resolvido                |    ("Ver Guia" aponta para
    |    (auto-complete: 6>=6 ✓)          |     fase correta)
    |                                     |
    +--→ FIX-16 resolvido                +--→ FIX-17 resolvido
         (dashboard fases corretas)            (bidirecional funciona)
                                               |
         FIX-04 (skipped=first_visit) ---------+
              |                                |
              +--→ FIX-17 resolvido            +--→ CONFLICT-007 resolvido
              |    (modos de acesso corretos)       (sem banner "revisitando"
              |                                      em fases puladas)
              +--→ CONFLICT-011 resolvido
                   (wizards recebem modo correto)

         FIX-05 (delete legacy) --------→ CONFLICT-004 resolvido
              |                              (route map errado removido)
              +--→ CONFLICT-005 resolvido
                   (sem logica incompleta)

RESUMO: 2 mudancas de 1 linha (FIX-01, FIX-02) → 7 bugs resolvidos em cascata
```

---

## 5. Componentes Legacy Deletados

| Arquivo | Linhas | Motivo da Remocao |
|---------|--------|-------------------|
| `src/components/features/expedition/ExpeditionProgressBar.tsx` | 83 | Route map proprio errado (Phase 1 = ""), sem `completedPhases` prop, nao usa engine |
| `src/components/features/expedition/PhaseProgressBar.tsx` | 31 | Substituido por `StepProgressIndicator`, nunca atualizado para SDD |
| `tests/unit/components/features/expedition/ExpeditionProgressBar.test.tsx` | 218 | Testes do componente deletado |
| **Total deletado** | **332 linhas** | Reducao de superficie de bugs |

---

## 6. Resultados de Testes

### Unitarios

| Metrica | v0.27.0 | v0.27.1 | Delta |
|---------|---------|---------|-------|
| Test files | 145 | 144 | -1 (ExpeditionProgressBar.test deletado) |
| Tests | 2172 | 2157 | -15 (testes do componente deletado) |
| Failures | 0 | 0 | 0 |
| Build | Clean | Clean | -- |

### E2E (staging: travel-planner-eight-navy.vercel.app)

| Metrica | v0.27.0 | v0.27.1 | Delta |
|---------|---------|---------|-------|
| Total | 130 | 130 | 0 |
| Passed | 121 | **122** | +1 |
| Failed | 1 (AC-403) | **0** | -1 |
| Skipped | 8 | 8 | 0 |
| Pass rate (executaveis) | 99.2% | **100%** | +0.8% |
| Exit code | 1 | **0** | Fixed |

### Skipped (8 — todos esperados)

| Teste | Motivo |
|-------|--------|
| E2E-007 (Phase 2 wizard) | `test.skip()` pre-existente — requer expedicao em Phase 2 |
| 7x phase-completion.spec.ts | Placeholders com `test.skip(true)` — specs para implementacao futura |

---

## 7. Causas Raiz Fundamentais

As 5+ tentativas anteriores de correcao falharam porque atacavam **sintomas** (revisit guards, error handling, component fixes) sem identificar as **2 causas raiz fundamentais**:

### Causa Raiz 1: `totalPhases = 8`

```
DB: 8 linhas ExpeditionPhase (fases 1-8, sendo 7-8 "coming soon")
trip.service.ts: totalPhases = trip.phases.length  →  8
expedition.types.ts: deriveExpeditionStatus()  →  completedPhases.length >= totalPhases  →  6 >= 8  →  NUNCA true
```

**Efeito**: Expedicoes nunca detectadas como "completed". Dashboard sempre mostra "active". Auto-complete nunca dispara.

**Fix**: Uma linha — `totalPhases: TOTAL_ACTIVE_PHASES` (6).

### Causa Raiz 2: `currentPhase` sem cap em 6

```
phase-engine.ts: currentPhase = Math.min(phaseNumber + 1, TOTAL_PHASES)
TOTAL_PHASES = 8
Completar Phase 6: currentPhase = Math.min(7, 8) = 7
```

**Efeito**: Apos completar Phase 6, usuario entra em estado "Phase 7" (inexistente). Hub page redireciona para Phase 7 (nao existe). Progress bar mostra "A Fase 7 esta chegando!". Navegacao bidirecional quebra porque `resolveAccess` usa `currentPhase` como fronteira.

**Fix**: Uma linha — `Math.min(phaseNumber + 1, TOTAL_ACTIVE_PHASES)`.

---

## 8. Arquivos Alterados

### Fonte (14 arquivos modificados + 2 deletados)

| Arquivo | Tipo de Mudanca | Fix |
|---------|----------------|-----|
| `src/server/services/trip.service.ts` | `totalPhases` = 6 | FIX-01 |
| `src/lib/engines/phase-engine.ts` | Cap `currentPhase` em 6 | FIX-02 |
| `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` | 6 fases + `canNavigateToPhase()` | FIX-03, FIX-08 |
| `src/lib/engines/phase-navigation.engine.ts` | Skipped = first_visit | FIX-04 |
| `src/components/features/expedition/ExpeditionProgressBar.tsx` | **DELETADO** | FIX-05 |
| `src/components/features/expedition/PhaseProgressBar.tsx` | **DELETADO** | FIX-05 |
| `src/components/features/expedition/Phase6Wizard.tsx` | Remove `router.refresh()` | FIX-06 |
| `src/components/features/expedition/Phase2Wizard.tsx` | Revisit salva dados + preferences | FIX-07, FIX-10 |
| `src/server/actions/expedition.actions.ts` | Idempotent error handling + Phase 4 sync | FIX-09, FIX-12 |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-2/page.tsx` | Carrega preferences do DB | FIX-10 |
| `src/components/features/expedition/Phase3Wizard.tsx` | `router.refresh()` apos toggle | FIX-11 |
| `src/components/features/expedition/DestinationAutocomplete.tsx` | Format completo com state | FIX-13 |
| `src/lib/map/build-geojson.ts` | Pin gold para fases 1-3 | FIX-15 |

### Testes (8 arquivos modificados + 1 deletado)

| Arquivo | Mudanca |
|---------|---------|
| `DashboardPhaseProgressBar.test.tsx` | 6 fases, sem "coming soon" |
| `DestinationAutocomplete.test.tsx` | Format com state |
| `ExpeditionProgressBar.test.tsx` | **DELETADO** |
| `Phase2WizardRevisitGuard.test.tsx` | Revisit com save |
| `Phase6Wizard.test.tsx` | Sem router.refresh |
| `phase-navigation.engine.test.ts` | Skipped = first_visit |
| `build-geojson.test.ts` | Pin colors |

### Totais

- **21 arquivos** alterados
- **274 linhas** adicionadas
- **394 linhas** removidas (incluindo 332 de legacy deletado)
- **Saldo**: -120 linhas (codebase ficou menor)

---

## 9. Conformidade SDD

| Etapa SDD | Status | Evidencia |
|-----------|--------|-----------|
| Investigacao | Completa | `docs/investigation/NAVIGATION-STATUS-DEEP-AUDIT.md` |
| Documentacao de conflitos | Completa | 13 conflitos com severidade, causa raiz e arquivos |
| Proposta de single-source-of-truth | Completa | Secao 11 do audit document |
| Implementacao contra audit | Completa | 19 fixes mapeados 1:1 para conflitos |
| Testes unitarios | Completa | 2157 passando, 0 falhas |
| Testes E2E | Completa | 122 passando, 0 falhas (100% executaveis) |
| Build | Completa | `npm run build` limpo |
| Tag + push | Completa | v0.27.1 em master |
| Sprint review | Completa | Este documento |

### Licao Aprendida

Quando o mesmo bug retorna apos multiplos patches, **PARE de patchar**. Conduza uma auditoria profunda que:
1. Lista TODAS as fontes de verdade para o estado em questao
2. Identifica TODOS os conflitos entre elas
3. Propoe uma single-source-of-truth
4. Implementa fixes partindo das causas raiz (nao dos sintomas)

Neste caso, 2 mudancas de 1 linha (`totalPhases = 6` e `currentPhase cap = 6`) resolveram em cascata 7 dos 19 bugs — mais do que todas as tentativas anteriores de patching combinadas.

---

*Documento gerado em 2026-03-20. Tag: v0.27.1. Commit: dbd1d23.*
