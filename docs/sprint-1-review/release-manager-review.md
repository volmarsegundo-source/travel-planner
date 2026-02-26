# Release Manager Review — Sprint 1
**Data:** 2026-02-26
**Reviewer:** release-manager
**Branch:** feat/sprint-1
**Commits revisados:** 432f0dc → 8bed6dd (7 commits)
**Versao atual (package.json):** 0.1.0

---

## Executive Summary

O Sprint 1 entregou a base completa do Travel Planner: autenticacao (Auth.js v5),
gerenciamento de viagens (CRUD + soft delete), servico de IA (geracao de itinerario e
checklist), i18n, e suite de testes (Vitest + Playwright). A base tecnica e solida.

Do ponto de vista de release, dois problemas criticos bloqueiam o merge em `main`:

1. **Ausencia de CHANGELOG.md** — o projeto nao tem historico de release documentado.
   O CHANGELOG e obrigatorio antes do primeiro merge em main, conforme convenao de equipe.

2. **Divergencia de constante entre spec e codigo** — `MAX_TRIPS_PER_USER` esta definido
   como `50` em `src/lib/constants.ts`, mas a spec (SPEC-001, AC-007) e o CIA-001 definem
   o limite como `20`. Isso invalida o criterio de aceite AC-007 e e inconsistente com as
   release notes ja redigidas no CIA-001.

Alem desses dois blockers, ha tres issues de alta severidade — cache key collision no
`ai.service.ts`, ausencia de arquivos de migracao Prisma, e i18n keys incorretas no
`ai.service.ts` — e varios issues de media e baixa severidade documentados abaixo.

**Verdict: APPROVED WITH CONDITIONS**

O merge em `main` so pode ocorrer apos resolucao dos 2 blockers e dos 3 issues HIGH.

---

## 1. Changelog Completeness

### 1.1 Estado atual

O arquivo `CHANGELOG.md` **nao existe** no repositorio. Verificado com:
- `ls /c/travel-planner/CHANGELOG.md` → File does not exist

O CIA-001 (ja aprovado) inclui um draft de entrada de changelog para v0.1.0 na Secao
"Changelog Entry". Essa entrada precisa ser materializada no arquivo fisico antes do merge.

### 1.2 Analise dos commits — convencao Conventional Commits

| Commit | Mensagem | Conformidade | Observacao |
|--------|----------|:------------:|------------|
| 432f0dc | `chore: bootstrap Node.js project — SETUP-001 through SETUP-008 complete` | OK | Correto |
| c633a19 | `feat: T-012 i18n setup + T-001 auth backend` | OK | Multiplos escopos em um commit — aceitavel para sprint inicial |
| fdf2baf | `fix: resolve ESLint and Vitest config issues post T-001/T-012` | OK | Correto |
| 0a6d87f | `feat: T-002 auth UI + T-003 trust signals + T-004 onboarding` | OK | Multiplos escopos — aceitavel |
| 20eb571 | `feat: T-005 trip CRUD backend + T-006 trip dashboard UI` | OK | Multiplos escopos — aceitavel |
| 878cc93 | `feat: T-007+T-010+T-008+T-009+T-011 AI service and UI` | OK | Multiplos escopos — aceitavel |
| 8bed6dd | `test: T-013 coverage audit + T-014 E2E Playwright tests` | OK | Correto |

Todos os 7 commits seguem Conventional Commits. Nenhum commit utiliza `!` para sinalizar
breaking change — correto, pois nao ha contratos publicos pre-existentes sendo alterados.

### 1.3 O que o CHANGELOG deve conter para v0.1.0

O draft do CIA-001 cobre as funcionalidades de US-001 (trips). O Sprint 1 entregou
funcionalidades adicionais que devem ser incluidas:

- **Auth (T-001/T-002):** autenticacao com email/password e Google OAuth via Auth.js v5
- **Onboarding (T-004):** wizard de 3 etapas pos-registro
- **Trust signals (T-003):** indicadores de privacidade no formulario de registro
- **i18n (T-012):** suporte a internacionalizacao com `next-intl`
- **AI service (T-007 a T-011):** geracao de itinerario e checklist via Claude
- **Testes (T-013/T-014):** suite Vitest (137 testes, 96.52% de cobertura) + Playwright E2E

