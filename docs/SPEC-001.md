# SPEC-001: Trip Creation & Management

**Status**: Draft
**Date**: 2026-02-23
**Author**: Architect
**Related**: US-001, UX-001, ADR-001, ADR-002
**Security refs**: SEC-001, SEC-002, SEC-005, SEC-009, SEC-011

---

## 1. Overview

Esta especificacao define a implementacao tecnica completa da feature de criacao e gestao de viagens (US-001) — a entidade central do dominio do Travel Planner. Sem a existencia de um objeto `Trip`, nenhuma outra feature do sistema pode funcionar: o construtor de itinerario, o controle de orcamento e o planejamento colaborativo sao todos dependentes desta feature.

O escopo tecnico cobre o modelo de dados Prisma do `Trip`, as Server Actions de mutacao (criar, atualizar, arquivar, excluir), as paginas Next.js App Router (`/trips`, `/trips/new`, `/trips/[id]`, `/trips/[id]/edit`), a estrategia de cache Redis, e os requisitos de seguranca e acessibilidade definidos em `docs/security.md` e `docs/ux-patterns.md`.

---

## 2. Acceptance Criteria Reference

Todos os criterios de aceite abaixo vem diretamente de `docs/tasks.md` — US-001.

| ID | Descricao |
|---|---|
| AC-001 | Usuario nao autenticado em `/trips` e redirecionado para `/login?callbackUrl=/trips` |
| AC-002 | Usuario autenticado ve apenas suas proprias viagens (isolamento por `userId`) |
| AC-003 | Formulario com campos obrigatorios cria a viagem e redireciona para `/trips/[id]` |
| AC-004 | Data de fim anterior a data de inicio exibe mensagem de erro no campo de retorno |
| AC-005 | Campos obrigatorios em branco exibem mensagem de erro especifica sem recarregar a pagina |
| AC-006 | Viagem criada exibe titulo, destino, periodo e status "Planejando" na pagina de detalhe |
| AC-007 | Tentativa de criar mais de 20 viagens ativas exibe mensagem de limite |
| AC-008 | Lista de viagens ordenada por data de inicio (proximas primeiro), com titulo, destino, periodo e status |
| AC-009 | Estado vazio com CTA "Criar minha primeira viagem" quando usuario nao tem viagens |
| AC-010 | Listagem paginada com 20 itens por pagina quando usuario tem mais de 20 viagens |
| AC-011 | Edicao persiste as alteracoes e redireciona para `/trips/[id]` |
| AC-012 | Acesso a `/trips/[id]/edit` de viagem alheia retorna 403 |
| AC-013 | Arquivar viagem muda `status` para `ARCHIVED` (sem soft delete — viagem permanece acessivel via filtro) |
| AC-014 | Excluir viagem preenche `deletedAt` (soft delete) e remove de todas as listagens |
| AC-015 | FCP em menos de 1,5 segundos em conexao 4G media (Lighthouse, producao) |
| AC-016 | Formulario operavel via teclado e compativel com leitores de tela (WCAG 2.1 AA) |
| AC-017 | Todos os elementos visiveis e interagiveis em viewport 375px sem scroll horizontal |

---

## 3. Data Model

### 3.1 Prisma Schema

O schema completo deve ser inserido em `prisma/schema.prisma`. A seguir o bloco do modelo `Trip` e os enums associados:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum TripStatus {
  PLANNING
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum TripVisibility {
  PRIVATE
  PUBLIC
  SHARED
}

// ─── User (referencia — schema completo em US-003) ───────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatarUrl     String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  trips         Trip[]

  @@index([email])
  @@index([deletedAt])
  @@map("users")
}

// ─── Trip ────────────────────────────────────────────────────────────────────

model Trip {
  id          String         @id @default(cuid())
  userId      String

  // Dados principais
  title       String         @db.VarChar(100)
  destination String         @db.VarChar(150)
  description String?        @db.VarChar(500)

  // Datas
  startDate   DateTime?
  endDate     DateTime?

  // Capa (v1: nome do gradiente + emoji — sem URL de imagem)
  coverGradient String       @default("sunset") @db.VarChar(50)
  coverEmoji    String       @default("✈️")    @db.VarChar(10)

  // Estado
  status      TripStatus     @default(PLANNING)
  visibility  TripVisibility @default(PRIVATE)

  // Timestamps
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  // Relacoes
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([userId, deletedAt])
  @@index([userId, status, deletedAt])
  @@index([userId, startDate, deletedAt])
  @@map("trips")
}
```

**Notas de design:**

- `id`: CUID2 via `@default(cuid())` — conforme ADR-001. Nunca expor auto-increment inteiro.
- `coverGradient`: armazena o nome do gradiente (`"sunset"`, `"ocean"`, etc.) — nao uma URL. Em v1 nao ha upload de imagem (fora do escopo, ver US-001 "Fora do Escopo").
- `coverEmoji`: Unicode emoji como string — max 10 chars por seguranca com caracteres multi-byte.
- `startDate` / `endDate`: nullable para permitir que viagens sejam criadas sem datas definidas (AC-003 exige datas, mas a regra de negocio pode evoluir; o schema e mais permissivo que a validacao atual do formulario).
- `deletedAt`: soft delete obrigatorio conforme politica em `docs/architecture.md` e `docs/security.md` (SEC-009).
- `visibility`: default `PRIVATE` — conforme requisito GDPR em `docs/security.md`.
- `onDelete: Cascade`: ao deletar o `User`, todas as trips sao deletadas em cascata (para o pipeline de erasure GDPR de `docs/data-architecture.md`).

### 3.2 Database Migrations

A migration deve ser gerada com:

```bash
npx prisma migrate dev --name create_trips_table
```

O Prisma gerara o SQL equivalente. Os principais DDL esperados:

```sql
-- Criacao do enum TripStatus
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- Criacao do enum TripVisibility
CREATE TYPE "TripVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'SHARED');

