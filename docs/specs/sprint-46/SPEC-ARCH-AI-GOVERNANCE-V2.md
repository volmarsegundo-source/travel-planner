# SPEC-ARCH-AI-GOV-V2: Central de Governanca de IA v2 — Architecture Specification

**Version**: 1.0.0
**Status**: Approved
**Author**: architect
**Reviewers**: [tech-lead, security-specialist, devops-engineer, ai-specialist, product-owner]
**Product Spec**: SPEC-PROD-AI-GOV-V2 (Sprint 45)
**Created**: 2026-04-17
**Last Updated**: 2026-04-17

---

## 1. Overview

Este spec define a arquitetura da Central de Governanca de IA v2 (/admin/ia), consolidando o controle de prompts, modelos, configuracoes de runtime e auditoria em uma unica interface administrativa. A decisao do PO e pela **Opcao 2 (polling direto ao DB em cada chamada AI)**, priorizando simplicidade e consistencia real-time sobre performance. O overhead estimado de +5-20ms por chamada AI e desprezivel frente aos 17-30s de geracao.

A feature e protegida pelo feature flag `AI_GOVERNANCE_V2` e expande os modelos existentes (`PromptTemplate`, `AiKillSwitch`, `AiInteractionLog`) com versionamento imutavel, atribuicao de modelos por fase, configuracao de runtime dinamica e audit log completo.

---

## 2. Architecture Decision Records

### ADR-033: Polling DB em Cada Chamada AI (Opcao 2)

- **Status**: Proposed
- **Context**: Precisamos de um mecanismo para que mudancas de configuracao AI (troca de modelo, kill switch, parametros de runtime) tenham efeito imediato sem restart. Tres opcoes foram avaliadas.
- **Decision**: Consulta direta ao DB (`ModelAssignment` + `AiRuntimeConfig`) antes de cada chamada AI. Sem cache intermediario no MVP.
- **Consequences**:
  - **Positivo**: Consistencia imediata (zero propagation delay); implementacao simples; sem estado distribuido para gerenciar.
  - **Negativo**: +5-20ms de latencia por chamada AI; carga adicional no PostgreSQL proporcional ao numero de chamadas AI.
  - **Riscos**: Se o DB estiver indisponivel, as chamadas AI devem continuar com fallback hardcoded (graceful degradation).
- **Alternatives Considered**:

| Opcao | Pros | Cons |
|---|---|---|
| Opcao 1: Redis pub/sub | Sub-ms propagation; desacopla reads | Complexidade de infra; eventual consistency em edge cases; requer Redis reliable |
| Opcao 2: Polling DB (escolhida) | Simples; always consistent; sem estado extra | +5-20ms latencia; carga DB proporcional a chamadas AI |
| Opcao 3: Cache in-memory TTL 30s | Menor carga DB; latencia ~0 apos warm | Stale config ate 30s; inconsistencia entre replicas Vercel |

- **Caminho de migracao futuro**: Se polling se tornar gargalo (>100 chamadas AI/min), migrar para Opcao 3 (cache in-memory TTL 30s) como primeiro passo, e Opcao 1 (Redis pub/sub) se houver multiplas replicas. A interface `AiConfigResolver` (Secao 3) isola esse ponto de decisao.

### ADR-034: PromptVersion Imutavel com Lifecycle de Promocao

- **Status**: Proposed
- **Context**: O modelo `PromptTemplate` atual permite edicao in-place sem historico. Mudancas em prompts sao a maior fonte de regressao em sistemas AI. Precisamos de versionamento imutavel com workflow de promocao.
- **Decision**: Novo modelo `PromptVersion` como registro imutavel. `PromptTemplate` passa a ser um container (slug + metadata) que aponta para a versao ativa via `activeVersionId`. Cada edicao cria uma nova `PromptVersion`. Promocao requer trust score >= 0.80 de eval.
- **Consequences**:
  - **Positivo**: Auditoria completa; rollback instantaneo; historico de evolucao por slug.
  - **Negativo**: Mais registros no DB; queries de resolucao um pouco mais complexas.

---

## 3. System Design

### Component Diagram

```
[Admin UI /admin/ia]
        |
        v
[Next.js API Routes /api/admin/ai/*]
        |                     |
        v                     v
[AiGovernanceService]    [AuditLogService]
        |                     |
        v                     v
   [PostgreSQL]          [PostgreSQL]
        ^
        |
[AiConfigResolver] <--- chamada em cada request AI
        |
        v
[AiGatewayService] ---> [AiService] ---> [Provider]
```

### Data Flow — Resolucao de Config em Runtime

```
1. AiGatewayService.execute(phase, slug, userId, fn)
2.   AiConfigResolver.resolve(phase)
3.     SELECT ModelAssignment WHERE phase = $1
4.     SELECT AiRuntimeConfig WHERE key IN ('maxTokens', 'temperature', ...)
5.     IF DB indisponivel → retorna HARDCODED_DEFAULTS
6.   Retorna: { provider, modelId, timeoutMs, fallback, runtimeConfig }
7.   AiService usa config resolvida em vez de constantes hardcoded
```

