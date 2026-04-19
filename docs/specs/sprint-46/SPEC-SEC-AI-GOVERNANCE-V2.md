# SPEC-SEC-AI-GOVERNANCE-V2: Central de Governanca de IA — Security Specification

**Version**: 1.0.0
**Status**: Approved
**Author**: architect (proxy security-specialist)
**Reviewers**: tech-lead, product-owner, devops-engineer, ai-specialist, qa-engineer
**Product Spec**: SPEC-PROD-AI-GOVERNANCE-V2
**Architecture Spec**: SPEC-ARCH-AI-GOV-V2
**AI Spec**: SPEC-AI-GOVERNANCE-V2
**Created**: 2026-04-17
**Last Updated**: 2026-04-17
**Feature Flag**: `AI_GOVERNANCE_V2`

---

## 1. Overview

Este spec consolida todos os controles de seguranca da Central de Governanca de IA v2, cobrindo: threat model STRIDE, RBAC com four-eyes principle, imutabilidade do audit log, sanitizacao de prompts contra injection, redacao de prompts em logs, alertas Sentry para operacoes sensiveis, controles de promocao com cool-down, e compliance (LGPD, OWASP Top 10 for LLM, SOC2 futuro). O PO ja aprovou todas as decisoes fundamentais (DEC-01 a DEC-06 em SPEC-PROD-AI-GOVERNANCE-V2); este spec formaliza a implementacao de seguranca.

---

## 2. Threat Model (STRIDE)

### 2.1. Threat Actors

| Ator | Motivacao | Capacidade |
|------|-----------|------------|
| TA-1: Usuario nao autenticado | Acesso a dados de config AI | Requests HTTP diretos |
| TA-2: Usuario autenticado sem role admin | Elevacao de privilegio | Sessao valida, manipulacao de requests |
| TA-3: admin-ai malicioso | Sabotagem de prompts, exfiltracao | Acesso a edicao de prompts, config de modelos |
| TA-4: admin-ai-approver malicioso | Bypass de controles de promocao | Acesso a aprovacao |
| TA-5: Atacante externo | Prompt injection via conteudo de prompt | Input no editor de prompts |

### 2.2. Matriz STRIDE

#### S — Spoofing (Falsificacao de Identidade)

| ID | Ativo Ameacado | Vetor | Severidade | Mitigacao |
|----|----------------|-------|------------|-----------|
| S-001 | Sessao admin | Admin impersonation — atacante obtem token JWT de admin-ai | **H** | Auth.js v5 com JWT rotation; sessao server-side; HTTPS obrigatorio; cookie HttpOnly + Secure + SameSite=Lax |
| S-002 | Endpoint de promocao | Usuario sem role admin-ai-approver tenta promover prompt manipulando request | **H** | Verificacao de role server-side em CADA handler de API (nunca confiar em UI); middleware `assertRole('admin-ai-approver')` no endpoint `/promote` |
| S-003 | AuditLog actor | Falsificacao de actorUserId no audit log | **M** | actorUserId extraido EXCLUSIVAMENTE da sessao server-side (`getServerSession()`), NUNCA do body do request |

#### T — Tampering (Adulteracao)

| ID | Ativo Ameacado | Vetor | Severidade | Mitigacao |
|----|----------------|-------|------------|-----------|
| T-001 | PromptVersion | Prompt injection — admin insere instrucoes maliciosas no corpo do prompt | **C** | Sanitizacao multi-camada (Secao 5): blocklist de patterns, strip zero-width chars, validacao de placeholders, token limit 4000 |
| T-002 | AuditLog | Modificacao ou exclusao de registros de auditoria | **C** | Imutabilidade garantida: sem UPDATE/DELETE no Prisma schema; sem endpoint de edicao; DB role com REVOKE UPDATE, DELETE ON audit_logs (Secao 4) |
| T-003 | Trust Score gate | Bypass da verificacao de trust >= 0.80 AND safety >= 0.90 na promocao | **C** | Verificacao server-side dupla: (1) no handler do endpoint `/promote`, (2) no `AiGovernanceService.promoteVersion()`. Ambos consultam `PromptEvalResult` diretamente |
| T-004 | ModelAssignment | Injecao de modelo nao homologado via manipulacao de request | **H** | Validacao Zod server-side com enum literal dos modelos homologados (`z.enum([...APPROVED_MODELS])`) |
| T-005 | AiRuntimeConfig | Timeout definido como 0 ou negativo para causar DoS | **H** | Validacao Zod: `z.number().int().min(5).max(55)` no server; soma primario+fallback <= 55 |

#### R — Repudiation (Repudio)

