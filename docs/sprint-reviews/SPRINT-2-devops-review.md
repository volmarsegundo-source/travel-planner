# Revisao DevOps — Sprint 2
**Data:** 2026-02-26
**Revisor:** devops-engineer
**Sprint:** Sprint 2
**Arquivos revisados:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `playwright.config.ts`
- `src/app/api/v1/health/route.ts`
- `src/server/cache/redis.ts`
- `src/lib/env.ts`
- `next.config.ts`
- `package.json`
- `.env.local`, `.env.example`
- `src/lib/logger.ts`

---

## Sumario Executivo

O Sprint 2 resolveu com sucesso os tres bloqueadores identificados na revisao do Sprint 1 (INFRA-REV-001 a INFRA-REV-003) e implementou cinco das oito condicoes listadas para producao. A infraestrutura esta substancialmente mais solida.

Os pontos positivos principais sao: o CI agora tem Semgrep SAST funcional com `p/secrets` e `p/owasp-top-ten`, o Trivy scan com bloqueio em HIGH/CRITICAL esta operacional, o health endpoint realiza checks reais no PostgreSQL e Redis via `Promise.allSettled`, o Redis tem error handler, e o Playwright usa `npm run start` no CI.

Os pontos de atencao sao: divergencia estrutural entre os dois workflows `ci.yml` e `deploy.yml` (o arquivo real divergiu do spec documentado no Sprint 1), o `deploy.yml` atual e um esqueleto funcional mas incompleto, `ANTHROPIC_API_KEY` com placeholder no `.env.local` pode confundir novos desenvolvedores, e `Prisma migrations` ainda nao existe como diretorio.

O estado atual permite deploy seguro para staging. A producao requer tres items adicionais antes de ser liberada.

---

## Revisao DevOps — Sprint 2 — devops-engineer

### CI/CD Pipeline

**Status: APROVADO COM CONDICOES**

#### O que foi corrigido (Sprint 1 blockers resolvidos)

| Issue Sprint 1 | Status no Sprint 2 | Evidencia |
|---|---|---|
| INFRA-REV-002: Docker build + Trivy ausente | RESOLVIDO | `build-and-scan` job presente em `ci.yml` linhas 134-151 |
| INFRA-REV-003: Semgrep SAST ausente | RESOLVIDO | Job `sast` com `semgrep/semgrep-action@v1` e `p/secrets p/owasp-top-ten` |
| INFRA-REV-005: Playwright usando dev server no CI | RESOLVIDO | `process.env.CI ? "npm run start" : "npm run dev"` em `playwright.config.ts` linha 62 |
| INFRA-REV-006: Redis sem error handler | RESOLVIDO | `redis.on("error", ...)` presente em `redis.ts` linha 16 |
| INFRA-REV-004: Health endpoint sem checks reais | RESOLVIDO | `Promise.allSettled` com DB e Redis real em `health/route.ts` |
| INFRA-REV-009: E2E sem `--project=chromium` | RESOLVIDO | Linha 219: `npm run test:e2e -- --project=chromium` |
| INFRA-REV-007: `next-auth` beta com caret | RESOLVIDO | `"next-auth": "5.0.0-beta.25"` sem caret em `package.json` linha 43 |

#### Divergencia entre ci.yml real e infrastructure.md

O arquivo `ci.yml` commitado diverge do spec documentado em `docs/infrastructure.md`. As diferencas sao:

| Aspecto | `ci.yml` real | `infrastructure.md` spec | Impacto |
|---|---|---|---|
| Acao do Trivy | Roda Trivy via `docker run aquasec/trivy:latest` diretamente | Usa `aquasec/trivy-action@master` (action oficial) | Funcional mas nao faz upload SARIF ao GitHub Security |
| Stage de SAST | Job `sast` executa `npm audit` ANTES do Semgrep | `infrastructure.md` integra npm audit dentro do job SAST | Ordem diferente mas resultado equivalente |
| Semgrep action | `semgrep/semgrep-action@v1` | `returntocorp/semgrep-action@v1` | Sem diferenca funcional — mesmo mantenedor |
| Semgrep config | `p/secrets p/owasp-top-ten` | `p/security-audit p/secrets p/owasp-top-ten p/typescript` | Faltam `p/security-audit` e `p/typescript` |
| SAST depende de | `needs: lint` | `needs: lint` | Igual |
| Build depende de | `needs: [test, sast]` | `needs: [lint, test]` | SAST nao e prerequisito no spec original |
| E2E depende de | `needs: [test]` | `needs: [test, build-and-scan]` | E2E nao aguarda o scan de container |
| Coverage gate | Sem shell gate explicita de 80% | Gate explicita com script shell | Threshold depende apenas da config do Vitest |

