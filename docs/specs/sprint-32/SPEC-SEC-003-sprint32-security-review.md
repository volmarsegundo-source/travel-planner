---
spec-id: SPEC-SEC-003
title: Sprint 32 Security Review — Phase Transition, Completion Engine, Report i18n
version: 1.0.0
status: Draft
author: security-specialist
sprint: 32
reviewers: [tech-lead, architect]
---

# SPEC-SEC-003: Sprint 32 Security Review

**Versao**: 1.0.0
**Status**: Draft
**Autor**: security-specialist
**Data**: 2026-03-19
**Sprint**: 32
**Relacionado a**: SPEC-PROD-025, SPEC-PROD-026, SPEC-PROD-027, SPRINT-32-PLAN

---

## 1. Scope

Este documento analisa as implicacoes de seguranca das correcoes P0/P1 planejadas para o Sprint 32 (stabilization). Cobre quatro areas de risco:

1. **Phase Transition Revisit Mode** (P0-001 / SPEC-PROD-025) — novo modo "revisit" no Phase2Wizard e potencial bypass de completude de fase
2. **Completion Engine Status Sync** (P0-002, P0-003 / SPEC-PROD-026) — sincronizacao bidirecional de estados de fase e manipulacao de status
3. **Report i18n** (P1-004 / SPEC-PROD-027) — camada de traducao de enums e exposicao de dados internos
4. **Phase 6 Auto-generation** (UX-006 / P0-007 / SPEC-PROD-026) — auto-geracao de itinerario na primeira visita e rate limiting

### Fora de escopo

- Redesign de fluxo de navegacao (SPEC-PROD-016 — ja implementado)
- Regras de desbloqueio de fases (SPEC-PROD-023)
- Seguranca de dependencias (CVE audit — coberto em sprint review)
- Autenticacao e gestao de sessoes (sem alteracoes neste sprint)

---

## 2. Threat Analysis

### 2.1. STRIDE por Area de Risco

| Area | Threat | STRIDE | Severity | Likelihood |
|------|--------|--------|----------|------------|
| Revisit Mode | Usuario manipula `accessMode` via parametro client-side para ignorar `completePhaseAction` | Tampering / Elevation | **Alta** | Media |
| Revisit Mode | Usuario acessa fase de expedicao alheia via revisit (BOLA) | Elevation | **Critica** | Baixa |
| Revisit Mode | Usuario pula conclusao de fase permanentemente usando revisit mode loop | Tampering | **Media** | Media |
| Completion Sync | Usuario forja request para `togglePhase3ItemAction` com `tripId` de outro usuario (BOLA) | Elevation | **Critica** | Baixa |
| Completion Sync | Usuario manipula `syncPhaseStatus` para marcar fase como completed sem dados reais | Tampering | **Alta** | Baixa |
| Completion Sync | Race condition entre toggle e sync causa estado inconsistente | DoS (data integrity) | **Media** | Media |
| Report i18n | Camada de traducao expoe chaves de enum internas que revelam schema do banco | Information Disclosure | **Baixa** | Media |
| Report i18n | Relatorio acessado por usuario que nao e dono da expedicao (BOLA) | Elevation | **Critica** | Baixa |
| Report i18n | PII exposta no relatorio (data de nascimento exata, bookingCode nao mascarado) | Information Disclosure | **Alta** | Baixa |
| Phase 6 Auto-gen | Usuario faz refresh repetido de Phase 6 para triggerar multiplas chamadas AI (cost attack) | DoS / Cost | **Alta** | Media |
| Phase 6 Auto-gen | `syncPhase6CompletionAction` chamada com `tripId` de outro usuario (BOLA) | Elevation | **Critica** | Baixa |

### 2.2. Attack Surface Summary

O Sprint 32 introduz ou modifica as seguintes superficies de ataque:

- **Nova server action**: `updatePhase2Action` — salva dados sem completar fase. Requer BOLA check.
- **Nova server action**: `syncPhase6CompletionAction` — completa Phase 6 e checa auto-conclusao. Requer BOLA check.
- **Novo metodo**: `PhaseCompletionService.syncPhaseStatus` — recalcula e atualiza status de fase. Chamado internamente; nao deve ser exposto como server action direta.
- **Logica modificada**: `Phase2Wizard.handleSubmit` — condicional baseada em `accessMode`. O `accessMode` DEVE vir de `resolveAccess()` (server-side), nunca de props ou URL.
- **Logica modificada**: `togglePhase3ItemAction` — agora chama `syncPhaseStatus` apos toggle. Ja possui BOLA check via `ChecklistEngine.toggleItem` (confirme: `db.trip.findFirst({ where: { id: tripId, userId } })`).

---

## 3. Findings

### SEC-S32-001: Revisit Mode — `accessMode` deve ser server-authoritative (SEVERIDADE: ALTA)

**Situacao atual**: O `resolveAccess()` em `phase-navigation.engine.ts` (linhas 60-126) e uma funcao pura isomorfica. E usada server-side nos page.tsx das fases para determinar `accessMode`, que e passado como prop ao wizard. O wizard consome `accessMode` como prop (`Phase6Wizard.tsx` linha 38, `Phase2Wizard.tsx`).

**Risco**: Se o fix do P0-001 fizer o `Phase2Wizard` decidir o comportamento de submit baseado em `accessMode` recebido como prop, um atacante poderia, em teoria, manipular o valor via React DevTools ou component injection para forcar `accessMode = "revisit"`, evitando a chamada a `completePhaseAction`. No entanto, como `accessMode` e determinado no server component (page.tsx) e passado como prop SSR, a manipulacao client-side nao teria efeito na leitura inicial — mas poderia afetar a logica de submit se o wizard confia apenas no prop.

**Recomendacao**:
- **[OBRIGATORIO]** O `Phase2Wizard.handleSubmit` DEVE usar `accessMode` como recebido do server component. A prop e confiavel porque e determinada em `page.tsx` por `resolveAccess()` executado server-side com dados do banco.
- **[OBRIGATORIO]** A `updatePhase2Action` (nova) e a `completePhase2Action` (existente) DEVEM ambas verificar BOLA (`trip.userId === session.userId`) independentemente. O server action e o ultimo bastiao de defesa — nao confiar em nenhum dado do client.
- **[RECOMENDADO]** Adicionar log de auditoria quando `accessMode === "revisit"` resulta em chamada a `updatePhase2Action` com dados alterados (permite deteccao de uso anomalo).

**Status do controle existente**: `resolveAccess()` funciona corretamente e determina `accessMode` com base em `completedPhases` (array vindo do banco). O fluxo server component -> prop e seguro para renderizacao inicial. O risco residual e no submit handler, que deve ser defensivo.

---

### SEC-S32-002: Revisit Mode — Bypass de Fase Completion (SEVERIDADE: MEDIA)

**Situacao atual**: O fix propoe que, quando `accessMode === "revisit"` e `completedPhases.includes(2)`, o wizard pule `completePhaseAction` e navegue diretamente (padrao copiado de `DestinationGuideWizard` linha 153).

**Risco**: Um usuario poderia, teoricamente, ficar em loop de revisit sem nunca completar uma fase se o estado inicial de `completedPhases` estiver errado. Porem, `completePhaseAction` e chamada na primeira visita (quando `accessMode === "first_visit"`), e o revisit so ocorre APOS a fase ja ter sido completada. O risco real e de dados desatualizados em `completedPhases`.

**Recomendacao**:
- **[OBRIGATORIO]** O `completedPhases` usado para decidir se e revisit DEVE vir de `resolveAccess()` no server component, que consulta o banco de dados em tempo real. Nunca usar cache client-side stale.
- **[RECOMENDADO]** Para Phase 5->6 especificamente (mencionado no SPRINT-32-PLAN como dependente de `completedPhases` server-rendered que pode estar stale), forcar `revalidatePath` apos completar Phase 5 para garantir que o next server render tem dados frescos.

