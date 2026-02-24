# DATA-TRACK-001: Event Tracking — Trip Creation & Management

**Status**: Draft
**Date**: 2026-02-23
**Author**: data-engineer
**Related**: SPEC-001, US-001, data-architecture.md
**Tracking Spec ID**: DATA-TRACK-001

---

## Overview

Este documento define os eventos de analytics a instrumentar para a feature de Criacao e Gestao de Viagens (US-001). Cobre os 7 eventos necessarios para responder as perguntas de negocio criticas, validar os criterios de aceite mensuráveis de US-001, e construir a base de dados que alimentara decisoes de produto a partir do primeiro deploy.

Todos os eventos seguem a `BaseEvent` definida em `docs/data-architecture.md`. Nenhum evento contem PII. O despacho e exclusivamente server-side (Server Actions). Todos os eventos sao filtrados por `hasAnalyticsConsent()` antes do envio.

---

## Business Questions This Data Must Answer

Os eventos abaixo foram desenhados para responder precisamente estas perguntas — nenhum evento e instrumentado sem uma pergunta de negocio correspondente:

1. Qual a taxa de conclusao do formulario de criacao? (Meta: >= 85%)
2. Qual o percentual de usuarios que abandonam `/trips/new` sem criar? (Meta: <= 15%)
3. Quanto tempo em media leva para um usuario criar uma viagem?
4. Quantos usuarios atingem o limite de 20 viagens — sinal de engajamento ou bloqueio de crescimento?
5. Quais campos sao mais editados pos-criacao? (informa priorizacao de UX em edicao inline)
6. Qual a distribuicao de status nas viagens criadas? (informa ciclo de vida do viajante)
7. Qual a taxa de exclusao vs. arquivamento? (informa intencao do usuario e qualidade da feature de arquivamento)
8. Quais dispositivos dominam o fluxo de criacao? (informa otimizacao mobile-first)
9. Quantos usuarios criaram ao menos uma viagem (ativacao)?
10. Qual a pagina de detalhe de viagem que mais converte para criacao de itinerario (futura US-002)?

---

## Event Inventory

### Summary Table

| Event Name | Trigger | Server Action / Layer | Priority | GDPR Risk |
|---|---|---|---|---|
| `trip_created` | `createTrip` retorna sucesso | TripService.createTrip() | P0 | Low |
| `trip_updated` | `updateTrip` retorna sucesso | TripService.updateTrip() | P0 | Low |
| `trip_archived` | `archiveTrip` retorna sucesso | TripService.archiveTrip() | P0 | Low |
| `trip_deleted` | `deleteTrip` aplica soft delete | TripService.deleteTrip() | P0 | Low |
| `trip_limit_reached` | TripService lanca TRIP_LIMIT_REACHED | TripService.assertTripLimitNotReached() | P1 | Low |
| `trip_list_viewed` | Pagina `/trips` e renderizada por usuario autenticado | page render — Server Component | P1 | Low |
| `trip_detail_viewed` | Pagina `/trips/[id]` e renderizada por usuario autenticado | page render — Server Component | P1 | Low |

---

## Event Definitions

### `trip_created`

**Trigger**: `TripService.createTrip()` executa com sucesso e o registro e persistido no PostgreSQL. Disparado antes do `redirect()` no Server Action.

**Source**: Server (Server Action `createTrip` — `src/server/actions/trip.actions.ts`)

**Priority**: P0 — instrumentar antes do primeiro usuario real.

**Business questions answered**: Taxa de ativacao (usuarios que criam ao menos uma viagem), distribuicao de status inicial, percentual de viagens com datas definidas, tempo de vida medio de uma viagem (combinado com `trip_deleted`).

**TypeScript Interface**:

```typescript
// src/lib/analytics/events/trip-events.ts
import type { BaseEvent } from "@/lib/analytics/base-event.schema";

export interface TripCreatedEvent extends BaseEvent {
  event_name: "trip_created";
  properties: {
    // Identificadores hasheados
    trip_id_hash: string;       // hashEntityId("trip", trip.id) via ANALYTICS_ENTITY_SALT

    // Caracteristicas estruturais da viagem (sem PII)
    has_start_date: boolean;    // se startDate foi fornecida
    has_end_date: boolean;      // se endDate foi fornecida
    has_description: boolean;   // se description foi fornecida (sem o texto)
    trip_duration_days: number | null;  // endDate - startDate em dias; null se sem datas
    days_until_departure: number | null; // startDate - hoje em dias; null se sem data
    cover_gradient: string;     // ex: "sunset", "ocean" — dado do sistema, nao PII
    initial_status: "PLANNING"; // sempre PLANNING na criacao

    // Contexto do formulario
    form_source: "new_page";    // sempre "/trips/new" para criacao direta
  };
}
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `trip_id_hash` | string (64 hex) | `"a3f2...c9"` | No | `hashEntityId("trip", trip.id)` — ANALYTICS_ENTITY_SALT |
| `has_start_date` | boolean | `true` | No | Estrutural — nao e a data em si |
| `has_end_date` | boolean | `true` | No | |
| `has_description` | boolean | `false` | No | Presenca — nunca o conteudo |
| `trip_duration_days` | integer or null | `14` | No | Metrica de planejamento |
| `days_until_departure` | integer or null | `45` | No | Lead time de reserva |
| `cover_gradient` | string | `"sunset"` | No | 1 de 8 opcoes do sistema |
| `initial_status` | string | `"PLANNING"` | No | Sempre PLANNING — confirma estado inicial |
| `form_source` | string | `"new_page"` | No | Para diferenciar criacao direta vs. futura criacao rapida |

**PII Assessment**: Nenhum. Titulo, destino e descricao sao NUNCA incluidos. `trip_id_hash` e irreversivel sem o salt.

**Zod Schema**:

```typescript
// src/lib/analytics/events/trip-events.schema.ts
import { z } from "zod";
import { BaseEventSchema } from "@/lib/analytics/base-event.schema";

