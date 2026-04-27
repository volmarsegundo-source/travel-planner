# Wave Close → Staging Ready Checklist

**Origem:** Sprint 46 walk-through findings (commits `9717506` + `1806731`) revelaram o padrão **"shipping vapor"** — código mergeado e testado mas não consumível em Staging por gap operacional não capturado pelo Definition of Done existente. Sprint 46.5 fix bundle (esta task) adota este checklist como pré-requisito para qualquer Wave Close formal a partir do Sprint 47.

**Objetivo:** tornar a "Staging readiness" explícita, mensurável, e binária (pass/fail) — eliminando interpretação subjetiva de "está pronto".

**Aplicabilidade:** toda Wave/feature que envolva pelo menos UM dos seguintes:
- Mudança de schema Prisma (nova tabela, nova coluna, índice, FK)
- Nova feature flag (env var, NEXT_PUBLIC_*, ou helper em `src/lib/flags/`)
- Nova rota UI (criar `/admin/X`, `/feature/Y`, etc.)
- Nova rota API (`/api/...`)
- Mudança em `messages/*.json` para nova surface
- Novo background job ou cron

Waves de pure-refactor (sem mudança operacional) podem **escapar** desse checklist com justificativa explícita em release notes.

---

## §1 Code complete (pré-merge)

- [ ] **Todos os items da Wave commitados e pushados** para `master`.
- [ ] **Tests GREEN** — unit + integration. Compliance tests (B47-API-RBAC-CONVENTION e equivalentes) passando.
- [ ] **Trust Score ≥ 0.93** documentado em release notes.
- [ ] **Honesty flags catalogadas** em release notes per item (P1/P2/P3 com owner explícito quando P1/P2).
- [ ] **`tsc --noEmit` clean** ou erros pré-existentes documentados (com prova de pré-existência via `git stash`).

## §2 Environment configuration (Staging)

- [ ] **Env vars novas adicionadas em `.env.example`** com comentário explicando propósito + default.
- [ ] **Env vars setadas em Vercel Staging** (Preview environment) — screenshot ou print no PR description.
- [ ] **Feature flags com default hardcoded** declarados explicitamente no schema (`@t3-oss/env-nextjs`) com `.default(...)`.
- [ ] **Documentação de rollout**: quando esta flag deve ser ON (Staging-only? Production phased?).
- [ ] **Se a flag depende de outras** (ex: requer migration prévia), a release note documenta a ordem.

## §3 Database state (Staging)

- [ ] **Migration files commitados** em `prisma/migrations/<timestamp>_<name>/`.
- [ ] **Migration aplicada em Staging** — verificada via query lowercase contra `information_schema.tables`.
- [ ] **Seed (se aplicável) documentado e executado** — script idempotente em `prisma/seed-*.ts` + npm script (`npm run seed:<feature>-only`).
- [ ] **Health endpoints retornam `ok`/`healthy`** (não `degraded` por seed faltando).
- [ ] **Verification SQL queries** documentadas em release notes — que comandos PO ou QA roda para confirmar estado.

### §3.1 Verification template (cole na release note)

```sql
-- Tabelas criadas pela Wave
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('<lowercase_table>', ...);
-- Esperado: N rows

-- Counts pós-seed
SELECT COUNT(*) FROM <table_a>;  -- esperado: N
SELECT COUNT(*) FROM <table_b>;  -- esperado: M

-- Health endpoint (curl)
curl https://<staging-url>/api/health/<feature>
-- Esperado: {"status":"ok",...}
```

## §4 UI discoverability (NEW Definition of Done)

- [ ] **Toda rota nova é acessível via primary navigation** OU explicitamente documentada como direct-URL-only com rationale escrito (não default).
- [ ] **AdminNav (ou nav equivalente) atualizada** no MESMO sprint que adiciona a rota. Não deferir para "wave seguinte" — exatamente o anti-padrão que F-WALK-02 expôs.
- [ ] **Walk-through manual:** PO consegue navegar do dashboard root até a feature em ≤ 3 clicks, sem digitar URL.
- [ ] **Mobile + desktop ambos funcionais** (44×44 touch targets, focus-visible rings).
- [ ] **i18n PT-BR + EN ambos preenchidos.**

