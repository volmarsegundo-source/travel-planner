# SPEC-ARCH-043-001 — Multidestinos & Premium Entitlements

| Campo | Valor |
|---|---|
| **Spec ID** | SPEC-ARCH-043-001 |
| **Versão** | 1.0.0 |
| **Status** | Draft |
| **Autor** | architect |
| **Data** | 2026-04-10 |
| **Sprint** | 43 |
| **Feature** | Expedições multi-cidade + Entitlements Premium |
| **Specs relacionadas** | SPEC-PROD-043-MULTIDESTINOS, SPEC-UX-043-MULTIDESTINOS, SPEC-SEC-043-PAYMENTS |
| **ADRs novas** | ADR-032, ADR-033, ADR-034 |

---

## 1. Overview

A arquitetura atual do Travel Planner assume **uma única cidade por expedição** (`Trip.destination`, `Trip.destinationLat/Lon`, `DestinationGuide` 1:1 com `Trip`). A feature "Multidestinos" introduz expedições com **até 4 cidades** (1 para Free, até 4 para Premium), com guia independente por cidade e um roteiro único e integrado (com dias de trânsito).

Simultaneamente, o projeto adota um modelo de **assinatura Premium** com refresh mensal de 1.500 PA (use it or lose it), integrado ao Mercado Pago como gateway primário. Isto exige uma nova camada de **entitlements** que substitua o modelo atual "todo PA é igual" por **buckets de PA com fonte, validade e ordem de consumo determinística**.

Este spec define o impacto em schema, serviços, fases do Atlas, webhooks e integridade transacional. **Não** cobre UI (ver SPEC-UX), nem implementação do gateway (ver SPEC-SEC-PAYMENTS). É **arquitetura pura**.

---

## 2. Architectural Problem

### 2.1 Problemas da arquitetura atual

1. **Cardinalidade fixa**: `Trip` armazena destino como campo escalar (`destination: String`). Não há ordenação, não há trânsito entre cidades, não há datas por cidade.
2. **Guia acoplado**: `DestinationGuide` tem `@unique tripId` — um único guia por trip. Impossível ter N guias.
3. **PA monolítico**: `UserProgress.availablePoints` é um único contador. Não há rastreamento de origem (Premium mensal vs. pacote comprado vs. bônus onboarding), nem expiração.
4. **Sem entitlements**: O limite de expedições ativas (`MAX_ACTIVE_TRIPS=20`) é hard-coded. Não há distinção entre Free (1 cidade) e Premium (4 cidades).
5. **Sem assinatura**: `Purchase` cobre apenas pacotes avulsos. Não há modelo de assinatura recorrente, nem estado de billing.
6. **PA consumption não-atômico**: `spendPoints` (DT-S9-001) já é dívida conhecida de TOCTOU. Com múltiplos buckets concorrentes, o risco aumenta.

### 2.2 Requisitos

| # | Requisito | Origem |
|---|---|---|
| R1 | Expedição suporta 1–4 cidades, ordenadas, com datas próprias | Produto |
| R2 | Phase 5 gera **N guias** (um por cidade), paralelizado | Produto |
| R3 | Phase 6 gera **um roteiro integrado** com dias de trânsito | Produto |
| R4 | Free: 1 cidade por expedição. Premium: até 4 cidades | Produto |
| R5 | Custo extra: +30 PA guide + +15 PA plan por cidade extra | Produto |
| R6 | Premium: refresh mensal de 1.500 PA, sem rollover | Produto |
| R7 | Gateway: Mercado Pago (Fase 1), Stripe (Fase 2) | Produto |
| R8 | Migration sem downtime, backwards-compat total | Arquitetura |
| R9 | Webhook idempotente e resistente a replay | Segurança |
| R10 | PA consumption transacional (sem race conditions) | Arquitetura |

---

## 3. Schema Changes (Prisma)

### 3.1 Diagrama ER (novo)

```
┌──────────┐       ┌──────────────────┐       ┌─────────────────┐
│   User   │─1:N──>│   Subscription   │─1:N──>│SubscriptionEvent│
└─────┬────┘       └──────────────────┘       └─────────────────┘
      │
      │ 1:N
      ▼
┌──────────────┐
│PaEntitlement │  (buckets de PA com origem e expiração)
└──────────────┘
      │
      │
┌─────▼────┐       ┌──────────────┐
│   Trip   │─1:N──>│ Destination  │  (NOVO — antes era Trip.destination escalar)
└─────┬────┘       └──────┬───────┘
      │                   │
      │ 1:N               │ 1:N
      ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│ DestinationGuide │  │ (futuro: ativ.   │
│  (agora 1 por    │  │  vinculadas à    │
│   Destination)   │  │  cidade)         │
└──────────────────┘  └──────────────────┘
```

### 3.2 Novo modelo `Destination`

```prisma
// ─── Destination (Sprint 43 — Multidestinos) ─────────────────────────────
// Substitui o campo escalar Trip.destination. Uma Trip pode ter 1..4.
model Destination {
  id        String   @id @default(cuid())
  tripId    String
  order     Int      // 0-based. Define ordem cronológica da expedição.

  // Localização
  city      String   @db.VarChar(150)
  country   String?  @db.VarChar(100)
  lat       Float?
  lng       Float?

  // Janela temporal dentro da expedição
  startDate DateTime?
  endDate   DateTime?
  nights    Int?      // derivado, mas cacheado para queries rápidas

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  trip   Trip              @relation(fields: [tripId], references: [id], onDelete: Cascade)
  guide  DestinationGuide?

  @@unique([tripId, order])
  @@index([tripId])
  @@map("destinations")
}
```