export const TripCreatedEventSchema = BaseEventSchema.extend({
  event_name: z.literal("trip_created"),
  properties: z.object({
    trip_id_hash:        z.string().regex(/^[a-f0-9]{64}$/),
    has_start_date:      z.boolean(),
    has_end_date:        z.boolean(),
    has_description:     z.boolean(),
    trip_duration_days:  z.number().int().nonnegative().nullable(),
    days_until_departure: z.number().int().nullable(),
    cover_gradient:      z.enum(["sunset","ocean","forest","desert","aurora","city","sakura","alpine"]),
    initial_status:      z.literal("PLANNING"),
    form_source:         z.enum(["new_page"]),
  }),
});
```

---

### `trip_updated`

**Trigger**: `TripService.updateTrip()` executa com sucesso e o `updatedAt` e escrito no PostgreSQL. Disparado no Server Action `updateTrip`, apos persist e antes do `redirect()`.

**Source**: Server (Server Action `updateTrip` — `src/server/actions/trip.actions.ts`)

**Priority**: P0

**Business questions answered**: Quais campos sao mais modificados pos-criacao? Usuarios editam mais datas ou destinos? A feature de edicao e usada ou os usuarios criavam novamente?

**TypeScript Interface**:

```typescript
export interface TripUpdatedEvent extends BaseEvent {
  event_name: "trip_updated";
  properties: {
    trip_id_hash: string;          // hashEntityId("trip", trip.id)
    fields_changed: string[];      // ex: ["title", "endDate"] — SOMENTE NOMES, nunca valores
    field_count_changed: number;   // cardinalidade de fields_changed
    trip_current_status: TripStatus; // status no momento da edicao
    has_date_change: boolean;      // true se startDate ou endDate mudou
  };
}

type TripStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `trip_id_hash` | string (64 hex) | `"a3f2...c9"` | No | ANALYTICS_ENTITY_SALT |
| `fields_changed` | string[] | `["endDate","description"]` | No | Nomes de campo do schema — NUNCA valores |
| `field_count_changed` | integer | `2` | No | Derivado de `fields_changed.length` |
| `trip_current_status` | string | `"PLANNING"` | No | Status no momento da edicao |
| `has_date_change` | boolean | `true` | No | Flag de conveniencia para queries de datas |

**PII Assessment**: Nenhum. `fields_changed` lista apenas os nomes dos campos (`["title", "destination"]`), NUNCA seus valores. Os valores sao PII potencial (titulo e destino sao texto livre).

**Critical rule**: O campo `confirmationTitle` do `deleteTrip` NUNCA deve aparecer em `fields_changed`. Ele nao e um campo do schema do Trip — e apenas uma confirmacao de UI.

---

### `trip_archived`

**Trigger**: `TripService.archiveTrip()` executa com sucesso (status muda para `ARCHIVED`). Disparado no Server Action `archiveTrip` apos `revalidatePath`.

**Source**: Server (Server Action `archiveTrip` — `src/server/actions/trip.actions.ts`)

**Priority**: P0

**Business questions answered**: Qual a taxa de arquivamento vs. exclusao? Qual status a viagem tinha antes de ser arquivada (PLANNING vs ACTIVE vs COMPLETED)? Os usuarios arquivam viagens concluidas ou cancelam planos antes de viajar?

**TypeScript Interface**:

```typescript
export interface TripArchivedEvent extends BaseEvent {
  event_name: "trip_archived";
  properties: {
    trip_id_hash: string;          // hashEntityId("trip", trip.id)
    previous_status: TripStatus;   // status ANTES do arquivamento
    had_start_date: boolean;       // se a viagem tinha datas definidas
    trip_age_days: number;         // createdAt ate now() em dias — ciclo de vida
  };
}
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `trip_id_hash` | string (64 hex) | `"a3f2...c9"` | No | ANALYTICS_ENTITY_SALT |
| `previous_status` | string | `"PLANNING"` | No | Informa o motivo provavel do arquivamento |
| `had_start_date` | boolean | `true` | No | Viagens sem data sao mais descartaveis? |
| `trip_age_days` | integer | `30` | No | Tempo de vida da viagem antes de arquivar |

**PII Assessment**: Nenhum. Status e timestamps sao dados do sistema.

---

### `trip_deleted`

**Trigger**: `TripService.deleteTrip()` seta `deletedAt` com sucesso (soft delete). Disparado no Server Action `deleteTrip` apos escrita no banco.

**Source**: Server (Server Action `deleteTrip` — `src/server/actions/trip.actions.ts`)

**Priority**: P0

**Business questions answered**: Qual a taxa de exclusao absoluta? Usuarios excluem viagens logo apos criar (erro) ou apos longo uso? Qual o ciclo de vida medio de uma viagem excluida?

**TypeScript Interface**:

```typescript
export interface TripDeletedEvent extends BaseEvent {
  event_name: "trip_deleted";
  properties: {
    trip_id_hash: string;          // hashEntityId("trip", trip.id)
    previous_status: TripStatus;   // status antes do soft delete
    trip_age_days: number;         // createdAt ate now() em dias
    had_start_date: boolean;       // viagem tinha datas?
    deletion_source: "detail_page" | "list_page"; // de onde o usuario deletou
  };
}
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `trip_id_hash` | string (64 hex) | `"a3f2...c9"` | No | ANALYTICS_ENTITY_SALT |
| `previous_status` | string | `"PLANNING"` | No | |
| `trip_age_days` | integer | `5` | No | Age < 1 dia pode indicar criacao acidental |
| `had_start_date` | boolean | `false` | No | |
| `deletion_source` | string | `"detail_page"` | No | Contexto de onde a acao veio |

**PII Assessment**: Nenhum. `confirmationTitle` (o texto digitado pelo usuario para confirmar exclusao) e NUNCA incluido. Essa string e PII potencial (e o titulo da viagem, texto livre).

**GDPR note**: Apos um evento `trip_deleted`, nenhum dado associado a essa viagem deve persistir no pipeline de analytics alem do `trip_id_hash` ja presente em eventos anteriores. O pipeline de erasure do `ErasureService` (ver `data-architecture.md`) cobre a remocao de dados do usuario do PostHog na exclusao de conta — nao por exclusao individual de viagem.

---

### `trip_limit_reached`

**Trigger**: `TripService.assertTripLimitNotReached()` lanca `AppError` com codigo `TRIP_LIMIT_REACHED`. Disparado dentro do `TripService.createTrip()`, antes de qualquer escrita no banco.

**Source**: Server (TripService — `src/server/services/trip.service.ts`)

**Priority**: P1 — importante sinal de funil e de limite de negocio.

**Business questions answered**: Quantos usuarios atingem o limite de 20 viagens? Este limite esta bloqueando crescimento ou e razoavel para o MVP? Qual a porcentagem de usuarios que atingem o limite e arquivam vs. abandonam o produto?

**TypeScript Interface**:

```typescript
export interface TripLimitReachedEvent extends BaseEvent {
  event_name: "trip_limit_reached";
  properties: {
    current_active_trip_count: number; // deve ser exatamente 20 neste evento
    limit_value: number;               // 20 — documentar o limite que foi atingido
    // Sem trip_id_hash — a viagem nao foi criada
  };
}
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `current_active_trip_count` | integer | `20` | No | Confirma que o limite foi atingido |
| `limit_value` | integer | `20` | No | Permite detectar se o limite mudar no futuro |

**PII Assessment**: Nenhum. Apenas contadores numericos.

**Note**: Este evento nao tem `trip_id_hash` porque nenhuma viagem foi criada — o limite foi bloqueante. O `user_id_hash` da `BaseEvent` e suficiente para correlacionar com o usuario.

---

### `trip_list_viewed`

**Trigger**: A pagina `/trips` e renderizada com sucesso para um usuario autenticado. Disparado no Server Component `src/app/(auth)/trips/page.tsx` apos buscar os dados de listagem.

**Source**: Server (Server Component `page.tsx` — chamada ao `TripService.listTrips()`)

**Priority**: P1

**Business questions answered**: Quantas vezes usuarios retornam a listagem (engajamento)? Qual e a distribuicao de status das viagens dos usuarios? Usuarios com mais viagens sao mais ou menos engajados?

**TypeScript Interface**:

```typescript
export interface TripListViewedEvent extends BaseEvent {
  event_name: "trip_list_viewed";
  properties: {
    total_trip_count: number;           // total de viagens nao-deletadas do usuario
    active_trip_count: number;          // PLANNING + ACTIVE + COMPLETED
    archived_trip_count: number;        // ARCHIVED
    current_page: number;               // pagina atual (paginacao — AC-010)
    active_status_filter: string;       // filtro de status ativo ("all", "PLANNING", etc.)
    has_empty_state: boolean;           // true se nenhuma viagem encontrada com o filtro
  };
}
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `total_trip_count` | integer | `5` | No | Contagem — nao lista IDs ou titulos |
| `active_trip_count` | integer | `3` | No | |
| `archived_trip_count` | integer | `2` | No | |
| `current_page` | integer | `1` | No | |
| `active_status_filter` | string | `"all"` | No | Qual tab o usuario esta vendo |
| `has_empty_state` | boolean | `false` | No | True quando zero resultados com filtro ativo |

