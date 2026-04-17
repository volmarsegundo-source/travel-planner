# Auditoria Estatica de Seguranca e Observabilidade -- Pre-Beta

**Versao**: 0.22.0
**Data**: 2026-04-17
**Autor**: architect (chapeu duplo: architect + security-specialist)
**Tipo**: Analise estatica de codigo (sem pentest ao vivo)
**Escopo**: Codebase em `master` (commit `ad5501d`)
**Limitacoes**: Analise estatica apenas. Sem testes de penetracao, sem scan de runtime, sem acesso a logs de producao.

---

## 1. Protecao de Rotas

### 1.1 Middleware (`src/middleware.ts`)

O middleware aplica 3 camadas de protecao:

1. **Autenticacao**: Rotas contendo `/trips`, `/onboarding`, `/account`, `/dashboard`, `/expedition`, `/atlas`, `/meu-atlas`, `/admin` sao protegidas. Usuarios nao autenticados sao redirecionados para `/auth/login` com `callbackUrl`.
2. **Autorizacao admin**: Rotas `/admin` verificam `role === "admin"` no JWT. Non-admin redireciona para `/expeditions`.
3. **CSP nonce**: `crypto.randomUUID()` por request; headers de seguranca (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS em producao).

### 1.2 Layout Guard (`src/app/[locale]/(app)/layout.tsx`)

Server component que chama `auth()` e redireciona para `/auth/login` se `!session?.user`. Dupla protecao (middleware + layout).

### 1.3 Admin Layout (`src/app/[locale]/(app)/admin/layout.tsx`)

Tripla protecao: middleware (JWT role) + layout (DB role check via `db.user.findUnique`) + redirect para `/expeditions` se `role !== "admin"`.

### 1.4 Tabela de Rotas

| Rota | Autenticacao | Autorizacao | Redirect | Status |
|---|---|---|---|---|
| `/` (landing) | Nao requerida | -- | -- | OK |
| `/auth/login`, `/auth/register` | Nao requerida | -- | -- | OK |
| `/expeditions` | Middleware + Layout | user | `/auth/login` | OK |
| `/expedition/[tripId]` | Middleware + Layout | user | `/auth/login` | OK |
| `/expedition/[tripId]/phase-[1-6]` | Middleware + Layout | user | `/auth/login` | OK |
| `/expedition/[tripId]/summary` | Middleware + Layout | user | `/auth/login` | OK |
| `/expedition/[tripId]/report` | Middleware + Layout | user | `/auth/login` | OK |
| `/expedition/new` | Middleware + Layout | user | `/auth/login` | OK |
| `/account` | Middleware + Layout | user | `/auth/login` | OK |
| `/profile` | Middleware + Layout | user | `/auth/login` | OK |
| `/atlas` | Middleware + Layout | user | `/auth/login` | OK |
| `/meu-atlas` | Middleware + Layout | user | `/auth/login` | OK |
| `/onboarding` | Middleware + Layout | user | `/auth/login` | OK |
| `/trips/[id]` | Middleware + Layout | user | `/auth/login` | OK |
| `/trips/[id]/checklist` | Middleware + Layout | user | `/auth/login` | OK |
| `/trips/[id]/itinerary` | Middleware + Layout | user | `/auth/login` | OK |
| `/trips/[id]/generate` | Middleware + Layout | user | `/auth/login` | OK |
| `/dashboard` | Middleware + Layout | user | `/auth/login` | OK |
| `/como-funciona` | Middleware + Layout | user | `/auth/login` | OK |
| `/loja` | Middleware + Layout | user | `/auth/login` | OK |
| `/loja/checkout-mock` | Middleware + Layout | user | `/auth/login` | OK |
| `/meu-atlas/comprar-pa` | Middleware + Layout | user | `/auth/login` | OK |
| `/admin/**` (7 paginas) | Middleware + Layout + Admin Layout | admin (JWT + DB) | `/expeditions` | OK |
| `GET /api/v1/health` | Nenhuma | -- | -- | OK (proposital) |
| `GET /api/destinations/search` | `auth()` | user | 401 | OK |
| `POST /api/ai/plan/stream` | `auth()` | user | 401 | OK |
| `POST /api/ai/guide/stream` | `auth()` | user | 401 | OK |
| `GET /api/ai/test-anthropic` | `auth()` + role check | admin | 403 | OK |
| `GET /api/admin/export-csv` | `auth()` + DB role check | admin | 403 | OK |
| `GET /api/debug/flags` | Nenhuma | NODE_ENV check | 403 em prod | ATENCAO |
| `POST /api/webhooks/mercado-pago` | Shared secret (X-MP-Secret) | -- | 401 | OK |
| `POST /api/auth/[...nextauth]` | NextAuth interno | -- | -- | OK |

