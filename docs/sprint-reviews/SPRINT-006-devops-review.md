# Sprint 6 -- Review do DevOps Engineer

**Reviewer**: devops-engineer
**Data**: 2026-03-04
**Branch**: `feat/sprint-6`
**Versao**: 0.5.0 -> 0.6.0 (pendente bump)
**Testes**: 297 passando, 0 falhas
**Build**: limpo

---

## Escopo da Review

Itens do Sprint 6 revisados sob a otica de infraestrutura, CI/CD, variaveis de ambiente e paridade entre ambientes:

| Tarefa | Descricao | Status |
|--------|-----------|--------|
| T-038 | CSP nonce por request no middleware | Entregue |
| T-039 | Rate limiter atomico com Lua script Redis | Entregue |
| T-043 | Playwright workers/timeout condicional por ambiente | Entregue |
| T-044 | REDIS_HOST/REDIS_PORT documentados no .env.example | Entregue |

---

## 1. Configuracoes de Infraestrutura

### 1.1 CSP Nonce no Middleware (T-038)

**Arquivo**: `src/middleware.ts` (linhas 29-116)

**Avaliacao: APROVADO com observacoes**

Pontos positivos:
- Nonce gerado via `crypto.randomUUID()` por request -- criptograficamente seguro e disponivel no Edge Runtime
- CSP de producao remove `'unsafe-eval'` de `script-src` -- correto, elimina vetor de XSS
- CSP de desenvolvimento mantem `'unsafe-eval'` e `ws:` em `connect-src` -- necessario para HMR/Turbopack
- Headers de seguranca adicionais corretos: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva
- HSTS (`Strict-Transport-Security`) aplicado apenas fora de desenvolvimento -- correto, evita bloqueio de localhost
- Nonce encaminhado via header `x-nonce` para consumo no layout

Observacoes tecnicas:

1. **`style-src 'unsafe-inline'` permanece em producao** -- esta e uma decisao consciente e aceitavel neste momento. O Tailwind CSS e varias bibliotecas UI (Radix UI, class-variance-authority) injetam estilos inline que nao suportam nonce de forma nativa. Remover `'unsafe-inline'` de `style-src` quebraria a renderizacao. Para o MVP, o risco e aceitavel porque `script-src` (o vetor de XSS mais critico) ja esta protegido por nonce. Em sprint futuro, considerar migrar para hashes SHA-256 de estilos inline ou usar `'nonce-...'` para `style-src` quando as dependencias suportarem.

2. **Nonce nao e consumido no layout root** -- O `x-nonce` header e injetado no middleware mas o `src/app/[locale]/layout.tsx` atual (linhas 19-41) nao faz `headers().get('x-nonce')` para propagar o nonce para scripts inline via `<script nonce={nonce}>`. Enquanto a aplicacao nao tiver scripts inline manuais no layout, isto nao e um problema funcional. Porem, quando um script inline for necessario (ex: Sentry client init, analytics), o nonce devera ser propagado ou a CSP bloqueara o script. **Acao recomendada para Sprint 7**: documentar o padrao de consumo do nonce no layout para evitar surpresas.

3. **`connect-src 'self' https:`** em producao permite conexoes a qualquer dominio HTTPS. Para o MVP e aceitavel pois a aplicacao conecta a multiplas APIs externas (Anthropic, Upstash, Sentry, Mapbox). Em uma fase de endurecimento pos-MVP, considerar restringir a dominios especificos.

4. **API routes (`/api/*`) bypassed completamente** -- o `return` na linha 56 nao aplica CSP em respostas de API. Isto e correto para JSON APIs (CSP e um header de navegacao, nao de API), mas deve ser documentado para que futuros desenvolvedores nao esperem protecao CSP em rotas de API.

### 1.2 Rate Limiter Atomico (T-039)

**Arquivo**: `src/lib/rate-limit.ts` (linhas 1-43)

**Avaliacao: APROVADO**

Pontos positivos:
- Script Lua atomico (`INCR` + `EXPIRE` condicional) elimina a race condition anterior onde `INCR` podia suceder e `EXPIRE` falhar, deixando chave sem TTL (leak de memoria + bloqueio permanente)
- `redis.eval()` envia o script em uma unica chamada de rede -- performance otima
- Fallback gracioso quando Redis esta indisponivel: `allowed: true` -- a aplicacao nao bloqueia usuarios quando Redis cai
- `server-only` importado corretamente -- o rate limiter nunca sera incluido em bundles de cliente
- Interface publica preservada (`RateLimitResult`) -- retrocompativel com consumidores existentes
- Chave com janela temporal (`ratelimit:{key}:{window}`) permite que o rate limit se reset naturalmente sem depender de logica de limpeza
- Testes unitarios cobrem: contagem dentro do limite, no limite, acima do limite, atomicidade do eval, fallback Redis offline, formato da chave