**PII Assessment**: Nenhum. Apenas contadores e estado de UI.

---

### `trip_detail_viewed`

**Trigger**: A pagina `/trips/[id]` e renderizada com sucesso para o usuario dono da viagem. Disparado no Server Component `src/app/(auth)/trips/[id]/page.tsx` apos `TripService.getTripById()` retornar com sucesso.

**Source**: Server (Server Component `[id]/page.tsx`)

**Priority**: P1

**Business questions answered**: Quais viagens recebem mais visitas (engajamento por viagem)? Viagens com mais dias de antecedencia recebem mais visitas de planejamento? A pagina de detalhe e um ponto de retorno frequente?

**TypeScript Interface**:

```typescript
export interface TripDetailViewedEvent extends BaseEvent {
  event_name: "trip_detail_viewed";
  properties: {
    trip_id_hash: string;              // hashEntityId("trip", trip.id)
    trip_status: TripStatus;           // status atual da viagem
    days_until_departure: number | null; // null se sem data de inicio
    trip_duration_days: number | null;   // null se sem datas completas
    has_description: boolean;          // viagem tem descricao preenchida?
    view_source: "direct" | "list";    // veio de link direto ou da listagem?
  };
}
```

**Properties**:

| Property | Type | Example | PII? | Notes |
|---|---|---|---|---|
| `trip_id_hash` | string (64 hex) | `"a3f2...c9"` | No | ANALYTICS_ENTITY_SALT |
| `trip_status` | string | `"PLANNING"` | No | |
| `days_until_departure` | integer or null | `30` | No | Distancia temporal — nao a data |
| `trip_duration_days` | integer or null | `7` | No | |
| `has_description` | boolean | `true` | No | Presenca — nao o conteudo |
| `view_source` | string | `"list"` | No | Contexto de navegacao |

**PII Assessment**: Nenhum. Destino, titulo e descricao sao NUNCA incluidos.

---

## Implementation Guide

### Where to Instrument

| Event | File | Location in code | Notes |
|---|---|---|---|
| `trip_created` | `src/server/services/trip.service.ts` | Apos `db.trip.create()` retornar com sucesso | Recebe o objeto `trip` criado com `id` para hashear |
| `trip_updated` | `src/server/services/trip.service.ts` | Apos `db.trip.update()` retornar com sucesso | Recebe os campos que foram efetivamente alterados |
| `trip_archived` | `src/server/services/trip.service.ts` | Apos `db.trip.update({ data: { status: "ARCHIVED" } })` | Recebe o status anterior da viagem |
| `trip_deleted` | `src/server/services/trip.service.ts` | Apos `db.trip.update({ data: { deletedAt: new Date() } })` | Soft delete confirmado |
| `trip_limit_reached` | `src/server/services/trip.service.ts` | Dentro de `assertTripLimitNotReached()`, antes de lancar o erro | Disparado mesmo quando o erro e lancado |
| `trip_list_viewed` | `src/app/(auth)/trips/page.tsx` | Apos `TripService.listTrips()` retornar dados, antes de `return <JSX>` | Server Component — pode usar `await` diretamente |
| `trip_detail_viewed` | `src/app/(auth)/trips/[id]/page.tsx` | Apos `TripService.getTripById()` retornar com sucesso | Nunca disparar se a viagem nao for encontrada (404) |

**Regra de instrumentacao**: o despacho de eventos ocorre na camada de Service (`TripService`), nao diretamente no Server Action. Isso garante que:
1. A logica de negocio e o tracking estao co-localizados
2. Se o Service for reutilizado por outras camadas (API REST futura), o tracking persiste automaticamente
3. Testabilidade: o Service pode ser testado com mocks do analytics

Excecao: eventos de page view (`trip_list_viewed`, `trip_detail_viewed`) sao disparados no Server Component porque dependem de contexto de renderizacao (searchParams, query result).

### TypeScript Interfaces — Complete File

O arquivo abaixo define todas as interfaces e o schema Zod de validacao:

```typescript
// src/lib/analytics/events/trip-events.ts
import "server-only";
import type { BaseEvent } from "@/lib/analytics/base-event.schema";

type TripStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type CoverGradient = "sunset" | "ocean" | "forest" | "desert" | "aurora" | "city" | "sakura" | "alpine";

// ─── trip_created ────────────────────────────────────────────────────────────

export interface TripCreatedProperties {
  trip_id_hash: string;
  has_start_date: boolean;
  has_end_date: boolean;
  has_description: boolean;
  trip_duration_days: number | null;
  days_until_departure: number | null;
  cover_gradient: CoverGradient;
  initial_status: "PLANNING";
  form_source: "new_page";
}

export interface TripCreatedEvent extends BaseEvent {
  event_name: "trip_created";
  properties: TripCreatedProperties;
}

// ─── trip_updated ────────────────────────────────────────────────────────────

export interface TripUpdatedProperties {
  trip_id_hash: string;
  fields_changed: string[];       // APENAS nomes de campo — nunca valores
  field_count_changed: number;
  trip_current_status: TripStatus;
  has_date_change: boolean;
}

export interface TripUpdatedEvent extends BaseEvent {
  event_name: "trip_updated";
  properties: TripUpdatedProperties;
}

// ─── trip_archived ───────────────────────────────────────────────────────────

export interface TripArchivedProperties {
  trip_id_hash: string;
  previous_status: TripStatus;
  had_start_date: boolean;
  trip_age_days: number;
}

export interface TripArchivedEvent extends BaseEvent {
  event_name: "trip_archived";
  properties: TripArchivedProperties;
}

// ─── trip_deleted ────────────────────────────────────────────────────────────

export interface TripDeletedProperties {
  trip_id_hash: string;
  previous_status: TripStatus;
  trip_age_days: number;
  had_start_date: boolean;
  deletion_source: "detail_page" | "list_page";
}

export interface TripDeletedEvent extends BaseEvent {
  event_name: "trip_deleted";
  properties: TripDeletedProperties;
}

// ─── trip_limit_reached ──────────────────────────────────────────────────────

export interface TripLimitReachedProperties {
  current_active_trip_count: number;
  limit_value: number;
}

export interface TripLimitReachedEvent extends BaseEvent {
  event_name: "trip_limit_reached";
  properties: TripLimitReachedProperties;
}

// ─── trip_list_viewed ────────────────────────────────────────────────────────

export interface TripListViewedProperties {
  total_trip_count: number;
  active_trip_count: number;
  archived_trip_count: number;
  current_page: number;
  active_status_filter: string;
  has_empty_state: boolean;
}

export interface TripListViewedEvent extends BaseEvent {
  event_name: "trip_list_viewed";
  properties: TripListViewedProperties;
}

// ─── trip_detail_viewed ──────────────────────────────────────────────────────

export interface TripDetailViewedProperties {
  trip_id_hash: string;
  trip_status: TripStatus;
  days_until_departure: number | null;
  trip_duration_days: number | null;
  has_description: boolean;
  view_source: "direct" | "list";
}

export interface TripDetailViewedEvent extends BaseEvent {
  event_name: "trip_detail_viewed";
  properties: TripDetailViewedProperties;
}

// ─── Union type (para o allowlist de eventos em BaseEventSchema) ─────────────

export type TripEvent =
  | TripCreatedEvent
  | TripUpdatedEvent
  | TripArchivedEvent
  | TripDeletedEvent
  | TripLimitReachedEvent
  | TripListViewedEvent
  | TripDetailViewedEvent;

export type TripEventName = TripEvent["event_name"];

export const TRIP_EVENT_NAMES: TripEventName[] = [
  "trip_created",
  "trip_updated",
  "trip_archived",
  "trip_deleted",
  "trip_limit_reached",
  "trip_list_viewed",
  "trip_detail_viewed",
];
```

### Helper: Building Event Properties

