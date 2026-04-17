# SPEC-OPS-AI-GOVERNANCE-V2: Infraestrutura Operacional — Central de Governanca de IA

**Version**: 1.0.0
**Status**: Draft
**Author**: devops-engineer
**Reviewers**: tech-lead, architect, release-manager, security-specialist
**Created**: 2026-04-17
**Last Updated**: 2026-04-17
**Related Specs**: SPEC-PROD-AI-GOVERNANCE-V2, SPEC-EVALS-V1
**Feature Flag**: `AI_GOVERNANCE_V2`

---

## 1. Overview

A Central de Governanca de IA (SPEC-PROD-AI-GOVERNANCE-V2) introduz consulta ao banco de dados em cada chamada de IA para obter configuracoes de modelo e prompt ativo. Este spec define os requisitos operacionais: feature flag, observabilidade, degradacao graciosa, gates de CI/CD, mudancas de infraestrutura, gestao de secrets, plano de rollback e monitoramento pos-flip.

Nenhum servico novo e necessario. A stack existente (Next.js 15 na Vercel, PostgreSQL via Prisma, Redis via ioredis, Sentry) e suficiente. O risco operacional principal e a latencia adicional do polling ao DB em cada chamada de IA e a dependencia de disponibilidade do banco para resolucao de configuracao.

---

## 2. Feature Flag Setup

### 2.1 Declaracao em `src/lib/env.ts`

Nova variavel de ambiente com validacao Zod:

```typescript
// Em server: {}
AI_GOVERNANCE_V2: z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true"),
```

Adicionar em `runtimeEnv`:

```typescript
AI_GOVERNANCE_V2: process.env.AI_GOVERNANCE_V2,
```

### 2.2 Helper em `src/lib/flags/ai-governance.ts`

```typescript
import { env } from "@/lib/env";

export function isAiGovernanceV2Enabled(): boolean {
  return env.AI_GOVERNANCE_V2;
}
```

Este helper e server-only (import `server-only`). Nenhuma exposicao ao cliente via `NEXT_PUBLIC_`.

### 2.3 Estrategia de Rollout

| Etapa | Ambiente | Flag | Acao |
|---|---|---|---|
| 1. Merge do PR | Staging (Vercel Preview) | `true` | Automatico via env var do Environment "staging" no Vercel |
| 2. Validacao staging | Staging | `true` | Testes manuais + E2E automatizados |
| 3. Go-live producao | Production | `true` | Manual: setar env var no Vercel Environment "production" + trigger redeploy |
| 4. Rollback | Production | `false` | Setar para "false" + redeploy |

### 2.4 Tradeoff: Env Var vs Feature Flag Service

| Criterio | Env Var (Vercel) | Feature Flag Service (LaunchDarkly/Unleash) |
|---|---|---|
| Custo | $0 | $10-75/mes |
| Latencia de flip | ~2 min (redeploy) | < 1s (real-time) |
| Targeting (% users) | Nao | Sim |
| Complexidade | Nenhuma | Novo SDK + integracao |
| Auditoria de flip | Git history do Vercel Dashboard | Dashboard nativo |

**Decisao**: usar env var do Vercel. O custo de 2 min de redeploy e aceitavel para uma feature admin-only que nao requer rollout gradual por usuario. Reavaliar se a equipe adotar feature flags como pratica global no futuro.

---

## 3. Observabilidade

### 3.1 Metricas

Todas as metricas emitidas via logs estruturados JSON (padrao do projeto) e/ou Sentry custom metrics. Nenhuma dependencia nova de Prometheus/Grafana nesta fase.

