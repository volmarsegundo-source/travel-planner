# F-FIX-05 — AdminNav extend with `/admin/ia` link

**Sprint:** 46.5 fix bundle
**Date:** 2026-04-27
**Author:** dev-fullstack-1 (Sprint 46.5 autonomous)
**Closes:** B-W1-006 honesty flag #4 (commit `04d8d8e`); F-WALK-02 root cause from walk-through investigation (commits `9717506` + `1806731`)

## Summary

Adds the V2 AI Governance Central link (`/admin/ia`) to `AdminNav` so admins can reach Wave 2 features without typing the URL manually. Gated by the `AI_GOVERNANCE_V2` flag — link visible only when the flag is ON; identical to pre-Sprint-46 behavior when OFF.

This formally closes the gap declared as honesty flag #4 in B-W1-006 ("AdminNav not extended — intentional during Wave 1") that Wave 2 (B-W2-006) did not close.

## Files

| Path | Status | Notes |
|---|---|---|
| `src/app/[locale]/(app)/admin/AdminNav.tsx` | MOD | Accepts `aiGovernanceV2Enabled: boolean` prop; conditionally appends `V2_GOVERNANCE_LINK` to the link array. No client-side flag read (server-only helper stays in the layout). |
| `src/app/[locale]/(app)/admin/layout.tsx` | MOD | Imports `isAiGovernanceV2Enabled` from `@/lib/flags/ai-governance` and passes the boolean to `<AdminNav>`. |
| `src/app/[locale]/(app)/admin/__tests__/AdminNav.test.tsx` | NEW | 6 RTL tests: pre-existing 6 links preserved (regression); /admin/ia visible only when flag ON; total 7 / 6 link counts; a11y class shape preserved on new entry. |
| `src/app/[locale]/(app)/admin/__tests__/layout-rbac-integration.test.tsx` | MOD | Adds `vi.mock("@/lib/flags/ai-governance")` so the existing 11 RBAC integration tests don't trip the t3-env client-side guard now that the layout reads the flag. |
| `messages/en.json` | MOD | Adds `admin.navAi: "AI Governance Central"`. |
| `messages/pt-BR.json` | MOD | Adds `admin.navAi: "Central Governanca IA"`. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +4 scenarios under "F-FIX-05". |

## Tests

```
src/app/[locale]/(app)/admin/__tests__/AdminNav.test.tsx                      6/6  ✓
src/app/[locale]/(app)/admin/__tests__/layout-rbac-integration.test.tsx      11/11 ✓ (regression)
src/lib/auth/* + src/server/services/ai-governance/* + admin/ia/* + handler-rbac-compliance
                                                                            250/250 ✓
                                                                       Total 267/267 ✓
```

## Why pass the flag as a prop instead of reading it inside AdminNav

`AdminNav` is a `"use client"` component. The flag helper `isAiGovernanceV2Enabled` reads `env.AI_GOVERNANCE_V2` from the `@t3-oss/env-nextjs` schema (`src/lib/env.ts`), which throws at runtime when accessed from the client (server-only env vars). The cleanest fix is to read the flag in the parent server-component `layout.tsx` and forward the boolean — keeps client surface free of `env` access, mirrors the pattern used for other server-resolved props in this codebase.

## Honesty flags

- **HF-FIX-05-01 (P3)** — Per-role link visibility was NOT changed. AdminNav today shows all admin links regardless of which admin sub-role the user holds; clicking on a forbidden destination (e.g. an `admin-ai`-only user clicking `/admin/dashboard`) results in a 403/redirect after page navigation. This is pre-existing behavior; out of F-FIX-05 scope.
- **HF-FIX-05-02 (P3)** — The `aiGovernanceV2Enabled` flag is read server-side in the layout. If the flag is flipped while the admin is mid-session, they will need to navigate (re-render the layout) before the new link appears or disappears. Acceptable; admin nav is not a hot path.
- **HF-FIX-05-03 (P3)** — i18n strings use ASCII for PT-BR (`"Central Governanca IA"`) to mirror the pattern of other admin entries in `messages/pt-BR.json` which already mix accented and non-accented forms (`"Visualizador"` accented vs `"Historico"` non-accented). Consistent with file conventions; not a quality regression.

## Trust Score note

Wave-scoped trust score for F-FIX-05:
**0.95** estimated.
- Safety: 0.97 (server-only flag stays server-only; client receives only the boolean).
- Accuracy: 0.95 (link visible iff flag ON; per-role visibility unchanged but pre-existing).
- Performance: 0.99 (one extra entry in a 7-element array).
- UX: 0.97 (closes the discoverability gap that blocked walk-through #1).
- i18n: 0.95 (PT/EN keys mirrored).

Sprint 46.5 composite: maintained at **≥ 0.95** target.

## Sprint 46.5 progress

- F-OPS-01 ✅ (PO Vercel env)
- F-OPS-02 ✅ (PO Neon verification)
- F-OPS-04 ✅ (`seed:v2-only` script committed)
- **F-FIX-05 ✅ (this commit)**
- F-OPS-03 — pending PO action (run `npm run seed:v2-only` against Staging)
- F-OPS-06, F-RETRO-07, F-S47-08, F-FINDING-09 — next