### Data Flow — Edicao de Prompt

```
1. Admin POST /api/admin/ai/prompts/:id/versions
2.   Valida payload (Zod)
3.   Cria PromptVersion (imutavel)
4.   NÃO altera activeVersionId (draft)
5.   Registra AuditLog
6. Admin POST /api/admin/ai/prompts/:id/eval
7.   Dispara Promptfoo contra a versao
8.   Salva PromptEvalResult
9. Admin POST /api/admin/ai/prompts/:id/promote
10.   Verifica trustScore >= 0.80
11.   Atualiza PromptTemplate.activeVersionId
12.   Registra AuditLog (diff: activeVersionId anterior → novo)
```

### AiConfigResolver — Interface de Abstracao

```typescript
// src/server/services/ai-config-resolver.ts
// Interface que isola o ponto de decisao DB vs cache vs Redis

interface ResolvedAiConfig {
  provider: "anthropic" | "gemini";
  modelId: string;
  timeoutMs: number;
  fallbackProvider?: "anthropic" | "gemini";
  fallbackModelId?: string;
  fallbackTimeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
  killSwitchEnabled: boolean;
  killSwitchReason?: string;
}

interface AiConfigResolver {
  resolve(phase: string): Promise<ResolvedAiConfig>;
}
```

---

## 4. Data Model

### 4.1. PromptTemplate (campos adicionados)

```prisma
model PromptTemplate {
  id           String   @id @default(cuid())
  slug         String   @unique @db.VarChar(50)

  // --- Campos existentes mantidos ---
  version      String   @db.VarChar(20)       // version da template ativa (denormalized)
  modelType    String   @db.VarChar(20)
  systemPrompt String   @db.Text              // denormalized da activeVersion
  userTemplate String   @db.Text              // denormalized da activeVersion
  maxTokens    Int      @default(2048)
  cacheControl Boolean  @default(true)
  isActive     Boolean  @default(true)        // manter para backward compat
  metadata     Json?

  // --- Campos novos (Sprint 45) ---
  status          String          @default("active") @db.VarChar(20)  // "draft" | "active" | "archived"
  activeVersionId String?         @db.VarChar(30)   // FK logica para PromptVersion.id
  createdById     String?                           // User FK — quem criou o template
  approvedById    String?                           // User FK — quem aprovou (nullable)
  approvedAt      DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relacoes
  createdBy    User?    @relation("PromptTemplateCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  approvedBy   User?    @relation("PromptTemplateApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)
  versions     PromptVersion[]
  evalResults  PromptEvalResult[]

  @@index([slug, isActive])
  @@index([status])
  @@map("prompt_templates")
}
```

### 4.2. PromptVersion (novo)

```prisma
model PromptVersion {
  id               String   @id @default(cuid())
  promptTemplateId String
  versionTag       String   @db.VarChar(20)    // semver: "1.0.0", "1.1.0", etc.
  systemPrompt     String   @db.Text
  userTemplate     String   @db.Text
  maxTokens        Int      @default(2048)
  cacheControl     Boolean  @default(true)
  modelType        String   @db.VarChar(20)
  metadata         Json?
  changeNote       String?  @db.VarChar(500)   // descricao da mudanca

  createdById      String?
  createdAt        DateTime @default(now())

  // Imutavel: sem updatedAt

  promptTemplate   PromptTemplate  @relation(fields: [promptTemplateId], references: [id], onDelete: Cascade)
  createdBy        User?           @relation("PromptVersionCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  evalResults      PromptEvalResult[]

  @@unique([promptTemplateId, versionTag])
  @@index([promptTemplateId, createdAt])
  @@map("prompt_versions")
}
```

### 4.3. PromptEvalResult (novo)

```prisma
model PromptEvalResult {
  id                String   @id @default(cuid())
  promptTemplateId  String
  promptVersionId   String
  trustScore        Float                       // 0.0 - 1.0
  dimensions        Json                        // { accuracy: 0.9, safety: 0.95, ... }
  totalCases        Int      @default(0)
  passedCases       Int      @default(0)
  failedCases       Int      @default(0)
  evalDurationMs    Int      @default(0)
  rawOutput         Json?                       // Promptfoo raw result (truncated)
  ranAt             DateTime @default(now())
  ranById           String?

  promptTemplate    PromptTemplate @relation(fields: [promptTemplateId], references: [id], onDelete: Cascade)
  promptVersion     PromptVersion  @relation(fields: [promptVersionId], references: [id], onDelete: Cascade)
  ranBy             User?          @relation("PromptEvalResultRanBy", fields: [ranById], references: [id], onDelete: SetNull)

  @@index([promptTemplateId, ranAt])
  @@index([promptVersionId])
  @@index([trustScore])
  @@map("prompt_eval_results")
}
```

### 4.4. ModelAssignment (novo)

