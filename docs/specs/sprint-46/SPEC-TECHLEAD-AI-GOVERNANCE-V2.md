# SPEC-TECHLEAD-AI-GOVERNANCE-V2: Relatorio Consolidado — Central de Governanca de IA

**Version**: 1.1.0
**Status**: Approved
**Author**: tech-lead
**Sprint**: 45
**Created**: 2026-04-17
**Last Updated**: 2026-04-17
**Feature Flag**: `AI_GOVERNANCE_V2`

**Specs consolidados**:

| Spec ID | Autor | Localizacao |
|---------|-------|-------------|
| SPEC-PROD-AI-GOVERNANCE-V2 | product-owner | `docs/specs/sprint-45/SPEC-PROD-AI-GOVERNANCE-V2.md` |
| SPEC-ARCH-AI-GOV-V2 | architect | `docs/specs/sprint-45/SPEC-ARCH-AI-GOVERNANCE-V2.md` |
| SPEC-UX-AI-GOVERNANCE-V2 | ux-designer | `docs/specs/sprint-45/SPEC-UX-AI-GOVERNANCE-V2.md` |
| SPEC-AI-GOVERNANCE-V2 | ai-specialist | `docs/specs/sprint-45/SPEC-AI-GOVERNANCE-V2.md` |
| SPEC-QA-AI-GOVERNANCE-V2 | qa-engineer | `docs/specs/sprint-45/SPEC-QA-AI-GOVERNANCE-V2.md` |
| SPEC-RELEASE-AI-GOVERNANCE-V2 | release-manager | `docs/specs/sprint-45/SPEC-RELEASE-AI-GOVERNANCE-V2.md` |
| SPEC-OPS-AI-GOVERNANCE-V2 | devops-engineer | `docs/specs/sprint-45/SPEC-OPS-AI-GOVERNANCE-V2.md` |
| SPEC-SEC-AI-GOVERNANCE-V2 | architect (proxy security-specialist) | `docs/specs/sprint-45/SPEC-SEC-AI-GOVERNANCE-V2.md` |

---

## 1. Sumario Executivo

- **O que**: Central de Governanca de IA — aba `/admin/ia` que unifica controle de modelos, editor de prompts com versionamento imutavel (draft -> eval -> aprovacao -> producao -> rollback), curadoria de outputs (bias/alucinacao/risco), kill-switches por fase, dashboard de metricas e audit log imutavel. Todas as configuracoes propagam em tempo real via polling direto ao DB (ADR-033), sem redeploy.
- **Por que**: Hoje, qualquer alteracao em prompts ou modelos exige PR + deploy (>4h de lead time). A Central reduz para <15 minutos. Sem ela, nao ha auditoria de quem mudou o que, curadoria sistematica ou gate de qualidade para prompts em producao.
- **Custo de implementacao**: 6 waves, estimativa total de 35-45 dias de desenvolvimento (2 devs em paralelo), cobrindo ~115 effort points. A feature e inteiramente aditiva e protegida por feature flag.
- **Custo operacional**: Overhead de +5-20ms por chamada AI (polling DB). Custo de evals estimado em $2.80-$22/mes dependendo do volume. Custo de curadoria LLM-as-judge ~$1.40/mes (400 samples a $0.0035).
- **Risco principal**: Novo ponto de falha no hot path de geracao AI (polling DB). Mitigado por fallback hardcoded e graceful degradation.

---

## 2. Estimativa Total por Wave

**Legenda**: S = Small (0.5-1d), M = Medium (1-2d), L = Large (2-3d), XL = Extra Large (3-5d)