-- Criacao da tabela trips
CREATE TABLE "trips" (
  "id"             VARCHAR(30) NOT NULL,
  "userId"         VARCHAR(30) NOT NULL,
  "title"          VARCHAR(100) NOT NULL,
  "destination"    VARCHAR(150) NOT NULL,
  "description"    VARCHAR(500),
  "startDate"      TIMESTAMP(3),
  "endDate"        TIMESTAMP(3),
  "coverGradient"  VARCHAR(50) NOT NULL DEFAULT 'sunset',
  "coverEmoji"     VARCHAR(10) NOT NULL DEFAULT '✈️',
  "status"         "TripStatus" NOT NULL DEFAULT 'PLANNING',
  "visibility"     "TripVisibility" NOT NULL DEFAULT 'PRIVATE',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "deletedAt"      TIMESTAMP(3),
  CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- Foreign key para users
ALTER TABLE "trips"
  ADD CONSTRAINT "trips_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "trips_userId_deletedAt_idx"        ON "trips"("userId", "deletedAt");
CREATE INDEX "trips_userId_status_deletedAt_idx" ON "trips"("userId", "status", "deletedAt");
CREATE INDEX "trips_userId_startDate_deletedAt_idx" ON "trips"("userId", "startDate", "deletedAt");
```

**Observacao sobre Prisma Middleware para soft delete:**

Implementar um Prisma middleware ou extension em `src/server/db/client.ts` que adiciona automaticamente `deletedAt: null` em todas as queries de `findMany`, `findFirst` e `findUnique` sobre modelos com `deletedAt`. Isso previne vazamento de dados soft-deletados (SEC-009):

```typescript
// src/server/db/client.ts (adicionar apos a criacao do client)
db.$use(async (params, next) => {
  const modelsWithSoftDelete = ["Trip", "User"];

  if (modelsWithSoftDelete.includes(params.model ?? "")) {
    if (params.action === "findUnique" || params.action === "findFirst") {
      params.action = "findFirst";
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === "findMany") {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }
  }

  return next(params);
});
```

### 3.3 Validation Rules

Regras aplicadas na camada de validacao Zod (`src/lib/validations/trip.schema.ts`). Estas regras sao a fonte de verdade para todos os formularios e Server Actions.

| Campo | Tipo TS | Obrigatorio | Constraints | Mensagem de erro |
|---|---|---|---|---|
| `title` | `string` | Sim | min 3, max 100 chars | "O nome precisa ter pelo menos 3 caracteres" / "O nome pode ter no maximo 100 caracteres" / "Por favor, de um nome para sua viagem" |
| `destination` | `string` | Sim | min 2, max 150 chars | "Digite pelo menos 2 caracteres para o destino" / "O destino pode ter no maximo 150 caracteres" / "Por favor, informe o destino da viagem" |
| `startDate` | `Date` | Sim (create) | Nao pode ser no passado para novas viagens | "A data de partida nao pode ser no passado" / "Informe a data de partida" |
| `endDate` | `Date` | Sim (create) | Deve ser `>= startDate` | "A data de retorno deve ser posterior a data de partida" / "Informe a data de retorno" |
| `description` | `string \| null` | Nao | max 500 chars | "A descricao pode ter no maximo 500 caracteres" |
| `coverGradient` | `string` | Nao | deve ser um dos 8 valores permitidos; default `"sunset"` | "Gradiente de capa invalido" |
| `coverEmoji` | `string` | Nao | max 10 chars; default `"✈️"` | "Emoji invalido" |

**Nota sobre `startDate` na edicao:** na edicao (`TripUpdateSchema`), a restricao de "data no passado" NAO se aplica — viagens ja ocorridas podem ser editadas livremente. Ver secao 6.2.

---

## 4. API Contract

A feature US-001 e implementada inteiramente via **Next.js Server Actions** — sem REST endpoints adicionais. REST (`/api/v1/trips`) sera relevante apenas para integracoes externas futuras (mobile app, webhooks), fora do escopo desta spec.

### 4.1 Server Actions

Arquivo: `src/server/actions/trip.actions.ts`

---

#### `createTrip`

**Descricao**: Cria uma nova viagem para o usuario autenticado.

**File**: `src/server/actions/trip.actions.ts`

**Input — Zod schema** (`src/lib/validations/trip.schema.ts`):

```typescript
// src/lib/validations/trip.schema.ts
import { z } from "zod";

export const COVER_GRADIENTS = [
  "sunset", "ocean", "forest", "desert",
  "aurora", "city", "sakura", "alpine",
] as const;

export type CoverGradient = typeof COVER_GRADIENTS[number];

export const TripCreateSchema = z.object({
  title: z
    .string({ required_error: "Por favor, de um nome para sua viagem" })
    .trim()
    .min(3, "O nome precisa ter pelo menos 3 caracteres")
    .max(100, "O nome pode ter no maximo 100 caracteres"),

  destination: z
    .string({ required_error: "Por favor, informe o destino da viagem" })
    .trim()
    .min(2, "Digite pelo menos 2 caracteres para o destino")
    .max(150, "O destino pode ter no maximo 150 caracteres"),

  startDate: z
    .coerce.date({ required_error: "Informe a data de partida" })
    .refine(
      (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
      "A data de partida nao pode ser no passado"
    ),

  endDate: z
    .coerce.date({ required_error: "Informe a data de retorno" }),

  description: z
    .string()
    .trim()
    .max(500, "A descricao pode ter no maximo 500 caracteres")
    .optional()
    .nullable(),

  coverGradient: z
    .enum(COVER_GRADIENTS)
    .default("sunset"),

  coverEmoji: z
    .string()
    .max(10, "Emoji invalido")
    .default("✈️"),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "A data de retorno deve ser posterior a data de partida",
    path: ["endDate"],
  }
);

export type TripCreateInput = z.infer<typeof TripCreateSchema>;
```

**Output**:

```typescript
type CreateTripResult =
  | { success: true; tripId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

**Server Action implementation:**

```typescript
// src/server/actions/trip.actions.ts
"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { TripCreateSchema } from "@/lib/validations/trip.schema";
import { TripService } from "@/server/services/trip.service";
import { UnauthorizedError, AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTrip(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: false; error: string; fieldErrors?: Record<string, string[]> }> {
  // Passo 1: autenticacao PRIMEIRO — antes de qualquer processamento
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Passo 2: parse e validacao — Zod rejeita campos desconhecidos por padrao
  const parsed = TripCreateSchema.safeParse({
    title:         formData.get("title"),
    destination:   formData.get("destination"),
    startDate:     formData.get("startDate"),
    endDate:       formData.get("endDate"),
    description:   formData.get("description"),
    coverGradient: formData.get("coverGradient"),
    coverEmoji:    formData.get("coverEmoji"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados invalidos. Verifique os campos e tente novamente.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Passo 3: chamar o service com userId da sessao — nunca do input do usuario
  try {
    const trip = await TripService.createTrip(session.user.id, parsed.data);
    revalidatePath("/trips");
    redirect(`/trips/${trip.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Nao foi possivel criar a viagem. Tente novamente em alguns instantes." };
  }
}
```

**Authorization**: `session.user.id` da sessao Auth.js — nunca aceito do input do usuario.

**Side effects**:
- `revalidatePath("/trips")` — invalida cache da listagem
- `redirect("/trips/[id]")` — redireciona para o detalhe da viagem criada
- `TripService.createTrip` dispara evento de analytics `trip_created` (ver secao 6)

---

#### `updateTrip`

**Descricao**: Atualiza campos de uma viagem existente do usuario autenticado.

**File**: `src/server/actions/trip.actions.ts`

**Input — Zod schema**:

```typescript
// src/lib/validations/trip.schema.ts
export const TripUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "O nome precisa ter pelo menos 3 caracteres")
    .max(100, "O nome pode ter no maximo 100 caracteres")
    .optional(),

  destination: z
    .string()
    .trim()
    .min(2, "Digite pelo menos 2 caracteres para o destino")
    .max(150, "O destino pode ter no maximo 150 caracteres")
    .optional(),

  // Na edicao: datas no passado sao permitidas (viagem ja ocorreu)
  startDate: z.coerce.date().optional(),
  endDate:   z.coerce.date().optional(),

  description: z
    .string()
    .trim()
    .max(500, "A descricao pode ter no maximo 500 caracteres")
    .optional()
    .nullable(),

  coverGradient: z.enum(COVER_GRADIENTS).optional(),
  coverEmoji:    z.string().max(10).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: "A data de retorno deve ser posterior a data de partida",
    path: ["endDate"],
  }
);

