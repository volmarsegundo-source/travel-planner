# Sprint 2 Review — Relatório Consolidado

**Sprint**: 2 — Hardening de Segurança, Infraestrutura e Qualidade
**Branch**: `feat/sprint-2-hardening` → merged em `master` (`8213e15`)
**Data**: 2026-02-26
**Escopo**: 41 arquivos alterados · 699 inserções · 200 remoções · 137/137 testes ✅

---

## Checklist de Reviews

- [x] `architect` — concluído
- [x] `security-specialist` — concluído
- [x] `devops-engineer` — concluído (arquivo: `SPRINT-2-devops-review.md`)
- [x] `tech-lead` — concluído
- [x] `release-manager` — concluído
- [x] `finops-engineer` — concluído (detalhes: `docs/finops/COST-LOG.md`)

---

## Veredicto Consolidado

🔴 **BLOQUEADO PARA DEPLOY** — 4 bloqueadores críticos identificados. Nenhum deploy em staging ou produção antes da resolução dos itens CRÍTICOS abaixo.

---

## Bloqueadores Críticos (resolver antes de qualquer deploy)

| ID | Agente | Bloqueador | Ação |
|----|--------|-----------|------|
| **BC-001** | release-manager | Prisma migration ausente — `deactivatedAt`, `avatarUrl` removido, `ChecklistItem` sem `prisma/migrations/` | `npx prisma migrate dev --name sprint-2-schema-changes` + commit |
| **BC-002** | devops-engineer | `ci.yml` dispara em `branches: [main]` mas repo usa `master` — CI nunca rodou em merges | Corrigir para `branches: [master]` |
| **BC-003** | security-specialist | `Dockerfile` ausente — job Trivy do CI falha em todo PR, proteção contra CVEs é falsa garantia | Criar `Dockerfile` conforme `docs/infrastructure.md` |
| **BC-004** | security-specialist | Sem rate limiting no endpoint de login (`/api/auth/callback/credentials`) — ataques de força bruta ilimitados | Middleware Next.js interceptando POST do next-auth com `checkRateLimit` por IP |

---

## Resumo por Agente

---

### 1. Architect

**Veredicto**: ✅ Aprovado com 3 itens de atenção

**Positivos:**
- Transações atômicas em `persistItinerary`/`persistChecklist` — correto
- BOLA guard de dois níveis em `ai.actions.ts` — padrão sólido
- `TRIP_SELECT` como constante compartilhada — resolve SR-005
- `navigation.ts` como wrapper central de i18n — correto e necessário

**Itens de atenção:**
1. **CSP com `unsafe-eval` + `unsafe-inline`** (`next.config.ts` linha 22) — neutraliza proteção XSS. Identificar dependência que exige eval e migrar para nonce-based CSP antes do MVP público
2. **`generateChecklistAction` sem rate limit** — exposição financeira à API Anthropic sem controle
3. **Campo `priority` do checklist gerado pela IA** mas descartado silenciosamente — schema Prisma não tem o campo, dado útil nunca chega ao usuário

---

### 2. Security-Specialist

**Veredicto**: 🔴 Bloqueado — 2 críticos, 4 altos

**Críticos:**
- `SEC-S2-001`: `Dockerfile` ausente — Trivy scan inoperante
- `SEC-S2-002`: Sem rate limiting no login — credential stuffing ilimitado

**Altos:**
- `SEC-S2-003`: CSP com `unsafe-eval`/`unsafe-inline` — equivale a não ter CSP para scripts
- `SEC-S2-004`: Rate limiting é fixed-window (não sliding-window) — ataque de boundary burst possível (2× o limite na transição de janela)
- `SEC-S2-005`: `REDIS_TLS_REQUIRED` é opt-in — dados de sessão podem transitar sem TLS se variável não for configurada
- `SEC-S2-006`: `generateChecklistAction` sem rate limiting de IA

**OWASP Top 10 residuais:**
- A05 Security Misconfiguration: CSP fraca, Dockerfile ausente
- A07 Auth Failures: sem bruteforce protection no login

**Outros findings médios (Sprint 3):**
- `reorderActivitiesAction` sem validação Zod do payload
- Sessões ativas não invalidadas após reset de senha
- `@tanstack/react-query-devtools` em `dependencies` (deve ser `devDependencies`)
- `semgrep-action@v1` sem SHA pinado (supply chain risk)
- Campos da IA inseridos no banco sem validação de tamanho