| Wave | Titulo | Effort | Dias estimados | Devs |
|------|--------|--------|----------------|------|
| Wave 1 | Esqueleto + Auth + Feature Flag | 15 pts | 5-6d | dev-fullstack-1 + dev-fullstack-2 |
| Wave 2 | Editor de Prompts + Versionamento | 25 pts | 7-9d | dev-fullstack-1 (backend) + dev-fullstack-2 (frontend) |
| Wave 3 | Modelo/Timeout Real-Time + Config | 20 pts | 5-7d | dev-fullstack-1 (backend) + dev-fullstack-2 (frontend) |
| Wave 4 | Curadoria de Outputs | 20 pts | 5-7d | dev-fullstack-1 (backend) + dev-fullstack-2 (frontend) |
| Wave 5 | Eval Integrado (Promptfoo) | 20 pts | 6-8d | dev-fullstack-1 (backend) + dev-fullstack-2 (frontend) |
| Wave 6 | A/B Testing (pos-Beta, opcional) | 15 pts | 5-7d | TBD |
| **TOTAL (Waves 1-5)** | **100 pts** | **28-37d** | |
| **TOTAL (com Wave 6)** | **115 pts** | **33-44d** | |

**Nota**: Estimativas consideram 2 devs em paralelo. Calendario efetivo: 4-6 semanas para Waves 1-5 (1 wave por semana, com buffer).

---

## 3. Plano em Waves

### Wave 1: Esqueleto + Auth + Feature Flag (5-6 dias)

**Objetivo**: Infraestrutura base da Central — aba visivel, rotas protegidas, feature flag funcional, migration com 5 novos modelos Prisma, seed de dados iniciais.

**Deliverables**:
- Feature flag `AI_GOVERNANCE_V2` em `src/lib/env.ts` + helper `isAiGovernanceV2Enabled()`
- Migration `20260417000001_ai_governance_v2` com 5 novos modelos: `PromptVersion`, `PromptEvalResult`, `ModelAssignment`, `AiRuntimeConfig`, `AuditLog` + campos adicionados em `PromptTemplate` e `AiInteractionLog`
- Seed de `ModelAssignment` com configs hardcoded atuais (3 fases: plan, checklist, guide)
- Seed de `AiRuntimeConfig` com defaults (Secao 5.3.1 do SPEC-ARCH)
- Aba "IA" no `/admin` com 4 tabs (Dashboard, Prompts, Modelos, Outputs) — skeleton/empty state
- RBAC: middleware para rotas `/api/admin/ai/*` (role `admin-ai`) e `/admin/ia` (UI)
- Health check endpoint `GET /api/health/ai-config`
- `AuditLogService` com insert append-only

**Criterio de pronto**:
- Flag ON mostra aba; flag OFF esconde completamente (zero impacto)
- Rotas retornam 403 para users sem role `admin-ai`
- Migration aplicada e revertida com sucesso em staging
- Health check responde nos 3 cenarios (healthy/degraded/unhealthy)
- >= 80% cobertura nos novos servicos

**Dependencias**: SPEC-ARCH (schema), SPEC-OPS (feature flag setup), decisao PO sobre RBAC
**Agentes**: dev-fullstack-1 (migration, services, API routes), dev-fullstack-2 (UI shell, RBAC middleware, health check)

**Tasks**:

| ID | Descricao | Agente | Est | Depende de |
|----|-----------|--------|-----|------------|
| T-W1-001 | Feature flag helper + env.ts | dev-fullstack-1 | S | — |
| T-W1-002 | Migration Prisma (5 modelos + alteracoes) | dev-fullstack-1 | L | T-W1-001 |
| T-W1-003 | Seed ModelAssignment + AiRuntimeConfig | dev-fullstack-1 | M | T-W1-002 |
| T-W1-004 | AuditLogService (append-only) | dev-fullstack-1 | M | T-W1-002 |
| T-W1-005 | RBAC middleware admin-ai | dev-fullstack-2 | M | T-W1-001 |
| T-W1-006 | UI shell: aba IA + tabs skeleton | dev-fullstack-2 | M | T-W1-005 |
| T-W1-007 | Health check endpoint /api/health/ai-config | dev-fullstack-2 | S | T-W1-002 |
| T-W1-008 | Testes unit + integration Wave 1 | ambos | M | T-W1-004, T-W1-006 |

---

### Wave 2: Editor de Prompts com Versionamento (7-9 dias)

**Objetivo**: CRUD de prompts com versionamento imutavel, diff viewer, validacoes pre-save (8 bloqueantes + 4 warnings), contagem de tokens.

