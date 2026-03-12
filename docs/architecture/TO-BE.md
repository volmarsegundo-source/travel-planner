# Arquitetura TO-BE — Atlas Travel Planner

**Versao**: 1.0.0
**Data**: 2026-03-12
**Autor**: architect
**Status**: Draft (visao alvo — nao implementado)
**Baseline**: AS-IS v0.22.0

---

## 1. Visao Alvo

A arquitetura TO-BE evolui o Atlas Travel Planner de um projeto com SDD maduro mas sem metricas objetivas de qualidade para um sistema com **avaliacao continua integrada** (EDD), **observabilidade de agentes**, e **gates automatizados** que previnem regressoes antes que cheguem a producao.

A premissa fundamental: **nao mudamos a stack core** (Next.js, Prisma, PostgreSQL, Redis). Evoluimos os processos de qualidade e observabilidade ao redor da stack existente.

---

## 2. Diagrama de Arquitetura Alvo

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  [Sem mudancas na camada de cliente]                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              NEXT.JS 15 APPLICATION                             │
│  [Sem mudancas na camada de aplicacao]                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Runtime Enforcement Layer (NOVO)                         │  │
│  │  - Validacao de contratos entre services                  │  │
│  │  - Observabilidade de server actions (latencia, erros)    │  │
│  │  - Metricas de rate limit por acao                        │  │
│  │  - Structured logging com trace IDs                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Service Layer, Prisma, Redis — sem mudancas estruturais]       │
└──────────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              EVAL PIPELINE (NOVO)                               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Eval Datasets                                         │  │
│  │     docs/evals/datasets/                                  │  │
│  │     - Golden sets por feature (input → expected output)   │  │
│  │     - Edge cases catalogados                              │  │
│  │     - Regression anchors (bugs ja corrigidos)             │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  2. Graders                                               │  │
│  │     docs/evals/graders/                                   │  │
│  │     - Programaticos: schema match, field validation       │  │
│  │     - LLM-as-judge: qualidade de conteudo AI              │  │
│  │     - Heuristicos: performance budgets, bundle size       │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  3. Trust Scores                                          │  │
│  │     Metrica composta por feature:                         │  │
│  │     - Test coverage (peso 25%)                            │  │
│  │     - Eval pass rate (peso 30%)                           │  │
│  │     - Spec conformance (peso 20%)                         │  │
│  │     - Security audit status (peso 15%)                    │  │
│  │     - Debt ratio (peso 10%)                               │  │
│  │     Score: 0-100 → gate: >= 70 para release               │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              CI/CD PIPELINE (EVOLUIDA)                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  GitHub Actions Workflow                                  │  │
│  │                                                           │  │
│  │  PR Opened:                                               │  │
│  │    1. Lint + TypeScript check                             │  │
│  │    2. Unit tests (Vitest)         ← gate: 0 falhas       │  │
│  │    3. Eval suite (datasets)       ← gate: pass rate >=   │  │
│  │    4. Bundle size check           ← gate: delta < 5%     │  │
│  │    5. Security scan (deps)        ← gate: 0 critical CVE │  │
│  │    6. Spec conformance check      ← gate: no drift       │  │
│  │    7. Trust score calculation     ← gate: >= 70          │  │
│  │                                                           │  │
│  │  Merge to main:                                           │  │
│  │    8. E2E tests (Playwright)      ← gate: critical paths │  │
│  │    9. Build + deploy staging                              │  │
│  │   10. Smoke tests staging                                 │  │
│  │   11. Deploy production (canary)                          │  │
│  │   12. Post-deploy eval (drift detection)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              AGENT REGISTRY + OBSERVABILITY (NOVO)              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Agent Registry (docs/process/AGENT-REGISTRY.md)          │  │
│  │  - 13 agentes com versao, bounded context, permissoes     │  │
│  │  - Audit trail: quem mudou o que, quando                  │  │
│  │  - Dependency matrix entre agentes                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Observability Dashboard                                  │  │
│  │  - Metricas de sprint: velocity, debt ratio, trust score  │  │
│  │  - Metricas de AI: token usage, cache hit rate, latencia  │  │
│  │  - Metricas de qualidade: test count, coverage, eval rate │  │
│  │  - Alertas: spec drift, trust score drop, cost spike      │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Componentes Novos (Delta AS-IS → TO-BE)

### 3.1 Eval Pipeline

