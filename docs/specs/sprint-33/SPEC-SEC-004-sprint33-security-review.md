---
spec-id: SPEC-SEC-004
title: Sprint 33 Security Review — OAuth, Save/Discard, Phase 4 Mandatory, Summary, Migration
version: 1.0.0
status: Draft
author: security-specialist
sprint: 33
reviewers: [tech-lead, architect]
---

# SPEC-SEC-004: Sprint 33 Security Review

**Versao**: 1.0.0
**Status**: Draft
**Autor**: security-specialist
**Data**: 2026-03-20
**Sprint**: 33
**Relacionado a**: SPRINT-33-PLAN

---

## 1. Scope

Este documento analisa as implicacoes de seguranca das features planejadas para o Sprint 33. Cobre cinco areas de risco:

1. **OAuth Social Login (Google/Apple)** — CSRF, token validation, account linking
2. **Save/Discard Dialog (Footer)** — prevencao de perda de dados, dialog de confirmacao
3. **Phase 4 Mandatory Fields** — validacao server-side de campos obrigatorios
4. **Summary Report** — BOLA check, prevencao de vazamento de PII
5. **Data Migration Script** — idempotencia, audit logging

### Fora de escopo

- Autenticacao por Credentials (sem alteracoes neste sprint)
- Rate limiting de endpoints existentes (sem alteracoes)
- Seguranca de dependencias (CVE audit — coberto em sprint review)

---

## 2. Threat Analysis

### 2.1. STRIDE por Area de Risco

| Area | Threat | STRIDE | Severity | Likelihood |
|------|--------|--------|----------|------------|
| OAuth | Account takeover via email matching sem verificacao de ownership | Elevation / Spoofing | **Critica** | Media |
| OAuth | CSRF no fluxo de callback OAuth | Tampering | **Alta** | Media |
| OAuth | Token replay — reutilizacao de authorization code | Tampering / Replay | **Alta** | Baixa |
| OAuth | Open redirect via `callbackUrl` manipulado | Tampering | **Media** | Media |
| Save/Discard | Navegacao acidental causa perda de dados nao salvos | DoS (data integrity) | **Media** | Alta |
| Save/Discard | Dialog bypass via manipulacao de URL direta (history.pushState) | Tampering | **Baixa** | Baixa |
| Phase 4 Mandatory | Campos obrigatorios validados apenas client-side, bypass via API direta | Tampering | **Alta** | Media |
| Phase 4 Mandatory | Mass assignment — campos extras injetados no payload de Phase 4 | Tampering | **Media** | Baixa |
| Summary Report | BOLA — acesso ao relatorio de outro usuario | Elevation | **Critica** | Baixa |
| Summary Report | PII leakage — birthDate exata ou bookingCode nao mascarado no relatorio | Information Disclosure | **Alta** | Baixa |
| Summary Report | Idade calculada expoe data de nascimento por inferencia (dia+mes) | Information Disclosure | **Baixa** | Baixa |
| Migration Script | Execucao dupla corrompe dados (nao idempotente) | Tampering / DoS | **Alta** | Media |
| Migration Script | Execucao sem audit trail impede forensics | Repudiation | **Media** | Media |

### 2.2. Attack Surface Summary

O Sprint 33 introduz ou modifica as seguintes superficies de ataque:

- **Novo endpoint OAuth**: Callbacks para Google e Apple OAuth via Auth.js v5. Requer `state` parameter CSRF e validacao de `id_token`.
- **Novo componente**: `SaveDiscardDialog` — dialog de confirmacao antes de navegacao com dados nao salvos.
- **Logica modificada**: Phase 4 server actions — campos obrigatorios agora validados server-side via Zod.
- **Logica modificada**: Summary report — novos campos de Phase 3-5 adicionados ao DTO.
- **Novo script**: Migration script para normalizar dados existentes apos mudancas de schema.

---

## 3. Findings

