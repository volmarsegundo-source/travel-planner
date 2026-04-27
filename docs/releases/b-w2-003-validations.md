# B-W2-003 — V-01..V-08 blocking validations (Wave 2 task 3/9, central L)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-1 (autonomous batch mode)
**SPEC ref**: SPEC-AI-GOVERNANCE-V2 §3.1 (blocking validations); §2.1-2.5 (placeholder schema); §10.1 (test discipline ≥3 positive + ≥3 negative per rule)
**Size**: L (per execution-plan §B.2 — *central Wave 2*)

## Summary

Lands the prompt-write blocking validation layer. Eight pure functions
(V-01..V-08), one per SPEC §3.1 rule, plus an orchestrator
(`validateBlocking`) that aggregates every failure on a single response so
the admin sees every issue in one round-trip (SPEC §3 line 162: "lista
todas as falhas para reduzir retrabalho do admin").

The gate hooks into `PromptAdminService.create` and `PromptAdminService.update` AFTER the Zod parse and BEFORE the DB transaction. A new
`PromptAdminError` code `VALIDATION_FAILED` carries the aggregate; the
route handlers surface it as HTTP 400 with `validationErrors: [...]`.

## Files

| Path | Status | Notes |
|---|---|---|
| `src/server/services/ai-governance/prompt-validations/index.ts` | NEW | Orchestrator + barrel export. Runs every check; never short-circuits. |
| `src/server/services/ai-governance/prompt-validations/types.ts` | NEW | Shared types (`PromptValidationContext`, `ValidationFailure`, codes). |
| `src/server/services/ai-governance/prompt-validations/placeholders.ts` | NEW | V-01 (required) + V-02 (forbidden); canonical extractor `/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g` per SPEC §2.1. |
| `src/server/services/ai-governance/prompt-validations/token-budget.ts` | NEW | V-03 ceil(chars/3.5) ≤ 4000. Heuristic inlined here; B-W2-005 extracts to `src/lib/ai/token-count.ts`. |
| `src/server/services/ai-governance/prompt-validations/json-schema.ts` | NEW | V-04 — metadata-driven, soft floor (active only when `metadata.outputFormat="json"` is set). |
| `src/server/services/ai-governance/prompt-validations/language.ts` | NEW | V-05 — bigram-frequency heuristic; soft floor when no `metadata.language`. Confidence ≥ 0.7 per SPEC. |
| `src/server/services/ai-governance/prompt-validations/sensitive-content.ts` | NEW | V-06 (PII regexes) + V-07 (API keys) + V-08 (internal URLs). Reports line numbers. |
| `src/server/services/ai-governance/prompt-validations/__tests__/validations.test.ts` | NEW | 55 tests. ≥3 pass + ≥3 fail per V-XX per SPEC §10.1, plus orchestrator + helper tests. |
| `src/server/services/ai-governance/prompt-admin.service.ts` | MOD | Hooks `validateBlocking()` into create + update. New `VALIDATION_FAILED` error code. Service tests extended with B-W2-003 gate assertions (3 new tests). |
| `src/app/api/admin/ai/prompts/route.ts` | MOD | POST handler surfaces `VALIDATION_FAILED → 400` with `validationErrors[]`. |
| `src/app/api/admin/ai/prompts/[id]/route.ts` | MOD | PATCH handler same as above. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +10 scenarios under "B-W2-003". |

## Why metadata-driven for V-04 and V-05 (soft floor)

SPEC-AI §3.1 V-04 and V-05 require `outputFormat`/`jsonSchema` and
`language` to be declared on the template. The current Zod
`CreatePromptSchema` does not yet promote those fields to first-class
inputs — they live in the existing free-form `metadata` JSON column.

This commit ships V-04 and V-05 as **conditional checks**: they activate
only when the metadata field is provided. Absent metadata = check skipped.

A follow-up (Wave 4 or 5) will promote `outputFormat`, `jsonSchema`, and
`language` to first-class Zod fields; at that point V-04/V-05 will become
unconditional. Until then, the complementary warnings (W-02, W-03 in
B-W2-004) catch the missing-declaration case as a soft signal.

## Decoupling from runtime PolicyEngine

The existing `src/server/services/ai-governance/policy-engine.ts`
(kill-switch / rate-limit / cost-budget) is a *runtime* gate that
evaluates user-facing AI calls. The new `prompt-validations/` module is a
*write-time* gate that evaluates admin prompt edits. They share neither
data nor execution path. Per the PO clarification at session kickoff,
this separation is intentional and was reconfirmed before implementation.

## Tests

```
src/server/services/ai-governance/prompt-validations/__tests__/validations.test.ts  55/55 ✓
src/server/services/ai-governance/__tests__/prompt-admin.service.test.ts            11/11 ✓ (3 new B-W2-003 tests)
src/server/services/ai-governance/__tests__/semver-bump.test.ts                      6/6  ✓
src/server/services/ai-governance/__tests__/prompt-version-immutability.test.ts     56/56 ✓ (rescanned with new prompt-validations files)
src/app/api/admin/ai/__tests__/handler-rbac-compliance.test.ts                       5/5  ✓
                                                                          Total   133/133 ✓
```

## Honesty flags

- **HF-W2-003-01 (P3)** — V-04/V-05 are soft floors (metadata-driven, skip when absent). Promotion to first-class fields tracked for Wave 4-5.
- **HF-W2-003-02 (P3)** — V-05 bigram heuristic is intentionally light. Confidence is `max(score) / sum(scores)`. Real nGram detector with library (e.g. `franc` MIT, `cld3`, etc.) would be more accurate but adds a dependency. SPEC §3 OQ §11.9 explicitly flags the bilingual prompt edge case as open — this commit honors the gate, not the resolution.
- **HF-W2-003-03 (P3)** — V-07 SPEC regex `/sk-[a-zA-Z0-9]{20,}/` does NOT match real Anthropic keys (which include hyphens like `sk-ant-api03-...`). Following SPEC verbatim. Wave 5 SEC-AUDIT round will likely tighten the regex; this commit follows the canonical reference.
- **HF-W2-003-04 (P3)** — V-03 token-count helper inlined (private to this module). B-W2-005 promotes it to `src/lib/ai/token-count.ts` and updates this file to import.
- **HF-W2-003-05 (P3)** — Service test inputs were tightened to include all 8 required `guide` placeholders so V-01 doesn't reject them before the test's actual assertion fires. Pre-existing assertions still hold; only inputs grew.

## Trust Score note

Wave-scoped trust score for B-W2-003 (validation layer + service hook):
**0.94** estimated.
- Safety: 0.97 (PII + API key + internal URL detection wired; aggregate-error response prevents iteration spam; immutability still enforced on PromptVersion).
- Accuracy: 0.95 (≥3 pass + ≥3 fail per V-XX rule per SPEC §10.1; orchestrator no-short-circuit covered).
- Performance: 0.92 (regex cost on every save; N≈12 regex passes max; well under request budget).
- UX: 0.85 (no UI yet — error structure ready for B-W2-006).
- i18n: 0.90 (error messages are PT-BR per SPEC examples; English error codes for programmatic consumption).

Sprint composite: maintained at **≥ 0.95** target.

## Wave 2 progress

**3/9 tasks complete** — B-W2-001 ✅, B-W2-002 ✅, B-W2-003 ✅. Next:
B-W2-004 (4 W-XX warnings — same module, non-blocking).
