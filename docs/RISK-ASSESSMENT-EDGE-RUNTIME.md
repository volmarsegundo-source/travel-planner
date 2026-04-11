# RISK ASSESSMENT — Migração Fases 5/6 para Edge Runtime

> **Status**: AVALIAÇÃO — não implementar sem aprovação do tech-lead
> **Data**: 2026-04-10
> **Autores**: architect, security-specialist, tech-lead
> **Contexto**: Vercel Hobby limita serverless a 60s. Gemini consome 35-50s por fase, deixando margem insuficiente para parse/persistência. Phase 5 (guide) e Phase 6 (plan) já apresentam timeouts recorrentes.

---

## Veredito

**Viabilidade: PARCIAL — NÃO RECOMENDADO no curto prazo.**

Migrar as rotas AI para Edge Runtime resolveria o limite de 60s, mas exige **reescrita de 5 camadas transversais** (Prisma, Redis, Auth, Crypto, Rate Limit). O esforço estimado (2-4 dias) e o risco de regressão em funcionalidades já estáveis **não justificam** o ganho quando há alternativas mais baratas e imediatas (ver §7).

O time recomenda **Plano B: upgrade para Vercel Pro ($20/mês)** ou **Plano C: recarga mínima da conta Anthropic** como mitigação imediata, e tratar Edge Runtime como iniciativa de médio prazo se houver justificativa de produto (escala, latência global, redução de custo de serverless).

---

## 1. Situação Atual (fatos da investigação)

| Componente | Arquivo | Edge-ready? |
|---|---|---|
| Phase 6 route | `src/app/api/ai/plan/stream/route.ts` | ❌ Importa `@/server/db` (Prisma), `@/server/cache/redis` (ioredis), `@/lib/auth` (Node) |
| Phase 5 path | `src/server/actions/expedition.actions.ts` → `ai.service.ts:644` | ❌ Server action, mesmo stack Node |
| Prisma | `@prisma/client ^6.0.0` | ⚠️ Versão suporta adapters, mas `driverAdapters` não habilitado no schema e nenhum `@prisma/adapter-*` instalado |
| Redis | `src/server/cache/redis.ts:2` (`ioredis`) | ❌ Node-only, depende de Lua via `EVAL` |
| Rate limiter | `src/lib/rate-limit.ts:13-17` | ❌ Lua script atômico em ioredis |
| NextAuth | `auth.config.ts` (edge) + `auth.ts` (Node) | ⚠️ Split existe, mas rota chama `auth()` do `auth.ts` Node em `plan/stream/route.ts:71` |
| Crypto (AES-256-GCM) | `src/lib/crypto.ts:2` | ❌ Usa `node:crypto` (`createCipheriv`, `randomBytes`) |
| Gemini SDK | `src/server/services/providers/gemini.provider.ts` | ✅ Usa Web APIs (`ReadableStream`, `AbortSignal.timeout`); sem `Buffer` ou `node:crypto` |
| Logger | `src/lib/logger.ts` | ✅ Wrapper de `console`, sem deps Node |
| Sentry | `@sentry/nextjs ^10.47.0` | ✅ SDK suporta Edge (precisa instrumentação explícita) |
| Middleware | `src/middleware.ts` | ✅ Já roda em Edge, usa `authConfig` Edge-safe |
| Env vars | `src/lib/env.ts` (`@t3-oss/env-nextjs`) | ✅ `runtimeEnv` compatível com Edge |
| Itinerary persistence | `itinerary-persistence.service.ts:55-80` | ❌ `db.$transaction` — depende de Prisma |
| Vercel config | `vercel.json` | N/A (não existe) |
| Rotas Edge existentes | — | ❌ Zero (nenhum `runtime = "edge"` fora de middleware) |

---

## 2. Avaliação do @architect

### 2.1 Phase 6 (`/api/ai/plan/stream`)

**Dificuldade de migração: ALTA.**

Não é apenas trocar `export const runtime = 'edge'`. Cada import Node-only precisa ser substituído:

- `auth()` — substituir por leitura direta do JWT via `next-auth/jwt::getToken()` (edge-safe), perdendo refresh automático de sessão.
- `db.*` — exige Prisma driver adapter (`@prisma/adapter-neon` ou `@prisma/adapter-pg`) + `previewFeatures = ["driverAdapters"]` + Neon/Postgres WebSocket endpoint. Impacto global: **todos os call sites que compartilham o mesmo Prisma client** precisariam suportar dual-runtime ou criar client separado para Edge.
- `redis.*` — migrar para `@upstash/redis` (REST). Sem suporte nativo a Lua scripts; rate limiter precisa ser reescrito.
- `itinerary-persistence.service.ts` — precisa do Prisma Edge adapter para o `$transaction`.