### 1.4 Acao necessaria (BLOCKER-1)

Criar `CHANGELOG.md` na raiz do projeto com a entrada v0.1.0 completa cobrindo todas as
funcionalidades do Sprint 1. Utilizar o formato Keep a Changelog.

---

## 2. Version Bump

### 2.1 Versao atual

`package.json` ja declara `"version": "0.1.0"`. Esta e a versao correta para o Sprint 1,
conforme estabelecido no CIA-001 e na politica de versionamento documentada na memoria do
release-manager.

### 2.2 Justificativa SemVer

- MAJOR `0.x.x`: pre-1.0, API publica nao estavel (correto — nao ha endpoints REST publicos ainda)
- MINOR `0.1.x`: primeira entrega de funcionalidade significativa (auth + trips + AI + testes)
- PATCH: nao se aplica — Sprint 1 entregou features, nao apenas bug fixes

**Versao recomendada para tag de release:** `v0.1.0` (sem alteracao no package.json)

### 2.3 Proxima versao esperada

| Tipo de entrega | Versao esperada |
|---|---|
| Sprint 2 — novas features (Itinerary Builder, Bookmarks) | 0.2.0 |
| Hotfix pos-sprint no branch main | 0.1.1 |
| Primeiro release com API REST publica e estavel | 1.0.0 |

---

## 3. Breaking Changes

### 3.1 Contratos de API

Nao existem contratos de API publicos pre-existentes. O Sprint 1 e greenfield.

- Todos os endpoints REST sob `/api/v1/` sao novos (nao modificacoes)
- Todas as Server Actions sao novas (nenhuma assinatura pre-existente alterada)
- Nenhum consumer externo existia antes deste sprint

**Veredicto: Zero breaking changes de contrato de API.**

### 3.2 Schema de banco de dados

Nao ha banco de dados em producao. O schema Prisma e criado do zero.

**Veredicto: Zero breaking changes de schema.**

### 3.3 Desvio de spec que PODE impactar releases futuras

O `MAX_TRIPS_PER_USER = 50` no codigo diverge do limite `20` documentado em SPEC-001,
CIA-001, e nas release notes redigidas. Isso nao e um breaking change agora (nao ha
usuarios), mas se for ao ar com `50`, qualquer correccao futura para `20` sera uma breaking
change comportamental para usuarios que ja tiverem entre 21 e 50 viagens. Deve ser
corrigido AGORA, antes do primeiro deploy.

---

## 4. Migration Notes

### 4.1 Instrucoes para primeiro deploy (novo ambiente)

```bash
# 1. Clonar repositorio e instalar dependencias
git clone <repo-url>
cd travel-planner
npm ci                        # SEMPRE npm ci, nunca npm install

# 2. Configurar variaveis de ambiente
cp .env.example .env.local
# Preencher TODOS os campos — ver secao 6 deste documento

# 3. Subir servicos locais
docker compose up -d          # PostgreSQL:5432 + Redis:6379
# Aguardar status 'healthy' antes de prosseguir

# 4. CRITICO: gerar migration inicial (ver BLOCKER na secao 3.4)
npx prisma migrate dev --name init
# Este passo gera prisma/migrations/ que ainda NAO existe no repositorio

# 5. Gerar Prisma client
npx prisma generate

# 6. (Opcional) Popular banco com dados iniciais
npx prisma db seed

# 7. Iniciar servidor de desenvolvimento
npm run dev
```

### 4.2 Instrucoes para deploy em staging/producao

```bash
# No ambiente de CI/CD (apos merge em main)
npm ci
npx prisma migrate deploy     # Aplica migrations — requer prisma/migrations/ existir
npx prisma generate
npm run build
npm run start
```

**ATENCAO:** O passo `npx prisma migrate deploy` falha se `prisma/migrations/` nao existir.
Este diretorio esta ausente do repositorio (INFRA-REV-001). Resolver antes do merge.

### 4.3 Ordem de migracao de schema

Por dependencia de chave estrangeira:
1. Tabela `users` (criada pelo schema Auth.js — User model)
2. Tabela `trips` (referencias `users.id` via FK)
3. Tabelas `itinerary_days`, `activities`, `checklist_items`

