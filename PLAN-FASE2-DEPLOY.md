# PLAN-FASE2-DEPLOY — Preparacao de Infraestrutura para Beta Launch

**Sprint**: 41 — Fase 2
**Tipo**: SPEC-INFRA
**Versao**: 0.35.1 → 0.36.0
**Autor**: tech-lead + architect + devops-engineer
**Data**: 2026-04-08
**Status**: AGUARDANDO APROVACAO DO PO

---

## 0. Resumo Executivo

Separar completamente os ambientes de staging e producao para o Beta Launch do Atlas Travel Planner. Staging continua no free tier existente; producao tera seus proprios recursos (database, Redis, secrets). Nenhum recurso pago sera criado sem aprovacao do PO — o spec assume free tiers para producao tambem (Neon free, Upstash free, Vercel Hobby).

**Entregaveis**:
1. `docs/DEPLOY.md` — Guia completo de deploy
2. Checklist de env vars para o PO configurar no Vercel
3. Health check endpoint melhorado (+ AI provider check)
4. CI/CD atualizado para branch `production`
5. Seed de producao (10 destinos em destaque)

**NAO incluso**: Criacao de recursos pagos, mudancas em features, alteracoes no staging.

---

## Dimensao 1 — Arquitetura de Ambientes

### 1.1 Topologia Alvo

```
┌─────────────────────────────────────────────────────┐
│                   REPOSITORIO GIT                    │
│                                                      │
│   master ─────────► Vercel (Staging)                │
│     │                 ├─ Neon DB (staging)           │
│     │                 ├─ Upstash Redis (staging)    │
│     │                 └─ travel-planner-*.vercel.app│
│     │                                                │
│     └── production ──► Vercel (Production)          │
│                        ├─ Neon DB (producao)        │
│                        ├─ Upstash Redis (producao)  │
│                        └─ dominio a definir         │
└─────────────────────────────────────────────────────┘
```

### 1.2 Isolamento

| Recurso | Staging | Producao |
|---------|---------|----------|
| Branch Git | `master` | `production` |
| Vercel Project | Existente | Novo project OU mesmo project com Production Branch = `production` |
| Neon Database | Projeto existente | Novo projeto Neon (isolamento total) |
| Upstash Redis | Database existente | Novo database Upstash |
| AUTH_SECRET | Secret atual | Novo secret (diferente) |
| ENCRYPTION_KEY | Chave atual | Nova chave (diferente) |
| Google OAuth | Redirect URI staging | Redirect URI producao (adicionar no Console) |
| AI Keys | Mesmas chaves (Gemini/Anthropic) | Mesmas chaves (compartilhadas) |

### 1.3 Decisao: Mesmo Vercel Project vs Novo Project

**Recomendacao: Mesmo Vercel Project** com Production Branch configurada para `production`.

- Vercel suporta nativamente "Production Branch" diferente de `main`
- Env vars podem ser scoped por Environment (Preview, Production)
- Simplifica gestao: 1 project, 2 ambientes
- Staging usa env vars de "Preview", producao usa env vars de "Production"

**Alternativa**: 2 Vercel projects separados — mais isolamento, mais gestao.

**Decisao do PO necessaria**: Qual abordagem preferir.

---

## Dimensao 2 — Database de Producao

### 2.1 Neon PostgreSQL

| Item | Detalhe |
|------|---------|
| Provedor | Neon (novo projeto separado) |
| Tier | Free (0.5 GB, 100 CU-hrs/mes) — suficiente para beta |
| Regiao | us-east-1 (mesma do staging, proxima do Vercel) |
| Branch | `main` (default do Neon) |
| Connection pooling | Habilitado (Neon faz automaticamente) |

### 2.2 Setup de Migrations

```bash
# Executar localmente apontando para Neon producao
DATABASE_URL="postgresql://...neon.tech/atlas_prod?sslmode=require" \
  npx prisma migrate deploy
```

Todas as 8 migrations existentes serao aplicadas de uma vez no banco vazio.

### 2.3 Seed de Producao

Criar `prisma/seed-production.ts` com:
- 10 destinos em destaque com imagens Unsplash (Paris, Tokyo, New York, Rio de Janeiro, Barcelona, Rome, London, Bangkok, Cape Town, Sydney)
- Templates de AI governance (PromptTemplate, AiKillSwitch defaults)
- **NAO** incluir usuarios de teste

### 2.4 Backup Strategy