| ID | Ativo Ameacado | Vetor | Severidade | Mitigacao |
|----|----------------|-------|------------|-----------|
| R-001 | Operacoes admin | Admin nega ter feito alteracao | **H** | AuditLog imutavel com actorUserId, IP, userAgent, timestamp UTC, diffJson (before/after). Registro criado de forma atomica com a operacao ($transaction Prisma) |
| R-002 | Gaps no audit log | Falha no insert do AuditLog cria lacuna forense | **C** | (1) AuditLog insert dentro da mesma $transaction da operacao — se audit falhar, operacao falha; (2) Alerta P0 Sentry em caso de falha de insert (Secao 7); (3) Hash-chain para deteccao de gaps (Secao 4.5) |

#### I — Information Disclosure (Vazamento de Informacao)

| ID | Ativo Ameacado | Vetor | Severidade | Mitigacao |
|----|----------------|-------|------------|-----------|
| I-001 | Conteudo de prompts | Vazamento de prompt em logs (Pino, Sentry) | **H** | Redacao automatica: campo `promptContent` substituido por `[REDACTED:${hash8}]` em todos os logs (Secao 6) |
| I-002 | PII em audit log | IP e userAgent sao dados pessoais (LGPD) | **M** | Base legal: interesse legitimo (auditoria de seguranca). Retention 90 dias. Campos anonimizados apos retention (Secao 4.4) |
| I-003 | API keys de AI | Exposicao de ANTHROPIC_API_KEY ou GOOGLE_AI_API_KEY em logs ou responses | **C** | (1) Env vars validadas via @t3-oss/env-nextjs — nunca em codigo; (2) Sentry scrubber regex para padroes de API key; (3) Nenhum endpoint retorna keys; (4) Teste CI grep |
| I-004 | Outputs de curadoria | PII do viajante na fila de curadoria | **H** | Anonimizacao server-side antes de enviar ao admin: remover nome, email, telefone. Exibir apenas perfil anonimizado (tripType, travelStyle, locale) |
| I-005 | Prompts em crash reports | Stack traces com conteudo de prompts em Sentry | **H** | Sentry `beforeSend` scrubber: strings > 500 chars contendo patterns de prompt (ver Secao 6.3) |

#### D — Denial of Service (Negacao de Servico)

| ID | Ativo Ameacado | Vetor | Severidade | Mitigacao |
|----|----------------|-------|------------|-----------|
| D-001 | Endpoints admin | Flood de edicoes de prompt | **H** | Rate limit: 10 edicoes/hora/admin via Redis atomic Lua script (checkRateLimit existente). Rate limit key: `ratelimit:admin-ai-edit:${userId}` |
| D-002 | Eval runner | Flood de evals (cada eval consome API tokens) | **H** | Rate limit: 5 evals/hora/admin. Eval e assincrono — fila com max 3 evals concorrentes |
| D-003 | Kill-switch global | Ativacao maliciosa desabilita toda IA | **H** | (1) Dialogo de confirmacao obrigatorio com justificativa (min 20 chars); (2) Alerta P0 PAGE imediato via Sentry; (3) AuditLog atomico; (4) Apenas admin-ai pode operar |
| D-004 | PostgreSQL | Polling DB saturado por pico de chamadas AI | **M** | (1) TTL cache configuravel (default 30s) via AiRuntimeConfig; (2) Fallback para HARDCODED_DEFAULTS se DB indisponivel; (3) Connection pooling Prisma; (4) Monitorar via Sentry latencia DB > 50ms |
| D-005 | Timeout intencional | Admin define timeout=0 para sabotagem | **H** | Validacao Zod: min 5s. Coberto por T-005 |

#### E — Elevation of Privilege (Elevacao de Privilegio)

| ID | Ativo Ameacado | Vetor | Severidade | Mitigacao |
|----|----------------|-------|------------|-----------|
| E-001 | Endpoint /promote | admin-ai tenta promover sem ser admin-ai-approver | **C** | Middleware `assertRole('admin-ai-approver')` verificado server-side. Role extraido da sessao, nunca do request body |
| E-002 | Self-approval | admin-ai-approver que editou o draft tenta promover a mesma versao | **H** | Backend enforce: `PromptVersion.createdById !== session.userId` na acao de promote. Se violado → 403 com mensagem explicativa |
| E-003 | Filtros de audit log | SQL injection nos parametros de filtro do audit log | **M** | Prisma ORM parametriza todas as queries automaticamente. Validacao Zod nos query params. Nenhum raw SQL |
| E-004 | Role manipulation | Usuario tenta adicionar role admin-ai via API | **H** | Nenhum endpoint de self-service para roles. Atribuicao de roles admin-ai e admin-ai-approver apenas via DB seed/migration ou endpoint admin protegido separado (fora do escopo desta feature) |

---

## 3. RBAC — Matriz Role x Acao

