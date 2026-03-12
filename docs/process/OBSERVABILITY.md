# Observabilidade — Processo de Desenvolvimento com Agentes

**Documento**: PROC-OBS-001
**Autor**: devops-engineer
**Data**: 2026-03-12
**Versao**: 1.0.0
**Status**: Draft — EDD+SDD Integration

---

## 1. Visao Geral

Este documento define a estrategia de observabilidade para o processo de desenvolvimento orientado por agentes do Atlas Travel Planner. Enquanto `docs/infrastructure.md` define observabilidade da aplicacao em runtime (logs, Sentry, health checks), este documento foca em observabilidade do pipeline de desenvolvimento:

- Eval scores por build
- Metadados de raciocinio (provenance)
- Deteccao de drift entre spec e codigo
- Alertas de qualidade e custo
- Dashboards de metricas de processo

---

## 2. Formato de Log Estruturado para Agentes

Todos os eventos de agentes devem seguir o formato JSON abaixo. Este formato complementa o log de aplicacao definido em `docs/infrastructure.md` mas e especifico para o processo de desenvolvimento.

### Schema do log

```json
{
  "timestamp": "2026-03-12T14:30:00.000Z",
  "level": "info",
  "agent": "agent:devops-engineer",
  "action": "eval.trust-score.calculated",
  "spec_ref": "SPEC-ARCH-015",
  "eval_score": 0.85,
  "token_count": 1500,
  "cost_usd": 0.0045,
  "duration_ms": 3200,
  "provenance": {
    "parent_agent": "agent:tech-lead",
    "task_id": "TASK-29-001",
    "sprint": 29,
    "trigger": "ci-pipeline"
  },
  "metadata": {
    "build_id": "sha-abc123",
    "branch": "feat/expedition-summary",
    "pipeline_stage": "eval-trust-score"
  }
}
```

### Campos obrigatorios

| Campo | Tipo | Descricao | Exemplo |
|-------|------|-----------|---------|
| `timestamp` | ISO-8601 | Momento exato do evento | `2026-03-12T14:30:00.000Z` |
| `level` | enum | Severidade: `info`, `warn`, `error` | `info` |
| `agent` | string | ID do agente que gerou o evento | `agent:devops-engineer` |
| `action` | string | Tipo de acao em formato dot-notation | `eval.schema.validated` |

### Campos opcionais (mas recomendados)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `spec_ref` | string | ID do spec SDD relacionado |
| `eval_score` | float | Score de avaliacao (0.0-1.0) |
| `token_count` | integer | Tokens consumidos na operacao |
| `cost_usd` | float | Custo estimado da operacao |
| `duration_ms` | integer | Duracao da operacao em millisegundos |
| `provenance` | object | Rastreabilidade de quem iniciou a acao |

### Campos PROIBIDOS (nunca incluir em logs de agente)

- Conteudo de `.env.local` ou qualquer secret
- Conteudo completo de arquivos (apenas paths)
- PII de usuarios (emails, nomes, senhas)
- Tokens de API ou session tokens
- Output bruto de modelos de IA (pode conter PII gerada)

### Taxonomia de acoes

```
# Pipeline events
pipeline.started
pipeline.stage.completed
pipeline.stage.failed
pipeline.completed
pipeline.rollback.triggered

# Eval events
eval.schema.validated
eval.schema.failed
eval.i18n.checked
eval.i18n.missing-keys
eval.security.scan.completed
eval.security.pii-detected
eval.trust-score.calculated
eval.trust-score.below-threshold

# Agent events
agent.task.started
agent.task.completed
agent.task.failed
agent.bounded-context.violation
agent.memory.updated

# Deploy events
deploy.staging.started
deploy.staging.completed
deploy.staging.rollback
deploy.production.started
deploy.production.completed
deploy.production.rollback
deploy.canary.promoted
deploy.canary.reverted

# Spec events
spec.created
spec.updated
spec.drift.detected
spec.conformance.checked

# Cost events
cost.token.consumed
cost.budget.threshold-reached
cost.budget.exceeded
cost.sprint.report-generated
```

---