### 3.3 `Trip` (alterações)

```prisma
model Trip {
  // ... campos existentes permanecem ...

  // Sprint 43: Multidestinos
  // DEPRECATED após migration 043-phase-2: manter como cache do Destination[0].city
  // Motivo: evitar breaking change em componentes legados (dashboard, cards, lista)
  destination    String  @db.VarChar(150) // legacy, read-only após migration
  destinationLat Float?  // legacy — agora vive em Destination
  destinationLon Float?  // legacy — agora vive em Destination

  // Nova relação
  destinations   Destination[]

  // NOVO: datas agregadas da expedição (min startDate, max endDate dentre destinations)
  // Campos startDate/endDate existentes passam a ser **computados/cacheados**
  // a partir de Destination[].
  // startDate DateTime?  (existente, semântica alterada)
  // endDate   DateTime?  (existente, semântica alterada)

  // ... resto permanece ...
}
```

**Regra de negócio**: `Trip.destination`, `Trip.destinationLat`, `Trip.destinationLon`, `Trip.startDate` e `Trip.endDate` passam a ser **denormalizações read-only** derivadas de `destinations[0]` (para `destination*`) e de min/max sobre `destinations[]` (para datas). São atualizadas por trigger de aplicação (não por trigger DB) em `tripService.syncDenormalizedFields(tripId)`.

### 3.4 `DestinationGuide` (alterações)

```prisma
model DestinationGuide {
  id              String   @id @default(cuid())
  tripId          String   // mantido para backwards compat e queries agregadas
  destinationId   String?  @unique  // NOVO — nullable durante migração phase 1
  // ... demais campos ...

  trip         Trip         @relation(fields: [tripId], references: [id], onDelete: Cascade)
  destination  Destination? @relation(fields: [destinationId], references: [id], onDelete: Cascade)

  // REMOVIDO: @@unique no tripId — agora pode haver N guides por trip
  @@index([tripId])
  @@map("destination_guides")
}
```

**Breaking change controlado**: a constraint `@unique tripId` é removida. Durante phase 1 da migration, `destinationId` é nullable; durante phase 3, torna-se NOT NULL e a coluna `tripId` permanece apenas como índice denormalizado.

### 3.5 Novo modelo `Subscription`

```prisma
enum SubscriptionPlan {
  FREE
  PREMIUM_MONTHLY
  PREMIUM_ANNUAL
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  EXPIRED
}

enum PaymentGateway {
  MERCADO_PAGO
  STRIPE
}

model Subscription {
  id                    String             @id @default(cuid())
  userId                String             @unique  // 1:1 — um usuário tem no máximo uma subscription ativa
  plan                  SubscriptionPlan   @default(FREE)
  status                SubscriptionStatus @default(ACTIVE)
  gateway               PaymentGateway?    // null para FREE
  gatewaySubscriptionId String?            @unique  // ID externo do MP/Stripe
  gatewayCustomerId     String?            @db.VarChar(100)

  // Billing period
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean            @default(false)

  // Trial
  trialStartedAt        DateTime?
  trialEndsAt           DateTime?

  // Audit
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  canceledAt            DateTime?

  user   User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  events SubscriptionEvent[]

  @@index([status])
  @@index([currentPeriodEnd])
  @@index([gateway, gatewaySubscriptionId])
  @@map("subscriptions")
}
```

### 3.6 Novo modelo `SubscriptionEvent`

```prisma
enum SubscriptionEventType {
  CREATED
  TRIAL_STARTED
  TRIAL_ENDED
  RENEWED
  UPGRADED
  DOWNGRADED
  CANCELED
  REACTIVATED
  PAYMENT_FAILED
  PAYMENT_RECOVERED
  REFUNDED
}

model SubscriptionEvent {
  id               String                @id @default(cuid())
  subscriptionId   String
  type             SubscriptionEventType
  gatewayEventId   String?               @unique  // idempotência de webhooks
  payload          Json                  // payload **sanitizado** (sem PII, sem PAN)
  createdAt        DateTime              @default(now())

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Restrict)
  // Restrict: audit log é imutável, nunca deletado em cascata

  @@index([subscriptionId, createdAt])
  @@index([type, createdAt])
  @@map("subscription_events")
}
```

**Importante**: `onDelete: Restrict` em `SubscriptionEvent.subscription` — audit logs **nunca** são removidos, mesmo em GDPR erasure. Em vez disso, o `userId` da subscription é anonimizado, e os eventos preservam apenas o `subscriptionId`.

### 3.7 Novo modelo `PaEntitlement`

