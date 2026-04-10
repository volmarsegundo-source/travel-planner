# Travel Planner — Architecture Documentation

**Version**: 1.0.0
**Last Updated**: 2026-02-23
**Author**: architect
**Status**: Active

---

## Overview

O Travel Planner é uma aplicação web que permite a viajantes planejar, organizar e gerenciar roteiros de viagem de forma completa — pesquisando destinos, construindo itinerários, e centralizando todas as informações de uma viagem em um único lugar. O sistema é projetado para ser escalável, seguro por design, e com excelente experiência em dispositivos móveis, atendendo tanto viajantes individuais quanto organizadores de grupos.

Tecnicamente, o sistema é construído como uma aplicação **full-stack Next.js** (monolito modular), com PostgreSQL como banco de dados principal, Redis para caching e sessões, e integrações com APIs externas de mapas e dados de destinos. Esta arquitetura prioriza simplicidade operacional na fase de MVP sem sacrificar a capacidade de escalar horizontalmente quando necessário.

---

## Tech Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Frontend Framework | Next.js (App Router) | 15.x | SSR, SEO, RSC, Server Actions |
| Language | TypeScript | 5.x | Type safety across full stack |
| Styling | Tailwind CSS | 4.x | Utility-first, responsive, zero runtime |
| UI Components | shadcn/ui | latest | Accessible, unstyled base, Radix primitives |
| Backend | Next.js API Routes + Server Actions | 15.x | Collocated with frontend, no separate service |
| ORM | Prisma | 7.x | Schema-first, type-safe, team-friendly migrations |
| Database | PostgreSQL | 16.x | Relational travel data, ACID, JSONB for flex fields |
| Cache / Sessions | Redis (Upstash) | 7.x | Serverless-compatible, session store, search cache |
| Auth | Auth.js (NextAuth v5) | 5.x | Self-hosted, no vendor lock-in, OIDC/OAuth2 |
| Maps / GEO | Mapbox GL JS | 3.x | Customizable, cost-effective, vector tiles |
| State Management | TanStack Query (React Query) | 5.x | Server state, caching, optimistic updates |
| Form Handling | React Hook Form + Zod | latest | Type-safe validation, performance |
| Testing (unit) | Vitest + Testing Library | latest | Fast, Vite-native, compatible with Next.js |
| Testing (E2E) | Playwright | latest | Cross-browser, reliable, CI-friendly |
| CI/CD | GitHub Actions | — | Native to Git, wide ecosystem |
| Containerization | Docker + Docker Compose | — | Dev parity, CI consistency |
| Infra (target) | Vercel (frontend) + Railway/Render (DB) | — | Low ops burden at MVP stage |
| Error Monitoring | Sentry | latest | Production error tracking |
| Observability | OpenTelemetry + Vercel Analytics | — | Tracing, web vitals |

---

## ADR-001: Initial Technology Stack Selection

**Date**: 2026-02-23
**Status**: Accepted
**Deciders**: architect

### Context

Este é um projeto greenfield — não existe código, frameworks, ou infraestrutura prévia. A equipe precisa de decisões claras e justificadas sobre o stack antes de escrever qualquer linha de código. As escolhas feitas agora definem as convenções, estrutura de pastas, padrões de teste e modelo de deployment para todo o ciclo de vida do produto.

Restrições identificadas:
- Equipe full-stack pequena com dois desenvolvedores trabalhando em paralelo
- Produto de viagem exige excelente SEO (descobrimento de destinos) e performance em mobile
- Dados de usuários incluem PII sensível (documentos de viagem, dados de pagamento futuramente) — privacidade por design é obrigatória
- MVP deve ser entregável com baixo custo operacional — sem Kubernetes ou microserviços prematuros
- Licenças permitidas: apenas MIT, Apache 2.0, BSD, ou ISC

### Decision

**Framework**: Next.js 15 com App Router (full-stack monolito modular)

O sistema inteiro roda como uma única aplicação Next.js. Server Components renderizam páginas de destino e resultados de busca no servidor (SEO + performance). Server Actions tratam mutações (criação de itinerário, autenticação). API Routes expostas sob `/api/v1/` servem como contrato REST explícito quando necessário (futuras integrações mobile, webhooks).

**Banco de dados**: PostgreSQL 16 via Prisma 7 ORM

Travel data é inerentemente relacional: usuários têm itinerários, itinerários têm dias, dias têm atividades, atividades têm localizações. PostgreSQL com JSONB oferece o melhor dos dois mundos — schema rígido para entidades core, campos flexíveis para metadados de destinos.

**Cache e Sessões**: Redis (Upstash)

Redis serve dois propósitos distintos: (1) store de sessões Auth.js para autenticação stateful, (2) cache de resultados de busca e dados de destinos (TTL configurável). Upstash foi escolhido por ser serverless-compatible com Vercel sem necessidade de gerenciar instância Redis separada.

**Autenticação**: Auth.js (NextAuth v5)

Self-hosted via Auth.js v5. Nenhum dado de usuário sai da nossa infraestrutura para um serviço terceiro (Clerk, Auth0). Suporte nativo a OAuth providers (Google, Apple) e email/password. Crítico para conformidade GDPR — sabemos exatamente onde os dados vivem.

**ORM**: Prisma 7

