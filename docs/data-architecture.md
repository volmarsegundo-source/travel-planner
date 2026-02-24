# Travel Planner — Data Architecture & Analytics

**Version**: 1.0.0
**Last Updated**: 2026-02-23
**Author**: data-engineer
**Status**: Active — Approved for implementation

---

## Overview

Este documento define a arquitetura de dados e analytics do Travel Planner a partir do MVP. Cobre os fluxos de dados principais do sistema, o esquema de eventos a rastrear, estratégia de identidade de usuários (GDPR-compliant), política de retenção e a infraestrutura de analytics recomendada para uma equipe de dois desenvolvedores.

O princípio central é **privacy by design**: nenhum dado pessoal identificável (PII) jamais entra no pipeline de analytics. Todo rastreamento de comportamento é feito com identificadores pseudoanonimizados.

---

## Data Flows

### Fluxo 1 — Dados Transacionais (Write Path)

```
Browser (Client Component)
    │
    ▼
Server Action (src/server/actions/)
    │
    ├── Zod validation
    ├── Auth.js session check
    ├── Service Layer (src/server/services/)
    │       └── Prisma → PostgreSQL (Railway/Render)
    │
    └── Redis cache invalidation (Upstash)
```

Dados transacionais (User, Trip, Itinerary, Activity, Bookmark) vivem exclusivamente no PostgreSQL. Este é o sistema de verdade (source of truth). Dados de sessão vivem no Redis com TTL gerenciado pelo Auth.js.

### Fluxo 2 — Eventos de Analytics (Event Pipeline)

```
Browser (Client Component) ──► analytics.track(event)
                                    │
                                    ▼
Server Action / API Route (analytics endpoint)
    │
    ├── Validação do evento (Zod)
    ├── Aplicar hashing do user_id (SHA-256 + SALT)
    ├── Remover / mascarar qualquer PII residual
    │
    └── Enviar ao PostHog (self-hosted ou cloud EU region)
            │
            └── PostgreSQL interno do PostHog (analytics store)
```

Eventos de analytics NUNCA contêm PII raw. A transformação ocorre no servidor, antes de qualquer envio externo.

### Fluxo 3 — Dados de Busca com Cache

```
User submits search
    │
    ▼
SearchService.search(query, filters)
    │
    ├── Redis GET (cache key = hash(query + filters))
    │   ├── HIT → return results (TTL: 300s)
    │   └── MISS → Prisma full-text search → Redis SET → return
    │
    └── Server Component renders ResultsList
```

Queries de busca são cacheadas com chave derivada dos parâmetros. Nenhum `userId` entra na cache key — resultados são impessoais.

### Fluxo 4 — Sessão e Autenticação

```
Auth.js session
    │
    ├── Session token → Redis (Upstash) com TTL = 30 dias
    ├── User record → PostgreSQL
    └── OAuth tokens (Google, Apple) → PostgreSQL (encrypted at rest)
```

O Auth.js é self-hosted — nenhum dado de autenticação sai da nossa infraestrutura.

---

## Event Tracking Foundation

> Fundação de tracking de eventos: todos os eventos compartilham uma interface base. Esta seção define o contrato mínimo que cada evento deve satisfazer.

### Event Schema (all events share this base)

```typescript
interface BaseEvent {
  // Identificação do evento
  event_id: string;        // CUID2 — gerado no servidor, não no cliente
  event_name: string;      // snake_case — ex: "trip_created"
  timestamp: string;       // ISO 8601 UTC — ex: "2026-02-23T14:30:00.000Z"

  // Identificação de sessão e usuário (NUNCA raw PII)
  session_id: string;      // CUID2 rotacionado a cada 30min de inatividade
  user_id_hash: string;    // SHA-256(userId + ANALYTICS_SALT) — ver seção Identity Strategy
  anonymous_id: string;    // CUID2 persistido em cookie 1st-party (pré-auth)

  // Contexto da plataforma
  platform: 'web';
  app_version: string;     // semver — ex: "1.0.0"

  // Contexto técnico (sem PII)
  device_type: 'mobile' | 'tablet' | 'desktop';
  os_family: string;       // "iOS", "Android", "Windows", "macOS", "Linux"
  browser_family: string;  // "Chrome", "Firefox", "Safari"
  viewport_width: number;  // px — contexto de responsividade

  // Contexto de navegação (sem path params que contenham IDs de usuário)
  page_path: string;       // ex: "/trips/[id]" — template, não o ID real
  referrer_type: 'organic' | 'direct' | 'social' | 'email' | 'paid' | 'internal';
}
```