| Metodo | Frequencia | Retencao |
|--------|-----------|----------|
| Neon Point-in-Time Recovery | Continuo (free tier: 7 dias) | 7 dias |
| `pg_dump` manual | Semanal (PO executa) | 30 dias |
| Neon branching (snapshot) | Antes de migrations | Ate deletar |

**Procedimento de backup manual**:
```bash
pg_dump $PRODUCTION_DATABASE_URL --format=custom --file=backup-$(date +%Y%m%d).dump
```

**Procedimento de restore**:
```bash
pg_restore --clean --if-exists -d $PRODUCTION_DATABASE_URL backup-YYYYMMDD.dump
```

---

## Dimensao 3 — Redis de Producao

### 3.1 Upstash Redis

| Item | Detalhe |
|------|---------|
| Provedor | Upstash (novo database separado) |
| Tier | Free (256 MB, 500K commands/mes) |
| Regiao | us-east-1 |
| TLS | Obrigatorio (`rediss://`) |
| Eviction policy | `volatile-lru` |

### 3.2 Configuracao no Codigo

Nenhuma mudanca necessaria — o codigo ja suporta `rediss://` via `REDIS_URL` + `REDIS_TLS_REQUIRED=true`.

### 3.3 Rate Limits para Producao

| Endpoint | Limite Atual | Limite Producao | Justificativa |
|----------|-------------|-----------------|---------------|
| `/api/v1/health` | 60/min/IP | 60/min/IP | Manter |
| `/api/ai/plan/stream` | 5/hr/user | 5/hr/user | Manter para beta |
| `/api/ai/guide/stream` | 5/hr/user | 5/hr/user | Manter para beta |
| `/api/destinations/search` | 30/min/IP | 30/min/IP | Manter |
| Auth endpoints | 5/15min/IP | 5/15min/IP | Manter |

### 3.4 Cache TTLs para Producao

| Cache Key Pattern | TTL Atual | TTL Producao | Notas |
|-------------------|-----------|-------------|-------|
| `dest:search:*` | 1h | 24h | Destinos mudam pouco |
| `rate:*` | Window-based | Manter | Controle de taxa |
| `gen-lock:*` | 300s | 300s | Lock de geracao AI |

**Acao**: Criar constantes em `src/server/cache/ttl.ts` para TTLs configuraveis por ambiente.

---

## Dimensao 4 — Variaveis de Ambiente

### 4.1 Checklist Completa de ENV Vars para Producao

O PO deve configurar estas variaveis no Vercel (Environment: Production):

#### Obrigatorias (app nao inicia sem elas)

| Variavel | Como Obter | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Neon Dashboard > Connection Details | `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/atlas_prod?sslmode=require` |
| `REDIS_URL` | Upstash Console > Database Details | `rediss://default:xxx@us1-xxx.upstash.io:6379` |
| `REDIS_TLS_REQUIRED` | Fixo | `true` |
| `AUTH_SECRET` | `openssl rand -base64 32` | (32+ chars aleatorios) |
| `NEXTAUTH_SECRET` | Mesmo valor de AUTH_SECRET | (copiar AUTH_SECRET) |
| `AUTH_URL` | URL de producao | `https://atlas.example.com` |
| `NEXTAUTH_URL` | Mesmo valor de AUTH_URL | `https://atlas.example.com` |
| `NEXT_PUBLIC_APP_URL` | Mesmo valor de AUTH_URL | `https://atlas.example.com` |

#### Funcionais (features nao funcionam sem elas)

| Variavel | Como Obter | Feature Afetada |
|----------|-----------|-----------------|
| `AI_PROVIDER` | Fixo | `gemini` |
| `AI_FALLBACK_PROVIDER` | Fixo | `anthropic` |
| `GOOGLE_AI_API_KEY` | Google AI Studio | Geracao de roteiros/guias |
| `ANTHROPIC_API_KEY` | Anthropic Console | Fallback AI |
| `GOOGLE_CLIENT_ID` | Google Cloud Console (adicionar redirect URI prod) | Login com Google |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Login com Google |
| `UNSPLASH_ACCESS_KEY` | Unsplash Developer Portal | Imagens de destinos |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | Criptografia de booking codes |

#### Opcionais (melhorias futuras)

| Variavel | Feature |
|----------|---------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapa na fase 6 |
| `MAPBOX_SECRET_TOKEN` | Geocoding server-side |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| `SENTRY_AUTH_TOKEN` | Source maps upload |

