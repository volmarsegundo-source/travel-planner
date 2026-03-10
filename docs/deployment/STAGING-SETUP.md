# Plano de Setup do Ambiente de Staging

**Infra Spec ID**: INFRA-002
**Autor**: devops-engineer
**Data**: 2026-03-09
**Ambiente**: staging (preview)
**Versao do Projeto**: v0.11.0 (1231 testes)
**Orcamento**: FREE TIERS ONLY (custo zero)

---

## 1. Resumo Executivo

Este documento descreve o passo a passo para deployar o Travel Planner (Atlas) pela
primeira vez em ambiente de staging, utilizando exclusivamente free tiers:

| Servico           | Provedor   | Free Tier                               |
|-------------------|------------|-----------------------------------------|
| Frontend/SSR      | Vercel     | 100 GB bandwidth, 100 GB-hours compute  |
| PostgreSQL        | Neon       | 0.5 GB storage, 100 CU-hours/mes       |
| Redis             | Upstash    | 256 MB, 500K commands/mes              |
| Container Registry| N/A        | Nao necessario (Vercel build nativo)    |

**Estimativa total de tempo**: 60-90 minutos para um desenvolvedor completar todos os passos.

---

## 2. Analise de Prontidao para Deploy

### 2.1 O que funciona como esta

| Componente | Status | Notas |
|---|---|---|
| Next.js 15 App Router | OK | Vercel suporta nativamente |
| Prisma + PostgreSQL | OK | Neon e 100% compativel com PostgreSQL 16 |
| Auth.js v5 (JWT strategy) | OK | Funciona em serverless sem problemas |
| Middleware Edge-safe | OK | Nao importa Prisma nem ioredis |
| CSP nonce via crypto.randomUUID | OK | Disponivel no Edge Runtime |
| next-intl routing | OK | Funciona em Vercel sem config extra |
| Migrations Prisma | OK | 8 migrations existentes e prontas |
| Seed script | OK | Pode ser executado apos migrate |
| Rate limit com Lua script | OK | Upstash suporta EVAL com Lua |
| Fallback de Redis | OK | `allowed: true` quando Redis indisponivel |
| `output: "standalone"` | ATENCAO | Vercel ignora esta opcao (usa o proprio builder) |

### 2.2 O que precisa de configuracao