**Deliverables**:
- API endpoints: `GET/POST /api/admin/ai/prompts`, `PATCH /api/admin/ai/prompts/:id`, versoes historicas
- `PromptVersion` imutavel — cada edicao cria novo registro
- Auto-increment de versao (semver patch bump)
- 8 validacoes bloqueantes (V-01..V-08) do SPEC-AI: placeholders obrigatorios/proibidos, token budget, PII scrub, API key detection, URL interna
- 4 validacoes warning (W-01..W-04)
- UI: lista de templates, editor com syntax highlighting (placeholders destacados), diff viewer side-by-side, preview com dados mock
- Contagem de tokens estimada (heuristica `ceil(chars/3.5)` como fallback)
- Audit log em toda operacao de escrita

**Criterio de pronto**:
- Template salvo como draft com validacoes passando
- Versao anterior preservada e consultavel
- Diff viewer mostra diferencas entre 2 versoes
- V-02 bloqueia placeholder proibido ({userEmail} etc.)
- V-06 bloqueia dados reais (email, CPF)
- Cobertura >= 80% nas validacoes

**Dependencias**: Wave 1 completa
**Agentes**: dev-fullstack-1 (backend: services, validacoes, API), dev-fullstack-2 (frontend: editor, diff, preview)
**Spec refs**: SPEC-PROD AC-13..AC-21, SPEC-ARCH Secao 5.1, SPEC-AI Secoes 2-3

---

### Wave 3: Seletor de Modelo + Timeouts Real-Time (5-7 dias)

**Objetivo**: Matriz modelo-por-fase editavel, timeouts configuraveis, polling DB em cada chamada AI com fallback hardcoded, kill-switches.

**Deliverables**:
- `AiConfigResolver` interface + implementacao DB polling (ADR-033)
  - **3-tier resolution** per ADR-0036 (Sprint 46 Day 1): DB → env → hardcoded.
  - Env tier (`GEMINI_TIMEOUT_MS`, `CLAUDE_TIMEOUT_MS`) implemented in S46 as bridge; DB tier lands here in Wave 3.
- Integracao do `AiConfigResolver` no `AiGatewayService` / `AiService`
- API endpoints: `GET/PATCH /api/admin/ai/models/:id`, `GET/PATCH /api/admin/ai/runtime-config`
- Validacao: timeout 5s-55s, soma primary+fallback <= 55s
- Fallback hardcoded quando DB indisponivel (`HARDCODED_DEFAULTS`)
- Kill-switches individuais por fase via `AiRuntimeConfig`
- UI: tabela de configuracao, dropdowns de modelo (5 homologados), inputs de timeout com validacao real-time, modais de confirmacao com impacto estimado
- Alertas Sentry em mudancas sensiveis (kill-switch, troca de modelo, timeout > 45s)

**Criterio de pronto**:
- Admin troca modelo -> proxima chamada AI usa novo modelo (sem redeploy)
- Admin altera timeout -> validacao em tempo real funciona
- DB indisponivel -> fallback hardcoded ativado, AI continua funcionando
- Kill-switch ON -> chamada AI bloqueada com mensagem amigavel ao viajante
- Overhead de polling < 20ms p99

**Dependencias**: Wave 1 completa (pode iniciar em paralelo com partes da Wave 2)
**Agentes**: dev-fullstack-1 (AiConfigResolver, integracao AiService, fallback), dev-fullstack-2 (UI matriz de modelos, kill-switch toggles)
**Spec refs**: SPEC-PROD AC-5..AC-12, AC-33..AC-36, SPEC-ARCH Secoes 3-6, SPEC-AI Secao 4

---

### Wave 4: Curadoria de Outputs (5-7 dias)

**Objetivo**: Fila de revisao de outputs AI com flags (bias/alucinacao/risco), amostragem automatica, dashboard de metricas.

