# Findings Registry

**Purpose:** Lightweight tracker for findings discovered during walk-throughs, audits, or production debugging that don't yet warrant a Spec or full investigation, but should not be lost.

**Lifecycle:** Open → Investigating → Resolved (with commit ref) OR Won't-fix (with rationale) OR Promoted (escalated to Spec / Sprint backlog).

**Severity:**
- **P1** — Active production impact OR blocks current Sprint close.
- **P2** — Structural concern; no active incident but degraded UX or process risk.
- **P3** — Cosmetic / ergonomic / legacy behavior to document.

---

## F-PROD-001 — `/admin/ia` returns "Erro de Autenticação" instead of 404 in Prod (P3)

| Field | Value |
|---|---|
| **Discovered** | 2026-04-27 — PO walk-through Prod verification (post-Sprint 46.5 fix bundle planning) |
| **Severity** | P3 (legacy behavior, not Sprint 46 regression, no user-facing impact) |
| **Status** | Open — defer to Sprint 47 if convenient; not blocking |
| **Source** | PO Prod manual probe |
| **Spec ref** | None — operational finding |

### Behavior

| Scenario | Expected | Actual |
|---|---|---|
| Anonymous user hits `https://<prod>/en/admin/ia` | 404 (per B-W1-006 design when `AI_GOVERNANCE_V2=false`) | "Erro de Autenticação. Há um problema com a configuração do servidor." |
| Logged-in admin hits same URL | 404 OR shell loads with empty tabs | Untested in Prod |

### Hypotheses

1. **Middleware order issue**: `auth()` HOF wraps the middleware; auth challenge fires before feature flag check is even reached. Without a session, the middleware redirects to login or returns the generic auth-config error from NextAuth.
2. **Server-side env not loaded in Prod build**: the t3-env helper (`@t3-oss/env-nextjs`) might be misconfigured in Prod such that `AI_GOVERNANCE_V2` access throws during page render. The error message ("configuração do servidor") matches that failure mode.
3. **Custom error page mounting**: Prod has a global error boundary that intercepts `notFound()` differently than Staging; output text differs.

### Verification needed