```prisma
enum PaSource {
  PREMIUM_MONTHLY   // refresh de 1500 PA/mês, expira no fim do período
  PREMIUM_ANNUAL    // refresh anual (se plano anual)
  PACKAGE_PURCHASE  // compra avulsa, nunca expira
  ONBOARDING        // bônus inicial, nunca expira
  ADMIN_GRANT       // crédito manual, nunca expira
  REFERRAL          // bônus de indicação (futuro)
}

model PaEntitlement {
  id         String   @id @default(cuid())
  userId     String
  source     PaSource
  amount     Int      // positivo. Valor original do bucket.
  consumed   Int      @default(0)  // quanto já foi consumido deste bucket
  expiresAt  DateTime?  // null = nunca expira
  createdAt  DateTime @default(now())

  // Refs opcionais de origem
  subscriptionId String?  // se source = PREMIUM_*
  purchaseId     String?  // se source = PACKAGE_PURCHASE

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
  @@index([userId, source])
  @@map("pa_entitlements")
}
```

**Invariante**: `consumed <= amount`. Enforçado em aplicação (Prisma não suporta check constraints nativamente, mas adicionaremos via raw SQL na migration).

**Saldo disponível** de um bucket: `amount - consumed` (se `expiresAt == null || expiresAt > now()`).

### 3.8 Migration Strategy (phased, zero-downtime)

| Fase | Ação | Deploy |
|---|---|---|
| **M1** | Criar tabelas `destinations`, `subscriptions`, `subscription_events`, `pa_entitlements`. Adicionar `destinationId` nullable em `destination_guides`. Remover `@unique tripId` de `destination_guides`. | Migration SQL |
| **M2** | Backfill: para cada `Trip` existente, criar um `Destination` com `order=0` copiando `city/lat/lng/startDate/endDate`. Vincular `DestinationGuide.destinationId` ao destination recém-criado. | Script idempotente |
| **M3** | Backfill: para cada `UserProgress.availablePoints > 0`, criar `PaEntitlement` com `source=ONBOARDING`, `amount = availablePoints`, `consumed=0`, `expiresAt=null`. | Script idempotente |
| **M4** | Criar `Subscription` com `plan=FREE` para todos os usuários existentes. | Script idempotente |
| **M5** | Deploy de código que **lê** de `destinations` e `pa_entitlements`, mas **ainda escreve** em `Trip.destination` e `UserProgress.availablePoints` (dual write). | Code deploy |
| **M6** | Observar por 7 dias. Se estável, promover `destination_guides.destinationId` para NOT NULL. | Migration SQL |
| **M7** | Deprecar dual-write: `Trip.destination*` vira read-only (sync a partir de `destinations[0]`); `UserProgress.availablePoints` vira **view** somando `PaEntitlement` ativos. | Code deploy |

`UserProgress.availablePoints` não é removido na v1 — fica como **cache agregado** atualizado em transação junto com mutações em `PaEntitlement`.

---

## 4. Phase Impact Analysis

| Phase | Impacto | Effort |
|---|---|---|
| **1 — A Inspiração** | Formulário precisa suportar seleção de 1–4 cidades com autocomplete, datas por cidade, validação de ordem cronológica. Gated por entitlement: Free força N=1. | UI — SPEC-UX |
| **2 — O Perfil** | Sem alteração. | 0h |
| **3 — O Preparo** | Checklist continua único por trip. **Exceção**: itens de visto/vacina podem ser duplicados por país se houver países distintos — adicionar campo opcional `countryCode` em `ChecklistItem`. Fora de escopo deste spec. | Flag para Sprint 44 |
| **4 — A Logística** | `TransportSegment` já suporta N segmentos. Passa a ser semanticamente **intra-trip** (ex: voo SP→Lisboa, trem Lisboa→Porto, voo Porto→SP). Nenhum schema change. Prompt do helper de logística deve ser atualizado para sugerir trechos entre `destinations[i]` e `destinations[i+1]`. | 2h |
| **5 — Guia do Destino** | **Core change**. Agora gera **N guides** (1 por cidade), em paralelo. Consome 50 PA + 30 PA × (N-1) = 50 + 30(N-1). Atomicidade: ou gera todos, ou falha todos (rollback transacional do débito). | 6h |
| **6 — O Roteiro** | **Core change**. Single call ao LLM, prompt expandido com lista de cidades + datas + trânsito. Consome 80 PA + 15 PA × (N-1) = 80 + 15(N-1). Cada `ItineraryDay` ganha campo opcional `destinationId` para vincular dia a cidade (dias de trânsito ficam com `destinationId=null`). | 4h |
| **7 — A Expedição** | Sem alteração no schema. UI de tracking agrupa por cidade. Fora de escopo. | 0h |
| **8 — O Legado** | Sem alteração. | 0h |

### 4.1 `ItineraryDay` (alteração mínima)

```prisma
model ItineraryDay {
  // ... campos existentes ...
  destinationId String?  // NOVO — null para dias de trânsito
  destination   Destination? @relation(fields: [destinationId], references: [id], onDelete: SetNull)

  @@index([destinationId])
}
```

### 4.2 Custo Total por Expedição (novo)

| Cidades (N) | Phase 5 (Guia) | Phase 6 (Plano) | **Total AI** |
|---|---|---|---|
| 1 | 50 PA | 80 PA | **130 PA** |
| 2 | 80 PA | 95 PA | **175 PA** |
| 3 | 110 PA | 110 PA | **220 PA** |
| 4 | 140 PA | 125 PA | **265 PA** |

---

## 5. Entitlement Enforcement Layer

