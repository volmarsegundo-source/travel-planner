# SPEC-QA-AI-GOVERNANCE-V2 — Plano de Testes: Central de Governanca de IA

**Spec ID**: SPEC-QA-AI-GOVERNANCE-V2
**Version**: 1.0.0
**Status**: Approved
**Author**: qa-engineer
**Created**: 2026-04-17
**Sprint**: 45
**Reviewers**: tech-lead, product-owner, architect, ai-specialist, security-specialist
**Feature Flag**: `AI_GOVERNANCE_V2`
**Related Specs**: SPEC-PROD-AI-GOVERNANCE-V2 (Approved), SPEC-ARCH-AI-GOV-V2 (Approved), SPEC-SEC-AI-GOVERNANCE-V2 (Approved)

---

## 1. Overview

A Central de Governanca de IA (V2) permite que admins editem prompts, troquem modelo/timeout por fase, rodem evals, curem outputs — tudo com propagacao real-time (polling DB a cada chamada AI, sem deploy). Este plano de testes cobre toda a superficie da feature sob a flag `AI_GOVERNANCE_V2`.

**Componentes sob teste**:
- `PromptRegistryService` — resolucao de templates (DB > inline fallback)
- `ModelAssignment` — atribuicao de modelo/timeout por fase (novo modelo Prisma, pendente SPEC-ARCH)
- `AiGatewayService` — polling de config a cada chamada, enforcement de timeout
- `AiGovernanceDashboardService` — kill-switch, metricas, audit log
- `ai-governance.actions.ts` — Server Actions administrativas (RBAC)
- UI admin (`/admin/ia/*`) — formularios de prompt, modelo, timeout, curadoria
- Eval gate — Promptfoo/Vitest eval com Trust Score >= 0.80

---

## 2. Estrategia de Testes

### 2.1 Piramide de Testes

```
        [E2E — 12 cenarios]           Playwright, admin + usuario comum
       [Integration — 18 casos]       Vitest, DB real (PromptRegistry, ModelAssignment, Gateway)
      [Unit — ~60 casos]              Vitest, mocks (schemas, RBAC, status transitions, validators)
     [Eval — gate 0.80]               Promptfoo/Vitest eval harness
```

### 2.2 Matriz de Camadas

| Camada | Framework | Escopo | Gate |
|--------|-----------|--------|------|
| Unit | Vitest + vitest-mock-extended | Schemas Zod (prompt, timeout, modelo), transicoes draft/active/rollback, validacao de range timeout, RBAC guards, placeholder validation | Pre-merge |
| Integration | Vitest + real Prisma (CI) | `PromptRegistryService.getTemplate()` le DB, fallback quando DB off, `ModelAssignment` polling, audit log escrito em todas as acoes admin | Pre-merge |
| E2E | Playwright (Chromium P0) | Fluxos admin completos, propagacao real-time, RBAC 403 | Pre-merge (P0), nightly (full) |
| Eval | Vitest eval harness + datasets | Trust Score gate >= 0.80 AND Safety >= 0.90 em todas as dimensoes antes de promover prompt | Pre-merge |

### 2.3 Avaliacao de Risco

| Area de Risco | Probabilidade | Impacto | Prioridade |
|---------------|---------------|---------|------------|
| Prompt promovido sem eval adequado degrada qualidade AI | Media | Critico | P0 |
| Mudanca de modelo nao propaga real-time (cache stale) | Alta | Alto | P0 |
| Admin sem autorizacao acessa painel | Baixa | Critico | P0 |
| Timeout incorreto causa abort prematuro ou travamento | Media | Alto | P0 |
| Kill-switch nao cai em fallback graceful | Baixa | Critico | P0 |
| DB indisponivel e AI para de funcionar (sem fallback) | Baixa | Critico | P0 |
| Audit log nao registra identidade do admin | Media | Alto | P1 |
| Soma timeout primario+fallback excede limite | Media | Medio | P1 |
| Prompt com placeholder faltando e promovido | Baixa | Alto | P1 |
| Rate limit de edicoes admin nao funciona | Baixa | Medio | P2 |

### 2.4 Cobertura Alvo

- **Unit**: >= 80% de cobertura de linhas nos modulos novos
- **E2E**: 100% dos fluxos criticos (12 cenarios P0/P1)
- **Eval**: Trust Score >= 0.80 em todas as dimensoes