## 3. Emissao de Eval Score por Build

Cada execucao do pipeline CI emite um registro de eval scores que e persistido para analise de tendencias.

### Formato de emissao

```json
{
  "timestamp": "2026-03-12T14:35:00.000Z",
  "build_id": "sha-abc123",
  "branch": "feat/expedition-summary",
  "pr_number": 26,
  "sprint": 29,
  "trust_score": 0.87,
  "breakdown": {
    "schema_validation": 1.0,
    "i18n_completeness": 0.95,
    "security_scan": 1.0,
    "test_coverage": 0.82,
    "build_success": 1.0,
    "spec_conformance": 0.70
  },
  "test_metrics": {
    "total_tests": 1776,
    "tests_passed": 1776,
    "tests_failed": 0,
    "coverage_lines_pct": 82.5,
    "coverage_branches_pct": 78.3,
    "duration_ms": 45000
  },
  "cost_metrics": {
    "eval_tokens_consumed": 0,
    "eval_cost_usd": 0.00,
    "ci_minutes_consumed": 22
  },
  "eligible": {
    "staging": true,
    "production": false
  }
}
```

### Armazenamento

Os eval scores sao armazenados como:

1. **GitHub Actions artifacts** — retencao de 30 dias por run
2. **Git commit metadata** — trust score anotado como check status no PR
3. **Arquivo de historico local** — `docs/process/eval-history.jsonl` (append-only, um JSON por linha)

### Frequencia de emissao

| Evento | Quando |
|--------|--------|
| Eval score por build | Cada push em PR |
| Trust score consolidado | Cada merge em master |
| Sprint summary | Final de cada sprint |

---

## 4. Captura de Metadados de Raciocinio (Provenance)

Provenance rastreia a cadeia de decisoes que levou a uma acao. Isso e essencial para:

- Entender POR QUE uma decisao foi tomada
- Identificar quais specs informaram quais implementacoes
- Auditar a cadeia de aprovacao de uma feature

### Schema de provenance

```json
{
  "provenance": {
    "parent_agent": "agent:tech-lead",
    "task_id": "TASK-29-001",
    "sprint": 29,
    "trigger": "user-request",
    "decision_chain": [
      {
        "agent": "agent:product-owner",
        "action": "spec.created",
        "spec_ref": "SPEC-PROD-042",
        "timestamp": "2026-03-10T10:00:00Z"
      },
      {
        "agent": "agent:architect",
        "action": "spec.created",
        "spec_ref": "SPEC-ARCH-015",
        "timestamp": "2026-03-10T14:00:00Z"
      },
      {
        "agent": "agent:tech-lead",
        "action": "agent.task.started",
        "assigned_to": "agent:dev-fullstack-1",
        "timestamp": "2026-03-11T09:00:00Z"
      }
    ]
  }
}
```

### Quando capturar provenance

| Situacao | Provenance obrigatorio |
|---------|----------------------|
| Feature implementada | Sim — spec chain completa |
| Bug fix | Sim — referencia ao bug report e spec afetado |
| Hotfix | Sim — referencia ao incidente e aprovadores |
| Refatoracao | Sim — referencia ao ADR ou spec que motivou |
| Documentacao | Nao — provenance opcional |
| Chore (deps, config) | Nao — provenance opcional |

---

## 5. Deteccao de Drift (Spec vs Codigo)

Drift e quando o codigo implementado diverge da spec aprovada. No SDD, drift e tratado como bug P0.

### Tipos de drift

| Tipo | Descricao | Deteccao | Severidade |
|------|-----------|----------|-----------|
| **Schema drift** | Zod schema no codigo difere do schema na spec | Comparacao automatica no CI | P0 |
| **API drift** | Endpoint implementado difere do contrato na spec | Contract testing | P0 |
| **Behavior drift** | Logica implementada difere dos acceptance criteria | QA audit manual | P1 |
| **Config drift** | Env vars, thresholds, ou limites diferem da spec | Config scan no CI | P1 |
| **i18n drift** | Textos no UI diferem dos especificados no UX spec | i18n check + visual review | P2 |