**Deliverables**:
- Campos `curationStatus` e `curationNotes` em `AiInteractionLog`
- API endpoints: `GET /api/admin/ai/outputs`, `POST /api/admin/ai/outputs/:id/curate`
- Amostragem automatica: 5% dos outputs enfileirados para curadoria
- UI: lista paginada com filtros (fase, modelo, periodo, status, flag), painel de detalhes expandivel, botoes de flag (bias/alucinacao/risco), textarea de comentario, radio group de status
- Anonimizacao de PII no painel (userId hashed, sem email/nome)
- Alertas: flagged > 3% do dia, fila vencida > 48h
- Dashboard de metricas: KPIs (chamadas, custo, erro, latencia, trust score), graficos de tendencia semanal

**Criterio de pronto**:
- Admin pode filtrar e revisar outputs
- Flag de bias gera audit log
- PII nao exposta no painel de curadoria
- Alertas aparecem quando thresholds sao atingidos
- Cobertura >= 80%

**Dependencias**: Wave 1 + Wave 3 (depende de AiInteractionLog atualizado)
**Agentes**: dev-fullstack-1 (backend: amostragem, API, alertas), dev-fullstack-2 (frontend: lista, filtros, KPIs, graficos)
**Spec refs**: SPEC-PROD AC-22..AC-32, SPEC-AI Secao 6, SPEC-UX Secoes 4.1 e 4.4

---

### Wave 5: Eval Integrado na UI (6-8 dias)

**Objetivo**: Botao "Rodar Evals" no editor de prompts, integracao Promptfoo, gate de promocao Trust Score >= 0.80, fluxo de promocao completo.

**Deliverables**:
- API endpoints: `POST /api/admin/ai/prompts/:id/eval`, `POST /api/admin/ai/prompts/:id/promote`, `POST /api/admin/ai/prompts/:id/rollback`
- `PromptEvalService` wrapper para Promptfoo (execucao assincrona)
- Gate de promocao: TrustScore >= 0.80 AND Safety >= 0.90 (conforme SPEC-AI)
- Rollback 1-click com restauracao em < 5 segundos
- UI: painel inline de resultado de eval, breakdown por dimensao, botao Promover (desabilitado se gate falha), botao Rollback com modal de confirmacao
- Audit log completo: promote, rollback
- Bloqueio de promocao sem eval nos ultimos 7 dias (AC-21)
- Rate limit: 5 eval runs/hora/admin

**Criterio de pronto**:
- Draft -> Eval (mock) -> Trust >= 0.80 -> Promote funciona end-to-end
- Trust < 0.80 bloqueia promocao 100%
- Safety < 0.90 bloqueia promocao mesmo com Trust global >= 0.80
- Rollback restaura versao anterior e registra no audit log
- Eval executado assincronamente (admin nao precisa manter pagina aberta)

**Dependencias**: Wave 2 completa
**Agentes**: dev-fullstack-1 (PromptEvalService, gate, promote/rollback), dev-fullstack-2 (UI eval, progresso, resultado)
**Spec refs**: SPEC-PROD AC-15..AC-21, SPEC-AI Secao 5, SPEC-ARCH Secao 5.1

---

### Wave 6: A/B Testing (opcional, pos-Beta, 5-7 dias)

**Objetivo**: Testar versoes de prompts em % de trafego.

**Deliverables**:
- Slider de % trafego no editor de prompts (0-50%)
- `ModelAssignment` estendido com variant allocation
- Metricas comparativas entre variantes

**Criterio de pronto**: Definido quando Wave 6 for planejada formalmente.
**Dependencias**: Waves 1-5 completas + spec dedicada
**Agentes**: TBD
**Spec refs**: SPEC-PROD Out of Scope v1, SPEC-UX Secao 4.2 (esboco)

---

## 4. Riscos Consolidados