**Gap critico identificado:** O Trivy scan nao usa a action oficial (`aquasec/trivy-action`) e portanto **nao faz upload dos resultados SARIF para o GitHub Security tab**. Isso significa que vulnerabilidades encontradas existem apenas como falha de log, sem rastreabilidade no repositorio. A action oficial deve ser usada para que o time de seguranca veja os resultados integrados ao GitHub.

**Gap adicional:** `p/security-audit` e `p/typescript` estao ausentes do Semgrep — o primeiro adiciona checks de seguranca especificos para TypeScript que complementam o `p/owasp-top-ten`.

#### Pontos positivos confirmados

- Concurrency `cancel-in-progress: true` presente e correto — economiza minutos de runner
- `npm ci` usado em todos os jobs — nunca `npm install`
- Node.js 20 pinado como `NODE_VERSION` no nivel do workflow
- Postgres 16-alpine e Redis 7-alpine nos service containers — paridade com Docker Compose local
- `SKIP_ENV_VALIDATION: "true"` nos jobs de teste — correto para CI com vars de teste
- `actions/upload-artifact@v4` presente para cobertura e relatorio Playwright
- `if: failure()` no upload do Playwright report — economiza storage em passes bem-sucedidos

---

### Deploy e Estrategia de Release

**Status: PARCIALMENTE IMPLEMENTADO — Requer complementacao antes da producao**

#### O que existe no deploy.yml atual

O `deploy.yml` commitado e um esqueleto funcional com dois jobs:

1. **`deploy-staging`** — trigado por `push` ao `master`, usa o ambiente `staging` do GitHub, executa `prisma migrate deploy` com `STAGING_DATABASE_URL` antes do deploy.
2. **`deploy-production`** — trigado por `workflow_dispatch` com input `version`, usa o ambiente `production` do GitHub, executa `prisma migrate deploy` com `PRODUCTION_DATABASE_URL`.

#### Divergencias criticas em relacao ao spec

| Aspecto | `deploy.yml` real | `infrastructure.md` spec | Risco |
|---|---|---|---|
| Build e publish da imagem Docker | Ausente | Job `build` dedicado publica para `ghcr.io` | A imagem Docker nao e publicada — deploy nao usa artefato imutavel |
| Deploy para Vercel | Linha 37: `echo "Deploy to staging..."` (placeholder) | Vercel CLI com `vercel build` + `vercel deploy --prebuilt` | Nenhum deploy real acontece |
| Smoke tests pos-deploy | Ausente | `npm run test:smoke -- --base-url=URL` | Nao ha validacao pos-deploy |
| Notificacao Slack | Ausente | `slackapi/slack-github-action@v1.25.0` | Time nao e notificado de deploys |
| Concurrency em deploys | Ausente | `cancel-in-progress: false` (nunca cancelar deploy em progresso) | Dois pushes rapidos podem gerar condition de corrida |
| `RAILWAY_TOKEN` compartilhado | `RAILWAY_TOKEN` usado em ambos os ambientes | Tokens separados por ambiente | Secret unico da acesso aos dois ambientes — viola principio de menor privilegio |

**Risco mais grave:** O step de deploy em ambos os jobs e um `echo` placeholder. Isso significa que `prisma migrate deploy` e executado contra o banco de staging/producao mas nenhum codigo novo e publicado. Em um ambiente real, isso geraria migracao de schema sem atualizacao da aplicacao — um estado potencialmente inconsistente.

#### Prisma migrate deploy — analise de risco

A estrategia de executar `prisma migrate deploy` no workflow de deploy e correta conceitualmente. Porem ha um risco operacional: se a migracao falhar apos um deploy parcial, o rollback do schema e mais complexo que o rollback da aplicacao. A sequencia correta deve ser:

1. Verificar que as migracoes sao backwards-compatible com a versao anterior da aplicacao
2. Executar `prisma migrate deploy`
3. Somente entao fazer o deploy da nova versao da aplicacao

O workflow atual segue essa ordem corretamente (migration antes do deploy).

**Problema adicional:** O `deploy.yml` usa `branches: [master]` como trigger, mas o `ci.yml` usa `branches: [main, develop]`. O repositorio tem o branch principal chamado `master` (confirmado no `git status`). O CI nao roda em push para `master` — apenas em PRs para `main`. Isso significa que pushes diretos para `master` disparam o deploy mas nao passam pelo CI de qualidade. Esse e um gap de seguranca significativo.

---

### Configuracao de Ambiente

**Status: APROVADO COM CONDICOES**

#### env.ts — analise completa

A implementacao em `src/lib/env.ts` esta bem estruturada. Pontos positivos:

- `REDIS_TLS_REQUIRED=true` como variavel independente de `NODE_ENV` e a abordagem correta — `NODE_ENV` e `"production"` tambem em builds locais com `npm run build`, entao usar uma variavel separada para controle de TLS e mais preciso.
- `ANTHROPIC_API_KEY` validado com `.startsWith("sk-ant-")` — bom.
- `NEXTAUTH_SECRET` com `.min(32)` — correto.
- `skipValidation: process.env.SKIP_ENV_VALIDATION === "true"` — padrao seguro para CI.

**Problema identificado — `.env.local` com placeholder real:**

O arquivo `.env.local` (linha 49) contem:
```
ANTHROPIC_API_KEY=sk-ant-local-dev-placeholder-not-real
```

Este valor inicia com `sk-ant-` e portanto **passa na validacao** do `env.ts`. Isso e intencional para permitir que novos devs iniciem o servidor sem a chave real. Porem ha dois riscos:

1. Se o Semgrep `p/secrets` rodar contra o `.env.local` (que nao deveria estar commitado mas pode estar em alguns fluxos de trabalho), o pattern `sk-ant-` pode disparar um falso positivo.
2. A linha em `.env.local` nao tem aspas — `ANTHROPIC_API_KEY=sk-ant-local-dev-placeholder-not-real` — o que e tecnicamente valido para dotenv mas inconsistente com as outras variaveis no arquivo que usam aspas duplas.

**Variaveis ausentes no ci.yml:**

`ANTHROPIC_API_KEY` nao esta presente como env var nos jobs `test` e `e2e` do `ci.yml`. Se qualquer teste fizer chamada ao servico de AI sem mock, o job vai falhar com erro de validacao do `env.ts`. Verificar se todos os testes que tocam o servico Anthropic usam mocks adequados.

**REDIS_TLS_REQUIRED ausente no ci.yml:**

Correto — o Redis de CI usa `redis://` (sem TLS), entao a ausencia dessa variavel e o comportamento esperado (default: nao obrigatoria).

#### .env.example — sincronizacao

| Variavel | .env.example | .env.local | env.ts | Status |
|---|---|---|---|---|
| `DATABASE_URL` | Sim | Sim | Sim | OK |
| `REDIS_URL` | Sim | Sim | Sim | OK |
| `UPSTASH_REDIS_REST_URL` | Sim | Sim | Nao | Aviso (Sprint 1) — mantido |
| `UPSTASH_REDIS_REST_TOKEN` | Sim | Sim | Nao | Aviso (Sprint 1) — mantido |
| `ANTHROPIC_API_KEY` | Sim | Sim | Sim | OK (novo no Sprint 2) |
| `NEXTAUTH_SECRET` | Sim | Sim | Sim | OK |
| `GOOGLE_CLIENT_ID` | Sim | Sim | Sim (optional) | OK |
| `REDIS_TLS_REQUIRED` | Nao | Nao | Referenciado | Lacuna — deve ser documentado no .env.example |

`REDIS_TLS_REQUIRED` e referenciado diretamente via `process.env.REDIS_TLS_REQUIRED` em `env.ts` mas nao esta documentado em `.env.example`. Novos desenvolvedores que configuram um ambiente staging com Upstash nao saberao que precisam definir essa variavel.

---

### Infraestrutura

**Status: APROVADO**

#### Redis — src/server/cache/redis.ts