```typescript
// src/server/analytics/trip-analytics.ts
import "server-only";
import { hashEntityId } from "@/lib/analytics/hash";
import { differenceInDays, startOfDay } from "date-fns";
import type {
  TripCreatedProperties,
  TripUpdatedProperties,
  TripArchivedProperties,
  TripDeletedProperties,
} from "@/lib/analytics/events/trip-events";
import type { Trip } from "@prisma/client";

export function buildTripCreatedProperties(
  trip: Pick<Trip, "id" | "startDate" | "endDate" | "description" | "coverGradient" | "status">
): TripCreatedProperties {
  const now = startOfDay(new Date());

  return {
    trip_id_hash:        hashEntityId("trip", trip.id),
    has_start_date:      trip.startDate !== null,
    has_end_date:        trip.endDate !== null,
    has_description:     Boolean(trip.description && trip.description.trim().length > 0),
    trip_duration_days:  (trip.startDate && trip.endDate)
                           ? differenceInDays(trip.endDate, trip.startDate)
                           : null,
    days_until_departure: trip.startDate
                           ? differenceInDays(trip.startDate, now)
                           : null,
    cover_gradient:      trip.coverGradient as TripCreatedProperties["cover_gradient"],
    initial_status:      "PLANNING",
    form_source:         "new_page",
  };
}

export function buildTripUpdatedProperties(
  trip: Pick<Trip, "id" | "status">,
  fieldsChanged: (keyof Trip)[]
): TripUpdatedProperties {
  const dateFields = ["startDate", "endDate"] as const;
  return {
    trip_id_hash:        hashEntityId("trip", trip.id),
    fields_changed:      fieldsChanged as string[],
    field_count_changed: fieldsChanged.length,
    trip_current_status: trip.status,
    has_date_change:     fieldsChanged.some((f) => (dateFields as string[]).includes(f)),
  };
}

export function buildTripArchivedProperties(
  trip: Pick<Trip, "id" | "status" | "startDate" | "createdAt">
): TripArchivedProperties {
  return {
    trip_id_hash:    hashEntityId("trip", trip.id),
    previous_status: trip.status,
    had_start_date:  trip.startDate !== null,
    trip_age_days:   differenceInDays(new Date(), trip.createdAt),
  };
}

export function buildTripDeletedProperties(
  trip: Pick<Trip, "id" | "status" | "startDate" | "createdAt">,
  deletionSource: "detail_page" | "list_page"
): TripDeletedProperties {
  return {
    trip_id_hash:     hashEntityId("trip", trip.id),
    previous_status:  trip.status,
    trip_age_days:    differenceInDays(new Date(), trip.createdAt),
    had_start_date:   trip.startDate !== null,
    deletion_source:  deletionSource,
  };
}
```

### Hashing Requirements

| Field | Salt Used | Function | Notes |
|---|---|---|---|
| `user_id_hash` (BaseEvent) | `ANALYTICS_SALT` | `hashUserId(userId)` | Herda da BaseEvent — sempre presente |
| `trip_id_hash` | `ANALYTICS_ENTITY_SALT` | `hashEntityId("trip", tripId)` | Salt diferente para impedir correlacao cruzada |

**Regra**: Nunca usar `ANALYTICS_SALT` para hashear `tripId`. Os dois salts devem ser diferentes. A separacao impede que um atacante com acesso ao salt de usuarios consiga re-identificar entidades.

### Analytics Dispatch Pattern in TripService

O `TripService` deve chamar `track()` com verificacao de consentimento embutida:

```typescript
// Exemplo de integracao no TripService.createTrip()
// src/server/services/trip.service.ts

import { track } from "@/server/analytics/track";
import { buildTripCreatedProperties } from "@/server/analytics/trip-analytics";
import { getAnalyticsContext } from "@/server/analytics/context"; // helper para extrair context da request

async function createTrip(userId: string, data: TripCreateInput): Promise<{ id: string }> {
  await assertTripLimitNotReached(userId);

  const trip = await db.trip.create({
    data: {
      userId,
      title:         data.title,
      destination:   data.destination,
      startDate:     data.startDate,
      endDate:       data.endDate,
      description:   data.description ?? null,
      coverGradient: data.coverGradient,
      coverEmoji:    data.coverEmoji,
    },
    select: {
      id:            true,
      startDate:     true,
      endDate:       true,
      description:   true,
      coverGradient: true,
      status:        true,
      createdAt:     true,
    },
  });

  // Analytics — fire-and-forget, nao bloqueia o retorno ao usuario
  // hasAnalyticsConsent() e verificado dentro do track() helper
  void track({
    userId,
    eventName: "trip_created",
    properties: buildTripCreatedProperties(trip),
    context: await getAnalyticsContext(), // device_type, browser_family, etc.
  });

  return { id: trip.id };
}
```

---

## Funnel Definition

### Trip Creation Funnel

O funil de criacao de viagem e definido pela seguinte sequencia de eventos. Cada step deve ser analizado com PostHog Funnels:

```
[Step 1] page_viewed            { page_path: "/trips" }
              │
              │  [click "Nova viagem"]
              ▼
[Step 2] page_viewed            { page_path: "/trips/new" }
              │
              │  [submit form com sucesso]
              ▼
[Step 3] trip_created           { form_source: "new_page" }
              │
              │  [redirect automatico]
              ▼
[Step 4] trip_detail_viewed     { view_source: "direct" }
```

**Drop-off point primario**: entre Step 2 e Step 3 (abandono do formulario). Meta: <= 15% de abandono (AC — US-001).

**Sinal de limite**: quando `trip_limit_reached` ocorre entre Step 2 e Step 3, o funil quebra — usuarios devem ir para `archiveTrip` antes de retornar.

### Trip Lifecycle Funnel