export type TripUpdateInput = z.infer<typeof TripUpdateSchema>;
```

**Output**:

```typescript
type UpdateTripResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

**Authorization**: `TripService.updateTrip(userId, tripId, data)` — inclui `userId` na query Prisma (mitigacao BOLA, SEC-001).

**Side effects**:
- `revalidatePath("/trips/[id]")`
- `revalidatePath("/trips")`
- `redirect("/trips/[id]")`
- Evento analytics `trip_updated` com `fields_changed` (apenas nomes dos campos, nao valores)

---

#### `archiveTrip`

**Descricao**: Altera o status de uma viagem para `ARCHIVED`. Nao aplica soft delete — a viagem permanece acessivel via filtro.

**File**: `src/server/actions/trip.actions.ts`

**Input**:

```typescript
export const TripArchiveSchema = z.object({
  tripId: z.string().min(20).max(30), // CUID2 length
});
```

**Output**:

```typescript
type ArchiveTripResult =
  | { success: true }
  | { success: false; error: string };
```

**Authorization**: verifica propriedade via `userId` na query.

**Side effects**:
- `revalidatePath("/trips")`
- Toast de sucesso disparado pelo Client Component apos retorno

---

#### `deleteTrip`

**Descricao**: Aplica soft delete (`deletedAt = now()`) na viagem. A viagem desaparece de todas as listagens.

**File**: `src/server/actions/trip.actions.ts`

**Input**:

```typescript
export const TripDeleteSchema = z.object({
  tripId:            z.string().min(20).max(30),
  confirmationTitle: z.string(), // deve ser igual ao titulo da viagem (validado no service)
});
```

**Output**:

```typescript
type DeleteTripResult =
  | { success: true }
  | { success: false; error: string };
```

**Authorization**: verifica propriedade e valida `confirmationTitle === trip.title` no service.

**Side effects**:
- `revalidatePath("/trips")`
- `redirect("/trips")` via Client Component apos sucesso
- Evento analytics `trip_deleted` com `trip_id_hash`

---

### 4.2 API Routes (REST)

Nao ha REST endpoints necessarios para esta feature no MVP. As mutacoes sao cobertas por Server Actions e a listagem por Server Components com Prisma direto no service.

**Para referencia futura** (mobile app / integracoes externas), os endpoints REST seriam:

```
GET    /api/v1/trips          →  ListTrips (paginado, filtro por status)
POST   /api/v1/trips          →  CreateTrip
GET    /api/v1/trips/:id      →  GetTrip
PATCH  /api/v1/trips/:id      →  UpdateTrip
DELETE /api/v1/trips/:id      →  SoftDeleteTrip
```

Estes endpoints nao sao implementados nesta spec — sao documentados apenas para planejamento futuro.

---

## 5. Component Architecture

### 5.1 Page Components (Server Components)

#### `/trips` — `src/app/(auth)/trips/page.tsx`

- **Tipo**: React Server Component
- **Data fetching**: chama `TripService.listTrips(userId, { page, status })` diretamente no server
- **Auth**: `middleware.ts` garante redirecionamento se nao autenticado (AC-001)
- **Props**: `{ searchParams: { page?: string; status?: TripStatus } }`
- **Renderiza**:
  - `PageHeader` com `TripCounter` e botao "Nova viagem"
  - `TabBar` de filtro por status
  - `TripGrid` com lista de `TripCard`
  - `EmptyState` se sem viagens
  - `Pagination` se total > 20

#### `/trips/new` — `src/app/(auth)/trips/new/page.tsx`

- **Tipo**: React Server Component (shell da pagina)
- **Data fetching**: busca contagem de viagens ativas para verificar limite (AC-007)
- **Auth**: protegido por middleware
- **Renderiza**:
  - `PageHeader` com breadcrumb
  - `Alert` de limite se usuario ja tem 20 viagens ativas
  - `TripForm` (Client Component) com `action={createTrip}`

#### `/trips/[id]` — `src/app/(auth)/trips/[id]/page.tsx`