### 4.2 Google OAuth — Redirect URI de Producao

No Google Cloud Console, adicionar ao OAuth Client:
- Authorized redirect URIs: `https://<DOMINIO_PROD>/api/auth/callback/google`
- Authorized JavaScript origins: `https://<DOMINIO_PROD>`

---

## Dimensao 5 — CI/CD e Fluxo de Deploy

### 5.1 Fluxo de Promocao Staging → Producao

```
Developer pushes to master
        │
        ▼
  CI runs (lint, test, type-check, SAST)
        │
        ▼
  Vercel deploys to Staging (automatico)
        │
        ▼
  QA valida no staging
        │
        ▼
  Tech Lead aprova promocao
        │
        ▼
  git checkout production && git merge master && git push
        │
        ▼
  Vercel deploys to Production (automatico)
        │
        ▼
  Health check: GET /api/v1/health → 200
        │
        ▼
  Smoke test manual (login, criar expedição, gerar roteiro)
```

### 5.2 Branch `production`

Criar branch `production` a partir de `master`:
```bash
git checkout master
git checkout -b production
git push -u origin production
```

**Regras**:
- Nunca commitar diretamente em `production`
- Promocao sempre via merge de `master`
- Nao fazer force push em `production`

### 5.3 Vercel Configuration

No Vercel Dashboard:
1. Settings > Git > Production Branch → `production`
2. Environment Variables → scope por environment (Preview vs Production)
3. Staging continua funcionando via Preview Deployments de `master`

### 5.4 Atualizacao do deploy.yml

```yaml
# Adicionar trigger para branch production
on:
  push:
    branches: [master, production]

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/master'
    # ... (existente)

  deploy-production:
    if: github.ref == 'refs/heads/production'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      - name: Verify deployment
        run: |
          sleep 30
          curl -sf https://${{ vars.PRODUCTION_URL }}/api/v1/health || exit 1
```

---

## Dimensao 6 — Health Check Melhorado

### 6.1 Endpoint Atual

`GET /api/v1/health` — verifica DB + Redis. Status 200 (ok) ou 503 (degraded).

### 6.2 Melhoria: Adicionar AI Provider Check

```typescript
// Adicionar ao health check:
const aiStatus = await checkAiProviderAvailability();

// Retorno:
{
  "status": "ok",
  "timestamp": "...",
  "version": "0.36.0",
  "environment": "production",  // NOVO
  "services": {
    "database": "ok",
    "redis": "ok",
    "ai": "ok"  // NOVO — verifica que AI_PROVIDER esta configurado
  }
}
```

**AI check**: Apenas verifica se a env var do provider existe (nao faz chamada API).

### 6.3 Novo Campo: `environment`

Incluir `NODE_ENV` ou custom env var para identificar staging vs producao no health response.

---

## Dimensao 7 — Seguranca Pre-Launch

### 7.1 Checklist de Seguranca

| Item | Status Atual | Acao Necessaria |
|------|-------------|-----------------|
| Secrets no codigo | OK — env vars via t3-oss | Confirmar com `grep -r "sk-ant\|sk\." src/` |
| CSP headers | OK — nonce-based em producao | Nenhuma |
| X-Frame-Options: DENY | OK | Nenhuma |
| HSTS | OK — 1 ano com subdomains | Nenhuma |
| Rate limiting | OK — Redis-backed com fallback | Nenhuma |
| CORS | OK — Next.js default (same-origin) | Nenhuma |
| Auth JWT validation | OK — Edge-safe | Nenhuma |
| BOLA protection | OK — userId check em todas as queries | Nenhuma |
| Encryption at rest | OK — AES-256-GCM para booking codes | Gerar ENCRYPTION_KEY para prod |
| Pre-commit hooks | Verificar | Confirmar que `.husky/` esta ativo |
| Dependency audit | CI faz | Rodar `npm audit` antes do launch |

### 7.2 Acoes de Seguranca

1. **Gerar novos secrets** para producao (AUTH_SECRET, ENCRYPTION_KEY)
2. **Rodar `npm audit --audit-level=high`** e resolver criticos
3. **Confirmar pre-commit hooks**: `npx husky install` se necessario
4. **Google OAuth**: Garantir que redirect URI esta restrito ao dominio de producao

---

## Dimensao 8 — Observabilidade

### 8.1 Baseline para Beta