| Item | Acao Necessaria | Bloqueador? |
|---|---|---|
| DATABASE_URL | Configurar connection string do Neon | Sim |
| REDIS_URL | Configurar connection URL do Upstash (rediss://) | Sim |
| AUTH_SECRET / NEXTAUTH_SECRET | Gerar novo secret para staging | Sim |
| AUTH_URL / NEXTAUTH_URL | Definir como URL do Vercel staging | Sim |
| REDIS_TLS_REQUIRED | Definir como `true` (Upstash exige TLS) | Sim |
| GOOGLE_CLIENT_ID/SECRET | Criar credenciais OAuth para staging (opcional) | Nao |
| ANTHROPIC_API_KEY | Configurar chave de API (opcional para MVP) | Nao |
| ENCRYPTION_KEY | Gerar chave de 64 hex chars | Nao (optional na env.ts) |

### 2.3 Blockers identificados

#### BLOCKER-1: ioredis vs @upstash/redis (RISCO MEDIO)

O projeto usa `ioredis` (cliente TCP) em `src/server/cache/redis.ts`. Upstash suporta
conexoes TCP via `rediss://`, mas em ambientes serverless a recomendacao oficial e
usar `@upstash/redis` (cliente HTTP).

**Por que NAO e blocker para staging MVP**:
- Vercel Serverless Functions rodam em Node.js runtime (nao Edge)
- ioredis consegue conectar via `rediss://` no Upstash
- O `lazyConnect: true` ja configurado ajuda com cold starts
- Rate limit tem fallback `allowed: true` quando Redis falha
- Para staging com poucos usuarios, o impacto e minimo

**Acao futura**: Migrar para `@upstash/redis` antes de producao.

#### BLOCKER-2: Seed script carrega .env.local (RISCO BAIXO)

O `prisma/seed.ts` usa `dotenv` para carregar `.env.local`. No contexto de Vercel,
as envs sao injetadas pelo proprio Vercel, entao o seed precisa ser executado
manualmente via CLI com a DATABASE_URL configurada.

**Mitigacao**: Executar seed localmente apontando para Neon.

#### BLOCKER-3: `output: "standalone"` no next.config.ts

O `output: "standalone"` nao causa erro no Vercel, mas e ignorado. Vercel usa seu
proprio builder otimizado. Nao precisa remover — apenas documentar que e para Docker.

---

## 3. Lista Completa de Variaveis de Ambiente

### 3.1 Obrigatorias para staging funcionar

| Variavel | Tipo | Onde Obter | Free Tier? |
|---|---|---|---|
| `DATABASE_URL` | Server, required | Neon dashboard > Connection Details | Sim |
| `REDIS_URL` | Server, default `redis://localhost:6379` | Upstash console > REST API section > `rediss://` URL | Sim |
| `REDIS_TLS_REQUIRED` | Server (custom) | Definir como `true` | N/A |
| `AUTH_SECRET` | Server, required (min 32 chars) | `openssl rand -base64 32` | N/A |
| `NEXTAUTH_SECRET` | Server, required (min 32 chars) | Mesmo valor que AUTH_SECRET | N/A |
| `AUTH_URL` | Server, default `http://localhost:3000` | URL do preview deploy Vercel | N/A |
| `NEXTAUTH_URL` | Server, default `http://localhost:3000` | Mesmo valor que AUTH_URL | N/A |
| `NODE_ENV` | Server, auto | Vercel define como `production` automaticamente | N/A |

### 3.2 Opcionais (funcionalidade parcial sem elas)

| Variavel | Tipo | Onde Obter | Free Tier? | Impacto se Ausente |
|---|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Server, optional | Google Cloud Console > OAuth 2.0 | Sim | Login com Google desabilitado |
| `GOOGLE_CLIENT_SECRET` | Server, optional | Google Cloud Console > OAuth 2.0 | Sim | Login com Google desabilitado |
| `ANTHROPIC_API_KEY` | Server, optional | Anthropic Console | Nao (pago) | Features de AI desabilitadas |
| `GOOGLE_AI_API_KEY` | Server, optional | Google AI Studio | Sim (free tier) | Provider alternativo de AI |
| `ENCRYPTION_KEY` | Server, optional | `openssl rand -hex 32` | N/A | Campos criptografados nao funcionam |
| `MAPBOX_SECRET_TOKEN` | Server, optional | Mapbox account | Sim (50K loads/mes) | Sem mapas server-side |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Client, optional | Mapbox account (pk.*) | Sim | Sem mapas client-side |
| `NEXT_PUBLIC_APP_URL` | Client, default `http://localhost:3000` | URL do deploy | N/A | Links internos incorretos |
| `SENTRY_DSN` | Server, optional | Sentry project settings | Sim (5K events/mes) | Sem error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Client, optional | Sentry project settings | Sim | Sem error tracking client |
| `SENTRY_AUTH_TOKEN` | Server, optional | Sentry > Auth Tokens | Sim | Sem source maps upload |
| `SKIP_ENV_VALIDATION` | Custom | `true` para pular validacao | N/A | Usado em builds especiais |

---

## 4. Guia Passo a Passo

### Passo 1: Criar conta no Neon PostgreSQL (10 min)

1. Acessar [neon.tech](https://neon.tech) e criar conta (pode usar GitHub login)
2. Criar novo projeto:
   - **Nome**: `travel-planner-staging`
   - **Regiao**: `aws-us-east-1` (ou mais proximo do Vercel)
   - **PostgreSQL version**: 16
3. No dashboard, copiar a connection string:
   ```
   postgresql://neondb_owner:PASSWORD@ep-XXXX.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **IMPORTANTE**: A connection string do Neon ja inclui `?sslmode=require`

**Limites do free tier Neon**:
- 0.5 GB de storage por projeto
- 100 CU-hours de compute por mes (~400h com 0.25 CU)
- Scale-to-zero apos 5 min de inatividade (cold start de ~500ms)
- Ate 10 projetos
- Point-in-time recovery de ate 6 horas
- Branches ilimitadas

**Gotchas**:
- Cold start do Neon pode adicionar ~500ms na primeira query apos inatividade
- Isso afeta o health check e a primeira autenticacao apos idle
- Para staging com uso intermitente, e esperado e aceitavel

### Passo 2: Criar database no Upstash Redis (10 min)

1. Acessar [console.upstash.com](https://console.upstash.com) e criar conta
2. Criar novo Redis database:
   - **Nome**: `travel-planner-staging`
   - **Regiao**: `us-east-1` (mesma regiao do Neon e Vercel)
   - **TLS**: habilitado (padrao, nao pode desabilitar)
3. No dashboard, na aba "Connect your client", selecionar `ioredis`:
   ```
   rediss://default:PASSWORD@us1-XXXXX.upstash.io:6379
   ```
   **NOTA**: Use a URL que comeca com `rediss://` (com dois 's' = TLS)

**Limites do free tier Upstash**:
- 256 MB de storage
- 500K commands por mes (~16.7K/dia)
- 200 GB bandwidth/mes (gratis)
- 1 database no free tier
- Suporta Lua scripting (EVAL) -- necessario para rate limiter

**Gotchas**:
- 500K commands/mes pode parecer muito, mas rate limiting conta cada INCR+EXPIRE
- Monitorar uso no dashboard do Upstash semanalmente
- Se exceder, requests serao rejeitados (nao cobrados)
- O comando `EVAL` (Lua script) conta como 1 command, nao multiplos

### Passo 3: Configurar projeto no Vercel (15 min)

1. Acessar [vercel.com](https://vercel.com) e criar conta (usar GitHub login)
2. Clicar "Add New Project"
3. Importar o repositorio `travel-planner` do GitHub
4. Configuracoes do projeto:
   - **Framework Preset**: Next.js (detectado automaticamente)
   - **Root Directory**: `.` (padrao)
   - **Build Command**: `npm run build` (padrao)
   - **Output Directory**: `.next` (padrao)
   - **Install Command**: `npm ci` (padrao)
   - **Node.js Version**: 20.x

5. **NAO fazer deploy ainda** — configurar env vars primeiro

#### 4.3.1 Configurar Environment Variables no Vercel

No Vercel project settings > Environment Variables, adicionar:

**Para todos os ambientes (Preview + Production)**:

```
DATABASE_URL = postgresql://neondb_owner:PASSWORD@ep-XXXX.us-east-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL = rediss://default:PASSWORD@us1-XXXXX.upstash.io:6379
REDIS_TLS_REQUIRED = true
AUTH_SECRET = (gerar com: openssl rand -base64 32)
NEXTAUTH_SECRET = (mesmo valor que AUTH_SECRET)
NEXT_PUBLIC_APP_URL = (sera preenchido apos primeiro deploy)
```

**IMPORTANTE sobre AUTH_URL e NEXTAUTH_URL**:
- Vercel define `VERCEL_URL` automaticamente (ex: `travel-planner-xxxxx.vercel.app`)
- Auth.js v5 detecta `VERCEL_URL` automaticamente quando `AUTH_URL` nao e definido
- Para preview deploys, NAO definir `AUTH_URL` / `NEXTAUTH_URL` nas env vars
- O Vercel injeta a URL correta para cada deploy automaticamente
- Se quiser forcar, definir `AUTH_URL` como `https://SEU-PROJETO.vercel.app`

**Variaveis opcionais (adicionar se disponivel)**:

```
GOOGLE_CLIENT_ID = (do Google Cloud Console)
GOOGLE_CLIENT_SECRET = (do Google Cloud Console)
ENCRYPTION_KEY = (gerar com: openssl rand -hex 32)
ANTHROPIC_API_KEY = (da Anthropic Console — CUIDADO: pago)
```

#### 4.3.2 Configurar Build Settings

No Vercel, ir em Settings > General:
- Framework Preset: **Next.js**
- Build Command: **(padrao do framework — NAO sobrescrever)**
- Install Command: `npm install` **(padrao, sem flags)**
- Node.js Version: **20.x**

**IMPORTANTE**: NAO sobrescrever o Build Command. O padrao do framework (`npm run build`)
aciona automaticamente o `prebuild` script do package.json, que executa `prisma generate`
usando o Prisma v6 local. Sobrescrever o Build Command faz com que `prebuild` NAO rode.

**IMPORTANTE**: NAO definir `NODE_ENV=production` nas Environment Variables do Vercel.
Isso faz o `npm install` pular devDependencies, e o binario `prisma` nao fica disponivel.
O Vercel ja define `NODE_ENV=production` automaticamente no runtime.

**NOTA**: `--legacy-peer-deps` nao e mais necessario. O package.json agora tem
`overrides` que resolve o conflito de peer dependency do `react-simple-maps`.

Veja `docs/deployment/VERCEL-FIX.md` para analise completa de todas as tentativas e a
causa raiz do problema.

#### 4.3.3 vercel.json (NAO necessario)

O projeto NAO precisa de `vercel.json`. As configuracoes padroes do Next.js no Vercel
sao suficientes:
- Regiao padrao: `iad1` (us-east-1)
- Serverless functions com Node.js runtime
- Build automatico do Next.js
- Headers de seguranca ja definidos no `middleware.ts`

Se no futuro for necessario fixar a regiao para latencia:
```json
{
  "regions": ["iad1"]
}
```

### Passo 4: Executar Migrations no Neon (10 min)

As migrations devem ser executadas **localmente** apontando para o banco Neon.

#### Opcao A: Via CLI local (recomendado para staging)

```bash
# Terminal local (PowerShell ou bash)
# Definir a DATABASE_URL do Neon temporariamente

# Windows PowerShell:
$env:DATABASE_URL = "postgresql://neondb_owner:PASSWORD@ep-XXXX.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Ou bash:
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-XXXX.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Executar migrations
npx prisma migrate deploy

# Verificar que todas as 8 migrations foram aplicadas
# Deve listar:
# - 20260226120000_sprint_2_schema_changes
# - 20260305014239_add_user_preferred_locale
# - 20260306143505_atlas_gamification_models
# - 20260307120000_add_user_profile_and_trip_type
# - 20260307200000_add_phase_checklist_items
# - 20260308174901_add_performance_indexes
# - 20260308234647_destination_guide_phase5
# - 20260309010315_itinerary_plan_phase6
```

#### Opcao B: Via Vercel Build (futuro/automatizado)

Adicionar ao build command do Vercel:
```
npx prisma generate && npx prisma migrate deploy && npm run build
```

**ATENCAO**: O `prisma migrate deploy` no build do Vercel cria uma dependencia do
banco estar acessivel durante o build. Para MVP staging isso e aceitavel, mas para
producao e melhor separar migrations do build.

#### Seed data para staging

```bash
# Apos as migrations, criar usuario de teste
# A seed precisa de .env.local local apontando para Neon
# OU definir DATABASE_URL no ambiente:

DATABASE_URL="postgresql://..." npx prisma db seed

# Resultado esperado:
# Test user ready: test@test.com (password: Test1234!)
```

**NAO usar seed em producao.** Staging-only.

### Passo 5: Configurar Auth para Staging (10 min)

#### 5.1 Gerar AUTH_SECRET

```bash
# Em qualquer terminal:
openssl rand -base64 32
# Exemplo de output: K7x2m9P4q...= (44 chars base64 = 32 bytes)

# Usar o MESMO valor para AUTH_SECRET e NEXTAUTH_SECRET
```

#### 5.2 Google OAuth (opcional)

Se quiser habilitar login com Google no staging:

1. Ir ao [Google Cloud Console](https://console.cloud.google.com)
2. Criar um **novo** projeto OAuth (NAO reutilizar o de producao)
3. Em "APIs & Services" > "Credentials" > "Create OAuth client ID":
   - Tipo: Web application
   - Nome: `Travel Planner Staging`
   - Authorized redirect URIs:
     ```
     https://SEU-PROJETO.vercel.app/api/auth/callback/google
     ```
   - Para preview deploys, adicionar tambem:
     ```
     https://travel-planner-*-SEU-USERNAME.vercel.app/api/auth/callback/google
     ```
4. Copiar Client ID e Client Secret para as env vars do Vercel

**NOTA**: Google OAuth nao aceita wildcards em redirect URIs. Para preview deploys
com URLs dinamicas, sera necessario usar apenas Credentials login (email/senha)
ou adicionar cada URL de preview manualmente (impraticavel).

**Recomendacao para staging**: Usar login com email/senha (Credentials provider).
Google OAuth pode ser testado apenas no deploy principal (nao previews).

#### 5.3 AUTH_URL / NEXTAUTH_URL

O Auth.js v5 no Vercel tem comportamento especial:
- Quando `AUTH_URL` nao esta definido, ele usa `VERCEL_URL` automaticamente
- `VERCEL_URL` e injetado pelo Vercel em cada deploy (preview e production)
- **Recomendacao**: NAO definir `AUTH_URL` nem `NEXTAUTH_URL` no Vercel
- A env.ts exige `AUTH_URL` e `NEXTAUTH_URL` com `.url()` validation, POREM eles
  tem `.default("http://localhost:3000")`

**PROBLEMA POTENCIAL**: A validacao `z.string().url()` vai rodar no build com o
default `http://localhost:3000` se nao definidos. Isso funciona para o build mas
em runtime o Auth.js v5 usara `VERCEL_URL`. Para garantir, definir ambos no Vercel:

```
AUTH_URL = https://SEU-PROJETO.vercel.app
NEXTAUTH_URL = https://SEU-PROJETO.vercel.app
```

### Passo 6: ANTHROPIC_API_KEY (5 min)

A `ANTHROPIC_API_KEY` e **opcional** na env.ts (`.optional()`). Sem ela:
- Features de AI (destination guide, itinerary generation) retornarao erro
- Login, trips, gamification, profile — tudo funciona normalmente
- O app nao quebra, apenas features de AI ficam indisponiveis

**Se quiser testar AI no staging**:
1. Ir a [console.anthropic.com](https://console.anthropic.com)
2. Criar API key (comeca com `sk-ant-`)
3. Adicionar ao Vercel: `ANTHROPIC_API_KEY = sk-ant-...`

**CUIDADO com custos**:
- Anthropic NAO tem free tier para API
- Cada chamada de destination guide/itinerary consome tokens
- Para staging, considerar rate limiting mais agressivo
- Monitorar uso no dashboard da Anthropic

**Alternativa gratuita**: Usar `GOOGLE_AI_API_KEY` com Google AI Studio (free tier
disponivel). O projeto ja suporta via `getProvider()` factory.

### Passo 7: Primeiro Deploy (10 min)

1. No Vercel, apos configurar todas as env vars, clicar "Deploy"
2. O build deve:
   - Instalar dependencias (`npm ci`)
   - Gerar Prisma Client (`npx prisma generate`)
   - Buildar Next.js (`npm run build`)
3. Verificar nos logs do build:
   - `Prisma Client generated` -- OK
   - `Route (app)` listando as rotas -- OK
   - `Build completed` -- OK

4. Apos deploy, testar:
   ```
   # Health check
   curl https://SEU-PROJETO.vercel.app/api/v1/health

   # Esperado (se DB e Redis configurados):
   # {"status":"ok","timestamp":"...","version":"unknown","services":{"database":"ok","redis":"ok"}}

   # Se Redis nao configurado:
   # {"status":"degraded","timestamp":"...","services":{"database":"ok","redis":"error"}}
   ```

5. Testar login com credentials:
   - Acessar `https://SEU-PROJETO.vercel.app/auth/login`
   - Usar `test@test.com` / `Test1234!` (se seed foi executado)

### Passo 8: Validacao Pos-Deploy (10 min)

Checklist de validacao:

- [ ] Health check retorna `{"status":"ok"}`
- [ ] Pagina inicial carrega (landing page)
- [ ] i18n funciona (`/en` e `/pt` redirecionam corretamente)
- [ ] Login com email/senha funciona
- [ ] Apos login, navbar autenticada aparece
- [ ] Pagina de account carrega dados do usuario
- [ ] Criar nova trip funciona
- [ ] Dashboard de gamification carrega
- [ ] Rate limiting nao bloqueia em uso normal
- [ ] CSP headers presentes (verificar no DevTools > Network)
- [ ] HSTS header presente em producao
- [ ] Nenhum erro de CORS nos logs do console

---

## 5. Consideracoes de Seguranca para Staging

### 5.1 Regras obrigatorias

| Regra | Detalhe |
|---|---|
| Secrets separados | NUNCA usar secrets de producao em staging |
| AUTH_SECRET unico | Gerar um novo para staging (diferente de dev local e producao) |
| Google OAuth separado | Criar credenciais OAuth distintas para staging |
| Sem PII real | Usar apenas dados de teste no banco de staging |
| ANTHROPIC_API_KEY | Se configurada, monitorar custos — staging pode gerar custos reais |
| ENCRYPTION_KEY unico | Dados criptografados em staging NAO devem ser decriptaveis em producao |
| Env vars no Vercel | Nunca commitar secrets no repositorio — usar Vercel env vars |
| Logs no Vercel | Verificar que logs nao expoem PII (structured logging ja implementado) |

### 5.2 O que NAO deve existir no staging

- Dados reais de usuarios
- Cartoes de credito ou passaportes reais
- API keys de producao
- Backup de dados de producao

---

## 6. Estimativa de Tempo por Etapa

| Etapa | Tempo Estimado | Bloqueador? |
|---|---|---|
| Criar conta + DB Neon | 10 min | Sim |
| Criar conta + Redis Upstash | 10 min | Sim |
| Configurar projeto Vercel | 15 min | Sim |
| Executar migrations | 10 min | Sim |
| Configurar Auth | 10 min | Sim |
| Seed data | 5 min | Nao |
| Primeiro deploy | 10 min | Sim |
| Validacao pos-deploy | 10 min | Sim |
| Google OAuth (opcional) | 15 min | Nao |
| Anthropic/Google AI (opcional) | 5 min | Nao |
| **Total (minimo)** | **~80 min** | |
| **Total (com opcionais)** | **~100 min** | |

---

## 7. Arquitetura do Staging

```
                    GitHub (master branch)
                           |
                           v
                   +---------------+
                   |    Vercel     |
                   | (Build + SSR) |
                   | Node.js 20    |
                   +-------+-------+
                           |
              +------------+------------+
              |                         |
              v                         v
     +----------------+        +-----------------+
     |  Neon (Free)   |        | Upstash (Free)  |
     |  PostgreSQL 16 |        | Redis 7 (TLS)   |
     |  us-east-1     |        | us-east-1       |
     |  0.5 GB        |        | 256 MB          |
     +----------------+        +-----------------+
```

**Fluxo de deploy**:
1. Push para `master` no GitHub
2. Vercel detecta automaticamente e inicia build
3. `npm install --legacy-peer-deps` (Install) + `npm run build` (Build, aciona prebuild: prisma generate)
4. Deploy automatico para preview URL
5. Migrations devem ser executadas manualmente (por enquanto)

---

## 8. Riscos e Mitigacoes

| ID | Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|---|
| R-001 | ioredis TCP em serverless | Media | Medio | Fallback `allowed: true` + migrar para @upstash/redis pre-producao |
| R-002 | Cold start do Neon (500ms) | Alta | Baixo | Aceitavel para staging; Neon warming pre-producao |
| R-003 | Upstash 500K cmds/mes esgotados | Baixa | Medio | Monitorar semanalmente; rate limit fallback ja existe |
| R-004 | Build falha sem prisma generate | Baixa (resolvido) | Alto | `prebuild` script no package.json roda automaticamente com Build Command padrao (ver VERCEL-FIX.md) |
| R-005 | AUTH_URL incorreto | Media | Alto | Nao definir AUTH_URL; deixar Auth.js usar VERCEL_URL |
| R-006 | Seed nao executado | Baixa | Baixo | Documentado; login nao funciona sem user |
| R-007 | REDIS_TLS_REQUIRED nao definido | Media | Medio | Adicionar validacao no checklist de deploy |

---

## 9. Proximos Passos (pos-staging)

### Para producao (futuro)

1. **Migrar ioredis para @upstash/redis** — substituir cliente TCP por HTTP
2. **Automatizar migrations** — GitHub Action que roda `prisma migrate deploy`
3. **Configurar dominio customizado** — DNS + SSL no Vercel
4. **Separar env vars por ambiente** — Vercel Environment: Preview vs Production
5. **Configurar Sentry** — error tracking + source maps
6. **Canary deploys** — feature flags + gradual rollout
7. **Neon branching** — branch de DB por preview deploy
8. **Upstash upgrade** — monitorar e migrar para pago se necessario

### Mudancas de codigo necessarias (futuro, NAO para staging MVP)

| Mudanca | Prioridade | Complexidade |
|---|---|---|
| Substituir `ioredis` por `@upstash/redis` | Alta (pre-producao) | Media (refactor redis.ts + rate-limit.ts) |
| Adicionar `prisma migrate deploy` ao build | Media | Baixa (build command) |
| Adicionar health check mais detalhado | Baixa | Baixa |
| Configurar Sentry DSN | Media | Baixa (apenas env var) |

---

## 10. Checklist Final de Deploy

Copiar e usar como checklist antes de cada deploy:

```markdown
## Pre-Deploy Checklist

### Infraestrutura
- [ ] Neon database criado e acessivel
- [ ] Upstash Redis criado e acessivel
- [ ] Migrations executadas (8 migrations)
- [ ] Seed executado (usuario test@test.com)

### Vercel
- [ ] Projeto conectado ao GitHub
- [ ] Build command: (padrao do framework — NAO sobrescrever)
- [ ] Install command: `npm install --legacy-peer-deps` (override)
- [ ] NODE_ENV NAO definido nas env vars (Vercel define automaticamente)
- [ ] Node.js version: 20.x

### Environment Variables (obrigatorias)
- [ ] DATABASE_URL (Neon connection string com ?sslmode=require)
- [ ] REDIS_URL (Upstash rediss:// URL)
- [ ] REDIS_TLS_REQUIRED = true
- [ ] AUTH_SECRET (min 32 chars, gerado com openssl)
- [ ] NEXTAUTH_SECRET (mesmo valor que AUTH_SECRET)
- [ ] AUTH_URL (URL do Vercel deploy)
- [ ] NEXTAUTH_URL (mesmo valor que AUTH_URL)

### Environment Variables (opcionais)
- [ ] ENCRYPTION_KEY (64 hex chars)
- [ ] GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
- [ ] ANTHROPIC_API_KEY (sk-ant-...) — ATENCAO: pago
- [ ] NEXT_PUBLIC_APP_URL

### Validacao Pos-Deploy
- [ ] /api/v1/health retorna status ok
- [ ] Landing page carrega
- [ ] Login funciona
- [ ] i18n funciona (/en e /pt)
- [ ] Criar trip funciona
- [ ] Nenhum erro no console do browser
```

---

> ATENCAO: Ready with conditions — resolver antes do deploy:
> 1. Build command do Vercel DEVE incluir `npx prisma generate`
> 2. Migrations devem ser executadas manualmente antes do primeiro deploy
> 3. Monitorar uso do Upstash free tier semanalmente
> 4. ioredis -> @upstash/redis deve ser resolvido antes de producao