### Triggers de deteccao automatica

```yaml
# Drift detection runs
trigger: on every PR to master

checks:
  # 1. Schema drift
  - name: schema-drift-check
    description: |
      Compara schemas Zod em src/lib/validations/ com
      schemas documentados em docs/specs/SPEC-ARCH-*/
    action: |
      Para cada spec SPEC-ARCH-* que define um schema:
        1. Extrai schema esperado da spec
        2. Compara com schema implementado no codigo
        3. Reporta diferencas (campos extras, tipos divergentes, constraints diferentes)
    fail-on: any schema mismatch
    alert: P0 — notifica architect + tech-lead

  # 2. API drift
  - name: api-drift-check
    description: |
      Compara endpoints implementados em src/app/api/
      com contratos definidos em docs/api.md
    action: |
      Para cada endpoint documentado:
        1. Verifica que a rota existe
        2. Verifica HTTP methods suportados
        3. Verifica response shape
    fail-on: endpoint missing OR shape mismatch
    alert: P0 — notifica architect + tech-lead

  # 3. Config drift
  - name: config-drift-check
    description: |
      Compara env vars em .env.example e src/lib/env.ts
      com vars documentadas em specs
    action: |
      1. Lista todas as vars em env.ts
      2. Verifica que cada var esta documentada em .env.example
      3. Verifica que thresholds (rate limits, timeouts) matcham specs
    fail-on: undocumented env var OR threshold mismatch
    alert: P1 — notifica devops-engineer
```

### Workflow de resolucao de drift

```
Drift detectado
    |
    v
[CI bloqueia merge]
    |
    v
[Notificacao para agent responsavel]
    |
    +---> Codigo esta errado --> dev-fullstack corrige codigo
    |
    +---> Spec esta desatualizada --> architect atualiza spec
    |
    +---> Decisao intencional --> architect cria ADR justificando divergencia
    |
    v
[Drift resolvido]
    |
    v
[CI re-executa e aprova]
```

---

## 6. Thresholds de Alerta

### Alertas de qualidade (pipeline)

| Metrica | Threshold | Severidade | Canal | Acao |
|---------|-----------|-----------|-------|------|
| Trust score < 0.80 | Qualquer build | P1 | Slack #alerts | Bloqueia merge |
| Trust score < 0.90 em master | Qualquer merge | P0 | Slack #incidents | Bloqueia deploy prod |
| Test count regression | tests < base_branch | P1 | Slack #alerts | Bloqueia merge |
| Coverage < 80% | Qualquer build | P1 | Slack #alerts | Bloqueia merge |
| Build failure em master | Qualquer | P0 | Slack #incidents | Investigacao imediata |
| Schema drift detectado | Qualquer PR | P0 | Slack #incidents | Bloqueia merge |

### Alertas de custo (finops)

| Metrica | Threshold | Severidade | Canal | Acao |
|---------|-----------|-----------|-------|------|
| Tokens IA por sprint | > $5,00 (eval gates) | P2 | Slack #finops | Notifica finops-engineer |
| CI minutes por sprint | > 500 min | P2 | Slack #finops | Investigar pipeline lento |
| Upstash ops | > 210k/mes (70% free tier) | P1 | Slack #alerts | Provisionar plano pago |
| Railway custo | > $10/mes | P2 | Slack #finops | Revisar queries e conexoes |

### Alertas de runtime (producao)

Definidos em `docs/infrastructure.md`. Resumo:

| Metrica | Threshold | Severidade |
|---------|-----------|-----------|
| Error rate > 5% | 5 minutos | P0 — page on-call |
| Latencia P95 > 3s | 5 minutos | P1 — Slack #incidents |
| Health check 503 | 3 checks consecutivos | P0 — rollback automatico |
| Sentry error spike | > 5 erros/min na mesma rota | P1 — Slack #incidents |

---

## 7. Playbooks de Auto-Remediacao

### Playbook 1: Trust Score Abaixo do Threshold