**Regras de validação do BaseEvent:**
- `event_id`: deve ser CUID2 válido — gerado server-side para evitar manipulação
- `timestamp`: deve estar dentro de ±5 minutos do server time (rejeitar eventos muito antigos ou futuros)
- `user_id_hash`: deve ter exatamente 64 caracteres hexadecimais (SHA-256)
- `event_name`: deve estar na allowlist de eventos conhecidos — rejeitar eventos arbitrários

```typescript
// src/lib/analytics/base-event.schema.ts
import { z } from "zod";

export const BaseEventSchema = z.object({
  event_id: z.string().min(20).max(30),  // CUID2 length range
  event_name: z.string().regex(/^[a-z][a-z0-9_]*$/),  // snake_case
  timestamp: z.string().datetime({ offset: false }),   // UTC only
  session_id: z.string().min(20).max(30),
  user_id_hash: z.string().regex(/^[a-f0-9]{64}$/),   // SHA-256 hex
  anonymous_id: z.string().min(20).max(30),
  platform: z.literal("web"),
  app_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  device_type: z.enum(["mobile", "tablet", "desktop"]),
  os_family: z.string().max(50),
  browser_family: z.string().max(50),
  viewport_width: z.number().int().positive().max(8000),
  page_path: z.string().max(200),
  referrer_type: z.enum(["organic", "direct", "social", "email", "paid", "internal"]),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;
```

---

### P0 Events — Must track from day one

Estes eventos são a base mínima para entender o comportamento do usuário no MVP. Devem estar instrumentados antes do primeiro usuário real.

| Event Name | Trigger | Key Properties (beyond base) | Source | GDPR Notes |
|---|---|---|---|---|
| `page_viewed` | Cada page load / client-side navigation | `page_path`, `page_title_template` | Client | `page_path` usa template sem IDs de usuário: `/trips/[id]` não `/trips/usr_abc` |
| `user_signed_up` | Auth.js `signIn` callback — novo usuário criado | `auth_provider` (google/email/apple), `registration_step` | Server | Nenhum email ou nome — apenas provider e método |
| `user_signed_in` | Auth.js `signIn` callback — usuário existente | `auth_provider` | Server | Nenhum email |
| `user_signed_out` | Auth.js `signOut` callback | — | Server | Apenas o hash confirma qual sessão encerrou |
| `trip_created` | TripService.createTrip() sucesso | `trip_id_hash`, `has_dates`, `destination_count` | Server | `trip_id_hash` = SHA-256(tripId + SALT); nunca o título |
| `trip_updated` | TripService.updateTrip() sucesso | `trip_id_hash`, `fields_changed` (array de nomes de campo) | Server | `fields_changed` lista somente nomes de campos, não valores |
| `trip_deleted` | Soft delete — `deletedAt` set | `trip_id_hash` | Server | |
| `destination_searched` | SearchService.search() chamado | `query_length` (não o texto), `filter_count`, `results_count`, `has_results` | Server | NUNCA o texto da busca — é PII potencial (nome de pessoa pode ser pesquisado) |
| `destination_viewed` | Destination detail page loaded | `destination_slug`, `destination_country`, `destination_region` | Server | Slug e país são dados públicos — não PII |
| `bookmark_added` | BookmarkService.addBookmark() | `destination_slug`, `destination_country` | Server | |
| `bookmark_removed` | BookmarkService.removeBookmark() | `destination_slug` | Server | |
| `activity_added` | ItineraryService.addActivity() | `activity_type`, `trip_id_hash`, `day_number` | Server | Sem título ou notas — são PII potencial |
| `error_occurred` | Sentry + custom error boundary | `error_code`, `error_type`, `page_path` | Client+Server | Nenhuma mensagem de erro raw — só códigos classificados |

