# Release Notes — B-W1-001 AI Governance V2 Feature Flag (Sprint 46 Day 2)

**Date:** 2026-04-24
**Item:** B-W1-001 (V2 Wave 1, size S — first dependency for B-W1-002, B-W1-005)
**Spec:** SPEC-OPS-AI-GOVERNANCE-V2 §2.1-2.2
**Author:** release-manager (orchestration)

---

## TL;DR

Adds the `AI_GOVERNANCE_V2` env var (strict enum `"true"|"false"`, default `"false"`) and the `isAiGovernanceV2Enabled()` helper at `src/lib/flags/ai-governance.ts`. Pure infrastructure — no behavior change at deploy. Establishes the rollback boundary for all subsequent Wave 1+ items.

## What changed

| File | Change |
|---|---|
| `src/lib/env.ts` | +`AI_GOVERNANCE_V2: z.enum(["true","false"]).default("false").transform(...)` in `server` schema; +passthrough in `runtimeEnv`. |
| `src/lib/flags/ai-governance.ts` (NEW) | Mirrors `phase-reorder.ts` pattern — single helper `isAiGovernanceV2Enabled()` returning `env.AI_GOVERNANCE_V2`. |
| `src/lib/flags/__tests__/ai-governance.test.ts` (NEW) | 4 GREEN tests: default OFF, ON when "true", re-evaluates on each call, returns boolean. |
| `docs/specs/bdd/sprint-46-goals.feature` | +5 BDD scenarios for B-W1-001 (default OFF, ON, OFF explicit, invalid value crashes at boot, server-only). |
| `docs/qa/sprint-46-trust-score.md` | +§3 Day 2 entry — composite 0.93 retained (no dimension change). |
| `docs/releases/b-w1-001-feature-flag.md` (NEW) | This file. |

## Behavior summary

| Scenario | Resolution |
|---|---|
| `AI_GOVERNANCE_V2` unset | `false` (default OFF — Wave 1+ surfaces stay hidden) |
| `AI_GOVERNANCE_V2="true"` | `true` (admin/ia tab + Wave 3 AiConfigResolver enabled) |
| `AI_GOVERNANCE_V2="false"` | `false` (explicit OFF) |
| `AI_GOVERNANCE_V2="yes"` (or any other value) | **app crashes at boot** (Zod enum strict validation) — admin misconfiguration is loud, not silent |

The strict-enum semantics differ from ADR-0036's graceful-fallback (timeouts) by design: admin-only ON/OFF flags don't have meaningful "fall back to default" semantics — wrong value = deploy-time bug, surface it loudly.

## Tests

- **4/4 GREEN** in `src/lib/flags/__tests__/ai-governance.test.ts`
- `tsc --noEmit` clean
- Pattern follows existing `src/lib/flags/phase-reorder.ts` — minimal review surface

## Deploy plan

1. Push to `origin/master`.
2. Vercel auto-deploys to Staging.
3. **Default OFF** — no env var needs to be set at deploy time.
4. To enable on Staging: set `AI_GOVERNANCE_V2=true` in Vercel Staging Environment + trigger redeploy (~30s propagation).
5. Production rollout per SPEC-OPS-V2 §2.3 — manual env var set after Wave 1 + Wave 2 ship.

## Rollback

`git revert <commit-hash>` then `git push`. Trivial — no migration, no data change. Or simply set `AI_GOVERNANCE_V2=false` (or unset) in Vercel — auto-redeploys ~30s.

## Critical-path impact

Unblocks **B-W1-002** (Prisma migration — next critical-path item) and **B-W1-005** (RBAC middleware). Both can now consume `isAiGovernanceV2Enabled()` to gate their effects.

## Follow-ups (Sprint 46 Day 3+)

Per execution plan §3 schedule, next items are:
- **Day 2-3 cont.**: B-W1-002 migration (size L, the longest-pole) + A-01 SEC-AUDIT-001 discovery
- **Day 5**: Wave 1 review + gate

## References

- `docs/specs/sprint-46/SPEC-OPS-AI-GOVERNANCE-V2.md` §2.1-2.2 (feature flag spec)
- `docs/specs/sprint-46/SPEC-OPS-AI-GOVERNANCE-V2.md` §2.3 (rollout strategy)
- `docs/specs/sprint-46/SPEC-OPS-AI-GOVERNANCE-V2.md` §2.4 (env-var-vs-flag-service tradeoff)
- `src/lib/flags/phase-reorder.ts` — pattern mirror
- `docs/sprint-planning/sprint-46-execution-plan.md` §2 Block B.1 task table
