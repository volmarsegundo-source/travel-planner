# PLAN-BLOCOS-0-1-2-3 — Correções Críticas

> Versão: 1.0.0 | Data: 2026-03-30 | Autor: Tech Lead

## Status do Diff Atual

O diff não-commitado (~960 linhas, 11 arquivos) já implementa:

- **Phase completion engine**: `transportUndecided/accommodationUndecided/mobilityUndecided` em `PhaseDataSnapshot.phase4`; `evaluatePhase4()` retorna `"in_progress"` quando qualquer flag é true
- **Phase completion service**: `buildSnapshot()` lê flags undecided do metadata da Phase 4
- **Expedition actions**: `advanceFromPhaseAction()` persiste flags undecided
- **Phase4WizardV2**: Envia flags undecided no avanço
- **Summary service**: Phase 4 retorna flags undecided; Phase 6 inclui `activityNames: string[]`
- **ExpeditionSummaryV2**: i18n para tipos transport/accommodation/mobility, chips traduzidos, alerta undecided Phase 4, lista de atividades Phase 6, card de gamificação
- **i18n**: ~50 novas chaves em en.json e pt-BR.json
- **Testes**: Fixtures e assertions atualizados

---

## Bloco 0 — Função Centralizada de Status Visual

### Problema
Lógica de status visual duplicada em 3 arquivos:
1. `ExpeditionSummary.tsx` (v1 legacy) — `PhaseStatus` type + `StatusBadge`
2. `ExpeditionSummaryV2.tsx` — `PhaseStatus` type + 5 funções inline (`getPhaseStatus`, `getStatusBadgeColor`, `getStatusLabel`, `getCtaLabel`, `getBorderClass`)
3. `DashboardV2.tsx` — `getStatusBadgeColor` + `getStatusLabelKey`

### Solução
Criar `src/lib/utils/phase-status.ts`:
- Exportar `PhaseStatus` type: `'completed' | 'in_progress' | 'pending' | 'not_started' | 'locked'`
- Exportar `getPhaseStatusVisual()` com mapeamento completo
- Exportar `resolvePhaseStatus()` — determina status a partir de dados da fase
- Refatorar todos os 3 consumidores

**Complexidade: S** | **Risco: BAIXO**

### Arquivos a modificar
- `src/lib/utils/phase-status.ts` (NOVO)
- `src/components/features/expedition/ExpeditionSummaryV2.tsx`
- `src/components/features/dashboard/DashboardV2.tsx`
- `src/components/features/expedition/ExpeditionSummary.tsx` (v1, se ainda em uso)

---

## Bloco 1 — Phase 4 "Ainda não decidi"

### Já implementado no diff
- Engine reconhece flags undecided
- Service lê flags do metadata
- Actions persistem flags
- Wizard envia flags

### Lacunas restantes

| ID | Descrição | Complexidade |
|---|---|---|
| B1-001 | `evaluatePhase4()` retorna `"in_progress"` quando TODAS 3 seções são undecided — deveria retornar `"pending"` | XS |
| B1-002 | Na revisita, checkboxes undecided não são pré-populados do metadata salvo. `Phase4WizardV2.tsx` `loadData()` precisa buscar metadata | S |
| B1-003 | Testes unitários para todas combinações undecided (cenários A/B/C/D) | M |

### Distinção importante: `in_progress` vs `pending`
- `in_progress` = fase atual do usuário, dados parciais normais
- `pending` = fase CONCLUÍDA com ressalvas (undecided marcado, checklist incompleto)

---

## Bloco 2 — Sumário: 7 Correções

| # | Fix | Causa Raiz | Status | Complexidade |
|---|---|---|---|---|
| 2.1 | Progress bar no topo + clicável | Barra após overview; círculos são divs, não links | TO DO | S |
| 2.2 | Remover "Visão Geral" | Duplica info do hero + cards de fase | TO DO | S |
| 2.3 | Card Perfil i18n | Novas chaves (`phase1Origin`, `phase1Dates`) podem faltar no namespace `expedition.summaryV2`; chips de preferências não traduzidos | AUDIT | S |
| 2.4 | Card Preparo nomes técnicos | `CHECKLIST_ITEM_KEYS` cobre só 8 chaves; items como `passport`, `visa` caem para raw key | PARCIAL | M |
| 2.5 | Card Logística vazio | Diff corrige detecção non-null; residual: card vazio quando all undecided + sem dados | PARCIAL | S |
| 2.6 | Card Guia estilo escuro | `Phase5DarkCard` usa `bg-[#040d1b]` hardcoded, span 2 colunas, inconsistente | TO DO | M |
| 2.7 | Card Roteiro detalhes | **JÁ IMPLEMENTADO** no diff atual — `activityNames` exibidos | DONE | XS |

---

## Bloco 3 — Fase 6: 4 Correções + 1 Melhoria

| ID | Descrição | Estado Atual | Complexidade | Risco |
|---|---|---|---|---|
| B3-001 | Add/edit/delete atividades | Phase6ItineraryV2 é read-only pós-geração. Sem botões CRUD. | L | ALTO — precisa CRUD actions com BOLA, UI otimista, modal |
| B3-002 | Mapa Leaflet | `MapPanel` é placeholder listando locais. Comentário: "full Leaflet deferred to v2" | L | MÉDIO — incompatibilidade SSR, CSP para tile CDN |
| B3-003 | WizardFooter padrão | Footer pós-geração é custom (linhas 1162-1201). Pré-geração já usa WizardFooter. | S | BAIXO |
| B3-004 | Toggle visualização (Por Dia / Lista Corrida) | Só view "por dia" existe. Sem modo lista contínua. | M | BAIXO |

---

## Ordem de Execução

```
Fase 1 (paralelo):
  dev-fullstack-1: Bloco 0 (função centralizada) → Bloco 1 (3 gaps)
  dev-fullstack-2: Bloco 2 (7 fixes no sumário)

Fase 2 (paralelo):
  dev-fullstack-1: B3-003 (WizardFooter) → B3-001 (CRUD atividades)
  dev-fullstack-2: B3-004 (toggle view) → B3-002 (mapa Leaflet)
```

**Estimativa total**: ~9h com 2 devs em paralelo

---

## Pré-requisito Crítico

⚠️ O diff atual (~960 linhas) DEVE ser commitado antes de iniciar este plano.
Trabalhar sobre mudanças não-commitadas deste tamanho criará conflitos de merge.

---

## Preocupações de Segurança

- **B3-001** (CRUD atividades): BOLA obrigatório em toda action
- **B3-002** (Leaflet): CSP allowlist para `tile.openstreetmap.org`
- **B3-001**: Input de título/descrição validado com Zod (max length, sem XSS)

---

## Testes Obrigatórios

- **Bloco 0**: Testes unitários para `getPhaseStatusVisual()` — todos 5 estados
- **Bloco 1**: Cenários A/B/C/D (unitários + E2E)
- **Bloco 2**: Snapshot/visual para cada card do sumário
- **Bloco 3**: CRUD atividades (BOLA), mapa (coordenadas), toggle view
- **Baseline**: 1776 testes devem continuar passando (zero regressões)
