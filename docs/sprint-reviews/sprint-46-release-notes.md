# Sprint 46 Release Notes — AI Governance Central

**Sprint:** 46
**Status:** READY-WITH-FOLLOWUPS (close formal 2026-04-27)
**Trust Score:** 0.9500 (gate ≥ 0.93 ✅)
**Duração:** 24-27 abril 2026 (4 dias)
**PO:** Volmar
**Authors:** dev-fullstack-1, dev-fullstack-2 (autonomous batch mode), tech-lead, qa-engineer, devops-engineer, security-specialist, release-manager
**Tag:** `sprint-46-close`

---

## §1 Executive summary

Sprint 46 entregou a **AI Governance Central V2** (Waves 1+2) — admin tooling para gestão de prompts AI com versionamento imutável, RBAC two-tier, audit log append-only, e 12 validações pré-save (8 bloqueantes V-01..V-08 + 4 warnings W-01..W-04). Wave 1+2 funcionalmente completas e validadas em Staging via PO walk-through #2.

Adicionalmente: **Sprint 46.5 fix bundle** (9 itens, ~3h Claude Code + ~25min PO actions) corrigiu padrão "shipping vapor" descoberto durante walk-through #1 — código tecnicamente shipped (commits + tests verde + Trust Score met) mas operacionalmente não-funcional em Staging (env vars não configuradas, seed não executado, AdminNav não estendida). Sprint 46.5 fechou esses 3 gaps + adicionou processo (`wave-close-staging-readiness.md` checklist) para prevenir recorrência.

Sprint 46 fecha em **READY-WITH-FOLLOWUPS** — Wave 1+2 funcionais; tech debt + governance core (Bloco A) + retrospective (Bloco E) + C-03 Redis Staging decision pendentes para Sprint 47.

---

## §2 Deliverables Wave 1 — Foundation (8/8 ✅)

Esqueleto + auth + feature flag + migration + seed + RBAC + UI shell + health check.

| ID | Item | Commit | Effort |
|---|---|---|---|
| B-W1-001 | Feature flag `AI_GOVERNANCE_V2` + helper | `29bd1a4` | S |
| B-W1-002 | Prisma migration `20260424120000_ai_governance_v2` (5 tabelas + ALTERs) | `452ec7d` | L |
| B-W1-003 | Seed `ModelAssignment` + `AiRuntimeConfig` defaults (idempotente) | `04b1f3f` | M |
| B-W1-004 | `AuditLogService` append-only | `01ad8a6` | M |
| B-W1-005 | Two-tier RBAC (`admin-ai` + `admin-ai-approver`) | `1c021db` | M |
| B-W1-006 | Admin UI shell `/admin/ia` 4-tabs | `04d8d8e` | M |
| B-W1-007 | Health endpoint `/api/health/ai-config` (3 estados) | `f188686` | S |
| B-W1-008 | Wave 1 integration tests | `bfa2643` | M |

**Trust Score Wave 1 close:** 0.94 → 0.95.

---

## §3 Deliverables Wave 2 — Editor + Versionamento (9/9 ✅)

CRUD de prompts + versionamento imutável (semver auto-increment) + 12 validações + UI editor com placeholder chips + diff viewer + preview panel.

| ID | Item | Commit | Effort |
|---|---|---|---|
| B-W2-001 | API `GET/POST/PATCH /api/admin/ai/prompts` + service skeleton | `732f7ac` | M |
| B-W2-002 | `bumpSemverPatch()` real arithmetic + PromptVersion immutability guard (49 source files scanned) | `59028d7` | M |
| B-W2-003 | V-01..V-08 bloqueantes (placeholders, token budget, jsonSchema, language, PII, API keys, internal URLs) | `b1c27a2` | L |
| B-W2-004 | W-01..W-04 warnings (unknown placeholders, output format, language, temperature) | `d1bc18a` | M |
| B-W2-005 | Token-count helper `ceil(chars/3.5)` extracted to `src/lib/ai/token-count.ts` | `7ad529f` | S |
| B-W2-006 | `/admin/ia?tab=prompts` UI: PromptsTab list + PromptEditor with placeholder chips + token count + inline validation | `ad6df51` | L |
| B-W2-007 | DiffViewer side-by-side line diff (LCS-based pure TS, no deps) | `7d0b267` | M |
| B-W2-008 | PromptPreview com mock substitution (NEVER calls fetch — pure client-side) | `1e8f301` | M |
| B-W2-009 | Wave 2 integration tests + close gate (cross-task pipeline asserts) | `9fd8487` | M |