---

### 3. DevOps-Engineer

**Veredicto**: 🔴 Bloqueado — 4 críticos

**Críticos:**
- `C-001`: `Dockerfile` ausente — CI falha em todo PR
- `C-002`: Branch `main` vs `master` — CI inoperante para merges
- `C-003`: `deploy.yml` com `echo` placeholders — nenhum deploy real ocorre; `prisma migrate deploy` roda sem publicação do código (risco de schema/app dessincronizados)
- `C-004`: `prisma/migrations/` ausente — schema não é aplicado a banco novo

**Altos (resolver antes de produção):**
- Trivy sem SARIF upload — findings sem rastreabilidade no GitHub Security tab
- Semgrep falta `p/security-audit` e `p/typescript`
- `RAILWAY_TOKEN` único para staging e produção — separar secrets
- E2E não aguarda `build-and-scan` no pipeline

**Médios (Sprint 3):**
- Sentry não implementado (`src/instrumentation.ts` ausente)
- `REDIS_TLS_REQUIRED` não documentado no `.env.example`
- `vercel.json` ausente — Node.js 20 não explicitamente configurado no Vercel
- Health endpoint sem timeout no check de PostgreSQL

---

### 4. Tech-Lead

**Veredicto**: ✅ Aprovado com 1 finding obrigatório

**Positivos:**
- `action-utils.ts` e `rate-limit.ts` — módulos coesos, `server-only` correto
- Pattern BOLA de dois níveis em `ai.actions.ts` — defesa em profundidade adequada
- `TripService` com `TRIP_SELECT` — SR-005 resolvido
- E2E-040 — sofisticado e bem implementado
- 137/137 testes passando

**Finding obrigatório (pré-merge):**
- `deleteTripAction` recebe `confirmTitle: string` sem validação Zod — campo aceita strings arbitrariamente longas (SR-007 do SEC-SPEC-001 não implementado)

**Débito técnico introduzido:**
- `rate-limit.ts` sem testes unitários
- `ai.actions.ts` sem testes unitários (BOLA guard, rate limit, persistência)
- `TripUpdateSchema` duplica literais de enum do Prisma (usar `z.nativeEnum`)
- `typedRoutes` desabilitado — perda de type-safety nas rotas
- Loop `for...of` em `persistItinerary` — N queries sequenciais (usar `createMany`)

---

### 5. Release-Manager

**Veredicto**: 🔴 BLOQUEADO — 3 breaking changes de schema sem migration

**Breaking changes críticos:**
- `User.avatarUrl` removido sem migration SQL
- `User.deactivatedAt` adicionado sem migration SQL
- `ChecklistItem` modelo adicionado sem migration SQL
- `ci.yml` aponta para branch `main` (inoperante)

**Versioning**: MINOR bump — `0.1.0` → `0.2.0`

**Arquivos gerados pelo agente:**
- `CHANGELOG.md` — entrada `[0.2.0]` criada
- `docs/release-risk.md` — CIA-002 registrado
- `.claude/agent-memory/release-manager/MEMORY.md` — atualizado

**Rollback plan:**
1. Redeployar commit `cff41e2` (Sprint 1)
2. Se migration aplicada: `ALTER TABLE users DROP COLUMN deactivated_at; ADD COLUMN avatar_url TEXT; DROP TABLE checklist_items;`
3. `DEL cache:ai-checklist:*` no Redis

---

### 6. FinOps-Engineer

**Veredicto**: 🟡 Atenção — custos controlados, 1 alerta urgente

**Status dos custos:**
| Serviço | Estimado | Observação |
|---------|----------|------------|
| Vercel | $0 | Free tier |
| Railway | $0–5 | **Trial pode ter expirado — VERIFICAR** |
| Upstash | $0 | Overhead rate-limit: 0,003% do free tier |
| Anthropic API | $0 | Sem usuários reais |
| Claude Code (dev) | $20–100 | Sprint intensivo |

**Positivos:**
- Cache de IA com MD5 + budget bucketing — est. 30–60% cache hits
- Rate limiting Redis com overhead negligível
- CI dentro do free tier GitHub Actions (87,5% de margem)

**Alerta urgente**: Status Railway trial desconhecido — verificar antes do Sprint 3