Com Prisma 7 (pure TypeScript, sem Rust binary), o diferencial de cold start entre Prisma e Drizzle foi eliminado. Prisma é escolhido pelo workflow de migrations mais seguro para equipes (schema declarativo + geração automática de SQL), melhor DX para novos membros, e ecossistema mais maduro de ferramentas.

**Mapas**: Mapbox GL JS

Mais econômico que Google Maps para o volume de MVP. Customizável visualmente (identidade do produto). Suporta vector tiles, clustering de pontos de interesse, e rotas interativas — funcionalidades centrais para um planejador de viagens.

**Styling**: Tailwind CSS 4 + shadcn/ui

shadcn/ui provê componentes acessíveis (WCAG 2.1 AA via Radix primitives) sem vendor lock-in — o código dos componentes vive no nosso repositório. Tailwind 4 elimina configuração de purge e tem melhor performance de build.

### Rationale

| Decisão | Alternativa Rejeitada | Motivo da Rejeição |
|---|---|---|
| Next.js 15 (monolito) | Microserviços separados | Premature complexity — equipe de 2 devs não justifica overhead operacional |
| Next.js 15 (monolito) | Remix | Next.js tem ecossistema maior, mais exemplos de travel/booking em produção |
| Prisma 7 | Drizzle ORM | Prisma 7 eliminou a desvantagem de cold start; migrations mais seguras para equipe |
| Auth.js v5 | Clerk | Clerk armazena dados de usuário em servidores terceiros — risco GDPR |
| Auth.js v5 | Supabase Auth | Dependência de plataforma; Supabase Auth acopla DB + Auth desnecessariamente |
| PostgreSQL | MongoDB | Travel data é relacional por natureza; joins e ACID são necessários |
| Mapbox | Google Maps | Google Maps ~3x mais caro em scale; customização limitada de estilo |
| Mapbox | Leaflet + OSM | Leaflet requer infraestrutura própria de tiles ou dependência de OSM gratuito sem SLA |
| Vitest | Jest | Vitest é significativamente mais rápido (nativo Vite); API compatível com Jest |
| Playwright | Cypress | Playwright suporta múltiplos browsers; melhor CI performance; sem limitações de HTTP |

### Consequences

**Positive**:
- Stack simples: um repositório, um deploy, um processo de build
- TypeScript end-to-end elimina classes inteiras de bugs de integração
- Auth.js self-hosted mantém dados de usuário sob nosso controle (GDPR compliance)
- Prisma migrations são seguras e auditáveis em code review
- Mapbox customizável para experiência visual diferenciada

**Negative / Trade-offs**:
- Next.js Server Actions introduzem acoplamento entre UI e lógica de servidor — mitigação: extrair business logic em service modules independentes
- Monolito requer disciplina de separação de camadas para não virar big ball of mud — mitigação: folder structure por feature, não por camada técnica
- Prisma bundle (~500kb) maior que Drizzle (~7kb) — mitigação: irrelevante em Vercel serverless onde o bundle é pré-compilado

**Risks**:
- Vercel lock-in para hosting: mitigado com Docker containerization que permite migração para qualquer plataforma
- Upstash Redis free tier tem limites: monitorar e provisionar paid tier antes do MVP público

---

## ADR-002: Monolithic vs. Microservices Architecture

**Date**: 2026-02-23
**Status**: Accepted
**Deciders**: architect

### Context

O projeto está no estágio greenfield MVP. A equipe tem dois desenvolvedores full-stack. Há pressão para entregar valor rapidamente. O domínio de travel planning ainda está sendo validado com usuários reais.

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| Monolito modular (Next.js) | Simples de deployar, sem latência de rede entre serviços, fácil refactor | Escalabilidade horizontal requer escalar o todo; acoplamento se não houver disciplina |
| Microserviços (auth, search, booking, itinerary) | Escalabilidade independente por serviço, isolamento de falhas | Overhead operacional enorme, latência de rede, distributed tracing obrigatório, não justificável com 2 devs |
| Monolito + BFF pattern | Frontends desacoplados do backend | Complexidade extra sem benefício real com uma única UI |

### Decision

Monolito modular com separação clara de camadas via pasta `src/`. Serviços são módulos TypeScript com interfaces bem definidas — podem ser extraídos para microsserviços no futuro sem reescrita.

### Consequences

**Positive**: Deploys simples, sem overhead de orquestração, desenvolvimento ágil.
**Negative / Trade-offs**: Requer disciplina de módulos — business logic nunca diretamente nos Server Components/Route Handlers.
**Risks**: Se a equipe crescer para 10+ devs, a fronteira de módulos precisará ser revisitada.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React Client Components + TanStack Query + Mapbox GL JS         │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────────┐
│                   NEXT.JS APPLICATION (Vercel)                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  App Router — React Server Components (RSC)              │    │
│  │  /app/(public)/          /app/(auth)/      /app/api/v1/  │    │
│  │  destinations, search    itineraries,      REST endpoints │    │
│  │                          bookmarks, trips  (webhooks etc) │    │
│  └───────────────────────────┬─────────────────────────────┘    │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────┐     │
│  │  Service Layer (src/server/services/)                    │     │
│  │  TripService  ItineraryService  DestinationService       │     │
│  │  UserService  SearchService     BookmarkService          │     │
│  └────────────────────────────┬───────────────────────────┘     │
│                                │                                  │
│  ┌─────────────────────────────▼──────────────────────────┐     │
│  │  Data Access Layer (src/server/db/)                      │     │
│  │  Prisma Client — typed queries, transactions             │     │
│  └────────────┬─────────────────────────────┬─────────────┘     │
└───────────────┼─────────────────────────────┼───────────────────┘
                │                              │