**Total**: 33 rotas de pagina + 9 rotas de API = 42 rotas auditadas.

### 1.5 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| ROUTE-001 | `/api/debug/flags` expoe flag de feature e ordem de fases sem autenticacao. Protegido apenas por `NODE_ENV !== "production"`. Se NODE_ENV nao for "production" em staging, expoe informacoes. | Baixo (info disclosure) | P2 |
| ROUTE-002 | Middleware skip em `pathname.startsWith("/api")` -- headers de seguranca CSP/HSTS nao sao aplicados em rotas de API. | Medio | P1 |

---

## 2. BOLA (Broken Object-Level Authorization)

### 2.1 Metodologia

Auditados todos os 16 arquivos de server actions e 9 rotas de API. Para cada funcao que aceita ID externo (tripId, etc.), verificou-se se ha validacao de ownership via `userId` na query Prisma.

### 2.2 Tabela de Actions

| Action File | Funcoes Exportadas | Aceita ID Externo? | Valida Ownership? | Status |
|---|---|---|---|---|
| `expedition.actions.ts` | ~15 funcoes | Sim (tripId) | Sim (`assertTripOwnership` + `userId` em WHERE) | OK |
| `trip.actions.ts` | 5 funcoes | Sim (tripId) | Sim (`TripService.getTripById(id, userId)`) | OK |
| `transport.actions.ts` | 6 funcoes | Sim (tripId) | Sim (`TransportService` faz BOLA check interno) | OK |
| `ai.actions.ts` | 2 funcoes | Sim (tripId) | Sim (`userId` em WHERE) | OK |
| `checklist.actions.ts` | 3 funcoes | Sim (tripId) | Sim (`verifyTripOwnership`) | OK |
| `itinerary.actions.ts` | 5 funcoes | Sim (tripId) | Sim (`verifyTripOwnership`) | OK |
| `profile.actions.ts` | 3 funcoes | Nao (usa session.user.id) | Sim | OK |
| `account.actions.ts` | 2 funcoes | Nao (usa session.user.id) | Sim | OK |
| `gamification.actions.ts` | 5 funcoes | Sim (tripId em 1) | Sim (`userId` em WHERE) | OK |
| `purchase.actions.ts` | 2 funcoes | Nao (usa session.user.id) | Sim | OK |
| `subscription.actions.ts` | 2 funcoes | Nao (usa session.user.id) | Sim | OK |
| `feedback.actions.ts` | 3 funcoes | Nao (userId from session) | Sim + admin role guard | OK |
| `admin.actions.ts` | 2 funcoes | Nao | Sim + admin role guard | OK |
| `ai-governance.actions.ts` | 2 funcoes | Nao | Sim + admin role guard | OK |
| `image.actions.ts` | 1 funcao | Nao (destination string) | N/A (sem auth) | ATENCAO |
| `auth.actions.ts` | 4 funcoes | Nao | N/A (pre-auth) | OK |

### 2.3 API Routes

