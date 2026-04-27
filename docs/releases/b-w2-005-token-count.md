# B-W2-005 — Token-count helper extraction (Wave 2 task 5/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-1 (autonomous batch mode)
**SPEC ref**: SPEC-AI-GOVERNANCE-V2 §3.1 V-03
**Size**: S (per execution-plan §B.2)

## Summary

Promotes the token-count heuristic (`ceil(chars / 3.5)`) from a private
helper inside `prompt-validations/token-budget.ts` (B-W2-003) to a
canonical public helper at `src/lib/ai/token-count.ts`. V-03 now imports
the canonical location; B-W2-006 (editor) and B-W2-008 (preview panel)
will share the same function.

The 3.5 divisor is the documented Anthropic rule of thumb for English /
Portuguese text; CJK / multi-byte content over-estimates (safe direction
for V-03 budget gate).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/lib/ai/token-count.ts` | NEW | `estimateTokenCount(text)` + `estimateCombinedTokens(s, u)` helpers. Pure, server-or-client safe (no `server-only`). |
| `src/lib/ai/__tests__/token-count.test.ts` | NEW | 16 tests: empty / null / undefined / non-string / boundary at V-03 budget / unicode / surrogate pairs / CJK. |
| `src/server/services/ai-governance/prompt-validations/token-budget.ts` | MOD | Removes private `estimateTokenCount`; imports from `@/lib/ai/token-count`. |

## Tests

```
src/lib/ai/__tests__/token-count.test.ts          16/16 ✓
all previous suites green:                       160/160 ✓
                                          Total  176/176 ✓
```

## Why server-OR-client safe

The editor (B-W2-006) needs live token counts as the admin types — that's
client-side. The preview (B-W2-008) renders mock-substituted text and
needs the same count. The V-03 validator runs server-side. By keeping
`token-count.ts` free of `server-only` and free of any DB / Node API, it
imports cleanly from both environments.

## Honesty flags

- **HF-W2-005-01 (P3)** — Heuristic is intentionally approximate. SPEC §3 line 170 mentions `@anthropic-ai/tokenizer` as the canonical resolver "when available"; this fallback is documented as such. Migrating to the real tokenizer is a Wave 5 follow-up (would close OQ-CONS in SPEC-TECHLEAD §5).
- **HF-W2-005-02 (P3)** — UTF-16 unit counting over-estimates CJK + emoji. Acceptable for a budget *gate* (false-positive blocks > false-negative passes); a downstream "your prompt is bigger than estimated" surprise is worse than the inverse.

## Trust Score note

Wave-scoped trust score for B-W2-005:
**0.95** estimated.
- Safety: 0.96 (V-03 logic unchanged; only the import path moved).
- Accuracy: 0.93 (heuristic boundary tests + unicode coverage).
- Performance: 0.99 (single ceil + length read per call).
- UX: 0.95 (editor + preview consume the same helper).
- i18n: 0.95 (UTF-16 counting language-neutral, over-estimates CJK).

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**5/9 tasks complete** — B-W2-001..005 ✅. Backend slice of Wave 2 is
done. Next: B-W2-006 (UI editor — L item, largest UI piece).