- **Tipo**: React Server Component
- **Data fetching**: `TripService.getTripById(userId, params.id)` — lanca `NotFoundError` ou `ForbiddenError` (tratados pelo Next.js error boundary)
- **Props**: `{ params: { id: string } }`
- **Renderiza**:
  - `TripHero` com gradiente e emoji
  - `TripInfoHeader` com destino, periodo e contador de dias
  - Acoes: `Button` "Editar" + `DropdownMenu` (Arquivar / Excluir)
  - Placeholder US-002
  - `TripDescription` se preenchida

#### `/trips/[id]/edit` — `src/app/(auth)/trips/[id]/edit/page.tsx`

- **Tipo**: React Server Component
- **Data fetching**: `TripService.getTripById(userId, params.id)` — mesma verificacao de propriedade
- **Renderiza**:
  - `PageHeader` com breadcrumb
  - `TripForm` (Client Component) pre-preenchido com `defaultValues`

### 5.2 Interactive Components (Client Components)

#### `TripForm` — `src/components/features/trips/trip-form.tsx`

- **Tipo**: Client Component (`"use client"`)
- **Estado**: `useActionState(createTrip | updateTrip, initialState)` — React 19 / Next.js 15
- **Form**: `react-hook-form` + `zodResolver(TripCreateSchema | TripUpdateSchema)`
- **Props**:
  ```typescript
  interface TripFormProps {
    mode: "create" | "edit";
    defaultValues?: Partial<TripCreateInput>;
    tripId?: string; // obrigatorio no modo "edit"
  }
  ```
- **Renderiza**: todos os campos do formulario com validacao inline, `CoverPicker`, `EmojiPicker`, preview da capa, botoes de acao
- **Comportamento**: submit desabilita botoes e exibe spinner; erros de campo renderizados inline; foco move para primeiro campo com erro

#### `TripCard` — `src/components/features/trips/trip-card.tsx`

- **Tipo**: Client Component (necessita interatividade: hover, menu de contexto)
- **Props**:
  ```typescript
  interface TripCardProps {
    trip: TripCardData; // subset seguro do modelo Trip
    onArchive: (tripId: string) => void;
    onDelete:  (tripId: string, title: string) => void;
  }
  ```
- **Renderiza**: capa com gradiente e emoji, status badge, titulo, destino, periodo, menu de contexto "..."

#### `ConfirmArchiveDialog` — `src/components/features/trips/confirm-archive-dialog.tsx`

- **Tipo**: Client Component
- **Usa**: `archiveTrip` Server Action
- **Props**: `{ tripId: string; tripTitle: string; open: boolean; onClose: () => void }`

#### `ConfirmDeleteDialog` — `src/components/features/trips/confirm-delete-dialog.tsx`

- **Tipo**: Client Component
- **Usa**: `deleteTrip` Server Action
- **Props**: `{ tripId: string; tripTitle: string; open: boolean; onClose: () => void }`
- **Comportamento especial**: botao "Excluir permanentemente" so habilitado quando campo de confirmacao == `tripTitle`

#### `CoverPicker` — `src/components/features/trips/cover-picker.tsx`

- **Tipo**: Client Component
- **Props**: `{ value: CoverGradient; onChange: (value: CoverGradient) => void }`
- **Acessibilidade**: `role="radiogroup"`, cada opcao `role="radio"`, navegacao por arrow keys

### 5.3 Component Tree

```
/trips (Server Component)
└── AppShell (layout)
    ├── SideNav / TopNav
    └── main
        ├── PageHeader
        │   ├── TripCounter
        │   └── Button "Nova viagem"
        ├── TabBar (filtros de status)
        └── TripGrid (Server Component — renderiza lista)
            ├── TripCard (Client Component) x N
            │   ├── TripHeroCover (gradiente + emoji)
            │   ├── StatusBadge
            │   └── DropdownMenu
            │       ├── ConfirmArchiveDialog (Client Component)
            │       └── ConfirmDeleteDialog (Client Component)
            ├── EmptyState (condicional)
            └── Pagination (condicional)

/trips/new (Server Component)
└── AppShell
    └── main
        ├── PageHeader (breadcrumb + Cancelar)
        ├── Alert (limite — condicional)
        └── TripForm (Client Component)
            ├── CoverPreview (tempo real)
            ├── FormField[title]
            ├── FormField[destination]
            ├── FormField[startDate]
            ├── FormField[endDate]
            ├── FormField[description]
            ├── CoverPicker
            ├── EmojiPicker
            └── FormActions [Cancelar | Criar viagem]

/trips/[id] (Server Component)
└── AppShell
    └── main
        ├── TripHero (gradiente + emoji + titulo + StatusBadge)
        ├── Breadcrumb
        ├── TripInfoHeader (destino, periodo, contagem dias)
        ├── TripActions
        │   ├── Button "Editar viagem"
        │   └── DropdownMenu
        │       ├── ConfirmArchiveDialog
        │       └── ConfirmDeleteDialog
        ├── ItineraryPlaceholder (US-002)
        └── TripDescription (condicional)

/trips/[id]/edit (Server Component)
└── AppShell
    └── main
        ├── PageHeader (breadcrumb + Cancelar)
        └── TripForm (Client Component, mode="edit", defaultValues)
```

---

## 6. Business Logic

### 6.1 Trip Status Machine

```
              ┌─────────────────────────────────────┐
              │           PLANNING (default)          │
              └──────┬──────────────┬────────────────┘
                     │              │
                  [ativo]       [arquivar]
                     │              │
              ┌──────▼──────┐  ┌───▼───────┐
              │    ACTIVE    │  │  ARCHIVED │◄──────────────┐
              └──────┬───────┘  └───────────┘               │
                     │                                       │
              [concluir]                               [arquivar]
                     │                                       │
              ┌──────▼──────┐                               │
              │  COMPLETED  │──────────────────────────────►┘
              └─────────────┘
```

**Transicoes validas:**

| De | Para | Condicao | Acao do usuario |
|---|---|---|---|
| `PLANNING` | `ACTIVE` | `startDate <= hoje` | automatica (futura, via cron) ou manual |
| `PLANNING` | `ARCHIVED` | qualquer | usuario clica "Arquivar" |
| `ACTIVE` | `COMPLETED` | `endDate < hoje` | automatica (futura) ou manual |
| `ACTIVE` | `ARCHIVED` | qualquer | usuario clica "Arquivar" |
| `COMPLETED` | `ARCHIVED` | qualquer | usuario clica "Arquivar" |
| `ARCHIVED` | `PLANNING` | qualquer | usuario clica "Desarquivar" (futura feature) |
| qualquer | `deleted` | confirmacao do titulo | usuario confirma exclusao (soft delete) |