### P1 Events — Track when feature ships

Estes eventos devem ser adicionados quando a funcionalidade correspondente for implementada.

| Event Name | Trigger | Key Properties | GDPR Notes |
|---|---|---|---|
| `itinerary_day_reordered` | Drag-and-drop ou reordenação de dias | `trip_id_hash`, `day_count` | |
| `map_interaction` | Clique/zoom/pan no mapa | `interaction_type`, `zoom_level`, `destination_slug` (se hovering) | Sem coordenadas exatas do cursor |
| `trip_shared` | Trip visibility set to public | `trip_id_hash`, `visibility` | |
| `trip_exported` | Exportar itinerário (PDF/etc) | `trip_id_hash`, `export_format` | |
| `account_deleted` | Usuário inicia exclusão de conta | — | Trigger para erasure pipeline |
| `search_filter_applied` | Filtros aplicados na busca | `filter_type`, `filter_value` (apenas para filtros não-PII como `region`, `country`) | |
| `onboarding_step_completed` | Cada etapa do onboarding | `step_name`, `step_index` | |
| `session_expired` | Auth.js token expirado | — | |

---

## User Identity Strategy

> Estratégia de identidade: como rastrear usuários de forma GDPR-compliant, sem armazenar PII no pipeline de analytics.

### Pre-authentication tracking

Antes do login, o usuário é identificado por um `anonymous_id` — um CUID2 gerado no primeiro acesso e persistido em um cookie **1st-party** com as seguintes configurações:

```typescript
// src/lib/analytics/anonymous-id.ts
import { createId } from "@paralleldrive/cuid2";
import { cookies } from "next/headers";

const ANONYMOUS_ID_COOKIE = "_tp_aid";  // tp = travel planner, aid = anonymous id

export function getOrCreateAnonymousId(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get(ANONYMOUS_ID_COOKIE);

  if (existing?.value) return existing.value;

  const newId = createId();

  // Cookie configurado via Set-Cookie no response header
  // Lifetime: 1 year, HttpOnly: false (precisa ser lido pelo client para enviar em eventos)
  // SameSite: Strict, Secure: true em produção
  return newId;
}
```

O cookie deve ser configurado com:
- `Max-Age`: 365 dias
- `SameSite`: `Strict`
- `Secure`: `true` em produção
- `HttpOnly`: `false` (necessário para leitura em Client Components para eventos client-side)
- **Requer banner de consentimento de cookies** (ver seção GDPR Compliance)

### Post-authentication linking

Quando o usuário faz login, o `anonymous_id` é vinculado ao `user_id_hash` no sistema de analytics. Esta operação é feita server-side no callback do Auth.js:

```typescript
// src/server/analytics/identity.ts
import "server-only";
import { hashUserId } from "./hash";
import { analytics } from "./client";

export async function linkUserIdentity(
  userId: string,
  anonymousId: string
): Promise<void> {
  const userIdHash = await hashUserId(userId);

  // Envia evento de identificação para o PostHog
  // O PostHog vincula os eventos anteriores do anonymousId ao userIdHash
  await analytics.identify({
    distinctId: userIdHash,
    properties: {
      anonymous_id: anonymousId,
      linked_at: new Date().toISOString(),
      // NUNCA incluir: email, name, phone, address
    },
  });
}
```

### Hashing strategy