Impacto em staging/producao:
- Redis Lua scripts sao suportados pelo Upstash (tier gratuito e pago) sem restricao -- confirmado na documentacao Upstash
- O script Lua e idempotente e nao bloqueia outros clientes Redis -- operacao segura para uso concorrente
- O `EXPIRE` condicional (`count == 1`) garante que o TTL e definido apenas na primeira requisicao da janela, evitando reset acidental do TTL em requisicoes subsequentes

Observacao:
- `generateTravelPlanAction` usa `checkRateLimit('ai:plan:{userId}', 10, 3600)` e `generateChecklistAction` usa `checkRateLimit('ai:checklist:{userId}', 5, 3600)` -- limites adequados para protecao de custo da API Anthropic.

### 1.3 Docker Compose

**Arquivo**: `docker-compose.yml`

**Avaliacao: SEM ALTERACOES -- OK**

O Docker Compose nao foi modificado no Sprint 6, o que e correto. As mudancas de CSP e rate limiter sao de nivel de aplicacao e nao afetam a infra local. PostgreSQL 16-alpine e Redis 7-alpine permanecem como imagens base. Healthchecks mantidos.

### 1.4 Dockerfile

**Arquivo**: `Dockerfile`

**Avaliacao: SEM ALTERACOES -- OK**

O Dockerfile multi-stage permanece inalterado. O issue C-001 da Sprint 2 (Dockerfile nao existe no repo) ja foi resolvido em sprint anterior. O build de producao com `output: "standalone"` no `next.config.ts` continua compativel.

---

## 2. Variaveis de Ambiente (Completude e Seguranca)

### 2.1 .env.example (T-044)

**Arquivo**: `.env.example` (linhas 17-19)

**Avaliacao: APROVADO com observacao**

Adicionado:
```
# Redis host/port (used by ioredis client in src/server/cache/redis.ts)
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

Pontos positivos:
- Comentario explica o proposito e referencia o arquivo que consome essas variaveis
- Valores padrao `localhost` e `6379` corretos para ambiente local

Observacao critica -- **REDIS_HOST e REDIS_PORT nao sao consumidos pelo codigo atual**:

O cliente Redis em `src/server/cache/redis.ts` (linha 10) usa `env.REDIS_URL` (connection string completa) via o modulo de validacao `src/lib/env.ts`. Nao ha referencia a `REDIS_HOST` nem `REDIS_PORT` em nenhum arquivo `.ts`/`.tsx` do projeto. Essas variaveis tambem nao estao registradas no schema de validacao `@t3-oss/env-nextjs` em `src/lib/env.ts`.

Impacto: **Nenhum impacto funcional negativo** -- as variaveis simplesmente existem no template mas nao sao usadas. Nao ha risco de seguranca. Porem, documentar variaveis que nao sao consumidas pode confundir novos desenvolvedores.

**Recomendacao**: Duas opcoes, ambas aceitaveis:
1. Manter as variaveis no `.env.example` como referencia para ferramentas externas (ex: docker-compose, scripts de diagnostico, ferramentas de monitoramento) -- nesse caso, adicionar comentario clarificando que sao para referencia e nao para a aplicacao Next.js
2. Remover e documentar que o acesso ao Redis e feito exclusivamente via `REDIS_URL`

Nenhuma das opcoes e bloqueante. O template `.env.example` esta completo para onboarding de novos desenvolvedores.

### 2.2 Validacao de Env Vars (env.ts)

**Arquivo**: `src/lib/env.ts`

**Avaliacao: SEM ALTERACOES -- OK**

O schema de validacao `@t3-oss/env-nextjs` nao foi alterado no Sprint 6. Todas as variaveis obrigatorias continuam validadas no startup. A validacao de `REDIS_URL` com `REDIS_TLS_REQUIRED` permanece correta (nao acoplada a `NODE_ENV`).

### 2.3 CI Environment Variables

**Arquivo**: `.github/workflows/ci.yml` (linhas 73-82)

**Avaliacao: OK -- sem necessidade de alteracao**

As variaveis de ambiente do CI incluem `REDIS_URL: redis://localhost:6379` e `SKIP_ENV_VALIDATION: "true"`. Nao e necessario adicionar `REDIS_HOST`/`REDIS_PORT` ao CI pois o codigo nao as consome. O Redis service container do CI na porta 6379 permanece correto para o rate limiter atomico que foi alterado.