**Otimizações planejadas:**
- Sprint 3: prompt caching (OPT-001) — economia estimada 40–60% tokens input
- Sprint 3: logging de tokens por endpoint (prerequisito para dados reais)
- Sprint 4: `cost_snapshots` + dashboard `/admin/costs`

*Detalhes completos: `docs/finops/COST-LOG.md`*

---

## Itens de Backlog Gerados — Sprint 3

### CRÍTICOS (primeira semana do Sprint 3)

| ID | Item | Owner |
|----|------|-------|
| S3-001 | Gerar migration Prisma (`prisma migrate dev --name sprint-2-schema-changes`) | dev-fullstack-1 |
| S3-002 | Corrigir `ci.yml` — `main` → `master` | devops-engineer |
| S3-003 | Criar `Dockerfile` | devops-engineer |
| S3-004 | Adicionar rate limiting ao login via middleware Next.js | dev-fullstack-1 |
| S3-005 | Verificar/ativar Railway Hobby antes do trial expirar | devops-engineer |

### ALTOS (Sprint 3)

| ID | Item | Owner |
|----|------|-------|
| S3-006 | Implementar CSP com nonces para produção (remover `unsafe-eval`) | dev-fullstack-1 |
| S3-007 | Migrar rate limiting de fixed-window para sliding-window (Lua script) | dev-fullstack-1 |
| S3-008 | Adicionar rate limit em `generateChecklistAction` | dev-fullstack-2 |
| S3-009 | Implementar Sentry (`src/instrumentation.ts`) | devops-engineer |
| S3-010 | Implementar step de deploy real no `deploy.yml` (Vercel/Railway CLI) | devops-engineer |
| S3-011 | Adicionar Trivy via `aquasec/trivy-action` com SARIF upload | devops-engineer |
| S3-012 | Implementar logging de tokens Anthropic por endpoint | dev-fullstack-1 |
| S3-013 | Implementar prompt caching (OPT-001) | dev-fullstack-1 |
| S3-014 | Adicionar testes unitários para `rate-limit.ts` e `ai.actions.ts` | dev-fullstack-2 |
| S3-015 | Invalidar sessões ativas após `confirmPasswordReset` | dev-fullstack-1 |
| S3-016 | Mover `@tanstack/react-query-devtools` para `devDependencies` | dev-fullstack-1 |

### MÉDIOS (Sprint 3–4)

| ID | Item | Owner |
|----|------|-------|
| S3-017 | Adicionar validação Zod em `reorderActivitiesAction` | dev-fullstack-2 |
| S3-018 | Usar `z.nativeEnum(TripStatus)` em `TripUpdateSchema` | dev-fullstack-1 |
| S3-019 | Documentar `REDIS_TLS_REQUIRED` no `.env.example` | devops-engineer |
| S3-020 | Criar `vercel.json` com Node.js 20 explícito | devops-engineer |
| S3-021 | Separar `STAGING_RAILWAY_TOKEN` e `PRODUCTION_RAILWAY_TOKEN` | devops-engineer |
| S3-022 | Pinar `semgrep-action` por commit SHA | devops-engineer |
| S3-023 | Adicionar campo `priority` ao schema `ChecklistItem` (dado gerado pela IA hoje descartado) | dev-fullstack-1 |
| S3-024 | Implementar Batch API para checklists assíncronos (OPT-002) | dev-fullstack-1 |

---

## Arquivos Produzidos por Esta Review

| Arquivo | Agente | Status |
|---------|--------|--------|
| `docs/sprint-reviews/SPRINT-002-review.md` | (este documento) | ✅ |
| `docs/sprint-reviews/SPRINT-2-devops-review.md` | devops-engineer | ✅ |
| `docs/finops/COST-LOG.md` | finops-engineer | ✅ atualizado |
| `.claude/agent-memory/finops-engineer/MEMORY.md` | finops-engineer | ✅ atualizado |
| `CHANGELOG.md` | release-manager | ✅ `[0.2.0]` adicionado |
| `docs/release-risk.md` | release-manager | ✅ CIA-002 criado |
| `.claude/agent-memory/release-manager/MEMORY.md` | release-manager | ✅ atualizado |

---

*Review conduzida por 6 agentes em paralelo em 2026-02-26.*
*Próxima review obrigatória: fim do Sprint 3.*