A migration unica gerada por `prisma migrate dev --name init` vai produzir todo o DDL
na ordem correta automaticamente (Prisma resolve dependencias de FK).

### 4.4 Modelo de dados — diferenca entre spec e implementacao

A spec original (SPEC-001/CIA-001) previa o modelo de dados descrito em `docs/architecture.md`
(com tabela `Destination`, `Bookmark`). O schema atual implementado (`prisma/schema.prisma`)
difere:

| Tabela prevista na spec | Status na implementacao |
|---|---|
| `User` | Implementada (com campos adicionais: `passwordHash`, `image` para Auth.js) |
| `Trip` | Implementada (conforme spec, com `coverGradient` e `coverEmoji` em vez de `coverImageUrl`) |
| `ItineraryDay` | Implementada |
| `Activity` | Implementada (sem `destinationId` FK — referencia a Destination removida) |
| `Destination` | **Nao implementada** — sera Sprint 2+ |
| `Bookmark` | **Nao implementada** — sera Sprint 2+ |
| `ChecklistItem` | **Adicionada** — nao estava na spec original do architecture.md |

Estas diferencas sao todas **aditivas ou de escopo reduzido** — nao constituem breaking
changes para o Sprint 1.

---

## 5. Machine Migration Assessment

### 5.1 Contexto

O desenvolvedor usou Node.js v24 localmente. O projeto e CI/producao especificam Node.js
v20 LTS.

### 5.2 Controles existentes

| Controle | Status | Evidencia |
|---|---|---|
| `.nvmrc` especifica `20` | Presente | `cat .nvmrc` → `20` |
| `package.json engines` | `"node": ">=20.0.0"` | package.json linha 77 |
| CI pin `NODE_VERSION: "20"` | Presente | ci.yml (conforme devops-review) |
| Lockfile versao | lockfileVersion 3 | package-lock.json header |

### 5.3 Riscos identificados

**Risco 1 — Lockfile gerado sob Node.js v24 (MEDIUM)**

`package-lock.json` com `lockfileVersion: 3` e compativel com npm v7+. Node.js v20 e v24
ambos incluem npm v10, portanto a versao do lockfile e a mesma. Nao ha risco de formato
incompativel. No entanto, se o desenvolvedor executou `npm install` (em vez de `npm ci`)
sob Node.js v24, versoes de dependencias resolvidas podem diferir de uma instalacao limpa
sob Node.js v20. O CI usa `npm ci` corretamente, mitigando este risco em producao.

**Acao:** Verificar se o lockfile foi gerado com `npm install` ou `npm ci`. Recomendado:
excluir `node_modules/` e `package-lock.json`, rodar `npm install` sob Node.js v20 para
regenerar o lockfile em ambiente canonico.

**Risco 2 — Dependencias com bindings nativos (LOW)**

Nenhuma dependencia de producao usa bindings nativos compilados por ABI:
- `bcryptjs` — pure JavaScript
- `ioredis` — pure JavaScript
- `@prisma/client` — Prisma 7 usa pure TypeScript (sem binario Rust)

Este risco nao se materializa para a dependencias atuais.

**Risco 3 — Comportamento de APIs Node.js (LOW)**

Node.js v24 pode ter APIs com comportamento ligeiramente diferente do v20 em casos edge
(ex: `AbortSignal.timeout`, crypto). O `ai.service.ts` usa `AbortSignal.timeout(55000)` —
disponivel desde Node.js v17.3, portanto sem risco entre v20 e v24.

**Risco 4 — Nenhum enforcement local (MEDIUM)**

Sem `nvm` ou `fnm` instalado na maquina de desenvolvimento, o `.nvmrc` e apenas decorativo.
Novos membros da equipe que nao tenham um version manager instalado usarao a versao
sistema, qualquer que seja. O devops-review recomenda adicionar um script `predev` de
verificacao de versao — esta recomendacao e endossada aqui.

### 5.4 Impacto consolidado para este release