```
trip_created { initial_status: "PLANNING" }
    │
    ├── trip_updated  (edicao de campos)
    ├── trip_detail_viewed  (engajamento)
    │
    ├──► trip_archived { previous_status: "PLANNING" }
    │         (usuario desistiu ou viagem realizada sem status change)
    │
    └──► trip_deleted { previous_status: "PLANNING" }
              (exclusao antes de viajar — criacao acidental?)
```

---

## Success Metrics Mapping (from US-001)

| US-001 Success Metric | Event(s) Used | PostHog Query |
|---|---|---|
| Taxa de conclusao do formulario >= 85% | `page_viewed { page_path: "/trips/new" }` + `trip_created` | Funnel Steps 2 → 3: conversion rate |
| Abandono em `/trips/new` <= 15% | `page_viewed { page_path: "/trips/new" }` sem `trip_created` subsequente | 100% - conversion rate do funil |
| Tempo medio de criacao <= 60s | `page_viewed { page_path: "/trips/new" }` timestamp → `trip_created` timestamp | Median time between events, same session_id |
| Zero erros 500 em CRUD | `error_occurred { error_type: "server_error", page_path: "/trips/new" }` | Count of 500-class errors on trip pages |
| NPS >= 40 (micro-survey pos-criacao) | `trip_created` → trigger survey (PostHog Surveys feature) | NPS score distribution apos `trip_created` |

**Metrica adicional recomendada (nao em US-001 mas critica):**

| Metrica | Formula | Evento |
|---|---|---|
| Activation rate | usuarios com >= 1 `trip_created` / usuarios com `user_signed_up` | Funnel `user_signed_up` → `trip_created` |
| Trip retention | usuarios com >= 2 `trip_created` no mesmo user_id_hash | Count distinct usuarios com trip_count >= 2 |
| Limit friction rate | `trip_limit_reached` / usuarios que tentaram criar | Identifica se o limite e bloqueante ao crescimento |

---

## GDPR Compliance Per Event

| Event | PII Fields Present | PII Risk | Justification | Retention |
|---|---|---|---|---|
| `trip_created` | Nenhum | Low | `trip_id_hash` e irreversivel; sem texto livre | 1 ano (PostHog) |
| `trip_updated` | Nenhum | Low | `fields_changed` sao apenas nomes de campo do schema | 1 ano (PostHog) |
| `trip_archived` | Nenhum | Low | Status e timestamps sao dados do sistema | 1 ano (PostHog) |
| `trip_deleted` | Nenhum | Low | `confirmationTitle` nunca incluido | 1 ano (PostHog) |
| `trip_limit_reached` | Nenhum | Low | Apenas contadores | 1 ano (PostHog) |
| `trip_list_viewed` | Nenhum | Low | Apenas contagens agregadas de viagens do usuario | 1 ano (PostHog) |
| `trip_detail_viewed` | Nenhum | Low | `trip_id_hash` irreversivel; sem titulo/destino | 1 ano (PostHog) |

**Campos explicitamente proibidos em todos os eventos de trip:**

| Campo proibido | Motivo | Alternativa segura |
|---|---|---|
| `title` | Texto livre — PII potencial | Nenhum — nao e necessario para analytics |
| `destination` | Texto livre — PII potencial | Nenhum (em v1 sem geocoding) |
| `description` | Texto livre — PII potencial | `has_description: boolean` |
| `coverEmoji` | Inutil para analytics | `cover_gradient` e suficiente |
| `confirmationTitle` | Exatamente igual ao titulo — PII | Nenhum |
| `tripId` (raw) | Permite re-identificacao | `trip_id_hash` |
| `userId` (raw) | PII direto | `user_id_hash` (BaseEvent) |

### GDPR Erasure Impact on Trip Events

Quando um usuario solicita exclusao de conta, o pipeline de erasure do `ErasureService` executa:

```
analytics.deleteUser(userIdHash)  ← PostHog API
```

Isso remove do PostHog **todos os eventos** vinculados ao `user_id_hash`, incluindo todos os eventos de trip deste usuario. Eventos nao podem ser rastreados de volta ao usuario original porque:
1. `user_id_hash` e SHA-256 com salt — irreversivel
2. `trip_id_hash` usa um salt diferente (`ANALYTICS_ENTITY_SALT`) — sem correlacao cruzada
3. Titulos e destinos nunca foram armazenados

O prazo de erasure e 30 dias apos a solicitacao (GDPR Art. 17).

---

## Instrumentation Checklist (for developers)

### Pre-implementation

- [ ] Confirmar que `ANALYTICS_SALT` e `ANALYTICS_ENTITY_SALT` estao no `.env` e validados em `src/lib/env.ts`
- [ ] Confirmar que `src/lib/analytics/hash.ts` esta implementado com as funcoes `hashUserId` e `hashEntityId`
- [ ] Confirmar que `src/server/analytics/track.ts` esta implementado com verificacao de `hasAnalyticsConsent()`
- [ ] Confirmar que `src/lib/analytics/consent.ts` esta implementado com `hasAnalyticsConsent()`
- [ ] Adicionar `TRIP_EVENT_NAMES` ao allowlist de eventos em `BaseEventSchema`