### SEC-S33-001: OAuth — Account Linking via Email Match (SEVERIDADE: CRITICA)

**Risco**: Quando um usuario faz login via Google com email `user@example.com` e ja existe uma conta com Credentials usando o mesmo email, o sistema pode automaticamente linkar as contas. Um atacante que controla um email (ex: via Google Workspace compromisso) poderia assumir a conta Credentials de outra pessoa.

**Recomendacao**:
- **[OBRIGATORIO]** Account linking so deve ocorrer se:
  1. O email do provider OAuth foi verificado (`email_verified: true` no token)
  2. A conta existente tem `emailVerified !== null` (confirmou email por verificacao propria)
  3. O usuario confirma o linking explicitamente (ex: requer re-autenticacao com senha existente)
- **[OBRIGATORIO]** Se as condicoes acima nao forem atendidas, criar conta separada e exibir mensagem informando que ja existe uma conta com aquele email.
- **[RECOMENDADO]** Logar evento de audit `ACCOUNT_LINK_ATTEMPT` com resultado (success/denied/new_account) para deteccao de padroes anomalos.

---

### SEC-S33-002: OAuth — CSRF Protection (SEVERIDADE: ALTA)

**Risco**: O fluxo OAuth usa redirect-based flow. Sem protecao CSRF, um atacante pode forjar requests de callback com authorization codes pre-obtidos.

**Recomendacao**:
- **[OBRIGATORIO]** Auth.js v5 gera automaticamente o parametro `state` no OAuth flow. Verificar que o `state` e validado no callback (`/api/auth/callback/google`). Nao desabilitar esta verificacao.
- **[OBRIGATORIO]** O `state` deve ser um token criptograficamente aleatorio, armazenado em cookie `httpOnly` + `Secure` + `SameSite=Lax` com TTL curto (max 10 minutos).
- **[OBRIGATORIO]** O callback deve rejeitar requests sem `state` ou com `state` que nao corresponde ao cookie.
- **[INFORMATIVO]** Auth.js v5 implementa estas protecoes por padrao. Verificar que nenhuma customizacao do callback desabilitou a validacao de `state`.

---

### SEC-S33-003: OAuth — Token Validation (SEVERIDADE: ALTA)

**Risco**: O `id_token` recebido do Google deve ser validado quanto a: (1) assinatura, (2) issuer, (3) audience, (4) expiracao, (5) nonce (se usado).

**Recomendacao**:
- **[OBRIGATORIO]** Delegar validacao de `id_token` ao Auth.js v5, que usa a biblioteca `openid-client` para validacao completa. Nao implementar validacao manual.
- **[OBRIGATORIO]** Configurar `clientId` e `clientSecret` via environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Nunca hardcoded.
- **[OBRIGATORIO]** Para Apple Sign-In: validar `id_token` usando as chaves publicas da Apple (`https://appleid.apple.com/auth/keys`). Auth.js v5 suporta Apple nativamente.
- **[RECOMENDADO]** Configurar `allowDangerousEmailAccountLinking: false` no provider config (Auth.js v5 default). Se ativado, requer revisao de SEC-S33-001.

---

### SEC-S33-004: OAuth — Open Redirect (SEVERIDADE: MEDIA)

**Risco**: O parametro `callbackUrl` usado apos login pode ser manipulado para redirecionar o usuario a um site externo malicioso.

**Recomendacao**:
- **[OBRIGATORIO]** Validar que `callbackUrl` e uma URL relativa ou pertence ao mesmo dominio. Auth.js v5 faz essa validacao por padrao no callback `redirect`. Verificar que o callback nao foi customizado para aceitar URLs externas.
- **[OBRIGATORIO]** Nao permitir URLs com protocolo diferente de `https://` (ou `http://localhost` em dev).
- **[RECOMENDADO]** Usar whitelist explicita de paths permitidos no `redirect` callback de `auth.config.ts`.