O lockfile gerado localmente sob Node.js v24 NAO invalida o release, porque:
- `npm ci` no CI instala exatamente o que o lockfile especifica
- Nenhuma dependencia usa bindings nativos
- `lockfileVersion: 3` e compativel com npm v10 em Node.js v20 e v24

**Classificacao de risco:** MEDIUM (condicional) — mitigado pelos controles de CI.
Acao de remediacao recomendada para Sprint 2, nao e blocker para merge.

---

## 6. Environment Consistency

### 6.1 Estado do `.env.example`

O arquivo `.env.example` foi lido e avaliado linha a linha.

| Variavel | Presente | Observacao |
|---|---|---|
| `DATABASE_URL` | Sim | Valor local de exemplo incluido |
| `REDIS_URL` | Sim | Valor local `redis://localhost:6379` incluido |
| `UPSTASH_REDIS_REST_URL` | Sim | Placeholder presente |
| `UPSTASH_REDIS_REST_TOKEN` | Sim | Placeholder presente |
| `NEXTAUTH_SECRET` | Sim | Instrucao de geracao incluida |
| `NEXTAUTH_URL` | Sim | |
| `GOOGLE_CLIENT_ID` | Sim | Placeholder presente |
| `GOOGLE_CLIENT_SECRET` | Sim | Placeholder presente |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Sim | Prefix `NEXT_PUBLIC_` correto |
| `MAPBOX_SECRET_TOKEN` | Sim | Sem `NEXT_PUBLIC_` — correto |
| `SENTRY_DSN` | Sim | |
| `NEXT_PUBLIC_SENTRY_DSN` | Sim | |
| `SENTRY_AUTH_TOKEN` | Sim | |
| `NEXT_PUBLIC_APP_URL` | Sim | |
| `NODE_ENV` | Sim | |
| `ANTHROPIC_API_KEY` | **AUSENTE** | **BLOCKER de seguranca (SEC-S1-001)** |

### 6.2 Analise: ANTHROPIC_API_KEY ausente