```
TRIGGER: trust_score < 0.80 em PR

DIAGNOSTICO AUTOMATICO:
  1. Identificar componente com menor score no breakdown
  2. Se schema_validation < 1.0:
     → Listar schemas que falharam
     → Sugerir correcao (campo faltante, tipo errado)
  3. Se i18n_completeness < 1.0:
     → Listar chaves faltantes
     → Sugerir: npm run i18n:sync
  4. Se security_scan < 1.0:
     → Listar findings do Semgrep
     → Classificar por severidade
  5. Se test_coverage < 0.80:
     → Listar arquivos sem cobertura
     → Sugerir: adicionar testes para arquivos novos/modificados
  6. Se spec_conformance < 0.70:
     → Listar commits sem spec reference
     → Sugerir: adicionar spec ID ao commit message

ACAO AUTOMATICA:
  - Comentar no PR com diagnostico detalhado
  - Sugerir comandos de correcao
  - Nao bloquear se todos os componentes individuais > 0.60

ESCALACAO:
  - Se trust score < 0.60: notificar tech-lead diretamente
  - Se trust score < 0.40: bloquear PR + notificar architect
```

### Playbook 2: Test Count Regression

```
TRIGGER: test_count < base_branch_test_count

DIAGNOSTICO AUTOMATICO:
  1. Calcular delta: quantos testes foram removidos
  2. Identificar arquivos de teste modificados/deletados
  3. Verificar se ha justificativa no PR description

ACAO AUTOMATICA:
  - Se delta <= 3 E PR description menciona "refactor" ou "consolidate":
    → WARNING apenas (nao bloqueia)
  - Se delta > 3 OU sem justificativa:
    → BLOQUEIA merge
    → Comenta no PR pedindo justificativa

ESCALACAO:
  - Notificar qa-engineer para revisao
```

### Playbook 3: Build Failure em Master

```
TRIGGER: build failure no branch master (pos-merge)

DIAGNOSTICO AUTOMATICO:
  1. Identificar commit que causou a falha (git bisect logico)
  2. Identificar autor do commit
  3. Verificar se CI passou no PR (possivel race condition)

ACAO AUTOMATICA:
  - Alerta P0 em #incidents
  - Bloquear novos merges em master ate resolucao
  - Criar branch hotfix automaticamente

ESCALACAO:
  - Notificar tech-lead + autor do commit
  - Se nao resolvido em 30 min: revert automatico do commit
```

### Playbook 4: Cost Budget Exceeded

```
TRIGGER: custo acumulado de eval gates > budget do sprint

DIAGNOSTICO AUTOMATICO:
  1. Identificar qual eval gate consumiu mais tokens
  2. Calcular custo por build vs. budget por sprint
  3. Verificar se ha builds redundantes (multiplos pushes no mesmo PR)

ACAO AUTOMATICA:
  - Reduzir frequencia de eval gates caros (ex: rodar a cada 3 pushes, nao a cada push)
  - Notificar finops-engineer com relatorio detalhado

ESCALACAO:
  - Se budget excedido em > 200%: desativar eval gates com IA temporariamente
  - Finops-engineer decide se aumentar budget ou otimizar
```

---

## 8. Design de Dashboard

### Dashboard 1: Pipeline Health

**Metricas exibidas**:

```
+--------------------------------------------------+
|  PIPELINE HEALTH                      Sprint 29   |
+--------------------------------------------------+
|                                                    |
|  Trust Score (ultimo build)        [====] 0.87     |
|  Trust Score (media sprint)        [====] 0.85     |
|  Trust Score (tendencia)           ↑ +0.03         |
|                                                    |
|  Builds este sprint                    14          |
|  Builds com sucesso                    12 (86%)    |
|  Builds falharam                        2 (14%)    |
|  Tempo medio de build              22 min          |
|                                                    |
|  +-----------+-----------+-----------+             |
|  | Schema    | i18n      | Security  |             |
|  | 1.00      | 0.95      | 1.00      |             |
|  +-----------+-----------+-----------+             |
|  | Coverage  | Build     | Spec Conf |             |
|  | 0.82      | 1.00      | 0.70      |             |
|  +-----------+-----------+-----------+             |
|                                                    |
+--------------------------------------------------+
```