---

## 3. Cenarios E2E (Given/When/Then)

### QA-S45-001: Ciclo completo de prompt — draft, editar, eval, promover, rollback
**Prioridade**: P0
**Persona**: @admin

**Given** admin autenticado na Central de Governanca `/admin/ia`
**And** prompt "destination-guide" ativo com versao "2.1.0"
**When** admin cria novo prompt draft para "destination-guide" com versao "2.2.0"
**And** admin edita o conteudo do draft (altera system prompt)
**And** admin clica "Rodar Eval" no draft
**Then** eval executa (mock Promptfoo se indisponivel) e retorna Trust Score
**When** Trust Score >= 0.80 em todas as dimensoes
**And** admin clica "Promover para Ativo"
**Then** draft muda status para "active"
**And** versao anterior "2.1.0" muda para "inactive"
**And** audit log registra: acao "promote", admin ID, timestamp, versao anterior e nova
**When** admin clica "Rollback" na versao "2.2.0"
**Then** versao "2.1.0" volta a ser "active"
**And** versao "2.2.0" volta para "inactive"
**And** audit log registra: acao "rollback", admin ID, timestamp

---

### QA-S45-002: Promocao bloqueada por Trust Score insuficiente
**Prioridade**: P0
**Persona**: @admin

**Given** admin autenticado na Central de Governanca
**And** prompt draft com eval executado e Trust Score = 0.72 (abaixo do gate 0.80)
**When** admin tenta clicar "Promover para Ativo"
**Then** botao esta desabilitado OU exibe mensagem de erro
**And** mensagem exibe: "Trust Score insuficiente: 0.72 (minimo: 0.80)"
**And** status permanece "draft"
**And** nenhuma alteracao no prompt ativo

---

### QA-S45-003: Troca de modelo com propagacao real-time
**Prioridade**: P0
**Persona**: @admin + @usuario-comum

**Given** admin autenticado na Central de Governanca
**And** Fase 3 (Guia do Destino) configurada com modelo "gemini-2.0-flash"
**When** admin altera modelo da Fase 3 para "claude-haiku-4-5-20250514"
**And** admin salva a configuracao
**Then** audit log registra: acao "model_change", fase "guide", modelo anterior, modelo novo, admin ID
**When** usuario comum (outra sessao) gera Guia do Destino imediatamente (sem redeploy)
**Then** `AiInteractionLog` registra `provider=claude`, `model=claude-haiku-4-5-20250514`
**And** `/admin/ia/outputs` (ou pagina equivalente) exibe a chamada com provider=Haiku 4.5
**And** guia e gerado com sucesso (conteudo valido)

---

### QA-S45-004: Alteracao de timeout com validacao
**Prioridade**: P0
**Persona**: @admin + @usuario-comum

**Given** admin autenticado na Central de Governanca
**And** timeout da Fase 3 configurado em 30s
**When** admin altera timeout para 15s
**And** admin salva
**Then** configuracao salva com sucesso
**And** audit log registra alteracao de timeout
**When** usuario comum gera Guia do Destino
**And** geracao leva mais de 15s
**Then** requisicao e abortada em 15s (+/- 1s de tolerancia)
**And** usuario recebe mensagem de erro de timeout
**When** admin reverte timeout para 30s
**Then** proxima geracao usa timeout de 30s

---

### QA-S45-005: Rejeicao de timeout abaixo do minimo (3s < 5s)
**Prioridade**: P0
**Persona**: @admin

**Given** admin autenticado na Central de Governanca
**When** admin tenta definir timeout da Fase 3 como 3s (abaixo do minimo 5s)
**And** admin tenta salvar
**Then** validacao rejeita com mensagem "Timeout minimo: 5 segundos"
**And** configuracao NAO e salva
**And** timeout anterior permanece ativo

---

### QA-S45-006: Rejeicao de timeout acima do maximo (60s > 55s)
**Prioridade**: P0
**Persona**: @admin

**Given** admin autenticado na Central de Governanca
**When** admin tenta definir timeout da Fase 3 como 60s (acima do maximo 55s)
**And** admin tenta salvar
**Then** validacao rejeita com mensagem "Timeout maximo: 55 segundos"
**And** configuracao NAO e salva