**Importante**: para o MVP, as transicoes automaticas (`PLANNING → ACTIVE`, `ACTIVE → COMPLETED`) nao serao implementadas — o status so muda por acao explicita do usuario. A maquina de estados esta documentada para guiar implementacoes futuras.

**Implementacao no service:**

```typescript
// src/server/services/trip.service.ts

const VALID_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNING:  ["ACTIVE", "ARCHIVED"],
  ACTIVE:    ["COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED:  ["PLANNING"], // desarquivar — futura feature
};

export function isValidStatusTransition(
  from: TripStatus,
  to: TripStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### 6.2 Trip Limit Enforcement

O limite de 20 viagens ativas (status `PLANNING`, `ACTIVE` ou `COMPLETED`) por usuario e uma regra de negocio do MVP (AC-007).

**Onde e aplicado:** no `TripService.createTrip()`, antes de qualquer operacao de escrita no banco. Nunca apenas no client-side.

```typescript
// src/server/services/trip.service.ts

const MAX_ACTIVE_TRIPS = 20; // src/lib/constants.ts

async function assertTripLimitNotReached(userId: string): Promise<void> {
  const count = await db.trip.count({
    where: {
      userId,
      deletedAt: null,
      status: { in: ["PLANNING", "ACTIVE", "COMPLETED"] },
    },
  });

  if (count >= MAX_ACTIVE_TRIPS) {
    throw new AppError(
      "TRIP_LIMIT_REACHED",
      "Limite de 20 viagens ativas atingido. Arquive ou exclua uma viagem para continuar.",
      400
    );
  }
}
```

**Verificacao client-side adicional:** a pagina `/trips/new` (Server Component) busca a contagem antes de renderizar e exibe um `Alert` de limite. Isso e UX proativa — a regra de negocio autoritativa esta no service.

**Definicao de "ativa":** viagens com `status IN ('PLANNING', 'ACTIVE', 'COMPLETED')` e `deletedAt IS NULL`. Viagens `ARCHIVED` nao contam para o limite.

### 6.3 Soft Delete Policy

Conforme `docs/architecture.md` e `docs/security.md`:

- **Nunca** executar `db.trip.delete()` diretamente em resposta a uma acao do usuario
- Soft delete = `db.trip.update({ where: { id, userId }, data: { deletedAt: new Date() } })`
- Viagens soft-deletadas desaparecem de todas as queries por forca do middleware Prisma (ver secao 3.2)
- O campo `confirmationTitle` no dialogo de exclusao deve ser comparado com `trip.title` antes de aplicar o soft delete (prevencao de exclusao acidental)
- Dados associados (quando `ItineraryDay` e `Activity` forem implementados — US-002) permanecem na base com `deletedAt` propagado ou via cascade — a decisao sera tomada no SPEC-002
- O pipeline de erasure GDPR (hard delete real) e gerenciado separadamente pelo `ErasureService` — ver `docs/data-architecture.md`

---

## 7. Security Requirements

### 7.1 Authorization Model

Toda query Prisma sobre `Trip` deve incluir `userId` como condicao de filtro. Esta e a mitigacao primaria de BOLA/IDOR (SEC-001).

**Padrao obrigatorio** (extraido de `docs/security.md`):

```typescript
// CORRETO: ownership enforced at query level
const trip = await db.trip.findFirst({
  where: {
    id:        tripId,
    userId:    userId,   // <- ownership sempre no where
    deletedAt: null,
  },
  select: { /* explicit fields only */ },
});
if (!trip) throw new NotFoundError("Trip", tripId);
```

```typescript
// ERRADO: NUNCA fazer isso
const trip = await db.trip.findUnique({ where: { id: tripId } });
if (trip?.userId !== userId) throw new ForbiddenError();
// O dado foi carregado em memoria antes da verificacao de propriedade
```

**Regra:** se `findFirst({ where: { id, userId } })` retornar `null`, lanca `NotFoundError` — nao `ForbiddenError`. Isso evita que um atacante descubra se um ID existe para outro usuario (enumeracao via timing).

### 7.2 Input Validation

Validacao Zod e aplicada em duas camadas:

1. **Client-side** (UX): `react-hook-form` com `zodResolver(TripCreateSchema)` — feedback imediato sem request ao servidor
2. **Server-side** (seguranca): Server Action executa `TripCreateSchema.safeParse()` antes de qualquer acesso ao banco — client-side validation NAO e uma garantia de seguranca

Path parameters (`params.id`) sao tratados como strings nao confiaveis. O `TripService` valida propriedade via query — nunca usa `params.id` diretamente em raw SQL.

### 7.3 Mass Assignment Prevention

Os seguintes campos **NUNCA** devem ser aceitos do input do usuario — sao gerenciados exclusivamente pelo servidor:

| Campo | Motivo |
|---|---|
| `id` | Gerado pelo Prisma (CUID2) |
| `userId` | Extraido de `session.user.id` — nunca do formulario |
| `status` | Controlado pela maquina de estados no service |
| `visibility` | Default `PRIVATE`; mudanca sera feature separada (US-004) |
| `createdAt` | Gerenciado pelo Prisma |
| `updatedAt` | Gerenciado pelo Prisma (`@updatedAt`) |
| `deletedAt` | Gerenciado exclusivamente pelo `TripService.deleteTrip()` |

O Zod schema `TripCreateSchema` define apenas os campos aceitos do usuario. Por padrao o Zod faz `.strip()` de campos desconhecidos — nenhum campo extra passa pela validacao.

O service mapeia explicitamente os campos validados para o Prisma `create`:

```typescript
// CORRETO: mapeamento explicito — sem spread do input do usuario
await db.trip.create({
  data: {
    userId:        userId,          // da sessao
    title:         validated.title,
    destination:   validated.destination,
    startDate:     validated.startDate,
    endDate:       validated.endDate,
    description:   validated.description ?? null,
    coverGradient: validated.coverGradient,
    coverEmoji:    validated.coverEmoji,
    // status, visibility, createdAt, updatedAt: Prisma defaults
  },
});
```

---

## 8. Error Handling

| Cenario | Comportamento do Server/Action | Comportamento na UI |
|---|---|---|
| Viagem nao encontrada | `NotFoundError` → Next.js `not-found.tsx` | Pagina 404 com mensagem "Esta viagem nao existe ou foi excluida" + botao "Voltar para Minhas Viagens" |
| Acesso nao autorizado | `ForbiddenError` → Next.js `error.tsx` | Pagina 403 com mensagem "Voce nao tem acesso a esta viagem" + botao "Voltar para Minhas Viagens" |
| Sessao expirada / nao autenticado | `UnauthorizedError` → middleware redirect | Redirect para `/login?callbackUrl=[pagina atual]` |
| Limite de 20 viagens atingido | `AppError` code `TRIP_LIMIT_REACHED` (400) | Alert no topo do formulario com link "Ver minhas viagens" |
| Erro de validacao (campos invalidos) | `ZodError` → `fieldErrors` no retorno | Mensagem inline em cada campo invalido; foco no primeiro campo com erro |
| Data de retorno anterior a partida | `ZodError` no campo `endDate` | Mensagem "A data de retorno deve ser posterior a data de partida" no campo `endDate` |
| Erro interno do servidor | `AppError` generico (500) | Toast "Nao foi possivel criar/salvar a viagem. Tente novamente em alguns instantes." |
| Titulo de confirmacao incorreto na exclusao | Validacao no service (400) | Botao "Excluir permanentemente" permanece desabilitado ate o campo corresponder ao titulo |
| Tentativa de arquivar viagem ja arquivada | `AppError` code `INVALID_STATUS_TRANSITION` (422) | Toast de erro |

**Convencao de error codes** (SCREAMING_SNAKE_CASE):

```typescript
// src/lib/errors.ts (adicionar alem das classes base)
export const TripErrorCodes = {
  TRIP_NOT_FOUND:              "TRIP_NOT_FOUND",
  TRIP_LIMIT_REACHED:          "TRIP_LIMIT_REACHED",
  INVALID_STATUS_TRANSITION:   "INVALID_STATUS_TRANSITION",
  INVALID_CONFIRMATION_TITLE:  "INVALID_CONFIRMATION_TITLE",
} as const;
```

---

## 9. Performance Requirements

### 9.1 Targets

| Metrica | Target | Condicao de medicao |
|---|---|---|
| First Contentful Paint (FCP) `/trips` | < 1.500ms | Lighthouse, conexao 4G simulada, producao |
| Time to First Byte (TTFB) | < 200ms | Vercel edge, regiao mais proxima do usuario |
| Query de listagem de trips | < 50ms | P95, com index, PostgreSQL Railway |
| Query de detalhe de trip | < 20ms | P95, com index |
| Server Action `createTrip` | < 500ms | P95, incluindo DB write e Redis invalidation |

### 9.2 Caching Strategy

**Cache Redis (Upstash):**

| Chave | Conteudo | TTL | Invalidacao |
|---|---|---|---|
| `trips:list:{userId}:{page}:{status}` | Lista paginada de trips (JSON) | 60s | `revalidatePath("/trips")` + `cache.del(CacheKeys.tripsList(userId))` |
| `trips:count:{userId}` | Contagem de viagens ativas | 60s | Em cada create/archive/delete |
| `trips:detail:{tripId}` | Dados completos de um trip | 300s | Em cada update/archive/delete do trip |

**Implementacao das cache keys** (`src/server/cache/keys.ts`):

```typescript
// src/server/cache/keys.ts
export const CacheKeys = {
  tripsList: (userId: string, page = 1, status = "all") =>
    `trips:list:${userId}:${page}:${status}`,

  tripsCount: (userId: string) =>
    `trips:count:${userId}`,

  tripDetail: (tripId: string) =>
    `trips:detail:${tripId}`,
} as const;
```

**Estrategia de invalidacao no TripService:**

```typescript
// Apos qualquer mutacao de trip:
await Promise.all([
  cache.del(CacheKeys.tripsList(userId)),
  cache.del(CacheKeys.tripsCount(userId)),
  cache.del(CacheKeys.tripDetail(tripId)),
]);
```

**Next.js Data Cache:** as paginas Server Component usam `fetch` cache do Next.js implicitamente. Usar `revalidatePath` apos mutacoes para invalidar o cache de renderizacao de pagina.

### 9.3 Database Indexes

Os tres indexes definidos no schema Prisma cobrem os padroes de query desta feature:

| Index | Query atendida |
|---|---|
| `(userId, deletedAt)` | Listagem geral de trips do usuario (sem filtro de status) |
| `(userId, status, deletedAt)` | Listagem com filtro de status (tabs: Planejando, Ativas, etc.) |
| `(userId, startDate, deletedAt)` | Ordenacao por data de inicio (proximas primeiro — AC-008) |

**Garantia de N+1:** o `TripService.listTrips` deve usar um unico `findMany` com `select` explicito — nenhum loop com queries individuais.

---

## 10. Testing Requirements

### 10.1 Unit Tests

Arquivo: `tests/unit/server/services/trip.service.test.ts`

| Funcao | Caso de teste |
|---|---|
| `TripService.createTrip` | Cria trip com dados validos; retorna o objeto criado |
| `TripService.createTrip` | Lanca `TRIP_LIMIT_REACHED` quando usuario tem 20 trips ativas |
| `TripService.createTrip` | Nunca aceita `userId` do input — usa o parametro da funcao |
| `TripService.getTripById` | Retorna trip quando userId corresponde |
| `TripService.getTripById` | Lanca `NotFoundError` quando tripId nao existe |
| `TripService.getTripById` | Lanca `NotFoundError` quando trip pertence a outro usuario (nao `ForbiddenError`) |
| `TripService.updateTrip` | Atualiza apenas os campos fornecidos |
| `TripService.updateTrip` | Lanca erro em transicao de status invalida |
| `TripService.archiveTrip` | Muda status para `ARCHIVED`; nao seta `deletedAt` |
| `TripService.deleteTrip` | Seta `deletedAt`; nao executa hard delete |
| `TripService.deleteTrip` | Lanca `INVALID_CONFIRMATION_TITLE` se confirmationTitle incorreto |
| `isValidStatusTransition` | Todas as transicoes validas e invalidas |
| `TripCreateSchema` | Aceita dados validos |
| `TripCreateSchema` | Rejeita titulo vazio, curto demais, longo demais |
| `TripCreateSchema` | Rejeita endDate anterior a startDate |
| `TripCreateSchema` | Rejeita startDate no passado (em create) |
| `TripUpdateSchema` | Aceita startDate no passado (em update) |
| `TripCreateSchema` | Strip de campos desconhecidos (mass assignment) |

**Mock de Prisma:** usar `vitest-mock-extended` para mockar o `db` client.

```typescript
// tests/unit/server/services/trip.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/server/db/client", () => ({
  db: mockDeep<PrismaClient>(),
}));