O `ai.service.ts` instancia o cliente Anthropic via:
```typescript
return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

Esta variavel nao esta em `.env.example`. Qualquer desenvolvedor que clonar o projeto e
copiar `.env.example` para `.env.local` nao tera esta variavel configurada. O servico de
IA vai falhar silenciosamente (a SDK Anthropic trata `undefined` como "sem autenticacao"
e retorna erro na primeira chamada de API, nao no boot).

Adicionalmente, o `env.ts` nao valida `ANTHROPIC_API_KEY` — confirmado pela analise do
security-review (SEC-S1-001). Sem validacao em startup, o erro so aparece em runtime
quando o usuario tenta usar o recurso de IA.

**Acao requerida:** Adicionar `ANTHROPIC_API_KEY` ao `.env.example` e ao `src/lib/env.ts`.

### 6.3 Variaveis validadas vs documentadas

| Variavel | No `.env.example` | No `env.ts` | Observacao |
|---|---|---|---|
| `DATABASE_URL` | Sim | Sim | OK |
| `REDIS_URL` | Sim | Sim | OK |
| `NEXTAUTH_SECRET` | Sim | Sim | OK |
| `GOOGLE_CLIENT_ID` | Sim | Presumido em auth.ts | |
| `GOOGLE_CLIENT_SECRET` | Sim | Presumido em auth.ts | |
| `MAPBOX_SECRET_TOKEN` | Sim | Sim | OK |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Sim | Sim | OK |
| `NEXT_PUBLIC_APP_URL` | Sim | Sim | OK |
| `ANTHROPIC_API_KEY` | **NAO** | **NAO** | BLOCKER |
| `UPSTASH_REDIS_REST_URL` | Sim | **NAO** | Warning (devops-review INFRA-REV-010) |
| `UPSTASH_REDIS_REST_TOKEN` | Sim | **NAO** | Warning (devops-review INFRA-REV-010) |
| `SENTRY_DSN` | Sim | **NAO** | Aceitavel — Sentry inicializa gracefully sem DSN |

---

## 7. Impact Assessment dos Issues dos Outros Reviewers

### 7.1 Issues do Architect Review

| ID | Descricao | Severidade Release | Blocking para merge? | Justificativa |
|---|---|:---:|:---:|---|
| ARCH-001 | Cache key collision: `generateTravelPlan` e `generateChecklist` usam o mesmo prefixo `cache:ai-plan:` e podem ter hash MD5 identico com entradas diferentes | HIGH | SIM | Bug de runtime confirmado no codigo — `ai.service.ts` linhas 135 e 241 ambas usam `cache:ai-plan:${cacheHash}`. Um plano de viagem pode ser retornado como checklist e vice-versa. |
| ARCH-002 | Mass-assignment em `trip.service.ts` `createTrip` usando `...data` | MEDIUM | NAO | Mitigado pela tipagem `TripCreateInput` via Zod — apenas campos validados passam. O risco real e baixo pois o Zod schema define exatamente quais campos sao aceitos. Recomenda-se usar select explicito de campos, mas nao e blocker. |
| ARCH-003 | `.env.example` faltando `REDIS_URL` | INVALIDO | NAO | `.env.example` JA CONTEM `REDIS_URL` na linha 15. Este finding do architect-review esta incorreto — possivelmente baseado em versao anterior do arquivo. |
| ARCH-004 | `MAX_TRIPS_PER_USER` no codigo e 50, spec diz 20 | HIGH | SIM | Confirmado: `src/lib/constants.ts` linha 1 → `export const MAX_TRIPS_PER_USER = 50`. Criterio de aceite AC-007 e as release notes do CIA-001 especificam 20. Esta divergencia torna o AC-007 invalidado. |

### 7.2 Issues do Security Review

| ID | Descricao | Severidade Release | Blocking para merge? | Justificativa |
|---|---|:---:|:---:|---|
| SEC-S1-001 | `ANTHROPIC_API_KEY` ausente em `.env.example` e `env.ts` | HIGH | SIM | Qualquer desenvolvedor novo ou qualquer ambiente de staging que copie `.env.example` ficara sem esta variavel. O servico de IA falha em runtime sem mensagem de startup clara. |
| SEC-S1-002 | Cache key collision em `ai.service.ts` (mesmo que ARCH-001) | HIGH | SIM | Duplicado de ARCH-001 — mesmo blocker. |
| SEC-S1-003 | `reorderActivities` verifica ownership do trip mas nao das activities individuais — activities de outros trips com IDs conhecidos poderiam ser movidas | MEDIUM | NAO | A verificacao de ownership no nivel do trip e o controle primario correto. O risco real exige que o atacante conheca IDs de activities de outros usuarios (CUIDs — não previsíveis). Nao e blocker, mas deve ser documentado como tech debt. |
| SEC-S1-004 | `ActivityData` sem validacao Zod completa | MEDIUM | NAO | Risco mitigado pelo tipo TypeScript. Deve ser adicionado Zod schema em Sprint 2 para validacao em runtime de entradas de usuario. |

### 7.3 Issues do Tech-Lead Review

| ID | Descricao | Severidade Release | Blocking para merge? | Justificativa |
|---|---|:---:|:---:|---|
| ISS-001 | i18n keys incorretas em `ai.service.ts` — usa `"errors.timeout"` em linhas 210, 216, 297, 302 onde deveria ser `"errors.aiParseError"` e `"errors.aiSchemaError"` | HIGH | SIM | Usuarios veem mensagem de "timeout" quando o erro real e de parse ou schema da resposta da IA. Erro de UX confirmado no codigo. Linhas 201, 210, 216, 287, 296, 302 afetadas. |
| ISS-006 | SVG duplicados entre LoginForm e RegisterForm | LOW | NAO | Duplicacao de codigo — nao afeta funcionalidade ou contratos de release. Refactor para Sprint 2. |
| ISS-007 | Teste E2E de BOLA isolation ausente | MEDIUM | NAO | A logica de BOLA esta implementada e coberta por testes unitarios. A ausencia de teste E2E especifico e um gap de cobertura, nao um blocker de merge. Deve ser adicionado em Sprint 2. |

### 7.4 Issues do DevOps Review

| ID | Descricao | Severidade Release | Blocking para merge? | Justificativa |
|---|---|:---:|:---:|---|
| INFRA-REV-001 | `prisma/migrations/` nao existe | HIGH | SIM | Sem arquivos de migration, `prisma migrate deploy` em CI e em producao falha ou e no-op. O schema nao pode ser aplicado a um banco limpo de forma controlada e auditavel. |
| INFRA-REV-002 | Docker build/Trivy scan ausente no ci.yml | HIGH | NAO para merge em main — SIM para producao | Nao impede merge em main do Sprint 1 (ainda em desenvolvimento), mas deve ser resolvido antes do primeiro deploy em producao. |
| INFRA-REV-003 | Semgrep SAST ausente no ci.yml | HIGH | NAO para merge em main — SIM para producao | Mesmo racional do INFRA-REV-002. |
| INFRA-REV-004 | Health endpoint retorna `"not_checked"` | MEDIUM | NAO | Funcionalidade de monitoramento incompleta — nao bloqueia merge. Sprint 2. |
| INFRA-REV-005 | Playwright usa `npm run dev` em CI | MEDIUM | NAO | E2E nao valida build de producao — gap de qualidade, nao blocker de merge. Sprint 2. |
| INFRA-REV-006 | Redis sem handler de erro | MEDIUM | NAO | Risco de crash por unhandled error event. Deve ser corrigido antes de producao. |
| INFRA-REV-007 | `next-auth` beta com caret (`^5.0.0-beta.25`) | MEDIUM | NAO | Risco de upgrade involuntario de beta. Deve ser fixado antes de producao. |

---

## 8. Tabela Consolidada de Findings

| ID | Origem | Severidade | Blocking Merge? | Descricao Curta |
|---|---|:---:|:---:|---|
| RM-001 | Release Manager | BLOCKER | SIM | `CHANGELOG.md` nao existe no repositorio |
| RM-002 | Architect / Security | BLOCKER | SIM | Cache key collision em `ai.service.ts` (ARCH-001 / SEC-S1-002) |
| RM-003 | Architect | BLOCKER | SIM | `MAX_TRIPS_PER_USER = 50` vs spec que define 20 (ARCH-004) |
| RM-004 | Security | BLOCKER | SIM | `ANTHROPIC_API_KEY` ausente em `.env.example` e `env.ts` (SEC-S1-001) |
| RM-005 | DevOps | BLOCKER | SIM | `prisma/migrations/` nao existe (INFRA-REV-001) |
| RM-006 | Tech-Lead | HIGH | SIM | i18n keys incorretas em `ai.service.ts` — `errors.timeout` onde deveria ser `errors.aiParseError` / `errors.aiSchemaError` (ISS-001) |
| RM-007 | DevOps | HIGH | NAO (pre-prod) | Docker build/Trivy scan ausente no ci.yml (INFRA-REV-002) |
| RM-008 | DevOps | HIGH | NAO (pre-prod) | Semgrep SAST ausente no ci.yml (INFRA-REV-003) |
| RM-009 | Security | MEDIUM | NAO | `reorderActivities` sem validacao de ownership de activity individual (SEC-S1-003) |
| RM-010 | Security | MEDIUM | NAO | `ActivityData` sem validacao Zod completa (SEC-S1-004) |
| RM-011 | Architect | MEDIUM | NAO | Mass-assignment em `createTrip` — risco baixo mas deve usar select explicito (ARCH-002) |
| RM-012 | DevOps | MEDIUM | NAO | Health endpoint retorna `"not_checked"` (INFRA-REV-004) |
| RM-013 | DevOps | MEDIUM | NAO | Playwright `webServer` usa dev server em CI (INFRA-REV-005) |
| RM-014 | DevOps | MEDIUM | NAO | Redis sem handler de erro — risco de crash (INFRA-REV-006) |
| RM-015 | DevOps | MEDIUM | NAO | `next-auth` beta com `^` — upgrade involuntario possivel (INFRA-REV-007) |
| RM-016 | Machine Migration | MEDIUM | NAO | Lockfile gerado sob Node.js v24 — CI mitiga, mas recomenda regenerar sob v20 |
| RM-017 | Tech-Lead | MEDIUM | NAO | Teste E2E de BOLA isolation ausente (ISS-007) |
| RM-018 | Tech-Lead | LOW | NAO | SVG duplicados entre LoginForm e RegisterForm (ISS-006) |
| RM-019 | DevOps | LOW | NAO | Varios issues de configuracao CI (INFRA-REV-008 a INFRA-REV-013) |
| RM-020 | Architect | INVALIDO | NAO | ARCH-003 (`REDIS_URL` ausente) — `.env.example` JA CONTEM esta variavel |

---

## 9. Checklist de Release

### Antes do merge em main

- [ ] RM-001: Criar `CHANGELOG.md` com entrada v0.1.0 completa (Keep a Changelog format)
- [ ] RM-002: Corrigir cache key collision em `ai.service.ts` — usar prefixos distintos para plan e checklist (ex: `cache:ai-plan:` e `cache:ai-checklist:`)
- [ ] RM-003: Corrigir `MAX_TRIPS_PER_USER` de `50` para `20` em `src/lib/constants.ts`
- [ ] RM-004: Adicionar `ANTHROPIC_API_KEY` ao `.env.example` e ao `src/lib/env.ts`
- [ ] RM-005: Executar `npx prisma migrate dev --name init` localmente e commitar `prisma/migrations/`
- [ ] RM-006: Corrigir i18n keys em `ai.service.ts` linhas 201, 210, 216, 287, 296, 302

### Antes do primeiro deploy em staging

- [ ] RM-007: Adicionar Docker build + Trivy scan ao ci.yml
- [ ] RM-008: Adicionar Semgrep SAST ao ci.yml
- [ ] RM-014: Adicionar handler `redis.on('error', ...)` em `src/server/cache/redis.ts`
- [ ] RM-015: Remover `^` de `"next-auth": "5.0.0-beta.25"` no package.json
- [ ] RM-016: Regenerar lockfile sob Node.js v20 (opcional mas recomendado)

### Antes do primeiro deploy em producao

- [ ] RM-009: Adicionar validacao de ownership de activity em `reorderActivities`
- [ ] RM-010: Adicionar schema Zod para `ActivityData`
- [ ] RM-012: Implementar probes reais de DB e Redis no health endpoint
- [ ] RM-013: Corrigir `webServer.command` no playwright.config.ts para usar `npm run start` em CI
- [ ] RM-017: Adicionar teste E2E de BOLA isolation

---

## 10. Draft do CHANGELOG.md

O arquivo fisico ainda nao existe. Abaixo o rascunho completo para v0.1.0, incorporando
todas as funcionalidades do Sprint 1 (nao apenas as do CIA-001).

```markdown
# Changelog