| Rota | Aceita ID Externo? | Valida Ownership? | Status |
|---|---|---|---|
| `POST /api/ai/plan/stream` | Sim (tripId) | Sim (`userId` em WHERE) | OK |
| `POST /api/ai/guide/stream` | Sim (tripId) | Sim (`userId` em WHERE) | OK |
| `GET /api/admin/export-csv` | Nao | N/A + admin guard | OK |
| `GET /api/ai/test-anthropic` | Nao | N/A + admin guard | OK |
| `GET /api/destinations/search` | Nao (query string) | N/A | OK |
| `GET /api/v1/health` | Nao | N/A | OK |
| `GET /api/debug/flags` | Nao | N/A | OK |
| `POST /api/webhooks/mercado-pago` | Sim (data.userId) | Shared secret | OK |

### 2.4 Services (camada de servico)

| Servico | BOLA Check Interno? | Status |
|---|---|---|
| `TransportService` | Sim (`userId` em `findFirst`) | OK |
| `AccommodationService` | Sim (`userId` em `findFirst`) | OK |
| `TripService.updateTrip` | Sim (`findFirst` + `existing.userId !== userId` throw) | OK |
| `ExpeditionSummaryService` | Sim (BOLA check) | OK |

### 2.5 Findings BOLA

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| BOLA-001 | `image.actions.ts` (`getDestinationImageAction`) nao requer autenticacao -- qualquer pessoa pode buscar imagens por nome de destino. | Muito baixo (dados publicos) | P3 |
| BOLA-002 | `DT-S9-001` (Known Debt) -- `spendPoints` em gamification nao usa `$transaction` (race condition TOCTOU). Nao e BOLA, mas pode permitir gasto de pontos alem do saldo. | Medio (integridade) | P1 |

**Nenhum bug BOLA novo encontrado.** As correcoes dos Sprints 23 e 26 permanecem integras. Transport e Accommodation (Sprint 21) possuem BOLA check correto na camada de servico.

---

## 3. CSRF / XSS / CSP

### 3.1 CSP (Content-Security-Policy)

- **Ativo**: Sim, nonce por request via `crypto.randomUUID()` no middleware.
- **script-src**: `'self' 'nonce-{nonce}'` em producao. `'unsafe-eval'` apenas em dev (HMR).
- **style-src**: `'self' 'unsafe-inline'` -- necessario para Tailwind CSS/shadcn inline styles.
- **img-src**: `'self' data: https:` -- permissivo (aceita qualquer HTTPS). Adequado para Unsplash/Google avatars.
- **connect-src**: `'self' https:` em producao.

**Observacao**: `'unsafe-inline'` em `style-src` e uma concessao conhecida para frameworks CSS utility-first. Risco aceito.

### 3.2 Headers de Seguranca

| Header | Valor | Status |
|---|---|---|
| Content-Security-Policy | Com nonce | OK |
| X-Frame-Options | DENY | OK |
| X-Content-Type-Options | nosniff | OK |
| Referrer-Policy | strict-origin-when-cross-origin | OK |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | OK |
| Strict-Transport-Security | max-age=31536000; includeSubDomains (prod only) | OK |

### 3.3 dangerouslySetInnerHTML

| Arquivo | Uso | Justificativa | Risco |
|---|---|---|---|
| `src/app/[locale]/page.tsx:91` | JSON-LD structured data (`JSON.stringify(structuredData)`) | Dados gerados server-side, sem input do usuario. | Baixo |
| `src/components/features/gamification/BadgeUnlockToast.tsx:114` | CSS keyframe animation inline | String estatica, sem input do usuario. | Nenhum |

Nenhum uso inseguro encontrado.

### 3.4 CSRF

Next.js Server Actions possuem protecao CSRF built-in (Origin header check). Nenhum bypass detectado. API routes usam `auth()` session check.

### 3.5 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| CSP-001 | Headers de seguranca NAO aplicados em rotas `/api/*` (middleware faz `return` antes de gerar CSP). | Medio | P1 |

---

## 4. Rate Limiting

### 4.1 Implementacao

`src/lib/rate-limit.ts` usa Lua script atomico no Redis (INCR + EXPIRE). Fail-open (se Redis cair, permite requests).

