# Arquitetura AS-IS — Atlas Travel Planner

**Versao**: 1.0.0
**Data**: 2026-03-12
**Autor**: architect
**Baseline**: v0.22.0 (Sprint 29)

---

## 1. Visao Geral

O Atlas Travel Planner e um monolito modular Next.js 15 com App Router, operando como aplicacao full-stack. A arquitetura atual reflete 29 sprints de evolucao organica (Sprints 1-24) seguidos por 5 sprints com Spec-Driven Development (Sprints 25-29).

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  React Client Components + TanStack Query + Mapbox GL JS        │
│  Forms: React Hook Form + Zod (validacao client-side)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────────┐
│              NEXT.JS 15 APPLICATION (Vercel target)             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Middleware Layer (src/middleware.ts)                      │  │
│  │  Auth check + i18n routing + CSP nonce per request        │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  App Router — [locale]/(app)/ Route Group                 │  │
│  │                                                           │  │
│  │  Server Components (page.tsx):                            │  │
│  │    auth() → session → Prisma queries → serialized props   │  │
│  │                                                           │  │
│  │  Client Components (wizards, forms, interativos):         │  │
│  │    useForm + Zod → Server Action → revalidatePath         │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Server Actions (src/server/actions/)                     │  │
│  │  - Auth check (session validation)                        │  │
│  │  - Rate limiting (Redis Lua script)                       │  │
│  │  - Zod validation                                         │  │
│  │  - Delegate to Service Layer                              │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Service Layer (src/server/services/)                     │  │
│  │  - TripService          - ProfileService                  │  │
│  │  - TransportService     - AccommodationService            │  │
│  │  - ItineraryService     - ChecklistService                │  │
│  │  - AiService            - PreferencesService              │  │
│  │  - PointsEngine         - PhaseEngine                     │  │
│  │  - ExpeditionSummaryService                               │  │
│  │  - TripReadinessService - NextStepsEngine                 │  │
│  └───────────────────┬───────────────┬───────────────────────┘  │
│                       │               │                          │
│  ┌────────────────────▼──┐  ┌────────▼──────────────────────┐  │
│  │  Prisma Client        │  │  Redis (ioredis)              │  │
│  │  (src/server/db/)     │  │  (src/server/cache/)          │  │
│  │  Singleton pattern    │  │  Singleton + CacheKeys        │  │
│  └────────────┬──────────┘  └────────┬──────────────────────┘  │
└───────────────┼──────────────────────┼──────────────────────────┘
                │                      │
┌───────────────▼──────────┐  ┌───────▼───────────────────────┐
│  PostgreSQL 16           │  │  Redis 7                      │
│  (Docker local /         │  │  (Docker local /              │
│   Railway prod)          │  │   Upstash prod)               │
│                          │  │                               │
│  25+ tabelas Prisma      │  │  - Rate limit counters        │
│  22+ migrations          │  │  - Destination search cache   │
│  CUID2 PKs               │  │  - AI response cache (24h)   │
│  Soft deletes            │  │  - Session data               │
└──────────────────────────┘  └───────────────────────────────┘
```

---

## 2. Padroes de Aplicacao Atuais

### 2.1 Autenticacao e Autorizacao

```
Request
  │
  ▼
Middleware (src/middleware.ts)
  │── CSP nonce generation (crypto.randomUUID)
  │── next-intl routing
  │── Auth.js session check (Edge-compatible JWT)
  │── Protected routes: /trips, /expedition, /dashboard, /account, /onboarding
  │
  ▼
Page/Action
  │── auth() → session.user.id (server-side)
  │── BOLA check: userId in EVERY Prisma WHERE clause
  │── Auth check BEFORE data access (NEVER after)
```

- **Strategy**: JWT stateless (cookie-based, signed)
- **Adapter**: PrismaAdapter (persiste User + Account, NAO sessions)
- **Providers**: Credentials (email/password) + Google OAuth
- **Edge-compatible**: auth.config.ts separado para callbacks em middleware Edge
- **Session enrichment**: jwt callback adiciona user.id ao token

### 2.2 Server Components + Client Components

```
page.tsx (Server Component)
  │── auth() → session
  │── Prisma queries (dados do usuario)
  │── Serialize props (dates → ISO strings, encrypted → masked)
  │── Render Client Component com props
  │
  ▼
ClientWizard.tsx (Client Component)
  │── "use client"
  │── useForm + Zod schema
  │── Server Action via form submission
  │── revalidatePath on success