All notable changes to Travel Planner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-02-26

### Added
- Authentication with email/password credentials and Google OAuth via Auth.js v5
  with Prisma adapter and PostgreSQL session storage
- User registration with email uniqueness validation and bcrypt password hashing
- 3-step onboarding wizard shown to new users after first login
- Trust signals component on registration form with privacy statement
- Trip creation with title, destination, optional date range, optional description,
  cover gradient (8 options), and emoji selector
- Trip dashboard at `/trips` with status filter tabs: Planning, Active, Completed, Archived
- Trip detail page at `/trips/[id]` displaying all trip information and itinerary placeholder
- Trip editing at `/trips/[id]/edit` — all fields editable, including past start dates
- Trip archiving: changes status to ARCHIVED; trip remains accessible via Archived filter
- Trip soft delete with title confirmation; deleted trips are removed from all listings
- Trip limit enforcement: maximum of 20 active trips per user (Planning, Active, Completed)
- Empty state with "Create my first trip" call to action when no trips exist
- Paginated trip listing with 20 items per page
- AI-powered travel itinerary generation via Claude (day-by-day plan with activities,
  costs, and travel tips) with 24-hour Redis cache
- AI-powered pre-trip checklist generation via Claude Haiku (Documents, Health, Currency,
  Weather, Technology categories) with 24-hour Redis cache