### Dashboard 2: Test Metrics

```
+--------------------------------------------------+
|  TEST METRICS                         Sprint 29   |
+--------------------------------------------------+
|                                                    |
|  Total de testes          1776                     |
|  Testes novos (sprint)    +121                     |
|  Taxa de sucesso          100%                     |
|  Cobertura de linhas      82.5%                   |
|                                                    |
|  Tendencia de testes (ultimos 10 sprints):         |
|                                                    |
|  1800 |                                    *       |
|  1600 |                              *   *         |
|  1400 |                        *  *                |
|  1200 |                  *  *                      |
|  1000 |            *  *                            |
|   800 |      *  *                                  |
|   600 | *  *                                       |
|       +---+--+--+--+--+--+--+--+--+--+            |
|        S20 S21  S23 S24 S25 S26 ... S29            |
|                                                    |
+--------------------------------------------------+
```

### Dashboard 3: Cost per Sprint

```
+--------------------------------------------------+
|  COST PER SPRINT                      Sprint 29   |
+--------------------------------------------------+
|                                                    |
|  Custo total do sprint         $20,00              |
|  Custo de desenvolvimento      $20,00 (100%)       |
|  Custo de infraestrutura       $0,00  (0%)         |
|  Custo de IA em producao       $0,00  (0%)         |
|  Custo de eval gates           $0,00  (0%)         |
|                                                    |
|  CI minutes consumidos         250 / 2000          |
|  Upstash ops consumidas        ~18k / 300k         |
|                                                    |
|  Custo acumulado (Sprints 1-29):                   |
|                                                    |
|  $600 |                                            |
|  $500 |                              *--*--*       |
|  $400 |                        *--*                |
|  $300 |                  *--*                      |
|  $200 |            *--*                            |
|  $100 |      *--*                                  |
|    $0 | *--*                                       |
|       +--+--+--+--+--+--+--+--+--+--+             |
|        S1  S5  S10  S15  S20  S25  S29             |
|                                                    |
+--------------------------------------------------+
```

### Dashboard 4: Sprint Velocity

```
+--------------------------------------------------+
|  SPRINT VELOCITY                      Sprint 29   |
+--------------------------------------------------+
|                                                    |
|  Specs implementadas este sprint      7            |
|  Specs em andamento                   3            |
|  Specs bloqueadas                     0            |
|                                                    |
|  Agents ativos este sprint:                        |
|  [PO] [UX] [ARCH] [TL] [SEC] [RM]                |
|  [DEV1] [DEV2] [QA] [FIN] [PRMT]                 |
|                                                    |
|  Trust score por merge (este sprint):              |
|  PR #25: 0.88  PR #26: 0.85  PR #27: 0.90        |
|                                                    |
+--------------------------------------------------+
```

### Implementacao dos dashboards

Para o MVP, os dashboards sao gerados como relatorios Markdown no final de cada sprint pelo tech-lead, com dados coletados dos GitHub Actions artifacts e do `docs/finops/COST-LOG.md`.

**Fase futura**: Integracao com Grafana/Vercel Analytics para dashboards em tempo real quando houver usuarios em producao.

---

## 9. Retencao de Dados de Observabilidade

| Tipo de dado | Retencao | Localizacao |
|-------------|----------|-------------|
| Eval scores por build | 90 dias (artifacts) + permanente (eval-history.jsonl) | GitHub Actions + repo |
| Logs de pipeline | 30 dias | GitHub Actions |
| Trust score historico | Permanente | `docs/process/eval-history.jsonl` |
| Cost reports por sprint | Permanente | `docs/finops/COST-LOG.md` |
| Sprint review reports | Permanente | `docs/sprint-reviews/` |
| Provenance chains | Permanente | Commit messages + PR descriptions |
| Alertas disparados | 90 dias | Slack (retention policy do workspace) |

---

## Historico de Revisoes

| Versao | Data | Autor | Mudancas |
|--------|------|-------|----------|
| 1.0.0 | 2026-03-12 | devops-engineer | Documento inicial — observabilidade de processo EDD+SDD |