| Metrica | Tipo | Descricao | Labels | Emissao |
|---|---|---|---|---|
| `ai.config.fetch_ms` | histogram | Latencia do polling DB por chamada AI (query `ModelAssignment` + `AiRuntimeConfig`) | `phase_type`, `status` (hit/fallback) | Log estruturado + Sentry `metrics.distribution()` |
| `ai.config.fallback_used` | counter | Incrementa quando fallback hardcoded e acionado (DB indisponivel ou timeout) | `phase_type`, `reason` (timeout/error) | Log `level: warn` + Sentry `metrics.increment()` |
| `ai.model_assignment.version` | gauge | Versao ativa do `ModelAssignment` por tipo de geracao | `phase_type`, `model_id` | Log apos cada fetch bem-sucedido |
| `ai.prompt.promoted` | counter | Prompt promovido para producao | `phase_type`, `trust_score` | Log `level: info` + Sentry |
| `ai.prompt.rolledback` | counter | Rollback de prompt executado | `phase_type`, `from_version`, `to_version` | Log `level: warn` + Sentry |
| `ai.output.flagged` | counter | Output marcado na curadoria | `flag_type` (bias/alucinacao/risco) | Log `level: warn` + Sentry |
| `admin.ai.edits_per_hour` | counter | Edicoes de configuracao por admin por hora | `admin_user_id` (hashed) | Log `level: info` |

**Formato do log estruturado** (exemplo):

```json
{
  "timestamp": "2026-04-17T14:32:01.123Z",
  "level": "info",
  "service": "ai-config",
  "traceId": "uuid",
  "event": "ai.config.fetched",
  "durationMs": 12,
  "metadata": {
    "phaseType": "guide",
    "modelId": "gemini-2.0-flash",
    "source": "database",
    "assignmentVersion": 3
  }
}
```

### 3.2 Dashboards

| Dashboard | Plataforma | Conteudo |
|---|---|---|
| AI Config Health | Sentry Dashboard (custom) | Latencia p50/p90/p99 do polling, taxa de fallback, contagem de erros |
| AI Prompt Lifecycle | Sentry Dashboard (custom) | Promocoes/rollbacks por dia, trust scores recentes |
| Admin Activity | Vercel Analytics + Sentry | Edicoes por hora, rate limit hits |

### 3.3 Alertas

| Nome | Threshold | Severidade | Canal | Runbook |
|---|---|---|---|---|
| `ai-config-db-unavailable` | `ai.config.fallback_used > 5/min` por 2 min consecutivos | P0 — PAGE | Sentry → email/SMS on-call | RUN-AI-CONFIG-DB-DOWN (secao 4) |
| `ai-config-polling-slow` | `ai.config.fetch_ms` p90 > 100ms por 5 min | P1 — WARN | Sentry → Slack #alerts | Investigar: indices DB, connection pool, considerar cache Redis |
| `ai-kill-switch-activated` | Kill-switch ativado por qualquer admin | P1 — INFO critico | Sentry → Slack #incidents | Confirmar intencionalidade, documentar motivo |
| `ai-model-changed` | Troca de modelo ou timeout > 45s em qualquer fase | P2 — INFO | Sentry → Slack #alerts | Verificar se intencional, monitorar qualidade por 1h |
| `admin-rate-limit-hit` | `admin.ai.edits_per_hour` >= rate limit (definido em SPEC-PROD) | P2 — INFO | Sentry → Slack #alerts | Verificar se e uso legitimo ou abuso |
| `audit-log-insert-failure` | Qualquer falha ao inserir no AuditLog | P0 — PAGE | Sentry → email/SMS on-call | Gap de compliance; investigar DB, disco, constraints |
| `ai-latency-regression` | Latencia p90 AI regrediu > 20% vs baseline (media dos ultimos 7 dias) | P1 — WARN | Sentry → Slack #incidents | Possivel impacto do polling; considerar cache ou rollback |

---

## 4. Graceful Degradation — Runbook (RUN-AI-CONFIG-DB-DOWN)

### 4.1 Comportamento de Fallback

Quando a consulta ao DB para obter `ModelAssignment` ou `AiRuntimeConfig` falha (timeout, erro de conexao, exception):

1. A chamada de IA usa **fallback hardcoded** definido em `src/lib/ai/fallback-config.ts`
2. A metrica `ai.config.fallback_used` e incrementada
3. O log emite `level: warn` com `event: ai.config.fallback_activated`

**Valores do fallback hardcoded**:

```typescript
// src/lib/ai/fallback-config.ts
export const AI_FALLBACK_CONFIG = {
  provider: "gemini",
  modelId: "gemini-2.0-flash",
  timeoutMs: 30_000,
  maxTokens: 4096,
  temperature: 0.7,
} as const;
```

