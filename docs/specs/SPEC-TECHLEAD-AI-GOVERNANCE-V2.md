# SPEC-TECHLEAD-AI-GOVERNANCE-V2: Relatorio Consolidado — Central de Governanca de IA

**Version**: 1.0.0
**Status**: Draft
**Author**: tech-lead
**Sprint**: 45
**Created**: 2026-04-17
**Last Updated**: 2026-04-17
**Feature Flag**: `AI_GOVERNANCE_V2`

**Specs consolidados**:

| Spec ID | Autor | Localizacao |
|---------|-------|-------------|
| SPEC-PROD-AI-GOVERNANCE-V2 | product-owner | `docs/specs/SPEC-PROD-AI-GOVERNANCE-V2.md` |
| SPEC-ARCH-AI-GOV-V2 | architect | `docs/specs/sprint-45/SPEC-ARCH-AI-GOVERNANCE-V2.md` |
| SPEC-UX-AI-GOVERNANCE-V2 | ux-designer | `docs/specs/SPEC-UX-AI-GOVERNANCE-V2.md` |
| SPEC-AI-GOVERNANCE-V2 | ai-specialist | `docs/specs/SPEC-AI-GOVERNANCE-V2.md` |
| SPEC-QA-AI-GOVERNANCE-V2 | qa-engineer | `docs/specs/SPEC-QA-AI-GOVERNANCE-V2.md` |
| SPEC-RELEASE-AI-GOVERNANCE-V2 | release-manager | `docs/specs/SPEC-RELEASE-AI-GOVERNANCE-V2.md` |
| SPEC-OPS-AI-GOVERNANCE-V2 | devops-engineer | `docs/specs/SPEC-OPS-AI-GOVERNANCE-V2.md` |

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
| R-06 | SPEC-SEC-AI-GOVERNANCE-V2 NAO EXISTE — review de seguranca nao produzida | Alta | Alta | Identificado pelo tech-lead | **BLOQUEADOR**. Spec de seguranca e pre-requisito para implementacao. Convocar security-specialist imediatamente. |
| R-07 | Dessincronia de versao: package.json (0.59.0) vs release-manager (v0.59.0 -> v0.60.0) — OK. Mas v0.22.0 mencionado em CLAUDE.md e memories e MUITO antigo | Media | Alta | RELEASE R6, package.json | package.json confirma v0.59.0. CLAUDE.md e memories desatualizados. Release-manager esta correto: v0.59.0 -> v0.60.0. |
| R-08 | Promptfoo como dependencia — nao esta no projeto atualmente | Media | Media | AI Secao 5, ARCH Secao 10 | Avaliar se Promptfoo ja e dependencia. Se nao, validar licenca (MIT — OK) e adicionar. PromptEvalService wrapper isola vendor. |
| R-09 | Biblioteca de graficos para dashboard de metricas nao definida | Baixa | Alta | UX OQ | Architect deve decidir (Recharts recomendado — MIT, leve, Next.js friendly). |
| R-10 | Editor de prompts — mecanismo de syntax highlighting nao definido | Baixa | Media | UX OQ | Architect deve decidir. Recomendacao: textarea simples com regex highlighting no v1 (evitar Monaco/CodeMirror por bundle size). |

---

## 5. Decisoes Pendentes do PO — Lista Consolidada

As decisoes DEC-01 a DEC-06 do SPEC-PROD Secao 9 JA FORAM TOMADAS pelo PO. As seguintes questoes permanecem abertas:

| ID | Pergunta | Opcoes | Recomendacao Tech-Lead | Fonte |
|----|----------|--------|----------------------|-------|
| OQ-CONS-001 | Quais fases exatamente aparecem na tabela de modelos? Todas as 6 fases ou apenas as que usam IA? | (a) Todas; (b) Apenas fases com IA (guide, plan, checklist = 3) | **(b)** — apenas fases com IA. As 3 fases de AI-spec Secao 1.3 (guide, plan, checklist). Expandir quando novos tipos forem adicionados. | UX OQ-1 |
| OQ-CONS-002 | A tab "Evals" tem tela propria ou e o painel inline do editor de prompts? | (a) Tab separada; (b) Painel inline no editor | **(b)** — painel inline e suficiente para o v1. Tab "Evals" pode ser adicionada na Wave 6 se necessario. Reduz escopo. | UX OQ-2 |
| OQ-CONS-003 | Kill-switch granular por fase ou global? | (a) Global; (b) Por fase; (c) Ambos | **(c)** — PO ja definiu AC-33 com toggle individual por fase; ARCH ja modela `killSwitch.global` + `killSwitch.plan/checklist/guide` no AiRuntimeConfig. Confirmar que PO aceita ambos. | UX OQ-3, ARCH Secao 5.3.1 |
| OQ-CONS-004 | Limite de versoes armazenadas por template? | (a) Ilimitado; (b) Ultimas N versoes | **(a)** — ilimitado no v1. PromptVersion e imutavel e leve. Reavaliar se volume justificar. | UX OQ-4 |
| OQ-CONS-005 | Qual o SLA de review para output `escalated`? | (a) 4h business; (b) 24h; (c) Sem SLA | **(a)** — 4h business conforme sugestao do ai-specialist. Essencial para outputs com risco (R-1, R-3). | AI OQ-2 |
| OQ-CONS-006 | Gate de Trust Score para promocao: fixo 0.80 ou configuravel? | (a) Fixo 0.80; (b) Configuravel via AiRuntimeConfig | **(a)** — fixo 0.80 no v1. Evitar que admin reduza o gate. Reavaliar apos 3 meses de dados. | ARCH OQ-3 |
| OQ-CONS-007 | Quem promove prompt em prod? Apenas `admin-ai-approver`, ou tambem um papel `PROMPT_EDITOR` novo? | (a) admin-ai-approver apenas; (b) Novo PROMPT_EDITOR | **(a)** — PO ja decidiu DEC-02 com admin-ai-approver. Nao criar papel adicional. | AI OQ-1 |
| OQ-CONS-008 | Budget semanal para alerta "custo acima do budget" — fixo ou configuravel? | (a) Fixo; (b) Configuravel pelo admin | **(b)** — configuravel via AiRuntimeConfig com default sensato (ex: $10/semana). | UX OQ-8 |
| OQ-CONS-009 | Timeout aceita decimais (15.5s) ou apenas inteiros? | (a) Apenas inteiros; (b) Decimais | **(a)** — inteiros. SPEC-PROD AC-8 explicita "valores inteiros". ARCH define como `Int` no Prisma. | QA OQ-2 |
| OQ-CONS-010 | DB indisponivel: ModelAssignment (novo) tem fallback hardcoded? | Sim/Nao | **Sim** — ARCH ja define `HARDCODED_DEFAULTS` para plan/checklist/guide. O AiConfigResolver retorna fallback se query falha. Confirmar alinhamento. | QA OQ-8 |

---

## 6. Inconsistencias entre Specs

### 6.1 CRITICAS (devem ser resolvidas antes de aprovacao)

| # | Inconsistencia | Specs envolvidos | Recomendacao |
|---|---------------|-----------------|-------------|
| INC-01 | **SPEC-SEC-AI-GOVERNANCE-V2 NAO EXISTE**. Todos os specs a referenciam como dependencia. A PROD spec lista como "a ser criada". E pre-requisito para implementacao. | Todos | **BLOQUEADOR**. Convocar security-specialist para produzir este spec ANTES de aprovacao. Sem threat model, RBAC review e audit de sanitizacao, nenhum codigo deve ser escrito. |
| INC-02 | **RBAC divergente**. PO decidiu (DEC-01, DEC-02): roles `admin-ai` + `admin-ai-approver` separados. Architect (Secao 7.7): recomenda usar `admin` existente no Sprint 45 e migrar para `admin-ai` no Sprint 46. AI-specialist: assume papel `ADMIN` generico. QA: testes para `admin` generico com nota condicional. | PROD, ARCH, AI, QA | **Alinhar com decisao do PO**: implementar `admin-ai` + `admin-ai-approver` desde a Wave 1. A decisao do PO e explicita e documentada. Architect deve atualizar recomendacao. |
| INC-03 | **Trust Score gate divergente**. AI-specialist: exige TrustScore >= 0.80 **E** Safety >= 0.90 **E** zero critical failures. QA: menciona apenas Trust >= 0.80 globalmente (TC-TRUST-001). PO: menciona apenas Trust >= 0.80 (AC-16). Release-manager: Trust >= 0.85 como criterio go/no-go. | AI, QA, PROD, RELEASE | **Adotar criterio do AI-specialist** (mais rigoroso): Trust >= 0.80 + Safety >= 0.90. O PO definiu o minimo; o AI-specialist adicionou safety sub-gate com justificativa. Release-manager usa 0.85 para baseline existente (diferente do gate de promocao). QA deve atualizar TC-TRUST-001/003. |
| INC-04 | **Schema de curadoria divergente**. Architect: `curationStatus` no `AiInteractionLog` com valores `none/flagged_bias/flagged_hallucination/flagged_risk/approved`. AI-specialist: usa categorias B-1..B-3 (bias), H-1..H-3 (alucinacao), R-1..R-3 (risco) com acoes `reviewed/flagged/escalated`. Release-manager: menciona tabela `AiOutputCuration` separada (nao existe no schema do Architect). | ARCH, AI, RELEASE | **Usar modelo do Architect** (`curationStatus` inline no `AiInteractionLog`). Adicionar `escalated` como status valido. Os criterios detalhados do AI-specialist (B-1..R-3) sao logica de servico, nao schema. Release-manager deve corrigir referencia a `AiOutputCuration`. |
| INC-05 | **Localizacao do SPEC-ARCH**. SPEC-ARCH-AI-GOV-V2 esta em `docs/specs/sprint-45/SPEC-ARCH-AI-GOVERNANCE-V2.md`. Os outros 6 specs estao em `docs/specs/`. | ARCH | **Mover para `docs/specs/SPEC-ARCH-AI-GOV-V2.md`** (raiz). Manter consistencia com os demais. A subpasta `sprint-45/` nao e padrao do projeto. |