### 5.1 Novo serviço: `entitlement.service.ts`

```typescript
// src/server/services/entitlement.service.ts
import "server-only";

export type PlanTier = "FREE" | "PREMIUM";

export interface EntitlementCheck {
  allowed: boolean;
  reason?: EntitlementDenialReason;
  limit?: number;
  current?: number;
}

export type EntitlementDenialReason =
  | "MAX_TRIPS_REACHED"
  | "MAX_CITIES_REACHED"
  | "PLAN_REQUIRED_PREMIUM"
  | "SUBSCRIPTION_INACTIVE"
  | "INSUFFICIENT_PA";

export interface PaBalance {
  total: number;
  fromPremium: number;    // buckets PREMIUM_MONTHLY + PREMIUM_ANNUAL ativos
  fromPackages: number;   // buckets PACKAGE_PURCHASE
  fromOnboarding: number; // bucket ONBOARDING + ADMIN_GRANT
}

export interface EntitlementService {
  canCreateExpedition(userId: string): Promise<EntitlementCheck>;
  canAddCity(userId: string, tripId: string): Promise<EntitlementCheck>;
  canGenerateGuide(userId: string, destinationCount: number): Promise<EntitlementCheck>;
  canGeneratePlan(userId: string, destinationCount: number): Promise<EntitlementCheck>;
  getActivePaBalance(userId: string): Promise<PaBalance>;
  getPlanTier(userId: string): Promise<PlanTier>;
  getMaxCitiesForUser(userId: string): Promise<number>; // 1 | 4
}
```

### 5.2 Regras de limites

| Check | Free | Premium |
|---|---|---|
| `canCreateExpedition` | Max 3 ativas | Max 20 ativas |
| `canAddCity` (maxCities) | 1 | 4 |
| `canGenerateGuide` | Só se `paBalance.total >= cost` | Mesmo + dedução prioritária do bucket Premium |
| `canGeneratePlan` | Idem | Idem |

### 5.3 Onde invocar

- **Server actions** (`src/server/actions/*.actions.ts`): é **obrigatório** chamar o check correspondente antes de qualquer mutação que consuma entitlement. Nunca confiar em validação client-side.
- **Middleware (`middleware.ts`)**: **NÃO** coloca entitlements. O middleware trata apenas de auth + i18n. Motivo: entitlements dependem de dados de DB (subscription, balance), e rodar essa query em middleware Edge runtime é caro e não-cacheável.
- **ADR-033** documenta essa decisão formalmente.

### 5.4 Exemplo — fluxo em `createTripAction`

```typescript
export async function createTripAction(input: CreateTripInput) {
  const session = await requireSession();
  const userId = session.user.id;

  // 1. Entitlement check ANTES de qualquer mutação
  const check = await entitlementService.canCreateExpedition(userId);
  if (!check.allowed) {
    return err("ENTITLEMENT_DENIED", { reason: check.reason, limit: check.limit });
  }

  // 2. Validação de número de cidades
  const maxCities = await entitlementService.getMaxCitiesForUser(userId);
  if (input.destinations.length > maxCities) {
    return err("ENTITLEMENT_DENIED", { reason: "MAX_CITIES_REACHED", limit: maxCities });
  }

  // 3. Mutação transacional
  return await db.$transaction(async (tx) => {
    const trip = await tx.trip.create({ /* ... */ });
    await tx.destination.createMany({
      data: input.destinations.map((d, i) => ({
        tripId: trip.id,
        order: i,
        city: d.city,
        country: d.country,
        lat: d.lat,
        lng: d.lng,
        startDate: d.startDate,
        endDate: d.endDate,
        nights: calcNights(d.startDate, d.endDate),
      })),
    });
    // Sync denormalized fields
    await syncTripDenormalized(tx, trip.id);
    return ok(trip);
  });
}
```

---

## 6. PA Consumption Order

### 6.1 Regra de ouro

Ao consumir PA, **buckets que expiram antes devem ser consumidos primeiro**. Isto é, semântica "use it or lose it" para PA de Premium mensal.

**Ordem determinística**:

1. `PREMIUM_MONTHLY` / `PREMIUM_ANNUAL` (`expiresAt != null`) — ordenados por `expiresAt ASC`
2. `ONBOARDING` (`expiresAt == null`) — FIFO por `createdAt ASC`
3. `ADMIN_GRANT` (`expiresAt == null`) — FIFO por `createdAt ASC`
4. `PACKAGE_PURCHASE` (`expiresAt == null`) — FIFO por `createdAt ASC`

**Motivo**: PA comprado é o de maior valor percebido (custou dinheiro real). Deve ser o último a ser consumido. PA de onboarding/admin vem antes para evitar "saldo zumbi" em contas inativas.

### 6.2 Algoritmo

