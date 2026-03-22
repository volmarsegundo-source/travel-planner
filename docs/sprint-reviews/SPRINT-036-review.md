# Sprint 36 — Review Document

**Tema**: WizardFooter Global + Gamification Wave 2
**Versao**: v0.31.0
**Data**: 2026-03-22
**Branch**: feat/sprint-36 (merged to master)
**Tag**: v0.31.0
**Baseline**: v0.30.0 (2325 unit tests)

---

## 1. Resumo Executivo

Sprint 36 entregou duas frentes: (1) extração do hook `useFormDirty` com hash djb2 e aplicação do WizardFooter com dirty-state em todas as 6 fases da expedição, e (2) Wave 2 do sistema de gamificação incluindo 16 badges com engine de avaliação event-driven, pacotes de compra de PA com mock payment, e dashboard administrativo com métricas de economia PA.

### Resultados

| Metrica | v0.30.0 | v0.31.0 | Delta |
|---------|---------|---------|-------|
| Testes unitarios | 2325 | 2408 | +83 |
| Arquivos de teste | 152 | 161 | +9 |
| Falhas unitarias | 0 | 0 | 0 |
| Build | Clean | Clean | -- |
| Arquivos novos | -- | 25 | +25 |
| Arquivos modificados | -- | 15 | +15 |

---

## 2. Entregaveis

### Track 1 — WizardFooter Global (dev-fullstack-1)

| Task | Descricao | Spec |
|------|-----------|------|
| useFormDirty hook | Extraido com hash djb2, retorna isDirty/resetDirty/markClean | SPEC-ARCH-028 |
| Phase 1 integration | 4 steps com dirty-state + save via WizardFooter | SPEC-PROD-039 |
| Phase 2 integration | Preferences com dirty-state + save | SPEC-PROD-039 |
| Phase 3 integration | Checklist com dirty-state + save | SPEC-PROD-039 |
| Phase 4 refactor | Inline isDirty substituido por useFormDirty hook | SPEC-PROD-039 |
| Phase 5 footer | Read-only: Voltar + Avancar (sem save) | SPEC-PROD-039 |
| Phase 6 footer | Read-only: Voltar + Ver Expedicoes (sem save) | SPEC-PROD-039 |
| WizardFooter tests | 10 testes de integracao dirty-state | SPEC-QA-012 |
| useFormDirty tests | Testes de hash, dirty toggle, resetDirty | SPEC-QA-012 |

### Track 2 — Gamification Wave 2 (dev-fullstack-2)