**Alternativa mais barata**: extrair apenas a chamada Gemini + streaming para rota Edge (thin proxy), mantendo persistência/auth em rota Node separada chamada após o stream. Mas isso quebra atomicidade (stream sem auth garantido na mesma transação) e introduz complexidade de coordenação cliente↔servidor.

### 2.2 Phase 5 (guide)

Hoje é **server action bloqueante**, sem streaming. Migrar para Edge exige duas etapas independentes:

1. Converter de server action para **API route com streaming** (esforço médio, não depende de Edge).
2. Migrar a nova rota para Edge (mesmos blockers do item 2.1).

**Insight importante**: a etapa 1 sozinha (streaming em rota Node) **já resolve grande parte do problema percebido de timeout** — o usuário vê resultados em <5s e não sente o limite de 60s até o final. Esta é a recomendação do architect.

### 2.3 Prisma no Edge

- Versão 6 suporta driver adapters, mas o projeto **não está configurado**.
- Requer migração do provider no `schema.prisma` + instalação de `@prisma/adapter-neon` (ou `pg` com WebSocket).
- **Risco alto**: Neon é um banco externo; hoje o projeto roda Postgres Docker local. Migração Neon = mudança de infra, não apenas de runtime.
- Alternativa: `@prisma/adapter-pg` com Postgres via WebSocket tunnel — menos maduro, risco de latência maior.

### 2.4 Upstash Redis no Edge

- `@upstash/redis` é Edge-compatible via HTTP REST.
- **Incompatibilidade crítica**: rate limiter usa `redis.eval()` (Lua atômico). Upstash suporta Lua via REST, mas API é diferente. Reescrita necessária em `src/lib/rate-limit.ts`.
- Custo adicional: conta Upstash ($0 free tier até 10k req/dia, depois paga).

### 2.5 APIs Node indisponíveis no Edge

Encontradas no stack atual:
- `node:crypto` (`createCipheriv`, `randomBytes`) — `src/lib/crypto.ts`
- Prisma Client engine (RustBinary/library) — `src/server/db/client.ts`
- `ioredis` (TCP sockets) — `src/server/cache/redis.ts`
- `fs`, `path` — não detectados nas rotas AI ✅
- `Buffer` — não detectado no Gemini provider ✅

### 2.6 Providers AI

- **Gemini**: ✅ totalmente Edge-compatível (`@google/generative-ai` usa `fetch`+`ReadableStream`).
- **Claude**: ✅ `@anthropic-ai/sdk` tem export edge (`@anthropic-ai/sdk/edge`).

### 2.7 Middleware de Auth

Já funciona em Edge — `src/middleware.ts` importa `authConfig` (edge-safe). **Isso é bom**: prova que o split NextAuth foi bem feito no Sprint 2. A rota `plan/stream` é a única que importa o `auth.ts` completo.

---

## 3. Avaliação do @security-specialist

### 3.1 Riscos de segurança adicionais no Edge

| Risco | Severidade | Mitigação |
|---|---|---|
| **Menos visibilidade de logs**: Edge tem logs distribuídos em múltiplas regiões, dificultando correlação de incidentes | MÉDIA | Sentry Edge + request ID propagado em headers |
| **Timeout mais frouxo (sem 60s)**: aumenta superfície para ataques de exaustão de recursos (slowloris-like via stream aberto) | MÉDIA | Manter `AbortSignal.timeout()` explícito (50s) e rate limit por usuário |
| **Cold start menor = rate limit mais crítico**: sem o buffer do cold start serverless, ataques burst atingem mais rápido | BAIXA | Rate limit já existe; migrar para `@upstash/redis` fixed-window |
| **Env vars expostos em múltiplos PoPs**: secrets replicados em todas as regiões Edge | BAIXA | Vercel criptografa secrets at rest; não é risco real, apenas superfície ampliada |

### 3.2 Env vars no Edge