---

### SEC-S33-005: Save/Discard Dialog — Data Loss Prevention (SEVERIDADE: MEDIA)

**Risco**: O usuario pode perder dados nao salvos se: (1) navegar via browser back/forward, (2) fechar a aba, (3) clicar em link externo, (4) usar progress bar para pular fase.

**Recomendacao**:
- **[OBRIGATORIO]** O dialog DEVE interceptar navegacao via:
  1. `beforeunload` event (para fechamento de aba/browser back)
  2. Next.js router events (para navegacao SPA via Link/router.push)
  3. Progress bar click handlers (verificar dirty state antes de navegar)
- **[OBRIGATORIO]** O dialog DEVE oferecer opcoes claras: "Salvar e Sair", "Descartar Alteracoes", "Continuar Editando". Nenhuma opcao deve resultar em perda silenciosa de dados.
- **[OBRIGATORIO]** O dialog NAO deve ser bypassavel via `history.pushState` ou manipulacao de URL no address bar. Para estes cenarios, `beforeunload` e a ultima linha de defesa.
- **[RECOMENDADO]** Implementar auto-save draft a cada 30 segundos como safety net. Dados de draft armazenados em `localStorage` com chave `draft:{tripId}:{phaseNumber}`, expiram em 24 horas.

---

### SEC-S33-006: Phase 4 Mandatory Fields — Server-Side Validation (SEVERIDADE: ALTA)

**Risco**: Se a validacao de campos obrigatorios de Phase 4 existir apenas no client (React form validation), um atacante pode enviar requests diretamente ao server action sem os campos obrigatorios, resultando em dados incompletos ou estado inconsistente.

**Recomendacao**:
- **[OBRIGATORIO]** Toda server action de Phase 4 (`saveTransportAction`, `saveAccommodationAction`, etc.) DEVE validar o payload com Zod schema identico ou mais restritivo que o schema do client.
- **[OBRIGATORIO]** O Zod schema server-side DEVE exigir pelo menos 1 `TransportSegment` OU 1 `Accommodation` para marcar Phase 4 como `completed`. A `completePhase4Action` deve rejeitar com erro se nenhum dos dois existir.
- **[OBRIGATORIO]** Campos obrigatorios dentro de cada segment (ex: `type`, `from`, `to` para transport; `name`, `checkIn`, `checkOut` para accommodation) DEVEM ser `.min(1)` no Zod schema. Strings vazias nao sao aceitas.
- **[OBRIGATORIO]** Mass assignment: o Zod schema deve usar `.strict()` ou `.strip()` para ignorar campos nao definidos no schema. O `userId` DEVE vir de `session.user.id`, nunca do payload.
- **[RECOMENDADO]** Adicionar testes que enviam payloads malformados diretamente a server action (sem UI) para confirmar rejeicao.

---

### SEC-S33-007: Summary Report — BOLA Check (SEVERIDADE: CONFIRMADO SEGURO — requer manutencao)

**Risco com novos campos**: O Sprint 33 adiciona dados de fases 3-5 ao relatorio. Cada novo campo pode introduzir queries sem filtro de `userId`.

**Recomendacao**:
- **[OBRIGATORIO]** Manter o BOLA check existente em `ExpeditionSummaryService.getExpeditionSummary` (verificado seguro em SEC-S32-007). Todas as novas queries de fases 3-5 DEVEM herdar o filtro `userId` do trip ja validado.
- **[OBRIGATORIO]** Nao adicionar queries independentes (ex: `db.transportSegment.findMany({ where: { tripId } })` sem verificar que o `tripId` pertence ao usuario). Todas as queries devem partir do trip ja validado pelo BOLA check.
- **[RECOMENDADO]** Revisao de PR deve verificar que nenhuma query nova no report service aceita `tripId` sem filtro de `userId`.

---

### SEC-S33-008: Summary Report — PII Protection (SEVERIDADE: ALTA)