Estes valores devem estar alinhados com os defaults atuais do `ai.service.ts`. Nenhuma chamada a API externa deve falhar por conta de DB indisponivel.

### 4.2 Health Check Endpoint

**Endpoint**: `GET /api/health/ai-config`

| Condicao | HTTP Status | Body |
|---|---|---|
| Polling DB funciona (< 500ms) | 200 | `{ "status": "healthy", "source": "database", "fetchMs": N }` |
| Fallback ativo ha < 5 min | 200 | `{ "status": "degraded", "source": "fallback", "fallbackSinceMs": N }` |
| Fallback ativo ha >= 5 min | 503 | `{ "status": "unhealthy", "source": "fallback", "fallbackSinceMs": N }` |

Protegido por rate limit (10 req/min por IP). Nao expoe dados sensiveis.

### 4.3 Runbook — Passos de Resposta

**Sintomas**: alerta `ai-config-db-unavailable` disparado. Dashboard Sentry mostra `ai.config.fallback_used` crescente.

**Acoes imediatas (primeiros 5 minutos)**:

1. Confirmar via Sentry que `ai.config.fallback_used` esta incrementando
2. Verificar `GET /api/health/ai-config` — confirmar status `degraded` ou `unhealthy`
3. Verificar saude geral do DB: `GET /api/v1/health` (health check existente que checa PostgreSQL + Redis)

**Diagnostico**:

```bash
# Se DB esta healthy no health check geral mas polling AI falha:
# - Verificar se a tabela ModelAssignment/AiRuntimeConfig existe
# - Verificar se ha lock contention ou queries lentas
# - Verificar logs do Prisma para erros de conexao

# Se DB esta completamente down:
# - Escalar para DBA / Railway support
# - Confirmar que fallback esta ativo (viajantes nao sao impactados)
```

**Remediacao**:

| Opcao | Quando usar | Acao |
|---|---|---|
| A — Aguardar | DB recovery em progresso, fallback ativo | Monitorar; fallback cobre 100% da funcionalidade |
| B — Rotacionar conexao Prisma | DB healthy mas polling falhando (pool exausto) | Redeploy Vercel (trigger via dashboard ou `vercel --prod`) |
| C — Escalar DBA | DB completamente down | Contatar Railway/Render support; abrir incident |

**Impacto ao viajante durante fallback**: ZERO. Todas as chamadas de IA continuam funcionando com configuracao hardcoded. A unica perda e que mudancas de configuracao feitas pelo admin nao tem efeito ate o DB voltar.

---

## 5. CI/CD Gates

### 5.1 Pipeline de PR (`ci.yml`)

Adicionar ou validar os seguintes stages na pipeline de CI existente para PRs que toquem em arquivos da feature:

| Stage | Gate | Criterio de bloqueio |
|---|---|---|
| Lint + Type Check | Existente | Erro de lint ou type bloqueia |
| Unit Tests | Coverage >= 80% | Coverage abaixo de 80% bloqueia merge |
| SAST (Semgrep) | `p/secrets p/owasp-top-ten` | Qualquer finding CRITICAL/HIGH bloqueia |
| Eval Gate | `npm run eval:gate` | Trust score < 0.80 bloqueia merge (ref SPEC-EVALS-V1) |
| Security Audit | `npm audit --audit-level=high` + Snyk (se disponivel) | Vulnerabilidades HIGH+ bloqueiam |
| Container Scan | Trivy CRITICAL/HIGH | CVEs criticas bloqueiam publish |

### 5.2 Pipeline de Deploy (`deploy.yml`)

| Stage | Acao | Rollback |
|---|---|---|
| Prisma Migrate | `npx prisma migrate deploy` em staging | Se falhar: pipeline para. Nenhuma tabela nova e criada. Migracoes sao additive-only (novas tabelas: `ModelAssignment`, `AiRuntimeConfig`, `PromptTemplate`, `AuditLog`). |
| Deploy Staging | Vercel Preview deploy (automatico) | Revert via Vercel dashboard |
| E2E Staging | Cenario critico real-time: criar/editar config AI, verificar que chamada AI usa config do DB (ref SPEC-QA-AI-GOVERNANCE-V2 secao 7) | Se falhar: pipeline para, nao promove para producao |
| Manual Approval | tech-lead aprova | — |
| Deploy Production | Vercel Production deploy | Flag OFF + redeploy (< 10 min) |
| Smoke Test Producao | Health check endpoints + 1 chamada AI de teste | Se falhar: rollback imediato (flag OFF) |