### 2.4 Deploy Environment Variables

**Arquivo**: `.github/workflows/deploy.yml`

**Avaliacao: SEM IMPACTO DO SPRINT 6**

O deploy.yml nao precisa de `REDIS_HOST`/`REDIS_PORT`. As variaveis de staging/producao (Upstash) sao configuradas via GitHub Secrets (`STAGING_REDIS_URL`, `PRODUCTION_REDIS_URL`). O rate limiter atomico com Lua script funciona identicamente em Redis local e Upstash -- nao requer variaveis adicionais.

---

## 3. Paridade de Ambiente (Local / Staging / Producao)

### 3.1 CSP por Ambiente

| Aspecto | Local (dev) | Staging | Producao |
|---------|-------------|---------|----------|
| `script-src` | `'self' 'nonce-...' 'unsafe-eval'` | `'self' 'nonce-...'` | `'self' 'nonce-...'` |
| `style-src` | `'self' 'unsafe-inline'` | `'self' 'unsafe-inline'` | `'self' 'unsafe-inline'` |
| `connect-src` | `'self' https: ws:` | `'self' https:` | `'self' https:` |
| HSTS | Nao | Sim | Sim |
| Nonce | Sim (UUID por request) | Sim (UUID por request) | Sim (UUID por request) |

A diferenciacao e feita via `process.env.NODE_ENV === "development"` (linha 27 do middleware). Em staging e producao no Vercel, `NODE_ENV` e `"production"`, portanto ambos recebem a CSP restritiva. Correto e consistente.

**Validacao de paridade**: A unica diferenca intencional entre local e staging/producao e a inclusao de `'unsafe-eval'` e `ws:` no desenvolvimento, necessarios para HMR e WebSocket do Turbopack. Em staging/producao essas diretivas sao corretamente removidas. Paridade confirmada.

### 3.2 Rate Limiter por Ambiente

| Aspecto | Local (dev) | CI | Staging | Producao |
|---------|-------------|---|---------|----------|
| Redis | Docker container (porta 6379) | Service container (porta 6379) | Upstash | Upstash |
| Lua script | Suportado | Suportado | Suportado | Suportado |
| Fallback (Redis offline) | Permite request | Permite request | Permite request | Permite request |

Paridade confirmada. O script Lua e identico em todos os ambientes. O fallback `allowed: true` quando Redis esta indisponivel e consistente.

### 3.3 Docker Compose vs. CI Services

| Servico | Docker Compose (local) | CI Service Container |
|---------|------------------------|---------------------|
| PostgreSQL | `postgres:16-alpine` | `postgres:16-alpine` |
| Redis | `redis:7-alpine` | `redis:7-alpine` |
| Healthcheck | `pg_isready` / `redis-cli ping` | `pg_isready` / `redis-cli ping` |

**Paridade confirmada** -- mesmas imagens, mesma versao, mesmos healthchecks.

---

## 4. CI/CD (Playwright Config, Build Pipeline)

### 4.1 Playwright Config (T-043)

**Arquivo**: `playwright.config.ts`

**Avaliacao: APROVADO**

Alteracoes entregues:

```typescript
workers: process.env.CI ? 1 : undefined,      // CI: 1 worker (estabilidade), local: auto
timeout: process.env.CI ? 90_000 : 45_000,    // CI: 90s, local: 45s
retries: process.env.CI ? 2 : 1,              // CI: 2 retries, local: 1
```

Analise:

1. **Workers = 1 em CI**: Correto. GitHub Actions runners (ubuntu-latest) tem 2 vCPUs e 7GB RAM. Rodar multiplos workers Playwright causa contenco de CPU que resulta em timeouts intermitentes e falsos negativos. Worker unico garante estabilidade dos testes.

2. **Timeout = 90s em CI**: Adequado. O spec original em `docs/sprint-planning-6-7.md` sugeria 60s, mas 90s e mais conservador e adequado para CI, onde a latencia e variavel. Localmente 45s e suficiente para feedback rapido.

3. **Retries = 2 em CI**: Correto. Mitiga falhas intermitentes (flaky tests) sem mascarar problemas reais. Localmente 1 retry e suficiente.

4. **`forbidOnly: !!process.env.CI`**: Ja existia -- previne que `.only()` esquecido passe no CI. Correto.

5. **WebServer**: `process.env.CI ? "npm run start" : "npm run dev"` -- ja existia desde antes. Em CI, a aplicacao e servida com `npm run start` (build de producao), garantindo paridade com staging/producao.

