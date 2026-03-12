# Checklist de Adocao EDD — Atlas Travel Planner

**Documento**: ADOPTION-CHECKLIST
**Versao**: 1.1.0
**Autor**: tech-lead
**Data**: 2026-03-12
**Status**: Draft
**Referencia**: [EDD-SDD-INTEGRATION.md](./EDD-SDD-INTEGRATION.md)

---

## Visao Geral

Este checklist define as etapas praticas para adotar Eval-Driven Development (EDD) no Atlas Travel Planner, integrado ao processo SDD existente. A adocao ocorre em 4 fases ao longo dos Sprints 30-33.

Cada item tem um **dono** (agente responsavel) e **criterio de conclusao** verificavel.

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

- [ ] Todos os 13 agentes informados sobre o workflow EDD
  - **Dono**: tech-lead
  - **Criterio**: Cada agent-memory atualizado com referencia ao EDD-SDD-INTEGRATION.md

### Gate de Transicao para Fase 2

> Fase 1 esta completa quando:
> - Todos os documentos de processo acima estao commitados
> - Pelo menos 1 eval dataset tem dados reais (nao apenas placeholders)
> - Formula de trust score esta definida e aprovada pelo tech-lead
> - SDD-PROCESS.md esta atualizado com secao EDD

---

## Fase 2 — Implementacao (Sprint 30 — Em Andamento)

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

### Validacao Pendente

- [ ] Primeira execucao completa do eval suite (manual)
  - **Dono**: qa-engineer
  - **Criterio**: Todos os evals executam sem erros, resultados documentados

- [ ] Review de resultados pelo qa-engineer
  - **Dono**: qa-engineer
  - **Criterio**: Falsos positivos identificados, thresholds ajustados se necessario

---

## Fase 2 — Integracao (Sprint 31)

**Objetivo**: Graders convertidos em testes executaveis, primeiros evals rodando automaticamente.

### Conversao de Graders para Testes

- [ ] Grader `schema-validation.ts` convertido para Vitest test suite
  - **Dono**: dev-fullstack-1
  - **Criterio**: `npm run test` executa validacao de schema em outputs de AI
  - **Nota**: Integrar com testes existentes em `src/server/services/`

- [ ] Grader `i18n-completeness.ts` integrado ao `npm run test`
  - **Dono**: dev-fullstack-1
  - **Criterio**: Teste falha se chave de traducao existe em `pt` mas nao em `en` (ou vice-versa)

- [ ] Grader `token-budget.ts` integrado ao AI service
  - **Dono**: dev-fullstack-1 ou dev-fullstack-2
  - **Criterio**: `ai.service.ts` loga token count; teste verifica aderencia ao budget

- [ ] Grader `llm-judge-itinerary.ts` executavel como teste separado
  - **Dono**: dev-fullstack-1
  - **Criterio**: Pode ser executado com `npm run test:eval:itinerary` (nao roda por default — custo)

### Logging Estruturado

- [ ] Eval results logados em formato JSON estruturado
  - **Dono**: devops-engineer + dev-fullstack-1
  - **Criterio**: Cada eval produz `{ evalId, grader, score, timestamp, metadata }`

- [ ] Token usage logado por chamada de AI
  - **Dono**: dev-fullstack-1 ou dev-fullstack-2
  - **Criterio**: `ai.service.ts` emite metricas de input/output tokens

### Gate de Transicao para Fase 3

> Fase 2 esta completa quando:
> - >= 2 graders rodam como parte do `npm run test`
> - Eval results sao logados em formato estruturado
> - Nenhum grader integrado produz falsos positivos por mais de 1 sprint

---

## Fase 3 — Automacao (Sprint 32)

**Objetivo**: Trust score automatizado, CI gates ativos, evals de seguranca em todo PR.

### Trust Score Automatizado

- [ ] Script ou CI step calcula trust score por feature
  - **Dono**: qa-engineer + devops-engineer
  - **Criterio**: Trust score aparece no output do CI para cada PR

- [ ] Threshold definido: build falha se trust score < 0.8
  - **Dono**: tech-lead (aprovacao) + devops-engineer (implementacao)
  - **Criterio**: Primeiro sprint roda em modo **warning-only** (nao bloqueia)
  - **Nota**: Ajustar threshold baseado em dados reais do Sprint 31