**Total tests Wave 2:** 223/223 ✓ across 13 files. Compliance test `B47-API-RBAC-CONVENTION` activated GREEN no primeiro handler.

**Trust Score Wave 2 close:** 0.95 mantido.

---

## §4 Deliverables Sprint 46.5 — Fix Bundle (9/9 ✅)

Correção do padrão "shipping vapor" descoberto em walk-through #1.

| ID | Item | Owner | Commit/Action |
|---|---|---|---|
| F-OPS-01 | `AI_GOVERNANCE_V2=true` em Vercel Staging Preview | PO | Vercel dashboard |
| F-OPS-02 | Verificar tabelas Wave 1 existem em Neon (query lowercase) | PO | Neon SQL Editor |
| F-OPS-03 | Rodar seed B-W1-003 em Staging (16 rows) | PO via SQL manual | `e8570e0` doc |
| F-OPS-04 | Idempotent `seed:v2-only` wrapper script + tests | dev-1 | `68bb0e5` |
| F-FIX-05 | AdminNav extend com link `/admin/ia` (closes B-W1-006 honesty flag #4) | dev-1 | `a878f62` |
| F-OPS-06 | `wave-close-staging-readiness.md` checklist (NEW PROCESS) | dev-1 | `0376691` |
| F-RETRO-07 | "Shipping vapor" pattern em retrospective input doc | dev-1 | `fd3523e` |
| F-S47-08 | Sprint 47 backlog: B47-FLAGS-REGISTRY + B47-UI-DOD-DISCOVER | dev-1 | `fd3523e` |
| F-FINDING-09 | F-PROD-001 documentado em findings-registry.md | dev-1 | `fd3523e` |

**Walk-through #2 PO additional findings:**
- F-WALK2-01..03 documentados em `7da7f69` investigation report.

---

## §5 Tech debt + Security (5/6 ✅)

| ID | Item | Status | Commit |
|---|---|---|---|
| C-01 | CI fix `project-bootstrap.test.ts` skip on missing `.env.local` | ✅ | `f188686` (bundled) |
| C-02 | EDD Eval Gates exit code fix | ✅ | `9ff08b5` |
| C-03 | Redis Staging provider decision (ADR + smoke) | ⏸️ pendente | Sprint 47 |
| C-04 | Gemini timeout ADR-0036 + Edge env override | ✅ | `ce223f4` + `f0d4805` |
| D-01 | F-01 LOW: `/expeditions` em `PROTECTED_PATH_SEGMENTS` | ✅ | `f188686` (bundled) |
| D-02 | F-02 MEDIUM: `canUseAI(null)` fail-closed | ✅ | `777c660` |

---

## §6 Walk-through #2 results — PO 2026-04-27

PO executou walk-through #2 em Staging após Sprint 46.5 deploy + F-OPS-03 SQL execution.

| Etapa | Resultado |
|---|---|
| 0 — Pre-check Vercel deploy + login admin | ✅ |
| 1 — AdminNav exibe link "Central Governança IA" → `/{locale}/admin/ia?tab=prompts` | ✅ |
| 2 — Lista de prompts (3 templates seed Wave 1: destination-guide, checklist, travel-plan) + botão "+ Novo" | ✅ |
| 3 — Editor editável (gap walk-through #1 fechado) | ✅ |
| 3.x — V-01 dispara em prompts inválidos; V-06 detecta CC real | ✅ |
| 4 — Auto-versionamento: 2 rows em `prompt_versions` após create + edit | ✅ |
| 5 — AuditLogService funcional: 2 rows em `audit_logs` | ✅ |
| 6 — i18n PT/EN funciona em UI labels; mensagens de validação PT-only (decisão arquitetural §8) | ✅ |

---

## §7 Findings classificados

| ID | Descrição | Severidade | Disposição |
|---|---|---|---|
| F-WALK-01 | `/admin/ia` 404 (env flag absent) | P2 | ✅ Resolvido por F-OPS-01 |
| F-WALK-02 | Editor não-editável (PO em página errada `/admin/prompts` legacy) | P1 → P2 | ✅ Resolvido por F-FIX-05 |
| F-WALK-03 | Health endpoint `degraded` (seed não executado) | P2 | ✅ Resolvido por F-OPS-03 |
| F-WALK2-01 | Sintaxe placeholder ambígua na UI (`{var}` vs `{{var}}`) | P2 | ⏸️ S47 B47-UI-DOD-DISCOVER §A |
| F-WALK2-02 | V-01 obscurece V-02/V-07 percepção em testes UI (na verdade orchestrator é paralelo, mas single-brace canônico exige conhecimento implícito) | P2 | ⏸️ S47 B47-UI-DOD-DISCOVER §B-§E |
| F-WALK2-03 | Mensagens validação V-XX em PT mesmo com UI EN | P3 | ❌ Won't-fix — admin é PT-only por design (ver §8) |
| F-PROD-001 | `/admin/ia` retorna "Erro de Autenticação" em Prod (untested logged-in admin) | P3 | ⏸️ Subsumido em Plano Prod Fase 0 audit |

---

## §8 Decisões arquiteturais novas

### §8.1 Admin pages são PT-only por design

**Decisão:** admin pages (`/admin/*`) target audience único é o PO. EN translation não é requerida para admin surfaces.

**Aplica-se a:** `/admin/*` rotas, mensagens V-XX/W-XX, admin help text in-editor, audit log displays, configuration screens.

**NÃO aplica-se a:** páginas público-facing (`/`, `/destinations`, `/expeditions`, etc.), onboarding/auth, email templates, error pages user-facing, marketing/SEO.

**Razão:** admin é tela operacional para PO único; ROI de EN translation = 0; reduz overhead de manutenção (i18n keys + reviews + tests bilíngues).

**Implicação:** B47-UI-DOD-DISCOVER scope reduz ~30% (sem EN mirror trabalho).

**Documento canônico:** `docs/process/decision-admin-ptbr-only.md`.

### §8.2 Wave Close → Staging Ready checklist é binário em §4(a)

`wave-close-staging-readiness.md` §4 evoluído em 2 sub-bullets:
- §4(a) **Feature alcançável via primary nav** — binário, OBRIGATÓRIO
- §4(b) **Feature tem help text in-editor** — escala, OPCIONAL para admin

Permite Sprint 46 close = READY-WITH-FOLLOWUPS sem violar checklist.

---

## §9 Não-entregues (fora de escopo / Sprint 47)

| Bloco | Itens | Razão |
|---|---|---|
| A — Governance core (3 SPECs) | A-01 SEC-AUDIT, A-02 MOCK-ASSERTION, A-03 OBSERVABILITY-SENTRY | Fora de escopo Sprint 46 (priorização Wave 1+2 + tech debt) |
| C-03 | Redis Staging provider decision (ADR + smoke) | Pendente PO decisão; Sprint 47 |
| E — Retroactive | E-01 BUG-C retrospective, E-02 adapter-integration tests | Fora de escopo Sprint 46 |
| Sprint Zero parallel | Profit Scoring + Dynamic Ranking SPECs | PO autoring track (Sprint 47) |
| Plano Prod 4-fases | Fase 0..3 promoção Wave 1+2 | Pós Sprint 46 close — tarefa nova prioridade |

---

## §10 Statistics

| Métrica | Valor |
|---|---:|
| Trust Score final | 0.9500 |
| Tests verde Sprint 46 | 267/267 ✓ |
| Honesty flags consolidadas (P3) | ~50 (B47-FLAGS-REGISTRY S47 vai catalogar) |
| Commits Sprint 46 (Wave 1+2 + tech debt + security) | 24 (cb7df47..9fd8487) |
| Commits Sprint 46.5 (fix bundle + investigations) | 6 (`68bb0e5`, `a878f62`, `0376691`, `fd3523e`, `e8570e0`, `7da7f69`) |
| **Total commits Sprint 46 + 46.5** | **30** |
| Files changed (estimate) | ~50 (NEW + MOD) |
| Lines added (estimate) | ~5000+ |
| Documentos NEW criados | 12+ (releases, qa, specs) |
| Compliance tests activations | 1 (B47-API-RBAC-CONVENTION ✅) |
| Migrations applied | 1 (`20260424120000_ai_governance_v2`) |
| Seed rows populated em Staging | 16 (3 model_assignments + 13 ai_runtime_configs) |

---

## §11 Lessons learned + retrospective inputs

### §11.1 What worked

- **Wave decomposition em 9 itens** facilitou paralelismo e tracking individual
- **Compliance test B47-API-RBAC-CONVENTION** ativou no commit certo, pegou regex bug no primeiro handler, foi resolvido inline
- **TDD discipline per item** (RED → GREEN) produziu 223 tests verde sem regressões
- **PO factual verification disciplina** transformou inferências v1 em conclusões v2 mais sólidas — recomendo manter como padrão para release-decision investigations
- **Sprint 46.5 como continuation** preservou tracking sem inflar contagem de Sprints

### §11.2 What didn't

- **Padrão "shipping vapor" emergiu**: features tecnicamente shipped mas operacionalmente non-functional em ambiente — gap de DoD (env vars + seed + nav extension não capturados pelo Definition of Done existente)
- **B-W1-006 honesty flag #4** ("AdminNav not extended") sobreviveu 11 commits sem follow-up ticket — caso paradigmático de honesty flags como Markdown-only sem ação acionável
- **Tests com mocked DB** são necessários mas insuficientes para features que tocam ambiente — ao menos um smoke test em ambiente real seria necessário pré-Sprint-Close
- **Cross-Wave audit** ausente — Wave 2 não fechou flag de Wave 1; processo não exigia

### §11.3 Process corrections delivered

- **`wave-close-staging-readiness.md`** (F-OPS-06): checklist binário tornando Staging readiness pré-requisito formal
- **Honesty flags registry** (B47-FLAGS-REGISTRY S47): vai consolidar ~50 P3 flags Sprint 46
- **DoD UI discoverability** (B47-UI-DOD-DISCOVER S47): expande DoD para incluir "feature reachable via primary nav OR direct-URL-only com rationale"
- **Decisão admin PT-only**: reduz scope de i18n trabalho em admin surfaces

### §11.4 Retrospective input format

5-agent format (PO + tech-lead + qa + sec + architect) per execution-plan §9 — input "shipping vapor pattern" já contributed em `docs/sprint-reviews/sprint-46-retrospective-inputs/shipping-vapor-pattern.md` (commit `fd3523e`).

Outros 4 inputs (PO, tech-lead, qa, sec, architect) **pendentes para retrospective formal Sprint 46** — recomendação: produzir antes de Sprint 47 kickoff.

---

## §12 Sprint 47 readiness

### §12.1 Backlog atualizado (commit `fd3523e` + esta release)

- **B47-FLAGS-REGISTRY** (P2, ~2-3h) — registry formal de honesty flags
- **B47-UI-DOD-DISCOVER** (P2, ~3.5h scope reduzido) — UI DoD com discoverability + admin help text PT-only
- **B47-W3** V2 Wave 3 (real-time model config) — flagship S47
- **B47-W4** V2 Wave 4 (curadoria de outputs)
- **B47-W5** V2 Wave 5 (Eval integrado)
- + Bloco A (3 SPECs governance core) + Bloco E (retroactive)
- + C-03 Redis Staging decision

### §12.2 Plano Prod 4-fases (próxima sessão PO)

Ver §6 deste doc + `docs/qa/sprint-46-walk-through-investigation-v2.md` §10:
- **Fase 0** — Prod state audit (subsume F-PROD-001)
- **Fase 1** — Apply migration + seed em Prod se necessário
- **Fase 2** — Promover 17+ commits acumulados (cb7df47..fd3523e + Sprint 46.5)
- **Fase 3** — Smoke walk-through Prod pós-promotion

### §12.3 Sprint Zero parallel (PO authoring)

- Profit Scoring SPEC writing
- Dynamic Ranking SPEC writing

PO weekly cadence ~0.3 day/week — 2 SPECs aprovados antes de Sprint 47 kickoff (per Sprint 46 §6.6 commitment).

---

**Sprint 46 oficialmente CLOSED — READY-WITH-FOLLOWUPS — 2026-04-27.**

**Tag:** `sprint-46-close` em commit final desta release.

**Branch:** `master`.

---

**Authors:**
- dev-fullstack-1 (autonomous batch — Wave 1, Wave 2 backend, Sprint 46.5 fix bundle)
- dev-fullstack-2 (Wave 1 RBAC + UI shell, Wave 2 UI items)
- tech-lead, architect, qa-engineer, security-specialist, devops-engineer, finops-engineer, release-manager (governance per item)
- product-owner (Volmar) — scope decisions, walk-through executions, Sprint 46.5 BLOCKED → READY-WITH-FOLLOWUPS resolution