| ID | Risco | Severidade | Probabilidade | Fonte | Mitigacao |
|----|-------|-----------|---------------|-------|-----------|
| R-01 | Polling DB no hot path de AI vira gargalo em escala (>100 chamadas/min) | Alta | Baixa | ARCH ADR-033, OPS R1, RELEASE R1 | AiConfigResolver interface isola ponto de troca. Migration path: cache in-memory TTL 30s -> Redis pub/sub. Monitorar p99. |
| R-02 | DB indisponivel durante geracao AI — fallback usa config desatualizada | Alta | Baixa | ARCH Secao 6.2, OPS Secao 4, RELEASE R5 | Fallback hardcoded cobre 100% da funcionalidade. Alerta Sentry se fallback > 5 min. Health check endpoint. |
| R-03 | Prompt promovido ruim apesar do eval gate — metricas quantitativas nao capturam tudo | Media | Media | RELEASE R2, AI Secao 5.3 | Rollback 1-click + curadoria de outputs + alerta Sentry em promocao. Gate duplo: Trust >= 0.80 + Safety >= 0.90. |
| R-04 | Kill-switch ativado por engano — desativa geracao AI para viajantes | Media | Baixa | RELEASE R3 | Modal de confirmacao obrigatorio + justificativa + audit log + alerta Sentry. |
| R-05 | Audit log cresce alem do esperado — impacto no DB | Baixa | Baixa | RELEASE R4, OPS Secao 6.4 | Estimativa: 180k rows em 180 dias (~90 MB). Retencao 90 dias (PO) ou 180 dias (OPS). Archival para Sprint 50. |
| R-06 | ~~SPEC-SEC-AI-GOVERNANCE-V2 NAO EXISTE~~ | ~~Alta~~ | ~~Alta~~ | ~~Identificado pelo tech-lead~~ | **RESOLVIDO** (2026-04-17). SPEC-SEC-AI-GOVERNANCE-V2 criada e aprovada. Threat model STRIDE, RBAC four-eyes, audit log imutabilidade, prompt sanitizacao cobertas. |
| R-07 | Dessincronia de versao: package.json (0.59.0) vs release-manager (v0.59.0 -> v0.60.0) — OK. Mas v0.22.0 mencionado em CLAUDE.md e memories e MUITO antigo | Media | Alta | RELEASE R6, package.json | package.json confirma v0.59.0. CLAUDE.md e memories desatualizados. Release-manager esta correto: v0.59.0 -> v0.60.0. |
| R-08 | Promptfoo como dependencia — nao esta no projeto atualmente | Media | Media | AI Secao 5, ARCH Secao 10 | Avaliar se Promptfoo ja e dependencia. Se nao, validar licenca (MIT — OK) e adicionar. PromptEvalService wrapper isola vendor. |
| R-09 | Biblioteca de graficos para dashboard de metricas nao definida | Baixa | Alta | UX OQ | Architect deve decidir (Recharts recomendado — MIT, leve, Next.js friendly). |
| R-10 | Editor de prompts — mecanismo de syntax highlighting nao definido | Baixa | Media | UX OQ | Architect deve decidir. Recomendacao: textarea simples com regex highlighting no v1 (evitar Monaco/CodeMirror por bundle size). |

---

## 5. Decisoes Pendentes do PO — Lista Consolidada

As decisoes DEC-01 a DEC-06 do SPEC-PROD Secao 9 JA FORAM TOMADAS pelo PO. As seguintes questoes permanecem abertas:

| ID | Pergunta | Opcoes | Recomendacao Tech-Lead | Fonte |
|----|----------|--------|----------------------|-------|
| OQ-CONS-001 | Quais fases na tabela de modelos? | (a) Todas; (b) Apenas fases com IA (3) | **(b) DECIDIDO PO** — apenas Fase 3 (Guia), Fase 4 (Roteiro), Fase 6 (Checklist). | UX OQ-1 |
| OQ-CONS-002 | Tab "Evals" separada ou inline? | (a) Tab separada; (b) Painel inline | **(b) DECIDIDO PO** — painel inline no editor de prompts. | UX OQ-2 |
| OQ-CONS-003 | Kill-switch granular por fase ou global? | (a) Global; (b) Por fase; (c) Ambos | **(c) DECIDIDO PO** — global + por fase coexistem. | UX OQ-3 |
| OQ-CONS-004 | Limite de versoes por template? | (a) Ilimitado; (b) Ultimas N | **(a) DECIDIDO PO** — ilimitado no v1. | UX OQ-4 |
| OQ-CONS-005 | SLA de review para output `escalated`? | (a) 4h; (b) 24h; (c) Sem SLA | **(b) DECIDIDO PO** — 24h sem automacao. | AI OQ-2 |
| OQ-CONS-006 | Gate Trust Score fixo ou configuravel? | (a) Fixo 0.80; (b) Configuravel | **(a) DECIDIDO tech-lead** — fixo 0.80 + Safety 0.90 no v1. PO delegou. | ARCH OQ-3 |
| OQ-CONS-007 | Quem promove prompt em prod? | (a) admin-ai-approver; (b) Novo role | **(a) DECIDIDO PO (DEC-02)** — admin-ai-approver apenas. | AI OQ-1 |
| OQ-CONS-008 | Budget alerta fixo ou configuravel? | (a) Fixo; (b) Configuravel | **(b) DECIDIDO PO** — configuravel, default $100/mes. | UX OQ-8 |
| OQ-CONS-009 | Timeout aceita decimais? | (a) Inteiros; (b) Decimais | **(a) DECIDIDO tech-lead** — inteiros. SPEC-PROD AC-8 + ARCH Int. | QA OQ-2 |
| OQ-CONS-010 | DB indisponivel: fallback hardcoded? | Sim/Nao | **Sim — DECIDIDO tech-lead** — ARCH define HARDCODED_DEFAULTS. | QA OQ-8 |

---

## 6. Inconsistencias entre Specs

### 6.1 CRITICAS — TODAS RESOLVIDAS (2026-04-17)

| # | Inconsistencia | Status | Resolucao |
|---|---------------|--------|-----------|
| INC-01 | SPEC-SEC nao existia | **RESOLVIDO** | SPEC-SEC-AI-GOVERNANCE-V2 criada e aprovada. |
| INC-02 | RBAC divergente entre specs | **RESOLVIDO** | SPEC-ARCH atualizado para `admin-ai` + `admin-ai-approver` desde Wave 1. SPEC-QA atualizado. |
| INC-03 | Trust Score gate divergente | **RESOLVIDO** | Todos os specs agora usam Trust >= 0.80 AND Safety >= 0.90. SPEC-QA e SPEC-RELEASE atualizados. |
| INC-04 | Schema curadoria divergente (AiOutputCuration vs inline) | **RESOLVIDO** | Modelo do Architect adotado (inline no AiInteractionLog). SPEC-RELEASE corrigido. |
| INC-05 | Localizacao dos specs inconsistente | **RESOLVIDO** | PO decidiu: todos os specs em `docs/specs/sprint-45/`. Consistencia alcancada. |

### 6.2 IMPORTANTES (resolver durante implementacao)

