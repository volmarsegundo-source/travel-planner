# Sprint 41 — POLISH + BETA LAUNCH

**Versao**: 3.0.0
**Target**: v0.58.0
**Data**: 2026-04-07
**Specs reservados**: SPEC-PROD-056 a SPEC-PROD-064

---

## Resumo Executivo

39 tarefas, ~107 horas estimadas, 7 agentes envolvidos. Execucao em 3 fases: (1) polimento paralelo, (2) deploy sequencial, (3) beta tooling. Target: 130/130 E2E, Lighthouse > 90, zero vulnerabilidades criticas, dominio de producao ativo, ambientes staging/prod separados, multi-provider AI operacional.

---

## User Stories

### US-S41-001 — SEO da Landing Page (P0, 5 pts, SPEC-PROD-056)

**Como** viajante que pesquisa "planejador de viagem com IA" no Google,
**quero** encontrar o Atlas nos resultados com titulo, descricao e imagem relevantes,
**para** descobrir a plataforma organicamente.

**Criterios de Aceite:**
- `<title>` unico <= 60 chars com "Atlas" + proposta de valor
- `<meta name="description">` 120-160 chars por pagina
- `/sitemap.xml` valido com rotas publicas, `<lastmod>`, `<changefreq>`
- `/robots.txt` bloqueando `/api/`, rotas autenticadas; `Allow: /` para publicas
- JSON-LD `Organization` + `WebSite` com `SearchAction`
- Open Graph (og:image 1200x630, og:title, og:description) funcional no WhatsApp/Twitter
- `<link rel="alternate" hreflang="pt-BR/en">` nas paginas publicas
- `<meta name="robots" content="noindex">` nas rotas autenticadas
- Lighthouse SEO >= 90 (mobile + desktop)

### US-S41-002 — Auditoria de Performance (P0, 8 pts, SPEC-PROD-057)

**Como** viajante em smartphone Android com 4G,
**quero** que a landing carregue em < 3s,
**para** nao abandonar antes de entender a proposta.

**Criterios de Aceite:**
- Lighthouse: Performance >= 90, Accessibility >= 90, Best Practices >= 90, SEO >= 90 (mobile)
- Core Web Vitals: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1
- Nenhum chunk inicial > 200kb gzipado na landing
- Imagens em WebP/AVIF com `width`/`height`, `loading="lazy"` abaixo da dobra
- Fontes com `font-display: swap` + preload seletivo
- Componentes pesados (Leaflet, cmdk, DnD Kit) com lazy loading
- Relatorio salvo em `docs/performance/lighthouse-sprint41.html`

### US-S41-003 — Auditoria de Seguranca Final (P0, 5 pts, SPEC-PROD-058)

**Como** viajante que cadastra dados pessoais,
**quero** que a plataforma seja segura contra ataques comuns,
**para** confiar que minhas informacoes nao serao vazadas.

**Criterios de Aceite:**
- `npm audit` = zero HIGH/CRITICAL
- Headers: HSTS (max-age >= 31536000), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin
- CSP sem `unsafe-eval`; documentar `unsafe-inline` como debt (Tailwind/Leaflet)
- Rate limit em TODOS os API routes (429 + Retry-After)
- Input XSS/SQLi escapado em todos os campos
- BOLA: todas queries Prisma incluem `userId` no WHERE
- SecurityHeaders.com grade A
- Relatorio em `docs/security/security-audit-sprint41.md`
- **CRITICO**: corrigir DT-004 (mass assignment em `updateTrip`)

### US-S41-004 — Revisao FinOps (P1, 3 pts, SPEC-PROD-059)

**Como** membro do time de produto,
**quero** conhecer o custo real de IA por expedicao e projecoes para beta,
**para** tomar decisoes informadas sobre pricing e sustentabilidade.

**Criterios de Aceite:**
- Custo medio real (USD/BRL) por: Fase 5, Fase 6, expedicao completa
- Projecao para 100/500/1000 usuarios beta (cenarios lado a lado)
- Custo por tier: FREE (Gemini Flash) vs PREMIUM (Claude Sonnet)
- Alertas: custo diario > R$50 ou mensal > R$500
- Break-even: quantos pagantes cobrem 1000 free
- Custo total por usuario (IA + banco + cache + hosting)
- Salvo em `docs/finops/COST-PROJECTION-BETA.md`