**O que e**: um sistema de avaliacao continua que mede a qualidade de cada feature de forma objetiva e repetivel.

**Componentes**:

| Componente | Localizacao | Descricao |
|------------|-------------|-----------|
| Eval Datasets | `docs/evals/datasets/` | Conjuntos de dados de teste por feature (golden sets, edge cases, regression anchors) |
| Graders | `docs/evals/graders/` | Funcoes de avaliacao — programaticas (schema match) e LLM-as-judge (qualidade de conteudo) |
| Trust Scores | `docs/evals/scores/` | Pontuacao composta por feature, calculada automaticamente |
| Eval Reports | `docs/evals/reports/` | Relatorios historicos por sprint |
| Eval Config | `docs/evals/eval-config.yaml` | Configuracao de thresholds, pesos, gates |

**Tipos de eval**:

| Tipo | Grader | Quando Executa | Exemplo |
|------|--------|----------------|---------|
| Schema Eval | Programatico | CI (todo PR) | Resposta do AI segue o schema Zod esperado |
| Content Eval | LLM-as-judge | CI (PRs com mudanca AI) | Qualidade do roteiro gerado (relevancia, completude) |
| Performance Eval | Heuristico | CI (todo PR) | Server Action responde em < 200ms (p95) |
| Conformance Eval | Programatico | CI (todo PR) | Codigo implementado corresponde ao spec aprovado |
| Security Eval | Programatico | CI (todo PR) | Zero CVEs criticas, BOLA check presente |
| Regression Eval | Programatico | CI (todo PR) | Bugs previamente corrigidos continuam corrigidos |

### 3.2 Trust Scores

**O que e**: uma metrica composta (0-100) que quantifica a confianca da equipe em uma feature estar pronta para producao.

**Formula**:

```
TrustScore = (TestCoverage * 0.25) +
             (EvalPassRate * 0.30) +
             (SpecConformance * 0.20) +
             (SecurityAudit * 0.15) +
             (DebtRatio * 0.10)
```

| Componente | Peso | Calculo |
|------------|------|---------|
| Test Coverage | 25% | % de linhas cobertas por testes unitarios na feature |
| Eval Pass Rate | 30% | % de evals que passam no dataset da feature |
| Spec Conformance | 20% | % de ACs do spec que correspondem ao codigo |
| Security Audit | 15% | 100 se auditado e aprovado, 0 se pendente |
| Debt Ratio | 10% | 100 - (dividas tecnicas abertas / total linhas * 100) |

**Gates**:

| Score | Significado | Acao |
|-------|-------------|------|
| >= 90 | Alta confianca | Release automatico permitido |
| 70-89 | Confianca aceitavel | Release com aprovacao do tech-lead |
| 50-69 | Confianca baixa | Release bloqueado — requer remediacao |
| < 50 | Confianca critica | Feature revertida ou pausada |

### 3.3 Runtime Enforcement Layer

**O que e**: uma camada de observabilidade e validacao que opera em runtime, coletando metricas e detectando anomalias.

**Implementacao pragmatica** (sem complexidade adicional):

- Structured logging com campos padronizados (action, userId, duration, status)
- Metricas de server action expostas via API interna `/api/v1/metrics` (nao publico)
- Alertas de anomalia baseados em thresholds configurados (latencia, taxa de erro)
- Nao requer nova infraestrutura — usa logs existentes + Redis counters

### 3.4 Agent Registry

**O que e**: um documento vivo que funciona como registro formal de todos os agentes, suas versoes, permissoes e dependencias.

**Conteudo**:

| Campo | Descricao |
|-------|-----------|
| ID | Identificador unico do agente |
| Versao | Versao do agente (alinhada ao sprint de ultima mudanca) |
| Bounded Context | Area de responsabilidade |
| Inputs | O que o agente recebe (specs, reviews, tasks) |
| Outputs | O que o agente produz (specs, codigo, reports) |
| Dependencias | Agentes dos quais depende |
| Dependentes | Agentes que dependem dele |
| Ferramentas | Tools permitidas (Read, Write, Bash, etc.) |
| Memory | Localizacao do agent-memory |

### 3.5 Observability Dashboard

**O que e**: uma visao consolidada das metricas de saude do projeto, atualizada a cada sprint.

**Implementacao pragmatica**: documento Markdown atualizado pelo tech-lead ao final de cada sprint (nao requer tooling externo no MVP).