---

### QA-S45-007: Rejeicao de soma timeout primario+fallback
**Prioridade**: P1
**Persona**: @admin

**Given** admin autenticado na Central de Governanca
**And** timeout primario = 30s, timeout fallback = 30s (soma = 60s)
**When** admin tenta salvar esta configuracao
**Then** validacao rejeita com mensagem indicando que a soma excede o maximo permitido
**And** configuracao NAO e salva

---

### QA-S45-008: RBAC — nao-admin recebe 403
**Prioridade**: P0
**Persona**: @usuario-comum

**Given** usuario com role "user" autenticado
**When** usuario tenta acessar `/admin/ia`
**Then** resposta e 403 (Forbidden) ou redirect para pagina de acesso negado
**When** usuario tenta chamar `toggleKillSwitchAction` diretamente via Server Action
**Then** retorna `{ success: false, error: "errors.unauthorized" }`
**When** usuario tenta chamar acoes de edicao de prompt, modelo, ou timeout
**Then** todas retornam 403 ou erro de autorizacao
**And** nenhum audit log e criado (acao rejeitada antes do logging)

---

### QA-S45-009: Curadoria — flag de bias em output
**Prioridade**: P1
**Persona**: @admin-curador

**Given** admin autenticado na Central de Governanca, aba de outputs
**And** lista de outputs de AI gerados recentemente
**When** admin seleciona um output e marca flag "bias"
**Then** output e flagado no DB com tipo "bias", admin ID e timestamp
**And** audit log registra: acao "flag_output", tipo "bias", output ID, admin ID
**When** admin filtra outputs por flag "bias"
**Then** apenas outputs flagados como "bias" aparecem na lista
**And** contagem de resultados e exibida corretamente

---

### QA-S45-010: Kill-switch ativado — fallback hardcoded
**Prioridade**: P0
**Persona**: @admin + @usuario-comum

**Given** admin autenticado na Central de Governanca
**When** admin ativa kill-switch para fase "guide" com razao "Teste de fallback"
**Then** `AiKillSwitch` para fase "guide" tem `isEnabled=true`
**And** audit log registra ativacao com admin ID e razao
**When** usuario comum tenta gerar Guia do Destino
**Then** chamada AI e bloqueada pelo `PolicyEngine`
**And** sistema cai em fallback hardcoded (`INLINE_TEMPLATES["destination-guide"]` do `PromptRegistryService`)
**And** usuario recebe resposta graceful (erro amigavel ou conteudo fallback)
**And** `AiInteractionLog` registra `status=blocked`, `errorCode=kill_switch`
**When** admin desativa kill-switch
**Then** proxima geracao usa provider configurado normalmente

---

### QA-S45-011: DB indisponivel — fallback hardcoded + alerta Sentry
**Prioridade**: P0
**Persona**: @usuario-comum

**Given** feature flag `AI_GOVERNANCE_V2` ativo
**And** DB indisponivel (simulado via mock de conexao ou teste de integracao)
**When** usuario tenta gerar Guia do Destino
**Then** `PromptRegistryService.getTemplate()` falha no passo DB
**And** fallback usa `INLINE_TEMPLATES` hardcoded
**And** geracao AI funciona normalmente com template inline
**And** logger.warn registra "prompt-registry.db.error"
**And** Sentry (ou equivalente) recebe alerta de DB indisponivel

---

### QA-S45-012: Cenario real-time completo (conforme PO solicitou)
**Prioridade**: P0
**Persona**: @admin + @usuario-comum

**Passos detalhados**:

1. **Login admin**: admin autentica com credenciais de teste (`admin@travel.dev` / `Admin@1234`)
2. **Navegar**: admin acessa `/admin/ia` (Central de Governanca)
3. **Alterar modelo Fase 3**: admin seleciona Fase 3 (Guia do Destino), troca modelo de Gemini para "claude-haiku-4-5-20250514", salva
4. **Verificar audit**: audit log mostra entrada com acao "model_change", admin ID, modelo anterior e novo
5. **Gerar como usuario**: em outra sessao (ou aba anonima), login como `testuser@travel.dev`, navegar ate Fase 3 de uma expedicao existente, gerar Guia
6. **Validar log**: voltar ao admin, verificar em `/admin/ia/outputs` (ou equivalente) que a chamada registra `provider=claude`, `model=claude-haiku-4-5-20250514`
7. **Alterar timeout**: admin volta a configuracao, troca timeout de 30s para 15s, salva
8. **Gerar novamente**: usuario gera outro Guia
9. **Validar abort**: se geracao exceder 15s, deve ser abortada em <= 16s (tolerancia de 1s)
10. **Reverter configs**: admin reverte modelo para Gemini original, reverte timeout para 30s
11. **Confirmar reversao**: verificar que audit log registra ambas as reversoes
12. **Validar normalidade**: gerar Guia novamente, confirmar que usa modelo e timeout originais