┌───────────────▼──────────┐   ┌──────────────▼────────────────┐
│  PostgreSQL 16            │   │  Redis (Upstash)               │
│  (Railway / Render)       │   │  - Session store (Auth.js)     │
│  - Users                  │   │  - Search result cache         │
│  - Trips / Itineraries    │   │  - Rate limit counters         │
│  - Destinations           │   │  TTL: configurable per key     │
│  - Bookmarks              │   └───────────────────────────────┘
│  - Activities             │
└──────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                                  │
│                                                                     │
│  Mapbox GL JS / API     Sentry        OpenTelemetry collector       │
│  (maps, geocoding)      (errors)      (distributed traces)          │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
Browser Request
    │
    ├─► Static asset (CDN)  →  Vercel Edge Cache  →  Response (0ms)
    │
    ├─► Page request        →  Next.js RSC         →  Server Component renders
    │                          Middleware (auth check)
    │                          Service Layer
    │                          Prisma / Redis
    │                          →  Streamed HTML + hydration
    │
    └─► Mutation (form)     →  Server Action       →  Validated input
                                Service Layer
                                Prisma transaction
                                Redis cache invalidation
                                →  Redirect / revalidatePath
```

### Folder Structure

```
travel-planner/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (html, fonts)
│   │   ├── globals.css               # Tailwind base + CSS variables
│   │   ├── [locale]/                 # i18n dynamic segment (next-intl)
│   │   │   ├── layout.tsx            # Locale layout (providers, i18n messages)
│   │   │   ├── page.tsx              # Landing page (Header + Hero + Footer)
│   │   │   ├── auth/                 # Auth pages (login, register) — own layout
│   │   │   │   ├── layout.tsx        # Centered card layout (no navbar)
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── verify-email/page.tsx
│   │   │   │   └── error/page.tsx
│   │   │   └── (app)/               # Route group — authenticated (ADR-006)
│   │   │       ├── layout.tsx        # AppShell: AuthenticatedNavbar + skip-to-content
│   │   │       ├── trips/
│   │   │       │   ├── page.tsx      # Trip dashboard
│   │   │       │   └── [id]/
│   │   │       │       ├── page.tsx          # Trip detail
│   │   │       │       ├── itinerary/page.tsx
│   │   │       │       ├── checklist/page.tsx
│   │   │       │       └── generate/page.tsx
│   │   │       ├── onboarding/page.tsx
│   │   │       ├── dashboard/page.tsx  # Redirect to /trips
│   │   │       └── account/page.tsx    # User profile (future)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js handler
│   │   │   └── v1/                   # REST API (webhooks, external integrations)
│   │   │       └── health/route.ts   # GET /api/v1/health
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (Button, Input, Card...)
│   │   ├── layout/                   # Header, Footer, Sidebar, Nav
│   │   └── features/                 # Feature-specific components
│   │       ├── trips/                # TripCard, TripForm, TripMap...
│   │       ├── destinations/         # DestinationCard, DestinationHero...
│   │       ├── itinerary/            # DayPlanner, ActivityItem, Timeline...
│   │       ├── search/               # SearchBar, FilterPanel, ResultsList...
│   │       └── maps/                 # MapView, MapMarker, RouteOverlay...
│   │
│   ├── server/                       # Server-only code (never imported by client)
│   │   ├── db/
│   │   │   ├── client.ts             # Prisma client singleton
│   │   │   └── index.ts              # Re-exports for convenient imports
│   │   ├── services/                 # Business logic (no HTTP/framework deps)
│   │   │   ├── trip.service.ts
│   │   │   ├── itinerary.service.ts
│   │   │   ├── destination.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── bookmark.service.ts
│   │   │   └── user.service.ts
│   │   ├── actions/                  # Next.js Server Actions
│   │   │   ├── trip.actions.ts
│   │   │   ├── itinerary.actions.ts
│   │   │   └── auth.actions.ts
│   │   └── cache/
│   │       ├── redis.ts              # Redis client (Upstash)
│   │       └── keys.ts               # Cache key constants
│   │
│   ├── lib/                          # Shared utilities (isomorphic — safe for client and server)
│   │   ├── auth.ts                   # Auth.js config
│   │   ├── validations/              # Zod schemas (shared between client and server)
│   │   │   ├── trip.schema.ts
│   │   │   ├── itinerary.schema.ts
│   │   │   └── user.schema.ts
│   │   ├── utils.ts                  # Pure utility functions
│   │   ├── constants.ts              # App-wide constants
│   │   └── errors.ts                 # Error classes (AppError, NotFoundError, etc.)
│   │
│   ├── hooks/                        # React custom hooks (client-side)
│   │   ├── use-trip.ts
│   │   ├── use-search.ts
│   │   └── use-map.ts
│   │
│   └── types/                        # TypeScript type definitions
│       ├── trip.types.ts
│       ├── destination.types.ts
│       └── auth.types.ts
│
├── prisma/
│   ├── schema.prisma                 # Database schema (source of truth)
│   └── migrations/                   # Auto-generated SQL migrations
│
├── public/                           # Static assets
│   ├── images/
│   └── icons/
│
├── tests/
│   ├── unit/                         # Vitest unit tests (mirror src/ structure)
│   ├── integration/                  # Vitest integration tests (DB, cache)
│   └── e2e/                          # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── trip-creation.spec.ts
│       └── search.spec.ts
│
├── docs/                             # Team documentation
│   ├── architecture.md               # This file
│   ├── api.md                        # API contracts
│   ├── tasks.md                      # Backlog
│   └── ...
│
├── .env.example                      # Template — never commit .env
├── .env.local                        # Local development — gitignored
├── docker-compose.yml                # Local dev: PostgreSQL + Redis
├── Dockerfile                        # Production container
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

