# Guia de Deploy — Atlas Travel Planner

> Ultima atualizacao: 2026-04-08

---

## 1. Visao Geral da Arquitetura

O projeto utiliza dois ambientes separados dentro do mesmo projeto Vercel, diferenciados pela branch de deploy.

```
master ──► Vercel Preview (Staging)
              ├─ Neon DB (staging)
              ├─ Upstash Redis (staging)
              └─ travel-planner-eight-navy.vercel.app

production ──► Vercel Production
                ├─ Neon DB (producao)
                ├─ Upstash Redis (producao)
                └─ URL definida pelo Vercel
```

Cada ambiente possui suas proprias credenciais e recursos isolados:

- **Banco de dados**: instancias Neon PostgreSQL independentes
- **Cache**: instancias Upstash Redis independentes
- **Secrets**: variaveis de ambiente configuradas separadamente no painel do Vercel (Settings > Environment Variables)

A separacao e feita via configuracao de Production Branch no Vercel (Settings > Git > Production Branch = `production`).

---

## 2. Processo de Promocao (Staging para Producao)

| Etapa | Acao | Responsavel |
|-------|------|-------------|
| 1 | Push para `master` | Desenvolvedor |
| 2 | CI executa: lint, test, type-check, SAST | Automatico (GitHub Actions) |
| 3 | Vercel deploya para staging | Automatico |
| 4 | Validacao no ambiente de staging | QA Engineer |
| 5 | Aprovacao da promocao | Tech Lead |
| 6 | Merge para branch `production` (ver abaixo) | Tech Lead / Release Manager |
| 7 | Vercel deploya para producao | Automatico |
| 8 | Health check | Release Manager |
| 9 | Smoke test (login, criar expedicao, gerar roteiro) | QA Engineer |

### Comandos para promocao (etapa 6)

```bash
git checkout production
git merge master
git push origin production
```

### Health check (etapa 8)

```bash
curl -s https://<prod-url>/api/v1/health | jq .
```

### Smoke test (etapa 9)

1. Login com Google OAuth
2. Criar nova expedicao (Phase 1 completa)
3. Gerar roteiro com IA (Phase 6)
4. Verificar que badges e pontos sao atribuidos

---

## 3. Checklist de Variaveis de Ambiente

### Variaveis de Infraestrutura (obrigatorias)