### §4.1 Discoverability anti-patterns (NÃO fazer)

- ❌ Honesty flag estilo "Nav not extended — intentional during Wave N" sem ticket de fechamento na próxima Wave.
- ❌ "Acesso via URL direta" como solução permanente.
- ❌ Tabs aninhadas (`/admin/ia?tab=prompts`) sem link visível ao tab.
- ❌ Feature flag ON em Staging mas link da nav só aparece com flag ON em Prod.

## §5 PO walk-through (Staging gate)

- [ ] **Walk-through executado em Staging real** (não local, não preview branch desconectado).
- [ ] **Cobre todos os cenários happy-path** documentados em BDD (`docs/specs/bdd/<sprint>-goals.feature`).
- [ ] **Cobre 1-2 cenários adversariais** (input inválido, RBAC negado, flag OFF).
- [ ] **Findings classificados P1/P2/P3** com decisão de fix vs defer.
- [ ] **PO sign-off explícito** em algum doc trackeado (release note, comentário PR, doc de retrospective).

## §6 Documentation

- [ ] **Release note per item** publicado em `docs/releases/`.
- [ ] **BDD scenarios** atualizados em `docs/specs/bdd/`.
- [ ] **Honesty flags consolidadas** em registry formal (B47-FLAGS-REGISTRY entrega isso para Sprint 47+).
- [ ] **Migration runbook** (se Wave envolve migration) atualizado em `docs/devops/`.

## §7 Wave Close Status — decisão binária

| Status | Critério | Ação |
|---|---|---|
| **READY** | §1, §2, §3, §4, §5, §6 todos ✅ | Wave Close formal autorizado |
| **READY-WITH-FOLLOWUPS** | §1, §2, §3, §4 todos ✅; §5 ou §6 com itens P3 deferidos com ticket | Wave Close OK; P3 itens entram no backlog do próximo sprint |
| **BLOCKED** | Qualquer ❌ em §2, §3, ou §4 | Wave Close NÃO autorizado. Resolver gap e re-checar. |

**Importante:** "BLOCKED" não significa freeze de novas features. Significa que ESTA Wave específica não fecha até o gap operacional ser resolvido. Sprint planning para Wave seguinte pode prosseguir em paralelo.

## §8 Como este checklist previne shipping vapor

O padrão "shipping vapor" exige que pelo menos UM destes seja não-checado:
- §2: env vars não configuradas → feature flag OFF default → rota retorna 404
- §3: migration não rodou → tabelas não existem → service errors em runtime
- §4: nav não estendida → usuário não chega na feature

Tornando os 3 explícitos + obrigatórios, o gap fecha estruturalmente.

## §9 Histórico de application

| Sprint | Wave | Status | Notas |
|---|---|---|---|
| 46 | Wave 1 | RETROACTIVE-BLOCKED | §2 ❌ (`AI_GOVERNANCE_V2` env var não setada) + §3 ❌ (seed não rodou) + §4 ❌ (AdminNav). Resolvido em Sprint 46.5. |
| 46 | Wave 2 | RETROACTIVE-BLOCKED | Mesmas razões da Wave 1 (mesmas tabelas, mesma flag, mesma nav). Resolvido em Sprint 46.5. |
| 46.5 | Fix bundle | READY | F-OPS-04 + F-FIX-05 commitados; F-OPS-03 pending PO action. |

Adicionar entries para Wave 3+ conforme Sprint 47+ executa.

---

**Author:** dev-fullstack-1 (autonomous Sprint 46.5)
**Reviewers:** PO (Volmar), tech-lead, qa-engineer (recomendados antes de adoção formal Sprint 47)
**Source incident:** F-WALK-02 (`docs/qa/sprint-46-walk-through-investigation-v2.md`)
**Related Sprint 47 backlog items:** B47-FLAGS-REGISTRY, B47-UI-DOD-DISCOVER