- Activity drag-and-drop reordering with atomic database transaction
- Internationalization (i18n) support via next-intl for all user-facing strings
- Structured JSON logging with severity levels (info, warn, error) — PII-safe by design
- Health endpoint at `GET /api/v1/health`
- Redis cache for trip list, trip count, trip detail, and AI responses
- Three composite database indexes on the trips table covering all primary query patterns
- Soft-delete Prisma middleware: deleted trips and users are excluded from all queries
- User data isolation: all trip queries enforce `userId` filter at the database level
- Full keyboard navigation and screen reader support on all forms (WCAG 2.1 AA)
- Responsive layout validated at 375px viewport (no horizontal scroll)
- 137-test Vitest suite with 96.52% line coverage and 88.2% branch coverage
- Playwright E2E tests covering authentication flow and trip creation flow
```

---

## 11. Draft das Release Notes para Stakeholders (v0.1.0)

```
Travel Planner — Versao 0.1.0
Data: 2026-02-26

O que ha de novo

Esta e a primeira versao do Travel Planner — a fundacao sobre a qual todas
as funcionalidades futuras serao construidas.

Funcionalidades disponiveis

Crie sua conta com email e senha ou com sua conta Google. Apos o primeiro
acesso, um breve assistente de boas-vindas apresenta o produto e prepara
seu perfil.