```

**Regra critica**: dados criptografados (bookingCodeEnc, passportNumberEnc) NUNCA sao passados como props para client components. Sao mascarados no server antes da serializacao.

### 2.3 Fluxo de Expedicao (8 Fases)

```
Dashboard → Phase1Wizard → Phase2Wizard → Phase3Wizard →
Phase4Wizard (steps: Transport → Accommodation → Mobility) →
Phase5Wizard (DestinationGuideWizard) →
Phase6Wizard (ItineraryEditor) →
ExpeditionSummary → Dashboard
```

- Cada fase e uma pagina server-rendered com wizard client-side
- Conclusao de fase chama `completePhaseAction` → PointsEngine → PhaseEngine
- Pontos concedidos via PointTransaction (audit trail)
- ExpeditionPhase.metadata armazena dados da fase como JSON

### 2.4 AI Provider Pattern

```
AiProvider (interface)
  │── generateResponse(prompt, options): Promise<string>
  │
  ├── ClaudeProvider (Anthropic SDK)
  │     │── claude-sonnet-4-6 (itinerario, guia)
  │     │── claude-haiku-4-5-20251001 (checklist)
  │     │── Timeout: 55s (AbortSignal)
  │     │── Streaming support (AI SDK)
  │
  └── [Future: GeminiProvider, OpenAIProvider]

AiService
  │── getProvider() factory
  │── Cache: MD5 key → Redis (24h TTL)
  │── Rate limit: 10 req/hr (itinerario), 5 req/hr (checklist)
```

### 2.5 Gamificacao

```
UserProgress (denormalized)
  │── totalPoints, level, rank
  │── Updated on every phase completion
  │
  ├── PointTransaction (audit trail)
  │     │── type: phase_completion, profile_field, welcome_bonus
  │     │── amount, description, metadata
  │
  └── UserBadge
        │── badge type: explorer, planner, etc.
        │── Awarded by PhaseEngine on criteria match
```

- **PointsEngine** (`src/lib/engines/points-engine.ts`): calcula pontos, registra transacoes
- **PhaseEngine** (`src/lib/engines/phase-engine.ts`): valida transicoes, concede badges
- **phase-config** (`src/lib/engines/phase-config.ts`): configuracao isomorfica (client + server)

### 2.6 Rate Limiting

```
checkRateLimit(key, limit, windowSec)
  │── Redis EVAL (Lua script atomico)
  │── Incrementa counter + seta TTL
  │── Retorna remaining / retryAfter
  │── Throw se excedido
```

| Endpoint | Limite | Janela |
|----------|--------|--------|
| generateTravelPlanAction | 10 | 1 hora |
| generateChecklistAction | 5 | 1 hora |
| registerAction | 5 | 15 minutos |
| loginAction | 10 | 15 minutos |

### 2.7 i18n

- **Library**: next-intl
- **Locales**: pt-BR (default), en
- **Routing**: `[locale]` segment no App Router
- **Middleware**: next-intl wraps auth middleware
- **Imports obrigatorios**: `src/i18n/navigation.ts` (Link, redirect, useRouter)
- **Messages**: JSON em `messages/{locale}.json`

### 2.8 Criptografia

- **Algoritmo**: AES-256-GCM (`src/lib/crypto.ts`)
- **Campos**: passportNumberEnc, bookingCodeEnc (TransportSegment, Accommodation)
- **Chave**: `ENCRYPTION_KEY` env var (hex 64 chars)
- **Funcoes**: `encrypt(plaintext)` → `iv:ciphertext:tag`, `decrypt(encrypted)` → plaintext

---

## 3. Estrutura de Diretorios (Atual)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (app)/                    # Rotas autenticadas (ADR-006)
│   │   │   ├── layout.tsx            # AppShell: AuthenticatedNavbar
│   │   │   ├── dashboard/
│   │   │   ├── expedition/[tripId]/  # Fases 1-6 + summary
│   │   │   ├── trips/
│   │   │   ├── account/
│   │   │   └── onboarding/
│   │   ├── auth/                     # Login, register, verify
│   │   └── page.tsx                  # Landing page
│   └── api/
│       ├── auth/[...nextauth]/
│       └── destinations/search/      # Proxy Nominatim
│
├── components/
│   ├── ui/                           # shadcn/ui (Button, Input, Card, etc.)
│   ├── layout/                       # Header, Footer, Navbar, Breadcrumb, LanguageSwitcher
│   └── features/
│       ├── expedition/               # Phase wizards, summary, progress bars
│       ├── itinerary/                # ItineraryEditor, DnD
│       ├── dashboard/                # Trip cards, stats
│       ├── profile/                  # ProfileAccordion, PreferencesSection
│       ├── auth/                     # LoginForm, RegisterForm, TrustSignals
│       ├── onboarding/               # OnboardingWizard
│       └── landing/                  # Hero, features section
│
├── server/                           # "server-only" enforced
│   ├── actions/                      # Server Actions (expedition, transport, profile, ai, auth)
│   ├── services/                     # Business logic (14+ services)
│   ├── db/client.ts                  # Prisma singleton
│   └── cache/                        # Redis singleton + CacheKeys
│
├── lib/                              # Isomorphic (client + server safe)
│   ├── engines/                      # PointsEngine, PhaseEngine, phase-config
│   ├── validations/                  # Zod schemas
│   ├── travel/                       # trip-classifier, checklist-rules
│   ├── crypto.ts                     # AES-256-GCM (server-only by convention)
│   ├── auth.ts                       # Auth.js config
│   ├── auth.config.ts                # Edge-safe callbacks
│   ├── env.ts                        # @t3-oss/env-nextjs
│   ├── errors.ts                     # AppError, NotFoundError, etc.
│   └── rate-limit.ts                 # Redis Lua rate limiter
│
├── hooks/                            # React hooks (use-*)
├── types/                            # TypeScript type definitions
├── i18n/                             # next-intl config + navigation exports
└── messages/                         # i18n JSON files (pt-BR, en)
```