### US-S41-005 — Suite E2E Final (P0, 8 pts, SPEC-PROD-060)

**Como** QA responsavel pelo sinal de qualidade pre-launch,
**quero** 130/130 E2E passando sem flakiness,
**para** ter confianca objetiva nas jornadas dos viajantes.

**Criterios de Aceite:**
- 130/130 E2E passando (100% pass rate)
- Zero flakiness em 3 execucoes consecutivas
- 30 testes falhando triados: bug real / teste desatualizado / problema de ambiente
- Jornada completa (Fases 1-6 + Summary) passando E2E
- Pipeline CI bloqueia merge se E2E falha
- Tempo total da suite < 15 minutos
- Relatorio em `docs/qa/e2e-report-sprint41.md`

### US-S41-006 — Deploy em Producao (P0, 5 pts, SPEC-PROD-061)

**Como** beta-tester convidado,
**quero** acessar o Atlas em dominio proprio com SSL valido,
**para** confiar que e um produto real.

**Criterios de Aceite:**
- SSL valido no dominio de producao
- HTTP -> HTTPS redirect 301
- Todas env vars auditadas vs `.env.example`; zero vars de dev em prod
- `prisma migrate deploy` executado; schema em sincronia
- Smoke test: landing `/`, login, health check `/api/v1/health`, sitemap
- Redis de producao conectado + rate limiting ativo
- Provedor AI com keys de producao (Gemini Flash FREE, Claude Sonnet PREMIUM)
- Runbook de rollback em `docs/runbooks/rollback-producao.md`

### US-S41-007 — Beta Launch Checklist (P0, 8 pts, SPEC-PROD-062)

**Como** beta-tester do Atlas,
**quero** um canal claro para reportar problemas dentro da plataforma,
**para** que meu feedback chegue ao time sem fricao.

**Criterios de Aceite:**
- Pagina `/feedback`: tipo (bug/sugestao/elogio), descricao (max 1000 chars), rating 1-5
- Feedback salvo com userId, tipo, descricao, rating, timestamp, URL de origem
- Sentry integrado: erros capturados em < 60s com stack trace + userId anonimizado
- Alerta Sentry para erros criticos (AI fail, payment fail) em < 5 minutos
- Zero PII raw no Sentry (apenas IDs anonimizados)
- Vercel Analytics ou Plausible (cookieless, LGPD-friendly)
- Email de convite beta com link direto + instrucoes de feedback
- Bonus 180 PA para novos beta-testers apos registro

### US-S41-008 — Estrategia de Ambientes: Staging + Producao (P0, 5 pts, SPEC-PROD-063)

**Como** desenvolvedor responsavel pelo deploy do Atlas,
**quero** ter ambientes de staging e producao completamente separados (branches, bancos e env vars distintos),
**para** que qualquer push para producao passe por homologacao previa em staging, eliminando o risco de regredir o produto ao vivo.

**Criterios de Aceite:**

*Branch strategy (A)*
- Branch `master` → deploy automatico em producao no Vercel
- Branch `staging` → deploy automatico em preview/staging no Vercel
- Configuracao documentada e operacional no painel do Vercel

*Banco de dados (B)*
- Staging usa banco Neon atual (sem dados reais de producao)
- Novo banco Neon provisionado exclusivamente para producao com `DATABASE_URL` distinto
- As duas `DATABASE_URL` nunca apontam para o mesmo banco