import { db } from "@/server/db/client";
import { TripService } from "@/server/services/trip.service";
// ...
```

### 10.2 Integration Tests

Arquivo: `tests/integration/trip.service.integration.test.ts`

Usa banco PostgreSQL real via Docker (test database isolado). Cada teste roda em uma transaction que e revertida apos o teste.

| Cenario de integracao |
|---|
| `createTrip` persiste no banco e retorna objeto com `id` CUID2 |
| `getTripById` nao retorna trips de outro usuario (isolamento real no banco) |
| `deleteTrip` seta `deletedAt` e trip desaparece de queries subsequentes |
| `archiveTrip` muda status mas nao seta `deletedAt` |
| Limit enforcement: 20 trips criadas → 21a lanca erro |
| Middleware soft delete: trip com `deletedAt != null` nunca aparece em `findMany` |
| Cascade: deletar User hard-deleta todas as trips (erasure pipeline) |

### 10.3 E2E Tests

Arquivo: `tests/e2e/trip-creation.spec.ts`

Usa Playwright com usuario autenticado (fixture de login).

| Fluxo E2E |
|---|
| Fluxo completo de criacao: preencher form → submit → verificar redirect e conteudo em `/trips/[id]` |
| Validacao de formulario: submeter com campos vazios → verificar mensagens de erro inline |
| Validacao de data: endDate < startDate → verificar mensagem de erro no campo |
| Limite de viagens: criar 20 trips → verificar alert na pagina `/trips/new` |
| Listagem: criar 3 trips → verificar ordenacao por startDate em `/trips` |
| Edicao: editar titulo → verificar alteracao persistida |
| Arquivamento: arquivar trip → verificar que sai da aba padrao |
| Exclusao: excluir trip com confirmacao do titulo → verificar soft delete e redirect |
| Isolamento: User A nao pode acessar trip de User B (retorna 404 ou 403) |
| Acessibilidade: completar fluxo de criacao apenas com teclado |
| Responsividade: formulario em viewport 375px sem scroll horizontal |

---

## 11. Implementation Notes for Developers

### 11.1 File Structure

Os seguintes arquivos devem ser criados ou modificados:

```
prisma/
  schema.prisma                           [MODIFICAR — adicionar Trip model]
  migrations/
    YYYYMMDDHHMMSS_create_trips_table/
      migration.sql                       [GERADO pelo Prisma migrate dev]