```prisma
model ModelAssignment {
  id                 String   @id @default(cuid())
  phase              String   @unique @db.VarChar(20)  // "plan" | "checklist" | "guide"

  // Primary
  primaryProvider    String   @db.VarChar(20)           // "anthropic" | "gemini"
  primaryModelId     String   @db.VarChar(80)           // e.g. "claude-haiku-4-5-20251001"
  primaryTimeoutMs   Int      @default(30000)

  // Fallback
  fallbackProvider   String?  @db.VarChar(20)
  fallbackModelId    String?  @db.VarChar(80)
  fallbackTimeoutMs  Int?

  updatedById        String?
  updatedAt          DateTime @updatedAt
  createdAt          DateTime @default(now())

  updatedBy          User?    @relation("ModelAssignmentUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  @@map("model_assignments")
}
```

### 4.5. AiRuntimeConfig (novo)

```prisma
model AiRuntimeConfig {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(50)  // "maxTokens.plan", "temperature.guide", "global.killSwitch", etc.
  value       String   @db.Text                 // JSON-encoded value
  description String?  @db.VarChar(300)
  updatedById String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  updatedBy   User?    @relation("AiRuntimeConfigUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  @@index([key])
  @@map("ai_runtime_configs")
}
```

### 4.6. AuditLog (novo)

```prisma
model AuditLog {
  id           String   @id @default(cuid())
  actorUserId  String
  action       String   @db.VarChar(50)    // "prompt.create" | "prompt.promote" | "prompt.rollback" | "model.update" | "config.update" | "killswitch.toggle"
  entityType   String   @db.VarChar(30)    // "PromptTemplate" | "ModelAssignment" | "AiRuntimeConfig" | "AiKillSwitch"
  entityId     String   @db.VarChar(30)
  diffJson     Json?                        // { before: {...}, after: {...} }
  ip           String?  @db.VarChar(45)    // IPv4 ou IPv6
  userAgent    String?  @db.VarChar(500)
  createdAt    DateTime @default(now())

  actor        User     @relation("AuditLogActor", fields: [actorUserId], references: [id], onDelete: Cascade)

  // Sem updatedAt — imutavel

  @@index([actorUserId, createdAt])
  @@index([entityType, entityId, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 4.7. Relacoes adicionais no User

```prisma
// Adicionar ao model User:
  promptTemplatesCreated  PromptTemplate[]     @relation("PromptTemplateCreatedBy")
  promptTemplatesApproved PromptTemplate[]     @relation("PromptTemplateApprovedBy")
  promptVersionsCreated   PromptVersion[]      @relation("PromptVersionCreatedBy")
  promptEvalsRan          PromptEvalResult[]   @relation("PromptEvalResultRanBy")
  modelAssignmentsUpdated ModelAssignment[]    @relation("ModelAssignmentUpdatedBy")
  runtimeConfigsUpdated   AiRuntimeConfig[]    @relation("AiRuntimeConfigUpdatedBy")
  auditLogs               AuditLog[]           @relation("AuditLogActor")
```

---

## 5. API Contracts

### 5.1. Prompt Management

#### GET /api/admin/ai/prompts

Listagem de prompt templates com versoes e status.

```typescript
// Query params
interface ListPromptsQuery {
  status?: "draft" | "active" | "archived";
  page?: number;    // default 1
  limit?: number;   // default 20, max 50
}