**Status do controle existente**: O padrao do `DestinationGuideWizard` e seguro quando os dados sao frescos. O risco de dados stale e mitigado pelo `revalidatePath` ja presente em `completePhase5Action`.

---

### SEC-S32-003: BOLA em `togglePhase3ItemAction` (SEVERIDADE: CONFIRMADO SEGURO)

**Situacao atual**: `togglePhase3ItemAction` (expedition.actions.ts:285-309) chama `ChecklistEngine.toggleItem(tripId, session.user.id, 3, itemKey)`. O `ChecklistEngine.toggleItem` (checklist-engine.ts:74-83) faz `db.trip.findFirst({ where: { id: tripId, userId } })` e lanca `ForbiddenError` se nao encontrar.

**Verificacao**: O BOLA check esta PRESENTE e CORRETO. O `userId` vem de `session.user.id` (server-side auth), nao de parametro do client. O `tripId` e o unico parametro controlavel pelo atacante, mas a query garante ownership.

**Recomendacao**:
- **[OBRIGATORIO]** Quando o novo `syncPhaseStatus` for wired apos o toggle (TASK-S32-007), garantir que ele receba `userId` de `session.user.id` (ja disponivel no contexto da action). NAO extrair `userId` do trip ou de qualquer outra fonte.
- **[INFORMATIVO]** Nenhuma acao adicional necessaria para o BOLA check do toggle em si.

---

### SEC-S32-004: BOLA em `syncPhase6CompletionAction` (SEVERIDADE: ALTA — requer implementacao correta)

**Situacao atual**: A `syncPhase6CompletionAction` sera uma NOVA server action (TASK-S32-008). Ainda nao existe no codigo.

**Risco**: Se implementada sem BOLA check, qualquer usuario autenticado poderia completar Phase 6 de qualquer expedicao passando um `tripId` arbitrario.

**Recomendacao**:
- **[OBRIGATORIO]** A action DEVE seguir o padrao de todas as expedition actions: `auth()` -> `session.user.id` -> verificar que `trip.userId === session.user.id` antes de qualquer operacao.
- **[OBRIGATORIO]** O `PhaseEngine.completePhase(tripId, userId, 6)` ja recebe `userId` e faz verificacao interna — manter esse padrao.
- **[OBRIGATORIO]** O `PhaseCompletionService.checkAndCompleteTrip(tripId, userId)` tambem deve verificar ownership.
- **[RECOMENDADO]** Adicionar teste unitario especifico para BOLA violation nesta action.

---

### SEC-S32-005: Completion Engine — `syncPhaseStatus` nao deve ser exposto como server action (SEVERIDADE: MEDIA)

**Situacao atual**: O SPRINT-32-PLAN define `PhaseCompletionService.syncPhaseStatus(tripId, userId, phaseNumber)` como um metodo interno, chamado dentro de outras actions (como `togglePhase3ItemAction`).

**Risco**: Se acidentalmente exportado como server action acessivel pelo client, um atacante poderia manipular o status de qualquer fase para qualquer estado.

**Recomendacao**:
- **[OBRIGATORIO]** `syncPhaseStatus` DEVE ser um metodo de servico (`src/server/services/`), NAO uma server action exportada em `expedition.actions.ts`. Apenas actions que precisam de input do client devem ser server actions.
- **[OBRIGATORIO]** O metodo deve validar `userId` contra o trip ownership internamente (defense in depth), mesmo sendo chamado por actions que ja fizeram BOLA check.
- **[RECOMENDADO]** O metodo deve ser idempotente e nao deve permitir transicoes de estado arbitrarias — apenas recalcular baseado nos dados reais do banco (snapshot evaluation).

---

### SEC-S32-006: Report i18n — Exposicao de enum keys (SEVERIDADE: BAIXA)

**Situacao atual**: O SPEC-PROD-027 (P1-004) requer que valores enum como `"international"`, `"student"`, `"copies_documents"` sejam traduzidos para labels legiveis. A implementacao tipica usa `t(`report.tripType.${tripType}`)` onde `tripType` e o valor do banco.

