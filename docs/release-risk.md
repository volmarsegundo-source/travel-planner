# Travel Planner — Release Risk Register

**Maintainer**: release-manager
**Last Updated**: 2026-03-10
**Format**: Assessment ID | Severity | Status | Description | Owner | Resolution

---

## Registro de Assessments de Impacto

| CIA ID | Sprint | Data | Titulo | Veredicto | Status |
|---|---|---|---|---|---|
| CIA-001 | Sprint 1 | 2026-02-26 | US-001 / SPEC-001 -- Trip CRUD + Schema inicial | Non-Breaking (schema novo) | Fechado |
| CIA-002 | Sprint 2 | 2026-02-26 | Sprint 2 Hardening -- Schema, headers, health check, CI/CD | BLOQUEADO -- breaking change sem migration | Aberto |
| CIA-003 | Sprint 6 | 2026-03-04 | Debitos Tecnicos + Onboarding Wizard + Auth UX | Non-Breaking (MINOR) | Fechado |
| CIA-004 | Sprint 7 | 2026-03-05 | Perfil de usuario + exclusao de conta + loading/error states + test automation | Non-Breaking (MINOR) | Fechado |
| CIA-005 | Sprint 19 | 2026-03-10 | Itinerary persistence + guide redesign + cascade fix | Non-Breaking (MINOR) | Fechado |
| CIA-006 | Sprint 20 | 2026-03-10 | Preferences, passengers, transport data model, userId hash, Phase 1 reorder | Non-Breaking (MINOR) | Fechado |

---

## CIA-002 — Sprint 2 Hardening

**Data**: 2026-02-26
**Branch**: `feat/sprint-2-hardening` -> merged `master` (commit `8213e15`)
**Analista**: release-manager
**Veredicto**: BLOQUEADO — breaking change de schema sem migration versionada

---

### Riscos Abertos (Sprint 2)

| Risk ID | Severidade | Categoria | Descricao | Status | Owner | Prazo |
|---|---|---|---|---|---|---|
| RISK-001 | CRITICO | Schema | Nenhuma migration Prisma versionada criada — `prisma migrate deploy` no CI nao aplicara mudancas de schema | Fechado | dev-fullstack-1 | Resolvido Sprint 3 |
| RISK-002 | CRITICO | CI/CD | `ci.yml` dispara em `main` e `develop` mas o repositorio usa `master` — CI nao roda em PRs para `master` | Fechado | devops-engineer | Resolvido Sprint 3 |
| RISK-003 | ALTO | Schema | Campo `avatarUrl` removido sem verificar existencia de dados em staging/producao | Aberto | dev-fullstack-1 | Antes do deploy |
| RISK-004 | ALTO | Monitoramento | Health check agora retorna 503 quando degradado — uptime monitors podem tratar como falha de instancia e acionar restart/rollback automatico | Aberto | devops-engineer | Antes do deploy em staging |
| RISK-005 | ALTO | CI/CD | `deploy.yml` tem apenas `echo` como step de deploy — nenhum deploy real esta sendo executado | Aberto | devops-engineer | Antes do proximo sprint |
| RISK-006 | ALTO | Secrets | `RAILWAY_TOKEN`, `STAGING_DATABASE_URL`, `PRODUCTION_DATABASE_URL` referenciados no deploy.yml — nao confirmado se estao configurados nos environments do GitHub Actions | Aberto | devops-engineer | Antes do deploy |
| RISK-007 | MEDIO | Dependencias | `next-auth` fixado em `5.0.0-beta.25` sem caret — patches de seguranca nao sao aplicados automaticamente | Aberto | dev-fullstack-1 | Monitorar — acompanhar release estavel |
| RISK-008 | MEDIO | Documentacao | Diagrama de schema em `docs/architecture.md` desatualizado — ainda mostra `avatarUrl`, nao mostra `ChecklistItem` nem `deactivatedAt`. Agravado Sprint 20: TransportSegment, Accommodation, passengers, origin, localMobility, preferences ausentes | Aberto | architect | Antes do proximo sprint |
| RISK-009 | BAIXO | Type safety | `typedRoutes` desabilitado -- links internos sem verificacao de tipo em tempo de compilacao | Aberto | dev-fullstack-2 | Pos-MVP |

---

### Riscos Identificados (Sprint 6)