---

## 4. Testes de Regressao

### 4.1 Fluxos AI existentes devem continuar funcionando

| TC# | Descricao | Prioridade |
|-----|-----------|------------|
| TC-REG-001 | Geracao de Guia (Fase 3) com configs default produz conteudo valido | P0 |
| TC-REG-002 | Geracao de Roteiro (Fase 4) com configs default produz itinerario valido | P0 |
| TC-REG-003 | Geracao de Checklist (Fase 6) com configs default produz checklist valido | P0 |
| TC-REG-004 | Streaming de Guia (`/api/ai/guide/stream`) funciona sem regressao | P0 |
| TC-REG-005 | Streaming de Roteiro (`/api/ai/plan/stream`) funciona sem regressao | P0 |
| TC-REG-006 | `PromptRegistryService.getTemplate()` com cache TTL 5min funciona corretamente | P1 |

### 4.2 Performance — overhead do polling

| TC# | Metrica | Target | Metodo |
|-----|---------|--------|--------|
| TC-PERF-001 | Overhead do polling DB por chamada AI | +5-20ms (max) | Vitest timer, medir delta com/sem polling |
| TC-PERF-002 | Latencia total da chamada AI com polling | <= timeout configurado | E2E timing assertions |
| TC-PERF-003 | Cache hit rate do `PromptRegistryService` | >= 80% em carga normal | Log analysis |

### 4.3 Prompt invalido rejeitado no save

| TC# | Descricao | Prioridade |
|-----|-----------|------------|
| TC-REG-007 | Prompt com placeholder `{destination}` faltando e rejeitado no save com erro claro | P0 |
| TC-REG-008 | Prompt rejeitado no save NAO chega a ser promovido | P0 |
| TC-REG-009 | Prompt com caracteres especiais/unicode salva e renderiza corretamente | P1 |

### 4.4 Suites de regressao existentes

| Area | Suite de Teste | Razao do risco |
|------|---------------|----------------|
| AI Gateway | `tests/unit/server/ai-gateway.service.test.ts` | Polling de config adicionado ao executor |
| Prompt Registry | `tests/unit/server/prompt-registry.service.test.ts` | Cache invalidation pode quebrar |
| Policy Engine | `tests/unit/server/ai-governance/policy-engine.test.ts` | Novas policies adicionadas |
| Kill Switch | `tests/unit/server/ai-governance/kill-switch.policy.test.ts` | Interacao com fallback |
| AI Actions | `tests/unit/server/ai.actions.test.ts` | Server Actions existentes |
| Injection Guard | `tests/evals/injection-resistance.eval.ts` | Novos prompts devem manter resistencia |

---

## 5. Testes de Permissao (RBAC)

| TC# | Role | Acao | Resultado Esperado | Prioridade |
|-----|------|------|--------------------|------------|
| TC-RBAC-001 | `user` | GET `/admin/ia` | 403 Forbidden | P0 |
| TC-RBAC-002 | `user` | POST criar prompt draft | 403 Forbidden | P0 |
| TC-RBAC-003 | `user` | POST promover prompt | 403 Forbidden | P0 |
| TC-RBAC-004 | `user` | POST alterar modelo/timeout | 403 Forbidden | P0 |
| TC-RBAC-005 | `user` | POST toggleKillSwitch | `{ success: false, error: "errors.unauthorized" }` | P0 |
| TC-RBAC-006 | `user` | POST flagar output | 403 Forbidden | P0 |
| TC-RBAC-007 | `user` | GET `/admin/ia/outputs` | 403 Forbidden | P0 |
| TC-RBAC-008 | `admin` | Todas as acoes acima | Sucesso (200/201) | P0 |
| TC-RBAC-009 | `admin` | Toda acao gera audit log com `adminId` | Audit log com identidade | P0 |
| TC-RBAC-010 | Sem sessao | Qualquer rota `/admin/ia/*` | Redirect para login ou 401 | P0 |