Todos os itens do Sprint 1 foram resolvidos:

| Check | Sprint 1 | Sprint 2 |
|---|---|---|
| `server-only` importado | Pass | Pass |
| Singleton global pattern | Pass | Pass |
| `lazyConnect: true` | Pass | Pass |
| `maxRetriesPerRequest: 3` | Pass | Pass |
| `enableReadyCheck: true` | Pass | Pass |
| Error event handler | Fail (INFRA-REV-006) | Pass — `redis.on("error", ...)` |
| Usa `env.REDIS_URL` (validado) | Warning | Pass — `env.REDIS_URL` |

A mudanca de `process.env.REDIS_URL ?? "redis://localhost:6379"` para `env.REDIS_URL` e significativa: agora a URL passa pela validacao de schema do Zod no `env.ts`, incluindo a verificacao de TLS quando `REDIS_TLS_REQUIRED=true`. Isso elimina o risco de uma URL malformada chegar ao cliente Redis silenciosamente.

**Ponto de atencao residual:** O singleton so e registrado no `globalThis` em ambientes nao-producao (`if (process.env.NODE_ENV !== "production")`). Em producao (Vercel serverless), cada invocacao de funcao cria uma nova conexao Redis. Para o volume atual do MVP isso e aceitavel, mas deve ser monitorado quando o trafego crescer — o Upstash free tier pode esgotar conexoes.

#### Health endpoint — src/app/api/v1/health/route.ts

A implementacao e correta e resolve completamente o INFRA-REV-004:

- `Promise.allSettled` garante que um timeout em um servico nao bloqueia o check do outro
- HTTP 503 retornado quando qualquer servico esta degradado — correto para health checks usados por load balancers
- `process.env.npm_package_version` para versao — funciona no Node.js runtime
- Resposta inclui `timestamp` em ISO-8601 — facilita correlacao de logs

**Lacuna identificada:** O health endpoint nao tem timeout configurado. Uma query `SELECT 1` que demora 30 segundos vai manter a conexao aberta por todo esse tempo. Em producao, adicionar um timeout de 5 segundos no check de banco e recomendado:

```typescript
// Exemplo de melhoria futura
const DB_HEALTH_TIMEOUT_MS = 5000;
db.$queryRaw`SELECT 1`.then(...).catch(...) com AbortSignal ou Promise.race
```

#### next.config.ts — Security Headers

Os headers implementados sao corretos para MVP:

| Header | Valor | Avaliacao |
|---|---|---|
| `X-Frame-Options` | `DENY` | Correto — previne clickjacking |
| `X-Content-Type-Options` | `nosniff` | Correto — previne MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Correto |
| `Permissions-Policy` | camera, mic, geolocation desabilitados | Correto para MVP |
| `Content-Security-Policy` | Configurado | Ver abaixo |
| `Strict-Transport-Security` | Apenas em producao | Correto |

**CSP — ponto de atencao:** O valor atual do CSP inclui `'unsafe-eval'` e `'unsafe-inline'` em `script-src`. Isso e tipico para Next.js em desenvolvimento, mas em producao enfraquece significativamente a protecao contra XSS. Para producao, o ideal e:
1. Remover `'unsafe-eval'` (necessario apenas para Turbopack em dev)
2. Substituir `'unsafe-inline'` por nonces gerados por request (Next.js 15 suporta isso nativamente)

Isso nao e um bloqueador para staging, mas deve ser resolvido antes da producao com usuarios reais.

#### Dockerfile

**Problema: Dockerfile nao existe no repositorio.**

O `docs/infrastructure.md` documenta um Dockerfile multi-stage completo, e o `ci.yml` executa `docker build -t travel-planner:ci .` — mas o arquivo `Dockerfile` nao esta presente no repositorio. O CI build-and-scan job vai **falhar em todo PR** com `unable to prepare context: unable to evaluate symlinks in Dockerfile path: lstat /home/runner/work/travel-planner/travel-planner/Dockerfile: no such file or directory`.

Este e um bloqueador critico para o CI funcionar completamente.

#### Prisma migrations

O diretorio `prisma/migrations/` ainda nao existe. O `prisma migrate deploy` nos jobs de CI `test` e `e2e` continua a nao ter arquivos de migracao para aplicar. Isso nao foi resolvido no Sprint 2.