### Key Architectural Boundaries

```
┌────────────────────────────────────────────────────────────────┐
│  RULE: The following boundaries are ENFORCED and non-negotiable  │
│                                                                  │
│  src/server/  →  NEVER imported by src/components/ or           │
│                  src/hooks/ (server-only, use "server-only" pkg) │
│                                                                  │
│  src/app/     →  Route handlers and Server Components ONLY       │
│                  Business logic lives in src/server/services/    │
│                                                                  │
│  Prisma client  →  ONLY accessed via src/server/db/client.ts    │
│                    Never instantiated directly in services        │
│                                                                  │
│  Environment vars  →  ONLY via validated config module           │
│                       Never via process.env directly in app code │
└────────────────────────────────────────────────────────────────┘
```

---

## API Design Principles

### Versioning

All API routes are versioned under `/api/v1/`. No version in route = Server Action (internal, not a public contract).

### REST Conventions

```
GET    /api/v1/trips              →  List (paginated)
POST   /api/v1/trips              →  Create
GET    /api/v1/trips/:id          →  Get by ID
PATCH  /api/v1/trips/:id          →  Partial update
DELETE /api/v1/trips/:id          →  Soft delete (set deleted_at)
GET    /api/v1/trips/:id/itinerary  →  Nested resource
```

**No** `PUT` — use `PATCH` for partial updates. `PUT` is reserved for complete replacement and is rarely the right choice.

### Error Response Shape

Every API error response MUST use this exact shape:

```json
{
  "error": {
    "code": "TRIP_NOT_FOUND",
    "message": "Trip with id 'trip_abc123' not found",
    "status": 404,
    "timestamp": "2026-02-23T12:00:00.000Z",
    "requestId": "req_xyz"
  }
}
```

- `code`: machine-readable string constant (SCREAMING_SNAKE_CASE) — used by clients for error handling logic
- `message`: human-readable, safe for display — must NEVER include stack traces, SQL, or internal details
- `status`: mirrors HTTP status code
- `timestamp`: ISO-8601 UTC
- `requestId`: trace ID for log correlation (set by middleware)

### HTTP Status Code Conventions

| Status | When to use |
|---|---|
| 200 | Successful read or update |
| 201 | Successful creation (include `Location` header) |
| 204 | Successful deletion (no body) |
| 400 | Client validation error (malformed request) |
| 401 | Not authenticated (no session) |
| 403 | Authenticated but not authorized (wrong user) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, already exists) |
| 422 | Validation failed (well-formed but semantically invalid) |
| 429 | Rate limit exceeded |
| 500 | Internal server error (never expose details) |

### Authentication

All authenticated endpoints receive the user session via Auth.js `auth()` function. Request handlers must validate the session before ANY database access:

```typescript
// src/app/api/v1/trips/route.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required", status: 401 } },
      { status: 401 }
    );
  }
  // ... proceed
}
```

### Pagination

All list endpoints must be paginated. Standard shape:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

Default page size: `20`. Maximum page size: `100`.

### Rate Limiting

All public API endpoints: 60 requests/minute per IP.
All authenticated endpoints: 120 requests/minute per user.
Search endpoint: 30 requests/minute per user (external API cost control).

Rate limit headers must be included in every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1708689600
```

---

## Data Flow

### Write Path (Trip Creation)

```
User submits form (Client Component)
    │
    ▼
Server Action: createTrip(formData)  [src/server/actions/trip.actions.ts]
    │
    ├── Validate with Zod schema (TripCreateSchema)
    │       → if invalid: throw ZodError (caught by action wrapper, returned to form)
    │
    ├── Auth check: session = await auth()
    │       → if no session: throw UnauthorizedError
    │
    ├── TripService.createTrip(userId, validatedData)  [src/server/services/trip.service.ts]
    │       → Business rules (max trips per user, name uniqueness, date validation)
    │       → Prisma: db.trip.create({ data: { ...validatedData, userId } })
    │       → Returns created Trip entity
    │
    ├── Redis: invalidate user's trip list cache
    │       → await cache.del(CacheKeys.userTrips(userId))
    │
    └── revalidatePath("/trips")  →  Next.js cache invalidation
        redirect("/trips/[newTripId]")
```

### Read Path (Search with Caching)

```
User searches destinations
    │
    ▼