### 6.2 IMPORTANTES (resolver durante implementacao)

| # | Inconsistencia | Specs envolvidos | Recomendacao |
|---|---------------|-----------------|-------------|
| INC-06 | **Retencao de audit log**. PO decide 90 dias (DEC-05). OPS estima 180 dias. Release-manager preserva AuditLog no rollback (compliance). | PROD, OPS, RELEASE | **Adotar 90 dias** conforme decisao do PO. OPS deve ajustar. |
| INC-07 | **Timeout ranges divergentes**. PO/ARCH: 5s-55s (inteiros). AI-specialist: min/max variam por modelo (Haiku: 10s-45s, Sonnet: 20s-90s, Opus: 25s-120s). | PROD, ARCH, AI | **Adotar range do PO (5s-55s) como hard limit do sistema**. Os ranges por modelo do AI-specialist sao recomendacoes UX (warnings), nao bloqueios. Sonnet a 90s e Opus a 120s ultrapassam o limite Vercel de 60s — impraticavel. |
| INC-08 | **Tabs da UI**. UX: 5 tabs (Dashboard, Prompts, Modelos, Outputs, Evals). PO: nao especifica tabs. PO OQ sobre "Evals" como tab separada. | UX, PROD | **4 tabs no v1**: Dashboard, Prompts, Modelos, Outputs. Evals como painel inline no editor de prompts (ver OQ-CONS-002). |
| INC-09 | **Modelo `AiKillSwitch` existente vs `AiRuntimeConfig.killSwitch.*`**. O projeto ja tem modelo `AiKillSwitch` (Sprint 19+). ARCH propoe kill-switches via `AiRuntimeConfig` (key-value). | ARCH OQ-5 | **Migrar para `AiRuntimeConfig`** para unificar. Descontinuar `AiKillSwitch` em Wave 3. Migration deve copiar dados existentes. |
| INC-10 | **Cache TTL**. PO: configuravel, default 30s (DEC-03, AC-46). ARCH ADR-033: sem cache no MVP (polling direto). AI-specialist: cache TTL <= 10s. OPS: sem cache. | PROD, ARCH, AI, OPS | **Polling direto sem cache no MVP** (ADR-033). O TTL configuravel do PO e um requisito futuro. Implementar quando p99 > 50ms. Nao ha inconsistencia real — ADR-033 e uma decisao de implementacao que atende ao requisito de "proxima chamada usa nova config". |
| INC-11 | **Versao do package.json**. Release-manager fala em v0.59.0 -> v0.60.0. package.json confirma v0.59.0. CLAUDE.md e memories mencionam v0.22.0 (desatualizado). | RELEASE, CLAUDE.md | **package.json esta correto: v0.59.0**. CLAUDE.md e memories devem ser atualizados. Release-manager esta alinhado. |

---

## 7. Proximos Passos — Ordem de Aprovacao

### 7.1 Bloqueador Imediato

**SPEC-SEC-AI-GOVERNANCE-V2** deve ser produzida pelo security-specialist. Conteudo minimo:
- Threat model para `/admin/ia` (BOLA, privilege escalation, IDOR)
- Review de RBAC: `admin-ai` + `admin-ai-approver`
- Imutabilidade do AuditLog (constraints de DB)
- Sanitizacao de prompts (anti-injection, PII scrub) — co-propriedade com ai-specialist
- Audit de dependencias novas (Promptfoo: MIT)
- CSV formula injection na exportacao de audit log
- LGPD: armazenamento de IP de admin no audit log (ARCH OQ-4)