```typescript
// Pseudocódigo (implementação real usa SELECT ... FOR UPDATE)
async function consumePa(tx, userId, amountToConsume, reason) {
  const buckets = await tx.$queryRaw`
    SELECT id, amount, consumed, source, expires_at
    FROM pa_entitlements
    WHERE user_id = ${userId}
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (amount - consumed) > 0
    ORDER BY
      CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END ASC,  -- expirable first
      expires_at ASC NULLS LAST,
      CASE source
        WHEN 'PREMIUM_MONTHLY' THEN 1
        WHEN 'PREMIUM_ANNUAL' THEN 2
        WHEN 'ONBOARDING' THEN 3
        WHEN 'ADMIN_GRANT' THEN 4
        WHEN 'PACKAGE_PURCHASE' THEN 5
        ELSE 9
      END ASC,
      created_at ASC
    FOR UPDATE;
  `;

  let remaining = amountToConsume;
  const consumedFrom: Array<{ bucketId: string; amount: number }> = [];

  for (const bucket of buckets) {
    if (remaining <= 0) break;
    const available = bucket.amount - bucket.consumed;
    const take = Math.min(available, remaining);
    await tx.paEntitlement.update({
      where: { id: bucket.id },
      data: { consumed: { increment: take } },
    });
    consumedFrom.push({ bucketId: bucket.id, amount: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new InsufficientPaError({ requested: amountToConsume, available: amountToConsume - remaining });
  }

  // Log de consumo (audit)
  await tx.pointTransaction.create({
    data: {
      userId,
      amount: -amountToConsume,
      type: reason,
      description: JSON.stringify({ buckets: consumedFrom }),
    },
  });
}
```

### 6.3 Refresh mensal de Premium

Quando uma `Subscription.status == ACTIVE` atinge `currentPeriodEnd`:

1. Webhook `subscription.renewed` chega do MP.
2. Handler cria novo `PaEntitlement` com `source=PREMIUM_MONTHLY`, `amount=1500`, `expiresAt=newPeriodEnd`.
3. Buckets antigos de `PREMIUM_MONTHLY` com `expiresAt <= now()` **não são deletados** — apenas tornam-se inválidos via cláusula `expires_at > NOW()`. São limpos por job noturno após 90 dias (retention para auditoria).
4. Não há rollover: saldo não consumido do bucket anterior expira junto.

---

## 7. Webhook Architecture

### 7.1 Endpoint

```
POST /api/webhooks/mercado-pago
Content-Type: application/json
x-signature: <HMAC-SHA256>
x-request-id: <UUID>
```

### 7.2 Fluxo de processamento

```
┌─────────────────┐
│ MP POST webhook │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 1. Verify HMAC signature│─── fail ──> 401
└────────┬────────────────┘
         │ ok
         ▼
┌─────────────────────────┐
│ 2. Parse + validate body│─── fail ──> 400
└────────┬────────────────┘
         │ ok
         ▼
┌──────────────────────────────────┐
│ 3. Check idempotency              │
│    SELECT FROM subscription_events│
│    WHERE gateway_event_id = ?     │─── exists ──> 200 (noop)
└────────┬─────────────────────────┘
         │ not found
         ▼
┌─────────────────────────────────┐
│ 4. Begin transaction            │
│ 5. Insert SubscriptionEvent     │  ◄── UNIQUE constraint em gateway_event_id
│    (idempotency guard)          │
│ 6. Apply state transition       │
│ 7. Create/update Subscription   │
│ 8. If RENEWED: create new       │
│    PaEntitlement                │
│ 9. Commit                       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ 10. Return 200  │
└─────────────────┘
```

### 7.3 Idempotência

- **Primeira linha de defesa**: `SubscriptionEvent.gatewayEventId @unique`. Se INSERT falhar por duplicate key, retornar 200 sem processar.
- **Segunda linha**: state machine verifica se a transição é válida (e.g., não aplicar `RENEWED` se a subscription já está `CANCELED`).
- **Retry**: MP re-envia até 6 vezes com backoff exponencial. O endpoint deve ser **rápido** (<3s) para evitar timeouts — processamento pesado pode ir para job assíncrono.

### 7.4 Eventos suportados (v1)

| Evento MP | Ação |
|---|---|
| `payment.created` (subscription init) | Cria `Subscription` com `status=TRIALING` ou `ACTIVE` |
| `payment.updated` (successful renewal) | Atualiza `currentPeriodEnd`, cria novo `PaEntitlement` refresh |
| `payment.updated` (failed) | `status=PAST_DUE`, enviar alerta |
| `subscription.canceled` | `status=CANCELED`, `canceledAt=now()` |
| `refund.created` | `status=EXPIRED`, evento `REFUNDED`, **não remove** PA já consumido |

### 7.5 Segurança

- `MERCADO_PAGO_WEBHOOK_SECRET` em env, validado via `@t3-oss/env-nextjs`.
- HMAC-SHA256 do corpo comparado em tempo constante (`crypto.timingSafeEqual`).
- IP allowlist **não** usado (MP não publica ranges estáveis) — signature é a única fonte de verdade.
- Rate limit: 100 req/min por IP (defesa em profundidade).
- Replay window: rejeitar se `x-timestamp` > 5 min no passado.

---

## 8. Data Integrity & Concurrency

### 8.1 Pontos críticos de concorrência

| Operação | Risco | Mitigação |
|---|---|---|
| `consumePa` | TOCTOU: dois requests consomem o mesmo bucket | `SELECT ... FOR UPDATE` em transação |
| `createTrip` | Race em `canCreateExpedition` | Check + insert na mesma transação; advisory lock por `userId` |
| Webhook `RENEWED` vs. user action | Dois processos criando PaEntitlement simultaneamente | `SubscriptionEvent.gatewayEventId` unique + `Subscription.updatedAt` optimistic lock |
| Subscription state transition | Estados inválidos (e.g., CANCELED → ACTIVE direto) | State machine validada em aplicação |

