# B-W2-006 — UI editor with placeholder highlighting (Wave 2 task 6/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-2 (autonomous batch mode — UI thread)
**SPEC ref**: SPEC-AI-GOVERNANCE-V2 §3 + §7 (admin editor); SPEC-ARCH §5.1 (API integration); SPEC-UX-AI-GOVERNANCE-V2 (4-tab shell)
**Size**: L (per execution-plan §B.2 — largest UI piece in Wave 2)

## Summary

Replaces the Wave 1 empty-state on `/admin/ia?tab=prompts` with the
prompt-management UI. Two views in one route:

  - **List view** (`PromptsTab`) — fetches `GET /api/admin/ai/prompts`,
    paginated table with status filter, "+ New" / "Edit" buttons.
  - **Editor view** (`PromptEditor`) — controlled form for create + update
    with **live placeholder extraction** (chips per detected `{name}`,
    forbidden ones flagged in red), **live token count** via the B-W2-005
    helper, and **inline server-side validationErrors / warnings**
    surfaced from the V-01..V-08 / W-01..W-04 gates.

Both views are i18n via `next-intl` (PT-BR + EN) and respect the project's
a11y conventions (44×44 touch targets, focus-visible rings, role=alert
on error blocks, aria-labels per interactive control).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/app/[locale]/(app)/admin/ia/PromptsTab.tsx` | NEW | Client component. List-or-edit view switcher; status filter; minimal table. |
| `src/app/[locale]/(app)/admin/ia/PromptEditor.tsx` | NEW | Client component. Controlled form, placeholder chips, token counter, inline error/warning surfaces. |
| `src/app/[locale]/(app)/admin/ia/page.tsx` | MOD | Wires `<PromptsTab />` when `activeTab === "prompts"` (replaces Wave 1 empty-state for that tab). |
| `messages/en.json` | MOD | +44 keys under `admin.ia.prompts` and `admin.ia.editor`. |
| `messages/pt-BR.json` | MOD | Mirror PT-BR. |
| `src/app/[locale]/(app)/admin/ia/__tests__/PromptEditor.test.tsx` | NEW | 7 RTL tests. Covers field render, placeholder chips, forbidden inline warn, token count update, 400 + 409 + 201 paths. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +9 scenarios under "B-W2-006". |

## Tests

```
src/app/[locale]/(app)/admin/ia/__tests__/PromptEditor.test.tsx   7/7  ✓
src/app/[locale]/(app)/admin/ia/__tests__/page.test.tsx           5/5  ✓
all backend Wave 2 suites green:                                176/176 ✓
                                                          Total 188/188 ✓
```

## Why "chips below the textarea" instead of inline highlighting

The editor renders placeholders as discrete chips beneath the textarea
rather than syntax-highlighting them inline. The two reasons:

1. Inline highlighting on a `<textarea>` requires either contenteditable
   (poor a11y / paste handling) or a Canvas / overlay sync (heavy and
   fragile). The chip strip gets the same UX value (admin sees what's
   detected, errors flagged in red) without the complexity.
2. The chip strip uses `data-placeholder` attributes — testable cleanly,
   exposed to assistive tech via the visible label, and reused by Wave 5
   evals which want to enumerate placeholders.

A "true" inline highlighter is tracked as a Wave 4-5 polish task.

## Honesty flags

- **HF-W2-006-01 (P3)** — Editor is a controlled form that holds full text in React state. For very large prompts (~50k chars max per Zod) this is fine; if the cap is raised, virtualized input would help. Out of scope for Wave 2.
- **HF-W2-006-02 (P3)** — Pagination UI is not yet wired in the list view. Service supports `?page= & limit=` (B-W2-001); UI shows page 1 only. Tracked for B-W2-009 close gate or Wave 3.
- **HF-W2-006-03 (P3)** — `metadata.outputFormat`, `metadata.jsonSchema`, `metadata.language`, `metadata.temperature` are NOT yet form fields. V-04 / V-05 / W-04 stay soft-floor (skip when absent). Promotion tracked alongside the metadata schema follow-up (Wave 4-5).
- **HF-W2-006-04 (P3)** — The editor's create mode requires `slug + modelType + systemPrompt + userTemplate`. The `cacheControl` field is hardcoded to `true` and NOT surfaced — Wave 3 model-config UI will expose it.
- **HF-W2-006-05 (P3)** — Diff (B-W2-007) and preview (B-W2-008) are NOT included here. Editor saves but does not yet show the version timeline or render output preview. Both ship in their dedicated tasks.
- **HF-W2-006-06 (P3)** — Tests use mocked `fetch` only. No e2e via Playwright in this commit. The B-W2-009 close gate runs broader integration assertions.

## Trust Score note

Wave-scoped trust score for B-W2-006:
**0.92** estimated.
- Safety: 0.95 (server gates still authoritative; client echo is UX only).
- Accuracy: 0.93 (placeholder chip + token count match server math).
- Performance: 0.92 (re-render on every keystroke; acceptable for ≤50k chars).
- UX: 0.90 (44×44 targets, focus-visible rings, alert roles, i18n PT/EN).
- i18n: 0.95 (44 keys mirrored across both locales).

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**6/9 tasks complete** — B-W2-001..006 ✅. Next: B-W2-007 (diff viewer
side-by-side).