### 4.2 Endpoints com Rate Limit

| Endpoint/Action | Limite | Janela | Status |
|---|---|---|---|
| `generateTravelPlanAction` | 10 req | 1h | OK |
| `generateChecklistAction` | 5 req | 1h | OK |
| `registerAction` | 20 req | 1h | OK |
| `requestPasswordResetAction` | 3 req | 15min | OK |
| `submitFeedbackAction` | 5 req | 5min | OK |
| `purchasePointsPackAction` | 5 req | 5min | OK |
| `POST /api/ai/plan/stream` | 10 req | 1h | OK |
| `POST /api/ai/guide/stream` | 5 req | 1h | OK |
| `POST /api/auth/[...nextauth]` (login) | 30 req | 15min | OK |
| `GET /api/destinations/search` | 30 req | 60s | OK |
| `GET /api/admin/export-csv` | 10 req | 60s | OK |
| `GET /api/v1/health` | 60 req | 60s | OK |
| AI Governance Rate Limit Policy | Configurable | Configurable | OK |

### 4.3 Endpoints SEM Rate Limit

| Endpoint/Action | Risco | Severidade |
|---|---|---|
| `saveTransportSegmentsAction` (6 funcoes) | Abuso de gravacao no DB | P2 |
| `expedition.actions.ts` (~15 funcoes de criacao/update) | Abuso de gravacao no DB | P2 |
| `trip.actions.ts` (5 funcoes) | Abuso de gravacao no DB | P2 |
| `checklist.actions.ts` (3 funcoes) | Abuso de gravacao no DB | P2 |
| `itinerary.actions.ts` (5 funcoes) | Abuso de gravacao no DB | P2 |
| `profile.actions.ts` (3 funcoes) | Abuso de gravacao no DB | P3 |
| `account.actions.ts` (delete account!) | Account deletion abuse | P1 |
| `gamification.actions.ts` (5 funcoes) | Points manipulation | P2 |
| `subscription.actions.ts` (2 funcoes) | Subscription abuse | P2 |
| `POST /api/webhooks/mercado-pago` | Webhook flood (mitigado por shared secret) | P2 |
| `getDestinationImageAction` | Unsplash API abuse (mitigado por cache Redis) | P3 |

### 4.4 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| RL-001 | Maioria das server actions de CRUD nao tem rate limiting. Criacao de trips, transporte, checklist items, itinerarios, e account deletion estao desprotegidos. | Disponibilidade + custo DB | P1 |

---

## 5. Secrets e Env Vars

### 5.1 Validacao (`src/lib/env.ts`)

Validacao com `@t3-oss/env-nextjs` + Zod. `skipValidation` habilitado via `SKIP_ENV_VALIDATION=true`.

### 5.2 Variaveis Requeridas em Producao

| Variavel | Requerida? | Tipo | Sensivel? |
|---|---|---|---|
| DATABASE_URL | Sim | URL | Sim |
| REDIS_URL | Default localhost | URL | Sim |
| AUTH_SECRET | Sim (min 32 chars) | String | Sim |
| NEXTAUTH_SECRET | Sim (min 32 chars) | String | Sim |
| ENCRYPTION_KEY | Opcional (64 hex) | String | Sim |
| ANTHROPIC_API_KEY | Opcional | String | Sim |
| GOOGLE_AI_API_KEY | Opcional | String | Sim |
| GEMINI_API_KEY | Opcional | String | Sim |
| GOOGLE_CLIENT_ID | Opcional | String | Sim |
| GOOGLE_CLIENT_SECRET | Opcional | String | Sim |
| APPLE_ID | Opcional | String | Sim |
| APPLE_SECRET | Opcional | String | Sim |
| MAPBOX_SECRET_TOKEN | Opcional | String | Sim |
| UNSPLASH_ACCESS_KEY | Opcional | String | Sim |
| SENTRY_DSN | Opcional | URL | Parcial |
| SENTRY_AUTH_TOKEN | Opcional | String | Sim |
| FEEDBACK_WEBHOOK_URL | Opcional | URL | Parcial |
| MP_WEBHOOK_SECRET | Opcional | String | Sim |
| NEXT_PUBLIC_MAPBOX_TOKEN | Opcional | String | Nao (public) |
| NEXT_PUBLIC_APP_URL | Default localhost | URL | Nao |
| NEXT_PUBLIC_SENTRY_DSN | Opcional | URL | Nao |
| NEXT_PUBLIC_PHASE_REORDER_ENABLED | Default false | Enum | Nao |

