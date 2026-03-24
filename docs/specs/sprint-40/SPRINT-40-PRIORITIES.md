# Sprint 40 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-24
**Autor**: product-owner
**Status do produto**: v0.34.0 (Sprint 39 em andamento — Landing + Login V2) / v0.35.0 em planejamento
**Tema do sprint**: "Migracao Visual Completa — Shell, Fases 1-6, Dashboard"

---

## Contexto: A Consolidacao do Design V2

O Sprint 39 tornou o V2 visivel pela primeira vez: Landing Page e Login Page entregues com flag `NEXT_PUBLIC_DESIGN_V2=true`. O roadmap original previa 3 sprints para completar a migracao interna (Sprint 40: Fases 1-3, Sprint 41: Fases 4-6 + Summary, Sprint 42: Dashboard).

O Sprint 40 consolida esses 3 sprints em um unico esforco focado. A justificativa:

1. **Coerencia de entrega**: Entregar metade do wizard em V2 e manter o restante em V1 cria uma experiencia fragmentada que nao pode ir para staging sem confundir revisores e stakeholders.
2. **Dependencia comum**: Todos os specs dependem do mesmo `PhaseShellV2` (SPEC-PROD-051). Construir o shell e imediatamente usarlo em todas as fases e mais eficiente do que construir em sprints separados.
3. **Capacidade disponivel**: Com 2 devs full-stack em tracks paralelas e o Component Library do Sprint 38 como base solida, 50h e suficiente para o escopo consolidado.
4. **Custo de contexto**: Cada sprint de migracao partial exige um ciclo completo de review, QA, e merge sem entregar valor ao usuario final. A consolidacao entrega o V2 autenticado completo em uma unica release.

A restricao critica se mantem: `NEXT_PUBLIC_DESIGN_V2=false` em staging e producao ate o UX Designer aprovar o produto completo.

---

## Visao Geral das Specs do Sprint 40

| Spec ID | Titulo | Estimativa | MoSCoW | Score |
|---------|--------|------------|--------|-------|
| SPEC-PROD-051 | Phase Shell V2 + Authenticated Nav V2 | ~8h | Must Have | 4.85 |
| SPEC-PROD-052 | Wizard Phases 1-3 V2 | ~15h | Must Have | 4.60 |
| SPEC-PROD-053 | Wizard Phases 4-6 V2 + Expedition Summary V2 | ~12h | Must Have | 4.40 |
| SPEC-PROD-054 | Dashboard "Meu Atlas" V2 | ~8h | Should Have | 4.20 |
| Buffer | Ajustes de fidelidade, QA cross-spec, review UX | ~7h | — | — |

**Budget total**: 50h
**Reserva explicita**: 7h (14%) — alocada para ajustes de fidelidade ao design identificados durante review do UX Designer mid-sprint

---

## Pontuacao de Prioridade (Scoring Matrix)

| Criterio | Peso | SPEC-PROD-051 | SPEC-PROD-052 | SPEC-PROD-053 | SPEC-PROD-054 |
|----------|------|---------------|---------------|---------------|---------------|
| Severidade da dor do viajante | 30% | 5 (shell e o fundamento de tudo) | 5 (fases mais frequentes) | 4 (fases de maior valor percebido) | 4 (hub de retorno) |
| Impacto de receita / retencao | 25% | 5 (sem o shell, nenhuma fase funciona) | 4 (Phase 1 = conversao de novo usuario) | 5 (Phase 6 itinerario = principal entrega de valor) | 4 (retencao de usuarios recorrentes) |
| Esforco (inverso) | 20% | 4 (escopo delimitado, sem logica nova) | 3 (6 ACs por fase, 3 fases) | 3 (complexidade do streaming Phase 6) | 4 (dashboard e mais simples que fases) |
| Alinhamento estrategico | 15% | 5 (roadmap aprovado, prerequisito absoluto) | 5 (roadmap aprovado Sprint 40) | 5 (roadmap aprovado Sprint 40) | 4 (roadmap originalmente Sprint 42, antecipado) |
| Diferenciacao competitiva | 10% | 4 (infra, invisivel ao usuario) | 4 (wizard premium diferencia) | 5 (itinerario visual e o wow moment) | 3 (dashboard e padrao de mercado) |
| **Score ponderado** | | **4.85** | **4.60** | **4.40** | **4.20** |

---

## Decisoes de Escopo

### P0 — Must Have (nao saem do sprint)

**SPEC-PROD-051: Phase Shell V2 + Authenticated Nav V2** (~8h)

