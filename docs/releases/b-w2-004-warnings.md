# B-W2-004 — W-01..W-04 warning validations (Wave 2 task 4/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-1 (autonomous batch mode)
**SPEC ref**: SPEC-AI-GOVERNANCE-V2 §3.2 (warning validations)
**Size**: M (per execution-plan §B.2)

## Summary

Lands the four non-blocking warning checks (W-01..W-04) alongside the
B-W2-003 blocking layer. Warnings advise but DO NOT prevent save — the
service returns them as `warnings: ValidationFailure[]` on the create /
update result, and the route handlers pass that array through to the
admin (UI consumes them in B-W2-006).

Mapping to SPEC §3.2:

  W-01  Unknown optional placeholders (not listed in §2.2-2.4 schema)
  W-02  No explicit output-format instruction in either field
  W-03  No language directive in the systemPrompt section
  W-04  Temperature > 1.0 on a deterministic prompt (guide/checklist)

W-04 is metadata-driven (skipped when `metadata.temperature` is absent or
when modelType is `plan`).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/server/services/ai-governance/prompt-validations/warnings.ts` | NEW | 4 W-XX functions + `validateWarnings()` orchestrator. |
| `src/server/services/ai-governance/prompt-validations/__tests__/warnings.test.ts` | NEW | 26 unit tests (≥3 pass + ≥3 fail per W-XX where applicable). |
| `src/server/services/ai-governance/prompt-validations/index.ts` | MOD | Re-exports the 4 W-XX + orchestrator. |
| `src/server/services/ai-governance/prompt-admin.service.ts` | MOD | Hooks `validateWarnings()` post-DB-write; returns `warnings` field on both create + update. `CreatePromptResult`/`UpdatePromptResult` extended. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +6 scenarios under "B-W2-004". |

## Tests

```
src/server/services/ai-governance/prompt-validations/__tests__/warnings.test.ts     26/26 ✓
src/server/services/ai-governance/prompt-validations/__tests__/validations.test.ts  55/55 ✓
src/server/services/ai-governance/__tests__/prompt-admin.service.test.ts            11/11 ✓
src/server/services/ai-governance/__tests__/semver-bump.test.ts                      6/6  ✓
src/server/services/ai-governance/__tests__/prompt-version-immutability.test.ts     57/57 ✓
src/app/api/admin/ai/__tests__/handler-rbac-compliance.test.ts                       5/5  ✓
                                                                          Total   160/160 ✓
```

## Why warnings are non-blocking

Per SPEC §3.2, W-XX rules are advisories — they encode best-practice
heuristics (output-format declaration, language directive, temperature
norms) that improve quality but should not gate admin productivity.
Production prompts with strange placeholders or ad-hoc formats may be
intentional; the admin sees the warning, decides, saves.

The existing `CreatePromptResult` / `UpdatePromptResult` test asserts
`expect(out).toMatchObject({...})` which is non-strict — adding the
`warnings` field doesn't break those assertions. Backwards-compat preserved.

## Honesty flags

- **HF-W2-004-01 (P3)** — W-04 metadata extension (`temperature` field) is not yet promoted to first-class on the Zod input schema. Same soft-floor pattern as V-04/V-05; consolidated promotion lands in Wave 4-5.
- **HF-W2-004-02 (P3)** — W-02 and W-03 use phrase-based heuristics. False negatives are possible (e.g. a prompt that uses "JSON output" without the canonical "Return JSON with fields" anchor). Acceptable trade-off — SPEC §3.2 examples are *examples*, not exhaustive.
- **HF-W2-004-03 (P3)** — W-04 uses strict `> 1.0` boundary. SPEC §3.2 says "> 1.0" verbatim; a template with `temperature=1.0` exactly does not warn even though it is the upper bound for deterministic intent.

## Trust Score note

Wave-scoped trust score for B-W2-004:
**0.93** estimated.
- Safety: 0.95 (no security-class change; warnings cannot suppress blocking errors).
- Accuracy: 0.93 (heuristic-based; some false negatives expected; 26 unit tests cover the canonical cases).
- Performance: 0.95 (4 regex passes + placeholder set diff; trivial).
- UX: 0.85 (no UI yet).
- i18n: 0.90 (PT/EN heuristics in W-02/W-03; messages PT-BR).

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**4/9 tasks complete** — B-W2-001..004 ✅. Next: B-W2-005 (token-count
helper extraction — S item).