```typescript
// src/lib/analytics/hash.ts
import "server-only";
import { createHash } from "crypto";
import { env } from "@/lib/env";

/**
 * Gera o hash GDPR-compliant de um userId para uso em analytics.
 *
 * - Usa SHA-256 com salt secreto (ANALYTICS_SALT env var)
 * - O mesmo userId sempre gera o mesmo hash (determinístico)
 * - Sem o ANALYTICS_SALT, é impossível reverter o hash para o userId real
 * - Ao rotacionar o ANALYTICS_SALT, todos os hashes mudam — efetivamente
 *   desvinculando dados históricos de analytics de usuários reais (erasure by rotation)
 *
 * IMPORTANTE: ANALYTICS_SALT deve ter >= 32 bytes de entropia.
 * Gerar com: openssl rand -hex 32
 */
export function hashUserId(userId: string): string {
  return createHash("sha256")
    .update(env.ANALYTICS_SALT)
    .update(":")
    .update(userId)
    .digest("hex");
}

/**
 * Hash de IDs de entidades (tripId, destinationId) para analytics.
 * Usa um salt diferente do userId para evitar correlação cruzada.
 */
export function hashEntityId(entityType: string, entityId: string): string {
  return createHash("sha256")
    .update(env.ANALYTICS_ENTITY_SALT)
    .update(":")
    .update(entityType)
    .update(":")
    .update(entityId)
    .digest("hex");
}

/**
 * Trunca o IP para remover o último octeto (IPv4) ou últimos 80 bits (IPv6).
 * Nunca armazenar IP completo em analytics.
 *
 * Exemplos:
 *   "192.168.1.123"  → "192.168.1.0"
 *   "2001:db8::1"    → "2001:db8::"  (simplificado)
 */
export function truncateIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 — remover últimos 80 bits (manter apenas os primeiros 48 bits)
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  // IPv4 — zerar o último octeto
  const parts = ip.split(".");
  if (parts.length !== 4) return "0.0.0.0";
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}
```

**Variáveis de ambiente necessárias:**

```
# .env.example
ANALYTICS_SALT=                # >= 32 bytes hex — openssl rand -hex 32
ANALYTICS_ENTITY_SALT=         # >= 32 bytes hex — openssl rand -hex 32 (diferente do ANALYTICS_SALT)
POSTHOG_API_KEY=               # chave do PostHog (self-hosted ou cloud EU)
POSTHOG_HOST=                  # URL do host PostHog — ex: https://eu.posthog.com
```

### GDPR erasure: what to delete and when

Quando um usuário solicita exclusão de conta:

1. `user.deletedAt` é setado no PostgreSQL (soft delete)
2. Um job de erasure é enfileirado (Redis queue ou cron job)
3. Dentro de **30 dias** (prazo GDPR), o job deve:
   - Deletar hard o registro `User` do PostgreSQL e todos os dados relacionados (cascade)
   - Rotacionar o `ANALYTICS_SALT` **NÃO** é a abordagem — isso afetaria todos os usuários
   - Em vez disso: enviar chamada de "delete person" para o PostHog usando o `user_id_hash`
   - O PostHog suporta a [exclusão de pessoas por `distinct_id`](https://posthog.com/docs/privacy/gdpr)
   - Registrar no audit log: `{ userId: "<hash>", erasedAt: "...", method: "posthog_delete_person" }`
4. Confirmar erasure via email (usando apenas o endereço de email que será deletado em seguida)

```typescript
// src/server/services/erasure.service.ts
import "server-only";
import { db } from "@/server/db/client";
import { analytics } from "@/server/analytics/client";
import { hashUserId } from "@/lib/analytics/hash";

export async function executeUserErasure(userId: string): Promise<void> {
  const userIdHash = hashUserId(userId);

  // 1. Deletar pessoa no PostHog (remove todos os eventos vinculados ao hash)
  await analytics.deleteUser(userIdHash);

  // 2. Hard delete do usuário e dados relacionados no PostgreSQL
  // (usando cascade — Prisma schema deve ter onDelete: Cascade em todas as relações de User)
  await db.user.delete({ where: { id: userId } });

  // 3. Remover sessões do Redis
  // Auth.js armazena sessions com prefixo — invalidar todas do userId
  // (implementação depende do adapter Auth.js usado)

  // 4. Registrar no audit log (sem PII — apenas o hash e timestamp)
  await db.auditLog.create({
    data: {
      action: "USER_ERASURE_COMPLETED",
      subjectHash: userIdHash,
      metadata: { method: "gdpr_right_to_erasure" },
    },
  });
}
```

---

## Data Retention Policy

> Política de retenção de dados: define por quanto tempo cada tipo de dado é mantido e o que acontece ao final do período.

| Data Type | Retention Period | Justification | Deletion Method |
|---|---|---|---|
| User account data (PostgreSQL) | Duration of account + 30 days after deletion request | GDPR right to erasure: 30 days to complete erasure | Hard delete via `executeUserErasure()` |
| Trip / Itinerary / Activity data | Duration of account + 30 days | User-generated content tied to account | Cascade delete with User |
| Auth.js session tokens (Redis) | 30 days (TTL managed by Auth.js) | Session expiry standard | Auto-expire via Redis TTL |
| Search cache (Redis) | 5 minutes (TTL) | Performance cache — no persistence needed | Auto-expire via Redis TTL |
| Raw analytics events (PostHog) | 1 year | Product analytics — MVP learning window | PostHog retention settings + `delete person` on user erasure |
| Aggregated/anonymized metrics | 3 years | Business intelligence — no personal data | Archive after 3 years |
| Error logs (Sentry) | 90 days | Debugging — Sentry default | Sentry auto-purge |
| Application logs (Vercel) | 30 days | Operational debugging | Vercel log drain auto-purge |
| Audit logs (GDPR erasure records) | 7 years | Legal compliance — proof of erasure execution | Manual archive after 7 years |
| OAuth tokens (Google, Apple) | Refreshed automatically; revoked on sign-out | Auth security | Deleted with User record |

**Regra geral**: dados de analytics nunca contêm PII. Portanto, a retenção de 1 ano é segura do ponto de vista GDPR — não há "pessoa identificável" nos dados de analytics após o hashing.

---

## Analytics Infrastructure (MVP)

> Infraestrutura de analytics para MVP: recomendação para equipe de 2 desenvolvedores com foco em GDPR.

### Recommended tooling: PostHog

**PostHog** é a recomendação principal por três razões:

1. **GDPR compliance nativa**: EU cloud region (dados ficam na UE), suporte a "delete person", sem transferências para EUA por padrão
2. **Self-hostable**: se necessário, pode ser deployado em infraestrutura própria com Docker (zero custo de licença)
3. **All-in-one para MVP**: event tracking + session replay (sem dados sensíveis) + feature flags + A/B testing em um único produto — sem precisar integrar 3 ferramentas separadas

**Alternativa open-source (self-hosted puro)**: [Plausible Analytics](https://plausible.io) para métricas de página + [OpenTelemetry](https://opentelemetry.io/) para traces. Mais simples, porém com menos capacidade de análise de funil.

**O que NÃO usar no MVP**:
- Google Analytics 4: transfere dados para os EUA, requer DPA complexo, interpretação jurídica ambígua em países da UE/BR
- Mixpanel: modelo de preços por evento pode ficar caro rapidamente; dados armazenados nos EUA
- Amplitude: mesmo problema de localização de dados

### Collection approach

```
Client Component (browser)
    │
    │  [Opção A — recomendada para MVP]
    ▼
Server Action / API Route (Next.js)
    │  ← validação Zod, hashing do userId, remoção de PII
    ▼
PostHog Node.js SDK (server-side)
    │
    ▼
PostHog Cloud (EU region) ou PostHog self-hosted
```

**Por que server-side collection?**
- Garante que nenhum PII chega ao PostHog — a transformação (hashing) acontece no servidor
- Imune a ad blockers que bloqueiam scripts de analytics
- Dados mais confiáveis — sem falhas de JavaScript no cliente
- Sem SDK de terceiros carregado no browser (melhor performance)

**Exceção**: eventos de navegação (`page_viewed`) que precisam de contexto do browser (viewport, device) podem ser coletados client-side via um endpoint próprio que aplica transformação antes de encaminhar ao PostHog.

```typescript
// src/server/analytics/client.ts
import "server-only";
import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

export const analytics = new PostHog(env.POSTHOG_API_KEY, {
  host: env.POSTHOG_HOST,
  // Desabilitar captura automática — apenas eventos explícitos
  // (evita captura acidental de PII em propriedades automáticas)
  flushAt: 20,
  flushInterval: 10000, // 10s
});

// Garantir flush antes de shutdown (importante em Vercel serverless)
export async function flushAnalytics(): Promise<void> {
  await analytics.shutdown();
}
```

```typescript
// src/server/analytics/track.ts
import "server-only";
import { createId } from "@paralleldrive/cuid2";
import { analytics } from "./client";
import { hashUserId, hashEntityId } from "@/lib/analytics/hash";
import { BaseEventSchema } from "@/lib/analytics/base-event.schema";
import type { BaseEvent } from "@/lib/analytics/base-event.schema";

interface TrackOptions {
  userId?: string;         // raw userId — será hasheado internamente
  anonymousId: string;
  eventName: string;
  properties?: Record<string, unknown>;
  context: Omit<BaseEvent, "event_id" | "event_name" | "timestamp" | "user_id_hash">;
}

export async function track(options: TrackOptions): Promise<void> {
  const { userId, anonymousId, eventName, properties = {}, context } = options;

  const userIdHash = userId
    ? hashUserId(userId)
    : `anon:${anonymousId}`;

  const event: BaseEvent = {
    event_id: createId(),
    event_name: eventName,
    timestamp: new Date().toISOString(),
    user_id_hash: userIdHash,
    anonymous_id: anonymousId,
    ...context,
  };

  // Validar schema antes de enviar
  const parsed = BaseEventSchema.safeParse(event);
  if (!parsed.success) {
    // Log do erro de schema, mas não expor detalhes externamente
    console.error("[analytics] Invalid event schema", {
      event_name: eventName,
      errors: parsed.error.flatten(),
    });
    return; // Silently drop — não quebrar o fluxo do usuário
  }

  await analytics.capture({
    distinctId: userIdHash,
    event: eventName,
    properties: {
      ...parsed.data,
      ...properties,
    },
  });
}
```

### Storage approach

Para o MVP, toda a persistência de analytics fica no PostHog — não há data warehouse separado. Esta decisão será revisitada quando:
- Volume de eventos exceder 1M/mês (PostHog free tier limit)
- A equipe precisar de SQL ad hoc sobre dados de analytics
- Relatórios de BI forem necessários além do que o PostHog oferece nativamente

**Quando migrar para warehouse (pós-MVP)**: BigQuery (Google Cloud, free tier generoso) ou Redshift. O schema de eventos definido neste documento foi projetado para migração direta — `BaseEvent` mapeia 1:1 para uma tabela de fatos em star schema.

---

## GDPR Compliance

> Conformidade com GDPR e LGPD: regras de minimização de dados, rastreamento de consentimento e pipeline de erasure.

### Data minimization rules

**O que NUNCA armazenar em analytics:**

| Data | Why it's forbidden | Safe alternative |
|---|---|---|
| Nome do usuário | PII direto | Nenhum identificador nominal |
| Email | PII direto | `auth_provider` (google/email/apple) apenas |
| Foto de perfil / avatar URL | PII direto | Nenhum |
| Títulos de viagens | Podem conter nomes de pessoas | `trip_id_hash` apenas |
| Notas e descrições | Texto livre — PII potencial | Nenhum |
| Texto de busca | Pode conter nomes, endereços | `query_length` (inteiro) apenas |
| IP address completo | PII sob GDPR | IP truncado (último octeto zerado) |
| User-Agent completo | Fingerprintable | `browser_family`, `os_family`, `device_type` |
| Coordenadas GPS precisas | PII de localização | País ou região apenas |
| Horário exato de viagem | Combinado com outras info, é PII | Data (sem hora) — e só se necessário |

**O que é seguro em analytics:**

- `user_id_hash`: SHA-256 com salt — irreversível sem o salt
- `destination_slug` / `destination_country`: dados públicos do sistema
- `auth_provider`: "google", "apple", "email"
- `device_type`, `os_family`, `browser_family`: contexto agregado
- Contadores e métricas (número de dias, número de atividades)
- `page_path` com templates: `/trips/[id]` — nunca o ID real

### Consent tracking

O Travel Planner precisa de consentimento para uso de cookies analíticos antes de ativar o tracking. A estratégia recomendada:

```typescript
// src/lib/analytics/consent.ts

export type ConsentLevel = "none" | "analytics" | "full";

interface ConsentRecord {
  level: ConsentLevel;
  granted_at: string;    // ISO 8601
  version: string;       // versão da política de privacidade aceita
}

const CONSENT_COOKIE = "_tp_consent";

/**
 * Regras de consent:
 * - "none":      nenhum tracking. Apenas cookies estritamente necessários
 *               (sessão Auth.js). anonymous_id NÃO é definido.
 * - "analytics": tracking de comportamento com PostHog. anonymous_id é criado.
 *               Nenhum dado pessoal identificável é coletado.
 * - "full":      reservado para futuras integrações (ex: personalização).
 *               No MVP, equivalente a "analytics".
 *
 * Consent é gravado em cookie 1st-party + PostgreSQL (para usuários autenticados,
 * para conformidade com art. 7 GDPR — necessidade de provar o consentimento).
 */
export function getConsent(): ConsentRecord | null {
  // Implementação lê o cookie _tp_consent
  // Retorna null se nenhum consentimento foi dado
  return null; // placeholder
}

export function hasAnalyticsConsent(): boolean {
  const consent = getConsent();
  return consent?.level === "analytics" || consent?.level === "full";
}
```

**Regra de implementação**: o `track()` wrapper deve verificar `hasAnalyticsConsent()` antes de enviar qualquer evento. Se não houver consentimento, o evento é descartado silenciosamente.

Para usuários da UE/BR, o banner de consentimento deve ser exibido antes de qualquer script de analytics ser carregado. A implementação do banner é responsabilidade do `ux-designer` (UX spec) e do `dev-fullstack` (implementação), com validação do `security-specialist`.

### Right to erasure pipeline

```
Usuário solicita exclusão de conta
    │
    ▼
[1] Server Action: requestAccountDeletion(userId)
    │
    ├── Validar identidade (senha ou re-auth OAuth)
    ├── Setar user.deletedAt = now() no PostgreSQL
    ├── Revogar todas as sessões ativas no Redis
    ├── Enfileirar job: ERASURE_JOB { userId, requestedAt, deadline: +30days }
    └── Enviar email de confirmação: "recebemos seu pedido, em até 30 dias..."

    │
    ▼  (job assíncrono — pode ser cron job diário ou Redis queue)

[2] ErasureJob.execute(userId)
    │
    ├── Verificar que userId ainda está marcado como deletedAt (não foi reativado)
    ├── hashUserId(userId) → userIdHash
    ├── analytics.deleteUser(userIdHash)   ← PostHog API: DELETE /api/person
    ├── db.user.delete({ where: { id: userId } })  ← cascade deleta tudo
    ├── Limpar Redis: revogar tokens OAuth, limpar caches do usuário
    └── db.auditLog.create({
            action: "USER_ERASURE_COMPLETED",
            subjectHash: userIdHash,
            completedAt: now(),
            requestedAt: job.requestedAt,
        })

    │
    ▼
[3] Enviar email final de confirmação
    (este é o último uso do email — deletar após envio)
```

**Prazo máximo**: 30 dias após a solicitação (GDPR Art. 17 + Art. 12.3).

**Audit log**: o `auditLog` deve existir mesmo após a exclusão do usuário. Ele usa apenas o `userIdHash` — sem PII — para provar que a exclusão foi executada. Retenção do audit log: 7 anos (obrigação legal).

---

## Analytics Data Model (Future — pós-MVP)

> Quando o volume de eventos justificar um data warehouse, este é o modelo dimensional recomendado.

Esta seção documenta o schema alvo para quando migrarmos do PostHog puro para um warehouse (BigQuery ou Redshift). Projetado agora para que a migração seja uma exportação direta, não uma reescrita.

### Fact Table: fact_events

| Column | Type | Description | PII |
|---|---|---|---|
| event_id | STRING | CUID2 — unique event identifier | No |
| event_name | STRING | snake_case event name | No |
| timestamp | TIMESTAMP | UTC | No |
| user_id_hash | STRING | SHA-256(userId + SALT) | No |
| anonymous_id | STRING | Pre-auth identifier | No |
| session_id | STRING | 30min rotation | No |
| platform | STRING | "web" | No |
| app_version | STRING | Semver | No |
| device_type | STRING | mobile/tablet/desktop | No |
| os_family | STRING | Windows/macOS/iOS/etc | No |
| browser_family | STRING | Chrome/Firefox/etc | No |
| viewport_width | INT64 | Pixels | No |
| page_path | STRING | Template path | No |
| referrer_type | STRING | organic/direct/etc | No |
| properties | JSON | Event-specific properties | No |
| ingested_at | TIMESTAMP | Warehouse ingestion time | No |

### Dimension Table: dim_dates

Standard date dimension (year, month, week, day_of_week, is_weekend, is_holiday).

### Key Metrics (pre-computed)

| Metric | Definition | Grain |
|---|---|---|
| daily_active_users | count(distinct user_id_hash) | daily |
| trip_creation_rate | trip_created events / signed_in users | weekly |
| search_to_bookmark_rate | bookmark_added / destination_searched | daily, destination |
| session_duration | max(timestamp) - min(timestamp) per session_id | daily |
| feature_adoption | distinct users triggering P0 events | weekly |
| auth_provider_mix | count by auth_provider | monthly |

---

## Environment Variables Required

Adicionar ao `.env.example` e validar via `@t3-oss/env-nextjs` em `src/lib/env.ts`:

```bash
# Analytics — obrigatório em produção, opcional em desenvolvimento
ANALYTICS_SALT=              # openssl rand -hex 32 — NUNCA rotacionar sem erasure planning
ANALYTICS_ENTITY_SALT=       # openssl rand -hex 32 — diferente do ANALYTICS_SALT
POSTHOG_API_KEY=             # phc_xxxxx — obtido no PostHog dashboard
POSTHOG_HOST=                # https://eu.posthog.com (EU cloud) ou URL self-hosted
```

```typescript
// Adições necessárias em src/lib/env.ts
server: {
  // ... vars existentes ...
  ANALYTICS_SALT: z.string().min(64),          // 32 bytes = 64 hex chars
  ANALYTICS_ENTITY_SALT: z.string().min(64),
  POSTHOG_API_KEY: z.string().startsWith("phc_"),
  POSTHOG_HOST: z.string().url(),
},
```

---

## Open Questions

- [ ] **Consentimento para usuários BR (LGPD)**: A LGPD tem requisitos similares ao GDPR para consentimento de dados analíticos. Confirmar com o `security-specialist` se a mesma implementação de consent banner cobre ambas as jurisdições.
- [ ] **Session replay no PostHog**: O PostHog oferece session replay (gravação de tela). Este recurso DEVE ter mascaramento de campos sensíveis habilitado se ativado — por padrão, mascarar todos os inputs de formulário. Decisão: ativar somente com revisão do `security-specialist`.
- [ ] **Notificações por email**: Quando funcionalidade de email for adicionada, o `data-engineer` deve definir o schema de eventos de email (sent, opened, clicked) — com atenção especial a open tracking (pixel de rastreamento é PII potencial).
- [ ] **Multi-tenancy / B2B**: Se o modelo de dados evoluir para workspaces/organizações (ver `docs/architecture.md` Open Questions), o `user_id_hash` precisará ser complementado com `workspace_id_hash` nos eventos.
- [ ] **Plataforma mobile futura**: Se um app mobile for desenvolvido, o `platform` do BaseEvent deve ser estendido para `'web' | 'ios' | 'android'` e uma estratégia de `device_id` (IDFV/Android ID hasheado) precisará ser definida.
- [ ] **Retenção de logs de Sentry**: Confirmar com o `security-specialist` que os logs do Sentry não capturam PII (corpo de requests de auth, tokens em query strings). Implementar `beforeSend` hook no Sentry para sanitizar dados sensíveis antes do envio.
- [ ] **Auditoria de acesso a dados**: Para compliance avançado (eventual ISO 27001 ou SOC 2), será necessário um audit log de quem acessou quais dados no painel de analytics (quem viu os dados do PostHog). Deferido para pós-MVP.

---

## Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-23 | data-engineer | Initial data architecture — event schema, P0 events, identity strategy, retention, GDPR pipeline, PostHog recommendation |