Organize suas viagens em um so lugar: crie uma viagem com nome, destino,
datas e uma capa personalizada com gradiente e emoji. Voce pode editar,
arquivar ou excluir suas viagens a qualquer momento. Cada usuario pode
ter ate 20 viagens ativas simultaneamente.

Planejamento inteligente com IA: solicite um roteiro completo dia a dia
para o seu destino — o Travel Planner usa inteligencia artificial para
gerar atividades, horarios e estimativas de custo. Tambem e possivel gerar
uma lista de preparativos personalizada para a viagem (documentos, saude,
moeda, clima e tecnologia).

Privacidade e seguranca: suas viagens sao privadas por padrao e visiveis
apenas para voce. Nenhum dado pessoal e compartilhado com terceiros sem
seu consentimento.

Limites desta versao

- Ate 20 viagens ativas por conta. Viagens arquivadas nao contam para este limite.
- A foto de capa e representada por um gradiente de cor e um emoji nesta versao.
  Upload de imagem personalizada sera adicionado em breve.
- O construtor de itinerario detalhado (arrastar e soltar atividades nos dias)
  sera entregue na proxima versao.

Compatibilidade

Interface testada em Chrome, Firefox e Safari, em telas a partir de 375px.
O formulario de criacao de viagem e totalmente operavel via teclado e compativel
com leitores de tela.
```

---

## Verdict Final

**APPROVED WITH CONDITIONS**

O Sprint 1 entregou uma base tecnica solida com arquitetura bem estruturada,
cobertura de testes acima do minimo exigido (96.52% vs 80% de threshold), e
padroes de seguranca adequados para o estagio de desenvolvimento.

O merge em `main` e bloqueado ate que os seguintes 6 itens sejam resolvidos:

| # | Item | Esforco estimado |
|---|---|---|
| 1 | Criar `CHANGELOG.md` com entrada v0.1.0 | 30 min |
| 2 | Corrigir cache key collision em `ai.service.ts` | 15 min |
| 3 | Corrigir `MAX_TRIPS_PER_USER` de 50 para 20 | 5 min |
| 4 | Adicionar `ANTHROPIC_API_KEY` ao `.env.example` e `env.ts` | 15 min |
| 5 | Gerar e commitar `prisma/migrations/` | 15 min |
| 6 | Corrigir i18n keys erradas em `ai.service.ts` | 20 min |

Esforco total estimado: aproximadamente 1h40min para resolucao de todos os blockers.

Apos resolucao dos blockers, o merge pode ser aprovado pelo tech-lead.
Os demais issues (MEDIUM/LOW) devem ser priorizados como primeiras tarefas do Sprint 2,
antes do primeiro deploy em staging.

---

*Review conduzida em 2026-02-26 pelo release-manager.*
*Baseada na leitura direta dos arquivos: `package.json`, `.env.example`, `.nvmrc`,*
*`prisma/schema.prisma`, `src/server/services/ai.service.ts`,*
*`src/server/services/trip.service.ts`, `src/lib/constants.ts`,*
*`docs/architecture.md`, `docs/CIA-001.md`, `docs/SPEC-001.md`,*
*e nos reviews dos agentes: architect, security-specialist, devops-engineer, tech-lead.*