SearchService.search(query, filters)  [src/server/services/search.service.ts]
    │
    ├── Build cache key: CacheKeys.search(query, filters)
    │
    ├── Redis GET cache key
    │   ├── HIT:  return cached results (TTL: 5 minutes for search)
    │   └── MISS:
    │       ├── Prisma: full-text search on destinations table
    │       │   SELECT ... WHERE to_tsvector('english', name || ' ' || description)
    │       │               @@ plainto_tsquery($1)
    │       ├── Redis SET results (TTL: 300s)
    │       └── return results
    │
    └── Server Component renders ResultsList
```

---

## Core Data Model (Initial Schema)

This is the foundational schema for MVP. Full Prisma schema lives in `prisma/schema.prisma`.

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    User      │       │     Trip     │       │  ItineraryDay    │
│──────────────│       │──────────────│       │──────────────────│
│ id (cuid2)   │ 1───* │ id           │ 1───* │ id               │
│ email        │       │ userId (FK)  │       │ tripId (FK)      │
│ name         │       │ title        │       │ dayNumber        │
│ avatarUrl    │       │ description  │       │ date             │
│ emailVerified│       │ startDate    │       │ notes            │
│ createdAt    │       │ endDate      │       │ createdAt        │
│ updatedAt    │       │ coverImageUrl│       └──────────┬───────┘
│ deletedAt    │       │ status       │                  │ 1
└──────────────┘       │ visibility   │                  │
                       │ createdAt    │                  *
                       │ updatedAt    │       ┌──────────────────┐
                       │ deletedAt    │       │    Activity      │
                       └──────────────┘       │──────────────────│
                                              │ id               │
┌──────────────────┐                         │ dayId (FK)       │
│  Destination     │                         │ destinationId(FK)│
│──────────────────│                         │ title            │
│ id               │ *───1                   │ notes            │
│ name             │       ┌──────────────┐  │ startTime        │
│ slug (unique)    │       │   Bookmark   │  │ endTime          │
│ country          │       │──────────────│  │ orderIndex       │
│ region           │       │ id           │  │ activityType     │
│ latitude         │       │ userId (FK)  │  │ createdAt        │
│ longitude        │       │ destinationId│  └──────────────────┘
│ description      │       │ createdAt    │
│ imageUrl         │       └──────────────┘
│ tags (String[])  │
│ metadata (JSONB) │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

**ID Strategy**: CUID2 (`@paralleldrive/cuid2`) for all primary keys. UUIDs are an acceptable alternative, but CUID2 is shorter, URL-safe, monotonic (better index performance), and collision-resistant.

**Soft Deletes**: All user-owned entities (User, Trip) use `deletedAt` nullable timestamp instead of hard DELETE. This supports GDPR right-to-erasure workflow (mark deleted, purge in batch job) and accidental deletion recovery.

**Timestamps**: All tables have `createdAt` and `updatedAt` managed by Prisma (`@default(now())` and `@updatedAt`). Always UTC.

---

## Architectural Risks and Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Monolith grows into unstructured code (big ball of mud) | High | Medium | Enforced folder boundaries, `server-only` package, weekly architecture review |
| Vercel vendor lock-in | Medium | Low | Dockerfile maintained from day 1; app designed as 12-factor, runs on any Node.js host |
| Mapbox API cost overrun at scale | Medium | Medium | Cache geocoding results in Redis (TTL 24h); implement server-side proxying to hide API key; rate limit search endpoint |
| Upstash Redis free tier limits hit | Medium | High | Instrument Redis command counts from day 1; provision paid tier at 70% capacity threshold |
| Auth.js session complexity with RSC | Medium | Medium | Use `auth()` helper consistently; document session access pattern for all team members |
| PII data exposure via logs | High | Medium | Implement log scrubbing middleware; never log request bodies for auth/user routes; use structured logging with field allowlists |
| Missing database indexes causing slow queries at scale | High | Medium | Add indexes for all foreign keys and search fields in initial migration; query plan review before each release |
| Prisma N+1 queries | Medium | High | Enforce `.include` / `.select` discipline; add Prisma query logging in development; document query patterns |
| No rate limiting at MVP → abuse | High | High | Implement rate limiting middleware from day 1 using Redis counters (not just Vercel edge) |
| Secrets exposed in client bundle | Critical | Medium | Use `server-only` package on all server modules; CI check for NEXT_PUBLIC_ prefix on sensitive env vars |
| GDPR compliance gap — no deletion pipeline | High | Medium | `deletedAt` soft delete from day 1; automated purge job in Phase 2; document data retention policy before first user |

---

## What the Team Must Know Before Writing Code

### 1. TypeScript is Non-Negotiable

No `any` type. No `@ts-ignore` without a documented reason. TypeScript errors in CI will block merges. The compiler is your first line of defense.

### 2. The `server/` Directory is Server-Only

Files in `src/server/` MUST import `"server-only"` at the top. This causes a build error if any client component accidentally imports server code. Never import Prisma or Redis in components — always go through services and Server Actions.

```typescript
// src/server/services/trip.service.ts
import "server-only";
// ... rest of the file
```

### 3. All Environment Variables are Validated at Startup

Create `src/lib/env.ts` using `@t3-oss/env-nextjs`. If a required env var is missing, the application fails to start — never silently at runtime.

```typescript
// src/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    MAPBOX_SECRET_TOKEN: z.string().startsWith("sk."),
  },
  client: {
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().startsWith("pk."),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
```

### 4. Error Handling Pattern

All service methods throw typed errors. Route handlers and Server Actions catch and map them to HTTP responses. Never let raw Prisma errors reach the client.

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", `${resource} with id '${id}' not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("UNAUTHORIZED", "Authentication required", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("FORBIDDEN", "You do not have permission to access this resource", 403);
  }
}
```

### 5. Database Access Pattern

Prisma client is a singleton. Never instantiate it outside `src/server/db/client.ts`.

```typescript
// src/server/db/client.ts
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