### 8.2 Advisory locks por usuário

Para operações longas (geração de Phase 5 com N cidades), usar advisory lock Postgres:

```sql
SELECT pg_advisory_xact_lock(hashtext('pa_consume:' || $userId));
```

Isto serializa todas as operações de consumo PA para o mesmo usuário, evitando deadlocks em updates concorrentes no mesmo conjunto de rows.

### 8.3 Optimistic locking em Subscription

```typescript
await tx.subscription.update({
  where: { id: sub.id, updatedAt: sub.updatedAt }, // version check
  data: { status: "ACTIVE", updatedAt: new Date() },
});
```

Se `updatedAt` mudou (outra transação já atualizou), o update afeta 0 rows → lançar `ConcurrencyError` e retentar.

---

## 9. Observability

### 9.1 Eventos de negócio (emitir via `logger.info` + Sentry breadcrumb)

| Evento | Quando | Destino |
|---|---|---|
| `subscription.created` | Após INSERT | logger + analytics |
| `subscription.renewed` | Webhook RENEWED processado | logger |
| `subscription.canceled` | User action ou webhook | logger + analytics |
| `subscription.payment_failed` | Webhook PAST_DUE | **Sentry warning** + email user |
| `pa.consumed` | Cada consumo | logger com `{ amount, source, reason }` |
| `pa.insufficient` | Falha de consumo | logger com tentativa (audit anti-fraude) |
| `entitlement.denied` | Check negou | logger |
| `webhook.signature_invalid` | HMAC fail | **Sentry error** (possível ataque) |
| `webhook.replay_attempt` | Timestamp antigo | **Sentry warning** |

### 9.2 Métricas

- `subscription_active_count` (gauge) — total de subs ACTIVE, por plan
- `pa_consumed_total` (counter) — PA consumido por `source`
- `pa_expired_total` (counter) — PA que virou unreachable por expiração
- `webhook_processing_duration_ms` (histogram)
- `webhook_failures_total` (counter) por `reason`

### 9.3 Admin dashboard (futuro — SPEC-PROD separado)

Feed de eventos recentes (`SubscriptionEvent`) com filtros por tipo e período.

---

## 10. Security & Privacy

### 10.1 PII e compliance

- `Subscription.gatewayCustomerId` é considerado PII (liga ao MP).
- `SubscriptionEvent.payload` **nunca** deve conter: número de cartão (mesmo tokenizado sem necessidade), CVV, endereço completo, CPF cru.
- Sanitizer obrigatório: função `sanitizeGatewayPayload(raw)` remove campos PCI-sensíveis antes de persistir.

### 10.2 GDPR export

Incluir em GDPR data export:
- Todas as `Subscription` do usuário.
- Todas as `SubscriptionEvent` vinculadas.
- Todas as `PaEntitlement` do usuário.

### 10.3 GDPR erasure

**Não-trivial** devido a auditoria financeira:
- `Subscription.gatewayCustomerId` → anonimizar (hash)
- `SubscriptionEvent.payload` → manter apenas campos agregados (tipo, timestamp, amount); anonimizar identificadores
- `SubscriptionEvent` rows **não são deletadas** (legal hold: auditoria fiscal).
- `PaEntitlement` → marcar como `consumedAt` + anonimizar, **não deletar** (auditoria de gamificação).

### 10.4 Refund flow

Refund é um evento **auditável**, não uma operação destrutiva:
- Inserir `SubscriptionEvent(type=REFUNDED)`.
- Marcar `Subscription.status=EXPIRED`.
- **Não** reverter PA já consumido. Documentar em SPEC-PROD se decisão de negócio exige reversão.

### 10.5 Webhook secret

- Armazenado em `MERCADO_PAGO_WEBHOOK_SECRET` env var.
- Rotação: documentar procedimento em runbook DevOps.

---

## 11. API Contracts (high-level)

### 11.1 Subscription

```
POST /api/subscription/checkout
Body: { plan: "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL" }
Auth: required
Response 200: { redirectUrl: string, preferenceId: string }
Response 402: { error: "payment_required" }
Rate: 5 req/min/user
```

```
POST /api/subscription/cancel
Body: { reason?: string }
Auth: required
Response 200: { subscription: { status, cancelAtPeriodEnd: true, currentPeriodEnd } }
Response 404: { error: "no_active_subscription" }
```

```
GET /api/subscription/status
Auth: required
Response 200: {
  plan: "FREE" | "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL",
  status: SubscriptionStatus,
  currentPeriodEnd?: string,
  cancelAtPeriodEnd: boolean,
  entitlements: {
    maxCities: number,
    maxActiveTrips: number,
    paBalance: PaBalance
  }
}
Cache: private, max-age=60
```

```
POST /api/webhooks/mercado-pago
Headers: x-signature, x-timestamp, x-request-id
Body: raw (não parsear antes de validar HMAC)
Response 200: { received: true }
Response 401: signature invalid
Response 400: malformed body
```

### 11.2 Expedition (alterações)