**Metricas rastreadas**:

| Categoria | Metricas |
|-----------|----------|
| Qualidade | Testes total, coverage %, eval pass rate, spec conformance |
| Velocidade | Features entregues, story points, cycle time |
| Divida | Debt items abertos por prioridade, debt ratio |
| Custo | Token usage (AI), infra cost, cost per feature |
| Seguranca | CVEs abertas, security reviews completas, BOLA checks |

---

## 4. Evolucao Incremental (Roadmap)

A transicao de AS-IS para TO-BE e incremental. Nao ha big-bang.

### Fase 1: Fundacao (Sprint 30-31)

| Entrega | Descricao | Esforco |
|---------|-----------|---------|
| Genesis Spec | Documento fundacional do projeto | 4h (feito) |
| AS-IS / TO-BE | Documentos de arquitetura | 6h (feito) |
| EDD Process Doc | Framework de avaliacao | 4h |
| SDD Secao 11 | Integracao EDD no SDD | 2h (feito) |
| Eval Config | Configuracao inicial de thresholds | 2h |

### Fase 2: Primeiros Evals (Sprint 32-33)

| Entrega | Descricao | Esforco |
|---------|-----------|---------|
| Golden Sets | Datasets para AI features (roteiro, checklist, guia) | 8h |
| Schema Graders | Validacao automatica de respostas AI | 4h |
| Conformance Checker | Script que compara ACs do spec com implementacao | 8h |
| Trust Score v1 | Calculo basico (test coverage + eval pass rate) | 4h |

### Fase 3: CI Integration (Sprint 34-35)

| Entrega | Descricao | Esforco |
|---------|-----------|---------|
| Eval Gate em CI | GitHub Action que roda evals no PR | 8h |
| Trust Score Gate | Bloqueia merge se score < 70 | 4h |
| Spec Drift Detection | Automatiza deteccao de divergencia spec/codigo | 8h |
| Agent Registry v1 | Documento formal de agentes | 4h |

### Fase 4: Observabilidade (Sprint 36+)

| Entrega | Descricao | Esforco |
|---------|-----------|---------|
| Runtime Metrics | Structured logging + metricas de server action | 8h |
| Sprint Dashboard | Markdown dashboard atualizado automaticamente | 4h |
| LLM-as-Judge | Grader de qualidade para conteudo AI | 8h |
| Drift Detection Prod | Pos-deploy eval contra golden sets | 8h |

---

## 5. Principios da Evolucao

### Principio 1: Incrementalismo

Nenhuma mudanca TO-BE requer big-bang. Cada componente e adicionado incrementalmente, validado, e so entao integrado ao fluxo principal.

### Principio 2: Zero Overhead no Happy Path

Evals e gates NAO devem adicionar mais de 2 minutos ao tempo de CI para PRs pequenos. O overhead deve ser proporcional ao escopo da mudanca.

### Principio 3: Processo e Documentacao Antes de Tooling

Antes de construir ferramentas automatizadas, os processos devem funcionar manualmente. Automatizacao vem depois da validacao do processo.

### Principio 4: Nao Mudar o que Funciona

A stack core (Next.js, Prisma, PostgreSQL, Redis, Auth.js) NAO muda. Evals e observabilidade sao adicionados ao redor, nao no meio.

### Principio 5: Medir Antes de Otimizar

Trust scores e metricas existem para informar decisoes, nao para punir equipes. Um score baixo e um sinal para investir, nao para culpar.

---

## 6. Riscos da Transicao

| Risco | Severidade | Probabilidade | Mitigacao |
|-------|-----------|---------------|-----------|
| Overhead de processo reduz velocidade de entrega | Alto | Medio | Fase incremental; medir velocity pre/pos EDD |
| Evals de AI sao flaky (nao-deterministicos) | Medio | Alto | Usar graders programaticos onde possivel; LLM-as-judge com threshold de concordancia |
| Trust scores viram metricas de vaidade | Medio | Medio | Revisao trimestral dos pesos; correlacionar com bugs reais em producao |
| Equipe resiste a mais processo | Alto | Baixo | Demonstrar valor com quick wins (primeiros evals pegam bugs reais) |
| Manutenção de eval datasets vira debt | Medio | Alto | Ownership claro: qa-engineer mantem datasets; revisao por sprint |

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | architect | Visao TO-BE inicial |