### CI Gates

- [ ] CI pipeline inclui eval gate para schema validation
  - **Dono**: devops-engineer
  - **Criterio**: PR que quebra schema validation nao pode ser mergeado

- [ ] CI pipeline inclui eval gate para i18n completeness
  - **Dono**: devops-engineer
  - **Criterio**: PR que adiciona chave i18n sem ambos os locales nao pode ser mergeado

- [ ] Injection resistance eval roda em todo PR que toca AI code
  - **Dono**: devops-engineer + security-specialist
  - **Criterio**: Paths `src/server/services/ai*`, `src/lib/prompts/`, `src/app/api/ai/` trigger a eval

### LLM-as-Judge (Gerenciado por Custo)

- [ ] LLM-as-judge eval roda por sprint (nao por commit)
  - **Dono**: qa-engineer + finops-engineer
  - **Criterio**: Execucao manual ou scheduled, custo < $5/sprint
  - **Nota**: Usar claude-haiku-4-5-20251001 como judge para otimizar custo

### Gate de Transicao para Fase 4

> Fase 3 esta completa quando:
> - Trust score e calculado automaticamente em todo PR
> - CI gate ativo em modo blocking (nao apenas warning)
> - Zero falsos positivos no CI gate por pelo menos 2 semanas
> - Injection resistance eval roda em PRs que tocam AI

---

## Fase 4 — Producao (Sprint 33)

**Objetivo**: EDD+SDD completamente integrados, monitoring em producao, primeiro quarterly review.

### Integracao Completa

- [ ] DoR e DoD atualizados em SDD-PROCESS.md refletem EDD
  - **Dono**: tech-lead
  - **Criterio**: Nenhuma feature entra em sprint sem eval criteria (se aplicavel)

- [ ] Todos os agentes usam o workflow integrado naturalmente
  - **Dono**: tech-lead
  - **Criterio**: >= 3 features completam o ciclo completo SDD+EDD sem intervencao

### Monitoring em Producao

- [ ] Drift detection ativo para outputs de AI
  - **Dono**: devops-engineer + qa-engineer
  - **Criterio**: Alerta automatico se output quality cai abaixo do baseline

- [ ] Metricas de eval visiveis em dashboard de observabilidade
  - **Dono**: devops-engineer
  - **Criterio**: Trust scores historicos, eval pass rates, token usage trends

### Playbooks

- [ ] Auto-remediation playbooks testados
  - **Dono**: devops-engineer + qa-engineer
  - **Criterio**: Playbook documentado para: (1) eval failure em CI, (2) drift detectado, (3) trust score degradado

### Revisao

- [ ] Primeiro quarterly trust score review concluido
  - **Dono**: tech-lead + qa-engineer
  - **Criterio**: Documento com trends, acoes tomadas, ajustes de thresholds
  - **Formato**: Similar a sprint review mas focado em qualidade de evals

### Gate de Conclusao

> Fase 4 esta completa quando:
> - EDD+SDD e o processo padrao (nao uma iniciativa separada)
> - Drift detection funciona sem falsos positivos
> - Primeiro quarterly review concluido e documentado
> - Nenhum incidente de producao causado por eval gates

---

## Resumo de Esforco por Agente

| Agente | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Total Estimado |
|--------|--------|--------|--------|--------|----------------|
| tech-lead | 4h | 2h | 2h | 3h | 11h |
| architect | 8h | 1h | — | — | 9h |
| qa-engineer | 6h | 4h | 4h | 3h | 17h |
| devops-engineer | 6h | 2h | 4h | 4h | 16h |
| dev-fullstack-1 | 4h | 6h | 2h | — | 12h |
| dev-fullstack-2 | — | 2h | — | — | 2h |
| security-specialist | 2h | — | 2h | — | 4h |
| prompt-engineer | 1h | 2h | 1h | — | 4h |
| finops-engineer | 1h | 1h | 1h | 1h | 4h |
| release-manager | — | — | 1h | 1h | 2h |
| **Total** | **32h** | **20h** | **17h** | **12h** | **81h** |

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.1.0 | 2026-03-12 | tech-lead | Fase 1 marcada completa, Fase 2 Implementacao adicionada |
| 1.0.0 | 2026-03-12 | tech-lead | Checklist inicial — 4 fases de adocao |
