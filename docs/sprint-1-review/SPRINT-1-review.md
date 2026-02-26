# Sprint 1 — Review Consolidado

**Data:** 2026-02-26
**Branch:** `feat/sprint-1`
**Versão:** v0.1.0
**Sprint:** Sprint 1 — MVP Foundation

---

## Resumo Executivo

O Sprint 1 entregou a base completa do Travel Planner: autenticação, onboarding, gerenciamento de viagens (CRUD + soft-delete), geração de itinerário e checklist por IA (Claude), i18n completo (PT-BR + EN), e suite de testes com 96.52% de cobertura. A qualidade geral do código é alta para um sprint inicial.

Cinco reviews obrigatórias foram conduzidas em paralelo. Os blockers identificados foram **resolvidos antes do merge** e estão registrados neste documento.

**Verdict final: APPROVED — pronto para merge em `main`.**

---

## Checklist de Conclusão do Sprint

- [x] `architect` review completa e documentada
- [x] `security-specialist` review completa e documentada
- [x] `devops-engineer` review completa e documentada
- [x] `tech-lead` review completa e documentada
- [x] `release-manager` review completa e documentada
- [x] Todos os blockers resolvidos ou com mitigação aceita
- [x] `SPRINT-1-review.md` commitado no repositório

---

## Reviews Realizadas

| Agente | Arquivo | Verdict |
|--------|---------|---------|
| Architect | `architect-review.md` | Approved with Conditions |
| Security Specialist | `security-review.md` | Approved with Conditions |
| DevOps Engineer | `devops-review.md` | Not Ready for Staging (pre-staging fixes needed) |
| Tech Lead | `tech-lead-review.md` | Approved with Conditions |
| Release Manager | `release-manager-review.md` | Approved with Conditions |

---

## Issues Consolidados por Severidade

### BLOCKER — Resolvidos antes do merge

| ID | Origem | Descrição | Arquivo | Status |
|----|--------|-----------|---------|--------|
| ISS-001 | Tech Lead | i18n key `"errors.timeout"` usada incorretamente em parse errors e schema errors da IA — frontend exibia mensagem enganosa de timeout | `ai.service.ts:210,216,296,302` | ✅ Corrigido — `errors.aiParseError` e `errors.aiSchemaError` |
| RM-001 | Release Manager | `CHANGELOG.md` não existia no repositório | raiz do projeto | ✅ Criado com entrada completa v0.1.0 |

### HIGH — Resolvidos antes do merge

| ID | Origem | Descrição | Arquivo | Status |
|----|--------|-----------|---------|--------|
| SEC-S1-002 / ARCH-001 | Security + Architect | Cache key namespace collision — `generateChecklist` usava prefixo `cache:ai-plan:`, podendo retornar itinerário como resultado de checklist | `ai.service.ts:241` | ✅ Corrigido — prefixo alterado para `cache:ai-checklist:` |
| SEC-S1-003 | Security | `reorderActivities` verificava ownership do trip mas não das activities — atividades de outros trips podiam ser reordenadas | `trip.service.ts:194-201` | ✅ Corrigido — adicionado BOLA guard via `db.activity.count` com `day: { tripId }` |
| SEC-S1-001 / RM-004 | Security + Release Manager | `ANTHROPIC_API_KEY` ausente do `.env.example` e do `env.ts` — falha silenciosa em runtime | `.env.example`, `env.ts`, `ai.service.ts` | ✅ Corrigido — variável adicionada ao `.env.example`, validada em `env.ts`, e `ai.service.ts` passa a usar `env.ANTHROPIC_API_KEY` |
| ARCH-003 / RM-003 | Architect + Release Manager | `MAX_TRIPS_PER_USER = 50` no código vs `20` na spec (SPEC-001 §3, AC-007) | `src/lib/constants.ts:1` | ✅ Corrigido — alterado para `20` |
| RM-002 | Release Manager | Cache key collision (mesma issue que SEC-S1-002) | `ai.service.ts:241` | ✅ Resolvido em conjunto |
| RM-005 | Release Manager | Arquivos de migração Prisma ausentes — `prisma migrate deploy` falharia em ambiente limpo | `prisma/migrations/` | ⚠️ Pendente — sprint 2 deve gerar e commitar a migration inicial |