src/
  lib/
    constants.ts                          [CRIAR/MODIFICAR — MAX_ACTIVE_TRIPS = 20]
    errors.ts                             [MODIFICAR — adicionar TripErrorCodes]
    validations/
      trip.schema.ts                      [CRIAR — TripCreateSchema, TripUpdateSchema, etc.]

  server/
    actions/
      trip.actions.ts                     [CRIAR — createTrip, updateTrip, archiveTrip, deleteTrip]
    services/
      trip.service.ts                     [CRIAR — TripService com todos os metodos]
    cache/
      keys.ts                             [CRIAR/MODIFICAR — CacheKeys.tripsList, tripsCount, tripDetail]
    db/
      client.ts                           [MODIFICAR — adicionar middleware soft delete]

  types/
    trip.types.ts                         [CRIAR — TripCardData, TripDetailData, tipos de output]

  app/
    (auth)/
      trips/
        page.tsx                          [CRIAR — trip dashboard]
        new/
          page.tsx                        [CRIAR — criar viagem]
        [id]/
          page.tsx                        [CRIAR — detalhe da viagem]
          edit/
            page.tsx                      [CRIAR — editar viagem]

  components/
    features/
      trips/
        trip-form.tsx                     [CRIAR — Client Component do formulario]
        trip-card.tsx                     [CRIAR — Client Component do card]
        trip-hero.tsx                     [CRIAR — hero da pagina de detalhe]
        trip-info-header.tsx              [CRIAR — cabecalho de info da viagem]
        trip-grid.tsx                     [CRIAR — grid de cards]
        cover-picker.tsx                  [CRIAR — seletor de gradiente]
        confirm-archive-dialog.tsx        [CRIAR — dialog de arquivamento]
        confirm-delete-dialog.tsx         [CRIAR — dialog de exclusao com confirmacao]
        trip-counter.tsx                  [CRIAR — contador X de 20]
        itinerary-placeholder.tsx         [CRIAR — placeholder US-002]

tests/
  unit/
    server/
      services/
        trip.service.test.ts              [CRIAR]
    lib/
      validations/
        trip.schema.test.ts               [CRIAR]
  integration/
    trip.service.integration.test.ts      [CRIAR]
  e2e/
    trip-creation.spec.ts                 [CRIAR]
```

### 11.2 Dependencies

Nenhuma nova dependencia npm e necessaria para esta feature. Todas as bibliotecas ja estao no stack confirmado (ADR-001):

| Biblioteca | Uso nesta feature | Licenca |
|---|---|---|
| `@paralleldrive/cuid2` | Geracao de IDs (CUID2) | MIT |
| `prisma` + `@prisma/client` | ORM, queries | Apache 2.0 |
| `zod` | Validacao de schema | MIT |
| `react-hook-form` | Gerenciamento de formulario | MIT |
| `@hookform/resolvers` | Integracao zod + react-hook-form | MIT |
| `@auth/prisma-adapter` | Adapter Auth.js para Prisma | ISC |
| `ioredis` ou `@upstash/redis` | Cache Redis | MIT / Apache 2.0 |

### 11.3 Implementation Order

Seguir esta ordem minimiza dependencias entre tarefas paralelas (dev-fullstack-1 e dev-fullstack-2):

```
[Dev 1 — Backend]                          [Dev 2 — Frontend]
─────────────────────────────────           ────────────────────────────────
1. Prisma schema (Trip model)               1. Design tokens / globals.css
   └─ npx prisma migrate dev                   └─ CSS variables de UX-001