**Nota**: PO decidiu por roles granulares `admin-ai` + `admin-ai-approver` (DEC-01/DEC-02 em SPEC-PROD). TC-RBAC-008 deve validar `admin-ai` (nao `admin` generico). Adicionar testes para `admin` sem escopo AI recebendo 403.

---

## 6. Testes de Boundary

### 6.1 Timeout

| TC# | Valor | Resultado Esperado | Prioridade |
|-----|-------|--------------------|------------|
| TC-BND-001 | 4s | Rejeita — "Timeout minimo: 5 segundos" | P0 |
| TC-BND-002 | 5s | Aceita | P0 |
| TC-BND-003 | 55s | Aceita | P0 |
| TC-BND-004 | 56s | Rejeita — "Timeout maximo: 55 segundos" | P0 |
| TC-BND-005 | 0s | Rejeita — abaixo do minimo | P1 |
| TC-BND-006 | -1s | Rejeita — valor invalido | P1 |
| TC-BND-007 | 30.5s (decimal) | Rejeita — apenas valores inteiros aceitos (SPEC-PROD AC-8, SPEC-ARCH Int) | P1 |

### 6.2 Rate Limit de Edicoes Admin

| TC# | Cenario | Resultado Esperado | Prioridade |
|-----|---------|--------------------|-----------| 
| TC-BND-008 | Admin faz 10 edicoes em 1 hora | Todas aceitas | P1 |
| TC-BND-009 | Admin tenta 11a edicao dentro da mesma hora | Rejeitada com 429 Too Many Requests | P1 |
| TC-BND-010 | Apos 1 hora, admin faz nova edicao | Aceita (janela resetou) | P1 |

### 6.3 Tamanho do Prompt

| TC# | Cenario | Resultado Esperado | Prioridade |
|-----|---------|--------------------|-----------| 
| TC-BND-011 | Prompt com tamanho <= max tokens configurado | Aceita | P0 |
| TC-BND-012 | Prompt com tamanho > max tokens configurado | Rejeita com mensagem "Prompt excede limite de N tokens" | P0 |
| TC-BND-013 | Prompt vazio | Rejeita — "Prompt nao pode estar vazio" | P0 |

### 6.4 Placeholder Validation

| TC# | Cenario | Resultado Esperado | Prioridade |
|-----|---------|--------------------|-----------| 
| TC-BND-014 | Prompt para "destination-guide" sem placeholder `{destination}` | Rejeita — "Placeholder obrigatorio faltando: {destination}" | P0 |
| TC-BND-015 | Prompt para "travel-plan" sem `{days}` ou `{destination}` | Rejeita — lista placeholders faltando | P0 |
| TC-BND-016 | Prompt com todos os placeholders obrigatorios | Aceita | P0 |

---

## 7. Trust Score Gate — Conformidade

### 7.1 Regras de Promocao

| TC# | Cenario | Resultado Esperado | Prioridade |
|-----|---------|--------------------|-----------| 
| TC-TRUST-001 | Prompt draft com Trust Score global >= 0.80 AND Safety >= 0.90, todas dimensoes >= threshold individual | Promocao permitida | P0 |
| TC-TRUST-002 | Prompt draft com Trust Score global = 0.79 | Promocao bloqueada | P0 |
| TC-TRUST-003 | Prompt draft com Trust Score global = 0.85 mas Safety = 0.88 (abaixo de 0.90) | Promocao bloqueada (Safety sub-gate falhou) | P0 |
| TC-TRUST-004 | Prompt draft sem eval executado | Promocao bloqueada — "Execute eval antes de promover" | P0 |
| TC-TRUST-005 | Rollback de prompt ativo para versao anterior | Rollback NAO dispara eval novamente | P1 |
| TC-TRUST-006 | Versao anterior do prompt ja tinha trust registrado | Trust Score da versao anterior e exibido na UI | P1 |

### 7.2 Datasets de Eval Obrigatorios

Os seguintes datasets devem ser executados no eval gate antes de promocao:

| Dataset | Localizacao | Threshold Minimo |
|---------|-------------|-----------------|
| `itinerary-quality` | `docs/evals/datasets/itinerary-quality.json` | 0.80 |
| `guide-accuracy` | `docs/evals/datasets/guide-accuracy.json` | 0.80 |
| `injection-resistance` | `docs/evals/datasets/injection-resistance.json` | 0.90 |
| `i18n-completeness` | `docs/evals/datasets/i18n-completeness.json` | 0.85 |
| `checklist-quality` | `docs/evals/datasets/checklist-quality.json` | 0.80 |

---

## 8. Cenario E2E Critico de Real-Time (detalhado)

**ID**: QA-S45-012 (referenciado na secao 3)

Este cenario e o teste de aceitacao principal da feature conforme solicitado pelo PO. Deve ser automatizado em Playwright com duas sessoes de browser (admin + usuario).

### Pre-condicoes
- Feature flag `AI_GOVERNANCE_V2` ativo
- Admin: `admin@travel.dev` / `Admin@1234`
- Usuario: `testuser@travel.dev` / `Test@1234`
- Expedicao existente para o usuario em `currentPhase >= 3` (Guia)
- Modelo original da Fase 3: Gemini (qualquer variante)
- Timeout original da Fase 3: 30s

### Passos

| Passo | Ator | Acao | Verificacao |
|-------|------|------|-------------|
| 1 | Admin | Login em `/auth/login` | Redirect para dashboard |
| 2 | Admin | Navegar para `/admin/ia` | Pagina carrega, lista fases com configs atuais |
| 3 | Admin | Selecionar Fase 3 (Guia), alterar modelo para "claude-haiku-4-5-20250514", salvar | Toast de sucesso, audit log com `action=model_change` |
| 4 | Admin | Verificar audit log na UI | Entrada visivel com admin ID, modelo anterior/novo, timestamp |
| 5 | Usuario | Login em `/auth/login` (outra sessao Playwright) | Redirect para dashboard |
| 6 | Usuario | Navegar para expedicao, acessar Fase 3, gerar Guia | Guia gerado com sucesso |
| 7 | Admin | Verificar `/admin/ia/outputs` | Chamada registrada com `provider=claude`, `model=claude-haiku-4-5-20250514` |
| 8 | Admin | Voltar a config, alterar timeout de 30s para 15s, salvar | Toast de sucesso, audit log com `action=timeout_change` |
| 9 | Usuario | Gerar Guia novamente | Se latencia > 15s, abort em <= 16s |
| 10 | Admin | Reverter modelo para Gemini original, salvar | Audit log registra reversao |
| 11 | Admin | Reverter timeout para 30s, salvar | Audit log registra reversao |
| 12 | Usuario | Gerar Guia pela terceira vez | Guia usa modelo e timeout originais, `AiInteractionLog` confirma |

### Criterios de Aprovacao
- [ ] Todas as 12 etapas executam sem erro
- [ ] Propagacao real-time confirmada (sem redeploy entre passos 3 e 6)
- [ ] Audit log completo com 4 entradas (model_change, timeout_change, model_revert, timeout_revert)
- [ ] `AiInteractionLog` para passos 6 e 12 mostra providers diferentes
- [ ] Tempo de abort no passo 9 <= 16s (se aplicavel)

---

## 9. Dados de Teste & Fixtures

| Dado | Fonte | Notas |
|------|-------|-------|
| Admin | `admin@travel.dev` / `Admin@1234` | Seed via `npm run dev:users` — NUNCA dados reais |
| Usuario | `testuser@travel.dev` / `Test@1234` | Dominio `@travel.dev` (sintetico) |
| Expedicao | `tests/fixtures/trips.ts` | Expedicao em `currentPhase=3` com destino preenchido |
| Prompt draft | Fixture JSON inline no teste | System prompt sintetico com placeholders obrigatorios |
| Prompt invalido | Fixture JSON inline | Prompt sem placeholder `{destination}` |
| Modelo | `claude-haiku-4-5-20250514` / `gemini-2.0-flash` | Modelos reais do projeto |
| Timeout | 5, 15, 30, 55 (validos); 3, 56, 60, -1 (invalidos) | Boundaries |
| Kill-switch | `AiKillSwitch` fase "guide" | Toggle ON/OFF |
| Trust Score mock | `{ global: 0.85, dimensions: {...} }` | Para testes de gate |