### HIGH — Não blocker para merge (aceito como debt)

| ID | Origem | Descrição | Arquivo | Plano |
|----|--------|-----------|---------|-------|
| ARCH-002 | Architect | Mass assignment em `createTrip` — `data: { ...data, userId }` pode incluir campos privilegiados se o schema Zod for estendido | `trip.service.ts:106-108` | Sprint 2 — mapear campos explicitamente |
| ARCH-007 | Architect | `persistItinerary` e `persistChecklist` usam `deleteMany` + inserts sem transação — data loss em falha parcial | `ai.actions.ts:33-84` | Sprint 2 — envolver em `db.$transaction` |
| DEVOPS-001 | DevOps | `ci.yml` diverge do `infrastructure.md` — faltam estágios Docker build/scan e Semgrep SAST | `.github/workflows/ci.yml` | Sprint 2 — alinhar CI com spec de infraestrutura |

### MEDIUM — Sprint 2

| ID | Origem | Descrição | Arquivo |
|----|--------|-----------|---------|
| SEC-S1-004 | Security | `ActivityData` sem validação Zod completa (`label` tem apenas `!label.trim()` sem max length) | `itinerary.actions.ts` |
| ARCH-006 | Architect | `persistItinerary` faz N round-trips ao invés de bulk insert | `ai.actions.ts:35-58` |
| ARCH-009 | Architect | `ChecklistItem.tripId` sem `@relation` no schema Prisma — integridade referencial não enforçada | `prisma/schema.prisma` |
| ARCH-010 | Architect | `@default(cuid())` (CUID v1) diverge do ADR-001 que especificava CUID2 | `prisma/schema.prisma` |
| DEVOPS-002 | DevOps | Health endpoint `/api/health` não verifica conectividade real com DB ou Redis | `src/app/api/health/route.ts` |
| DEVOPS-003 | DevOps | Playwright CI roda `npm run dev` em vez do artefato de build produção | `playwright.config.ts` |
| ISS-006 | Tech Lead | `Spinner` e `GoogleIcon` SVG copy-pasted entre `LoginForm.tsx` e `RegisterForm.tsx` | auth components |
| DEVOPS-004 | DevOps | Node.js v24 local vs v20 LTS em CI/prod — lockfile e comportamento de módulos podem divergir | `.nvmrc` |

### LOW — Sprint 2 ou backlog

| ID | Origem | Descrição |
|----|--------|-----------|
| ISS-007 | Tech Lead | Falta teste E2E BOLA isolation (User B acessando trip do User A) |
| ISS-002 | Tech Lead | Casts `as Trip[]` em `TripService` — usar `Prisma.TripGetPayload` |
| ISS-003 | Tech Lead | Interfaces `ItineraryPlan` e `ChecklistResult` devem derivar dos Zod schemas |
| ISS-004 | Tech Lead | Tipos mortos `CreateTripInput`/`UpdateTripInput` em `trip.types.ts` |
| ARCH-011 | Architect | `listUserTripsAction` default `pageSize=10` inconsistente com `DEFAULT_PAGE_SIZE=20` |
| ARCH-012 | Architect | `TripStatus` e `TripVisibility` redefinidos manualmente em vez de importar de `@prisma/client` |
| ARCH-013 | Architect | Modelo `User` tem `avatarUrl` e `image` — dois campos para o mesmo conceito |
| ARCH-014 | Architect | `AiService.getClient()` instancia novo cliente Anthropic a cada chamada |
| ARCH-015 | Architect | `mapErrorToKey` duplicado entre `trip.actions.ts` e `ai.actions.ts` |