---

## 4. Metricas de Escala Atual

| Metrica | Valor |
|---------|-------|
| Versao | v0.22.0 |
| Sprints completos | 29 |
| Testes passando | 1776+ |
| Suites de teste | 109+ |
| Specs formais (SDD) | 62+ |
| ADRs registrados | 26 (ADR-001 a ADR-026) |
| Agentes definidos | 13 |
| Tabelas Prisma | 25+ |
| Migrations | 22+ |
| Locales | 2 (pt-BR, en) |
| Services | 14+ |
| Server Actions | 10+ |

---

## 5. Dividas Tecnicas Conhecidas

### Prioridade Alta

| ID | Descricao | Risco |
|----|-----------|-------|
| DT-004 | `updateTrip` usa spread implicito — mass assignment risk | Seguranca |
| DT-S9-001 | `spendPoints` sem $transaction — race condition TOCTOU | Integridade de dados |

### Prioridade Media

| ID | Descricao | Risco |
|----|-----------|-------|
| RISK-010 | Headers de seguranca faltando em `/api/*` | Seguranca |
| SEC-S6-001 | Validacao Zod server-side para inputs de AI | Seguranca |
| BUG-S7-004 | Links de footer /terms, /privacy, /support → 404 | UX |

### Prioridade Baixa

| ID | Descricao | Risco |
|----|-----------|-------|
| BUG-S7-001 | Raw userId em logger.info (updateProfile) | PII exposure |
| BUG-S7-005 | "Traveler" hardcoded English fallback | i18n |
| BUG-S7-006 | aria-label="Loading" hardcoded English | i18n/a11y |

---

## 6. Integrações Externas

| Servico | Uso | Abstraction Layer | Exit Strategy |
|---------|-----|-------------------|---------------|
| Anthropic Claude | AI (roteiro, checklist, guia) | AiProvider interface | Trocar provider na factory |
| Nominatim (OSM) | Geocoding + autocomplete | API route proxy | Trocar para Mapbox/Google geocoding |
| Mapbox GL JS | Mapas interativos (atlas) | Dynamic import, isolado | Trocar para Leaflet/Google Maps |
| Vercel | Hosting frontend | 12-factor app + Docker | Migrar para qualquer Node.js host |
| Railway/Render | Hosting PostgreSQL | Prisma ORM (portavel) | Qualquer PostgreSQL host |
| Upstash/Redis | Cache + rate limiting | ioredis interface | Qualquer Redis host |

---

## 7. Processos Atuais

| Processo | Status | Documentacao |
|----------|--------|-------------|
| SDD (Spec-Driven Development) | Ativo (Sprint 25+) | `docs/specs/SDD-PROCESS.md` |
| Sprint Reviews (6 agentes) | Ativo | CLAUDE.md + `docs/sprint-reviews/` |
| Conventional Commits | Ativo | CLAUDE.md |
| Security Checklist per PR | Ativo | `docs/architecture.md` Secao 8 |
| FinOps Reporting | Ativo | `docs/finops/COST-LOG.md` |
| EDD (Eval-Driven Development) | Inexistente | — |

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | architect | Documentacao AS-IS inicial |