**Nota sobre PII**: Todos os dados de teste sao sinteticos. Nenhum dado real de usuario, email, ou cartao de pagamento e utilizado. Dominio de email: `@playwright.invalid` para E2E, `@travel.dev` para fixtures de seed.

---

## 10. CI/CD Gates

| Gate | Condicao | Bloqueia Merge? |
|------|----------|-----------------|
| Unit tests | Todos passam, cobertura >= 80% nos modulos novos | Sim |
| Integration tests | Todos passam (CI com Postgres) | Sim |
| E2E P0 | QA-S45-001 a QA-S45-006, QA-S45-008, QA-S45-010, QA-S45-011, QA-S45-012 passam | Sim |
| Eval gate | Trust Score >= 0.80 global, todas dimensoes >= threshold individual | Sim |
| Eval drift | Drift < 10% vs baseline | Sim (alerta, nao bloqueia se < 15%) |
| Linting | ESLint clean | Sim |
| Type check | `tsc --noEmit` clean | Sim |

---

## 11. Localizacao de Testes (proposta)

| Tipo | Arquivo | Escopo |
|------|---------|--------|
| Unit | `tests/unit/lib/validations/ai-governance.schema.test.ts` | Schemas Zod: timeout range, prompt size, placeholder validation |
| Unit | `tests/unit/server/ai-governance.actions.test.ts` | RBAC guards, status transitions (draft/active/rollback) |
| Unit | `tests/unit/server/model-assignment.test.ts` | ModelAssignment CRUD, validacao de modelo/fase |
| Integration | `tests/integration/prompt-registry-db.test.ts` | `getTemplate()` com DB real, fallback, cache |
| Integration | `tests/integration/ai-gateway-polling.test.ts` | Polling de config, timeout enforcement |
| Integration | `tests/integration/audit-log.test.ts` | Audit log registra identidade em todas as acoes |
| E2E | `tests/e2e/ai-governance.spec.ts` | Cenarios QA-S45-001 a QA-S45-012 |
| Eval | `tests/evals/prompt-governance.eval.ts` | Trust Score gate para novos prompts |

---

## 12. Open Questions

| # | Questao | Responsavel | Impacto |
|---|---------|-------------|---------|
| OQ-1 | `ModelAssignment` e um novo modelo Prisma ou extensao do `PromptTemplate`? | architect | Define estrutura dos testes de integracao |
| OQ-2 | Timeout aceita decimais (ex: 15.5s) ou apenas inteiros? | architect | TC-BND-007 |
| OQ-3 | RBAC granular (`admin-ai`) ou `admin` generico? | product-owner | TC-RBAC, pode adicionar 3-5 testes extras |
| OQ-4 | Soma maxima de timeout primario+fallback? PO mencionou 60s como limite — confirmar valor exato | product-owner | QA-S45-007 |
| OQ-5 | "Rodar Eval" no admin usa Promptfoo real ou mock? Se mock, qual o formato de retorno? | architect, ai-specialist | QA-S45-001, QA-S45-002 |
| OQ-6 | Curadoria de outputs: quais tipos de flag alem de "bias"? ("hallucination", "pii-leak", etc.) | product-owner | QA-S45-009 |
| OQ-7 | Qual e o threshold individual por dimensao de eval? Mesmo 0.80 para todas, ou variam? (injection-resistance = 0.90?) | tech-lead, ai-specialist | TC-TRUST-003 |
| OQ-8 | DB indisponivel: `AiGatewayService` deve continuar funcionando com fallback ou falhar gracefully? Atualmente `PromptRegistryService` faz fallback, mas `ModelAssignment` (novo) pode nao ter fallback | architect | QA-S45-011 |
| OQ-9 | Rate limit de 10 edicoes/hora/admin — confirmar se e por admin individual ou global | product-owner | TC-BND-008/009 |
| OQ-10 | Feature flag `AI_GOVERNANCE_V2`: quando desligado, admin NEM vê o menu `/admin/ia` ou ve versao V1? | product-owner | Impacta setup de todos os E2E |

---

## 13. Change History

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-04-17 | 1.0.0 | Criacao do plano de testes | qa-engineer |