### 6. Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files | kebab-case | `trip-card.tsx`, `trip.service.ts` |
| React components | PascalCase | `TripCard`, `SearchBar` |
| Functions / variables | camelCase | `createTrip`, `userId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_TRIPS_PER_USER` |
| Zod schemas | PascalCase + Schema suffix | `TripCreateSchema` |
| Database tables | snake_case (Prisma maps) | `itinerary_days` |
| API error codes | SCREAMING_SNAKE_CASE | `TRIP_NOT_FOUND` |
| Cache keys | Namespaced function | `CacheKeys.userTrips(userId)` |
| Git branches | kebab-case with prefix | `feat/trip-creation`, `fix/search-cache` |
| Commits | Conventional Commits | `feat: add trip creation form` |

### 7. Testing Requirements

Every PR must include tests. No exceptions.

- **Unit tests** (`tests/unit/`): Service layer functions, utility functions, Zod schemas. Mock Prisma using `vitest-mock-extended` or `jest-mock-extended`. Coverage target: ≥80%.
- **Integration tests** (`tests/integration/`): Service + database (use a real test database via Docker). Prisma transactions rolled back after each test.
- **E2E tests** (`tests/e2e/`): Critical user paths with Playwright. Minimum: auth flow, trip creation, search.

Run before every PR:
```bash
npm run test        # unit + integration
npm run test:e2e    # playwright (requires running app)
npm run lint        # ESLint + TypeScript
```

### 8. Security Checklist (Mandatory Before Every PR)

- [ ] No credentials, tokens, or secrets hardcoded anywhere
- [ ] All user inputs validated via Zod schemas before use
- [ ] Authorization checked BEFORE data access (not after)
- [ ] No PII in log statements, error messages, or API responses beyond necessity
- [ ] External API calls have timeout and error handling
- [ ] SQL queries go through Prisma (no raw SQL without explicit review)

### 9. Soft Delete Policy

Never use `DELETE` for user-owned data. Set `deletedAt = now()`. Prisma queries must always include `where: { deletedAt: null }` filters for active records. Use a Prisma middleware or extension to enforce this globally.

### 10. Local Development Setup

```bash
# 1. Start local services
docker compose up -d          # starts PostgreSQL + Redis

# 2. Setup environment
cp .env.example .env.local
# fill in .env.local values

# 3. Run migrations
npx prisma migrate dev

# 4. Seed database
npx prisma db seed

# 5. Start dev server
npm run dev
```

Docker Compose services:
- PostgreSQL: `localhost:5432`, database: `travel_planner_dev`
- Redis: `localhost:6379`

---

## Open Questions

- [ ] **Payment integration (Phase 2+)**: Will we integrate a booking/payment API? If yes, this changes the security architecture significantly (PCI-DSS scope). The security-specialist must be consulted before any payment feature is specced. Likely candidate: Stripe for payments; GDS/NDC for actual booking fulfillment.
- [ ] **Mobile application**: Is a native mobile app planned? If yes, the API design must shift toward a formal BFF (Backend for Frontend) pattern with a dedicated mobile API contract. Currently scoped as responsive web only.
- [ ] **Multi-tenancy / B2B**: Will travel agents manage multiple client profiles? If yes, the data model needs a `workspace` or `organization` layer above `User`. This is a significant schema change — must be decided before first migration is run.
- [ ] **Offline support / PWA**: Progressive Web App with offline itinerary access? If yes, requires Service Worker strategy and local storage model. Deferred to post-MVP.
- [ ] **Content management**: Who manages destination content (descriptions, images)? Is there a CMS integration needed (Contentful, Sanity)? Or is destination data seeded/imported from a third-party dataset?
- [ ] **Email notifications**: Transactional email for trip reminders, booking confirmations? If yes, choose a provider (Resend, SendGrid) and the data-engineer must design the notification event schema.
- [ ] **Analytics platform**: Where does event tracking data land? BigQuery, Mixpanel, PostHog? This affects the data-engineer's pipeline design. PostHog self-hosted is a strong candidate for GDPR compliance.

---

### ADR-003: Claude AI Integration via Anthropic SDK
**Date**: 2026-02-26
**Status**: Accepted

**Context**: The app requires AI-generated travel itineraries and checklists.

**Decision**: Use the Anthropic SDK directly with `claude-sonnet-4-6` for itinerary generation and `claude-haiku-4-5-20251001` for checklist generation.