*Env vars por ambiente (C)*
- Vars configuradas separadamente em staging e producao: `ANTHROPIC_API_KEY`, `UNSPLASH_ACCESS_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `REDIS_URL`
- Google OAuth redirect URIs diferentes por ambiente
- `NEXTAUTH_SECRET` com valores distintos entre staging e producao
- Nenhuma var de producao exposta em staging

*Documentacao do processo de deploy (D)*
- `docs/DEPLOY-PROCESS.md` com 3 fluxos: feature (feature→staging→master), hotfix (hotfix→master, cherry-pick staging), bug fix (fix→staging→master)
- Diagrama de fluxo (ASCII ou Mermaid) para cada cenario
- Checklist pre-deploy e runbook de rollback

*Protecao de branches (E)*
- `master`: merge direto bloqueado, PR obrigatorio, minimo 1 aprovacao
- `staging`: merge direto bloqueado, PR obrigatorio (sem aprovacao formal)
- Force push desabilitado em ambos

### US-S41-009 — Multi-Provider AI: Anthropic + Gemini (P1, 8 pts, SPEC-PROD-064)

**Como** desenvolvedor responsavel pela camada de IA do Atlas,
**quero** que o sistema suporte multiplos provedores (Anthropic e Gemini) configurados via env vars, com fallback automatico,
**para** ter resiliencia contra indisponibilidade, controle de custos (Gemini tem tier gratuito), e flexibilidade para testar novos modelos sem deploy.

**Criterios de Aceite:**

*GeminiProvider (A)*
- `GeminiProvider` implementa interface `AiProvider` existente (`generateResponse`, `generateStreamingResponse`)
- Usa SDK `@google/generative-ai` com modelo `gemini-2.0-flash` por padrao
- `estimateCost()` retorna estimativa USD com base na tabela de precos Gemini

*Env vars (B)*
- `AI_PROVIDER`: `anthropic` | `gemini` (default: `anthropic`)
- `AI_MODEL`: override opcional do modelo padrao
- `GEMINI_API_KEY`: obrigatoria quando provider e Gemini
- `AI_FALLBACK_PROVIDER`: provider secundario (opcional)

*Gateway integration (D)*
- `getProvider()` le `AI_PROVIDER` e instancia provider correto via factory
- `AiInteractionLog` registra provider, modelo, tokens e custo reais
- `AI_PROVIDER=gemini` → todas chamadas usam Gemini sem mudanca de codigo
- `AI_PROVIDER=anthropic` → comportamento identico ao atual (zero regressao)

*Fallback automatico (E)*
- Provider primario timeout/429 → tenta `AI_FALLBACK_PROVIDER` automaticamente
- Fallback tambem falha → retorna erro original (sem loop infinito)
- Fallback registrado no `AiInteractionLog` com indicador `isFallback=true`
- Sem `AI_FALLBACK_PROVIDER` configurado → erro propagado imediatamente

*Per-phase config (C — pos-beta)*
- Arquitetura da factory suporta config por fase, mas NAO ativada na v1

*Testes (F)*
- Unit: GeminiProvider (sucesso, erro API, estimateCost, getModelName)
- Integracao: gateway com selecao de provider via env var
- Fallback: primario falha → secundario assume + log correto
- Cobertura >= 80% para codigo novo

**Notas Tecnicas (architect):**
- Interface `AiProvider` em `ai-provider.interface.ts` — GeminiProvider implementa sem modificar interface
- `GOOGLE_AI_API_KEY` ja existe em `env.ts` (opcional) — renomear/manter como `GEMINI_API_KEY`
- `getProvider()` em `ai.service.ts` linha 284 esta hardcoded para `ClaudeProvider` — refatorar
- `AiGatewayService` hardcoda `provider: "claude"` no log — corrigir
- `cost-calculator.ts` so tem pricing Claude — adicionar Gemini
- Fallback: apenas erros de infra (429, 504, timeout) — NAO erros de parse/schema
- Prompts atuais otimizados para Claude; Gemini pode interpretar diferente — manter mesmos no MVP
- `@google/generative-ai` e Apache 2.0 — compativel com regras do projeto
- Recomendacao arquitetural: `FallbackAiProvider implements AiProvider` wrapper

---

## Tabela de Tarefas

| ID | Descricao | Agente | Est. | Deps | Prio |
|----|-----------|--------|------|------|------|
| **SCOPE 1: SEO** |||||
| TASK-S41-001 | `sitemap.ts` + `robots.ts` (Next.js Metadata API) | dev-fullstack-2 | 2h | -- | P0 |
| TASK-S41-002 | `generateMetadata()` com OG, hreflang, canonical + JSON-LD | dev-fullstack-2 | 3h | -- | P0 |
| TASK-S41-003 | OG image 1200x630 + twitter:card em paginas publicas | dev-fullstack-2 | 2h | 002 | P1 |
| **SCOPE 2: PERFORMANCE** |||||
| TASK-S41-004 | Lighthouse CI baseline (mobile target > 90) | dev-fullstack-1 | 3h | -- | P0 |
| TASK-S41-005 | Bundle analysis com `@next/bundle-analyzer` | dev-fullstack-1 | 2h | -- | P1 |
| TASK-S41-006 | Lazy load: Leaflet, DnD Kit, cmdk (dynamic import) | dev-fullstack-1 | 3h | 005 | P1 |
| TASK-S41-007 | Imagens: WebP, next/image sizes/priority, LCP preload | dev-fullstack-1 | 2h | -- | P1 |
| **SCOPE 3: SEGURANCA** |||||
| TASK-S41-008 | Headers CSP prod, HSTS, X-Frame-Options | security-spec | 3h | -- | P0 |
| TASK-S41-009 | Rate limiting em TODOS os API routes + remover `/api/test-unsplash` | security-spec | 3h | -- | P0 |
| TASK-S41-010 | Zod validation em todas server actions + API routes | security-spec | 4h | -- | P0 |
| TASK-S41-011 | `npm audit` + CVE scan + licencas + **corrigir DT-004 (mass assignment)** | security-spec | 2h | -- | P0 |
| **SCOPE 4: FINOPS** |||||
| TASK-S41-012 | Relatorio: custo/expedicao, projecao 100-1000 users | finops-eng | 3h | -- | P1 |
| TASK-S41-013 | Alerta de custo diario (threshold + webhook) | finops-eng | 3h | -- | P1 |
| **SCOPE 5: E2E** |||||
| TASK-S41-014 | Corrigir 30 E2E falhando/flaky (100 -> 130) | qa-engineer | 6h | -- | P0 |
| TASK-S41-015 | Testes E2E faltantes para cobertura completa | qa-engineer | 6h | 014 | P0 |
| TASK-S41-016 | E2E gate no CI (bloqueia deploy se < 95%) | devops-eng | 3h | 014 | P1 |
| **SCOPE 6: DEPLOY** |||||
| TASK-S41-017 | Env vars producao + `.env.production.example` | devops-eng | 2h | -- | P0 |
| TASK-S41-018 | `deploy.yml`: substituir echo placeholders por CLI real | devops-eng | 4h | 017 | P0 |
| TASK-S41-019 | Dominio + SSL + HTTPS redirect | devops-eng | 2h | 018 | P0 |
| TASK-S41-020 | `prisma migrate deploy` em prod + seed essencial | devops-eng | 2h | 019 | P0 |
| TASK-S41-021 | Smoke test em producao | qa-engineer | 2h | 020 | P0 |
| **SCOPE 7: BETA TOOLING** |||||
| TASK-S41-022 | Integrar `@sentry/nextjs` + DSN via env + source maps | dev-fullstack-1 | 4h | 018 | P0 |
| TASK-S41-023 | Analytics: Vercel Analytics ou Plausible (cookieless) | dev-fullstack-1 | 4h | 018 | P1 |
| TASK-S41-024 | Pagina `/feedback` + server action + Prisma model | dev-fullstack-2 | 4h | 018 | P1 |
| TASK-S41-025 | Beta invites: `isBetaUser` flag, waitlist page | dev-fullstack-2 | 4h | 018 | P1 |
| TASK-S41-026 | Checklist final: validar tudo, BETA-LAUNCH-CHECKLIST.md | tech-lead | 2h | ALL | P0 |
| **SCOPE 8: AMBIENTES** |||||
| TASK-S41-027 | Criar branch `staging`; configurar Vercel Production=master, Preview=staging | devops-eng | 2h | 018 | P0 |
| TASK-S41-028 | Criar database Neon producao; `DATABASE_URL` distinto por env; `prisma migrate deploy` | devops-eng | 3h | 027 | P0 |
| TASK-S41-029 | Auditar e configurar TODAS env vars por ambiente no Vercel + `.env.staging.example` | devops-eng | 2h | 017, 028 | P0 |
| TASK-S41-030 | Escrever `docs/DEPLOY-PROCESS.md` (3 fluxos + checklist + rollback) | devops-eng | 1.5h | 029 | P1 |
| TASK-S41-031 | Branch protection: master (PR + 1 approval + CI), staging (PR + CI) | devops-eng | 1h | 027 | P1 |
| **SCOPE 9: MULTI-PROVIDER AI** |||||
| TASK-S41-032 | Env vars em `env.ts`: `AI_PROVIDER`, `AI_MODEL`, `GEMINI_API_KEY`, `AI_FALLBACK_PROVIDER` | dev-fullstack-1 | 1.5h | -- | P0 |
| TASK-S41-033 | `GeminiProvider implements AiProvider` + SDK `@google/generative-ai` + error mapping | dev-fullstack-1 | 5h | 032 | P0 |
| TASK-S41-034 | Refatorar `getProvider()` para ler `AI_PROVIDER`; expandir `MODEL_ID_MAP` com Gemini | dev-fullstack-1 | 2h | 033 | P0 |
| TASK-S41-035 | Fallback automatico: primario falha (429/timeout) → tenta secundario; max 1 retry | dev-fullstack-1 | 3h | 034 | P0 |
| TASK-S41-036 | Testes unitarios GeminiProvider (mock SDK, sucesso/erro/rate-limit/timeout) | dev-fullstack-1 | 2h | 033 | P0 |
| TASK-S41-037 | Testes integracao gateway (selecao provider, AI_MODEL override) | dev-fullstack-1 | 1.5h | 034 | P1 |
| TASK-S41-038 | Testes fallback (primario falha→secundario, AUTH_ERROR nao dispara, log correto) | dev-fullstack-1 | 1.5h | 035 | P1 |
| TASK-S41-039 | Atualizar `cost-calculator.ts` + docs com precos Gemini; notificar finops + prompt-eng | dev-fullstack-1 | 0.5h | 033 | P2 |

**Total: 39 tarefas, ~107 horas**

---

## Carga por Agente

| Agente | Horas | Tarefas |
|--------|-------|---------|
| dev-fullstack-1 | 35h | 004-007, 022-023, 032-039 |
| dev-fullstack-2 | 15h | 001-003, 024-025 |
| security-specialist | 12h | 008-011 |
| devops-engineer | 22.5h | 016-020, 027-031 |
| qa-engineer | 14h | 014-015, 021 |
| finops-engineer | 6h | 012-013 |
| tech-lead | 2h + reviews | 026 |

---

## Execucao em 3 Fases

### Fase 1 — Polimento Paralelo (~5 dias)

Todos os blocos correm simultaneamente:

```
SEO (dev-fullstack-2)         ████████░░  001-003
Performance (dev-fullstack-1) ████████░░  004-007
Seguranca (security-spec)     ████████░░  008-011
FinOps (finops-eng)           ████░░░░░░  012-013
E2E (qa-engineer)             ████████████  014-015
Multi-Provider (dev-fullstack-1) ████████████████  032-039
```

### Fase 2 — Deploy Sequencial (~2 dias)

So comeca quando TODOS os P0 da Fase 1 estiverem verdes:

```
Env vars -> CI/CD -> Dominio+SSL -> Migration -> Smoke test
  017   ->  018  ->    019     ->    020    ->    021
                 -> Staging branch -> Neon prod DB -> Env vars audit -> Deploy docs
                       027       ->     028      ->     029        ->    030
                                                                   -> Branch protection
                                                                        031