| # | Inconsistencia | Specs envolvidos | Recomendacao |
|---|---------------|-----------------|-------------|
| INC-06 | **Retencao de audit log**. PO decide 90 dias (DEC-05). OPS estimava 180 dias. | PROD, OPS, RELEASE | **RESOLVIDO**: 90 dias conforme PO. SPEC-OPS e SPEC-RELEASE atualizados (2026-04-17). |
| INC-07 | **Timeout ranges divergentes**. PO/ARCH: 5s-55s (inteiros). AI-specialist: min/max variam por modelo (Haiku: 10s-45s, Sonnet: 20s-90s, Opus: 25s-120s). | PROD, ARCH, AI | **Adotar range do PO (5s-55s) como hard limit do sistema**. Os ranges por modelo do AI-specialist sao recomendacoes UX (warnings), nao bloqueios. Sonnet a 90s e Opus a 120s ultrapassam o limite Vercel de 60s — impraticavel. |
| INC-08 | **Tabs da UI**. UX: 5 tabs (Dashboard, Prompts, Modelos, Outputs, Evals). PO: nao especifica tabs. PO OQ sobre "Evals" como tab separada. | UX, PROD | **4 tabs no v1**: Dashboard, Prompts, Modelos, Outputs. Evals como painel inline no editor de prompts (ver OQ-CONS-002). |
| INC-09 | **Modelo `AiKillSwitch` existente vs `AiRuntimeConfig.killSwitch.*`**. O projeto ja tem modelo `AiKillSwitch` (Sprint 19+). ARCH propoe kill-switches via `AiRuntimeConfig` (key-value). | ARCH OQ-5 | **Migrar para `AiRuntimeConfig`** para unificar. Descontinuar `AiKillSwitch` em Wave 3. Migration deve copiar dados existentes. |
| INC-10 | **Cache TTL**. PO: configuravel, default 30s (DEC-03, AC-46). ARCH ADR-033: sem cache no MVP (polling direto). AI-specialist: cache TTL <= 10s. OPS: sem cache. | PROD, ARCH, AI, OPS | **Polling direto sem cache no MVP** (ADR-033). O TTL configuravel do PO e um requisito futuro. Implementar quando p99 > 50ms. Nao ha inconsistencia real — ADR-033 e uma decisao de implementacao que atende ao requisito de "proxima chamada usa nova config". |
| INC-11 | **Versao do package.json**. Release-manager fala em v0.59.0 -> v0.60.0. package.json confirma v0.59.0. CLAUDE.md e memories mencionam v0.22.0 (desatualizado). | RELEASE, CLAUDE.md | **package.json esta correto: v0.59.0**. CLAUDE.md e memories devem ser atualizados. Release-manager esta alinhado. |

---

## 7. Proximos Passos — Kickoff Wave 1

### 7.1 Bloqueadores — TODOS RESOLVIDOS

- ~~SPEC-SEC-AI-GOVERNANCE-V2 nao existe~~ → Criada e aprovada (2026-04-17).
- ~~Open questions PO (10 OQs)~~ → 5 resolvidas pelo PO, 5 decididas pelo tech-lead (Secao 5).
- ~~Inconsistencias INC-01 a INC-05~~ → Todas resolvidas (Secao 6.1).
- ~~Specs em locais diferentes~~ → Todos padronizados em `docs/specs/sprint-45/`.

### 7.2 Checklist Pre-Kickoff

| # | Item | Status |
|---|------|--------|
| 1 | 8/8 specs em status Approved | DONE |
| 2 | 10/10 OQs resolvidas (5 PO + 5 tech-lead) | DONE |
| 3 | 5/5 inconsistencias criticas resolvidas | DONE |
| 4 | RBAC `admin-ai` + `admin-ai-approver` alinhado em todos os specs | DONE |
| 5 | Trust gate `Trust >= 0.80 AND Safety >= 0.90` alinhado em todos os specs | DONE |
| 6 | Seed de ModelAssignment definido (3 fases: plan, checklist, guide) | DONE (SPEC-ARCH Secao 8.3) |
| 7 | Task breakdown em docs/tasks.md | PENDENTE — kickoff 2026-04-25 |

### 7.3 Milestones (atualizados 2026-04-17)

| Milestone | Data Alvo | Versao | Status |
|-----------|----------|--------|--------|
| Specs Approved (8/8) | 2026-04-17 | — | DONE |
| Task breakdown + kickoff Wave 1 | 2026-04-25 | — | PROXIMO |
| Wave 1 completa (esqueleto + auth) | 2026-05-02 | v0.60.0 (flag OFF) | — |
| Wave 2 completa (editor prompts) | 2026-05-12 | v0.60.x | — |
| Wave 3 completa (modelo/timeout real-time) | 2026-05-19 | v0.61.0 | — |
| Wave 4 completa (curadoria) | 2026-05-26 | v0.61.x | — |
| Wave 5 completa (eval integrado) | 2026-06-06 | v0.62.0 (flag ON staging) | — |
| Flag ON producao (100%) | 2026-06-13 | v0.62.x | — |

---

## 8. Criterio Go/No-Go para Inicio de Codigo

Todas as condicoes abaixo sao verdadeiras. **GO para kickoff Wave 1 em 2026-04-25.**