| Risk ID | Severidade | Categoria | Descricao | Status | Owner | Prazo |
|---|---|---|---|---|---|---|
| RISK-010 | MEDIO | Seguranca | Rotas `/api/*` nao recebem mais headers de seguranca (CSP, X-Frame-Options, etc.) porque o middleware faz `return` antes de seta-los. No Sprint 2 esses headers eram aplicados via `next.config.ts headers()` a todas as rotas | Aberto | dev-fullstack-1 | Sprint 7 |
| RISK-011 | BAIXO | Seguranca | CSP nonce gerado no middleware mas nao propagado para o HTML (layout nao le header `x-nonce`). Quando scripts inline forem necessarios, sera preciso ler o nonce do header e injeta-lo | Aberto | dev-fullstack-1 | Quando necessario |
| RISK-012 | BAIXO | UX/i18n | OnboardingWizard.tsx importa `useRouter` de `next/navigation` em vez de `@/i18n/navigation` -- pode causar navegacao sem locale prefix em edge cases | Fechado | dev-fullstack-1 | Resolvido Sprint 7 |
| RISK-013 | BAIXO | PII/Logging | `logger.info("account.profileUpdated", { userId: session.user.id })` loga userId em texto claro. Deveria usar hash como faz o `deleteUserAccountAction`. BUG-S7-001 | Fechado | dev-fullstack-1 | Resolvido Sprint 20 (SEC-S19-001) |
| RISK-014 | BAIXO | UX/i18n | Label "Portugues (Brasil)" em `ProfileForm.tsx` esta sem acento. BUG-S7-002 | Aberto | dev-fullstack-1 | Sprint 8 |
| RISK-015 | MEDIO | UX/Navegacao | Footer autenticado linka para `/terms`, `/privacy`, `/support` que resultam em 404. BUG-S7-004 | Aberto | dev-fullstack-1 | Sprint 8 |
| RISK-016 | BAIXO | i18n | `aria-label="Loading"` hardcoded em ingles nos 4 loading skeletons. BUG-S7-006 | Aberto | dev-fullstack-1 | Sprint 8 |

---

### Breaking Changes Identificados -- Sprint 2

#### BC-001: `User.avatarUrl` removido do schema
- **Tipo**: Database schema + TypeScript type
- **Breaking para**: qualquer codigo que acesse `user.avatarUrl`
- **Severidade**: CRITICO (sem migration = runtime error)
- **Mitigacao**: criar migration + usar `user.image` (campo OAuth nativo do Auth.js)
- **Status**: PENDENTE migration

#### BC-002: `User.deactivatedAt` adicionado sem migration
- **Tipo**: Database schema (coluna nova)
- **Breaking para**: qualquer write em `deactivatedAt` sem a coluna existir na base
- **Severidade**: CRITICO (runtime error em producao)
- **Mitigacao**: criar migration que adiciona `deactivated_at TIMESTAMP NULL`
- **Status**: PENDENTE migration

#### BC-003: `ChecklistItem` model adicionado sem migration
- **Tipo**: Database schema (nova tabela)
- **Breaking para**: todo o modulo de checklist
- **Severidade**: CRITICO (tabela nao existe em producao)
- **Mitigacao**: criar migration que cria `checklist_items` com FK para `trips`
- **Status**: PENDENTE migration

#### BC-004: `GET /api/v1/health` retorna 503 quando degradado
- **Tipo**: Mudanca de comportamento de endpoint publico
- **Breaking para**: monitores de uptime, health checks de load balancer, Railway/Vercel health probes
- **Severidade**: ALTO
- **Mitigacao**: atualizar configuracao de monitores para diferenciar 503 degradado de 5xx fatal
- **Status**: PENDENTE configuracao de monitores

---

### Historico de Riscos Fechados

