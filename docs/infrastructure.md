# Travel Planner — Infrastructure & DevOps

**Infra Spec ID**: INFRA-001
**Author**: devops-engineer
**Date**: 2026-02-23
**Status**: Active — Bootstrap Phase 1
**Environment**: all

---

## Overview

Este documento define a infraestrutura mínima viável (MVP) para o Travel Planner — um monolito modular Next.js 15 com PostgreSQL, Redis (Upstash), e deploy no Vercel. O foco desta fase é garantir que o desenvolvimento comece com segurança, rastreabilidade, e paridade entre ambientes desde o primeiro dia.

A estratégia de infraestrutura segue três princípios fundamentais:

1. **Infrastructure as Code only** — nenhuma mudança manual em recursos cloud. Toda configuração vive no repositório.
2. **Fail fast, fail safe** — o pipeline bloqueia merges com qualidade abaixo do aceitável antes que código problemático chegue ao `main`.
3. **Observability from day one** — logs estruturados, error tracking, e health checks existem antes da primeira feature, não depois de um incidente.

---

## Local Development Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | JavaScript runtime |
| npm | 10.x | Package manager |
| Docker Desktop | 4.x+ | Local PostgreSQL + Redis containers |
| Git | 2.x+ | Version control |

> Nota: Use Node.js 20 LTS (não 22) para paridade com o ambiente de build no GitHub Actions. Use `nvm` ou `fnm` para gerenciar versoes locais.

### Docker Compose Configuration

O arquivo `docker-compose.yml` na raiz do projeto sobe PostgreSQL e Redis localmente. **Nunca conecte ao banco de producao ou staging durante o desenvolvimento.**

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: travel_planner_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: travel_planner
      POSTGRES_PASSWORD: local_dev_password_not_secret
      POSTGRES_DB: travel_planner_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U travel_planner -d travel_planner_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: travel_planner_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

> A senha `local_dev_password_not_secret` e usada apenas localmente. Nao existe risco de exposicao — o banco de dados local nao e acessivel de fora da maquina. Producao e staging usam senhas geradas e armazenadas em GitHub Secrets / Vercel Environment Variables.

### Environment Variables

O arquivo `.env.example` e o template oficial de variaveis de ambiente. Deve estar sempre atualizado quando novas variaveis forem adicionadas. **Nunca commitar `.env.local` ou qualquer arquivo com valores reais.**

```bash
# .env.example
# ============================================================
# TRAVEL PLANNER — Environment Variables Template
# Copy this file to .env.local and fill in the values.
# NEVER commit .env.local — it is gitignored.
# ============================================================

# ----- DATABASE -----
# Local: postgres://travel_planner:local_dev_password_not_secret@localhost:5432/travel_planner_dev
# Staging/Prod: provided by Railway/Render — get from team vault
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/travel_planner_dev"

# ----- REDIS -----
# Local: redis://localhost:6379
# Staging/Prod: Upstash Redis URL (from Upstash dashboard)
REDIS_URL="redis://localhost:6379"

# Upstash REST API (required for production Upstash client)
UPSTASH_REDIS_REST_URL="https://YOUR_UPSTASH_URL.upstash.io"
UPSTASH_REDIS_REST_TOKEN="YOUR_UPSTASH_TOKEN"

# ----- AUTH.JS (NextAuth v5) -----
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="CHANGE_ME_minimum_32_characters_long"
NEXTAUTH_URL="http://localhost:3000"

# OAuth providers — register apps in Google Cloud Console / Apple Developer
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# ----- MAPBOX -----
# Public token (safe in client bundle — prefix NEXT_PUBLIC_)
NEXT_PUBLIC_MAPBOX_TOKEN="pk.YOUR_MAPBOX_PUBLIC_TOKEN"
# Secret token (server-side geocoding API — NEVER expose to client)
MAPBOX_SECRET_TOKEN="sk.YOUR_MAPBOX_SECRET_TOKEN"

# ----- SENTRY -----
SENTRY_DSN="https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"
NEXT_PUBLIC_SENTRY_DSN="https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"
SENTRY_AUTH_TOKEN="YOUR_SENTRY_AUTH_TOKEN"

# ----- APP -----
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**Regras de variaveis de ambiente:**

- `NEXT_PUBLIC_` prefix: seguro para o bundle do cliente. Use APENAS para valores que podem ser publicamente expostos (ex: Mapbox public token, app URL).
- Sem prefixo: server-side only. Nunca deve aparecer em Client Components.
- Todas as variaveis sao validadas no startup via `src/lib/env.ts` usando `@t3-oss/env-nextjs`. Se uma variavel obrigatoria estiver faltando, a aplicacao falha ao iniciar — nunca silenciosamente em runtime.

### First-Time Setup Commands

```bash
# 1. Clone e instale dependencias
git clone git@github.com:YOUR_ORG/travel-planner.git
cd travel-planner
npm install