- Test logged-in admin user in Prod against `/en/admin/ia` — does it return 404 (correct), the AI Governance shell (incorrect — flag should be OFF), or the auth error?
- Review middleware order in `src/middleware.ts` — does `auth()` short-circuit before the `notFound()` page handler runs?
- Check Prod env for `AI_GOVERNANCE_V2` — likely also absent (worst case: flag isn't being read at all).

### Why P3 / not blocking

- Wave 2 not yet promoted to Prod (post-Sprint 46.5 plan).
- No real user reaches `/admin/ia` in Prod (no `admin-ai` role exists yet).
- Error message is misleading but not exploit-class.
- Prod promotion plan §10 (investigation v2) already includes Phase 0 to verify Prod state — F-PROD-001 likely surfaces during that phase and gets resolved alongside.

### Defer rationale

Sprint 46.5 scope is "make Wave 1+2 functional in Staging + walk-through #2 OK + close Sprint 46". F-PROD-001 is a Prod observation that does not impact Sprint 46 close criteria. Sprint 47 Phase 0 of Prod promotion plan investigates Prod state holistically and will subsume this finding.

### Action items

- [ ] **Sprint 47 Phase 0 — Prod state audit**: include F-PROD-001 in the audit checklist.
- [ ] **Document expected behavior**: add a BDD scenario covering "logged-in admin + flag OFF" expectation when Sprint 47 makes this actionable.

---

## F-WALK-01..03 — Sprint 46 walk-through #1 findings

Already documented in `docs/qa/sprint-46-walk-through-investigation.md` (v1, commit `9717506`) and `docs/qa/sprint-46-walk-through-investigation-v2.md` (v2, commit `1806731`). Resolution path: Sprint 46.5 fix bundle (`68bb0e5..a878f62`).

| Finding | Severity | Status | Resolution |
|---|---|---|---|
| F-WALK-01 — `/admin/ia` 404 + locale prefix divergence | P2 | ✅ Resolved by F-OPS-01 + F-FIX-05 | Vercel env set + AdminNav extended |
| F-WALK-02 — Editor not editable (PO at wrong page) | P1 (case) / P2 (pattern) | ✅ Resolved by F-FIX-05; pattern in B47-FLAGS-REGISTRY + B47-UI-DOD-DISCOVER | AdminNav links /admin/ia gated by flag |
| F-WALK-03 — Health endpoint `degraded` | P2 | ✅ Resolved by F-OPS-03 SQL execution | Migration confirmed ran; seed populated 16 rows |

---

## F-WALK2-01..03 — Sprint 46 walk-through #2 findings

Documented in `docs/qa/sprint-46-walk-through-2-findings.md` (commit `7da7f69`). Discovered during PO walk-through #2 in Staging on 2026-04-27 after Sprint 46.5 fix bundle deploy. All classified as **by-design + UX gap** (implementação alinhada com SPEC §2.1; discoverability é o gap real).

### F-WALK2-01 — Sintaxe placeholder ambígua na UI (P2)

| Field | Value |
|---|---|
| **Discovered** | 2026-04-27 — PO walk-through #2 |
| **Severity** | P2 — UX gap, não bug |
| **Status** | Open — deferido para Sprint 47 |
| **Disposition** | B47-UI-DOD-DISCOVER §A (S47 backlog) |

**Behavior:** PO digitou `{{userName}}` esperando interpolação Mustache-style. Editor mostrou "Placeholders detectados: (nenhum)" — comportamento correto per SPEC-AI-GOVERNANCE-V2 §2.1 (single-brace `{var}` é canônico; double-brace `{{var}}` é escape literal). PO sem help text inline para descobrir convenção.

**Root cause:** ausência de help text in-editor explicando sintaxe canônica + escape rule.

**Fix path:** B47-UI-DOD-DISCOVER §A (Sprint 47, ~30 min PT-only).

### F-WALK2-02 — V-01 obscurece V-02/V-07 percepção em testes UI (P2)

| Field | Value |
|---|---|
| **Discovered** | 2026-04-27 — PO walk-through #2 |
| **Severity** | P2 — UX gap, não bug |
| **Status** | Open — deferido para Sprint 47 |
| **Disposition** | B47-UI-DOD-DISCOVER §B-§E (S47 backlog) |

**Behavior:** PO testou `Sua senha é {{password}}` esperando V-02 disparar; só V-01 fired. Testou email + key fake esperando V-07; só V-06 fired.

**Root cause:** orchestrator é paralelo (per SPEC §3 line 162 — não sequencial), mas:
- V-02 só checa placeholders extraídos canonicamente; `{{password}}` é escape, não placeholder, então set extraído está vazio
- V-07 regex SPEC `/sk-[a-zA-Z0-9]{20,}/g` requer prefix exato + 20+ chars; PO's "fake" não bateu

Comportamento alinhado com SPEC. Gap é admin não saber **shape** de cada V-XX preventivamente.

**Fix path:** B47-UI-DOD-DISCOVER §B (lista obrigatórios reativa) + §C (forbidden visíveis) + §E (V-06/V-07/V-08 exemplos).

### F-WALK2-03 — Mensagens de validação em PT mesmo com UI EN (P3 won't-fix)

| Field | Value |
|---|---|
| **Discovered** | 2026-04-27 — PO walk-through #2 |
| **Severity** | P3 |
| **Status** | **Won't-fix** — admin é PT-only por decisão arquitetural |
| **Disposition** | Closed (decisão arquitetural) |

**Behavior:** Mensagens V-XX/W-XX retornam em PT mesmo quando UI está em locale `en`. Naturalmente surge de `messages/pt-BR.json` ser source of truth para validação.

**Root cause:** intencional. Admin pages target audience único é o PO; EN translation não é requerida para admin surfaces.

**Decision:** documentado em `docs/process/decision-admin-ptbr-only.md` (commit desta release). Aplica-se a `/admin/*` rotas, mensagens V-XX/W-XX, admin help text, audit log displays. NÃO aplica a páginas público-facing.

**Reversibilidade:** se Atlas adicionar admin user não-Brasileiro / cliente externo / equipe internacional, decisão pode ser revisitada.

---

**Author:** dev-fullstack-1 (autonomous Sprint 46.5)
**Date:** 2026-04-27
**Reviewers (proposed for adoption):** PO, tech-lead, qa-engineer
**Related:** B47-FLAGS-REGISTRY (broader honesty-flag tracking — finding-registry stays focused on operational findings; flags-registry consolidates all release-note flags)