### 5.3 Integracao com SPEC-EVALS-V1

- PRs que alteram prompts ou configuracoes de modelo devem passar pelo eval gate
- O eval gate executa `npm run eval:gate` que valida trust score >= 0.80
- Se o trust score cair abaixo de 0.80, o PR e bloqueado automaticamente
- Playbook de remediacao: `docs/evals/playbooks/trust-score-drop.md`

---

## 6. Infra Changes

### 6.1 Novos Recursos

**Nenhum novo servico requerido.** O DB PostgreSQL e o Redis ja existentes sao suficientes.

### 6.2 Novas Tabelas (via Prisma Migration)

| Tabela | Crescimento Estimado | Retencao |
|---|---|---|
| `ModelAssignment` | ~10 rows (1 por tipo de geracao) | Permanente |
| `AiRuntimeConfig` | ~5 rows (1 por ambiente logico) | Permanente |
| `PromptTemplate` | ~50 rows/mes (versoes de prompts) | Permanente |
| `AuditLog` | ~1.000 rows/dia (admin ativo) | 180 dias em DB; apos isso, archival |

### 6.3 Indices Recomendados

```sql
-- AuditLog: consulta por admin e cronologia
CREATE INDEX idx_audit_log_actor_created ON "AuditLog" ("actorUserId", "createdAt" DESC);

-- AuditLog: consulta por entidade
CREATE INDEX idx_audit_log_entity ON "AuditLog" ("entityType", "entityId");

-- PromptTemplate: consulta por tipo e status
CREATE INDEX idx_prompt_template_type_status ON "PromptTemplate" ("generationType", "status");

-- ModelAssignment: consulta por tipo (polling hot path)
CREATE INDEX idx_model_assignment_type ON "ModelAssignment" ("generationType");
```

### 6.4 Dimensionamento

Com ~1.000 rows/dia no AuditLog e retencao de 180 dias: ~180.000 rows. A ~500 bytes/row = ~90 MB. Impacto negligivel no DB existente.

### 6.5 Archival (Wave pos-beta, opcional)

Job noturno (cron ou Vercel Cron Function) que move registros de AuditLog com > 180 dias para arquivo. Opcoes:

- **Fase 1**: soft delete (marcar como `archived = true`, excluir de queries padrao)
- **Fase 2**: export para S3 cold storage (se volume justificar)

Nao implementar no MVP. Monitorar crescimento e reavaliar no Sprint 50.

### 6.6 Backup

AuditLog entra no backup diario do PostgreSQL ja configurado (Railway managed backups). Nenhuma configuracao adicional necessaria.

---

## 7. Secrets

**Nenhum novo secret necessario para esta feature.**

Secrets existentes utilizados:

| Secret | Ja existe | Impacto da Governanca V2 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sim | Nenhum. Configs de modelo referenciam provider logicamente ("anthropic"), nao a key. Rotacao da key NAO requer mudanca em `ModelAssignment`. |
| `GOOGLE_AI_API_KEY` | Sim | Idem. Provider "gemini" e uma referencia logica. |
| `GEMINI_API_KEY` | Sim | Idem. |
| `DATABASE_URL` | Sim | Usado pelo polling Prisma. Nenhuma mudanca. |

A nova env var `AI_GOVERNANCE_V2` NAO e um secret (e um booleano publico). Deve ser configurada como env var regular (nao secreta) no Vercel.

---

## 8. Rollback Plan

### 8.1 Rollback via Feature Flag (< 10 min)

| Passo | Acao | Tempo |
|---|---|---|
| 1 | Setar `AI_GOVERNANCE_V2=false` no Vercel Environment "production" | 30s |
| 2 | Trigger redeploy (`vercel --prod` ou via dashboard) | ~2 min |
| 3 | Confirmar via health check que polling DB parou | 30s |
| 4 | Verificar logs: nenhuma query a `ModelAssignment` | 1 min |