```

### Fase 3 — Beta Tooling Paralelo (~2 dias)

So comeca apos deploy funcional:

```
Sentry (dev-1)        ████  022
Analytics (dev-1)     ████  023
Feedback (dev-2)      ████  024
Beta invites (dev-2)  ████  025
```

**Gate final**: TASK-S41-026 (tech-lead checklist) so fecha quando tudo acima esta verde.

---

## Grafo de Dependencias

```
                    ┌─ 001 ─┐
                    │       ├─ 003
                    ├─ 002 ─┘
                    │
                    ├─ 004
                    ├─ 005 ─── 006
INICIO ─────────────┤ 007
(paralelo)          ├─ 008
                    ├─ 009
                    ├─ 010
                    ├─ 011
                    ├─ 012
                    ├─ 013
                    ├─ 014 ─── 015
                    │      └── 016
                    ├─ 032 ── 033 ──┬── 034 ── 035 ── 038
                    │               ├── 036
                    │               ├── 037
                    │               └── 039
                    └─ 017 ─── 018 ─── 019 ─── 020 ─── 021
                                │
                                ├─── 022
                                ├─── 023
                                ├─── 024
                                ├─── 025
                                └─── 027 ── 028 ── 029 ── 030
                                      └──── 031
                                                    ↓
                                                  026 (GATE FINAL)