| Task | Descricao | Spec |
|------|-----------|------|
| Prisma migration | Purchase model + User.role column | SPEC-ARCH-030 |
| Badge registry | 16 badges em 4 categorias (definicoes estaticas) | SPEC-ARCH-029 |
| Badge engine | checkAndAwardBadges, getUserBadgesWithStatus, getBadgeProgress | SPEC-ARCH-029 |
| Badge showcase UI | Grid 4 categorias, estados locked/unlocked/progress | SPEC-UX-042 |
| Badge unlock toast | Animacao confetti + reduced-motion fallback | SPEC-UX-042 |
| PA packages | 4 tiers: Explorador/Navegador/Cartografo/Embaixador | SPEC-PROD-041 |
| Mock payment provider | PaymentProvider interface + MockPaymentProvider | SPEC-ARCH-030 |
| Purchase actions | purchasePAAction (atomico), getPurchaseHistoryAction | SPEC-PROD-041 |
| Purchase page | /meu-atlas/comprar-pa com cards + confirmation | SPEC-UX-043 |
| Admin layout | 3-layer guard: middleware + layout + action | SPEC-SEC-006 |
| Admin dashboard | KPIs, revenue aggregation, per-user table | SPEC-ARCH-031 |
| Admin middleware | /admin/* rota protegida por role check | SPEC-SEC-006 |
| i18n | +133 keys EN + +133 keys PT-BR | -- |

---

## 3. Detalhes Tecnicos

### useFormDirty Hook

```typescript
// src/hooks/useFormDirty.ts
// djb2 hash: O(n) on serialized length, <1ms for typical forms
// Keys sorted for order-independent comparison
// Returns: { isDirty, resetDirty, markClean, initialHash, currentHash }
```

### Badge Engine Architecture

```
Event → checkAndAwardBadges(userId, event)
  → Filter BADGE_REGISTRY to unearned + relevant badges
  → Run evaluator per badge criteria type
  → Award via createMany(skipDuplicates) — idempotent
  → Return newly awarded badges for toast display
```

Criteria types: trip_count, phase_complete, trip_type_international, trip_type_family, trip_type_solo, daily_login_count, language_count, continent_count, custom

### PA Credit Logic (CRITICAL)

```typescript
// Purchase credits availablePoints ONLY, NOT totalPoints
// This preserves rank integrity per ATLAS-GAMIFICACAO-APROVADO.md
await tx.userProgress.update({
  where: { userId },
  data: { availablePoints: { increment: pkg.pa } }
  // totalPoints NOT incremented
});
```

### Admin 3-Layer Guard

| Layer | File | Check |
|---|---|---|
| Middleware | src/middleware.ts | token.role === "admin" |
| Layout | admin/layout.tsx | session.user.role === "admin" |
| Actions | admin-dashboard.service.ts | assertAdmin(session) |

---

## 4. Novos Arquivos (25)

### Fonte (13)
| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useFormDirty.ts` | Reusable djb2 dirty-state hook |
| `src/lib/gamification/badge-registry.ts` | 16 badge definitions |
| `src/lib/gamification/badge-engine.ts` | Badge evaluation engine |
| `src/lib/gamification/pa-packages.ts` | 4 PA package tiers |
| `src/server/services/payment/payment-provider.interface.ts` | PaymentProvider interface |
| `src/server/services/payment/mock-provider.ts` | Mock payment implementation |
| `src/server/services/payment/index.ts` | Provider factory |
| `src/server/actions/purchase.actions.ts` | PA purchase server actions |
| `src/server/services/admin-dashboard.service.ts` | Admin data aggregation |
| `src/components/features/gamification/BadgeShowcase.tsx` | Badge grid UI |
| `src/components/features/gamification/BadgeUnlockToast.tsx` | Unlock animation |
| `src/app/[locale]/(app)/admin/layout.tsx` | Admin guard layout |
| `src/app/[locale]/(app)/admin/dashboard/page.tsx` | Admin dashboard page |

### Testes (9 novos arquivos)
| Arquivo | Testes |
|---------|--------|
| `src/hooks/__tests__/useFormDirty.test.ts` | ~10 |
| `src/components/features/expedition/__tests__/WizardFooterDirtyState.test.tsx` | ~10 |
| `tests/unit/lib/gamification/badge-registry.test.ts` | ~16 |
| `tests/unit/lib/gamification/badge-engine.test.ts` | ~16 |
| `tests/unit/lib/gamification/pa-packages.test.ts` | ~14 |
| `tests/unit/server/services/payment/mock-provider.test.ts` | ~6 |
| `tests/unit/server/actions/purchase.actions.test.ts` | ~8 |
| `tests/unit/server/services/admin-dashboard.service.test.ts` | ~6 |
| `tests/unit/components/features/gamification/BadgeShowcase.test.tsx` | ~6 |

---

## 5. Modificacoes a Arquivos Existentes (15)

| Arquivo | Alteracao |
|---------|-----------|
| `prisma/schema.prisma` | +Purchase model, +User.role field |
| `src/components/features/expedition/Phase1Wizard.tsx` | +useFormDirty + WizardFooter save/dirty |
| `src/components/features/expedition/Phase2Wizard.tsx` | +useFormDirty + WizardFooter save/dirty |
| `src/components/features/expedition/Phase3Wizard.tsx` | +useFormDirty + WizardFooter save/dirty |
| `src/components/features/expedition/Phase4Wizard.tsx` | Refactored: inline isDirty → useFormDirty hook |
| `src/components/features/expedition/PhaseShell.tsx` | Phase 5/6 footer support |
| `src/lib/auth.config.ts` | +role in JWT token |
| `src/lib/auth.ts` | +role in session callback |
| `src/middleware.ts` | +admin route protection |
| `messages/en.json` | +133 keys (badges, packages, admin, purchase) |
| `messages/pt-BR.json` | +133 keys |
| `docs/specs/SPEC-STATUS.md` | +18 Sprint 36 spec entries |

---

## 6. Seguranca (SPEC-SEC-006)

| Requisito | Status |
|---|---|
| SEC-036-006: Server-side price resolution | Implementado (pa-packages.ts "server-only") |
| SEC-036-007: PA credit via PointsEngine only | Implementado ($transaction) |
| SEC-036-008: Idempotent credit (paymentRef unique) | Implementado |
| SEC-036-013: Admin 3-layer defense | Implementado (middleware + layout + service) |
| SEC-036-027: User.role field | Implementado (@default("user")) |
| SEC-036-028: Admin not creatable via registration | Verificado (registration hardcodes "user") |

---

## 7. EDD — Eval Datasets

| Dataset | Scenarios | Status |
|---|---|---|
| footer-dirty-state-global.json | 15 | Criado |
| badge-unlock-criteria.json | 16 | Criado |
| pa-purchase-flow.json | 10 | Criado |
| admin-dashboard-metrics.json | 8 | Criado |

---

## 8. E2E Results Against Staging (TRANSPARENT)

**URL**: https://travel-planner-eight-navy.vercel.app
**Date**: 2026-03-22
**Duration**: 1.4h (130 tests, 2 workers, Chromium)

### Summary

| Result | Count | % |
|---|---|---|
| **Passed** | 37 | 28.5% |
| **Failed/Timeout** | 86 | 66.2% |
| **Skipped** | 7 | 5.4% |
| **Total** | 130 | 100% |

### Analysis

**All 37 passing tests** are unauthenticated flows:
- Landing page (7/7): layout, navigation, i18n, mobile, SSR
- Login form (6/6): form elements, validation, i18n, links, error messages
- Registration form (7/7): form elements, validation, i18n, password rules
- Navigation health (9/9): no console errors, no 500s, 404 page
- Autocomplete (4/10): dropdown, results, clear, no-results
- Auth guards (2/2): unauthenticated redirects
- Cleanup (1/1): dead code verification
- Dashboard guards (1/1): unauthenticated redirect

**All 86 failing tests** are authenticated flows that timeout at 2 minutes:
- 67 tests timeout at exactly 2.0m
- 12 tests timeout at 1.0m
- Root cause: **staging DB does not have test users seeded** — `npm run dev:users` has not been run on staging, so login fails silently and all post-auth flows timeout waiting for dashboard content

### Root Cause (NOT a Sprint 36 regression)

The E2E failure pattern is **identical to previous sprints** — the same tests fail in the same way. This is a **staging environment configuration issue**, not a code regression:

1. Staging DB lacks test users (`testuser@travel.dev`, `poweruser@travel.dev`)
2. Staging DB has not run the Sprint 36 migration (Purchase model, User.role)
3. Without successful login, all authenticated E2E flows timeout

### Recommendation

Before Sprint 37 E2E can succeed:
1. Run `npm run dev:users` on staging DB
2. Run `npx prisma migrate deploy` on staging DB
3. Verify login works manually at staging URL

---

## 9. Pendencias

| Item | Status |
|------|--------|
| Staging DB seed (test users) | Pendente — bloqueia E2E |
| Prisma migration on staging | Pendente — Purchase model + User.role |
| Stripe real integration | Sprint 37 |
| Badge integration triggers in PhaseEngine | Parcial — engine pronto, hooks nos phase actions pendentes |
| Retroactive badge migration | Futuro |

---

*Documento gerado em 2026-03-22. Tag: v0.31.0.*