**Efeito**: UI da aba IA fica oculta. Backend ignora tabelas de governanca e usa configuracao via env vars (comportamento pre-V2). Nenhum dado e perdido.

### 8.2 Rollback de Migracao (se necessario)

As migracoes sao **additive-only** (novas tabelas e colunas). Rollback de migracao:

- Tabelas novas (`ModelAssignment`, `AiRuntimeConfig`, `PromptTemplate`, `AuditLog`) **permanecem** no DB (nao destrutivo)
- Se necessario remover constraints novas em `PromptTemplate`:

```sql
-- SQL reverso (apenas se constraints causarem problemas):
ALTER TABLE "PromptTemplate" DROP CONSTRAINT IF EXISTS "PromptTemplate_generationType_status_idx";
-- Tabelas podem ser dropadas manualmente se feature for definitivamente abandonada
```

### 8.3 Metricas de Rollback

| Metrica | Alvo |
|---|---|
| RTO (Recovery Time Objective) | < 10 min (flag OFF + redeploy) |
| RPO (Recovery Point Objective) | 0 (AuditLog preservado, nenhum dado perdido) |

---

## 9. Post-Flip Monitoring (Primeiras 48h)

### 9.1 Dashboard Dedicado

Criar dashboard Sentry "AI Governance V2 — Post-Flip" com:

- Latencia `ai.config.fetch_ms` (p50/p90/p99) em grafico temporal
- Taxa `ai.config.fallback_used` em grafico temporal
- Contagem de erros no fluxo admin (save, promote, rollback)
- Comparacao latencia AI total: pre-flip vs pos-flip

### 9.2 On-Call

- Primeiras 24h: on-call presencial (devops-engineer + tech-lead)
- 24h-48h: on-call com pager
- Apos 48h: retorno ao regime normal de alertas

### 9.3 Criterios de Rollback Automatico

Se qualquer condicao abaixo for verdadeira por 30 minutos consecutivos, executar rollback (flag OFF):

| Condicao | Threshold |
|---|---|
| Fallback excessivo | `ai.config.fallback_used > 50/hora` |
| Regressao de latencia AI | p90 AI regrediu > 20% vs baseline dos ultimos 7 dias |

**Nota**: rollback automatico e manual nesta fase. Automatizacao via webhook Sentry → Vercel API e um enhancement futuro (avaliar no Sprint 47).

### 9.4 Checklist Pos-Flip

- [ ] Dashboard pos-flip criado e funcional
- [ ] Alerta `ai-config-db-unavailable` testado (simular falha de DB em staging)
- [ ] Health check `/api/health/ai-config` responde corretamente nos 3 cenarios
- [ ] Fallback hardcoded validado em staging (desconectar DB e verificar chamada AI)
- [ ] Latencia de polling p90 < 50ms (target) em staging
- [ ] AuditLog registrando todas as operacoes admin
- [ ] Rate limit de edicoes admin funcionando
- [ ] On-call escalado e ciente do go-live

---

## 10. Open Questions

| ID | Pergunta | Responsavel | Status |
|---|---|---|---|
| OQ-1 | O polling DB por chamada AI deve ter cache Redis intermediario? Se `ai.config.fetch_ms` p90 > 50ms em staging, ativar cache com TTL de 30s. | architect + devops-engineer | Aberta — medir em staging antes de decidir |
| OQ-2 | Rollback automatico via Sentry webhook → Vercel API e viavel na nossa tier do Vercel? | devops-engineer | Aberta — avaliar Sprint 47 |
| OQ-3 | AuditLog archival para S3: necessario no MVP ou pode esperar Sprint 50? | devops-engineer + finops-engineer | Decidido: esperar Sprint 50 |
| OQ-4 | O rate limit de edicoes admin (edits_per_hour) deve ser definido neste spec ou no SPEC-PROD? | product-owner + devops-engineer | Aberta — valor exato vem do SPEC-PROD |

---

## 11. Change History

| Versao | Data | Autor | Mudanca |
|---|---|---|---|
| 1.0.0 | 2026-04-17 | devops-engineer | Versao inicial — feature flag, observabilidade, degradacao, CI/CD, infra, rollback, pos-flip |