| Acao | `user` | `admin` | `admin-ai` | `admin-ai-approver` |
|------|--------|---------|------------|---------------------|
| viewPrompts (lista, metadata) | - | - | Sim | Sim |
| viewPromptContent (corpo do prompt) | - | - | Sim | Sim |
| editDraft (criar/editar versao) | - | - | Sim | Sim |
| runEval (disparar avaliacao) | - | - | Sim | Sim |
| promoteDraft (ativar em producao) | - | - | **NAO** | Sim (*) |
| rollback (reverter versao) | - | - | **NAO** | Sim |
| assignModel (trocar modelo por fase) | - | - | Sim | Sim |
| editTimeout (configurar timeout) | - | - | Sim | Sim |
| killSwitch (ativar/desativar) | - | - | Sim | Sim |
| curateOutput (revisar output) | - | - | Sim | Sim |
| viewAuditLog | - | - | Sim | Sim |
| exportAuditLog (CSV) | - | - | Sim | Sim |
| viewDashboard (metricas AI) | - | Sim | Sim | Sim |

(*) Restricao adicional: self-approval bloqueado (E-002). Cool-down de 2 minutos entre ultimo edit e promote (Secao 8.3).

### 3.1. Implementacao de RBAC

```typescript
// src/server/guards/admin-ai-guard.ts

type AdminAiRole = 'admin-ai' | 'admin-ai-approver';

function assertAdminAiRole(session: Session, requiredRole: AdminAiRole): void {
  if (!session?.user?.roles?.includes(requiredRole)) {
    throw new ForbiddenError(
      `Acesso negado. Role "${requiredRole}" necessario.`
    );
  }
}

// Em cada handler de API:
// 1. getServerSession() — autentica
// 2. assertAdminAiRole(session, 'admin-ai') — autoriza
// 3. Logica de negocio
// 4. AuditLog insert atomico
```

### 3.2. Modelo de dados para roles

Os roles `admin-ai` e `admin-ai-approver` sao armazenados como strings no campo `User.roles` (array de strings, conforme convencao existente de string columns para extensible value sets — ADR do projeto). Um usuario pode ter ambos os roles (mas self-approval continua bloqueado por E-002).

---

## 4. Audit Log — Requisitos de Seguranca

### 4.1. Imutabilidade

- Nenhum role pode executar UPDATE ou DELETE na tabela `audit_logs`.
- No Prisma schema: modelo `AuditLog` NAO tem `updatedAt` (ja definido em SPEC-ARCH-AI-GOV-V2).
- Nenhum endpoint de edicao ou exclusao exposto na API.
- **Recomendacao de DB role**: criar role PostgreSQL `app_writer` com `REVOKE UPDATE, DELETE ON audit_logs FROM app_writer`. A aplicacao conecta com esse role.
- Em ambientes onde DB role separation nao e viavel (Railway shared DB), mitigar com:
  - Prisma middleware que intercepta operacoes `update` e `delete` na model `AuditLog` e lanca erro.
  - Teste de regressao que valida a ausencia de qualquer chamada `prisma.auditLog.update()` ou `prisma.auditLog.delete()` no codebase (grep CI).

### 4.2. Campos Obrigatorios

| Campo | Tipo | Descricao | Fonte |
|-------|------|-----------|-------|
| id | CUID2 | Identificador unico | Auto-gerado |
| actorUserId | String | FK para User | `getServerSession().user.id` |
| actorRole | String (VarChar 30) | Role do ator no momento da acao | `session.user.roles` (principal role ativo) |
| action | String (VarChar 50) | Tipo da operacao | Enum logico: `prompt.create`, `prompt.edit`, `prompt.promote`, `prompt.rollback`, `model.update`, `config.update`, `killswitch.toggle`, `curation.review`, `audit.export` |
| entityType | String (VarChar 30) | Tipo da entidade | `PromptTemplate`, `PromptVersion`, `ModelAssignment`, `AiRuntimeConfig`, `AiKillSwitch`, `CurationItem` |
| entityId | String (VarChar 30) | ID da entidade | CUID2 da entidade afetada |
| diffJson | Json | Before/after | `{ before: {...}, after: {...} }` — nunca inclui conteudo full de prompt, apenas hash + metadata |
| ip | String? (VarChar 45) | IP de origem | Extraido de `headers['x-forwarded-for']` ou `request.ip` |
| userAgent | String? (VarChar 500) | User agent | Extraido de `headers['user-agent']` |
| createdAt | DateTime | Timestamp UTC | Auto-gerado |

**Nota sobre SPEC-ARCH-AI-GOV-V2**: O schema definido no ARCH spec nao inclui `actorRole`. Recomendacao: adicionar campo `actorRole String @db.VarChar(30)` ao modelo `AuditLog`. Essa adição permite auditoria do role no momento da acao mesmo que o role do usuario mude posteriormente.

### 4.3. Transacionalidade

Toda operacao de escrita (create, update, promote, rollback, toggle) DEVE ser encapsulada em `prisma.$transaction()` que inclui o insert do AuditLog. Se o audit log falhar, a operacao inteira falha (rollback automatico).