### 5.3 Hardcoded Secrets

**Nenhum secret hardcoded encontrado no codigo-fonte.** A unica referencia a `sk-` e no schema Zod de validacao (`startsWith("sk-ant-")`), nao um valor real.

### 5.4 Gitignore

`.env`, `.env.local`, `.env.staging`, `.env.production`, `.env.*.local` estao no `.gitignore`. OK.

### 5.5 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| ENV-001 | `ENCRYPTION_KEY` e opcional. Se nao configurado em producao, encrypt() lanca excecao em runtime (nao em startup). Dados PII (passaporte, booking code) nao serao criptografados -- erro silencioso na criacao de trip. | Confidencialidade | P0 |
| ENV-002 | `SKIP_ENV_VALIDATION=true` permite bypass de todas as validacoes. Se acidentalmente setado em producao, variaveis criticas podem faltar. | Integridade | P2 |

---

## 6. Criptografia de PII

### 6.1 Implementacao (`src/lib/crypto.ts`)

AES-256-GCM com IV de 96 bits e auth tag de 128 bits. Chave derivada de `ENCRYPTION_KEY` (hex 64 chars). Implementacao correta.

### 6.2 Campos Criptografados

| Campo | Modelo | Criptografia | Status |
|---|---|---|---|
| `passportNumberEnc` | UserProfile | AES-256-GCM | OK |
| `nationalIdEnc` | UserProfile | AES-256-GCM | OK |
| `bookingCodeEnc` | TransportSegment | AES-256-GCM | OK |
| `bookingCodeEnc` | Accommodation | AES-256-GCM | OK |

### 6.3 Dados Sensiveis NAO Criptografados

| Campo | Modelo | Tratamento Atual | Risco |
|---|---|---|---|
| `birthDate` | UserProfile | Plaintext no DB | P2 -- PII, mas nao classificado como "highly sensitive" |
| `email` | User | Plaintext no DB | P3 -- necessario para login, hash inviavel |
| `name` | User | Plaintext no DB | P3 -- necessario para display |
| `passportExpiry` | UserProfile | Plaintext no DB | P2 -- data de validade de documento |

### 6.4 Protecao na Camada de API

- `bookingCodeEnc` e mascarado no `ExpeditionSummaryService` (so ultimos 4 chars)
- `bookingCodeEnc: undefined` em `TransportService.getSegments()` e `AccommodationService.getAccommodations()` -- valor criptografado nunca exposto ao client
- `passportNumberEnc` decriptado apenas em `profile.actions.ts` com `decrypt()`, e mascarado (`"________"`) se decriptacao falhar

### 6.5 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| CRYPTO-001 | `ENCRYPTION_KEY` opcional -- se ausente em prod, `encrypt()` lanca excecao. Nao ha validacao em startup. (Mesmo que ENV-001) | Confidencialidade | P0 |

---

## 7. Logging de PII

### 7.1 BUG-S7-001 (raw userId em logger.info)

**Status: CORRIGIDO.** `account.actions.ts` agora importa `hashUserId as hashForLog` de `@/lib/hash` e usa `hashForLog(session.user.id)` em todos os logs.

### 7.2 Padrao Geral de Logging

O codebase usa consistentemente:
- `hashUserId(session.user.id)` para logar user IDs (hash SHA-256 truncado a 16 chars)
- `hashUserId` ou `hid` como alias em diferentes arquivos
- Nenhum objeto inteiro de usuario/session logado