**Risco**: Se a chave de traducao nao existir no arquivo i18n, bibliotecas como `next-intl` podem retornar a chave bruta (ex: `"report.tripType.international"`), expondo o schema de traducao. Embora nao seja um risco de seguranca critico, pode revelar a estrutura interna do sistema.

**Recomendacao**:
- **[OBRIGATORIO]** Usar um mapa de traducao explicito com fallback seguro: se a chave nao existir, retornar um valor generico como "—" em vez de expor a chave de enum. Exemplo: `ENUM_LABELS[tripType] ?? "—"`.
- **[OBRIGATORIO]** Garantir que todos os valores de enum existentes tenham traducao em ambos os locales (en + pt-BR) antes do merge. Incluir teste que verifica cobertura completa.
- **[INFORMATIVO]** Os enum keys atuais (`international`, `student`, `copies_documents`) nao contem padroes sensiveis (nenhum ID interno, nenhum schema de banco exposto). Risco de information disclosure e baixo.

---

### SEC-S32-007: Report BOLA (SEVERIDADE: CONFIRMADO SEGURO)

**Situacao atual**: `ExpeditionSummaryService.getExpeditionSummary` (expedition-summary.service.ts:117-123) faz BOLA check via `db.trip.findFirst({ where: { id: tripId, userId, deletedAt: null } })`. `ReportGenerationService.generateTripReport` (report-generation.service.ts:133-150) herda o BOLA check do summary service e faz verificacao adicional em `isReportAvailable`.

**Verificacao**: BOLA check esta PRESENTE em ambos os pontos de entrada do relatorio. O `userId` vem de parametro de servico, que por sua vez vem de `session.user.id` na server action ou page.tsx.

**Recomendacao**:
- **[INFORMATIVO]** Nenhuma acao adicional necessaria. Os controles existentes sao adequados.
- **[RECOMENDADO]** Ao adicionar novos campos ao relatorio (AC-012 a AC-017 do SPEC-PROD-027), garantir que nenhum campo novo introduza query sem filtro de `userId`. Revisao de PR deve verificar isso.

---

### SEC-S32-008: Report PII — Data de nascimento e bookingCode (SEVERIDADE: ALTA)

**Situacao atual**: O SPEC-PROD-027 AC-013 define que o relatorio deve exibir "faixa etaria" (ex: "18-25 anos"), NAO a data de nascimento exata. O `ExpeditionSummaryService` ja mascara booking codes (`maskedBookingCode` nos tipos `TransportSummary` e `AccommodationSummary`).

**Risco**: Se a implementacao do AC-013 acidentalmente expuser `birthDate` em vez da faixa calculada, ou se novos campos de Phase 4 no relatorio nao usarem o campo `maskedBookingCode`, dados PII seriam expostos.

**Recomendacao**:
- **[OBRIGATORIO]** A faixa etaria deve ser calculada server-side e o campo `birthDate` nunca deve ser incluido no DTO do relatorio. O tipo `TripReportDTO` nao deve ter campo `birthDate`.
- **[OBRIGATORIO]** Booking codes devem usar o mascaramento existente do `ExpeditionSummaryService` (primeiros e ultimos 2 caracteres). Confirmar que o servico de relatorio consome `maskedBookingCode`, nao o campo criptografado original.
- **[RECOMENDADO]** Adicionar teste que verifica que o DTO retornado por `generateTripReport` nao contem `birthDate` como campo.

---

### SEC-S32-009: Phase 6 Auto-generation — Rate Limiting (SEVERIDADE: ALTA)

**Situacao atual**: A geracao de itinerario usa `acquireGenerationLock` (itinerary-persistence.service.ts:134-142) com Redis `SET NX EX 300` (TTL 300 segundos). Se o lock ja existe, a geracao e rejeitada. A rota `POST /api/ai/plan/stream` (stream/route.ts:117) chama essa funcao.