```typescript
// Padrao obrigatorio:
await prisma.$transaction(async (tx) => {
  // 1. Operacao de negocio
  const result = await tx.promptTemplate.update({ ... });
  
  // 2. Audit log atomico
  await tx.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: getPrimaryRole(session.user.roles),
      action: 'prompt.edit',
      entityType: 'PromptTemplate',
      entityId: result.id,
      diffJson: { before: oldData, after: newData },
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 500),
    }
  });
});
```

### 4.4. Retencao e Lifecycle

| Tier | Periodo | Storage | Acesso |
|------|---------|---------|--------|
| Hot | 0-90 dias | PostgreSQL (tabela `audit_logs`) | API + UI admin com filtros |
| Cold (futuro) | 90 dias - 7 anos | S3 bucket com lifecycle policy | Somente export manual |

- Ao final dos 90 dias, um job programado (cron ou Vercel cron) exporta registros para S3 (JSON Lines comprimido com gzip) e os remove do PostgreSQL.
- **MVP**: implementar apenas o tier hot (90 dias PG). Tier cold fica como deferido.
- Campos IP e userAgent sao anonimizados (`[REDACTED]`) nos registros antes de exportar para cold storage, alinhando com LGPD.

### 4.5. Hash-Chain de Integridade (Recomendado)

Para deteccao de tampering, cada registro do AuditLog inclui um campo `integrityHash` (String, VarChar 64) calculado como:

```
integrityHash = SHA-256(previousHash + actorUserId + action + entityType + entityId + createdAt.toISOString())
```

- O `previousHash` e o `integrityHash` do registro imediatamente anterior (ordem por `createdAt`).
- O primeiro registro usa `previousHash = "GENESIS"`.
- Verificacao: um job periodico (semanal) percorre a cadeia e valida que cada hash corresponde ao calculo. Discrepancia → alerta P0.

**Implementacao**: campo adicional `integrityHash String? @db.VarChar(64)` no modelo AuditLog. Nullable para backward compat durante migracao. Populado via `crypto.createHash('sha256')`.

**Status**: Recomendado para v1. Se considerado overhead excessivo para MVP, pode ser implementado em v2 — mas a decisao deve ser documentada em ADR.

### 4.6. Assinatura HMAC (Recomendado)

Para protecao criptografica contra adulteracao, cada registro pode ser assinado com HMAC-SHA256 usando um secret dedicado:

```
signature = HMAC-SHA256(AUDIT_LOG_HMAC_SECRET, integrityHash)
```

- Secret: `AUDIT_LOG_HMAC_SECRET` em env var, rotacionado a cada 90 dias.
- Rotacao: ao rotacionar, o novo secret valida registros futuros; os anteriores permanecem verificaveis com o secret antigo (armazenar historico de secrets em secrets manager).

**Status**: Diferido para v2. O hash-chain ja fornece deteccao de tampering. HMAC adiciona protecao contra adulteracao do proprio hash, mas a complexidade de rotacao de secrets justifica adiar.

### 4.7. Export Endpoint

- **Rota**: `GET /api/admin/ai/audit-log/export`
- **Auth**: `admin-ai` ou `admin-ai-approver`
- **Rate limit**: 5 exports/hora/admin (evitar abuse de queries pesadas)
- **Formato**: CSV com sanitizacao contra formula injection (prefixo `'` em valores que iniciam com `=`, `+`, `-`, `@`)
- **URL assinada**: response inclui URL temporaria (pre-signed, expira em 15 min) para download, nao inline

---

## 5. Sanitizacao de Prompts (Anti-Injection)

### 5.1. Input Validation (Edicao de Prompt)

Todas as validacoes sao executadas **server-side** no handler da API antes de persistir. Client-side e complementar.

#### 5.1.1. Strip de caracteres perigosos

| Categoria | Codepoints | Acao |
|-----------|------------|------|
| Zero-width chars | U+200B-U+200F, U+FEFF, U+2060-U+2064 | Strip silencioso (remover sem erro) |
| Caracteres de controle | U+0000-U+001F (exceto U+000A `\n` e U+0009 `\t`) | Bloquear com erro 400 |
| Unicode homoglyphs | Categorias nao necessarias para prompt de viagem | Nao bloquear em v1, mas logar para analise |

```typescript
// src/server/services/prompt-sanitizer.ts
const ZERO_WIDTH_REGEX = /[\u200B-\u200F\uFEFF\u2060-\u2064]/g;
const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

function sanitizePromptInput(input: string): string {
  if (CONTROL_CHAR_REGEX.test(input)) {
    throw new AppError('Caracteres de controle nao permitidos no prompt', 400);
  }
  return input.replace(ZERO_WIDTH_REGEX, '');
}
```

#### 5.1.2. Validacao de placeholders

