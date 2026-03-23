# Sprint 38 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-23
**Autor**: product-owner
**Status do produto**: v0.32.0 (Sprint 37 completo — Gamification Wave 3 / Stripe) / v0.33.0 em planejamento
**Tema do sprint**: "Fundacao do Design System"

---

## Contexto: O Sprint que Prepara a Transformacao Visual

O Sprint 37 entregou a monetizacao real via Stripe — o produto agora gera receita, o fluxo de compra de PA funciona com PIX e cartao de credito, e o dashboard administrativo exibe metricas de rentabilidade por usuario. A fundacao funcional e de negocio do Atlas esta completa.

O Sprint 38 inicia uma nova era: **a transformacao visual do produto**. O Google Stitch gerou 5 telas oficiais exportadas (Landing Page, Dashboard, Phase 1, Phase 3, Itinerario) que definem o design final do Atlas — premium, aventureiro, coerente. O `docs/design/DESIGN.md` codifica o sistema de tokens. O `docs/design/SCREEN-INDEX.md` cataloga as telas.

O problema: **aplicar o novo design diretamente sobre o codigo atual e inviavel**. Nao ha tokens centralizados, as fontes corretas nao estao instaladas, nao ha biblioteca de componentes reutilizaveis, e qualquer mudanca visual arriscaria quebrar os 120 testes E2E existentes sem mecanismo de controle.

**Sprint 38 resolve isso construindo a infraestrutura antes de tocar em qualquer tela existente.**

A metafora: antes de reformar uma casa, voce prepara o canteiro de obras, instala os andaimes e define os materiais padrao. Neste sprint, construimos os andaimes. No Sprint 39, comeca a reforma.

**Restricao critica**: com a feature flag `NEXT_PUBLIC_DESIGN_V2=false` (valor padrao e unico permitido em producao e staging), NENHUMA mudanca visual deve ser perceptivel pelos usuarios. O produto deve funcionar identicamente ao v0.32.0.

---

## Visao Geral das Specs do Sprint 38

| Spec ID | Titulo | Estimativa | Prioridade | Categoria |
|---------|--------|------------|------------|-----------|
| SPEC-PROD-046 | Design System Foundation | 20h | Must Have | Infraestrutura |
| SPEC-PROD-047 | Component Library v1 | 25h | Must Have | Componentes |
| TC (cross-cutting) | Agent prompts + UX review + sprint review | 5h | Should Have | Operacional |

**Budget total**: 50h
**Reserva de risco**: 0h explícita (buffer absorvido na estimativa por componente)

---

## Pontuacao de Prioridade (Scoring Matrix)

| Criterio | Peso | SPEC-PROD-046 | SPEC-PROD-047 |
|----------|------|---------------|---------------|
| Severidade da dor (desenvolvedor + viajante futuro) | 30% | 5 (bloqueio para Sprint 39+) | 5 (bloqueio para Sprint 39+) |
| Impacto de receita / retencao | 25% | 4 (viabiliza diferencial visual premium) | 4 (viabiliza diferencial visual premium) |
| Esforco (inverso) | 20% | 3 (esforco medio-alto, mas previsivel) | 3 (esforco alto, mas isolado) |
| Alinhamento estrategico | 15% | 5 (roadmap aprovado) | 5 (roadmap aprovado) |
| Diferenciacao competitiva | 10% | 3 (infraestrutura interna) | 4 (componentes de qualidade) |
| **Score ponderado** | | **4.20** | **4.30** |

Ambas as specs sao Must Have e tratadas como uma unidade coesa: SPEC-PROD-046 e pre-requisito de SPEC-PROD-047.

---

## Alocacao por Track

### Track 1 — dev-fullstack-1: Design Tokens e Infraestrutura (~20h)

Responsavel pelo SPEC-PROD-046 (requisitos REQ-DS-001 a REQ-DS-008).

| Tarefa | Horas | Dependencia |
|--------|-------|-------------|
| Leitura e extracao de todos os tokens do DESIGN.md | 1h | — |
| Atualizacao do tailwind.config.ts (REQ-DS-001) | 3h | T1.1 |
| Instalacao e configuracao de fontes (REQ-DS-002) | 2h | — |
| Variaveis CSS globais em globals.css (REQ-DS-003) | 2h | T1.3 |
| Sistema de feature flag NEXT_PUBLIC_DESIGN_V2 (REQ-DS-005) | 3h | — |
| Regras ESLint para tokens de design (REQ-DS-006) | 3h | T1.2 |
| Setup de regressao visual com screenshots Playwright (REQ-DS-007) | 4h | — |
| Testes unitarios para feature flag e utilitarios de token | 2h | T1.5 |
| **Total Track 1** | **20h** | |

**Nota**: REQ-DS-004 (componentes) e responsabilidade do Track 2.

### Track 2 — dev-fullstack-2: Biblioteca de Componentes (~25h)

Responsavel pelo SPEC-PROD-047 (7 componentes).

