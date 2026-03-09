# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.10.0] - 2026-03-09

### Added
- System prompts dedicados para cada tipo de chamada AI (plan, checklist, guide) com `cache_control` para prompt caching via Anthropic API — reduz custo de tokens repetidos (T-S16-002)
- PII masker para conformidade LGPD — detecta e mascara CPF, email, telefone, e nomes proprios antes de enviar texto para provedores AI (T-S16-005)
- Logging estruturado de uso de tokens (input, output, cache read/write) em todas as chamadas AI — visibilidade de custo por requisicao (T-S16-003)
- Testes de integracao para fluxo completo de sanitizacao: injection guard + PII masker + system prompts + token logging (T-S16-008)
- Agente `prompt-engineer` (#13) adicionado ao time de agentes do projeto
- Botoes de acesso rapido "Checklist" e "Itinerario" no card de expedicao do dashboard (MELHORIA-2)
- Auto-score na Phase 5 (guia de destino) com disclaimer de IA (MELHORIA-1)
- Documentacao: auditoria de prompt engineering, backlog de otimizacao, plano de tarefas Sprint 16

### Changed
- Tipo `model` na interface `AiProvider` expandido de `string` para union type `plan | checklist | guide` — tipagem mais estrita para chamadas AI (T-S16-001)
- Injection guard melhorado: padroes pt-BR, normalizacao NFKD para caracteres Unicode, regex refinada para deteccao de instrucoes `system:` (T-S16-004)
- Injection guard e PII masker integrados em todas as server actions de AI (plan, checklist, guide, travel notes) — sanitizacao automatica antes de cada chamada (T-S16-006)
- `MIN_PLAN_TOKENS` reduzido de 4096 para 2048 — permite respostas mais curtas sem erro de validacao (T-S16-007)
- `ClaudeProvider` refatorado para suportar system prompts com blocos de cache e logging de token usage

### Fixed
- Timeout silencioso na geracao de itinerario AI — adicionado tratamento explicito de erro e feedback ao usuario (BUG-B)
- Preferencias alimentares e de acessibilidade nao persistidas no UserProfile durante Phase 2 da expedicao (BUG-C)

### Security
- Sanitizacao de destino na action `generatePlan` contra injecao de prompt via input do usuario (SEC-S16-008)
- Mascaramento de PII em logs de chamadas AI — dados sensiveis nao sao mais registrados em texto claro (SEC-S16-002)

---

## [0.9.0] - 2026-03-06

### Added
- Atlas gamification engine — points, phases, badges, ranks
- 4 new Prisma models: `UserProgress`, `ExpeditionPhase`, `PointTransaction`, `UserBadge`
- `PointsEngine`: earn, spend, daily login, badge, rank, transaction history
- `PhaseEngine`: 8-phase expedition lifecycle with BOLA guards
- Phase configuration with point rewards, AI costs, badges, and rank promotions
- `Trip.expeditionMode` and `Trip.currentPhase` fields
- Zod schemas for gamification inputs (`CompletePhase`, `SpendPoints`, `UseAiInPhase`)
- Gamification TypeScript types (`Rank`, `BadgeKey`, `PhaseNumber`, `PhaseStatus`, etc.)

### Fixed
- `spendPoints()` TOCTOU race condition — wrapped in `$transaction` (CRITICAL)
- `getPhaseStatus()` missing BOLA ownership guard — added `userId` param (HIGH)
- `metadata` schema accepts unlimited keys — capped at 20 keys, key max 100 chars (HIGH)
- `getTransactionHistory()` unbounded `pageSize` — capped at 100 (MEDIUM)

### Changed
- `TRIP_SELECT` now includes `expeditionMode` and `currentPhase`
- `Trip` interface updated with gamification fields

---

## [0.8.0] - 2026-03-05

### Added
- Onboarding wizard Step 1: editable trip title, destination, and dates
- Onboarding wizard Step 2: 9 travel styles with `travelNotes` textarea (500 chars)
- Onboarding wizard Step 3: budget slider + numeric input synced (max 100,000)
- `AiProvider` interface with `ClaudeProvider` implementation
- `GOOGLE_AI_API_KEY` environment variable prepared for future Gemini provider
- `ANTHROPIC_API_KEY` made optional (graceful degradation when not set)

### Changed
- AI service refactored to use `getProvider()` factory pattern
- Wizard flow improved with editable fields and validation

---

## [0.7.0] - 2026-03-05

### Added
- Pagina de perfil do usuario (`/account`) com edicao de nome e idioma preferido
- Exclusao de conta com anonimizacao de PII (LGPD) — fluxo em 2 passos com confirmacao por email, soft delete + anonimizacao em transacao atomica
- Campo `preferredLocale` no modelo `User` (migration: `20260305014239_add_user_preferred_locale`)
- Link "Minha conta" no `UserMenu` dropdown com navegacao para `/account`
- Footer persistente em todas as paginas autenticadas (variante `authenticated` com links Terms, Privacy, Support)
- 4 loading skeletons: `/trips`, `/trips/[id]`, `/account`, e app-level — todos com `role="status"` e `aria-label`
- 2 error boundaries: app-level e trip-level — com botao "Tentar novamente" e link "Voltar"
- Skeleton animado para geracao de checklist com mensagens rotativas (`ChecklistGeneratingSkeleton`)
- Skeleton e spinner no botao "Adicionar dia" do editor de itinerario
- Estilizacao "trip not found" com card AlertCircle em 4 paginas de detalhe de viagem
- Script `generate-test-plan.js` para automacao de planos de teste por sprint (`npm run test:plan`)
- Documentacao de testes atualizada (`docs/dev-testing-guide.md`)
- 152 testes novos (total: 297 → 449)
- Chaves i18n completas para perfil e erros em PT-BR e EN (namespace `account`, `errors.boundary`, `errors.tripNotFound`)

### Changed
- Total de testes unitarios: 297 → 449 (adicionados 152 testes para perfil, exclusao de conta, skeletons, error boundaries, loading states e script de plano de testes)

### Fixed
- `OnboardingWizard` agora importa `useRouter` de `@/i18n/navigation` em vez de `next/navigation` (correcao de RISK-012)

---

## [0.6.0] - 2026-03-04

### Added
- Onboarding Wizard de 3 passos para novos usuarios (welcome, destino, estilo+IA)
- Indicador visual de progresso (`ProgressIndicator`) para o wizard
- Trust Signals badge com aviso de privacidade (LGPD) na tela de registro
- Layout dedicado para paginas de autenticacao (`auth/layout.tsx`) com Header e Footer
- Rate limiter atomico com script Lua para Redis (`src/lib/rate-limit.ts`)

### Changed
- CSP (Content-Security-Policy) migrado de `next.config.ts` para middleware com nonce per-request via `crypto.randomUUID()`
- Total de testes unitarios: 258 → 297

---

## [0.5.0] - 2026-03-02

### Added
- Navbar autenticada (`AuthenticatedNavbar`) persistente em todas as paginas protegidas — logo, link "Minhas Viagens", LanguageSwitcher, UserMenu com avatar
- Componente `UserMenu` com dropdown (nome, email, botao "Sair") e suporte a avatar com fallback para iniciais
- Componente `Breadcrumb` reutilizavel com configuracao por rota — integrado em sub-paginas de viagem (itinerary, checklist, generate)
- Route group `(app)` para agrupar todas as rotas autenticadas sob layout compartilhado (`AppShellLayout`)
- Paginas 404 (`not-found.tsx`) para rotas autenticadas e publicas
- Infraestrutura E2E com Playwright (configuracao base, smoke tests)
- 31 testes novos para componentes de navegacao, UserMenu, Breadcrumb e LoginForm error handling
- Chaves i18n de navegacao em PT-BR e EN (skip-to-content, toggleMenu, breadcrumbs)
- ADR-006 (route group `(app)`) e ADR-007 (LanguageSwitcher path) documentados

### Fixed
- Exibicao de erro no LoginForm — adicionado `catch` explicito em `handleCredentialsSubmit` e fallback defensivo em `resolveError`
- `LanguageSwitcher` movido de `components/landing/` para `components/layout/` (posicionamento correto no grafo de componentes)

### Changed
- Total de testes unitarios: 227 → 258 (adicionados 31 testes de navegacao e error handling)

---

## [0.4.0] - 2026-02-28

### Added
- Script `sprint-lifecycle.js` com comandos `start`, `review`, `finish`, `status` para gerenciamento de ciclo de vida de sprints via `npm run sprint:*`
- Script `project-bootstrap.js` com validacao de setup do projeto, verificacao de dependencias, e modo `--fix` para correcao automatica via `npm run bootstrap`
- Script `security-audit.js` com auditoria de seguranca (npm audit, busca de secrets, validacao de .env) via `npm run security`
- Script `i18n-manager.js` com verificacao de chaves de traducao e sincronizacao entre locales via `npm run i18n`
- Script `install-skills.js` para instalacao de 4 Claude Code skills (`dev-environment`, `i18n`, `security-audit`, `sprint`)
- 46 testes unitarios para todos os scripts de desenvolvimento

### Changed
- Total de testes unitarios: 181 → 227 (adicionados 46 testes para scripts de desenvolvimento)

---

## [0.3.0] - 2026-02-27

### Added
- Landing page completa com Hero section, Features section (4 cards: AI Planning, Drag & Drop, Multi-language, Responsive), e layout responsivo
- Header (`src/components/layout/Header.tsx`) com logo, language switcher, links login/signup, hamburger menu mobile
- Footer (`src/components/layout/Footer.tsx`) com copyright, links login/signup, language switcher
- Language Switcher (`src/components/landing/LanguageSwitcher.tsx`) para troca EN↔PT preservando rota atual
- Script de setup do ambiente de desenvolvimento (`scripts/dev-setup.js`) com modos `--check`, `--reset`, `--users-only`, e setup completo
- Claude Code skill `dev-environment` com arquitetura do ambiente, checklist pre-voo, e guia de troubleshooting
- Pagina `/dashboard` com redirect automatico para `/trips`
- Redirect automatico de usuarios autenticados na landing page para `/trips`
- `/dashboard` adicionado as rotas protegidas no middleware
- 44 testes unitarios para novos componentes (Header, Footer, HeroSection, FeaturesSection, LanguageSwitcher, dev-setup)
- Strings i18n da landing page em EN e PT-BR

### Fixed
- Mock do `@anthropic-ai/sdk` corrigido de arrow function para regular function (compatibilidade Vitest 4.x com construtores)
- Singleton `globalThis._anthropic` limpo entre testes via `beforeEach`
- Exclusao de testes duplicados de subdiretorio `travel-planner/` no vitest.config.ts
- Exclusao de testes E2E (`**/e2e/**`) do vitest.config.ts

### Changed
- Total de testes unitarios: 137 → 181 (adicionados 44 testes de componentes e scripts)

---

## [0.2.0] - 2026-02-26

### Added
- Modulo de checklist de viagem persistido no banco de dados — `ChecklistItem` vinculado a `Trip` com suporte a reordenacao e marcacao de itens como concluidos
- Campo `deactivatedAt` no modelo `User` para suporte futuro a desativacao de conta sem exclusao permanente de dados
- Headers de seguranca HTTP aplicados globalmente via `next.config.ts` — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e `Content-Security-Policy` presentes em todas as respostas da aplicacao
- `Strict-Transport-Security` (HSTS) ativado em producao com `max-age=31536000; includeSubDomains`
- Modulo de navegacao i18n tipado em `src/i18n/navigation.ts` via `createNavigation` do next-intl — exporta `Link`, `redirect`, `usePathname` e `useRouter` com suporte nativo a locales
- Pipeline de deploy automatizado no GitHub Actions (`deploy.yml`) — deploy em staging disparado em push para `master`; deploy em producao via `workflow_dispatch` com parametro de versao

### Changed
- Endpoint `GET /api/v1/health` agora retorna HTTP 503 quando database ou Redis estao indisponiveis; HTTP 200 e retornado apenas quando todos os servicos respondem corretamente — monitores externos devem ser atualizados para aceitar 503 como estado degradado (nao falha total de instancia)
- `next-auth` fixado na versao `5.0.0-beta.25` sem operador caret para garantir comportamento deterministico enquanto a versao estavel nao e publicada
- Tipos `TripStatus` e `TripVisibility` agora re-exportados de `@prisma/client` em `src/types/trip.types.ts` — elimina definicoes duplicadas e garante sincronia automatica com o schema do banco de dados
- `typedRoutes` desabilitado em `next.config.ts` por incompatibilidade com o roteamento dinamico `[locale]` do next-intl — sera reativado quando todos os links internos forem migrados para o modulo `src/i18n/navigation.ts`
- Testes E2E no CI restritos ao projeto `chromium` do Playwright para reduzir tempo de execucao e consumo de recursos no pipeline

### Removed
- Campo `avatarUrl` removido do modelo `User` no schema Prisma — o campo `image` nativo do Auth.js e utilizado para foto de perfil OAuth; ver guia de migracao abaixo
- Dependencia `crypto-js` removida — funcionalidades substituidas por implementacoes nativas

### Security
- Headers HTTP de seguranca adicionados globalmente — mitiga classes de vulnerabilidade de clickjacking (X-Frame-Options: DENY), MIME sniffing (X-Content-Type-Options: nosniff) e data leakage via Referer

### Migration Notes (0.1.0 -> 0.2.0)

> **ATENCAO — migration de banco de dados obrigatoria antes do deploy.**
> Esta versao altera o schema do banco de dados: adiciona `deactivated_at` na tabela `users`,
> remove a coluna `avatar_url` da tabela `users`, e cria a tabela `checklist_items`.
> O deploy sem aplicar a migration causara erros de runtime em todos os modulos afetados.

**Antes do deploy em staging ou producao:**

```bash
# 1. Verificar se avatar_url possui dados (executar no banco alvo antes do deploy)
SELECT COUNT(*) FROM users WHERE avatar_url IS NOT NULL;
# Se resultado > 0: consultar o Product Owner sobre destino dos dados antes de prosseguir

# 2. Gerar a migration versionada (executar em ambiente de desenvolvimento)
npx prisma migrate dev --name sprint-2-schema-changes

# 3. Revisar o SQL gerado em prisma/migrations/
# Confirmar: ADD COLUMN deactivated_at, DROP COLUMN avatar_url, CREATE TABLE checklist_items

# 4. Commitar a migration gerada junto com o codigo do Sprint 2
# A migration sera aplicada automaticamente pelo pipeline via `prisma migrate deploy`
```

**Guia de migracao — campo `avatarUrl` removido:**

```typescript
// Antes (Sprint 1 — campo nao existia mais no schema mas podia estar em uso)
const user = await db.user.findUnique({ where: { id } });
console.log(user.avatarUrl); // campo removido — TypeError em runtime

// Depois (Sprint 2 — usar campo `image` nativo do Auth.js)
const user = await db.user.findUnique({ where: { id } });
console.log(user.image); // campo OAuth nativo — null se usuario nao tiver foto
```

**Guia de migracao — health check retorna 503:**

```
# Antes: qualquer resposta do endpoint /api/v1/health significava "saudavel"
# Depois: apenas HTTP 200 significa "todos os servicos ok"
#         HTTP 503 significa "um ou mais servicos degradados — investigar"

# Atualizar configuracao de uptime monitors:
# - Aceitar: 200 como "healthy"
# - Alertar: 503 como "degraded" (nao remover instancia do pool ainda)
# - Falhar:  timeout ou 5xx inesperado
```

---

## [0.1.0] - 2026-02-26

### Added
- **Authentication** — Email/password registration and login with Auth.js (NextAuth v5); email verification flow; password reset via magic link; Google OAuth provider configured (optional); trust signals badge on registration screen (LGPD-compliant privacy notice + account deletion link)
- **Onboarding** — 3-step onboarding wizard shown on first login: welcome screen, destination hint, plan generation teaser
- **Trip management** — Full CRUD for trips (create, list, soft-delete); trip dashboard with status badges; `MAX_TRIPS_PER_USER` limit (20) enforced server-side; BOLA authorization guard on all trip operations
- **AI itinerary generation** — Day-by-day travel plan generated by Claude (claude-sonnet-4-6); 3-step wizard UI (destination → style → budget); Redis cache (24h TTL) keyed by destination + style + budget bucket + duration + language; streaming-ready error handling; Zod schema validation on Claude response
- **AI checklist generation** — Pre-trip checklist generated by Claude Haiku; 5 categories (Documents, Health, Currency, Weather, Technology); Redis cache (24h TTL) keyed by destination + month + travelers + language; separate cache namespace from itinerary (`cache:ai-checklist:`)
- **Itinerary editor** — Drag-and-drop activity reordering (dnd-kit with TouchSensor + MouseSensor); activity CRUD; BOLA guard verifying activity ownership through day → trip chain
- **i18n** — Full internationalization with next-intl; Portuguese (pt-BR) and English (en) locales; zero hardcoded strings in the frontend
- **Infrastructure** — Docker Compose (PostgreSQL 16 + Redis 7 + app); GitHub Actions CI pipeline (lint → typecheck → test → build); Prisma ORM with soft-delete extension; structured logger (PII-safe); env validation with @t3-oss/env-nextjs at startup

### Fixed
- ESLint and Vitest config issues after initial bootstrap

### Security
- All Server Actions validate input with Zod before processing
- `server-only` import enforced across all server modules
- No PII logged or exposed in API responses or error messages
- ANTHROPIC_API_KEY validated at startup via env.ts (fails fast if missing)
- `reorderActivities` verifies activity ownership through day → trip chain (cross-trip hijacking prevention)

### Migration Notes

> **First-time setup** — follow these steps to run the project locally:

```bash
# 1. Copy and fill environment variables
cp .env.example .env.local
# Required: DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY

# 2. Install dependencies (requires Node.js 20 LTS)
npm ci

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Run database migrations
npx prisma migrate deploy

# 5. Start development server
npm run dev
```

> **Node.js version:** This project requires Node.js 20 LTS. Use `.nvmrc` (`nvm use`) or verify with `node -v`.
> **Prisma migrations:** If `prisma/migrations/` is missing, run `npx prisma migrate dev --name init` on a clean database to generate the baseline migration.

---

[0.10.0]: https://github.com/your-org/travel-planner/releases/tag/v0.10.0
[0.9.0]: https://github.com/your-org/travel-planner/releases/tag/v0.9.0
[0.8.0]: https://github.com/your-org/travel-planner/releases/tag/v0.8.0
[0.7.0]: https://github.com/your-org/travel-planner/releases/tag/v0.7.0
[0.6.0]: https://github.com/your-org/travel-planner/releases/tag/v0.6.0
[0.5.0]: https://github.com/your-org/travel-planner/releases/tag/v0.5.0
[0.4.0]: https://github.com/your-org/travel-planner/releases/tag/v0.4.0
[0.3.0]: https://github.com/your-org/travel-planner/releases/tag/v0.3.0
[0.2.0]: https://github.com/your-org/travel-planner/releases/tag/v0.2.0
[0.1.0]: https://github.com/your-org/travel-planner/releases/tag/v0.1.0