- Regex para placeholders validos: `\{([a-zA-Z][a-zA-Z0-9_]*)\}`
- Cada tipo de prompt (guide, plan, checklist) possui um schema canonico de placeholders obrigatorios e opcionais (definido em SPEC-AI-GOVERNANCE-V2, Secao 2).
- **Placeholders nao declarados no schema canonico** → bloquear com erro 400 e mensagem listando placeholders permitidos.
- **Validacao**: extrair todos os `{placeholderName}` do texto e comparar contra o schema canonico do tipo.

#### 5.1.3. Tamanho maximo

- 4000 tokens (estimado via tokenizer `tiktoken` ou heuristica de chars/4).
- Se tokenizer nao disponivel: fallback para 16000 chars (~4000 tokens).

### 5.2. Injection Patterns Blocklist

Strings que, se presentes no corpo do prompt editado pelo admin, **bloqueiam o save** com erro 400 e mensagem explicativa:

| Pattern | Razao |
|---------|-------|
| `ignore previous` / `ignore all previous` | Tentativa de override de system prompt |
| `system:` (no inicio de linha) | Tentativa de injecao de role system |
| `</prompt>` | Tentativa de escape de delimitador |
| `<\|im_start\|>` / `<\|im_sep\|>` / `<\|im_end\|>` | ChatML injection |
| `role: assistant` / `role: system` / `role: user` | Role injection |
| `\n\nHuman:` / `\n\nAssistant:` | Anthropic-style turn injection |
| `INST` rodeado por `[` e `]` | Llama-style instruction injection |
| `<tool_call>` / `<function_call>` | Tool use injection |

**Implementacao**: case-insensitive match. Regex compilada uma vez, aplicada em `systemPrompt` e `userTemplate`.

```typescript
const INJECTION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /ignore\s+(all\s+)?previous/i, reason: 'Tentativa de override de instrucoes anteriores' },
  { pattern: /^system:/mi, reason: 'Tentativa de injecao de role system' },
  { pattern: /<\/prompt>/i, reason: 'Tentativa de escape de delimitador de prompt' },
  { pattern: /<\|im_(start|sep|end)\|>/i, reason: 'Injecao ChatML detectada' },
  { pattern: /role:\s*(assistant|system|user)/i, reason: 'Injecao de role detectada' },
  { pattern: /\n\n(Human|Assistant):/i, reason: 'Injecao de turno Anthropic detectada' },
  { pattern: /\[INST\]/i, reason: 'Injecao de instrucao Llama detectada' },
  { pattern: /<(tool_call|function_call)>/i, reason: 'Injecao de tool call detectada' },
];
```

### 5.3. Content Rules (Conteudo Proibido)

Alem dos patterns de injection, bloquear prompts que contenham:

| Conteudo | Razao | Acao |
|----------|-------|------|
| `{userEmail}`, `{ssn}`, `{creditCard}`, `{password}`, `{birthDate}`, `{passport}` | PII direta como placeholder | Bloquear save (400) |
| `localhost`, `127.0.0.1`, `travel-planner.local`, `staging.*` (regex) | URLs internas | Bloquear save (400) |
| Placeholders nao declarados no schema canonico | Expansao nao controlada | Bloquear save (400) |
| Strings com mais de 500 caracteres consecutivos sem espaco | Possivel payload ofuscado | Warning (logar, nao bloquear) |

### 5.4. Output Sanitization

Quando a AI gera conteudo exibido ao usuario final:

- **HTML escape**: todo output AI DEVE passar por escape HTML antes de render no frontend. Verificar que o stack atual (React JSX) ja faz escape automatico — confirmar que nenhum uso de `dangerouslySetInnerHTML` recebe output AI raw.
- **Fila de curadoria**: outputs na fila de curadoria exibem conteudo raw para o admin (necessario para revisao), mas com banner "Conteudo nao sanitizado — somente visualizacao administrativa".

---

## 6. Prevencao de Vazamento de Prompts em Logs

### 6.1. Logger Middleware (Pino)

Configurar redacao automatica no Pino para campos que contenham conteudo de prompt:

```typescript
// src/lib/logger.ts — adicionar ao redact config existente
const logger = pino({
  redact: {
    paths: [
      'promptContent',
      'systemPrompt', 
      'userTemplate',
      'req.body.systemPrompt',
      'req.body.userTemplate',
      'context.prompt',
      '*.promptContent',
      '*.systemPrompt',
      '*.userTemplate',
    ],
    censor: (value: unknown) => {
      if (typeof value === 'string' && value.length > 50) {
        const hash = createHash('sha256').update(value).digest('hex').slice(0, 8);
        return `[REDACTED:${hash}]`;
      }
      return value;
    }
  }
});
```

### 6.2. Audit Log — Conteudo de Prompt

No `diffJson` do AuditLog, o conteudo full do prompt NAO e armazenado. Em vez disso:

```typescript
// Em vez de:
diffJson: { before: { systemPrompt: "You are a travel..." }, after: { systemPrompt: "You are an expert..." } }

// Armazenar:
diffJson: { 
  before: { systemPromptHash: "a1b2c3d4", systemPromptLength: 1234, versionTag: "1.2.0" },
  after: { systemPromptHash: "e5f6g7h8", systemPromptLength: 1456, versionTag: "1.3.0" }
}
```

O conteudo completo e sempre recuperavel via `PromptVersion` (imutavel), referenciado pelo `entityId` e `versionTag` no diff.

### 6.3. Sentry Scrubber

```typescript
// src/lib/sentry-config.ts
Sentry.init({
  beforeSend(event) {
    // Redigir strings longas que parecem prompts
    const promptPattern = /(?:you are|your role|generate|create|provide)[\s\S]{200,}/i;
    
    if (event.message && promptPattern.test(event.message)) {
      event.message = event.message.replace(promptPattern, '[PROMPT_CONTENT_REDACTED]');
    }
    
    // Redigir em extra/contexts
    if (event.extra) {
      for (const key of Object.keys(event.extra)) {
        const val = event.extra[key];
        if (typeof val === 'string' && val.length > 500) {
          event.extra[key] = `[REDACTED:${val.length}chars]`;
        }
      }
    }
    
    return event;
  }
});
```

### 6.4. Teste de Regressao CI

```bash
# No CI pipeline (GitHub Actions):
# Executar apos test suite, verificar que nenhum log contém conteudo de prompt
grep -rn "You are a travel\|You are an expert\|Generate a.*itinerary\|Create a.*checklist" \
  test-output.log && echo "FAIL: Prompt content found in logs" && exit 1
```

Adicionar strings canonicas dos prompts existentes ao grep. Este teste DEVE falhar o build se qualquer string de prompt aparecer em logs.

---

## 7. Alertas Sentry — Operacoes Sensiveis

| Acao | Severidade | Destino | Condicao de Disparo |
|------|------------|---------|---------------------|
| Kill-switch ativado (global — todos os tipos) | **P0 PAGE** | Oncall (PagerDuty/Sentry) | Todos os kill-switches de geracao desativados simultaneamente |
| Kill-switch ativado (fase individual) | **P1 WARN** | Slack #ai-ops | Qualquer kill-switch individual toggle |
| Troca de modelo em fase ativa | **P2 INFO** | Slack #ai-ops | `ModelAssignment.update` com `phase` que tem kill-switch desativado (ativo em prod) |
| Timeout definido > 45s | **P2 INFO** | Slack #ai-ops | `primaryTimeoutMs > 45000` OU `fallbackTimeoutMs > 45000` |
| Rate limit de edicoes atingido (10/h) | **P3 INFO** | Log interno | `checkRateLimit` retorna blocked |
| AuditLog insert failure | **P0 PAGE** | Oncall (PagerDuty/Sentry) | Qualquer erro no insert de audit log (indica falha critica — operacao tambem falhou por $transaction) |
| RBAC bypass detectado | **P1 WARN** | Slack #security + Oncall | Response 403 em endpoint admin com role valido mas insuficiente (potencial tentativa de elevacao) |
| Promocao com trust < 0.80 (bypass) | **P0 PAGE** | Oncall (PagerDuty/Sentry) | Se por qualquer razao uma promocao ocorrer com trust score < 0.80 (indica bug no gate — nao deveria ser possivel) |
| Promocao com safety < 0.90 (bypass) | **P0 PAGE** | Oncall (PagerDuty/Sentry) | Se promocao ocorrer com dimensao safety < 0.90 (gate adicional do PO) |

### 7.1. Implementacao

```typescript
// src/server/services/security-alerts.ts
import * as Sentry from '@sentry/nextjs';

function emitSecurityAlert(level: 'p0' | 'p1' | 'p2' | 'p3', action: string, details: Record<string, unknown>) {
  Sentry.captureMessage(`[SECURITY-${level.toUpperCase()}] ${action}`, {
    level: level === 'p0' ? 'fatal' : level === 'p1' ? 'error' : level === 'p2' ? 'warning' : 'info',
    tags: { 'security.action': action, 'security.level': level },
    extra: details,
  });
}
```

---

## 8. Controles de Promocao (Four-Eyes Principle)

### 8.1. Separacao de Papeis

- `admin-ai`: cria e edita versoes draft de prompts. NAO pode promover.
- `admin-ai-approver`: revisa diff e promove para producao. Requer:
  1. Trust score >= 0.80 (composite score de SPEC-EVALS-V1)
  2. Safety score >= 0.90 (dimensao safety isolada)
  3. Eval executado nos ultimos 7 dias (AC-21)

### 8.2. Self-Approval Bloqueado

A pessoa que criou ou editou a ultima versao (mais recente `PromptVersion.createdById`) NAO pode promover essa mesma versao. Verificacao server-side:

```typescript
// No handler de /promote
const latestVersion = await tx.promptVersion.findUnique({ where: { id: versionId } });
if (latestVersion.createdById === session.user.id) {
  throw new ForbiddenError(
    'Self-approval nao permitido. A versao deve ser promovida por um usuario diferente do autor.'
  );
}
```

### 8.3. Janela de Cool-Down

Intervalo minimo de **2 minutos** entre o ultimo edit (`PromptVersion.createdAt` mais recente do template) e a acao de promote. Impede aprovacao "reflexa" sem revisao.

```typescript
const TWO_MINUTES_MS = 2 * 60 * 1000;
const lastEdit = await tx.promptVersion.findFirst({
  where: { promptTemplateId: templateId },
  orderBy: { createdAt: 'desc' },
});
if (lastEdit && (Date.now() - lastEdit.createdAt.getTime()) < TWO_MINUTES_MS) {
  throw new AppError(
    'Cool-down de 2 minutos ativo. Aguarde antes de promover para permitir revisao adequada.',
    429
  );
}
```

### 8.4. Fluxo Completo de Promocao

```
1. admin-ai cria/edita draft → PromptVersion criada (status: draft)
2. admin-ai dispara eval → PromptEvalResult criado (trust score + dimensions)
3. IF trust < 0.80 OR safety < 0.90 → bloqueado automaticamente
4. IF trust >= 0.80 AND safety >= 0.90 → status muda para "approved-pending"
5. admin-ai-approver (diferente do autor) acessa /promote
6. Backend verifica:
   a. Role === admin-ai-approver ✓
   b. createdById !== session.userId ✓ (self-approval block)
   c. cool-down >= 2min ✓
   d. trust >= 0.80 AND safety >= 0.90 ✓
   e. eval age <= 7 dias ✓
7. Promote executa em $transaction com AuditLog
8. activeVersionId atualizado → proxima chamada AI usa novo prompt
```

---

## 9. Compliance

### 9.1. LGPD

| Aspecto | Tratamento |
|---------|------------|
| **Dados pessoais no AuditLog** | IP e userAgent sao dados pessoais. Base legal: interesse legitimo para auditoria de seguranca (Art. 7, IX, LGPD). Documentar no ROPA (Record of Processing Activities). |
| **Direito de exclusao (Art. 18, VI)** | O titular NAO pode exigir exclusao de registros de audit log onde e o ator. Justificativa: sobreposicao de interesse legitimo — logs de auditoria de seguranca sao necessarios para detectar fraude e garantir integridade do sistema. |
| **Retention** | IP e userAgent retidos por 90 dias (hot tier). Apos 90 dias, anonimizados antes de arquivar em cold storage. |
| **Fila de curadoria** | Outputs de viajantes exibidos sem PII direta. Perfil anonimizado: exibir apenas tripType, travelStyle, locale, faixa etaria (nao data de nascimento exata). |
| **Minimizacao** | AuditLog armazena apenas dados necessarios para auditoria. Conteudo de prompt por hash, nao por texto. |

### 9.2. OWASP Top 10 for LLM Applications

| OWASP LLM | Descricao | Mitigacao Nesta Spec |
|------------|-----------|----------------------|
| **LLM01: Prompt Injection** | Manipulacao de prompt para alterar comportamento do modelo | Secao 5: blocklist de injection patterns, strip zero-width chars, validacao de placeholders, content rules |
| **LLM02: Insecure Output Handling** | Output do LLM renderizado sem sanitizacao | Secao 5.4: HTML escape obrigatorio; React JSX default escape; verificar ausencia de `dangerouslySetInnerHTML` com AI output |
| **LLM06: Sensitive Information Disclosure** | Modelo expoe dados sensiveis do training ou do context | Secao 5.3: proibir placeholders PII (`{userEmail}`, `{passport}`, etc.); Secao 6: redacao em logs; I-004: anonimizacao na curadoria |
| **LLM08: Excessive Agency** | Modelo executa acoes nao autorizadas | Nao aplicavel diretamente — modelo nao tem tool use habilitado. Mitigacao preventiva: nenhum prompt pode conter `<tool_call>` ou `<function_call>` (Secao 5.2) |
| **LLM09: Overreliance** | Usuarios confiam cegamente no output | Fila de curadoria (AC-26 a AC-32) — revisao humana de 5% dos outputs; trust score gate impede prompts de baixa qualidade |
| **LLM10: Model Theft** | Extracao do prompt via output do modelo | Secao 6: prompts nunca expostos em logs ou responses publicas; acesso restrito a admin-ai; fila de curadoria mostra prompt versionado apenas para admin |

### 9.3. SOC2 (Preparacao Futura)

Mapeamento de controles implementados nesta spec para criterios SOC2:

| Criterio SOC2 | Controle | Secao |
|---------------|----------|-------|
| **CC6.1** — Logical and Physical Access Controls | RBAC com four-eyes; roles separados admin-ai e admin-ai-approver; self-approval bloqueado | Secoes 3, 8 |
| **CC6.6** — System Operations - Transmission Security | HTTPS obrigatorio; cookies HttpOnly+Secure+SameSite; API keys em env vars | S-001, I-003 |
| **CC7.1** — Change Management | PromptVersion imutavel; ciclo draft→eval→promote; audit log de todas as mudancas; cool-down 2min | Secoes 4, 8 |
| **CC7.2** — System Monitoring | Alertas Sentry para operacoes criticas; hash-chain de integridade; job de verificacao semanal | Secoes 7, 4.5 |

---

## 10. Testes de Seguranca Obrigatorios

### 10.1. Pen Test de RBAC

| Cenario | Input | Expected | Tipo |
|---------|-------|----------|------|
| SEC-T-001 | User sem role tenta GET /api/admin/ai/prompts | 403 | Unit |
| SEC-T-002 | User com role `user` tenta GET /api/admin/ai/prompts | 403 | Unit |
| SEC-T-003 | User com role `admin` (sem admin-ai) tenta POST /api/admin/ai/prompts | 403 | Unit |
| SEC-T-004 | admin-ai tenta POST /api/admin/ai/prompts/:id/promote | 403 | Unit |
| SEC-T-005 | admin-ai-approver que criou a versao tenta promover a mesma versao | 403 (self-approval) | Unit |
| SEC-T-006 | admin-ai-approver tenta promover com trust < 0.80 | 400 | Unit |
| SEC-T-007 | admin-ai-approver tenta promover com safety < 0.90 | 400 | Unit |
| SEC-T-008 | admin-ai-approver tenta promover com eval > 7 dias | 400 | Unit |
| SEC-T-009 | admin-ai-approver tenta promover dentro do cool-down 2min | 429 | Unit |
| SEC-T-010 | admin tenta DELETE /api/admin/ai/audit-log (endpoint nao existe) | 404 | Unit |

### 10.2. Fuzz Test — Injection no Editor

| Cenario | Input | Expected | Tipo |
|---------|-------|----------|------|
| SEC-T-011 | Prompt com "ignore previous instructions" | 400 com mensagem explicativa | Unit |
| SEC-T-012 | Prompt com `<\|im_start\|>system` | 400 | Unit |
| SEC-T-013 | Prompt com zero-width chars (U+200B) | Strip silencioso, save OK | Unit |
| SEC-T-014 | Prompt com control char U+0001 | 400 | Unit |
| SEC-T-015 | Prompt com placeholder `{userEmail}` | 400 (PII proibido) | Unit |
| SEC-T-016 | Prompt com placeholder `{customField}` nao no schema | 400 (placeholder nao declarado) | Unit |
| SEC-T-017 | Prompt com `localhost:3000` | 400 (URL interna) | Unit |
| SEC-T-018 | Prompt com > 4000 tokens | 400 (tamanho excedido) | Unit |
| SEC-T-019 | Prompt com `\n\nHuman:` | 400 (turn injection) | Unit |
| SEC-T-020 | Prompt com `role: system` | 400 (role injection) | Unit |

### 10.3. Chaos Test — Resiliencia

| Cenario | Condicao | Expected | Tipo |
|---------|----------|----------|------|
| SEC-T-021 | DB offline durante chamada AI | AiConfigResolver retorna HARDCODED_DEFAULTS; chamada AI continua | Integration |
| SEC-T-022 | DB offline durante insert AuditLog | Operacao inteira falha ($transaction rollback); alerta P0 emitido | Integration |
| SEC-T-023 | Redis offline durante rate limit check | Fallback: permitir operacao mas logar warning (fail-open com log) | Integration |

### 10.4. Log Redaction Test (CI)

| Cenario | Verificacao | Tipo |
|---------|-------------|------|
| SEC-T-024 | grep output de logs apos test suite por substrings canonicas de prompts | CI |
| SEC-T-025 | grep codebase por `prisma.auditLog.update` ou `prisma.auditLog.delete` | CI (deve retornar 0) |
| SEC-T-026 | grep codebase por `dangerouslySetInnerHTML` em componentes que recebem AI output | CI |

---

## 11. Open Questions

Nenhuma questao aberta. Todas as decisoes foram consolidadas com base nas aprovacoes do PO (DEC-01 a DEC-06) e nos specs existentes (SPEC-ARCH-AI-GOV-V2, SPEC-AI-GOVERNANCE-V2, SPEC-PROD-AI-GOVERNANCE-V2).

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-17 | architect (proxy security-specialist) | Spec inicial — threat model STRIDE, RBAC matrix, audit log security, prompt sanitization, log redaction, Sentry alerts, four-eyes controls, compliance (LGPD/OWASP/SOC2), 26 security tests |