Este e o prerequisito absoluto do sprint. Sem o shell, nenhuma das outras specs pode ser integrada. E a primeira tarefa a ser iniciada, pela Track 1. Nenhum PR de fase pode ser mergeado antes do shell estar aprovado.

Criterio de saida: `PhaseShellV2` renderiza em todas as rotas de fase com flag ON; flag OFF nao apresenta regressao; axe-core zerado.

**SPEC-PROD-052: Wizard Phases 1-3 V2** (~15h)

As tres fases iniciais cobrem o fluxo de onboarding de novos usuarios — o momento de maior risco de abandono. Visualmente, a transicao da Landing Page e Login V2 para um wizard V1 e inaceitavel para staging. Esta spec e Must Have junto com o shell.

Criterio de saida: 18 ACs passando, zero regressoes V1, UX Designer aprova Phases 1 e 3 contra Stitch exports, Phase 2 aprovada inline.

**SPEC-PROD-053: Wizard Phases 4-6 V2 + Expedition Summary V2** (~12h)

A Phase 6 (itinerario) e o principal artefato de valor do produto — o "wow moment". Entregar Fases 1-3 sem a Phase 6 deixaria o produto em um estado incompleto que nao pode ser demonstrado a stakeholders nem usado como baseline de staging V2. Esta spec e Must Have.

Criterio de saida: 21 ACs passando (18 de fases + 3 de summary), zero regressoes V1, streaming Phase 6 preservado, UX Designer aprova Phase 6 contra Roteiro Stitch export.

### P1 — Should Have (sai se houver bloqueio critico de P0)

**SPEC-PROD-054: Dashboard "Meu Atlas" V2** (~8h)

O dashboard completa a experiencia V2 para usuarios recorrentes. Originalmente previsto para Sprint 42, foi antecipado pela consolidacao. E Should Have porque:
- O produto V2 pode ser demonstrado e aprovado em staging sem o dashboard V2 (as fases estao acessiveis via deep-link)
- Se os P0s estourarem o budget, o dashboard pode escorregar para o Sprint 41 sem perda de coerencia do wizard

Criterio de saida: 10 ACs passando, zero regressoes V1, UX Designer aprova contra Dashboard Stitch export.

### P2 — Could Have (bonus se sobrar budget apos P0+P1)

- Animacoes de transicao entre steps do wizard (entrada/saida de cards)
- Register Page V2 (se nao foi entregue no Sprint 39)
- Sticky day headers no Phase 6 itinerario em mobile (AC-18 do SPEC-PROD-053 e Must Have; este e apenas o aprimoramento com scroll suave)

### Won't Have (Sprint 40)

- Design V2 rollout (flag ON em staging/producao) — Sprint 41+, requer aprovacao formal do UX Designer + QA sign-off completo
- ForgotPassword Page V2
- Dark mode
- Animacoes de scroll reveal
- Itinerary export PDF / shareable link (SPEC-PROD-014, deferred)
- Mobile app

---

## Alocacao por Track

### Track 1 — dev-fullstack-1: Shell + Phases 1-3 (~25h)

Responsavel por SPEC-PROD-051 e SPEC-PROD-052.

Sequencia obrigatoria (SPEC-PROD-051 primeiro — e prerequisito de SPEC-PROD-052):

1. **PhaseShellV2 estrutura** — sidebar desktop, navbar V2 sem conteudo (2h)
2. **AuthenticatedNavbarV2** — PA badge, user menu, language switcher (2h)
3. **PhaseShellV2 responsive** — mobile top-bar, breakpoints, breadcrumb (2h)
4. **AtlasPhaseProgress integracao no shell** — sidebar states, completed/active/locked (2h)
5. **SPEC-PROD-051 E2E + unit tests + UX review gate** (1h) — PARAR AQUI ate review de shell
6. **Phase 1 V2** — AtlasInput, destination autocomplete, date picker, confirmation card (4h)
7. **Phase 2 V2** — AtlasChip preferences, AtlasStepperInput passengers, budget cards (4h)
8. **Phase 3 V2** — checklist toggles, category badges, AI skeleton loader (3h)
9. **SPEC-PROD-052 E2E + unit tests** (3h)
10. **Buffer ajustes de fidelidade** (2h)

**Desbloqueio**: Pode comecar imediatamente. Component Library Sprint 38 disponivel. Stitch exports para Phase 1 e Phase 3 em `docs/design/stitch-exports/`. Phase 2 requer UX Designer inline review antes do inicio do item 7.

### Track 2 — dev-fullstack-2: Phases 4-6 + Summary + Dashboard (~25h)

Responsavel por SPEC-PROD-053 e SPEC-PROD-054.