6. **`reuseExistingServer: !process.env.CI`**: Correto. Em CI, o Playwright inicia seu proprio servidor. Localmente, reutiliza o servidor ja rodando.

Observacao sobre projetos de teste:
- 6 projetos definidos (chromium, desktop-1280, firefox, webkit, Mobile Chrome, smoke). Em CI, o job E2E roda `--project=chromium` (ci.yml, linha 219). Apenas o projeto `chromium` e executado em CI, o que e adequado para a fase atual. Multi-browser pode ser habilitado em sprint futuro quando o test suite estiver mais maduro.

### 4.2 Pipeline CI (ci.yml)

**Avaliacao: SEM ALTERACOES NECESSARIAS PARA SPRINT 6**

O pipeline CI existente suporta todas as mudancas do Sprint 6 sem alteracao:
- O rate limiter atomico roda em testes unitarios (mockado) -- nao requer Redis real
- A CSP e testada via testes unitarios do middleware (`tests/unit/middleware/csp.test.ts`)
- A configuracao condicional do Playwright so entra em efeito quando `CI=true` -- nao afeta testes unitarios

**Issues pendentes de sprints anteriores** (reiterados para visibilidade):

| Issue | Descricao | Severidade | Status |
|-------|-----------|------------|--------|
| C-001 | Dockerfile deve existir no repo para `docker build` no CI funcionar | Critico | Resolvido (Dockerfile presente) |
| C-002 | ci.yml/deploy.yml ja apontam para `master` (branch real do repo) | Critico | Resolvido |
| C-003 | deploy.yml usa `echo` placeholders nas steps de deploy | Alto | **Pendente** |
| A-001 | Trivy usa `docker run` em vez de `trivy-action` -- sem SARIF upload | Medio | **Pendente** -- `docs/infrastructure.md` tem spec corrigido com `aquasecurity/trivy-action@master` mas `ci.yml` real usa `docker run` |
| A-003 | `RAILWAY_TOKEN` unico para staging+producao | Medio | **Pendente** |

### 4.3 Deploy Pipeline (deploy.yml)

**Avaliacao: SEM ALTERACOES -- ISSUES PENDENTES REITERADOS**

O deploy.yml nao foi alterado no Sprint 6. As steps de deploy continuam como placeholders (`echo "Deploy to staging..."` / `echo "Deploy to production..."`). Este nao era escopo do Sprint 6, mas permanece como debito tecnico para sprints futuros antes do deploy para staging/producao real.

---

## 5. Riscos de Deployment

### 5.1 Riscos Novos Introduzidos no Sprint 6

| Risco | Severidade | Probabilidade | Mitigacao |
|-------|-----------|---------------|-----------|
| CSP bloqueia script inline futuro | Media | Media | Nonce esta disponivel via `x-nonce` header. Documentar padrao de consumo no layout. Testar toda pagina nova em staging antes de producao. |
| `style-src 'unsafe-inline'` permite injecao de estilo | Baixa | Baixa | Vetor de ataque limitado (CSS injection e menos critico que JS injection). `script-src` esta protegido por nonce. Acompanhar suporte a nonce em Tailwind/Radix para remover `unsafe-inline` no futuro. |
| Rate limiter Lua script rejeitado por Redis proxy | Baixa | Muito Baixa | Upstash suporta `EVAL` com Lua scripts. Testado em documentacao oficial. Se um proxy intermediario bloquear `EVAL`, o fallback `allowed: true` mantem a aplicacao funcional. |
| REDIS_HOST/REDIS_PORT no .env.example geram confusao | Muito Baixa | Media | Variaveis existem no template mas nao sao consumidas pelo codigo. Impacto e confusao, nao erro. Adicionar comentario clarificando. |

### 5.2 Riscos Existentes Inalterados

Os riscos documentados em `docs/infrastructure.md` (secao "Infrastructure Risks") permanecem validos e nao foram agravados pelas mudancas do Sprint 6.

---

## 6. Testes de Infraestrutura

### 6.1 Testes Adicionados no Sprint 6

| Arquivo | Cobertura |
|---------|-----------|
| `tests/unit/middleware/csp.test.ts` | UUID valido, CSP producao sem unsafe-eval, CSP dev com unsafe-eval+ws, script-src sem unsafe-inline, nonce unico por request |
| `tests/unit/lib/rate-limit.test.ts` | Dentro do limite, no limite, acima do limite, atomicidade Lua, fallback Redis offline, formato de chave temporal |
| `tests/unit/server/ai.actions.test.ts` | Rate limit em generateChecklistAction e generateTravelPlanAction, chaves de rate limit por acao, resposta rateLimitExceeded |
| `tests/unit/app/auth-layout.test.tsx` | Header e Footer presentes no layout de auth |

