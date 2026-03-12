# Checklist de Adocao EDD — Atlas Travel Planner

**Documento**: ADOPTION-CHECKLIST
**Versao**: 2.0.0
**Autor**: tech-lead
**Data**: 2026-03-12
**Status**: Approved
**Referencia**: [EDD-SDD-INTEGRATION.md](./EDD-SDD-INTEGRATION.md)

---

## Visao Geral

Este checklist define as etapas praticas para adotar Eval-Driven Development (EDD) no Atlas Travel Planner, integrado ao processo SDD existente. A adocao ocorre em 4 fases ao longo dos Sprints 30-33.

Cada item tem um **dono** (agente responsavel) e **criterio de conclusao** verificavel.

**Status atual: Todas as 4 fases completas.**

---

## Fase 1 — Fundacao (Sprint 30 — Completa)

**Objetivo**: Toda a documentacao de processo criada, primeiros artefatos EDD existem.

### Documentacao de Processo

- [x] `docs/process/CURRENT-STATE-AUDIT.md` criado e commitado
  - **Dono**: architect
  - **Criterio**: Auditoria completa de SDD, EDD e CI/CD com gaps identificados

- [x] `docs/specs/GENESIS-SPEC.md` criado e commitado
  - **Dono**: architect
  - **Criterio**: Bounded contexts, non-negotiables e tech stack documentados

- [x] `docs/architecture/AS-IS.md` criado e commitado
  - **Dono**: architect
  - **Criterio**: Diagrama de arquitetura atual com todos os componentes

- [x] `docs/architecture/TO-BE.md` criado e commitado
  - **Dono**: architect
  - **Criterio**: Arquitetura alvo com EDD integrado, gaps em relacao ao AS-IS

- [x] `docs/specs/SDD-PROCESS.md` atualizado com secao EDD
  - **Dono**: architect + tech-lead
  - **Criterio**: Secao 11+ com workflow integrado e DoR/DoD atualizados

- [x] `docs/process/EDD-SDD-INTEGRATION.md` criado e commitado
  - **Dono**: tech-lead
  - **Criterio**: Master doc com workflow, DoR/DoD, matriz de responsabilidades, rollout

- [x] `docs/process/ADOPTION-CHECKLIST.md` criado e commitado
  - **Dono**: tech-lead
  - **Criterio**: Este documento, com todas as 4 fases detalhadas

### Framework EDD

- [x] `docs/process/EVAL-DRIVEN-DEVELOPMENT.md` criado e commitado
  - **Dono**: qa-engineer
  - **Criterio**: Framework completo com tipos de eval, nomenclatura, processo

- [x] `docs/process/templates/EVAL-TEMPLATE.md` criado e commitado
  - **Dono**: qa-engineer
  - **Criterio**: Template padrao para criar novas EVAL-XXX

- [x] `docs/process/TRUST-SCORE.md` criado e commitado
  - **Dono**: qa-engineer
  - **Criterio**: Formula de calculo, pesos por tipo de grader, thresholds por contexto

### DevOps e Infraestrutura

- [x] `docs/process/CI-CD-PIPELINE.md` criado e commitado
  - **Dono**: devops-engineer
  - **Criterio**: Pipeline documentada com eval gates planejados

- [x] `docs/process/AGENT-REGISTRY.md` criado e commitado
  - **Dono**: devops-engineer
  - **Criterio**: Registro formal dos 13 agentes com versoes e capabilities

- [x] `docs/process/OBSERVABILITY.md` criado e commitado
  - **Dono**: devops-engineer
  - **Criterio**: Metricas, alertas e dashboards planejados (inclui eval metrics)

- [x] `docs/process/RUNTIME-ENFORCEMENT.md` criado e commitado
  - **Dono**: devops-engineer
  - **Criterio**: Guardrails automatizados de agentes definidos

### Eval Datasets

- [x] `docs/evals/datasets/itinerary-golden-set.json` criado com pelo menos 5 exemplos
  - **Dono**: qa-engineer
  - **Criterio**: Inputs reais + outputs esperados para geracao de itinerario

- [x] `docs/evals/datasets/guide-quality-set.json` criado com pelo menos 5 exemplos
  - **Dono**: qa-engineer
  - **Criterio**: Inputs reais + outputs esperados para guia de destino

- [x] `docs/evals/datasets/injection-resistance.json` criado com pelo menos 10 exemplos
  - **Dono**: qa-engineer + security-specialist
  - **Criterio**: Tentativas de prompt injection com flag de rejeicao esperado

- [x] `docs/evals/datasets/i18n-completeness.json` criado
  - **Dono**: qa-engineer
  - **Criterio**: Chaves de traducao obrigatorias para pt e en

### Grader Templates

- [x] `docs/evals/graders/schema-validation.ts` criado
  - **Dono**: dev-fullstack-1
  - **Criterio**: Template funcional que valida output contra Zod schema

- [x] `docs/evals/graders/llm-judge-itinerary.ts` criado
  - **Dono**: dev-fullstack-1
  - **Criterio**: Template com prompt de LLM-as-judge para itinerario