| Sinal | Ferramenta | Status |
|-------|-----------|--------|
| Logs | Vercel Logs (built-in) | Disponivel |
| Errors | Console (futuro: Sentry) | Basico |
| Health | `/api/v1/health` | Existente |
| Metricas | Vercel Analytics (free) | Habilitar no dashboard |
| AI usage | `AiInteractionLog` (DB) | Existente |
| Uptime | Health check externo (UptimeRobot free) | Configurar apos deploy |

### 8.2 Alertas Recomendados (pos-launch)

- Health check falha por 5 min → alerta
- Rate limit hit > 100/hora → alerta
- AI error rate > 10% → alerta

---

## Dimensao 9 — Plano de Execucao

### 9.1 Tarefas Ordenadas

| # | Tarefa | Agente | Depende de | Estimativa |
|---|--------|--------|-----------|------------|
| 1 | Criar `docs/DEPLOY.md` com guia completo | devops | Aprovacao do PO | Codigo |
| 2 | Criar branch `production` | devops | #1 | Comando git |
| 3 | Melhorar health check (AI provider + environment) | dev-fullstack | Aprovacao | Codigo |
| 4 | Criar `prisma/seed-production.ts` (10 destinos) | dev-fullstack | Aprovacao | Codigo |
| 5 | Criar `src/server/cache/ttl.ts` (TTLs configuraveis) | dev-fullstack | Aprovacao | Codigo |
| 6 | Atualizar `.github/workflows/deploy.yml` | devops | Aprovacao | Codigo |
| 7 | Checklist de env vars para PO (documento final) | tech-lead | #1-6 | Documento |
| 8 | PO configura recursos (Neon, Upstash, Vercel) | PO | #7 | Manual |
| 9 | PO configura env vars no Vercel | PO | #8 | Manual |
| 10 | Rodar migrations na DB de producao | PO/devops | #9 | Comando |
| 11 | Rodar seed de producao | PO/devops | #10 | Comando |
| 12 | Primeiro deploy para producao | Automatico (Vercel) | #11 | Merge |
| 13 | Validar health check em producao | QA | #12 | Manual |
| 14 | Smoke test (login, criar trip, gerar roteiro) | QA | #13 | Manual |

### 9.2 O que o Dev Team faz (tarefas 1-7)

Codigo a implementar:
- `docs/DEPLOY.md` — ~200 linhas de documentacao
- `src/app/api/v1/health/route.ts` — melhorar com AI check + environment
- `prisma/seed-production.ts` — seed com 10 destinos
- `src/server/cache/ttl.ts` — constantes de TTL por ambiente
- `.github/workflows/deploy.yml` — branch production trigger
- `docs/DEPLOY-CHECKLIST.md` — checklist para o PO

### 9.3 O que o PO faz (tarefas 8-14)

Passos manuais:
1. Criar projeto Neon para producao
2. Criar database Upstash para producao
3. Configurar env vars no Vercel
4. Adicionar redirect URI no Google Cloud Console
5. Fazer merge de `master` em `production`
6. Validar deploy

---

## Riscos e Mitigacoes

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| Free tier insuficiente para beta | Alto | Baixo (< 50 usuarios) | Monitorar uso no Neon/Upstash dashboard |
| ioredis vs serverless cold starts | Medio | Medio | `lazyConnect: true` ja configurado; migrar para `@upstash/redis` no Sprint 42 |
| Seed de producao com dados incorretos | Baixo | Baixo | Review manual dos 10 destinos antes de seed |
| Merge acidental em `production` | Alto | Baixo | Branch protection rules no GitHub |

---

## Decisoes Pendentes do PO

1. **Dominio de producao**: Qual URL? (ex: atlas-travel.vercel.app, atlas.example.com)
2. **Mesmo Vercel Project ou novo?**: Recomendacao e mesmo project com Production Branch
3. **Neon tier**: Free tier para beta ou Pro? (Recomendacao: free para comecar)
4. **Branch protection**: Habilitar no GitHub para `production`?
5. **Sentry**: Configurar para producao agora ou no Sprint 42?

---

## Aprovacao

- [ ] PO aprova escopo e decisoes
- [ ] Architect confirma arquitetura de ambientes
- [ ] Security confirma checklist de seguranca
- [ ] DevOps confirma viabilidade do CI/CD

---

*Gerado por: tech-lead + architect + devops-engineer*
*Sprint 41 — Fase 2: Deploy*