**Risco**: O relatorio expandido pode expor PII se implementado incorretamente.

**Recomendacao**:
- **[OBRIGATORIO]** `birthDate` NUNCA deve aparecer no DTO do relatorio. Exibir apenas faixa etaria calculada server-side (ex: "25-34 anos"). A funcao de calculo deve retornar apenas a faixa, nao a idade exata.
- **[OBRIGATORIO]** Booking codes devem usar `maskedBookingCode` existente (formato `****AB12`). O campo criptografado (`bookingCode_encrypted`) NUNCA deve ser incluido no DTO.
- **[OBRIGATORIO]** Dados de passageiros: exibir apenas contagem por tipo (`adults: 2, children: 1`). Nao exibir nomes, documentos ou dados individuais de passageiros.
- **[RECOMENDADO]** Adicionar teste automatizado que verifica que o objeto retornado por `generateTripReport()` nao contem os campos: `birthDate`, `bookingCode_encrypted`, `password`, `email` (alem do nome do viajante).

---

### SEC-S33-009: Data Migration Script — Idempotencia e Audit (SEVERIDADE: ALTA)

**Risco**: Um script de migracao nao idempotente pode corromper dados se executado mais de uma vez (ex: duplicar records, resetar campos ja migrados). Sem audit logging, nao ha como rastrear o que foi alterado.

**Recomendacao**:
- **[OBRIGATORIO]** O script DEVE ser idempotente: executar 2x deve produzir o mesmo resultado que executar 1x. Usar padroes como:
  - `UPDATE ... WHERE migratedAt IS NULL` (processar apenas registros nao migrados)
  - `INSERT ... ON CONFLICT DO NOTHING` (evitar duplicatas)
  - Flag `migrationVersion` no registro para rastrear qual versao da migracao foi aplicada
- **[OBRIGATORIO]** O script DEVE logar cada operacao em tabela de audit ou arquivo de log estruturado com:
  - Timestamp
  - Registro afetado (ID)
  - Operacao (INSERT/UPDATE/DELETE)
  - Valores antes e depois (diff)
  - Resultado (success/failure/skipped)
- **[OBRIGATORIO]** O script DEVE rodar dentro de transacao Prisma (`db.$transaction`) para garantir atomicidade. Em caso de erro em qualquer registro, a migracao inteira deve ser revertida.
- **[OBRIGATORIO]** O script DEVE ter modo `--dry-run` que simula a execucao sem alterar dados, logando as operacoes que seriam realizadas.
- **[RECOMENDADO]** Manter backup automatico do banco antes da execucao (snapshot do PostgreSQL).
- **[RECOMENDADO]** O script deve ter timeout maximo de 5 minutos. Se exceder, abortar e logar.

---

## 4. Recommendations

### Acoes Obrigatorias (DEVE ser implementado antes do merge)

| ID | Acao | Responsavel | Ref |
|----|------|-------------|-----|
| SEC-S33-R01 | Account linking requer email_verified + confirmacao explicita | dev-fullstack-1 | SEC-S33-001 |
| SEC-S33-R02 | Validar `state` CSRF no callback OAuth (confirmar Auth.js default ativo) | dev-fullstack-1 | SEC-S33-002 |
| SEC-S33-R03 | Validar `id_token` via Auth.js (nao custom) + env vars para secrets | dev-fullstack-1 | SEC-S33-003 |
| SEC-S33-R04 | Validar `callbackUrl` e relativa/same-domain | dev-fullstack-1 | SEC-S33-004 |
| SEC-S33-R05 | SaveDiscardDialog intercepta beforeunload + router events + progress bar | dev-fullstack-2 | SEC-S33-005 |
| SEC-S33-R06 | Phase 4 server actions validam Zod schema com campos obrigatorios | dev-fullstack-2 | SEC-S33-006 |
| SEC-S33-R07 | Phase 4 Zod schema usa `.strict()` ou `.strip()`, userId de session | dev-fullstack-2 | SEC-S33-006 |
| SEC-S33-R08 | Novas queries do report herdam BOLA check do trip validado | dev-fullstack-2 | SEC-S33-007 |
| SEC-S33-R09 | birthDate ausente do DTO, booking codes mascarados | dev-fullstack-2 | SEC-S33-008 |
| SEC-S33-R10 | Migration script idempotente com audit logging | dev-fullstack-1 | SEC-S33-009 |
| SEC-S33-R11 | Migration script roda em transacao + suporta --dry-run | dev-fullstack-1 | SEC-S33-009 |