### 7.3 Excecoes Encontradas

| Arquivo | Linha | Achado | Risco |
|---|---|---|---|
| `account.actions.ts:234` | `console.log(...)` | Analytics event (comentario "for now per spec") -- pode conter userId | P3 |

### 7.4 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| LOG-001 | `console.log` em `account.actions.ts:234` para analytics -- deve ser substituido por logger estruturado com hash de userId | Confidencialidade | P3 |

---

## 8. Dependencias

### 8.1 npm audit

```
4 vulnerabilidades (3 moderate, 1 high)

ALTA:
- next 13.0.0-15.5.14: DoS com Server Components (GHSA-q4gf-8mx6-v5v3)
  Fix: npm audit fix

MODERADAS:
- @hono/node-server <1.19.13: Middleware bypass via repeated slashes (GHSA-92pp-h63x-v22m)
- hono <4.12.14: HTML Injection em hono/jsx SSR (GHSA-458j-xx4x-4375)
- next-intl <4.9.1: Open redirect vulnerability (GHSA-8f24-v5vv-gm5j)
  Fix: npm audit fix --force (breaking change)
```

### 8.2 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| DEP-001 | `next` com CVE de DoS (high severity) -- GHSA-q4gf-8mx6-v5v3 | Disponibilidade | P0 |
| DEP-002 | `next-intl` com open redirect (moderate) -- GHSA-8f24-v5vv-gm5j. Fix requer breaking change. | Integridade | P1 |
| DEP-003 | `@hono/node-server` e `hono` com vulnerabilidades moderadas | Integridade | P2 |

---

## 9. Observabilidade

### 9.1 Sentry

