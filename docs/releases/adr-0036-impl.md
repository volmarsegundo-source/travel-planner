# Release Notes — ADR-0036 Implementation (Sprint 46 Day 1)

**Date:** 2026-04-24
**ADR:** ADR-0036 (Proposed → Accepted in this commit)
**Sprint context:** Sprint 46 Day 1 — C-04 hard-gate item per execution plan §4.
**Author:** release-manager (orchestration)

---

## TL;DR

Adds `GEMINI_TIMEOUT_MS` and `CLAUDE_TIMEOUT_MS` env vars as an env-override bridge for AI provider timeouts. Default values (Gemini 30s; Claude 25s plan / 20s others) preserved from ADR-028. Bounds [5000ms, 55000ms] enforced in resolvers — invalid values fall back to defaults + structured warn log (no app crash). Layers cleanly as the middle tier (DB → env → hardcoded) for V2 Wave 3's `AiConfigResolver` landing in Sprint 47.

## PO approval mode (transparency)

**This release was approved by the PO based on the multi-agent Phase 3 sign-offs in the ADR proposal commit (`f0d4805`)**, NOT after individual review of the 340-line ADR document. The PO was alerted 3 times during the chat session about this deviation from the hybrid decision mode (read-before-approve) and maintained the decision consciously.

Per Sprint 45 retrospective Stop item St-01 (avoid governance shortcuts), this deviation is recorded:
- ADR §Sign-off has the explicit PO approval-mode note.
- The implementation commit message also surfaces the mode for git-log traceability.
- If ADR-0036 is ever revisited, the approval context is explicit.

The rigor in execution (5 agents consulted; matrix analysis; tests RED-then-GREEN; security caveat enforced) compensates for the PO review skip.

## What changed

| File | Change |
|---|---|
| `docs/adrs/ADR-0036-gemini-timeout-configurability.md` | Status: Proposed → Accepted. PO sign-off added with approval-mode note. |
| `docs/specs/sprint-46/SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` | §3 Wave 3 mention `AiConfigResolver` updated with ADR-0036 reference (3-tier resolution: DB → env → hardcoded). |
| `src/lib/env.ts` | `GEMINI_TIMEOUT_MS`, `CLAUDE_TIMEOUT_MS` added to Zod server schema (intentionally permissive — bounds in resolvers per security caveat) and `runtimeEnv`. |
| `src/server/services/providers/gemini.provider.ts` | Hardcoded `GEMINI_TIMEOUT_MS = 30_000` replaced with `resolveGeminiTimeoutMs()` (exported, called at module load, captured in module constant for hot-path). |
| `src/server/services/providers/claude.provider.ts` | `getClaudeTimeoutMs(model)` now delegates to new `resolveClaudeTimeoutMs(model)` (exported). Per-model deltas (plan=25s, others=20s) preserved when env is unset; env replaces both uniformly per ADR §7.4 rejecting Option O5. |
| `.env.example` | New documented `AI PROVIDER TIMEOUTS` section. |
| `docs/qa/sprint-46-trust-score.md` (NEW) | Trust Score tracker for Sprint 46. Day 1 entry: Safety +0.01 (clamp + graceful fallback), composite 0.93 retained. |
| `docs/releases/adr-0036-impl.md` (NEW) | This file. |
| `src/server/services/providers/__tests__/gemini-timeout.test.ts` | 5 ex-RED tests now GREEN (no test file change in this commit). |

## Tests

- **5/5 GREEN** in `gemini-timeout.test.ts` (default, valid env, non-numeric invalid + warn, above-max + warn, below-min + warn).
- **153/153 GREEN** in broader regression sweep across `src/server` + `src/lib`.
- `tsc --noEmit` clean.

## Behavior summary

| Scenario | Resolution |
|---|---|
| `GEMINI_TIMEOUT_MS` unset | 30000 (ADR-028 default preserved) |
| `GEMINI_TIMEOUT_MS=25000` | 25000 (within bounds → honored) |
| `GEMINI_TIMEOUT_MS=not-a-number` | 30000 + warn `ai.provider.gemini.timeout.envInvalid` |
| `GEMINI_TIMEOUT_MS=100000` (above max 55000) | 30000 + warn |
| `GEMINI_TIMEOUT_MS=1000` (below min 5000) | 30000 + warn |
| `CLAUDE_TIMEOUT_MS` unset, model=plan | 25000 (per-model default) |
| `CLAUDE_TIMEOUT_MS` unset, model≠plan | 20000 (per-model default) |
| `CLAUDE_TIMEOUT_MS=30000`, any model | 30000 (env replaces both uniformly) |
| `CLAUDE_TIMEOUT_MS=invalid`, any model | per-model default + warn |

## Deploy plan

1. Push to `origin/master`.
2. Vercel auto-deploys to Staging.
3. **No env vars need to be set at deploy time** — defaults preserve current production behavior.
4. Optional ops action: set `GEMINI_TIMEOUT_MS` or `CLAUDE_TIMEOUT_MS` in Vercel dashboard if a tweak is needed (auto-redeploy ~30s).

## Rollback

`git revert <commit-hash>` then `git push`. Restores hardcoded defaults. Trivial — no migration, no data change. < 5 min total.

## Critical-path impact

**Unblocks B-W2-001** per execution plan §4 hard gate (ADR Day 3 publication required before Wave 2 API endpoints start Day 6). Wave 2 work can proceed without rework risk because ADR-0036 sits at the provider module level — `PromptVersion` schema and Wave 2 API contracts unchanged.

## Follow-ups

- **V2 Wave 3 (Sprint 47)**: `AiConfigResolver` consumes the env tier as middle fallback (DB → env → hardcoded). Per-type DB config provides the long-term per-type lever.
- **Review condition R-05** in ADR §Review Conditions: if Sentry (B46-06) reports >3% timeout rate over 24h, revisit defaults.

## References

- `docs/adrs/ADR-0036-gemini-timeout-configurability.md` — full ADR
- `docs/architecture.md` ADR-028 — original timeout decision (2026-04-09)
- `docs/architecture.md` ADR-031 — Gemini primary + Anthropic fallback (2026-04-11)
- `docs/RISK-ASSESSMENT-EDGE-RUNTIME.md` — 2026-04-10 evaluation
- `docs/sprint-planning/sprint-46-execution-plan.md` §4 C-04 DoD
- `docs/qa/sprint-46-trust-score.md` — Day 1 entry
