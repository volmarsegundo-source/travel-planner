# Sprint 32 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-19
**Autor**: product-owner
**Status do produto**: v0.26.0 (Sprint 31 completo) / v0.27.0 em planejamento
**Tema do sprint**: "Stabilization — Phase Transitions, Completion Engine, Report & UX Polish"

---

## Contexto: Sprint de Estabilizacao

Sprint 32 e um sprint de estabilizacao baseado nos resultados dos testes de v0.26.0 (~78% de taxa de aprovacao). O objetivo nao e entregar novas features — e garantir que as features existentes funcionam corretamente antes do beta launch com usuarios reais.

Os bugs P0 (P0-001 e P0-006) bloqueiam o caminho critico de toda expedicao. Eles devem ser resolvidos antes de qualquer outro trabalho neste sprint.

---

## Visao Geral das Specs do Sprint 32

| Spec ID | Titulo | Estimativa | Prioridade | Bugs/UX |
|---------|--------|------------|------------|---------|
| SPEC-PROD-025 | Phase Transition Fixes | 6–8h | P0 | P0-001, P0-006 |
| SPEC-PROD-026 | Completion Engine Fixes | 8–10h | P0/P1 | P0-002, P0-003, P0-007, UX-006, UX-008 |
| SPEC-PROD-027 | Report i18n e Completude | 6–8h | P1 | P1-004, P1-005 |
| SPEC-PROD-028 | UX Improvements | 10–14h | P1/P2 | UX-001–005, UX-007 |
| **TOTAL** | | **30–40h** | | |

---

## Hierarquia de Prioridade

```
P0 — SPEC-PROD-025 (Phase Transition Fixes)
      Bugs P0-001 e P0-006 bloqueiam o caminho critico de toda expedicao.
      Nenhum viajante consegue completar o fluxo 1→6 sem encontrar erro.
      Deve ser a primeira entrega do sprint — sem isso, nenhum teste manual
      do restante do sprint e confivel.
      |
      v
P0/P1 — SPEC-PROD-026 (Completion Engine Fixes)
      P0-002, P0-003, P0-007 comprometem a integridade dos dados.
      Parcialmente dependente de SPEC-PROD-025 estar funcional
      (nao faz sentido testar estados de fase com transicoes quebradas).
      UX-006 e UX-008 podem ser implementados em paralelo.
      |
      v
P1 — SPEC-PROD-027 (Report i18n e Completude)
      P1-004 e P1-005 impactam a tela de maior visibilidade do produto.
      Independente de SPEC-PROD-025 e SPEC-PROD-026.
      Pode ser desenvolvido em paralelo na semana 1.
      |
      v
P1/P2 — SPEC-PROD-028 (UX Improvements)
      6 melhorias de UX de menor urgencia mas alta visibilidade em beta.
      Itens independentes entre si (exceto UX-001+UX-002 que compartilham
      os mesmos campos). Implementar em ordem de esforco crescente.
      Sacrificar UX-005 (auto-save) se o budget apertar — e o mais complexo.
```

---

## Ordem de Sacrificio (se o budget estourar)

Na seguinte ordem, deferir para Sprint 33:

1. SPEC-PROD-028 UX-005 (auto-save Phase 4) — mais complexo e menor impacto imediato em beta
2. SPEC-PROD-028 UX-007 (nomes de fase na barra de progresso) — melhoria visual, nao funcional
3. SPEC-PROD-028 UX-003 (split 4+3 de preferencias) — melhoria de layout, nao bloqueia uso
4. SPEC-PROD-027 dados de Phase 4 no relatorio (se o escopo crescer alem do definido)

**Nao negociavel para este sprint**:
- SPEC-PROD-025 completo (P0 — zero bugs de transicao de fase)
- SPEC-PROD-026 P0-002, P0-003, P0-007 (integridade do motor de estados)
- SPEC-PROD-027 P1-004 (zero valores enum brutos no relatorio)

---

## Paralelizacao Sugerida

**Dev-fullstack-1** (semana 1): SPEC-PROD-025 (root cause + fix das transicoes)
**Dev-fullstack-2** (semana 1): SPEC-PROD-027 (i18n do relatorio — independente)
**Dev-fullstack-1** (semana 2): SPEC-PROD-026 (completion engine — consome transicoes corretas)
**Dev-fullstack-2** (semana 2): SPEC-PROD-028 (UX items — independentes, pode fatiar por item)

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Arquivo |
|---------|--------|--------|---------|
| SPEC-PROD-025 | Phase Transition Fixes | Draft | `docs/specs/sprint-32/SPEC-PROD-025-phase-transition-fixes.md` |
| SPEC-PROD-026 | Completion Engine Fixes | Draft | `docs/specs/sprint-32/SPEC-PROD-026-completion-engine-fixes.md` |
| SPEC-PROD-027 | Report i18n e Completude | Draft | `docs/specs/sprint-32/SPEC-PROD-027-report-i18n-completeness.md` |
| SPEC-PROD-028 | UX Improvements | Draft | `docs/specs/sprint-32/SPEC-PROD-028-ux-improvements.md` |

---

## Proximas Acoes Pre-Implementacao

- **Architect**: root cause analysis para P0-001 e P0-006 — identificar a causa tecnica antes de estimar com precisao (SPEC-ARCH necessario para SPEC-PROD-025)
- **Architect**: definir estrategia de calculo bidirecional de estados para SPEC-PROD-026 (state machine vs event sourcing vs recalculo on-demand)
- **UX-designer**: SPEC-UX para UX-001 (layout lado a lado), UX-003 (split 4+3 com definicao de quais categorias em cada pagina) e UX-007 (design da barra de progresso com nomes)
- **Tech-lead**: confirmar budget de horas para Sprint 32 e validar ordem de sacrificio
- **QA-engineer**: preparar plano de testes de regressao para SPEC-PROD-025 — foco em todos os caminhos de transicao de fase (direto, reverso, com saltos)

---

## Criterio de GO para Beta Launch (Sprint 32 Review)

| Criterio | Threshold |
|----------|-----------|
| SPEC-PROD-025 implementado e testado | 100% ACs passando — zero erros de transicao de fase |
| SPEC-PROD-026 P0-002/003/007 resolvidos | 0 ocorrencias dos bugs em testes manuais |
| SPEC-PROD-027 P1-004 resolvido | 0 valores enum brutos visiveis no relatorio |
| Nenhum P0 bug novo introduzido | Zero regressoes em funcionalidades que passavam em v0.26.0 |
| Taxa de aprovacao manual | >= 90% (meta de subir de 78% para 90%+) |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | product-owner | Documento inicial — Sprint 32 stabilization planning com 4 specs |