- **Configurado**: Sim, client + server + edge (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
- **Integracao Next.js**: `withSentryConfig` em `next.config.ts`
- **Error boundaries**: 4 error boundaries capturam erros via `Sentry.captureException()`:
  - `src/app/global-error.tsx`
  - `src/app/[locale]/(app)/error.tsx`
  - `src/app/[locale]/(app)/expedition/[tripId]/error.tsx`
  - `src/app/[locale]/(app)/trips/[id]/error.tsx`
- **DSN**: Via env var (`SENTRY_DSN` server / `NEXT_PUBLIC_SENTRY_DSN` client). Opcional.

### 9.2 Analytics

- **Vercel Analytics**: `@vercel/analytics` configurado em `src/app/[locale]/layout.tsx`
- **Event tracking**: `track()` usado em `Phase6ItineraryV2.tsx`, `usePhaseTracking.ts`, `src/lib/utils/analytics.ts`
- **Nenhum** PostHog, Plausible, ou analytics de terceiros detectado

### 9.3 Logging Estruturado

- Logger customizado (`src/lib/logger.ts`) com metodos `info`, `warn`, `error`
- Uso consistente em server actions e services
- Sem `pino` ou `winston` -- logger custom
- User IDs hashados em todos os logs auditados (exceto 1 `console.log`)

### 9.4 AI Governance

- `/admin/ai-governance` -- painel de governanca AI (presente)
- `/admin/prompts` -- gerenciamento de prompts (presente)
- `/admin/errors` -- log de erros (presente)
- `/admin/evals` -- avaliacoes (presente)
- `/admin/analytics` -- analytics (presente)
- `ai-governance.actions.ts` -- actions com auth + admin role guard

### 9.5 Findings

| ID | Achado | Risco | Severidade |
|---|---|---|---|
| OBS-001 | `SENTRY_DSN` e opcional. Se nao configurado em producao, erros nao sao reportados. | Observabilidade | P1 |
| OBS-002 | Nenhum sistema de alerta para rate limit violations (fail-open com Redis down). | Observabilidade | P2 |

---

## 10. Gaps e Recomendacoes Priorizadas

### P0 -- Criticos (resolver antes do Beta)

| ID | Problema | Risco | Sugestao | Esforco |
|---|---|---|---|---|
| ENV-001 / CRYPTO-001 | `ENCRYPTION_KEY` opcional em env.ts. Se ausente em prod, PII nao e criptografado e encrypt() lanca excecao em runtime. | Confidencialidade | Tornar `ENCRYPTION_KEY` obrigatorio em producao (conditional Zod `.refine()` quando `NODE_ENV === "production"`). | S |
| DEP-001 | `next` com CVE de DoS (GHSA-q4gf-8mx6-v5v3, high severity). | Disponibilidade | Atualizar `next` para >= 15.5.15 via `npm audit fix`. | S |

### P1 -- Altos (resolver no primeiro sprint pos-Beta)

| ID | Problema | Risco | Sugestao | Esforco |
|---|---|---|---|---|
| CSP-001 / ROUTE-002 | Headers de seguranca (CSP, HSTS, X-Frame-Options) nao aplicados em rotas `/api/*`. Middleware faz `return` antes de gerar headers para requests `/api`. | Integridade | Mover logica de headers para antes do `if (pathname.startsWith("/api")) return`, ou adicionar `headers()` em `next.config.ts`. | S |
| RL-001 | Server actions de CRUD (expedition, trip, transport, checklist, itinerary, account delete) sem rate limiting. | Disponibilidade | Adicionar `checkRateLimit()` com limites generosos (ex: 60 req/min) nas actions de escrita. Priorizar `deleteAccountAction`. | M |
| DEP-002 | `next-intl` com open redirect (GHSA-8f24-v5vv-gm5j). | Integridade | Atualizar para >= 4.9.1. Requer teste de regressao (breaking change). | M |
| OBS-001 | Sentry DSN opcional em producao. | Observabilidade | Tornar obrigatorio quando `NODE_ENV === "production"`. | S |
| BOLA-002 / DT-S9-001 | `spendPoints` sem `$transaction` -- race condition TOCTOU. | Integridade | Envolver em `db.$transaction()` com leitura + validacao + escrita atomica. | S |

### P2 -- Medios (backlog tecnico)

| ID | Problema | Risco | Sugestao | Esforco |
|---|---|---|---|---|
| DEP-003 | `@hono/node-server` e `hono` com CVEs moderadas. | Integridade | `npm audit fix` (sem breaking changes). | S |
| ROUTE-001 | `/api/debug/flags` expoe info sem auth (protegido por NODE_ENV check). | Info disclosure | Adicionar auth + admin role guard, ou remover antes de prod. | S |
| ENV-002 | `SKIP_ENV_VALIDATION` permite bypass. | Integridade | Desabilitar em producao (block if NODE_ENV=production). | S |
| OBS-002 | Sem alerta para rate limit fail-open. | Observabilidade | Logar `logger.warn` quando Redis falha no rate limiter. | S |
| CRYPTO-002 | `birthDate` e `passportExpiry` nao criptografados. | Confidencialidade | Avaliar criptografia para LGPD/GDPR compliance. | M |

### P3 -- Baixos (nice-to-have)

| ID | Problema | Risco | Sugestao | Esforco |
|---|---|---|---|---|
| BOLA-001 | `getDestinationImageAction` sem auth. | Minimo (dados publicos) | Aceitar risco ou adicionar auth simples. | S |
| LOG-001 | `console.log` para analytics em `account.actions.ts:234`. | Confidencialidade | Substituir por logger estruturado. | S |

---

## Resumo Executivo

- **42 rotas auditadas** (33 paginas + 9 API routes)
- **0 bugs BOLA novos** -- todas as actions validam ownership corretamente
- **1 CVE high** (`next` DoS) + **3 CVEs moderate** = 4 vulnerabilidades abertas
- **2 issues P0** que devem ser resolvidas antes do Beta
- **5 issues P1** para o sprint imediatamente apos o Beta
- **DT-004 (mass assignment em updateTrip)** foi CORRIGIDO
- **BUG-S7-001 (raw userId em logs)** foi CORRIGIDO
- Postura geral de seguranca: **boa para pre-beta**