**Risco com o fix UX-006**: O fix propoe auto-geracao na primeira visita a Phase 6. Se o usuario fizer refresh repetido de Phase 6, cada visita poderia tentar triggerar a geracao. O lock Redis (NX+EX) previne chamadas simultaneas, mas:
1. **Apos TTL (300s)**: O lock expira e uma nova geracao pode ser triggerada. Um usuario persistente poderia gerar custos AI significativos com refresh a cada 5 minutos.
2. **Graceful degradation**: Se Redis falhar (`catch` na linha 118-120 do stream/route.ts), o lock e ignorado (`lockAcquired = true`), permitindo geracao sem protecao.

**Recomendacao**:
- **[OBRIGATORIO]** A auto-geracao no Phase6Wizard DEVE verificar se ja existem `ItineraryDay` records antes de chamar a API de geracao. Se dias ja existem, NAO triggerar geracao automatica — apenas exibir os dados existentes. O usuario pode optar por regenerar explicitamente.
- **[OBRIGATORIO]** Manter o lock Redis (NX+EX 300s) como protecao adicional contra chamadas simultaneas.
- **[RECOMENDADO]** Adicionar rate limiting per-user na rota `/api/ai/plan/stream` (alem do lock per-trip). Limite sugerido: maximo 3 geracoes por hora por usuario. Usar o rate limiter Redis atomico existente (`src/lib/rate-limit.ts`).
- **[RECOMENDADO]** Logar alertas quando um usuario atinge o limite de regeneracao (indicador de possivel abuso ou UX confusa).
- **[INFORMATIVO]** O fallback de `lockAcquired = true` quando Redis falha (graceful degradation) e aceitavel para disponibilidade, mas cria uma janela de risco. Considerar um fallback in-memory para ambientes sem Redis.

---

### SEC-S32-010: Atomicidade da auto-conclusao de expedicao (SEVERIDADE: MEDIA)

**Situacao atual**: O SPEC-PROD-026 AC-011 requer que `trip.status = COMPLETED` seja atualizado automaticamente quando todas as 6 fases sao completadas. O SPRINT-32-PLAN propoe fire-and-forget `PhaseCompletionService.checkAndCompleteTrip`.

**Risco**: Se `checkAndCompleteTrip` falhar silenciosamente (fire-and-forget `.catch()`), o trip.status ficara inconsistente (todas as fases COMPLETED mas trip IN_PROGRESS). Nao e um risco de seguranca direto, mas a inconsistencia pode confundir guards de acesso futuros que dependam de `trip.status`.

**Recomendacao**:
- **[OBRIGATORIO]** A operacao de auto-conclusao (update de `trip.status` + credito de pontos de gamificacao) DEVE ser atomica usando transacao Prisma (`db.$transaction`), conforme exigido pelo SPEC-PROD-026 Constraints/Security.
- **[RECOMENDADO]** Nao usar fire-and-forget para a auto-conclusao. Converter para `await` com retry limitado (max 2 tentativas). Se falhar, logar como erro P0 para investigacao.
- **[INFORMATIVO]** O padrao fire-and-forget com `.catch()` e aceitavel para operacoes nao-criticas (ex: pontos de gamificacao), mas auto-conclusao de expedicao e uma operacao de integridade de dados.

---

## 4. Recommendations

### Acoes Obrigatorias (DEVE ser implementado antes do merge)