**Aguardar aprovacao de SPEC-PROD-051** antes de integrar ao shell. Pode iniciar implementacao de componentes isolados em paralelo.

Sequencia recomendada:

1. **Phase 4 V2** — AtlasCard steps, transport rows, accommodation rows, mobility chips (4h)
2. **Phase 5 V2** — bento-grid layout, category cards, AI skeleton (3h)
3. **Phase 6 V2** — timeline day-by-day, activity nodes, streaming progressive render (5h)
4. **Expedition Summary V2** — 6-section cards, hero summary bar (2h)
5. **SPEC-PROD-053 E2E + unit tests** (3h)
6. **Dashboard V2** — AtlasCard expedition list, empty state, filter/sort chips, PA balance header (4h)
7. **SPEC-PROD-054 E2E + unit tests** (2h)
8. **Buffer ajustes de fidelidade** (2h)

**Desbloqueio**: Phase 4/5 podem comecar imediatamente (sem Stitch export, tokens como autoridade). Phase 6 e a mais complexa — iniciar apos Phase 4 e 5 estarem em estado de review. Dashboard pode ser paralelizado com Phase 6 se o dev preferir intercalar.

### Cross-cutting (~5h incluidos no buffer)

| Tarefa | Responsavel | Estimativa |
|--------|-------------|-----------|
| UX Designer review mid-sprint (shell + Phase 1 prontos) | ux-designer | 2h |
| UX Designer review final (antes do merge de cada spec) | ux-designer | 2h |
| Sprint review document | tech-lead | 1h |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Phase 6 streaming V2 atrasa Track 2 | MEDIA | ALTO | Iniciar Phase 6 como segunda tarefa de Track 2 (nao deixar por ultimo). Se atrasar, o streaming pode ser mantido em V1 dentro do shell V2 e migrado no Sprint 41 sem perda de coerencia. |
| Phase 2 sem Stitch export — divergencia de design | MEDIA | MEDIO | UX Designer faz review inline antes do inicio da implementacao. Documentar decisoes de design no PR como referencia futura. |
| Budget estoura e Dashboard V2 nao entra | MEDIA | BAIXO | Dashboard e P1 (Should Have). O produto pode ser demonstrado sem ele. Escorrega para Sprint 41 com spec ja pronta. |
| Shell SPEC-PROD-051 bloqueia ambas as tracks | BAIXA | CRITICO | Track 2 desenvolve componentes isolados enquanto aguarda. Shell tem prioridade maxima e estimativa conservadora (8h). Se atrasar, Track 2 so integra ao shell, nao reimplementa. |
| Animacoes de streaming causam falhas nos E2E screenshots | BAIXA | MEDIO | Desabilitar animacoes CSS nos testes via `prefers-reduced-motion` media query ou variavel de ambiente de teste. Padrao estabelecido desde Sprint 39. |
| AtlasInput incompatibilidades com server actions de Phase 1 | BAIXA | ALTO | Testar o fluxo completo de criacao de trip com AtlasInput desde o inicio da Track 1, nao apenas ao final. |

---

## Criterio de Aceite do Sprint

O Sprint 40 e considerado COMPLETO quando:

1. [ ] SPEC-PROD-051 entregue: PhaseShellV2 + AuthenticatedNavbarV2 com 12 ACs passando, axe-core zerado, zero regressoes V1
2. [ ] SPEC-PROD-052 entregue: Phases 1-3 V2 com 18 ACs passando, UX Designer aprova, zero regressoes V1
3. [ ] SPEC-PROD-053 entregue: Phases 4-6 V2 + Summary V2 com 21 ACs passando, UX Designer aprova Phase 6, streaming preservado, zero regressoes V1
4. [ ] SPEC-PROD-054 entregue (se P1 for alcancado): Dashboard V2 com 10 ACs passando, UX Designer aprova, zero regressoes V1
5. [ ] `NEXT_PUBLIC_DESIGN_V2` permanece `false` em staging e producao
6. [ ] Zero regressoes visuais no produto V1 (flag OFF) — validado por Playwright screenshot baseline completo
7. [ ] Sprint review document produzido

---

## Proximos Sprints (preview pos-consolidacao)

| Sprint | Tema | Specs |
|--------|------|-------|
| Sprint 41 | Design V2 Staging Rollout + Ajustes finais | SPEC-PROD-055 (Rollout V2 flag ON em staging, UX sign-off, performance audit) |
| Sprint 42 | Design V2 Producao Rollout + A/B test infra | SPEC-PROD-056 |
| Sprint 43+ | Proxima onda de features (booking integration, destinos dinamicos, etc.) | TBD |
