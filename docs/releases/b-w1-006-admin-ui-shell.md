# Release Notes — B-W1-006 Admin UI Shell (Sprint 46 Day 3)

**Date:** 2026-04-25
**Item:** B-W1-006 (V2 Wave 1 task 7/8, size M)
**Spec:** SPEC-ARCH-AI-GOVERNANCE-V2 §3 Wave 1 + §7.7 RBAC
**Author:** release-manager (orchestration)

## TL;DR

V2 admin shell at `/[locale]/admin/ia` with a 4-tab skeleton (Dashboard, Prompts, Modelos, Outputs). Each tab is an empty state pointing to which Wave fills it. Gated by `AI_GOVERNANCE_V2` flag (server-side `notFound` when OFF) and by RBAC (admin | admin-ai | admin-ai-approver). Parent admin layout extended to be path-aware.

## Files

| File | Change |
|---|---|
| `src/app/[locale]/(app)/admin/layout.tsx` | Path-aware RBAC: `/admin/ia` allows `hasAiGovernanceAccess(role)`; other `/admin/*` stays admin-only. Reads `x-pathname` header (set by middleware since iter 8). |
| `src/app/[locale]/(app)/admin/ia/page.tsx` (NEW) | Server component. `notFound()` when flag OFF. Default tab `dashboard`; valid tabs from query param `?tab=`; invalid tab falls back to dashboard. |
| `src/app/[locale]/(app)/admin/ia/AdminIaTabs.tsx` (NEW) | Client component. 4 tabs as `Link`s with `?tab=` query param. ARIA `tablist` semantic, `aria-selected`, `aria-controls`. 44px min touch targets per A11y SPEC. |
| `src/app/[locale]/(app)/admin/ia/__tests__/page.test.tsx` (NEW) | 5 GREEN tests (flag OFF → notFound, default tab, valid tab, invalid fallback, all 4 tabs). |
| `messages/pt-BR.json` | +`admin.ia.*` namespace (title, subtitle, 4 empty-state title+body pairs, 4 tab labels). |
| `messages/en.json` | Same namespace, English translations. |
| `docs/qa/sprint-46-trust-score.md` | +§10. UX 0.95→0.96; composite 0.9340→0.9355. |
| `docs/releases/b-w1-006-admin-ui-shell.md` (NEW) | This file. |

## Behavior

| State | Result |
|---|---|
| `AI_GOVERNANCE_V2` unset/false + any role | 404 (`notFound`) |
| Flag ON + role=user (or unknown) | redirect → `/expeditions` (parent layout) |
| Flag ON + role=admin | shell renders, default tab = Dashboard |
| Flag ON + role=admin-ai | shell renders (path-aware RBAC) |
| Flag ON + role=admin-ai-approver | shell renders |
| Any role + `?tab=prompts` | renders Prompts empty state |
| Any role + `?tab=garbage` | falls back to Dashboard tab |

Each tab body is an empty state with a clear "ships in Wave N" message — sets honest expectations during the multi-sprint rollout.

## Tests

- 5/5 GREEN in page.test.tsx
- 12/12 GREEN in rbac.test.ts (carryover from B-W1-005; unchanged here)
- 219/219 GREEN broader regression sweep (`src/app` + `src/lib` + `src/server`)
- `tsc --noEmit` clean

## Critical-path impact

Wave 1 task 7/8 done. Only B-W1-008 (integration tests) remains to close Wave 1.

## Behavior at deploy

Default OFF (`AI_GOVERNANCE_V2` unset on Staging/Prod). The route returns 404 to all visitors. Setting the flag to `"true"` in Vercel env makes the route reachable; only users with one of the 3 AI-governance roles see the shell. No such users exist in the production DB today (per B-W1-005 release note).

## Rollback

`git revert <hash>` reverts the page, the layout extension, and the i18n keys. < 5 min.

## Honesty flags

1. **Layout RBAC change is server-side only.** No middleware re-test required (B-W1-005 already covers middleware). Layout is defense-in-depth; if path-aware logic ever drifts from middleware, the test in this commit will not catch it. B-W1-008 integration tests (next) will exercise the full chain.
2. **Tab state is in URL, not React state.** This is intentional (deep-linkable + server-rendered + cheaper than client hydration of the active tab). Trade-off: a tab change re-fetches the server component. Acceptable for an admin tool with few visitors.
3. **Empty states reference future Waves explicitly.** If Wave plan changes (e.g. Curadoria moves from Wave 4 to Wave 5), the i18n strings need updating. Cataloged for Sprint 47 follow-up if needed.
4. **AdminNav not extended.** The existing `AdminNav.tsx` does NOT yet show a link to `/admin/ia`. Users access via direct URL or future Wave 2 nav update. Intentional — keeps coupling minimal during Wave 1.

## References

- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §3 Wave 1 deliverables (4 tab shell)
- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §7.7 RBAC matrix
- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §6.2 INC-08 (4 tabs decided)
- `src/lib/auth/rbac.ts` (B-W1-005) — role helpers
- `src/lib/flags/ai-governance.ts` (B-W1-001) — flag helper