**Implementation details**:
- Models: `claude-sonnet-4-6` (itinerary), `claude-haiku-4-5-20251001` (checklist)
- Timeout: 55 seconds via `AbortSignal.timeout`
- Cache: MD5-keyed Redis, 24h TTL, budget bucketing (nearest 500)
- Response: JSON-only prompt + Zod validation before persist
- Error codes: AI_TIMEOUT (504), AI_PARSE_ERROR (502), AI_SCHEMA_ERROR (502)

**Consequences**: Vendor lock-in to Anthropic. Rate limits apply. Cost is variable based on usage.

---

### ADR-004: next-intl for Internationalization
**Date**: 2026-02-26
**Status**: Accepted

**Context**: The app must support multiple locales (pt-BR and en).

**Decision**: Use `next-intl` over `react-i18next` for native Next.js App Router support with server components.

**Implementation details**:
- Locales: `pt-BR` (default), `en`
- Routing: `[locale]` dynamic segment in App Router
- Middleware: next-intl middleware wraps Auth.js middleware
- Messages: JSON files in `messages/` directory

**Consequences**: App Router-native, no client bundle overhead for server components. Migration cost if switching later.

---

### ADR-005: Auth.js JWT Session Strategy
**Date**: 2026-02-26
**Status**: Accepted (revised 2026-03-04)

**Context**: ADR-001 specified Redis-backed JWT sessions. The initial implementation documented here incorrectly stated database sessions were required by `@auth/prisma-adapter`. In reality, PrismaAdapter persists User and Account records but does not require database-backed sessions — `strategy: "jwt"` is used (see `src/lib/auth.ts:25`).

**Decision**: Use JWT session strategy (`session: { strategy: "jwt" }`) with PrismaAdapter.

**How it works**:
- PrismaAdapter persists User and Account records to PostgreSQL
- Sessions are stateless JWT tokens stored in a signed cookie
- No DB round-trip for session validation in middleware (Edge-compatible)
- The `jwt` and `session` callbacks in `auth.config.ts` enrich the token with `user.id`

**Trade-offs**:
- Sessions cannot be individually revoked (no server-side session store)
- Benefit: No +1 DB read per authenticated request — faster, Edge-compatible
- Benefit: Horizontally scalable without shared session store

**Future**: If session revocation becomes a requirement, a Redis-backed deny-list can be layered on top of JWT validation.

---

### ADR-006: Route Group (app) para Layout Autenticado
**Date**: 2026-03-01
**Status**: Accepted
**Deciders**: architect

### Context

As rotas autenticadas (`/trips`, `/onboarding`, `/account`, `/dashboard`) precisam de um layout compartilhado com navbar persistente. Atualmente, cada pagina renderiza seu conteudo diretamente sob `[locale]/layout.tsx`, sem navbar. Tres opcoes foram avaliadas:

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| Route group `(app)` com layout proprio | Navbar injetada automaticamente em todas as rotas filhas; separacao clara de zonas publica/auth; nao afeta URLs | Requer mover arquivos para nova pasta |
| Layout condicional no `[locale]/layout.tsx` | Sem mover arquivos | Layout fica complexo (if autenticado / if publica / if auth); viola Single Responsibility |
| Wrapper component em cada pagina | Sem mudanca de estrutura | Duplicacao; facil esquecer; viola DRY |

### Decision

Route group `(app)` com layout dedicado (`src/app/[locale]/(app)/layout.tsx`). O layout chama `auth()` server-side e renderiza `AuthenticatedNavbar` com dados de sessao. Parenteses no nome `(app)` sao convencao do Next.js App Router -- nao afetam a URL.

### Consequences

**Positive**: Layout limpo, navbar automatica em todas as rotas autenticadas, separacao clara entre zona publica e autenticada.
**Negative / Trade-offs**: Requer mover 6 arquivos para novo diretorio. Imports com `@/` nao mudam. Middleware checa path segments (`/trips`), nao pastas internas.
**Risks**: Git rename tracking — usar `git mv` para preservar historico.

---

### ADR-007: LanguageSwitcher Compartilhado entre Header e Navbar
**Date**: 2026-03-01
**Status**: Accepted
**Deciders**: architect

### Context

O componente `LanguageSwitcher` esta em `src/components/landing/` mas precisa ser reutilizado na AuthenticatedNavbar (zona autenticada) e no Header (zona publica).

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| Mover para `components/layout/` | Reutilizavel; single source of truth | Requer atualizar imports existentes |
| Copiar o componente | Sem mudanca de imports existentes | Viola DRY; risco de divergencia visual |
| Re-export via barrel file | Sem mover fisicamente | Indirection desnecessaria |

### Decision

Mover `LanguageSwitcher.tsx` de `components/landing/` para `components/layout/`. Atualizar o import no `Header.tsx`.

### Consequences

**Positive**: Componente reutilizavel sem duplicacao.
**Negative / Trade-offs**: Uma unica mudanca de import no `Header.tsx`.
**Risks**: Nenhum risco significativo.

---

### ADR-028: AI Timeout Strategy for Vercel Hobby

**Status**: Accepted
**Date**: 2026-04-09
**Deciders**: architect, tech-lead, product-owner
**Related specs**: SPEC-ARCH-AI-PROGRESS (Analysis 1), SPEC-PROD-AI-PROGRESS

**Context**:
The Travel Planner is deployed on Vercel Hobby during the beta. Hobby
serverless functions have a hard 60-second execution ceiling — any request
longer than that is terminated by the platform with `FUNCTION_INVOCATION_TIMEOUT`
before our own code can run its error handlers or mid-stream recovery path.