**Dependencia de entrada**: Track 1 deve ter completado T1.1, T1.2, T1.3 antes de iniciar T2.1 (os componentes dependem dos tokens Tailwind).

| Tarefa | Horas | Dependencia |
|--------|-------|-------------|
| Button (5 variants, 3 sizes, loading, icon) | 3h | Track 1 tokens |
| Input (label, error, helper, disabled, password toggle) | 4h | Track 1 tokens |
| Card (header/body/footer, bordered/elevated) | 3h | Track 1 tokens |
| Chip (selectable, removable, colored) | 3h | Track 1 tokens |
| Badge (status, rank, PA) | 3h | Track 1 tokens |
| PhaseProgress (6 fases, 4 estados, horizontal/vertical) | 5h | Track 1 tokens |
| StepperInput (min/max/step, long-press) | 4h | Track 1 tokens |
| **Total Track 2** | **25h** | |

**Nota**: Testes unitarios (AC-018) e auditoria de acessibilidade (AC-020) estao incluidos na estimativa por componente.

### Cross-cutting (~5h)

| Tarefa | Responsavel | Horas |
|--------|-------------|-------|
| Atualizacao dos prompts dos agentes com regras de design system | tech-lead / product-owner | 2h |
| Revisao do UX Designer em todos os 7 componentes | ux-designer | 2h |
| Documento de sprint review | tech-lead | 1h |
| **Total cross-cutting** | | **5h** |

---

## Participacao Obrigatoria do UX Designer

O `ux-designer` e um participante ativo neste sprint, nao apenas um revisor final. O protocolo e:

1. **Kickoff (dia 1)**: UX Designer revisa SPEC-PROD-046 e SPEC-PROD-047, valida que as specs estao alinhadas com as telas do SCREEN-INDEX.md e os tokens do DESIGN.md
2. **Mid-sprint (dia 5-7)**: Primeira rodada de revisao dos componentes Button, Input, Card (os mais criticos e base dos demais)
3. **Final (dia 9-10)**: Revisao dos componentes restantes (Chip, Badge, PhaseProgress, StepperInput) e aprovacao final da biblioteca

O PR de cada componente NAO pode ser mergeado sem aprovacao do UX Designer.

---

## Analise de Risco

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Feature flag mal implementada altera visuais existentes | Media | Alto | AC-008, AC-019 e comparacao de screenshots de regressao sao testes de aceitacao P0 |
| Fontes Outfit/DM Sans causam reflow e quebram layouts existentes | Media | Medio | Flag desativada em producao; fontes so ativam com flag true |
| Tokens Tailwind em conflito com classes Tailwind nativas | Baixa | Alto | Usar `extend` (nunca replace) no tailwind.config.ts; teste de build obrigatorio |
| Tempo subestimado para PhaseProgress (componente mais complexo) | Alta | Medio | Estimativa de 5h ja contempla logica de 4 estados + 2 layouts + acessibilidade |
| Playwright screenshots flaky em CI (timing) | Media | Baixo | Configurar esperas adequadas; screenshots sao comparadas apenas em PRs de UI |
| UX Designer indisponivel para revisao | Baixa | Alto | Agendar revisoes com antecedencia; garantir que o UX Designer tem as specs com 48h de antecedencia |

---

## Criterios de Aceitacao do Sprint (Definition of Done)

O Sprint 38 so e considerado DONE quando:

- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa sem erros (os novos warns de ESLint sao warnings, nao errors)
- [ ] `npm run test` passa com todos os testes existentes mais os novos — nenhuma regressao
- [ ] Suite E2E: >= 120/130 testes passando (sem regressao em relacao ao v0.32.0)
- [ ] Screenshots de regressao visual: 0 diferencas com flag `false`
- [ ] Os 7 componentes existem em `src/components/ui/` com testes e cobertura >= 80%
- [ ] `docs/design/DESIGN.md` tokens estao todos representados em `tailwind.config.ts`
- [ ] Fontes Outfit e DM Sans estao instaladas e configuradas
- [ ] Variaveis CSS globais estao em `globals.css`
- [ ] Feature flag `NEXT_PUBLIC_DESIGN_V2` esta implementada e documentada
- [ ] UX Designer aprovou todos os 7 componentes
- [ ] `src/components/ui/README.md` esta escrito e completo
- [ ] Sprint review document commitado em `docs/sprint-reviews/`

---

## Proximos Sprints (contexto)

| Sprint | Tema | Dependencia de S38 |
|--------|------|---------------------|
| Sprint 39 | Migração visual — Landing Page + Dashboard | SPEC-PROD-046 + SPEC-PROD-047 completos |
| Sprint 40 | Migração visual — Wizard Phases 1-3 | Sprint 39 completo |
| Sprint 41 | Migração visual — Wizard Phases 4-6 + Summary | Sprint 40 completo |

O Sprint 38 e o sprint mais estrategico do roadmap visual. Cada hora investida aqui economiza tres horas nos Sprints 39-41.