| Risk ID | Sprint | Fechado em | Descricao | Resolucao |
|---|---|---|---|---|
| RISK-001 | Sprint 2 | 2026-02-27 | Prisma migration ausente | Migration gerada em `prisma/migrations/20260226120000_*` e commitada |
| RISK-002 | Sprint 2 | 2026-02-27 | `ci.yml` branches `main` vs `master` | Corrigido para `branches: [master]` em ci.yml |
| RISK-012 | Sprint 6 | 2026-03-05 | OnboardingWizard useRouter import errado | Corrigido para `@/i18n/navigation` no Sprint 7 |
| RISK-013 | Sprint 7 | 2026-03-10 | userId em cleartext nos logs de gamificacao | Resolvido Sprint 20: hashUserId() aplicado em PointsEngine (7) e PhaseEngine (4) |
| OQ-003 | Sprint 1 | 2026-02-26 | `TripService.listTrips` default status filter | Resolvido na implementacao do Sprint 1 |
| OQ-004 | Sprint 1 | 2026-02-26 | `useActionState` React 19 signature | Confirmado com dev antes da implementacao |
| OQ-005 | Sprint 1 | 2026-02-26 | Prisma 7 soft-delete usa `$extends` | Confirmado e implementado corretamente |

---

### Versioning History

| Versao | Data | Tipo de Bump | Justificativa |
|---|---|---|---|
| 0.1.0 | 2026-02-26 | Inicial (greenfield) | Primeira release — Sprint 1 completo |
| 0.2.0 | 2026-02-26 | MINOR | Breaking changes de schema + comportamento de health check + novas features (checklist, CI/CD, headers de seguranca) |
| 0.3.0 | 2026-02-27 | MINOR | Landing page, Header, Footer, LanguageSwitcher, dev-setup script — sem breaking changes |
| 0.4.0 | 2026-02-28 | MINOR | Development Toolkit -- 4 skills, 5 scripts, installer -- sem breaking changes |
| 0.5.0 | 2026-03-02 | MINOR | Navegacao autenticada, logout, breadcrumbs, error fix -- sem breaking changes |
| 0.6.0 | 2026-03-04 | MINOR | Debitos tecnicos (CSP nonce, rate limiter atomico) + Onboarding Wizard + Trust Signals + Auth layout -- sem breaking changes |
| 0.7.0 | 2026-03-05 | MINOR | Perfil de usuario, exclusao de conta (LGPD), loading/error states, test automation -- sem breaking changes |
| 0.8.0-0.13.0 | 2026-03-06 a 2026-03-10 | MINOR | Sprints 8-19: AI provider, Atlas gamification, progressive profile, autocomplete, itinerary persistence, guide redesign |
| 0.14.0 | 2026-03-10 | MINOR | Preferences (10 categorias), passengers, transport/accommodation data model, userId hash, Phase 1 reorder -- sem breaking changes |

---

### Proximas Acoes Obrigatorias

As acoes abaixo bloqueiam o deploy em staging ou producao:

- [x] **RISK-001**: Migration Prisma gerada e commitada em `prisma/migrations/20260226120000_*` — ✅ Fechado
- [x] **RISK-002**: `ci.yml` atualizado para `branches: [master]` — ✅ Fechado
- [ ] **RISK-003**: `SELECT COUNT(*) FROM users WHERE avatar_url IS NOT NULL` — executar no banco alvo e verificar com PO
- [ ] **RISK-004**: Atualizar configuracao de uptime monitors para aceitar 503 como estado degradado
- [ ] **RISK-006**: Auditar e confirmar todos os secrets nos environments do GitHub Actions
- [x] Atualizar `"version"` em `package.json` -- Atualizado para `"0.4.0"` (Sprint 4)
- [x] **Sprint 6**: Atualizar `"version"` em `package.json` de `0.5.0` para `0.6.0` — ✅ Incluido no bump 0.7.0
- [x] **Sprint 6**: Adicionar entrada `[0.6.0]` no `CHANGELOG.md` — ✅ Adicionada no Sprint 7
- [x] **Sprint 7**: Atualizar `"version"` em `package.json` de `0.6.0` para `0.7.0` — ✅ Fechado
- [x] **Sprint 7**: Adicionar entrada `[0.7.0]` no `CHANGELOG.md` — ✅ Fechado
- [ ] **RISK-010**: Restaurar headers de seguranca para rotas `/api/*` (Sprint 8)

---

### Notas de Paridade de Ambiente

**Detectado no Sprint 2**: o `deploy.yml` foi adicionado mas o step de deploy real e um placeholder (`echo "Deploy to staging"`). Nenhum deploy automatico para staging ou producao esta ocorrendo na pratica. Todo deploy ainda e manual.

Ate que RISK-005 seja resolvido, o pipeline de CD nao oferece garantias de paridade entre o codigo no `master` e o codigo rodando em staging/producao.