Prior configuration:
- `maxDuration = 120` on both the `/api/ai/plan/stream` route and on the
  Phase 5/6 page segments (leftover from a Vercel Pro assumption).
- Provider timeouts of `90_000 ms` in both `ClaudeProvider` and
  `GeminiProvider`.
- `MAX_PLAN_TOKENS = 16_000` in the streaming route.

In practice, Gemini 2.0 Flash routinely needed 45-90s to stream the larger
itinerary plans, and the 60s platform cut killed the request mid-stream
before the server-side recovery fallback (`getProvider().generateResponse`)
could produce a persisted result. The client observed an opaque
`failed to pipe response` error and the itinerary was lost.

**Decision**:

1. **Route/page `maxDuration = 60`** across all AI entry points
   (`/api/ai/plan/stream`, `phase-5/page.tsx`, `phase-6/page.tsx`). The
   constant is commented to document the Hobby limit and the upgrade path
   to Pro.

2. **Provider timeouts strictly below 60s** with headroom for the recovery
   and persistence steps:
   - `CLAUDE_TIMEOUT_MS = 20_000`
   - `GEMINI_TIMEOUT_MS = 35_000`

   Claude's timeout is lower because Sonnet reliably finishes plan
   generation in <15s and we want fast failure so the FallbackProvider
   can retry on Gemini within the 60s window if needed.

3. **Streaming token budget clamp**: `MAX_PLAN_TOKENS` in the stream route
   is reduced from `16_000` to `8_000`. The larger budget is retained for
   non-streaming paths (where retry-with-doubling still has time to
   succeed), but on the streaming path 8K tokens is the empirically safe
   ceiling for completion inside 60s.

4. **Per-type provider overrides** via `AI_PROVIDER_PLAN`,
   `AI_PROVIDER_GUIDE`, `AI_PROVIDER_CHECKLIST`. The `getProvider(type)`
   factory consults these before falling back to the global `AI_PROVIDER`.
   This unblocks the product decision to gate Claude to Phases 5 & 6
   during beta while keeping other phases on Gemini (cost ceiling: $50/mo
   up to 500 active users or Vercel Pro upgrade).

5. **Mid-stream recovery path is preserved**. The `controller.start()`
   catch-block in `/api/ai/plan/stream` still attempts a non-streaming
   recovery against the (possibly-fallback) provider chain when the
   primary stream fails part-way. With the tightened timeouts above, the
   recovery now has real runway to complete.

**Alternatives considered**:

- **Upgrade to Vercel Pro immediately** (`maxDuration = 300`). Rejected
  until beta completes — not a technical blocker, just cost discipline.
- **Skip streaming entirely and use synchronous generation**. Rejected —
  degrades UX significantly for 6+ day itineraries where users value the
  live day-by-day progress.
- **Split the plan into per-day function calls**. Rejected as premature
  architecture: possible future optimization but too invasive for a
  staging fix.

**Consequences**:

**Positive**:
- No more platform-level timeouts on the streaming path — the server
  always returns a structured result (success, parse_failed, or
  stream_failed) to the client.
- Product can beta-gate Claude to expensive phases only without code
  changes in each call site.
- Recovery fallback has predictable runway (60 − 35 = 25s minimum).

**Negative / Trade-offs**:
- Very long itineraries (>10 days with heavy personalization) may still
  hit the 8K token ceiling and require a retry. Acceptable during beta.
- Two sources of truth for `MAX_PLAN_TOKENS` (ai.service.ts uses 16K,
  stream route uses 8K). Documented via code comments; consolidation
  is tracked as follow-up tech debt.

**Risks**:
- Claude's 20s timeout is aggressive. If Anthropic's median latency
  regresses, we may see elevated 504s and increased fallback activation.
  Mitigation: monitor `ai.provider.claude.error` in Sentry and
  `ai.fallback.activated` in logs during rollout.

**Environment variables (set manually in Vercel staging)**:
```
AI_PROVIDER=gemini
AI_FALLBACK_PROVIDER=anthropic
AI_PROVIDER_PLAN=anthropic     # Phase 6 — itinerary
AI_PROVIDER_GUIDE=anthropic    # Phase 5 — destination guide
```

**Upgrade path to Vercel Pro** (reversal trigger: cost > $50/mo or >500
active users): bump `maxDuration` back to 300 on all three entry points,
restore `MAX_PLAN_TOKENS = 16_000`, relax provider timeouts to
`90_000 ms`. Leave the per-type provider override in place; it's a good
abstraction regardless of platform.

---

## Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-23 | architect | Initial architecture — ADR-001, ADR-002, system design, conventions |
| 1.1.0 | 2026-02-26 | architect | Added ADR-003 (Claude AI), ADR-004 (next-intl), ADR-005 (Auth.js database sessions) |
| 1.2.0 | 2026-03-01 | architect | Added ADR-006 (route group for authenticated layout), ADR-007 (shared LanguageSwitcher) |
| 1.3.0 | 2026-04-09 | tech-lead | Added ADR-028 (AI timeout strategy for Vercel Hobby — per-type provider override, tightened timeouts, streaming token clamp) |