- [x] SPEC-PROD-AI-GOVERNANCE-V2 em status **Approved**
- [x] SPEC-ARCH-AI-GOV-V2 em status **Approved**
- [x] SPEC-UX-AI-GOVERNANCE-V2 em status **Approved**
- [x] SPEC-AI-GOVERNANCE-V2 em status **Approved**
- [x] SPEC-QA-AI-GOVERNANCE-V2 em status **Approved**
- [x] SPEC-RELEASE-AI-GOVERNANCE-V2 em status **Approved**
- [x] SPEC-OPS-AI-GOVERNANCE-V2 em status **Approved**
- [x] SPEC-SEC-AI-GOVERNANCE-V2 em status **Approved**
- [x] Todas as 10 open questions resolvidas e documentadas (5 PO + 5 tech-lead)
- [x] Inconsistencias INC-01 a INC-05 resolvidas
- [x] RBAC model (`admin-ai` + `admin-ai-approver`) confirmado e alinhado entre todos os specs
- [x] Trust Score gate definido e alinhado (Trust >= 0.80 AND Safety >= 0.90)
- [x] Seed de ModelAssignment definido (3 fases)
- [ ] Migration Prisma aprovada pelo security-specialist (Wave 1, pre-merge)
- [ ] Task breakdown completo em docs/tasks.md (2026-04-25)

---

## 9. Decisoes Residuais do Tech-Lead (5 OQs nao-criticas)

As 5 OQs abaixo nao foram respondidas pelo PO (delegadas ao tech-lead):

| ID | Decisao | Raciocinio |
|----|---------|------------|
| OQ-TL-001 | **Eval sincrono vs background job**: background job (fire-and-forget com Promise, resultado salvo em `PromptEvalResult`, polled via GET). | Evals podem levar 10-60s. Bloquear a UI e inaceitavel. O admin nao precisa manter a pagina aberta. SPEC-ARCH ja define `POST /eval` retornando 202 Accepted. |
| OQ-TL-002 | **Sunset do modelo `AiKillSwitch` legacy**: migrar dados para `AiRuntimeConfig` na Wave 3 e deprecar o modelo antigo. Nao manter sync entre ambos. | Manter dois modelos de kill-switch e fonte de bugs. A migration deve copiar `AiKillSwitch.isEnabled` para `AiRuntimeConfig.killSwitch.<phase>` e marcar o modelo antigo como deprecated. Remocao definitiva no Sprint 47. |
| OQ-TL-003 | **Retencao AuditLog**: 90 dias hot (PO DEC-05 confirmado). Archival para cold storage no Sprint 50. | 90 dias cobre a maioria dos cenarios de auditoria. Archival nao e MVP. Monitorar volume real. |
| OQ-TL-004 | **Fallback hardcoded — quando remover**: somente apos 2 sprints de estabilidade com flag ON (v0.63.0, estimativa Sprint 47). Requer zero incidentes de fallback em 14 dias consecutivos. | O fallback e a rede de seguranca do sistema. Remover cedo demais e risco desnecessario. |
| OQ-TL-005 | **Canary em prod — mecanismo**: via role `admin-ai` concedido a 10% dos admins na Fase B (nao via header). | Roles sao mais audtaveis que headers. O RBAC ja esta implementado; basta controlar quem recebe o role. Headers exigiriam logica condicional extra no middleware. |

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-17 | tech-lead | Relatorio consolidado inicial — 7 specs revisados, 6 waves planejadas, 10 riscos, 10 decisoes pendentes, 11 inconsistencias identificadas, bloqueador SPEC-SEC identificado |
| 1.1.0 | 2026-04-17 | tech-lead | PO aprovou decisoes (OQ-CONS-001 a 005, 008). SPEC-SEC-AI-GOVERNANCE-V2 criada e aprovada. 5 OQs residuais fechadas pelo tech-lead (OQ-TL-001 a 005). Todas as 5 inconsistencias criticas resolvidas. Propagacao de decisoes aos 6 specs afetados (SPEC-QA, SPEC-RELEASE, SPEC-ARCH, SPEC-UX, SPEC-OPS, SPEC-PROD confirmado). Go/no-go: GO para kickoff Wave 1 em 2026-04-25. |