### Acoes Recomendadas (devem ser implementadas neste sprint se possivel)

| ID | Acao | Responsavel | Ref |
|----|------|-------------|-----|
| SEC-S33-R12 | Audit log para tentativas de account linking | dev-fullstack-1 | SEC-S33-001 |
| SEC-S33-R13 | Whitelist de paths no redirect callback | dev-fullstack-1 | SEC-S33-004 |
| SEC-S33-R14 | Auto-save draft em localStorage como safety net | dev-fullstack-2 | SEC-S33-005 |
| SEC-S33-R15 | Testes de payload malformado direto em server actions Phase 4 | qa-engineer | SEC-S33-006 |
| SEC-S33-R16 | Teste que verifica ausencia de PII no DTO do relatorio | qa-engineer | SEC-S33-008 |
| SEC-S33-R17 | Backup automatico pre-migracao | devops-engineer | SEC-S33-009 |

---

## 5. Approval Criteria

### Pre-merge checklist (security-specialist deve verificar antes de aprovar PR)

- [ ] **OAUTH-001**: `allowDangerousEmailAccountLinking` esta `false` ou nao configurado (default seguro)
- [ ] **OAUTH-002**: Callback OAuth valida `state` parameter (verificar que Auth.js default nao foi sobrescrito)
- [ ] **OAUTH-003**: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em env vars, nao hardcoded
- [ ] **OAUTH-004**: `callbackUrl` validado como URL relativa ou same-domain no callback `redirect`
- [ ] **OAUTH-005**: Account linking exige `email_verified: true` do provider E `emailVerified` existente na conta local
- [ ] **DIALOG-001**: `beforeunload` event registrado quando form esta dirty
- [ ] **DIALOG-002**: Router events interceptados para navegacao SPA
- [ ] **DIALOG-003**: Dialog oferece 3 opcoes claras (salvar/descartar/continuar)
- [ ] **PHASE4-001**: Server action valida Zod schema com campos obrigatorios (`.min(1)` em strings)
- [ ] **PHASE4-002**: `completePhase4Action` rejeita se zero transport E zero accommodation
- [ ] **PHASE4-003**: Zod schema usa `.strict()` ou `.strip()` — nao aceita campos extras
- [ ] **PHASE4-004**: `userId` vem de `session.user.id`, nunca do payload
- [ ] **REPORT-001**: Nenhuma query nova no report service usa `tripId` sem filtro de `userId`
- [ ] **REPORT-002**: `birthDate` ausente do tipo e retorno do report DTO
- [ ] **REPORT-003**: Booking codes usam `maskedBookingCode`, nao campo criptografado
- [ ] **REPORT-004**: Contagem de passageiros por tipo, nao dados individuais
- [ ] **MIGRATION-001**: Script e idempotente (executar 2x = resultado identico a 1x)
- [ ] **MIGRATION-002**: Cada operacao logada com timestamp, ID, operacao, resultado
- [ ] **MIGRATION-003**: Script roda em `db.$transaction`
- [ ] **MIGRATION-004**: Modo `--dry-run` disponivel e funcional

---

## 6. Change History

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-20 | security-specialist | Documento inicial — revisao de seguranca do Sprint 33, 9 findings, 17 recomendacoes |