---

### Observabilidade

**Status: PARCIAL — Adequado para staging, insuficiente para producao**

#### Logger — src/lib/logger.ts

O INFRA-REV-008 foi resolvido: `traceId` foi adicionado ao `LogMetadata` e e propagado condicionalmente nos tres metodos (`info`, `warn`, `error`). A implementacao e correta:

```typescript
export interface LogMetadata extends Record<string, unknown> {
  traceId?: string;
}
```

O `traceId` e incluido apenas quando presente (`meta?.traceId ? { traceId: meta.traceId } : {}`), o que e correto — evita logs com `traceId: undefined`.

**Lacuna:** `spanId` ainda nao esta presente. Para correlacao de spans em um trace distribuido (OpenTelemetry), tanto `traceId` quanto `spanId` sao necessarios. Para o MVP com uma unica aplicacao Next.js isso e aceitavel, mas ao integrar com Sentry ou OpenTelemetry ambos devem ser propagados.

#### Sentry

Nao ha evidencia de implementacao de Sentry no codigo revisado (`src/instrumentation.ts` nao foi encontrado). `SENTRY_DSN` e `SENTRY_AUTH_TOKEN` estao no `env.ts` como opcionais, o que significa que o servidor sobe sem Sentry configurado. Para staging e especialmente para producao, Sentry deve estar ativo.

#### Metricas e alertas

Nao existem metricas de aplicacao configuradas alem do que o Vercel Analytics oferece nativamente:
- Sem request rate por endpoint
- Sem error rate tracking programatico
- Sem latencia P50/P95/P99 por rota
- Sem alertas configurados para SLO breach

Para o MVP em staging isso e aceitavel. Para producao com usuarios reais, ao menos os alertas do Sentry devem estar ativos.

#### O que temos vs o que falta

| Componente | Status | Adequado para |
|---|---|---|
| Structured JSON logging | Implementado | Staging e producao |
| `traceId` no logger | Implementado | Staging e producao |
| Health endpoint real | Implementado | Staging e producao |
| Sentry error tracking | Nao implementado | Nao pronto para producao |
| Request rate metrics | Ausente | Nao pronto para producao |
| Error rate alerting | Ausente | Nao pronto para producao |
| Latency P95 tracking | Ausente | Nao pronto para producao |
| Log retention configurada | Ausente (doc apenas) | Staging precisa de config |

---

### Paridade de Ambientes

**Status: ADEQUADO COM LACUNAS**