```
POST /api/expedition  (ou server action createTripAction)
Body: {
  title: string,
  destinations: [
    { city, country?, lat?, lng?, startDate, endDate }
  ]  // 1..4
}
Validation:
  - entitlementService.canCreateExpedition
  - destinations.length <= entitlementService.getMaxCitiesForUser
  - ordens cronológicas não-sobrepostas
Response 201: { trip: TripDTO }
Response 403: { error: "ENTITLEMENT_DENIED", reason, limit }
```

```
POST /api/expedition/:id/destinations  (para adicionar cidade após criação)
Body: { city, country?, lat?, lng?, startDate, endDate, insertAfterOrder: number }
Validation:
  - ownership
  - entitlementService.canAddCity
Response 201: { destination: DestinationDTO }
```

---

## 12. ADR References

### ADR-032: Multidestinos — modelo relacional vs. JSON

**Status**: PROPOSED
**Context**: Trip precisa suportar 1..4 cidades. Duas opções: (a) tabela `destinations` relacional; (b) campo `Trip.destinations Json`.
**Decision**: Tabela relacional.
**Rationale**:
- Queries por cidade (geo, analytics) são first-class.
- `DestinationGuide` precisa FK para `destinationId` (integridade referencial).
- `ItineraryDay.destinationId` idem.
- JSON perderia type safety, tornaria migrations futuras mais caras.
- Custo: +1 JOIN nas queries de listagem. Aceitável com índices corretos.
**Consequences**: Mais tabelas, mas schema mais expressivo e performático para queries de negócio.

### ADR-033: Entitlements enforced at server action layer, não middleware

**Status**: PROPOSED
**Context**: Onde verificar entitlements? Options: (a) middleware Edge, (b) API routes, (c) server actions.
**Decision**: Server actions (e API routes para webhooks).
**Rationale**:
- Middleware roda em Edge runtime; query Prisma em Edge é cara ou requer HTTP bridge.
- Entitlements dependem de estado de DB fresh (subscription, balance) — não cacheável sem risco de TOCTOU.
- Server actions já são o único ponto de mutação — concentrar enforcement ali evita bypass.
**Negative**: Se um desenvolvedor esquecer de chamar o check, bypass é possível. Mitigação: lint rule custom + review checklist.

### ADR-034: PA buckets com expiry

**Status**: PROPOSED
**Context**: Premium oferece refresh mensal de 1500 PA sem rollover. `UserProgress.availablePoints` monolítico não consegue expressar isso.
**Decision**: Modelo `PaEntitlement` com buckets tipados e `expiresAt` opcional. Consumo em ordem determinística (expirables primeiro).
**Rationale**:
- Preserva auditoria (histórico de cada bucket).
- Permite relatórios de "PA expirado" para FinOps.
- FIFO dentro do bucket evita "guardar PA para o fim do mês".
**Negative**: Mais complexidade em `consumePa` (loop + advisory lock). Mitigação: encapsular em serviço único, testar exaustivamente.

---

## 13. Scope

### 13.1 In Scope

- Novos modelos Prisma: `Destination`, `Subscription`, `SubscriptionEvent`, `PaEntitlement`.
- Alterações em `Trip`, `DestinationGuide`, `ItineraryDay`.
- Novo serviço `entitlement.service.ts`.
- Refatoração de `consumePa` para usar buckets.
- Endpoint `POST /api/webhooks/mercado-pago` (estrutura; integração MP na SPEC-SEC-PAYMENTS).
- Phase 5 com geração paralela de N guias.
- Phase 6 com prompt multi-cidade (shape apenas; prompt detalhado em SPEC-AI).
- Migration phased zero-downtime.

### 13.2 Out of Scope

- UI de seleção de cidades (SPEC-UX).
- Prompt engineering multi-cidade (SPEC-AI).
- Implementação Mercado Pago SDK e fluxo de checkout UI (SPEC-SEC-PAYMENTS + SPEC-UX).
- Stripe integration (Phase 2, Sprint 45+).
- Checklist per-country (Sprint 44).
- Admin dashboard de eventos (SPEC-PROD separado).
- Dunning / recuperação de PAST_DUE (Sprint 44+).
- Referral program (`PaSource.REFERRAL`) — modelado, não implementado.

---