# 2. Configure variaveis de ambiente
cp .env.example .env.local
# Edite .env.local com os valores corretos

# 3. Suba os servicos locais (PostgreSQL + Redis)
docker compose up -d

# 4. Aguarde os health checks dos containers
docker compose ps
# Todos os servicos devem mostrar status "healthy"

# 5. Execute as migrations do banco de dados
npx prisma migrate dev

# 6. Popule o banco com dados de seed
npx prisma db seed

# 7. Inicie o servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:3000

# Comandos uteis para desenvolvimento:
npm run lint          # ESLint + TypeScript check
npm run test          # Vitest (unit + integration)
npm run test:e2e      # Playwright E2E (requer app rodando)
npm run test:coverage # Vitest com relatorio de cobertura

# Gerenciar o banco local:
npx prisma studio     # GUI do banco de dados
npx prisma migrate reset  # Reset completo (cuidado — apaga todos os dados)
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

O pipeline e dividido em dois workflows principais:

1. **`ci.yml`** — Roda em todo Pull Request. Valida qualidade antes do merge.
2. **`deploy.yml`** — Roda ao mergear em `main`. Deploya para staging automaticamente, producao com aprovacao manual.

#### Workflow 1: Continuous Integration (`ci.yml`)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"

jobs:
  # ─────────────────────────────────────────
  # STAGE 1: CODE QUALITY (target: < 3 min)
  # ─────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npx tsc --noEmit

  # ─────────────────────────────────────────
  # STAGE 2: UNIT + INTEGRATION TESTS
  # ─────────────────────────────────────────
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: travel_planner
          POSTGRES_PASSWORD: ci_test_password
          POSTGRES_DB: travel_planner_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://travel_planner:ci_test_password@localhost:5432/travel_planner_test
      REDIS_URL: redis://localhost:6379
      NEXTAUTH_SECRET: ci_test_secret_minimum_32_characters_long
      NEXTAUTH_URL: http://localhost:3000
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      NEXT_PUBLIC_MAPBOX_TOKEN: pk.test_token
      MAPBOX_SECRET_TOKEN: sk.test_token
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations (test DB)
        run: npx prisma migrate deploy

      - name: Run tests with coverage
        run: npm run test:coverage -- --reporter=verbose

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

      - name: Check coverage threshold (>= 80%)
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | node -e "
            const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
            console.log(data.total.lines.pct);
          ")
          echo "Coverage: ${COVERAGE}%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage ${COVERAGE}% is below the required 80% threshold"
            exit 1
          fi

  # ─────────────────────────────────────────
  # STAGE 3: BUILD & CONTAINER SCAN
  # ─────────────────────────────────────────
  build-and-scan:
    name: Docker Build & Security Scan
    runs-on: ubuntu-latest
    needs: [lint, test]
    permissions:
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image (no push on PR)
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: travel-planner:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          load: true
          build-args: |
            NODE_ENV=production

      - name: Scan image for vulnerabilities (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: travel-planner:${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: "1"
          ignore-unfixed: true

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

  # ─────────────────────────────────────────
  # STAGE 4: STATIC SECURITY ANALYSIS (SAST)
  # ─────────────────────────────────────────
  sast:
    name: Static Security Analysis
    runs-on: ubuntu-latest
    needs: lint
    permissions:
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep SAST
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
            p/typescript

      - name: Audit npm dependencies
        run: npm audit --audit-level=high
        continue-on-error: false

  # ─────────────────────────────────────────
  # STAGE 5: E2E TESTS (on PR to main only)
  # ─────────────────────────────────────────
  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: [test, build-and-scan]
    if: github.base_ref == 'main'

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: travel_planner
          POSTGRES_PASSWORD: ci_test_password
          POSTGRES_DB: travel_planner_e2e
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://travel_planner:ci_test_password@localhost:5432/travel_planner_e2e
      REDIS_URL: redis://localhost:6379
      NEXTAUTH_SECRET: ci_e2e_secret_minimum_32_characters_long_here
      NEXTAUTH_URL: http://localhost:3000
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      NEXT_PUBLIC_MAPBOX_TOKEN: pk.test_token
      MAPBOX_SECRET_TOKEN: sk.test_token
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Prisma migrations
        run: npx prisma migrate deploy

      - name: Seed E2E test data
        run: npx prisma db seed

      - name: Build Next.js app
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

#### Workflow 2: Deployment (`deploy.yml`)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false  # Never cancel an in-progress deploy

env:
  NODE_VERSION: "20"

jobs:
  # ─────────────────────────────────────────
  # STAGE 1: BUILD & PUBLISH IMAGE
  # ─────────────────────────────────────────
  build:
    name: Build & Publish Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_ENV=production

  # ─────────────────────────────────────────
  # STAGE 2: DEPLOY TO STAGING (automatic)
  # ─────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging (Vercel)
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: staging
      url: https://travel-planner-staging.vercel.app

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment (staging)
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build project (Vercel)
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          REDIS_URL: ${{ secrets.STAGING_REDIS_URL }}

      - name: Deploy to staging
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

      - name: Run smoke tests against staging
        run: npm run test:smoke -- --base-url=https://travel-planner-staging.vercel.app

  # ─────────────────────────────────────────
  # STAGE 3: DEPLOY TO PRODUCTION (manual approval)
  # ─────────────────────────────────────────
  deploy-production:
    name: Deploy to Production (Vercel)
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://travel-planner.vercel.app

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment (production)
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build project (Vercel)
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Run smoke tests against production
        run: npm run test:smoke -- --base-url=https://travel-planner.vercel.app

      - name: Notify team of successful deploy
        uses: slackapi/slack-github-action@v1.25.0
        if: success()
        with:
          payload: |
            {
              "text": "Travel Planner deployed to production successfully.",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Travel Planner deployed to production*\nCommit: `${{ github.sha }}`\nBy: ${{ github.actor }}\n<${{ github.event.head_commit.url }}|View commit>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### Dockerfile

```dockerfile
# Dockerfile
# Multi-stage build for minimal production image

# ── Stage 1: Dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --frozen-lockfile
RUN npx prisma generate

# ── Stage 2: Builder ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (public only — never secrets)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Runner (production) ──────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Quality Gates (What Must Pass Before Merge)

Todo Pull Request para `main` deve passar **obrigatoriamente** em todos os checks abaixo. O merge e bloqueado se qualquer um falhar.

| Gate | Tool | Threshold | Block on Fail |
|---|---|---|---|
| TypeScript strict mode | `tsc --noEmit` | Zero errors | Yes |
| Linting | ESLint | Zero errors (warnings allowed) | Yes |
| Unit tests pass | Vitest | 100% tests passing | Yes |
| Code coverage | Vitest coverage | >= 80% line coverage | Yes |
| Integration tests pass | Vitest | 100% tests passing | Yes |
| Container build | Docker | Build must succeed | Yes |
| Critical/High CVEs | Trivy | Zero unfixed CRITICAL/HIGH | Yes |
| Dependency audit | npm audit | Zero HIGH/CRITICAL advisories | Yes |
| SAST scan | Semgrep | Zero high-severity findings | Yes |
| E2E smoke tests | Playwright | Auth, trip creation, search pass | Yes (on PRs to main) |

**Branch protection rules a configurar no GitHub:**
- Require pull request reviews: minimum 1 approval
- Require status checks to pass before merging: all CI jobs
- Require branches to be up to date before merging: enabled
- Restrict pushes to `main` directly: enabled (no force push)

### Branch Strategy

```
main                    ← producao. Protegida. So aceita PRs aprovados.
  └── develop           ← integracao (opcional para MVP inicial)
        ├── feat/trip-creation          ← feature branch
        ├── feat/destination-search     ← feature branch
        ├── fix/search-cache-bug        ← bug fix branch
        └── chore/update-dependencies   ← maintenance branch
```

**Convencoes de branch:**
- `feat/` — nova funcionalidade
- `fix/` — correcao de bug
- `chore/` — manutencao, atualizacao de dependencias
- `docs/` — documentacao
- `refactor/` — refatoracao sem mudanca de comportamento
- `test/` — adicao ou correcao de testes

Branches devem ser criadas a partir de `main`, nunca diretamente nela.

---

## Environment Strategy

| Environment | Purpose | Infrastructure | Deploy Trigger | URL |
|---|---|---|---|---|
| `development` | Desenvolvimento local dos devs | Docker Compose (local) | Manual (`npm run dev`) | `localhost:3000` |
| `staging` | Validacao pre-producao, testes de integracao | Vercel Preview + Railway PostgreSQL (staging) | Automatico — push para `main` | `travel-planner-staging.vercel.app` |
| `production` | Usuarios reais | Vercel Production + Railway PostgreSQL (prod) | Manual — aprovacao no GitHub | `travel-planner.vercel.app` |

**Separacao de dados e obrigatoria:** development, staging, e producao usam bancos de dados completamente separados. Dados de producao nunca sao copiados para staging sem anonimizacao. Dados de usuarios reais nunca chegam a maquinas locais dos desenvolvedores.

**GitHub Environments** devem ser configurados com:
- `staging`: sem restricao de aprovadores (deploy automatico)
- `production`: requer aprovacao manual do tech-lead antes do deploy

---

## Secrets & Configuration Management

### Hierarquia de Secrets

```
Local Development
  └── .env.local (gitignored, nunca commitado)
        └── Valores locais — banco Docker, Redis local

Staging + Production
  └── GitHub Secrets (Settings > Secrets and Variables > Actions)
        └── Por environment (staging / production)
  └── Vercel Environment Variables
        └── Injetadas no build e runtime pelo Vercel
```

### GitHub Secrets Required

| Secret | Environment | Description |
|---|---|---|
| `VERCEL_TOKEN` | all | Token de acesso Vercel CLI |
| `VERCEL_ORG_ID` | all | ID da organizacao no Vercel |
| `VERCEL_PROJECT_ID` | all | ID do projeto no Vercel |
| `STAGING_DATABASE_URL` | staging | Connection string PostgreSQL staging |
| `STAGING_REDIS_URL` | staging | URL Redis staging (Upstash) |
| `PRODUCTION_DATABASE_URL` | production | Connection string PostgreSQL producao |
| `PRODUCTION_REDIS_URL` | production | URL Redis producao (Upstash) |
| `SLACK_WEBHOOK_URL` | all | Webhook para notificacoes de deploy |

### Vercel Environment Variables (por environment)

| Variable | Development | Staging | Production |
|---|---|---|---|
| `DATABASE_URL` | Local Docker | Railway staging | Railway production |
| `REDIS_URL` | `redis://localhost:6379` | Upstash staging | Upstash production |
| `NEXTAUTH_SECRET` | Qualquer string 32+ chars | Gerado com `openssl rand` | Gerado com `openssl rand` |
| `NEXTAUTH_URL` | `http://localhost:3000` | URL do staging | URL de producao |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token dev | Token staging | Token producao |
| `MAPBOX_SECRET_TOKEN` | Token dev | Token staging | Token producao |
| `SENTRY_DSN` | Opcional | Configurado | Configurado |
| `NODE_ENV` | `development` | `production` | `production` |

### Regras Inegociaveis de Secrets

1. **Nenhum secret no codigo** — qualquer string que pareca uma chave de API em um PR e motivo de bloqueio imediato
2. **Nenhum `.env` commitado** — `.env`, `.env.local`, `.env.staging`, `.env.production` estao no `.gitignore`
3. **`NEXT_PUBLIC_` prefix apenas para dados nao sensiveis** — tokens Mapbox publicos (pk.*) sao o unico exemplo valido
4. **Rotacao de secrets apos vazamento** — se um secret for exposto em um commit, rotacione imediatamente e considere todos os ambientes comprometidos
5. **Semgrep detecta secrets no CI** — o stage SAST inclui o ruleset `p/secrets` para detectar patterns de credenciais no codigo

### .gitignore Essentials

```gitignore
# .gitignore (additions for security)

# Environment files — NEVER commit these
.env
.env.local
.env.staging
.env.production
.env.*.local

# Vercel
.vercel

# Build outputs
.next/
out/

# Coverage reports
coverage/

# Playwright
playwright-report/
test-results/
```

---

## Observability (MVP)

### Logging Strategy

Toda a aplicacao usa **logs estruturados em JSON**. Logs em texto simples bloqueiam o pipeline de busca de erros em producao.

**Formato padrao de log (obrigatorio em todos os services):**

```json
{
  "timestamp": "2026-02-23T12:00:00.000Z",
  "level": "info",
  "service": "travel-planner",
  "environment": "production",
  "traceId": "req_abc123xyz",
  "event": "trip.created",
  "userId": "hashed:sha256:abc123",
  "durationMs": 245,
  "metadata": {}
}
```

**Campos PROIBIDOS em qualquer log:**
- Emails, nomes, enderecos (PII direta)
- Senhas, tokens, API keys
- Numeros de documentos (passaporte, CPF)
- Dados de cartao de credito
- Stack traces completas em resposta ao cliente (apenas no servidor)

**Implementacao para Next.js:**

```typescript
// src/lib/logger.ts
export const logger = {
  info: (event: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "travel-planner",
      environment: process.env.NODE_ENV,
      event,
      ...meta,
    })),
  error: (event: string, error: unknown, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "travel-planner",
      environment: process.env.NODE_ENV,
      event,
      errorMessage: error instanceof Error ? error.message : String(error),
      // Never log error.stack in production responses — log server-side only
      ...meta,
    })),
  warn: (event: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "warn",
      service: "travel-planner",
      environment: process.env.NODE_ENV,
      event,
      ...meta,
    })),
};
```

**Retencao de logs:**
- Desenvolvimento: console local, sem retencao
- Staging: Vercel Log Drains (retencao 7 dias)
- Producao: Vercel Log Drains → exportar para servico externo (ex: Logtail, Axiom) com retencao de 30 dias minimo

### Error Tracking

**Sentry** e o sistema de error tracking para staging e producao.

```typescript
// src/instrumentation.ts (Next.js instrumentation hook)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
```

```typescript
// src/instrumentation.node.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // NEVER send PII to Sentry
  beforeSend(event) {
    // Strip user email from events
    if (event.user?.email) {
      delete event.user.email;
    }
    return event;
  },
});
```

**Alertas Sentry configurados para MVP:**
- Error rate spike: > 5 errors/minute na mesma rota
- New issue: qualquer nova exception em producao
- Regression: issue que estava resolvida reaparece

### Health Checks

O endpoint `/api/v1/health` retorna o estado de todos os servicos dependentes. Deve ser o primeiro endpoint implementado.

```typescript
// src/app/api/v1/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { redis } from "@/server/cache/redis";

export async function GET() {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    services: {
      database: "unknown" as "ok" | "error",
      redis: "unknown" as "ok" | "error",
    },
  };

  // Check PostgreSQL
  try {
    await db.$queryRaw`SELECT 1`;
    checks.services.database = "ok";
  } catch {
    checks.services.database = "error";
    checks.status = "degraded";
  }

  // Check Redis
  try {
    await redis.ping();
    checks.services.redis = "ok";
  } catch {
    checks.services.redis = "error";
    checks.status = "degraded";
  }

  const httpStatus = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: httpStatus });
}
```

**O pipeline de CI executa um smoke test neste endpoint apos cada deploy.**

---

## Pre-Launch Checklist

O que DEVE existir antes de qualquer usuario real acessar a aplicacao:

### Infrastructure
- [ ] Dominio customizado configurado no Vercel com HTTPS/SSL automatico
- [ ] PostgreSQL producao provisionado no Railway/Render com backups automaticos habilitados (daily, retencao 7 dias)
- [ ] Upstash Redis producao configurado (plano pago se free tier >= 70% de uso)
- [ ] GitHub Environments configurados: `staging` (auto-deploy) e `production` (aprovacao manual)
- [ ] Todos os GitHub Secrets configurados por environment
- [ ] Branch protection em `main`: PR obrigatorio, status checks obrigatorios, review obrigatorio

### Security
- [ ] Semgrep SAST passando no pipeline
- [ ] npm audit com zero vulnerabilidades HIGH/CRITICAL
- [ ] Trivy scan com zero vulnerabilidades CRITICAL/HIGH nao corrigidas
- [ ] `.gitignore` configurado (nenhum `.env*` pode ser commitado)
- [ ] Secrets rotacionados se qualquer credencial foi exposta durante setup

### Observability
- [ ] Sentry DSN configurado em staging e producao
- [ ] `/api/v1/health` endpoint implementado e retornando 200
- [ ] Smoke test do health endpoint no pipeline pos-deploy
- [ ] Log estruturado implementado no logger padrao (sem logs de texto simples)

### Testing
- [ ] Cobertura de testes >= 80% passando no CI
- [ ] Pelo menos 3 testes E2E funcionando: auth flow, criar trip, busca de destino
- [ ] Pipeline CI rodando em todo PR e bloqueando merge se falhar

### Application
- [ ] `src/lib/env.ts` validando todas as variaveis de ambiente obrigatorias no startup
- [ ] `server-only` importado em todos os arquivos sob `src/server/`
- [ ] Soft delete (`deletedAt`) implementado em User e Trip
- [ ] Rate limiting middleware ativo para todas as rotas `/api/v1/`
- [ ] Prisma migrations funcionando no pipeline com `prisma migrate deploy`

---

## Infrastructure Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Secret exposto em commit acidental | Critical | Medium | Semgrep `p/secrets` no CI; `.gitignore` robusto; git-secrets pre-commit hook recomendado |
| Vercel lock-in | Medium | Low | Dockerfile mantido desde o dia 1; app e 12-factor e roda em qualquer host Node.js |
| Upstash Redis free tier esgotado | Medium | High | Monitorar uso via Upstash dashboard; provisionar plano pago ao atingir 70% do limite |
| PostgreSQL sem backup em staging | Medium | High | Habilitar backups automaticos no Railway/Render desde o primeiro dia (staging tambem pode ter dados valiosos de teste) |
| Pipeline lento > 15 min | Low | Medium | Docker layer caching (`type=gha`); npm cache via `actions/setup-node`; paralelizar jobs de lint e SAST |
| Prisma migrations falham em producao | High | Low | `prisma migrate deploy` (nao `dev`) no pipeline; testar migrations em staging antes da producao; manter migration history no repositorio |
| `NEXT_PUBLIC_` em variavel sensivel | Critical | Medium | Review de naming em PRs; Semgrep rule para detectar variaveis sensíveis com prefixo publico |
| Deploy de producao sem aprovacao | High | Low | GitHub Environment protection rules exigem review manual; nenhum workflow bypassa essa regra |
| Downtime durante deploy | Low | Low | Vercel usa zero-downtime deploys por padrao com rollback automatico em caso de falha de health check |
| Dependencias com licenca incompativel | Medium | Low | `license-checker` adicionado ao pipeline; bloqueia dependencias sem licenca MIT/Apache/BSD/ISC |

---

## Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-23 | devops-engineer | Bootstrap Phase 1 — infraestrutura inicial, CI/CD pipeline, estrategia de ambientes |