| Variavel | Obrigatoria | Descricao | Como Obter |
|----------|-------------|-----------|------------|
| `DATABASE_URL` | Sim | Connection string PostgreSQL | Neon Dashboard > Connection Details |
| `REDIS_URL` | Sim | Connection string Redis (rediss://) | Upstash Console > Database Details |
| `REDIS_TLS_REQUIRED` | Sim | Habilitar TLS para Redis | Valor fixo: `true` |
| `AUTH_SECRET` | Sim | Secret para Auth.js (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | Sim | Alias do AUTH_SECRET | Mesmo valor de AUTH_SECRET |
| `AUTH_URL` | Sim | URL do deploy de producao | URL do deployment Vercel |
| `NEXTAUTH_URL` | Sim | Alias do AUTH_URL | Mesmo valor de AUTH_URL |
| `NEXT_PUBLIC_APP_URL` | Sim | URL publica da aplicacao | Mesmo valor de AUTH_URL |

### Variaveis Funcionais

| Variavel | Obrigatoria | Descricao | Como Obter |
|----------|-------------|-----------|------------|
| `AI_PROVIDER` | Sim | Provider primario de IA | Valor fixo: `gemini` |
| `AI_FALLBACK_PROVIDER` | Sim | Provider de fallback | Valor fixo: `anthropic` |
| `GOOGLE_AI_API_KEY` | Sim | API key do Gemini | Google AI Studio |
| `ANTHROPIC_API_KEY` | Sim | API key do Claude (fallback) | Anthropic Console |
| `GOOGLE_CLIENT_ID` | Sim | OAuth client ID | Google Cloud Console > Credentials |
| `GOOGLE_CLIENT_SECRET` | Sim | OAuth client secret | Google Cloud Console > Credentials |
| `UNSPLASH_ACCESS_KEY` | Sim | Imagens de destinos | Unsplash Developer Portal |
| `ENCRYPTION_KEY` | Sim | Chave AES-256 (64 hex chars) | `openssl rand -hex 32` |

**Importante**: No Vercel, configure cada variavel para o ambiente correto (Preview para staging, Production para producao). Nunca compartilhe secrets entre ambientes.

### Feature Flags de Seguranca

| Variavel | Valores | Default | Descricao |
|----------|---------|---------|-----------|
| `RATE_LIMIT_FAIL_CLOSED_ENABLED` | `true` / `false` | `false` | SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001. Quando `true`, chamadas a `checkRateLimit(..., { failClosed: true })` (login, register, password-reset, admin export, purchase, AI governance) passam a **negar** a requisicao se o Redis estiver inacessivel. Default `false` durante o Sprint 45 (rollout gradual) — flipar para `true` apos 1 sprint de validacao em staging. |

**Plano de rollout** (`RATE_LIMIT_FAIL_CLOSED_ENABLED`):

1. Sprint 45 — merge com default `false`. Nenhuma mudanca de comportamento em producao; codigo novo fica dormente.
2. Sprint 45 (staging) — setar `RATE_LIMIT_FAIL_CLOSED_ENABLED=true` no Vercel Preview e validar que login/register continuam funcionando com Redis saudavel.
3. Sprint 46 — setar `RATE_LIMIT_FAIL_CLOSED_ENABLED=true` em Production apos confirmar alertas de "Redis degradado" ativos. Monitorar logs `rate-limit.redis.unavailable.failClosed`.
4. Sprint 47+ — considerar promover o flag a default `true` no codigo (remover o gate).

**Rollback**: remover a variavel do Vercel ou setar `false` — volta ao comportamento fail-open universal instantaneamente.

---

## 4. Procedimento de Rollback

### Cenario 1 — Rollback via Vercel (mais rapido)

1. Acessar Vercel Dashboard > Deployments
2. Localizar o deployment anterior estavel
3. Clicar nos tres pontos > **Promote to Production**
4. Aguardar o redeploy (geralmente < 1 minuto)

### Cenario 2 — Rollback via Git

```bash
git checkout production
git revert HEAD
git push origin production
```

O Vercel detecta o push e faz redeploy automaticamente.

### Cenario 3 — Rollback de banco de dados

Se uma migration causou problemas:

1. Acessar Neon Dashboard > Settings > **Point-in-Time Recovery**
2. Selecionar timestamp anterior a migration
3. Restaurar para nova branch do Neon
4. Atualizar `DATABASE_URL` no Vercel com a nova connection string
5. Redeploy manual no Vercel

**Atencao**: rollback de banco e destrutivo. Dados inseridos apos a migration serao perdidos.

---

## 5. Health Check

**Endpoint**: `GET /api/v1/health`

**Resposta (200 OK)**:

```json
{
  "status": "healthy",
  "timestamp": "2026-04-08T12:00:00.000Z",
  "version": "0.27.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "available"
  }
}
```

**Resposta (503 Service Unavailable)**:

```json
{
  "status": "degraded",
  "timestamp": "2026-04-08T12:00:00.000Z",
  "version": "0.27.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "disconnected",
    "ai": "available"
  }
}
```

- **200** = todos os servicos operacionais
- **503** = um ou mais servicos degradados
- **Rate limit**: 60 requisicoes/minuto por IP

---

## 6. Comandos Uteis

```bash
# Rodar migrations na DB de producao
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Rodar seed de producao
DATABASE_URL="postgresql://..." npx tsx prisma/seed-production.ts

# Verificar health
curl -s https://<url>/api/v1/health | jq .

# Backup manual do banco
pg_dump $PRODUCTION_DATABASE_URL --format=custom --file=backup-$(date +%Y%m%d).dump

# Restaurar backup
pg_restore --dbname=$DATABASE_URL --clean --if-exists backup-20260408.dump

# Verificar versao deployada
curl -s https://<url>/api/v1/health | jq '.version'

# Limpar cache Redis de producao
redis-cli -u $REDIS_URL FLUSHDB
```

**Nunca execute `FLUSHDB` ou `prisma migrate reset` em producao sem aprovacao do Tech Lead.**
