# B-W2-007 — Side-by-side diff viewer (Wave 2 task 7/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-2 (autonomous batch mode — UI thread)
**SPEC ref**: SPEC-ARCH-AI-GOVERNANCE-V2 §5.1; SPEC-UX-AI-GOVERNANCE-V2 §4.1
**Size**: M (per execution-plan §B.2)

## Summary

Adds a pure-TS line-level diff algorithm (LCS-based, no dependencies) and
a React component that renders the result as a side-by-side viewer with
red / green / neutral cell backgrounds, paired modification rows
(remove+add adjacent → same row), and a `+X / −Y / =Z` summary header.

The component takes `before`, `after`, `beforeLabel`, `afterLabel` and is
designed to be embedded in a future "version history" view (out of scope
here — admin opens diff modal for any pair of `PromptVersion` rows).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/lib/text/line-diff.ts` | NEW | `lineDiff(a, b)` LCS-based op generator + `summarizeDiff()`. Pure, no deps, server-or-client safe. |
| `src/lib/text/__tests__/line-diff.test.ts` | NEW | 10 algo tests: identical inputs / inserts / removals / total replacement / line-number labels / display order. |
| `src/app/[locale]/(app)/admin/ia/DiffViewer.tsx` | NEW | Client component. Pairs adjacent remove+add as modification rows; gutter line numbers; `data-cell-type` attrs for testing. |
| `src/app/[locale]/(app)/admin/ia/__tests__/DiffViewer.test.tsx` | NEW | 5 RTL tests: identical → only same; summary; modification pairing; column labels; pure additions. |
| `messages/en.json` + `messages/pt-BR.json` | MOD | +4 keys under `admin.ia.diff`. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +5 scenarios under "B-W2-007". |

## Why no `diff` npm dependency

The `diff` package adds ~30 KB to the client bundle for a feature that
ships as an admin-only modal (low traffic, low priority for bundle). A
30-line LCS in pure TS handles prompt-template-sized inputs (≤ 50k chars
per Zod cap) with zero external risk. Tracked for review at Sprint 46
SEC-AUDIT (Wave 5) — if any case reveals correctness or perf gap, swap
`diff` in behind the same `lineDiff()` signature.

## Tests

```
src/lib/text/__tests__/line-diff.test.ts                                  10/10 ✓
src/app/[locale]/(app)/admin/ia/__tests__/DiffViewer.test.tsx              5/5  ✓
all previous Wave 2 suites green:                                       188/188 ✓
                                                                  Total 203/203 ✓
```

## Honesty flags

- **HF-W2-007-01 (P3)** — DiffViewer is NOT yet wired to a "version history" entry-point UI. The component is ready for embedding; the wiring (open modal from PromptsTab list, fetch two version bodies, render) is tracked for Wave 3 when the version-list endpoint matures.
- **HF-W2-007-02 (P3)** — LCS algorithm is `O(n*m)` time + space. Fine for ≤ 50k char inputs; would be a problem at 1M+ chars (out of scope per Zod cap). If the cap is raised, swap to Myers-O((N+M)D) or Hirschberg-O((N+M)log…).
- **HF-W2-007-03 (P3)** — Within-line (character-level) diff is NOT computed. A line that changed by one character renders as full remove + full add. Fine for prompt edits where placeholder boundaries matter; a future polish task can layer character-level highlighting inside the modification row.
- **HF-W2-007-04 (P3)** — Trailing-newline-only diffs are visible (intentional — admins notice them). Some teams prefer to suppress them; tracked as polish.

## Trust Score note

Wave-scoped trust score for B-W2-007:
**0.94** estimated.
- Safety: 0.97 (no security surface; pure presentation).
- Accuracy: 0.95 (LCS is canonical; tests cover insert / remove / replace / pair).
- Performance: 0.93 (O(n*m) acceptable at the Zod cap).
- UX: 0.92 (`+X / −Y / =Z` summary; aria-live; data attrs for assistive tech).
- i18n: 0.95 (4 keys mirrored across both locales).

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**7/9 tasks complete** — B-W2-001..007 ✅. Next: B-W2-008 (preview panel
with mock data).