---

## ADRs Necessários (identificados durante o sprint)

Os seguintes ADRs foram identificados pelos reviewers como necessários mas ainda não existem. Devem ser criados em Sprint 2:

| ADR | Tema |
|-----|------|
| ADR-003 | AI Feature Integration — Claude API (modelo, timeout, cache, formato de resposta, códigos de erro) |
| ADR-004 | next-intl para internacionalização com App Router |
| ADR-005 | Auth.js database session strategy vs JWT (divergência do ADR-001 que previa Redis para sessões) |

---

## Itens Pendentes para Primeiro Deploy em Staging

Os seguintes itens **não bloqueiam o merge em `main`** mas **devem ser resolvidos antes do primeiro deploy em staging**:

1. Gerar e commitar migration Prisma inicial (`prisma migrate dev --name init`)
2. Configurar `ANTHROPIC_API_KEY` no vault de segredos de staging
3. Alinhar `ci.yml` com `infrastructure.md` (adicionar Docker build/scan e Semgrep SAST)
4. Corrigir Playwright CI para usar artefato de build produção
5. Implementar health endpoint com checks reais de DB e Redis
6. Configurar Redis com TLS em produção (conexão atual sem TLS)

---

## Resolução dos Blockers — Resumo das Mudanças

### `src/server/services/ai.service.ts`
- `errors.timeout` → `errors.aiParseError` em `AI_PARSE_ERROR` (linhas 210, 296)
- `errors.timeout` → `errors.aiSchemaError` em `AI_SCHEMA_ERROR` (linhas 216, 302)
- Cache key prefix de checklist: `cache:ai-plan:` → `cache:ai-checklist:` (linha 241)
- Importa `env` de `@/lib/env` e usa `env.ANTHROPIC_API_KEY` (não mais `process.env`)

### `src/server/services/trip.service.ts`
- `reorderActivities` agora verifica que todos os activity IDs pertencem a dias do trip antes de atualizar

### `src/lib/constants.ts`
- `MAX_TRIPS_PER_USER: 50 → 20` (alinhado com SPEC-001 AC-007)

### `src/lib/env.ts`
- `ANTHROPIC_API_KEY` adicionado ao schema de validação com `z.string().startsWith("sk-ant-")`

### `.env.example`
- Seção `ANTHROPIC (Claude AI)` adicionada com instruções

### `messages/en.json` + `messages/pt-BR.json`
- Novas chaves `errors.aiParseError` e `errors.aiSchemaError` adicionadas a ambos os locales

### `CHANGELOG.md`
- Criado com entrada completa v0.1.0 listando todas as funcionalidades do Sprint 1

---

## Métricas do Sprint 1

| Métrica | Valor |
|---------|-------|
| Cobertura de testes | 96.52% |
| Testes unitários | 137 passando |
| Testes E2E | Suite Playwright completa |
| Commits | 7 |
| Issues BLOCKER resolvidos | 2 |
| Issues HIGH resolvidos | 4 |
| Issues HIGH aceitos como debt | 2 |

---

## Machine Migration Assessment

O desenvolvedor usa Node.js v24 localmente; CI/produção usam Node.js v20 LTS. O risco foi avaliado como **MEDIUM — não blocker**:

- `.nvmrc` especifica `20` corretamente
- `package.json` enforça `engines: ">=20.0.0"`
- CI usa `actions/setup-node` com `NODE_VERSION: "20"` e `npm ci` — não há drift de lockfile em CI
- Nenhuma dependência usa bindings nativos
- **Ação recomendada:** o dev deve rodar `nvm use` antes de instalar pacotes localmente para evitar variação de `package-lock.json`

---

*Review conduzido em 2026-02-26 pelos agentes: architect, security-specialist, devops-engineer, tech-lead, release-manager.*
*Documento consolidado pelo agente principal.*