```

---

## Achados Criticos do Codebase

| # | Achado | Impacto | Acao |
|---|--------|---------|------|
| 1 | **DT-004: mass assignment em `updateTrip`** | CRITICO — atacante pode setar campos arbitrarios | Corrigir em TASK-S41-011 |
| 2 | **`/api/test-unsplash`** — rota de teste em producao | Exposicao desnecessaria | Remover em TASK-S41-009 |
| 3 | **`deploy.yml`** — jobs com `echo` placeholder | Deploy nao funcional | Corrigir em TASK-S41-018 |
| 4 | **`style-src 'unsafe-inline'`** no CSP | Debt DEBT-S6-004 | Documentar, nao bloqueia beta |
| 5 | **Zero Sentry/analytics/feedback** | Bugs invisiveis em prod | TASK-S41-022/023/024 |
| 6 | **E2E nao roda no CI** | Regressoes nao detectadas | TASK-S41-016 |
| 7 | **OG/JSON-LD inexistentes** | Sem rich snippets no Google | TASK-S41-002 |
| 8 | **5 fontes customizadas carregando** | Potencial bloqueio de render | Avaliar em TASK-S41-004 |
| 9 | **`getProvider()` hardcoded para ClaudeProvider** | Sem multi-provider | Refatorar em TASK-S41-034 |
| 10 | **`AiGatewayService` hardcoda `provider: "claude"`** | Log incorreto se usar Gemini | Corrigir em TASK-S41-034 |
| 11 | **`cost-calculator.ts` so tem pricing Claude** | Custo Gemini nao rastreado | Corrigir em TASK-S41-039 |
| 12 | **Todo push vai direto para producao** | RISCO CRITICO para beta | Resolver em TASK-S41-027-031 |

---

## Decisoes Pendentes (Bloqueiam Fase 2)

| # | Decisao | Responsavel | Deadline |
|---|---------|-------------|----------|
| 1 | Dominio de producao — qual sera? | PO | Antes de TASK-S41-019 |
| 2 | Beta aberto vs convite (feature flag ou allowlist) | PO | Antes de TASK-S41-025 |
| 3 | Hosting — Vercel vs Railway/Render | Architect + DevOps | Antes de TASK-S41-018 |
| 4 | Database producao — Neon (free) vs Railway PostgreSQL | DevOps | Antes de TASK-S41-020 |
| 5 | Redis producao — Upstash (serverless) vs Railway Redis | DevOps | Antes de TASK-S41-020 |
| 6 | Gemini API Key — criar conta em ai.google.dev | PO | Antes de TASK-S41-033 |

---

## Metricas de Sucesso do Sprint

| Metrica | Target |
|---------|--------|
| Lighthouse SEO (mobile) | >= 90 |
| Lighthouse Performance (mobile) | >= 90 |
| Core Web Vitals LCP | <= 2.5s |
| E2E pass rate | 130/130 (100%) |
| `npm audit` HIGH/CRITICAL | 0 |
| SecurityHeaders.com | Grade A |
| Sentry captura erros | < 60s |
| Dominio prod com SSL | Ativo |
| Custo/expedicao documentado | Sim |
| Beta testers convidados | >= 10 |
| Ambientes staging/prod separados | Operacional |
| Multi-provider AI (Gemini fallback) | Funcional |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|-------|---------------|-----------|
| DT-004 explorado antes de correcao | Media | Prioridade P0, corrigir dia 1 |
| 30 E2E falhando = bugs reais | Alta | Triagem antes de correcao |
| Custo AI sem cap = fatura inesperada | Media | Budget alert Anthropic + TASK-S41-013 |
| Dominio nao decidido a tempo | Media | Definir ate dia 3 do sprint |
| 5 fontes bloqueando render | Baixa | Reduzir para 2-3 ou `font-display: swap` |
| `unsafe-inline` no CSP | Baixa | Documentar como debt, nao bloqueia beta |
| Push direto para prod sem staging | Alta | TASK-S41-027 prioridade P0 |
| Gemini output diverge de Claude (JSON) | Media | Schemas Zod validam; monitorar taxa de falha |
| Fallback dobra custo se ativar frequente | Baixa | Monitorar via AiInteractionLog |
| Neon free tier = 1 branch gratis | Media | Avaliar custo de branch adicional |

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-04-07 | tech-lead | Rascunho inicial |
| 2.0.0 | 2026-04-07 | PO + architect + tech-lead | Consolidacao com user stories, brief tecnico e tarefas |
| 3.0.0 | 2026-04-07 | PO + architect + tech-lead | +US-S41-008 (ambientes) +US-S41-009 (multi-provider AI), 13 novas tarefas |