// Response 200
interface ListPromptsResponse {
  data: {
    id: string;
    slug: string;
    status: "draft" | "active" | "archived";
    modelType: "plan" | "checklist" | "guide";
    activeVersionId: string | null;
    activeVersionTag: string | null;
    versionsCount: number;
    lastEvalTrustScore: number | null;
    createdBy: { id: string; name: string } | null;
    approvedBy: { id: string; name: string } | null;
    approvedAt: string | null; // ISO 8601
    updatedAt: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth: role "admin-ai" (DEC-01)
// Rate limit: 60/min/admin
```

#### POST /api/admin/ai/prompts

Cria um novo prompt template com versao inicial.

```typescript
// Request body
interface CreatePromptRequest {
  slug: string;          // ^[a-z0-9-]{3,50}$
  modelType: "plan" | "checklist" | "guide";
  systemPrompt: string;  // min 10, max 50000 chars
  userTemplate: string;  // min 10, max 50000 chars
  maxTokens: number;     // 256 - 16384
  cacheControl?: boolean;
  changeNote?: string;   // max 500 chars
}

// Response 201
interface CreatePromptResponse {
  id: string;
  slug: string;
  versionId: string;
  versionTag: string; // "1.0.0"
}

// Errors: 400 (validation), 409 (slug exists), 401, 403
// Auth: role "admin-ai" (DEC-01)
// Rate limit: 10/hr/admin
```

#### PATCH /api/admin/ai/prompts/:id

Cria nova versao (NUNCA edita a versao existente).

```typescript
// Request body
interface UpdatePromptRequest {
  systemPrompt?: string;  // min 10, max 50000 chars
  userTemplate?: string;  // min 10, max 50000 chars
  maxTokens?: number;     // 256 - 16384
  cacheControl?: boolean;
  changeNote?: string;    // max 500 chars, obrigatorio se systemPrompt ou userTemplate mudou
}

// Response 200
interface UpdatePromptResponse {
  id: string;
  newVersionId: string;
  newVersionTag: string; // auto-incrementado: "1.1.0" -> "1.2.0"
}

// Errors: 400, 404, 401, 403
// Rate limit: 10/hr/admin
```

#### POST /api/admin/ai/prompts/:id/eval

Dispara avaliacao Promptfoo para uma versao especifica.

```typescript
// Request body
interface RunEvalRequest {
  versionId: string;     // ID da versao a avaliar
}

// Response 202 (Accepted — eval e assincrono)
interface RunEvalResponse {
  evalId: string;
  status: "queued";
  estimatedDurationMs: number;
}

// Webhook/polling para resultado: GET /api/admin/ai/prompts/:id/eval/:evalId

// Errors: 400, 404, 401, 403
// Rate limit: 5/hr/admin
```

#### POST /api/admin/ai/prompts/:id/promote

Promove uma versao a ativa. Requer trust score >= 0.80.

```typescript
// Request body
interface PromoteVersionRequest {
  versionId: string;
}

// Response 200
interface PromoteVersionResponse {
  id: string;
  slug: string;
  promotedVersionId: string;
  promotedVersionTag: string;
  previousVersionId: string | null;
  trustScore: number;
}

// Errors:
// 400: "Trust score abaixo do minimo (0.80)" — quando trust < 0.80
// 400: "Nenhum eval encontrado para esta versao"
// 404, 401, 403
// Rate limit: 10/hr/admin
```

#### POST /api/admin/ai/prompts/:id/rollback

Reverte para uma versao anterior.

```typescript
// Request body
interface RollbackRequest {
  targetVersionId: string;  // versao para a qual reverter
}

// Response 200
interface RollbackResponse {
  id: string;
  slug: string;
  rolledBackToVersionId: string;
  rolledBackToVersionTag: string;
  previousVersionId: string;
}

// Errors: 400, 404, 401, 403
// Rate limit: 10/hr/admin
```

### 5.2. Model Assignment

#### GET /api/admin/ai/models

Retorna matriz de atribuicao modelo-por-fase.

```typescript
// Response 200
interface ListModelAssignmentsResponse {
  data: {
    id: string;
    phase: string;
    primaryProvider: string;
    primaryModelId: string;
    primaryTimeoutMs: number;
    fallbackProvider: string | null;
    fallbackModelId: string | null;
    fallbackTimeoutMs: number | null;
    updatedBy: { id: string; name: string } | null;
    updatedAt: string;
  }[];
}

// Auth: role "admin-ai" (DEC-01)
```

#### PATCH /api/admin/ai/models/:id

Atualiza atribuicao de modelo para uma fase.

```typescript
// Request body
interface UpdateModelAssignmentRequest {
  primaryProvider?: "anthropic" | "gemini";
  primaryModelId?: string;       // max 80 chars
  primaryTimeoutMs?: number;     // 5000 - 55000
  fallbackProvider?: "anthropic" | "gemini" | null;
  fallbackModelId?: string | null;
  fallbackTimeoutMs?: number | null;  // 5000 - 55000
}

// Validacoes de negocio:
// - primaryTimeoutMs + (fallbackTimeoutMs ?? 0) <= 55000
// - primaryProvider !== fallbackProvider (se fallback definido)
// - primaryTimeoutMs >= 5000 && primaryTimeoutMs <= 55000
// - Se primaryTimeoutMs > 45000 ou fallbackTimeoutMs > 45000 → alerta Sentry

// Response 200
interface UpdateModelAssignmentResponse {
  id: string;
  phase: string;
  updatedFields: string[];
}

// Errors: 400 (validation), 404, 401, 403
// Rate limit: 10/hr/admin
```

### 5.3. Runtime Config

#### GET /api/admin/ai/runtime-config

```typescript
// Response 200
interface ListRuntimeConfigResponse {
  data: {
    id: string;
    key: string;
    value: string;     // JSON-encoded
    description: string | null;
    updatedBy: { id: string; name: string } | null;
    updatedAt: string;
  }[];
}
```

#### PATCH /api/admin/ai/runtime-config

Atualiza uma ou mais chaves de configuracao.

```typescript
// Request body
interface UpdateRuntimeConfigRequest {
  configs: {
    key: string;
    value: string;  // JSON-encoded
  }[];
}

// Validacoes:
// - Chaves permitidas (allowlist): ver Secao 5.3.1
// - Valores validados por schema Zod especifico da chave

// Response 200
interface UpdateRuntimeConfigResponse {
  updated: { key: string; previousValue: string; newValue: string }[];
}

// Rate limit: 10/hr/admin
```

#### 5.3.1. Chaves Permitidas (allowlist)

| Key | Tipo | Default | Range/Constraint |
|-----|------|---------|-----------------|
| `maxTokens.plan` | number | 2048 | 256 - 16384 |
| `maxTokens.checklist` | number | 2048 | 256 - 16384 |
| `maxTokens.guide` | number | 4096 | 256 - 16384 |
| `temperature.plan` | number | 0.7 | 0.0 - 2.0 |
| `temperature.checklist` | number | 0.3 | 0.0 - 2.0 |
| `temperature.guide` | number | 0.7 | 0.0 - 2.0 |
| `killSwitch.global` | boolean | false | — |
| `killSwitch.plan` | boolean | false | — |
| `killSwitch.checklist` | boolean | false | — |
| `killSwitch.guide` | boolean | false | — |
| `rateLimitPerHour.plan` | number | 10 | 1 - 100 |
| `rateLimitPerHour.checklist` | number | 5 | 1 - 100 |
| `rateLimitPerHour.guide` | number | 5 | 1 - 100 |

### 5.4. AI Outputs

#### GET /api/admin/ai/outputs

Listagem de `AiInteractionLog` com filtros.

```typescript
// Query params
interface ListOutputsQuery {
  phase?: string;
  status?: string;       // "success" | "error" | "blocked"
  dateFrom?: string;     // ISO 8601
  dateTo?: string;
  userId?: string;       // hashed
  page?: number;
  limit?: number;        // max 50
}

// Response 200
interface ListOutputsResponse {
  data: {
    id: string;
    userId: string;      // HASHED — nunca expor userId real
    phase: string;
    provider: string;
    model: string;
    promptSlug: string | null;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
    status: string;
    errorCode: string | null;
    cacheHit: boolean;
    createdAt: string;
    curationStatus: "none" | "flagged_bias" | "flagged_hallucination" | "flagged_risk" | "approved";
  }[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

#### POST /api/admin/ai/outputs/:id/curate

Sinaliza um output para curadoria.

```typescript
// Request body
interface CurateOutputRequest {
  curationStatus: "flagged_bias" | "flagged_hallucination" | "flagged_risk" | "approved";
  notes?: string; // max 500 chars
}

// Response 200
interface CurateOutputResponse {
  id: string;
  curationStatus: string;
}

// Rate limit: 30/hr/admin
```

**Nota**: requer novo campo `curationStatus` e `curationNotes` em `AiInteractionLog`.

### 5.5. Audit Log

#### GET /api/admin/ai/audit-log

```typescript
// Query params
interface ListAuditLogQuery {
  actorUserId?: string;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number; // max 100
}

// Response 200
interface ListAuditLogResponse {
  data: {
    id: string;
    actor: { id: string; name: string; email: string };
    action: string;
    entityType: string;
    entityId: string;
    diffJson: Record<string, unknown> | null;
    ip: string | null;
    createdAt: string;
  }[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Auth: role "admin" apenas (audit log nao deve ser visivel a admin-ai)
// Rate limit: 60/min/admin
```

### 5.6. Health Check

#### GET /api/health/ai-config

Endpoint publico (sem auth) para validar que as configs AI estao carregando.

```typescript
// Response 200
interface AiConfigHealthResponse {
  status: "ok" | "degraded";
  source: "database" | "fallback";
  checkedAt: string;
  phases: {
    phase: string;
    hasAssignment: boolean;
    provider: string;
    modelId: string;
  }[];
}

// Response 503 — se nenhuma config carregou (nem DB nem fallback)
```

---

## 6. Real-Time Propagation Strategy (Opcao 2)

### 6.1. Fluxo de Resolucao

A cada chamada AI, o `AiConfigResolver` executa:

1. **Query 1**: `SELECT * FROM model_assignments WHERE phase = $1` (indexed, ~2ms)
2. **Query 2**: `SELECT * FROM ai_runtime_configs WHERE key IN (...)` (~3ms)
3. **Merge** com defaults hardcoded para campos ausentes

Total estimado: **5-10ms** (2 queries indexed em PostgreSQL local/same-region).

### 6.2. Graceful Degradation

Se o DB estiver indisponivel (timeout, connection error):

```typescript
const HARDCODED_DEFAULTS: Record<string, ResolvedAiConfig> = {
  plan: {
    provider: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    timeoutMs: 30000,
    fallbackProvider: "gemini",
    fallbackModelId: "gemini-2.0-flash",
    fallbackTimeoutMs: 25000,
    killSwitchEnabled: false,
  },
  checklist: {
    provider: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    timeoutMs: 20000,
    killSwitchEnabled: false,
  },
  guide: {
    provider: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    timeoutMs: 25000,
    killSwitchEnabled: false,
  },
};
```

- **Logger**: `logger.warn("ai-config.db.unavailable", { phase, fallback: "hardcoded" })`
- **Sentry**: Alerta emitido se fallback ativado por >5 minutos consecutivos
- **Health check** retorna `status: "degraded"` quando usando fallback

### 6.3. Caminho de Migracao Futuro

| Gatilho | Acao |
|---------|------|
| >100 chamadas AI/min | Migrar para cache in-memory TTL 30s (Opcao 3) |
| Multiplas replicas Vercel com inconsistencia | Migrar para Redis pub/sub (Opcao 1) |
| Latencia de config polling >50ms | Investigar connection pooling / read replicas |

A interface `AiConfigResolver` e o unico ponto de mudanca. Swap de implementacao e transparente para `AiGatewayService`.

---

## 7. Security Controls

### 7.1. Autenticacao e Autorizacao

- **Todas as rotas `/api/admin/ai/*`** exigem sessao Auth.js valida com `role === "admin-ai"` (DEC-01).
- **Endpoints de promocao/rollback** exigem `role === "admin-ai-approver"` (DEC-02, four-eyes principle).
- **Audit log (GET)** exige `role === "admin-ai"` — visivel a todos os admins AI para transparencia.

### 7.2. Rate Limiting

| Operacao | Limite |
|----------|--------|
| GET (leituras) | 60/min/admin |
| POST/PATCH (escritas) | 10/hr/admin |
| Eval dispatch | 5/hr/admin |
| Curate output | 30/hr/admin |

Implementado via `checkRateLimit()` existente (Lua script Redis).

### 7.3. Sanitizacao de Prompt (Anti-Injection)

Antes de salvar qualquer `systemPrompt` ou `userTemplate`:

1. **Strip zero-width chars**: U+200B, U+200C, U+200D, U+FEFF, U+2060
2. **Validar placeholders**: Apenas `{{VARIABLE_NAME}}` permitido (regex: `/\{\{[A-Z_]{1,50}\}\}/g`)
3. **Bloquear system prompt override**: Rejeitar se contem padroes como `<system>`, `[SYSTEM]`, `You are now`, `Ignore previous instructions`, `Forget your instructions`
4. **Max length**: 50.000 chars por campo (systemPrompt + userTemplate)

```typescript
// Regex de deteccao de injection attempt
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)\s+instructions/i,
  /you\s+are\s+now/i,
  /forget\s+(your|all|previous)\s+instructions/i,
  /<\/?system>/i,
  /\[SYSTEM\]/i,
  /new\s+instructions:/i,
];
```

### 7.4. Redacao de Prompt em Logs

- `promptContent` (systemPrompt, userTemplate) **NUNCA** aparece em logs de aplicacao
- Logs de auditoria registram diff de campos, mas `systemPrompt` e `userTemplate` sao representados como `"[REDACTED — see PromptVersion ${id}]"`
- Exception: o campo `changeNote` pode aparecer em logs

### 7.5. Validacao de Timeout

- Range permitido: `5000 <= timeoutMs <= 55000`
- Soma primary + fallback: `<= 55000` (limite Vercel Hobby ~60s)
- Se `primaryTimeoutMs > 45000` ou `fallbackTimeoutMs > 45000` → alerta Sentry automatico

### 7.6. Alertas Sentry em Mudancas Sensiveis

Disparar alerta Sentry (severity: warning) nos seguintes eventos:

| Evento | Mensagem |
|--------|----------|
| Kill switch toggled (ON) | `ai-governance.killswitch.enabled: ${phase}` |
| Kill switch toggled (OFF) | `ai-governance.killswitch.disabled: ${phase}` |
| Modelo trocado | `ai-governance.model.changed: ${phase} ${oldModel} -> ${newModel}` |
| Timeout > 45s | `ai-governance.timeout.high: ${phase} ${timeoutMs}ms` |
| Prompt promoted | `ai-governance.prompt.promoted: ${slug} v${version}` |
| Prompt rolled back | `ai-governance.prompt.rolledback: ${slug} to v${version}` |

### 7.7. RBAC — Decidido pelo PO (DEC-01, DEC-02)

PO decidiu: **roles separados `admin-ai` + `admin-ai-approver`** (four-eyes principle) desde a Wave 1.

| Role | Permissoes |
|------|-----------|
| `admin-ai` | Leitura + edicao de prompts, modelos, timeout, curadoria de outputs, visualizacao de audit log |
| `admin-ai-approver` | Tudo de `admin-ai` + promocao de prompts para producao, rollback |

Implementar ambos os roles na Wave 1. Nao usar `admin` generico para acesso a `/admin/ia`.

---

## 8. Migration Plan

### 8.1. Nome da Migration

```
20260417000001_ai_governance_v2
```

### 8.2. Ordem de Criacao

1. **Adicionar campos em `PromptTemplate`**: `status`, `activeVersionId`, `createdById`, `approvedById`, `approvedAt`
2. **Adicionar campos em `AiInteractionLog`**: `curationStatus` (VarChar 30, default "none"), `curationNotes` (Text, nullable)
3. **Criar tabela `PromptVersion`**
4. **Criar tabela `PromptEvalResult`**
5. **Criar tabela `ModelAssignment`**
6. **Criar tabela `AiRuntimeConfig`**
7. **Criar tabela `AuditLog`**

### 8.3. Seed Inicial

Apos a migration, popular `ModelAssignment` com os defaults hardcoded atuais:

```sql
INSERT INTO model_assignments (id, phase, "primaryProvider", "primaryModelId", "primaryTimeoutMs", "fallbackProvider", "fallbackModelId", "fallbackTimeoutMs", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'plan',      'anthropic', 'claude-haiku-4-5-20251001', 30000, 'gemini', 'gemini-2.0-flash', 25000, NOW(), NOW()),
  (gen_random_uuid()::text, 'checklist', 'anthropic', 'claude-haiku-4-5-20251001', 20000, NULL, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'guide',     'anthropic', 'claude-haiku-4-5-20251001', 25000, NULL, NULL, NULL, NOW(), NOW());
```

Popular `AiRuntimeConfig` com defaults da Secao 5.3.1.

Criar `PromptVersion` iniciais a partir dos `PromptTemplate` existentes (se houver).

### 8.4. Downgrade Path

```sql
-- Reverter: dropar tabelas novas, remover campos adicionados
ALTER TABLE prompt_templates DROP COLUMN IF EXISTS status;
ALTER TABLE prompt_templates DROP COLUMN IF EXISTS "activeVersionId";
ALTER TABLE prompt_templates DROP COLUMN IF EXISTS "createdById";
ALTER TABLE prompt_templates DROP COLUMN IF EXISTS "approvedById";
ALTER TABLE prompt_templates DROP COLUMN IF EXISTS "approvedAt";

ALTER TABLE ai_interaction_logs DROP COLUMN IF EXISTS "curationStatus";
ALTER TABLE ai_interaction_logs DROP COLUMN IF EXISTS "curationNotes";

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS ai_runtime_configs;
DROP TABLE IF EXISTS model_assignments;
DROP TABLE IF EXISTS prompt_eval_results;
DROP TABLE IF EXISTS prompt_versions;
```

---

## 9. Feature Flag

### `AI_GOVERNANCE_V2`

- **Tipo**: Env var booleana (`"true"` | `"false"`)
- **Default**: `"false"`
- **Escopo**:
  - **UI**: Aba /admin/ia visivel apenas quando `AI_GOVERNANCE_V2 === "true"`
  - **API**: Endpoints `/api/admin/ai/*` retornam 404 quando flag OFF
  - **Runtime resolution**: `AiConfigResolver` consulta DB apenas quando flag ON; quando OFF, usa logica existente (`CLAUDE_MODEL_ID_MAP`, env vars, etc.)
- **Validacao**: Adicionar em `src/lib/env.ts` como variavel opcional

```typescript
// src/lib/flags/ai-governance-v2.ts
export function isAiGovernanceV2Enabled(): boolean {
  return process.env.AI_GOVERNANCE_V2 === "true";
}
```

- **Plano de rollout**:
  1. Deploy com flag OFF (sem impacto)
  2. Ativar em staging para validacao
  3. Ativar em producao apos QA sign-off
  4. Remover flag apos 2 sprints de estabilidade

---

## 10. Vendor Dependencies

| Vendor | Service Used | Abstraction Layer | Exit Strategy |
|--------|-------------|-------------------|---------------|
| Promptfoo | Eval execution | `PromptEvalService` wrapper | Substituir por eval custom (dataset + grader) |
| Sentry | Alertas de governance | `captureMessage()` | Substituir por logger + webhook generico |
| PostgreSQL | Config storage | `AiConfigResolver` interface | Interface permite swap para Redis/KV |

---

## 11. Constraints (MANDATORY)

### Architectural Boundaries
- Nenhuma logica de UI neste spec — apenas backend + contratos API
- `AiConfigResolver` nao deve importar nada de `src/components/`
- `AuditLog` e imutavel — nenhum UPDATE ou DELETE permitido
- `PromptVersion` e imutavel — nenhum UPDATE permitido
- Feature flag `AI_GOVERNANCE_V2` deve ser verificado em TODA rota admin AI

### Performance Budgets
- Config resolution: < 20ms (p99)
- API de leitura (GET): < 200ms
- API de escrita (POST/PATCH): < 500ms
- Eval dispatch (POST eval): < 1s (apenas enfileirar, nao executar inline)
- Nenhum impacto em bundle size (server-only)

### Security Requirements
- Auth: sessao valida + role admin (ou admin-ai)
- BOLA: actorUserId verificado em toda operacao
- Input validation: Zod em todo request body
- Prompt sanitization: anti-injection (Secao 7.3)
- PII: nenhum userId real exposto em outputs; usar hash
- Audit: toda mudanca gera AuditLog entry

### Scalability
- ModelAssignment: 3 rows (uma por fase) — carga negligivel
- AiRuntimeConfig: ~15 rows — carga negligivel
- AuditLog: crescimento linear (estimativa: ~50 entries/sprint) — nao requer particionamento no MVP
- PromptVersion: crescimento lento (~3-5 versoes/slug/sprint) — sem preocupacao

---

## 12. Implementation Guide

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Adicionar campos em PromptTemplate, AiInteractionLog; criar 5 novos modelos |
| `src/server/services/ai-config-resolver.ts` | Create | Interface + implementacao DB polling com fallback |
| `src/server/services/ai-governance.service.ts` | Modify | Expandir com CRUD prompts, model assignments, runtime config |
| `src/server/services/audit-log.service.ts` | Create | Servico de registro de auditoria |
| `src/server/services/prompt-eval.service.ts` | Create | Wrapper Promptfoo |
| `src/server/services/ai-gateway.service.ts` | Modify | Integrar AiConfigResolver no fluxo de resolucao |
| `src/server/services/ai.service.ts` | Modify | Usar config resolvida em vez de constantes hardcoded |
| `src/server/services/prompt-registry.service.ts` | Modify | Adaptar para ler activeVersionId |
| `src/lib/flags/ai-governance-v2.ts` | Create | Feature flag check |
| `src/lib/env.ts` | Modify | Adicionar AI_GOVERNANCE_V2 como var opcional |
| `src/app/api/admin/ai/prompts/route.ts` | Create | GET + POST handlers |
| `src/app/api/admin/ai/prompts/[id]/route.ts` | Create | PATCH handler |
| `src/app/api/admin/ai/prompts/[id]/eval/route.ts` | Create | POST handler |
| `src/app/api/admin/ai/prompts/[id]/promote/route.ts` | Create | POST handler |
| `src/app/api/admin/ai/prompts/[id]/rollback/route.ts` | Create | POST handler |
| `src/app/api/admin/ai/models/route.ts` | Create | GET handler |
| `src/app/api/admin/ai/models/[id]/route.ts` | Create | PATCH handler |
| `src/app/api/admin/ai/runtime-config/route.ts` | Create | GET + PATCH handlers |
| `src/app/api/admin/ai/outputs/route.ts` | Create | GET handler |
| `src/app/api/admin/ai/outputs/[id]/curate/route.ts` | Create | POST handler |
| `src/app/api/admin/ai/audit-log/route.ts` | Create | GET handler |
| `src/app/api/health/ai-config/route.ts` | Create | GET health check |

### Migration Strategy

- Migration unica (nao incremental) — todas as tabelas criadas de uma vez
- Seed script separado para popular defaults
- Backward compatible: PromptTemplate mantem campos existentes; novos campos sao nullable ou tem defaults
- Feature flag OFF = zero impacto no sistema existente

---

## 13. Testing Strategy

### Unit Tests
- `AiConfigResolver`: resolve com DB disponivel, resolve com DB indisponivel (fallback), merge de defaults
- `AuditLogService`: criacao de entry, campos obrigatorios, imutabilidade
- Prompt sanitization: deteccao de injection patterns, strip zero-width chars, validacao de placeholders
- Timeout validation: range check, soma primary+fallback
- Feature flag: comportamento ON vs OFF

### Integration Tests
- CRUD completo de PromptTemplate + PromptVersion
- Fluxo de promocao: create → eval → promote → verify activeVersionId
- Fluxo de rollback: promote → rollback → verify
- ModelAssignment: update + verificar que AiConfigResolver retorna novo valor
- AuditLog: verificar que toda operacao gera entry

### E2E Tests
- Admin abre /admin/ia, ve lista de prompts
- Admin edita prompt, dispara eval, promove versao
- Admin troca modelo de uma fase, verifica que proxima chamada AI usa novo modelo
- Admin ativa kill switch, verifica que chamada AI e bloqueada

### Performance Tests
- Config resolution under load: 1000 chamadas concorrentes, p99 < 20ms
- Verificar que overhead de polling nao impacta latencia perceptivel de geracao AI

---

## 14. Open Questions

- [x] **OQ-1 (PO)**: Role `admin-ai` separado ou usar `admin` existente? **DECIDIDO**: PO aprovou `admin-ai` + `admin-ai-approver` separados (DEC-01/DEC-02). Implementar desde Wave 1.
- [ ] **OQ-2 (tech-lead)**: Eval Promptfoo deve rodar inline (sincrono) ou em background job? Se background, qual mecanismo? (sugestao: fire-and-forget com Promise, resultado salvo no DB e polled via GET).
- [ ] **OQ-3 (PO)**: Limiar de trust score para promocao: 0.80 e aceitavel ou deve ser configuravel via AiRuntimeConfig?
- [ ] **OQ-4 (security-specialist)**: AuditLog deve registrar IP e User-Agent? Implicacoes LGPD de armazenar IP de admins.
- [ ] **OQ-5 (tech-lead)**: Modelo `AiKillSwitch` existente sera descontinuado em favor de `AiRuntimeConfig.killSwitch.*`? Ou manter ambos com sync?

---

## 15. Exit Strategy (Vendor Lock-in)

| Componente | Vendor | Risco | Mitigacao |
|------------|--------|-------|-----------|
| Promptfoo | Open-source | Baixo | Interface `PromptEvalService` permite substituicao |
| PostgreSQL | Hostable anywhere | Baixo | Standard SQL; sem features vendor-specific |
| Sentry alertas | SaaS | Baixo | Alertas emitidos via `captureMessage()`; substituivel por qualquer error tracker |
| Anthropic/Gemini | SaaS | Medio | `AiProvider` interface + `ModelAssignment` permite swap dinamico sem deploy |

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-17 | architect | Draft inicial — schema, API contracts, Opcao 2 (polling DB), security controls, migration plan, feature flag |

> Status: Approved — Revisado por tech-lead, security-specialist, devops-engineer, ai-specialist, product-owner.