- `@t3-oss/env-nextjs` suporta Edge via `runtimeEnv` (confirmado em `src/lib/env.ts`).
- `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `DATABASE_URL` — todos acessíveis via `process.env` no Edge runtime.
- **Sem risco novo** de vazamento por runtime; os mesmos controles de secrets da Vercel se aplicam.

### 3.3 Rate Limiting no Edge

- `ioredis` + Lua **não funciona**.
- Caminho: migrar para `@upstash/redis` + `@upstash/ratelimit` (biblioteca oficial, edge-ready, algoritmos sliding window).
- **Risco de regressão**: a lógica atomic do Lua atual precisa ser validada no novo algoritmo. Testes de integração do rate limiter precisam rodar novamente.

### 3.4 Source maps e Sentry

- `@sentry/nextjs ^10.47.0` suporta Edge runtime via `Sentry.init()` em `sentry.edge.config.ts`.
- Source maps funcionam via upload no build (Vercel integration).
- **Ação necessária** se migrar: criar `sentry.edge.config.ts` e configurar `withSentryConfig` no `next.config.js`.

### 3.5 Exposição de dados sensíveis na rede de borda

- Edge roda **mais perto do usuário** — dados processados em PoPs globais. Se GDPR exigir residência na UE, rotas Edge podem rodar fora da UE por padrão.
- **Ação necessária**: configurar `preferredRegion` explícito (`export const preferredRegion = ['fra1']`) para manter dados na UE.
- Booking codes cifrados AES-256-GCM passam pelo Edge — se crypto for reescrito com Web Crypto API, **exige validação criptográfica** de que o novo código usa IV aleatório e authTag corretamente. Erro aqui é vulnerabilidade crítica.

**Recomendação security**: não migrar até que `src/lib/crypto.ts` tenha testes de paridade Web Crypto vs `node:crypto` e seja revisado por security-specialist. Risco de quebrar confidencialidade dos booking codes.

---

## 4. Matriz de Riscos Consolidada

| ID | Risco | Severidade | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|---|
| R-01 | Prisma Edge adapter exige troca de infra de DB (Neon/Postgres WS) | 🔴 ALTA | Alta | Migração de dados, downtime | Manter Postgres local e não migrar DB |
| R-02 | Reescrita do `crypto.ts` com Web Crypto pode quebrar confidencialidade de booking codes | 🔴 ALTA | Média | Vazamento de PII (PCI-like) | Testes de paridade + audit security |
| R-03 | Rate limiter Lua → Upstash REST quebra atomicidade | 🟡 MÉDIA | Média | Rate limit furado → abuso de API AI ($$) | Usar `@upstash/ratelimit` oficial |
| R-04 | Custo Upstash excede free tier em produção | 🟡 MÉDIA | Baixa | +$5-20/mês | Monitorar uso; Upstash pay-per-request |
| R-05 | Perda de funcionalidade `auth()` com PrismaAdapter na rota | 🟡 MÉDIA | Alta | Sessão não é refreshed em Edge | Usar `getToken()` direto do JWT |
| R-06 | Edge roda fora da UE por padrão → GDPR | 🟡 MÉDIA | Alta | Compliance risk | `preferredRegion` explícito |
| R-07 | Dual-runtime (Node + Edge no mesmo app) aumenta superfície de bugs | 🟡 MÉDIA | Alta | Bugs sutis de "funciona local, falha em prod" | Adotar testes E2E por runtime |
| R-08 | Quebra do Sentry durante migração dificulta debugar incidentes | 🟢 BAIXA | Média | Observabilidade degradada | Configurar `sentry.edge.config.ts` antes |
| R-09 | Streaming Gemini Edge sem auth fresh = BOLA se JWT expirado não é verificado | 🔴 ALTA | Baixa | Acesso não autorizado a AI costoso | Validar JWT explicitamente no handler Edge |
| R-10 | Rollback difícil se Edge não funcionar (deploy já feito, usuários afetados) | 🟡 MÉDIA | Média | 1-2 dias de retrabalho | Feature flag `USE_EDGE_RUNTIME` + canary |

**Riscos 🔴 ALTA (3)** são bloqueadores para migração no curto prazo.

---

## 5. Avaliação do @tech-lead

### 5.1 Estimativa de Esforço

| Tarefa | Esforço | Observação |
|---|---|---|
| Fase 6: migrar para Edge (sem Prisma Edge adapter) | **6-10h** | Thin proxy Edge + Node route para persistência — quebra atomicidade |
| Fase 6: migrar completo com Prisma Edge adapter | **14-20h** | Inclui `@prisma/adapter-neon` + migração de infra DB (risco alto R-01) |
| Fase 5: streaming em rota Node (sem Edge) | **4-6h** | ✅ **ALTO ROI** — resolve 80% do problema sem riscos de Edge |
| Fase 5: streaming + Edge | **10-14h** | Depende de Fase 6 Edge estar pronto |
| Reescrita `crypto.ts` com Web Crypto + testes de paridade | **4-6h** | Precisa review security (R-02) |
| Migração rate limiter para `@upstash/ratelimit` | **3-5h** | Impacta todas as rotas atualmente protegidas |
| Configurar `sentry.edge.config.ts` | **1-2h** | Baixo risco |
| Testes E2E duplicados (Node + Edge) | **4-6h** | Bloqueador para rollback seguro |
| **TOTAL migração completa** | **34-55h (4-7 dias)** | Com riscos R-01, R-02, R-09 |
| **TOTAL Plano recomendado (só streaming Fase 5)** | **4-6h (meio dia)** | Sem Edge, sem riscos novos |

### 5.2 Risco de regressão

- **Alto** no caminho Edge completo: toca Prisma, Redis, Auth, Crypto — camadas usadas por **toda** a aplicação, não apenas Phases 5/6.
- **Baixo** no caminho streaming-only: mudança isolada na geração do guide, sem impactar Auth/DB/Crypto.

### 5.3 Plano de Rollback

Se Edge for implementado e falhar em produção:

1. **Feature flag obrigatório**: `NEXT_PUBLIC_USE_EDGE_AI=true|false` lido no cliente para decidir qual endpoint chamar.
2. **Duas rotas paralelas** durante transição: `/api/ai/plan/stream` (Node, estável) + `/api/ai/plan/stream/edge` (Edge, novo).
3. **Canary**: 10% do tráfego no Edge por 48h, monitorar Sentry + latência.
4. **Rollback em <5min**: flipar feature flag via Vercel env var, sem redeploy.

Sem este plano, rollback é deploy reverso → 15-30min de janela de risco.

### 5.4 Alternativas (do mais barato ao mais caro)

| Alternativa | Custo | Esforço | Ganho | Recomendação |
|---|---|---|---|---|
| **A. Streaming na Fase 5 (rota Node)** | $0 | 4-6h | Elimina 80% dos timeouts percebidos | ⭐ **FAZER AGORA** |
| **B. Recarregar Anthropic ($10)** | $10 | 0h | Claude com prompt caching é 2-3x mais rápido | ⭐ **PARALELO** |
| **C. Reduzir `maxTokens` Phase 6 para 6K** | $0 | 1h | Reduz latência 15-20% | Quick win, já feito parcialmente |
| **D. Vercel Pro** | $20/mês | 0h | `maxDuration = 300s`, fim do limite | ⭐ **SE A+B+C não bastarem** |
| **E. Edge Runtime (parcial, thin proxy)** | $0-5 | 10-14h | Remove limite 60s, mas quebra atomicidade | Médio prazo |
| **F. Edge Runtime (completo)** | $0-20 | 34-55h | Solução definitiva | Longo prazo, após Vercel Pro saturar |

**ROI decrescente**: A ($0 / 6h) → B ($10 / 0h) → D ($20/mês / 0h) → F ($$/dias).

---

## 6. Recomendação do Time

**NÃO migrar para Edge Runtime no Sprint atual.** Adotar em sequência:

1. **Imediato (esta semana)**: converter Phase 5 para streaming em rota Node (`src/app/api/ai/guide/stream/route.ts`). Esforço 4-6h, zero risco arquitetural. Resolve a percepção de timeout ao dar feedback visual imediato ao usuário. — Owner: `dev-fullstack-1`
2. **Imediato (paralelo)**: recarregar conta Anthropic com $10 e ativar fallback automático Gemini→Claude quando Gemini timeouter. Claude com prompt caching é mensurável 40-60% mais rápido. — Owner: `devops-engineer`
3. **Contingência (próxima semana)**: se #1 e #2 não resolverem, upgrade para Vercel Pro ($20/mês). Elimina o limite de 60s sem tocar em código. — Owner: `tech-lead` + aprovação do stakeholder
4. **Médio prazo (backlog Sprint +2)**: criar SPEC-ARCH para migração Edge Runtime completa, contemplando Prisma adapter, Upstash migration, Web Crypto rewrite, e canary com feature flag. Só justificável se escala global (latência) virar requisito de produto. — Owner: `architect`

**Justificativa**: o custo combinado de Plano A+B+D é **$20/mês + 6h de dev**, versus **34-55h + riscos 🔴 ALTA** do Edge Runtime. Edge é a solução certa para o problema errado neste momento — o problema é *custo de infra*, não *arquitetura*.

---

## 7. Plano de Implementação (se Edge for aprovado no futuro)

### Fase 0 — Pré-requisitos (não-bloqueantes, podem começar agora)
- [ ] ADR-029: decisão de adotar Prisma driver adapter (Neon ou pg-WS)
- [ ] ADR-030: migração `ioredis` → `@upstash/redis`
- [ ] SPEC-SEC-XXX: reescrita `crypto.ts` com Web Crypto API + testes de paridade
- [ ] Instalar `@sentry/nextjs` edge config (`sentry.edge.config.ts`)

### Fase 1 — Preparar camada de dados (5-8h)
- [ ] Habilitar `previewFeatures = ["driverAdapters"]` em `prisma/schema.prisma`
- [ ] Instalar `@prisma/adapter-neon` ou `@prisma/adapter-pg`
- [ ] Criar `src/server/db/edge-client.ts` (Prisma client compatível com Edge)
- [ ] Migrar DB para Neon (ou configurar pg-WS) — validar em staging
- [ ] Testes de integração com novo adapter

### Fase 2 — Preparar camada de cache (3-5h)
- [ ] Criar conta Upstash (free tier)
- [ ] Criar `src/server/cache/edge-redis.ts` usando `@upstash/redis`
- [ ] Migrar rate limiter para `@upstash/ratelimit`
- [ ] Testes de integração do novo rate limiter

### Fase 3 — Preparar camada cripto (4-6h)
- [ ] Reescrever `src/lib/crypto.ts` com Web Crypto API
- [ ] Testes de paridade: encrypt Node → decrypt Web, encrypt Web → decrypt Node
- [ ] Audit security-specialist (🔴 obrigatório)

### Fase 4 — Preparar camada auth (3-4h)
- [ ] Criar helper `src/lib/auth-edge.ts` usando `next-auth/jwt::getToken()`
- [ ] Validar flow de sessão sem PrismaAdapter
- [ ] Testes de auth em Edge (JWT expirado, revogado, válido)

### Fase 5 — Migrar Phase 6 (3-5h)
- [ ] Adicionar `export const runtime = 'edge'` em `plan/stream/route.ts`
- [ ] Substituir imports: `@/lib/auth` → `@/lib/auth-edge`, `@/server/db` → `@/server/db/edge-client`, `@/server/cache/redis` → `@/server/cache/edge-redis`
- [ ] Configurar `preferredRegion = ['fra1']` (GDPR)
- [ ] Criar sentry.edge.config.ts
- [ ] Feature flag `NEXT_PUBLIC_USE_EDGE_AI`

### Fase 6 — Migrar Phase 5 (4-6h)
- [ ] Criar `src/app/api/ai/guide/stream/route.ts` (Edge, streaming)
- [ ] Migrar `generateDestinationGuide` para streaming (sem server action)
- [ ] Atualizar cliente `DestinationGuideV2.tsx` para consumir SSE

### Fase 7 — Testes e canary (4-6h)
- [ ] Testes E2E duplicados (Node + Edge) com Playwright
- [ ] Deploy canary: 10% tráfego Edge, 48h de monitoramento
- [ ] Rollout gradual: 25% → 50% → 100% com intervalo de 24h
- [ ] Post-mortem obrigatório se qualquer métrica de latência/erro degradar

### Métricas de sucesso
- P95 latência Phase 5 < 30s (hoje: timeout)
- P95 latência Phase 6 < 45s (hoje: timeout)
- Taxa de erro 5xx < 0.5%
- Zero regressão de segurança (audit security-specialist)
- Zero perda de dados em migração DB

---

## 8. Anexos

### A. Arquivos impactados em migração completa

**Must-change (7 arquivos)**:
- `src/app/api/ai/plan/stream/route.ts`
- `src/server/actions/expedition.actions.ts` (generateDestinationGuide)
- `src/server/db/client.ts` (criar edge variant)
- `src/server/cache/redis.ts` (criar edge variant)
- `src/lib/auth.ts` (criar edge variant)
- `src/lib/crypto.ts` (reescrita Web Crypto)
- `src/lib/rate-limit.ts` (reescrita Upstash)

**Must-configure (3 arquivos)**:
- `prisma/schema.prisma` (+driverAdapters)
- `package.json` (+@prisma/adapter-*, +@upstash/redis, +@upstash/ratelimit)
- `sentry.edge.config.ts` (novo)

**May-change (N arquivos)**: todas as rotas que hoje importam `@/lib/rate-limit` podem precisar de ajuste se API do rate limiter mudar.

### B. Referências
- Vercel Edge Runtime: https://vercel.com/docs/functions/runtimes/edge-runtime
- Prisma Driver Adapters: https://www.prisma.io/docs/orm/overview/databases/database-drivers
- Upstash Rate Limit: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- NextAuth Edge: https://authjs.dev/guides/edge-compatibility
- Web Crypto AES-GCM: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt#aes-gcm

### C. Histórico de decisão
- 2026-04-10: avaliação inicial, recomendação NÃO migrar no Sprint atual
- Próxima revisão: se Plano A+B+D não resolver timeouts em 2 semanas