**Avaliacao**: Cobertura de testes adequada para as mudancas de infra. Os testes de CSP validam a logica de construcao da policy, nao a integracao com o Edge Runtime (que requer testes E2E). Os testes de rate limit validam o contrato da interface sem depender de Redis real.

### 6.2 Observacao sobre Testes de CSP

Os testes em `tests/unit/middleware/csp.test.ts` testam a logica de construcao da CSP string, mas nao testam o middleware real (que depende de APIs do Edge Runtime). Isto e aceitavel para testes unitarios. A validacao real da CSP deve ser feita via:
1. Inspecao manual no DevTools (Network > Response Headers > Content-Security-Policy)
2. Testes E2E que verificam ausencia de erros CSP no console do navegador (recomendado para Sprint 7)

---

## 7. Checklist de Conformidade DevOps

| Item | Status | Notas |
|------|--------|-------|
| next.config.ts -- `output: "standalone"` | OK | Mantido. Necessario para Docker e Vercel |
| next.config.ts -- headers de seguranca | OK | Removidos do config (corretamente migrados para middleware dinamico) |
| Dockerfile -- sem alteracoes quebradoras | OK | Nao alterado |
| docker-compose.yml -- sem alteracoes | OK | Nao alterado |
| .env.example -- atualizado com novas vars | OK | REDIS_HOST/REDIS_PORT adicionados (T-044) |
| CI pipeline -- funcional com mudancas | OK | Nenhuma alteracao necessaria no ci.yml |
| Deploy pipeline -- sem impacto | OK | Nenhuma alteracao necessaria no deploy.yml |
| Secrets -- nenhum novo secret necessario | OK | CSP nonce e gerado em runtime, nao requer secret |
| Paridade local/staging/prod | OK | CSP diferenciada por NODE_ENV (intencional) |
| Build limpo (`npm run build`) | OK | Confirmado -- 297 testes, 0 falhas |

---

## 8. Acoes Recomendadas para Proximos Sprints

### Prioridade Alta (Sprint 7)
1. **Documentar consumo do nonce no layout** -- Criar exemplo em `docs/` ou comentario em `src/app/[locale]/layout.tsx` mostrando como usar `headers().get('x-nonce')` quando scripts inline forem necessarios
2. **Clarificar REDIS_HOST/REDIS_PORT no .env.example** -- Adicionar comentario dizendo que sao para referencia/ferramentas externas e que a aplicacao usa `REDIS_URL`

### Prioridade Media (Sprint 8+)
3. **Resolver C-003** -- Substituir `echo` placeholders no deploy.yml por deploy real (Vercel CLI ou Railway CLI)
4. **Resolver A-001** -- Migrar Trivy de `docker run` para `aquasecurity/trivy-action@master` com upload SARIF
5. **Resolver A-003** -- Separar `RAILWAY_TOKEN` em `RAILWAY_TOKEN_STAGING` e `RAILWAY_TOKEN_PRODUCTION`
6. **Teste E2E de CSP** -- Adicionar teste Playwright que verifica ausencia de erros CSP no console do navegador

### Prioridade Baixa (pos-MVP)
7. **Remover `style-src 'unsafe-inline'`** -- Quando Tailwind/Radix suportarem nonce para estilos inline
8. **Restringir `connect-src`** -- Substituir `https:` por lista explicita de dominios permitidos

---

## 9. Veredito

**APROVADO** -- Todas as mudancas do Sprint 6 no escopo de infraestrutura, variaveis de ambiente, CI/CD e paridade de ambientes estao corretas e seguras para merge.

Justificativa:
- T-038 (CSP nonce): Implementacao correta, segura, com diferenciacao adequada entre ambientes
- T-039 (Rate limiter atomico): Eliminacao da race condition confirmada, fallback gracioso preservado
- T-043 (Playwright config): Configuracao condicional CI/local otima para estabilidade e DX
- T-044 (.env.example): Documentacao adicionada, sem impacto funcional
- Nenhum risco bloqueante identificado
- Paridade entre ambientes mantida
- 297 testes passando, build limpo

> APROVADO -- Nenhum bloqueio de infraestrutura ou deployment. Mudancas seguras para merge em `master`.

---

*Review realizada pelo devops-engineer em 2026-03-04.*
*Proxima review obrigatoria: Sprint 7.*