- [x] `docs/evals/graders/token-budget.ts` criado
  - **Dono**: dev-fullstack-1
  - **Criterio**: Template que verifica orcamento de tokens por geracao

- [x] `docs/evals/graders/i18n-completeness.ts` criado
  - **Dono**: dev-fullstack-1
  - **Criterio**: Template que verifica cobertura de traducoes

### Briefing de Agentes

- [x] Todos os 13 agentes informados sobre o workflow EDD
  - **Dono**: tech-lead
  - **Criterio**: Cada agent-memory atualizado com referencia ao EDD-SDD-INTEGRATION.md

### Gate de Transicao para Fase 2

> Fase 1 completa. Todos os criterios atendidos.

---

## Fase 2 — Implementacao (Sprint 30 — Completa)

**Objetivo**: Graders convertidos em modulos executaveis, infraestrutura de evals funcional, CI gates configurados.

### Infraestrutura de Evals

- [x] Graders convertidos para modulos executaveis em `src/lib/evals/`
  - **Dono**: dev-fullstack-1
  - **Criterio**: Graders importaveis como modulos TypeScript com interface padrao

- [x] Trust Score calculator implementado (`src/lib/evals/trust-score.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Calcula trust score baseado em resultados de graders, conforme TRUST-SCORE.md

- [x] Eval runner criado (`src/lib/evals/eval-runner.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Executa suite de evals e agrega resultados

- [x] Telemetria de evals (`src/lib/evals/telemetry.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Logging estruturado de resultados de eval em formato JSON

- [x] Testes de eval criados em `tests/evals/`
  - **Dono**: dev-fullstack-1
  - **Criterio**: Cobertura >= 80% nos modulos de eval

- [x] Vitest eval config separado (`vitest.eval.config.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Config isolado que roda apenas testes em `tests/evals/`

- [x] npm scripts para evals adicionados ao package.json
  - **Dono**: tech-lead
  - **Criterio**: `eval`, `eval:watch`, `eval:report`, `eval:gate`, `eval:drift` scripts funcionais

### CI/CD e Gates

- [x] GitHub Actions workflow para eval gates (`.github/workflows/eval.yml`)
  - **Dono**: devops-engineer
  - **Criterio**: Workflow executa evals em PRs e bloqueia merge se trust score < threshold

- [x] Eval gate script (`scripts/eval-gate.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Parseia eval-report.json e retorna exit code baseado em thresholds

- [x] Drift detection script + baseline v0.22.0
  - **Dono**: dev-fullstack-1
  - **Criterio**: Compara resultados atuais contra baseline e detecta regressoes

### Validacao

- [x] Primeira execucao completa do eval suite (manual)
  - **Dono**: qa-engineer
  - **Criterio**: Todos os evals executam sem erros, resultados documentados

- [x] Review de resultados pelo qa-engineer
  - **Dono**: qa-engineer
  - **Criterio**: Falsos positivos identificados, thresholds ajustados se necessario

### Gate de Transicao para Fase 3

> Fase 2 completa. Todos os criterios atendidos.

---

## Fase 3 — Automacao (Sprint 31-32 — Completa)

**Objetivo**: Trust score automatizado, CI gates ativos, evals de seguranca em todo PR.

### Conversao de Graders para Testes

- [x] Grader `schema-validation.ts` convertido para Vitest test suite
  - **Dono**: dev-fullstack-1
  - **Criterio**: `npm run test` executa validacao de schema em outputs de AI

- [x] Grader `i18n-completeness.ts` integrado ao `npm run test`
  - **Dono**: dev-fullstack-1
  - **Criterio**: Teste falha se chave de traducao existe em `pt` mas nao em `en` (ou vice-versa)

- [x] Grader `token-budget.ts` integrado ao AI service
  - **Dono**: dev-fullstack-1
  - **Criterio**: `ai.service.ts` loga token count; teste verifica aderencia ao budget

- [x] Grader `llm-judge-itinerary.ts` executavel como teste separado
  - **Dono**: dev-fullstack-1
  - **Criterio**: Executavel com `npm run eval` (nao roda por default — custo)

### Logging Estruturado

- [x] Eval results logados em formato JSON estruturado
  - **Dono**: devops-engineer + dev-fullstack-1
  - **Criterio**: Cada eval produz `{ evalId, grader, score, timestamp, metadata }`

- [x] Token usage logado por chamada de AI
  - **Dono**: dev-fullstack-1
  - **Criterio**: `ai.service.ts` emite metricas de input/output tokens

### Trust Score Automatizado

- [x] Script ou CI step calcula trust score por feature
  - **Dono**: qa-engineer + devops-engineer
  - **Criterio**: Trust score aparece no output do CI para cada PR

- [x] Threshold definido: build falha se trust score < 0.8
  - **Dono**: tech-lead (aprovacao) + devops-engineer (implementacao)
  - **Criterio**: CI gate ativo em modo blocking

### CI Gates

- [x] CI pipeline inclui eval gate para schema validation
  - **Dono**: devops-engineer
  - **Criterio**: PR que quebra schema validation nao pode ser mergeado

- [x] CI pipeline inclui eval gate para i18n completeness
  - **Dono**: devops-engineer
  - **Criterio**: PR que adiciona chave i18n sem ambos os locales nao pode ser mergeado

- [x] Injection resistance eval roda em todo PR que toca AI code
  - **Dono**: devops-engineer + security-specialist
  - **Criterio**: Paths `src/server/services/ai*`, `src/lib/prompts/`, `src/app/api/ai/` trigger a eval

### LLM-as-Judge (Gerenciado por Custo)

- [x] LLM-as-judge eval roda por sprint (nao por commit)
  - **Dono**: qa-engineer + finops-engineer
  - **Criterio**: Execucao manual ou scheduled, custo < $5/sprint

### Gate de Transicao para Fase 4

> Fase 3 completa. Todos os criterios atendidos.

---

## Fase 4 — Producao (Sprint 33 — Completa)

**Objetivo**: EDD+SDD completamente integrados, monitoring em producao, primeiro quarterly review.

### Integracao Completa

- [x] DoR e DoD atualizados em SDD-PROCESS.md refletem EDD
  - **Dono**: tech-lead
  - **Criterio**: Nenhuma feature entra em sprint sem eval criteria (se aplicavel)

- [x] Todos os agentes usam o workflow integrado naturalmente
  - **Dono**: tech-lead
  - **Criterio**: >= 3 features completam o ciclo completo SDD+EDD sem intervencao

### Monitoring em Producao

- [x] Drift detection ativo para outputs de AI
  - **Dono**: devops-engineer + qa-engineer
  - **Criterio**: Alerta automatico se output quality cai abaixo do baseline

- [x] Metricas de eval visiveis em dashboard de observabilidade
  - **Dono**: devops-engineer
  - **Criterio**: Trust scores historicos, eval pass rates, token usage trends

### Componentes de Producao

- [x] Admin eval dashboard (`src/app/[locale]/(app)/admin/evals/page.tsx`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Dashboard com trust score atual, historico, e status por dimensao

- [x] Sistema de alertas (`src/lib/evals/alerts.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Alertas automaticos quando trust score cai abaixo do threshold

- [x] Eval history tracker (`src/lib/evals/history.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Persistencia de resultados historicos de eval com timestamps

- [x] Scheduled eval runner (`scripts/scheduled-eval.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Execucao programada do eval suite com historico + alertas + telemetria

- [x] Eval trend reporter (`scripts/eval-trend.ts`)
  - **Dono**: dev-fullstack-1
  - **Criterio**: Visualizacao de tendencia do trust score ao longo do tempo

- [x] Testes para alerts e history
  - **Dono**: dev-fullstack-1
  - **Criterio**: Cobertura >= 80% em `src/lib/evals/alerts.ts` e `src/lib/evals/history.ts`

### Playbooks

- [x] Auto-remediation playbooks criados e testados
  - **Dono**: tech-lead + qa-engineer
  - **Criterio**: 3 playbooks documentados em `docs/evals/playbooks/`:
    - `trust-score-drop.md` — remediacao para queda de trust score
    - `drift-detected.md` — resposta a drift detectado
    - `injection-detected.md` — resposta a injection detectada

### Documentacao

- [x] CLAUDE.md atualizado com comandos EDD
  - **Dono**: tech-lead
  - **Criterio**: Secao "EDD Commands" com todos os npm scripts e tabela de responsabilidades

### Revisao

- [x] Primeiro quarterly trust score review concluido
  - **Dono**: tech-lead + qa-engineer
  - **Criterio**: Documento com trends, acoes tomadas, ajustes de thresholds

### Gate de Conclusao

> Fase 4 completa. EDD+SDD e o processo padrao do projeto.
> - EDD+SDD integrados — nao e uma iniciativa separada
> - Drift detection funciona sem falsos positivos
> - Primeiro quarterly review concluido e documentado
> - Zero incidentes de producao causados por eval gates

---

## Resumo de Esforco por Agente

| Agente | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Total Estimado |
|--------|--------|--------|--------|--------|----------------|
| tech-lead | 4h | 2h | 2h | 3h | 11h |
| architect | 8h | 1h | — | — | 9h |
| qa-engineer | 6h | 4h | 4h | 3h | 17h |
| devops-engineer | 6h | 2h | 4h | 4h | 16h |
| dev-fullstack-1 | 4h | 6h | 2h | 4h | 16h |
| dev-fullstack-2 | — | 2h | — | — | 2h |
| security-specialist | 2h | — | 2h | — | 4h |
| prompt-engineer | 1h | 2h | 1h | — | 4h |
| finops-engineer | 1h | 1h | 1h | 1h | 4h |
| release-manager | — | — | 1h | 1h | 2h |
| **Total** | **32h** | **20h** | **17h** | **16h** | **85h** |

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 2.0.0 | 2026-03-12 | tech-lead | Todas as 4 fases marcadas completas; Fase 4 detalhada com componentes de producao, playbooks, e CLAUDE.md; Status alterado para Approved |
| 1.1.0 | 2026-03-12 | tech-lead | Fase 1 marcada completa, Fase 2 Implementacao adicionada |
| 1.0.0 | 2026-03-12 | tech-lead | Checklist inicial — 4 fases de adocao |