2. TripCreateSchema + TripUpdateSchema      2. Componentes UI primitivos
   └─ src/lib/validations/trip.schema.ts       └─ StatusBadge, TripCounter
                                               └─ CoverPicker

3. TripService (todos os metodos)           3. TripCard (Client Component)
   └─ src/server/services/trip.service.ts      └─ com mock data

4. Server Actions                           4. TripForm (Client Component)
   └─ src/server/actions/trip.actions.ts       └─ sem action ainda

5. Cache keys + Redis integration          5. ConfirmArchiveDialog
   └─ src/server/cache/keys.ts                 └─ ConfirmDeleteDialog

6. Unit tests (service + schemas)          ─── INTEGRAR ───
                                           6. Paginas Server Components
                                              └─ /trips, /trips/new, /trips/[id], edit

                                           7. Integration tests

                                           8. E2E tests
```

### 11.4 Common Pitfalls

**1. Nao use `redirect()` dentro de `try/catch`**

`redirect()` do Next.js lanca internamente uma excecao especial. Chamar `redirect()` dentro de um bloco `try/catch` capturara essa excecao e impedira o redirect. Sempre chame `redirect()` fora do try/catch:

```typescript
// ERRADO
try {
  const trip = await TripService.createTrip(userId, data);
  redirect(`/trips/${trip.id}`); // <- CAPTURADO pelo catch!
} catch (e) { ... }

// CORRETO
let tripId: string;
try {
  const trip = await TripService.createTrip(userId, data);
  tripId = trip.id;
} catch (e) { ... return error; }
revalidatePath("/trips");
redirect(`/trips/${tripId}`); // <- fora do try/catch
```

**2. `useActionState` substitui `useFormState` no React 19**

No Next.js 15 com React 19, use `useActionState` (nao `useFormState` de `react-dom/experimental`).

**3. Nao confunda `status: "ARCHIVED"` com soft delete**

Arquivar = mudar `status` para `ARCHIVED` (viagem continua acessivel via filtro).
Excluir = setar `deletedAt` (viagem desaparece de todas as queries).
Sao operacoes distintas com comportamentos diferentes.

**4. `startDate` e `endDate` sao `DateTime?` no schema mas obrigatorios no formulario**

O schema Prisma aceita nulos para flexibilidade futura. A validacao Zod do formulario de criacao exige ambas as datas. Nunca inferir que o schema Prisma = regras de negocio do formulario.

**5. `CoverGradient` deve usar `as const` — nao `enum`**

```typescript
// PREFERIDO: as const (tree-shakeable, type-safe, sem lookup de runtime)
export const COVER_GRADIENTS = ["sunset", "ocean", ...] as const;
export type CoverGradient = typeof COVER_GRADIENTS[number];

// EVITAR: enum TypeScript (gera objeto de runtime, menos flexivel)
enum CoverGradient { SUNSET = "sunset", ... }
```

**6. Nao retorne o objeto Prisma completo do service**

Use `select` explicito para retornar apenas os campos necessarios. Isso previne exposicao acidental de campos sensíveis e melhora performance.

**7. Middleware soft delete no `db.$use` e deprecated no Prisma 5+**

No Prisma 5+ (e 7), use Prisma Extensions (`db.$extends`) em vez de `db.$use`. Confirmar a API correta com a versao do Prisma usada no projeto.

---

## 12. Open Questions

- [ ] **OQ-001**: A transicao automatica de status (`PLANNING → ACTIVE` quando `startDate <= hoje`, `ACTIVE → COMPLETED` quando `endDate < hoje`) deve ser implementada nesta sprint ou deferida? Requer um cron job ou background job — complexidade adicional. Recomendacao do arquiteto: deferir para Sprint 2, MVP usa apenas transicoes manuais.

- [ ] **OQ-002**: O campo `destination` e texto livre no v1 (sem Mapbox Geocoding). Quando o autocomplete de destino for implementado (Sprint 2), o schema precisara de campos separados: `destinationName` (texto), `destinationLat` / `destinationLon` (coordenadas), `destinationPlaceId` (ID Mapbox). Decidir antes do SPEC-002 se o campo `destination` atual sera migrado ou se novos campos serao adicionados.

- [ ] **OQ-003**: O `TripService.listTrips` deve retornar viagens arquivadas por padrao (com filtro opcional) ou exclui-las da listagem principal e requer parametro `includeArchived=true`? A UX-001 define tabs separadas, mas a API do service precisa de uma decisao clara. Recomendacao: `status` filter com valor padrao `["PLANNING", "ACTIVE", "COMPLETED"]`, passando `["ARCHIVED"]` para a tab de arquivadas.

- [ ] **OQ-004**: `useActionState` do React 19 requer que o Server Action receba `prevState` como primeiro argumento. Os desenvolvedores devem confirmar que as Server Actions seguem a assinatura `(prevState: unknown, formData: FormData)` — senao o `useActionState` no client nao funcionara corretamente.

- [ ] **OQ-005**: O Prisma 7 usa `db.$extends` para extensions, mas a API de middleware `db.$use` pode ter mudado. O dev-fullstack deve verificar a documentacao do Prisma 7 para a implementacao correta do middleware de soft delete antes de codificar.

---

> **Status**: Draft — aguardando revisao do tech-lead e security-specialist antes de marcar como Approved.
>
> **Blockers**: OQ-003 deve ser resolvido antes do desenvolvimento do `TripService.listTrips`. Demais open questions podem ser resolvidas durante a implementacao.
>
> ⚠️ Blocked on: revisao de seguranca (security-specialist deve confirmar que os padroes de mitigacao BOLA e mass assignment desta spec estao alinhados com `docs/security.md`) e revisao tecnica do tech-lead (confirmar assinatura do `useActionState` com a versao exata do React/Next.js sendo usada).