## 14. Risks & Mitigations

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| **R1** | Migration de `DestinationGuide.destinationId` quebra produção se backfill falha no meio | ALTA | Script idempotente, phased (M1–M7), observação de 7 dias antes de NOT NULL |
| **R2** | Webhook replay attack (atacante retransmite evento antigo para ganhar PA) | ALTA | HMAC signature + `gatewayEventId @unique` + janela de 5 min em `x-timestamp` |
| **R3** | Race condition em `consumePa` com múltiplos requests concorrentes | ALTA | `SELECT FOR UPDATE` + advisory lock por userId em transação |
| **R4** | Subscription state drift vs. gateway (DB diz ACTIVE, MP diz CANCELED) | ALTA | Job de reconciliação noturno que consulta MP e compara; alert se divergir |
| **R5** | Backfill de `PaEntitlement` a partir de `availablePoints` duplica PA se rodar 2x | ALTA | Script idempotente usando flag `_migrated_043_m3` em user metadata |
| **R6** | Phase 5 parcialmente gerada (3 de 4 cidades) deixa PA consumido sem entrega | MÉDIA | Transação: débito + geração + persistência atômicos. Se falhar qualquer cidade, rollback completo |
| **R7** | Dev esquece de chamar `entitlementService` em nova action → bypass | MÉDIA | ESLint rule custom; PR checklist; code review mandatório |
| **R8** | `UserProgress.availablePoints` dessincroniza de `PaEntitlement.sum(amount - consumed)` | MÉDIA | Manter `availablePoints` como cache atualizado **na mesma transação** do consumo; job de reconciliação semanal |
| **R9** | GDPR erasure quebra integridade por FK Restrict em `SubscriptionEvent` | MÉDIA | Anonimização em vez de delete; documentar em runbook de compliance |
| **R10** | Phase 6 prompt excede token budget com 4 cidades | MÉDIA | Benchmark antes do merge; truncation controlada em SPEC-AI |
| **R11** | `MAX_ACTIVE_TRIPS=20` (Free) é muito generoso pós-limite de 3 | BAIXA | Flag de config; product decision |
| **R12** | Dual-write (M5–M7) pode dessincronizar `Trip.destination` de `Destination[0]` | BAIXA | Única fonte de escrita: `syncTripDenormalized(tx, tripId)` chamado em toda mutação de destinations |

---

## 15. Effort Estimate

| Item | Horas |
|---|---|
| Schema migration (M1–M7) + scripts backfill | 6h |
| `entitlement.service.ts` + testes unitários | 8h |
| Refactor `consumePa` para buckets + advisory lock | 6h |
| Webhook handler Mercado Pago (estrutura + idempotência) | 10h |
| Phase 5 — geração paralela de N guides (serviço + integração) | 6h |
| Phase 6 — shape do prompt multi-cidade (integração; prompt em SPEC-AI) | 4h |
| Backwards compat (dual-write) + sync denormalized | 4h |
| Testes de integração (subscription lifecycle, PA consumption, migration) | 8h |
| **Total arquitetura/backend** | **~52h** |

**Nota**: estimativa original do briefing era 42h. Ajustado para 52h devido a:
- Refactor de `consumePa` (não estava listado)
- Testes de integração mais amplos (subscription lifecycle)

Aproximadamente **1.3 semanas para 1 dev sênior** ou **1 semana para 2 devs em paralelo**.

Trabalho paralelo recomendado:
- **dev-fullstack-1**: schema + migration + entitlement service + consumePa refactor
- **dev-fullstack-2**: webhook handler + Phase 5 parallel + Phase 6 shape

---

## 16. Open Questions

1. **OQ-1** — Limite de 3 expedições ativas para Free é decisão nova (hoje é 20). Confirmar com product-owner antes de implementar. Alternativa: manter 20 mas limitar 1 cidade.
2. **OQ-2** — `PREMIUM_ANNUAL` recebe refresh anual único de 18.000 PA ou 12 refreshes mensais de 1.500 PA? Segunda opção é mais simples (reusa lógica mensal) e preserva "use it or lose it".
3. **OQ-3** — Trial: Premium terá trial? Se sim, quantos dias? Afeta state machine (`TRIALING → ACTIVE`).
4. **OQ-4** — Refund dentro de X dias reverte PA consumido? Sugestão arquitetural: **não** (audit imutável), product decide.
5. **OQ-5** — `Trip.destination` legacy field: manter como denormalização eterna ou remover em Sprint 45 após todos os consumers migrarem? Minha recomendação: **remover** em Sprint 45 para reduzir dívida.
6. **OQ-6** — Para expedição de 1 cidade (caso Free), há diferença de schema vs. 4 cidades? **Não** — mesmo código, apenas N=1. Confirmar que UX não introduz código condicional diferente.
7. **OQ-7** — `destination_guides` perde `@unique tripId`. Algum código legado depende dessa constraint? Grep necessário antes da migration M1.
8. **OQ-8** — Cancelar subscription no meio do período: user mantém os 1500 PA do bucket atual até `currentPeriodEnd`? Sugestão arquitetural: **sim** (já pagou pelo período).

---

## 17. Definition of Done (architecture side)

- [ ] ADR-032, ADR-033, ADR-034 aprovados por tech-lead
- [ ] Schema Prisma revisado e migration M1 testada em staging
- [ ] Script de backfill testado em snapshot de produção
- [ ] `entitlement.service.ts` com coverage ≥ 90%
- [ ] `consumePa` refactor com testes de concorrência (>= 3 cenários de race)
- [ ] Webhook handler com testes de idempotência (replay, out-of-order, invalid signature)
- [ ] Plano de rollback documentado para cada fase M1–M7
- [ ] SPEC-UX e SPEC-AI ancoradas neste spec

---

> **Status**: Draft — Aguardando revisão de tech-lead, security-specialist, finops-engineer, product-owner antes de Approved.
>
> **Próximas specs dependentes**:
> - SPEC-UX-043-MULTIDESTINOS (ux-designer)
> - SPEC-SEC-043-PAYMENTS (security-specialist)
> - SPEC-AI-043-MULTIDESTINOS-PROMPTS (prompt-engineer)
> - SPEC-PROD-043-ENTITLEMENTS (product-owner — trial/refund policies)

---

### Change History

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0.0 | 2026-04-10 | architect | Draft inicial — cobre schema, entitlements, webhook, migration, ADRs |