### Per-event checklist

- [ ] Todos os eventos sao despachados server-side (dentro do `TripService` ou Server Component)
- [ ] Nenhum evento e despachado de dentro de Client Components (`"use client"`)
- [ ] `user_id_hash` vem sempre do `session.user.id` hasheado — nunca do input do usuario
- [ ] `trip_id_hash` usa `hashEntityId("trip", tripId)` com `ANALYTICS_ENTITY_SALT`
- [ ] `user_id_hash` usa `hashUserId(userId)` com `ANALYTICS_SALT`
- [ ] Nenhum campo de texto livre do `Trip` (titulo, destino, descricao) aparece em nenhuma propriedade
- [ ] `confirmationTitle` do `deleteTrip` nunca e incluido em eventos
- [ ] Todos os eventos passam pelo `BaseEventSchema.safeParse()` antes do envio
- [ ] Erros de schema validation sao logados internamente mas NAO interrompem o fluxo do usuario
- [ ] Todos os eventos sao fire-and-forget (`void track(...)`) — nenhum `await` que bloqueie o retorno ao usuario
- [ ] `hasAnalyticsConsent()` e verificado dentro do helper `track()` — nao necessita verificacao adicional no Service

### Post-implementation verification

- [ ] Verificar no PostHog que eventos chegam sem campos PII (inspecao manual do payload)
- [ ] Verificar que `trip_id_hash` tem exatamente 64 caracteres hexadecimais
- [ ] Verificar que `user_id_hash` tem exatamente 64 caracteres hexadecimais
- [ ] Verificar que o mesmo `tripId` sempre gera o mesmo `trip_id_hash` (determinismo)
- [ ] Verificar que o funil Step 2 → Step 3 e mensuravel no PostHog (eventos aparecem em sequencia)
- [ ] Confirmar que `trip_limit_reached` e disparado antes de `AppError` ser lancado (nao perdido em catch)

---

## Open Questions

- [ ] **OQ-DATA-001**: `deletion_source` em `trip_deleted` requer que o Server Action saiba de qual pagina a acao foi iniciada. A solucao mais simples e passar um parametro opcional `source?: "detail_page" | "list_page"` no `TripService.deleteTrip()`. Confirmar com `dev-fullstack-1` se o Server Action `deleteTrip` recebera esse parametro no FormData ou via argumento separado.

- [ ] **OQ-DATA-002**: Os eventos `trip_list_viewed` e `trip_detail_viewed` sao disparados em Server Components. O `getAnalyticsContext()` helper precisa extrair `device_type`, `browser_family`, `os_family` e `viewport_width` dos request headers (User-Agent). Confirmar com `dev-fullstack-2` a disponibilidade do header `User-Agent` no Server Component via `next/headers` e a implementacao do parser de UA.

- [ ] **OQ-DATA-003**: O evento `trip_list_viewed` incluir `total_trip_count`, `active_trip_count` e `archived_trip_count` requer uma query adicional de contagem ao banco. Avaliar se o `TripService.listTrips()` ja retorna essas contagens (via `Promise.all` paralelo) ou se sera necessario um `TripService.getTripCounts(userId)` separado. Se a contagem adicionar latencia significativa, considerar remover do evento e manter apenas `active_trip_count` (ja disponivel para verificacao do limite).

- [ ] **OQ-DATA-004**: O `hasAnalyticsConsent()` no MVP e baseado em cookie (`_tp_consent`). Em Server Components, a leitura de cookies e sincrona via `cookies()` do `next/headers`. Confirmar com `security-specialist` que a implementacao de consentimento esta aprovada antes de instrumentar eventos de page view.

- [ ] **OQ-DATA-005**: `trip_archived` nao consta na lista de P0 events em `docs/data-architecture.md`. Este spec eleva o evento para P0 porque `archiveTrip` e uma operacao de mutacao critica e complementar a `trip_deleted`. Confirmar atualizacao da tabela de P0 events em `docs/data-architecture.md` apos aprovacao deste spec.

---

## Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1.0 | 2026-02-23 | data-engineer | Initial draft — 7 events, TypeScript interfaces, funnel definition, GDPR compliance table |

---

> Cleared with privacy conditions — resolve before instrumenting:
> 1. OQ-DATA-001: confirmar como `deletion_source` sera passado para o Server Action
> 2. OQ-DATA-002: confirmar disponibilidade e implementacao do User-Agent parser em Server Components
> 3. OQ-DATA-004: confirmar que o banner de consentimento esta implementado e `hasAnalyticsConsent()` retorna valores corretos antes de disparar eventos de page view