| ID | Acao | Responsavel | Ref |
|----|------|-------------|-----|
| SEC-S32-R01 | `updatePhase2Action` deve ter BOLA check (`trip.userId === session.user.id`) | dev-fullstack-1 | SEC-S32-001 |
| SEC-S32-R02 | `syncPhase6CompletionAction` deve ter BOLA check | dev-fullstack-2 | SEC-S32-004 |
| SEC-S32-R03 | `syncPhaseStatus` deve ser metodo de servico, NAO server action | dev-fullstack-1 | SEC-S32-005 |
| SEC-S32-R04 | `syncPhaseStatus` deve validar ownership internamente (defense in depth) | dev-fullstack-1 | SEC-S32-005 |
| SEC-S32-R05 | Mapa de traducao de enums com fallback seguro (nao expor chaves) | dev-fullstack-2 | SEC-S32-006 |
| SEC-S32-R06 | Cobertura completa de traducao para todos os enums em en + pt-BR | dev-fullstack-2 | SEC-S32-006 |
| SEC-S32-R07 | `birthDate` nao deve aparecer no DTO do relatorio — apenas faixa etaria | dev-fullstack-2 | SEC-S32-008 |
| SEC-S32-R08 | Booking codes no relatorio devem usar `maskedBookingCode` | dev-fullstack-2 | SEC-S32-008 |
| SEC-S32-R09 | Phase6Wizard auto-geracao deve verificar existencia de `ItineraryDay` antes de chamar API | dev-fullstack-2 | SEC-S32-009 |
| SEC-S32-R10 | Auto-conclusao de expedicao deve usar `db.$transaction` | dev-fullstack-1 | SEC-S32-010 |

### Acoes Recomendadas (devem ser implementadas neste sprint se possivel)

| ID | Acao | Responsavel | Ref |
|----|------|-------------|-----|
| SEC-S32-R11 | Rate limiting per-user na rota `/api/ai/plan/stream` (max 3/hora) | dev-fullstack-2 | SEC-S32-009 |
| SEC-S32-R12 | Log de auditoria para revisit mode com dados alterados | dev-fullstack-1 | SEC-S32-001 |
| SEC-S32-R13 | Teste unitario para BOLA violation em `syncPhase6CompletionAction` | dev-fullstack-2 | SEC-S32-004 |
| SEC-S32-R14 | Teste que verifica ausencia de `birthDate` no DTO do relatorio | dev-fullstack-2 | SEC-S32-008 |
| SEC-S32-R15 | Converter auto-conclusao de fire-and-forget para `await` com retry | dev-fullstack-1 | SEC-S32-010 |

---

## 5. Approval Criteria

### Pre-merge checklist (security-specialist deve verificar antes de aprovar PR)

- [ ] **BOLA-001**: `updatePhase2Action` inclui `db.trip.findFirst({ where: { id: tripId, userId } })` com `userId` de `session.user.id`
- [ ] **BOLA-002**: `syncPhase6CompletionAction` inclui BOLA check identico
- [ ] **BOLA-003**: `syncPhaseStatus` valida ownership internamente (nao depende do caller)
- [ ] **BOLA-004**: Nenhuma nova query no report service usa `tripId` sem filtro de `userId`
- [ ] **ENCAP-001**: `syncPhaseStatus` NAO e exportado como server action (apenas metodo de servico)
- [ ] **ENCAP-002**: `syncPhaseStatus` recalcula status baseado em snapshot do banco (nao aceita status como parametro)
- [ ] **PII-001**: Nenhum campo `birthDate` no tipo `TripReportDTO` ou retorno de `generateTripReport`
- [ ] **PII-002**: Booking codes no relatorio usam `maskedBookingCode`, nao o campo criptografado
- [ ] **I18N-001**: Fallback seguro para enum keys nao mapeados (retorna "—" ou equivalente, nao a chave)
- [ ] **I18N-002**: Teste verifica cobertura de traducao para todos os valores de enum
- [ ] **RATE-001**: Phase6Wizard verifica existencia de itinerary days antes de auto-gerar
- [ ] **RATE-002**: Lock Redis (NX+EX 300s) continua ativo e funcional
- [ ] **ATOM-001**: Auto-conclusao de expedicao usa `db.$transaction`
- [ ] **NOLEAK-001**: Nenhum stack trace, query SQL ou ID interno exposto em mensagens de erro exibidas ao usuario (verificar as novas mensagens i18n do PhaseEngine)

---

## 6. Change History

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | security-specialist | Documento inicial — revisao de seguranca do Sprint 32, 10 findings, 15 recomendacoes |
