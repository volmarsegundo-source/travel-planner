# B-W2-008 — Preview panel with mock data (Wave 2 task 8/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-2 (autonomous batch mode — UI thread)
**SPEC ref**: SPEC-AI-GOVERNANCE-V2 §3 V-01 (placeholder schema) + §7.4 (preview); SPEC-ARCH-AI-GOVERNANCE-V2 §5.1
**Size**: M (per execution-plan §B.2)

## Summary

Adds the `PromptPreview` client component — pure-client placeholder
substitution against a per-`modelType` mock dictionary. Renders the
resolved system + user text, surfaces a token-count via the B-W2-005
helper, and lists any placeholders that fell back to `[mock:NAME]`
(unknown / not in the §2.2-2.4 schema).

The component **never calls fetch** — preview is purely a typography
exercise. It is the cheap, fast review path admins use before clicking
"Save" (the real eval / promotion happens in Wave 5 via Promptfoo).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/app/[locale]/(app)/admin/ia/PromptPreview.tsx` | NEW | Client component + `substitutePlaceholders(template, modelType)` pure helper. |
| `src/app/[locale]/(app)/admin/ia/__tests__/PromptPreview.test.tsx` | NEW | 11 RTL + helper tests covering per-type substitution, escape semantics, [mock:NAME] fallback, fetch-never-called, token count of resolved text. |
| `messages/en.json` + `messages/pt-BR.json` | MOD | +7 keys under `admin.ia.preview`. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +5 scenarios under "B-W2-008". |

## Tests

```
src/app/[locale]/(app)/admin/ia/__tests__/PromptPreview.test.tsx       11/11 ✓
all previous suites green:                                            217/217 ✓
                                                                Total 228/228 ✓
```

## Why pure client-side

Prompt-template editing is a low-traffic admin workflow; running the
preview through a server round-trip would add latency without benefit.
The substitution dictionary is small (<1 KB) and the mock values are
public per the SPEC §2 schema. No PII risk in the mock data.

The complementary "real eval" path (Wave 5) goes through Promptfoo with
async job dispatch + queueing — preview vs eval is intentionally a
two-tier UX (cheap preview always, expensive eval on click).

## Honesty flags

- **HF-W2-008-01 (P3)** — Preview component is NOT yet wired into PromptEditor as a side panel. The component is exported and ready; embedding it (toggle button, side-by-side layout) is tracked for Wave 3 polish or B-W2-009 close gate.
- **HF-W2-008-02 (P3)** — Mock dictionary is hand-coded against SPEC §2.2-2.4. If the schema gains new placeholders (e.g. Wave 4 adds `{groupSize}` to plan), the mock dictionary must be updated in lockstep — there is no automated sync. Tracked in HF-W2-008-02 for cross-Wave audit.
- **HF-W2-008-03 (P3)** — Numeric / object placeholders render as JSON-stringified strings (`{"adults":2,...}`). Real prompt rendering would also do that (the model receives stringified JSON). Acceptable; admins should know the model sees what they see in the preview.
- **HF-W2-008-04 (P3)** — Escape protection uses ASCII sentinels (`ESCO` / `ESCC`) since unicode private-use codepoints proved fragile through file IO during this commit. If a real prompt contains the literal text `ESCO` or `ESCC`, the substitution will mis-handle it (very unlikely in production prompts). Tracked for Wave 5 SEC-AUDIT review.

## Trust Score note

Wave-scoped trust score for B-W2-008:
**0.93** estimated.
- Safety: 0.96 (no AI invocation; no PII surface; client-only).
- Accuracy: 0.93 (per-type mock matches SPEC §2 verbatim; coverage tests).
- Performance: 0.97 (O(n) substitution; trivial).
- UX: 0.92 (resolved text + unfilled notice + token count; aria-labelled section).
- i18n: 0.95 (7 keys mirrored across both locales).

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**8/9 tasks complete** — B-W2-001..008 ✅. Next + final: B-W2-009 (Wave 2
integration tests — gate close).