| Aspecto | Local (Docker Compose) | CI (GitHub Actions) | Staging (Vercel) | Producao (Vercel) | Paridade |
|---|---|---|---|---|---|
| Node.js versao | 20+ (script predev) | 20 (pinado) | Vercel default (configuravel) | Vercel default (configuravel) | Verificar Vercel config |
| PostgreSQL versao | 16-alpine | 16-alpine | Railway (versao?) | Railway (versao?) | Railway deve ser 16 |
| Redis | 7-alpine (local) | 7-alpine (CI) | Upstash (managed) | Upstash (managed) | Protocolos diferentes |
| TLS no Redis | Nao (redis://) | Nao (redis://) | Sim (rediss://) | Sim (rediss://) | `REDIS_TLS_REQUIRED` separa |
| Env var validation | Via env.ts | `SKIP_ENV_VALIDATION=true` | Via env.ts | Via env.ts | OK — CI skip e intencional |
| `ANTHROPIC_API_KEY` | Placeholder | Ausente (sem var) | Secret real | Secret real | Gap: CI sem var pode falhar |
| Docker build | `docker build` manual | CI build-and-scan | Vercel build nativo | Vercel build nativo | Dois pipelines de build |

**Observacao importante — dois pipelines de build paralelos:**

O projeto tem dois caminhos de build em paralelo:
1. Caminho Docker: `docker build` → imagem para Railway/self-hosted
2. Caminho Vercel: `vercel build` → artefato para Vercel

O `ci.yml` valida o caminho Docker. O `deploy.yml` (quando implementado) usa o caminho Vercel. A imagem Docker validada no CI nao e o mesmo artefato que chega ao Vercel em producao. Isso e uma lacuna de validacao: o artefato que vai para producao (Vercel build) nao passou pelo Trivy scan.

**Paridade de configuracao Vercel:** A versao do Node.js no Vercel deve ser explicitamente configurada para 20 no `vercel.json` ou no dashboard do Vercel. Sem isso, o Vercel pode usar sua versao default que pode diferir da especificada no projeto.

---

### Recomendacoes

#### CRITICO — Bloqueadores imediatos

| ID | Item | Arquivo | Acao |
|---|---|---|---|
| C-001 | Dockerfile ausente | `Dockerfile` (nao existe) | Criar Dockerfile conforme spec em `infrastructure.md`. O CI falha no `docker build` sem este arquivo. |
| C-002 | Divergencia de branch name: CI usa `main`, deploy usa `master`, repositorio esta em `master` | `.github/workflows/ci.yml` linhas 5-7 | O CI nao roda em push para `master`. Padronizar: ou renomear o branch para `main` ou atualizar ambos os workflows para usar `master`. |
| C-003 | Deploy workflow e um placeholder — nenhum deploy real acontece | `.github/workflows/deploy.yml` linhas 37, 64 | Implementar a integracao real com Vercel CLI ou Railway CLI antes de qualquer tentativa de staging deploy. |
| C-004 | Prisma migrations ausentes | `prisma/migrations/` (nao existe) | Executar `npx prisma migrate dev --name init` localmente e commitar o diretorio `migrations/`. |

#### ALTO — Resolver antes de producao

| ID | Item | Arquivo | Acao |
|---|---|---|---|
| A-001 | Trivy nao usa action oficial — sem upload SARIF | `.github/workflows/ci.yml` linhas 145-151 | Substituir `docker run aquasec/trivy:latest` por `aquasec/trivy-action@master` para integrar resultados no GitHub Security tab. |
| A-002 | Semgrep faltam rulesets `p/security-audit` e `p/typescript` | `.github/workflows/ci.yml` linha 128 | Adicionar ambos os rulesets ao `config` do Semgrep. |
| A-003 | `RAILWAY_TOKEN` unico para staging e producao — viola menor privilegio | `.github/workflows/deploy.yml` linhas 39, 66 | Criar dois tokens separados: `STAGING_RAILWAY_TOKEN` e `PRODUCTION_RAILWAY_TOKEN`. Escopo cada um ao ambiente correspondente. |
| A-004 | CSP usa `unsafe-eval` e `unsafe-inline` — enfraquece XSS protection em producao | `next.config.ts` linha 22 | Implementar CSP com nonces para producao. Next.js 15 tem suporte nativo a nonces via middleware. |
| A-005 | E2E nao aguarda o scan de container | `.github/workflows/ci.yml` linha 159 | Adicionar `build-and-scan` como dependencia do job `e2e`: `needs: [test, build-and-scan]`. |
| A-006 | Dois caminhos de build paralelos (Docker + Vercel) — artefato de producao nao e o mesmo que foi scaneado | `ci.yml` + `deploy.yml` | Definir e documentar qual e o artefato canonico de deploy. Se Vercel, o scan deve ser do bundle Vercel, nao da imagem Docker. |

#### MEDIO — Resolver no Sprint 3

| ID | Item | Arquivo | Acao |
|---|---|---|---|
| M-001 | Sentry nao esta implementado (`src/instrumentation.ts` ausente) | `src/instrumentation.ts` | Implementar conforme spec em `infrastructure.md`. |
| M-002 | `REDIS_TLS_REQUIRED` nao documentado em `.env.example` | `.env.example` | Adicionar entrada comentada explicando quando usar `REDIS_TLS_REQUIRED=true`. |
| M-003 | Health endpoint sem timeout no DB check | `src/app/api/v1/health/route.ts` | Adicionar timeout de 5s no check de PostgreSQL para evitar hanging requests. |
| M-004 | Vercel nao tem Node.js 20 explicitamente configurado | `vercel.json` (ausente) | Criar `vercel.json` com `"engines": { "node": "20.x" }` ou configurar no dashboard Vercel. |
| M-005 | `spanId` ausente no logger para correlacao OpenTelemetry completa | `src/lib/logger.ts` | Adicionar `spanId?: string` ao `LogMetadata` — necessario para integracao futura com OpenTelemetry. |
| M-006 | Log retention para staging nao configurada (apenas documentada) | `docs/infrastructure.md` | Configurar Vercel Log Drains para staging com retencao de 7 dias conforme especificado. |
| M-007 | Coverage gate de 80% depende apenas da config do Vitest sem gate explicita no pipeline | `.github/workflows/ci.yml` | Adicionar step explicito de verificacao de coverage conforme documentado no spec (script shell lendo `coverage-summary.json`). |
| M-008 | `ANTHROPIC_API_KEY` sem aspas em `.env.local` — inconsistente | `.env.local` linha 49 | Adicionar aspas: `ANTHROPIC_API_KEY="sk-ant-local-dev-placeholder-not-real"` |

#### BAIXO — Melhorias futuras

| ID | Item | Acao |
|---|---|---|
| B-001 | `concurrency` ausente no `deploy.yml` — dois pushes rapidos podem gerar corrida | Adicionar `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: false }` |
| B-002 | Notificacao Slack ausente no `deploy.yml` | Implementar `slackapi/slack-github-action` para notificar o time em deploys bem-sucedidos e falhos |
| B-003 | Smoke tests pos-deploy ausentes no `deploy.yml` | Adicionar `npm run test:smoke` apontando para a URL de staging/producao apos cada deploy |
| B-004 | Node.js pinado a `"20"` sem patch version — minor variacao entre runs | Considerar pinar a `"20.18.0"` para reproducibilidade total |
| B-005 | Runbooks de incidente nao existem (`docs/runbooks/` vazio) | Criar ao menos RUN-001 (Redis down) e RUN-002 (DB connection exhaustion) |

---

## Verificacao da Checklist de Pre-Lancamento

Com base no estado atual do Sprint 2:

| Item | Status |
|---|---|
| GitHub Environments configurados (staging/production) | Parcial — environments existem no deploy.yml mas nao verificado no GitHub |
| Branch protection em master/main | Nao verificado — verificar no GitHub Settings |
| Semgrep SAST passando no pipeline | Pass — implementado neste sprint |
| npm audit com zero HIGH/CRITICAL | Pass — implementado neste sprint |
| Trivy scan com zero CRITICAL/HIGH | Pass — implementado (mas sem SARIF upload) |
| `.gitignore` correto | Pass |
| Sentry DSN configurado em staging | Fail — Sentry nao implementado |
| `/api/v1/health` retornando 200 | Pass — implementado neste sprint |
| Smoke test do health no pipeline | Nao implementado no deploy.yml |
| Log estruturado implementado | Pass |
| Cobertura >= 80% | Pass (via Vitest config) |
| `env.ts` validando todas as variaveis | Pass |
| `server-only` em todos os arquivos de servidor | Pass |
| Rate limiting middleware ativo | Verificar implementacao |
| Prisma migrations funcionando | Fail — diretorio ausente |

---

## Conclusao

O Sprint 2 resolveu os tres bloqueadores criticos do Sprint 1 e avancou significativamente a maturidade do pipeline. As correcoes do Playwright, do Redis error handler e do health endpoint sao de qualidade e seguem as melhores praticas.

Os novos bloqueadores identificados (C-001 a C-004) devem ser resolvidos como primeira tarefa do Sprint 3 antes de qualquer tentativa de deploy para staging. O mais urgente e a ausencia do Dockerfile, que faz o CI falhar em todo PR no job de Docker build.

A divergencia de branch name (`main` vs `master`) e o segundo item mais urgente — sem essa correcao, o CI nunca roda em merges para o branch principal.

---

## Sign-off

- [ ] APROVADO
- [x] APROVADO COM CONDICOES
- [ ] BLOQUEADO

**Condicoes para deploy em staging:**
1. C-001: Criar Dockerfile
2. C-002: Sincronizar branch name em ambos os workflows
3. C-003: Implementar deploy real no deploy.yml (Vercel CLI ou Railway CLI)
4. C-004: Gerar e commitar Prisma migrations iniciais

**Condicoes para deploy em producao (alem das acima):**
5. A-001: Trivy com upload SARIF
6. A-003: Separar tokens Railway por ambiente
7. A-004: CSP sem unsafe-eval/unsafe-inline
8. M-001: Sentry implementado e ativo