### 7.2 Fluxo de Aprovacao

| Passo | Acao | Responsavel | Prazo |
|-------|------|------------|-------|
| 1 | Security-specialist produz SPEC-SEC-AI-GOVERNANCE-V2 | security-specialist | D+2 (2026-04-19) |
| 2 | PO resolve as 10 open questions consolidadas (Secao 5) | product-owner | D+3 (2026-04-20) |
| 3 | Architect atualiza SPEC-ARCH: corrige RBAC (INC-02), move spec para raiz (INC-05), confirma timeout 5-55s (INC-07) | architect | D+3 (2026-04-20) |
| 4 | AI-specialist atualiza SPEC-AI: confirma timeout ranges alinhados com PO (INC-07) | ai-specialist | D+3 (2026-04-20) |
| 5 | QA atualiza SPEC-QA: atualiza TC-TRUST com criterio Safety >= 0.90 (INC-03), adiciona testes RBAC admin-ai (INC-02) | qa-engineer | D+4 (2026-04-21) |
| 6 | Release-manager atualiza SPEC-RELEASE: corrige referencia a AiOutputCuration (INC-04) | release-manager | D+3 (2026-04-20) |
| 7 | Tech-lead review de todos os 8 specs atualizados | tech-lead | D+5 (2026-04-22) |
| 8 | Todos os specs movidos para "In Review" | tech-lead | D+5 (2026-04-22) |
| 9 | Cross-review: cada agente revisa os specs dos outros (2 dias) | todos | D+7 (2026-04-24) |
| 10 | Todos os specs movidos para "Approved" | tech-lead | D+7 (2026-04-24) |
| 11 | Task breakdown completo em docs/tasks.md | tech-lead | D+8 (2026-04-25) |
| 12 | **Kickoff Wave 1** | dev-fullstack-1 + dev-fullstack-2 | **D+8 (2026-04-25)** |

### 7.3 Milestones

| Milestone | Data Alvo | Versao |
|-----------|----------|--------|
| Specs Approved (8/8) | 2026-04-24 | — |
| Wave 1 completa (esqueleto + auth) | 2026-05-02 | v0.60.0 (flag OFF) |
| Wave 2 completa (editor prompts) | 2026-05-12 | v0.60.x |
| Wave 3 completa (modelo/timeout real-time) | 2026-05-19 | v0.61.0 |
| Wave 4 completa (curadoria) | 2026-05-26 | v0.61.x |
| Wave 5 completa (eval integrado) | 2026-06-06 | v0.62.0 (flag ON staging) |
| Flag ON producao (100%) | 2026-06-13 | v0.62.x |

---

## 8. Criterio Go/No-Go para Inicio de Codigo

Todas as condicoes abaixo devem ser verdadeiras antes de qualquer linha de codigo ser escrita:

- [ ] SPEC-PROD-AI-GOVERNANCE-V2 em status **Approved**
- [ ] SPEC-ARCH-AI-GOV-V2 em status **Approved**
- [ ] SPEC-UX-AI-GOVERNANCE-V2 em status **Approved**
- [ ] SPEC-AI-GOVERNANCE-V2 em status **Approved**
- [ ] SPEC-QA-AI-GOVERNANCE-V2 em status **Approved**
- [ ] SPEC-RELEASE-AI-GOVERNANCE-V2 em status **Approved**
- [ ] SPEC-OPS-AI-GOVERNANCE-V2 em status **Approved**
- [ ] **SPEC-SEC-AI-GOVERNANCE-V2 em status Approved** (ATUALMENTE NAO EXISTE)
- [ ] Todas as 10 open questions do PO resolvidas e documentadas
- [ ] Inconsistencias INC-01 a INC-05 resolvidas
- [ ] Migration Prisma aprovada pelo security-specialist
- [ ] RBAC model (`admin-ai` + `admin-ai-approver`) confirmado e alinhado entre todos os specs
- [ ] Trust Score gate definido e alinhado (0.80 + Safety >= 0.90)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-17 | tech-lead | Relatorio consolidado inicial — 7 specs revisados, 6 waves planejadas, 10 riscos, 10 decisoes pendentes, 11 inconsistencias identificadas, bloqueador SPEC-SEC identificado |
