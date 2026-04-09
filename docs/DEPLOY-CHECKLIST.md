# Checklist de Deploy para Producao — Guia do PO

**Sprint 41 — Fase 2**
**Ref**: PLAN-FASE2-DEPLOY.md

Este documento e um passo a passo para o PO configurar a infraestrutura de producao.
Tempo estimado: 45-60 minutos.

---

## Passo 1 — Criar Projeto Neon (Database de Producao)

1. Acessar [console.neon.tech](https://console.neon.tech)
2. Clicar em **New Project**
3. Configurar:
   - **Name**: `atlas-production`
   - **Region**: `US East (Ohio)` (us-east-2) — mais proximo do Vercel
   - **Database name**: `atlas_prod`
   - **Role**: `atlas_owner` (ou manter default)
4. Copiar a **Connection String** (formato `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/atlas_prod?sslmode=require`)
5. Guardar como `DATABASE_URL` para o Passo 4

**Importante**: Este e um projeto SEPARADO do staging. Dados de staging e producao nunca se misturam.

---

## Passo 2 — Criar Database Upstash (Redis de Producao)

1. Acessar [console.upstash.com](https://console.upstash.com)
2. Ir em **Redis** > **Create Database**
3. Configurar:
   - **Name**: `atlas-production`
   - **Region**: `US-East-1` (Virginia)
   - **Type**: `Regional`
   - **TLS**: Habilitado (padrao)
   - **Eviction**: `volatile-lru`
4. Apos criacao, ir em **Details**
5. Copiar o **Endpoint** no formato `rediss://default:xxx@us1-xxx.upstash.io:6379`
6. Guardar como `REDIS_URL` para o Passo 4

---

## Passo 3 — Configurar Google OAuth para Producao

1. Acessar [console.cloud.google.com](https://console.cloud.google.com)
2. Ir em **APIs & Services** > **Credentials**
3. Clicar no OAuth Client ID existente (mesmo usado no staging)
4. Em **Authorized redirect URIs**, adicionar:
   ```
   https://<URL-VERCEL-PRODUCAO>/api/auth/callback/google
   ```
   (A URL sera conhecida apos o primeiro deploy — pode fazer este passo depois)
5. Em **Authorized JavaScript origins**, adicionar:
   ```
   https://<URL-VERCEL-PRODUCAO>
   ```
6. Salvar

**Nota**: Usar os MESMOS `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` do staging.

---

## Passo 4 — Configurar Env Vars no Vercel

1. Acessar [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecionar o projeto `travel-planner`
3. Ir em **Settings** > **Environment Variables**
4. Para CADA variavel abaixo, adicionar com **Environment = Production** (NAO Preview):

### 4.1 Variaveis de Infraestrutura (obrigatorias)

| Variavel | Valor | Onde Obter |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://...neon.tech/atlas_prod?sslmode=require` | Passo 1 |
| `REDIS_URL` | `rediss://default:...@us1-xxx.upstash.io:6379` | Passo 2 |
| `REDIS_TLS_REQUIRED` | `true` | Valor fixo |
| `AUTH_SECRET` | (32+ chars aleatorios) | Rodar no terminal: `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | (mesmo valor de AUTH_SECRET) | Copiar AUTH_SECRET |
| `AUTH_URL` | `https://<URL-VERCEL-PRODUCAO>` | URL do primeiro deploy |
| `NEXTAUTH_URL` | (mesmo valor de AUTH_URL) | Copiar AUTH_URL |
| `NEXT_PUBLIC_APP_URL` | (mesmo valor de AUTH_URL) | Copiar AUTH_URL |

### 4.2 Variaveis Funcionais (features nao funcionam sem elas)

| Variavel | Valor | Onde Obter |
|----------|-------|-----------|
| `AI_PROVIDER` | `gemini` | Valor fixo |
| `AI_FALLBACK_PROVIDER` | `anthropic` | Valor fixo |
| `GOOGLE_AI_API_KEY` | `AIza...` | [Google AI Studio](https://aistudio.google.com/apikey) — mesma chave do staging |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [Anthropic Console](https://console.anthropic.com/) — mesma chave do staging |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google Cloud Console — mesma do staging |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud Console — mesma do staging |
| `UNSPLASH_ACCESS_KEY` | `xxx` | [Unsplash Developer](https://unsplash.com/developers) — mesma chave do staging |
| `ENCRYPTION_KEY` | (64 hex chars) | Rodar no terminal: `openssl rand -hex 32` |

### 4.3 Nota sobre AUTH_URL

A URL de producao so sera conhecida apos o primeiro deploy. Fluxo recomendado:
1. Configurar todas as vars EXCETO AUTH_URL, NEXTAUTH_URL e NEXT_PUBLIC_APP_URL
2. Fazer o primeiro deploy (merge master → production)
3. Copiar a URL gerada pelo Vercel (ex: `travel-planner-xxx.vercel.app`)
4. Voltar e configurar AUTH_URL, NEXTAUTH_URL e NEXT_PUBLIC_APP_URL com essa URL
5. Fazer redeploy (push vazio ou trigger no Vercel)

---

## Passo 5 — Configurar Production Branch no Vercel

1. No Vercel, ir em **Settings** > **Git**
2. Em **Production Branch**, alterar de `master` para `production`
3. Salvar

**Resultado**:
- Push para `master` → deploy como Preview (staging)
- Push para `production` → deploy como Production

---

## Passo 6 — Rodar Migrations na Database de Producao

No terminal local, executar:

```bash
# Windows (PowerShell):
$env:DATABASE_URL="postgresql://...neon.tech/atlas_prod?sslmode=require"
npx prisma migrate deploy

# Linux/Mac:
DATABASE_URL="postgresql://...neon.tech/atlas_prod?sslmode=require" npx prisma migrate deploy
```

Resultado esperado:
```
8 migrations applied successfully.
```

---

## Passo 7 — Rodar Seed de Producao

No terminal local, executar:

```bash
# Windows (PowerShell):
$env:DATABASE_URL="postgresql://...neon.tech/atlas_prod?sslmode=require"
npx tsx prisma/seed-production.ts

# Linux/Mac:
DATABASE_URL="postgresql://...neon.tech/atlas_prod?sslmode=require" npx tsx prisma/seed-production.ts
```

Resultado esperado:
```
✓ AI governance: 3 prompt templates seeded
✓ AI governance: 4 kill switches seeded
✓ Production seed complete (no test users created)
```

---

## Passo 8 — Primeiro Deploy para Producao

```bash
git checkout production
git merge master
git push origin production
```

Aguardar o deploy no Vercel (2-3 minutos).

---

## Passo 9 — Validar Deploy

### 9.1 Health Check

```bash
curl -s https://<URL-PRODUCAO>/api/v1/health | jq .
```

Resposta esperada:
```json
{
  "status": "ok",
  "environment": "production",
  "services": {
    "database": "ok",
    "redis": "ok",
    "ai": {
      "status": "ok",
      "provider": "gemini",
      "fallback": "anthropic"
    }
  }
}
```

### 9.2 Smoke Test Manual

- [ ] Acessar a URL de producao
- [ ] Verificar que a landing page carrega
- [ ] Criar conta com email/senha
- [ ] Fazer login
- [ ] Criar nova expedicao
- [ ] Completar Fase 1 (destino, datas)
- [ ] Verificar que a fase avanca
- [ ] (Se Google OAuth configurado) Fazer login com Google
- [ ] (Se AI configurado) Gerar guia na Fase 5 ou roteiro na Fase 6

---

## Passo 10 — Configurar Google OAuth Redirect (pos-deploy)

Voltar ao Passo 3 e adicionar a URL real de producao nos redirect URIs.

---

## Resumo de Custos

| Servico | Tier | Custo Mensal |
|---------|------|-------------|
| Vercel | Hobby (free) | $0 |
| Neon PostgreSQL | Free | $0 |
| Upstash Redis | Free | $0 |
| Google AI (Gemini) | Free tier | $0 (ate 60 RPM) |
| Anthropic (fallback) | Pay-per-use | ~$0.01-0.10/dia |
| Unsplash | Free | $0 (50 req/hr) |
| Google OAuth | Free | $0 |

**Total estimado para beta**: $0-3/mes

---

## Troubleshooting

### "Application error" no primeiro acesso
- Verificar se DATABASE_URL esta correto no Vercel
- Verificar se migrations foram aplicadas (Passo 6)

### Health check retorna `"database": "error"`
- Verificar DATABASE_URL no Vercel (Environment = Production)
- Verificar se o projeto Neon esta ativo (nao suspenso)

### Health check retorna `"redis": "error"`
- Verificar REDIS_URL no Vercel (deve comecar com `rediss://`)
- Verificar REDIS_TLS_REQUIRED = `true`

### Login com Google nao funciona
- Verificar redirect URI no Google Cloud Console (Passo 3/10)
- Verificar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Vercel

### AI retorna erro
- Verificar GOOGLE_AI_API_KEY ou GEMINI_API_KEY no Vercel
- Verificar AI_PROVIDER = `gemini`
- Health check mostra status do AI em `/api/v1/health`
