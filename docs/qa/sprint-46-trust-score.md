# Sprint 46 — Trust Score Tracker

**Owner:** qa-engineer
**Created:** 2026-04-24 (Sprint 46 Day 1)
**Baseline:** 0.93 composite (Sprint 45 close — see `docs/qa/bug-c-f3-iter7-trust-score.md` §7).
**Sprint 46 close target:** ≥ 0.93 composite (no regression — execution plan §7).
**Per-wave gate (V2):** ≥ 0.90 wave-scoped score before next wave starts.

---

## §1 — Day 1 entry: ADR-0036 implementation

### 1.1 Context

C-04 Gemini timeout ADR (ADR-0036) shipped Proposed (commit `f0d4805`) and was Accepted + implemented in the same Sprint 46 Day 1 turn. Implementation honors ADR §5.1 contract: `resolveGeminiTimeoutMs` exported from `gemini.provider.ts`, `resolveClaudeTimeoutMs(model)` exported from `claude.provider.ts`, env vars added to `src/lib/env.ts` Zod schema (permissive — bounds enforced in resolvers per ADR §3.2 caveat).

### 1.2 Per-dimension scoring delta

| Dimension | Sprint 45 close | Day 1 post-ADR-0036 impl | Δ | Reason |
|---|---:|---:|---:|---|
| Safety | 0.97 | **0.98** | **+0.01** | Explicit clamp [5000, 55000] enforced in resolvers; invalid env values fall back gracefully + warn-log instead of crashing app at boot. Concrete defense added for Sprint 45 retro Stop St-05 ("loud failure not silent"). |
| Accuracy | 0.95 | 0.95 | 0 | No data-pipeline change. Provider behavior preserved (default values match ADR-028). |
| Performance | 0.82 | 0.82 | 0 | Module-level constant cached at boot for hot-path; resolver invoked once per provider load, not per request. Zero overhead. |
| UX | 0.95 | 0.95 | 0 | No user-visible change. |
| i18n | 0.93 | 0.93 | 0 | No i18n surface touched. |

### 1.3 Composite

| Dim | Weight | Score | Weighted |
|---|---:|---:|---:|
| Safety | 0.30 | 0.98 | 0.294 |
| Accuracy | 0.25 | 0.95 | 0.2375 |
| Performance | 0.20 | 0.82 | 0.164 |
| UX | 0.15 | 0.95 | 0.1425 |
| i18n | 0.10 | 0.93 | 0.093 |
| **Composite** | 1.00 | | **0.9310** |

### 1.4 Decision

**Composite: 0.93 (rounded; precise 0.9310).**

- Sprint 46 close target ≥ 0.93 → **MET** ✅ on Day 1.
- Prod gate ≥ 0.92 → **CLEARED** (sprint-baseline retained).

The +0.01 Safety bump is small but real: the implementation prevents a class of boot-time crashes (invalid env value → app down) that ADR-028 left exposed.

### 1.5 Per-wave note

V2 Wave 1 + Wave 2 not yet started — wave-scoped trust scores will be computed at each wave's gate (Day 5 for Wave 1, Day 10 for Wave 2 mid-sprint, Day 13 for Wave 2 close).

---

## §2 — History (this sprint)

| Day | Event | Composite |
|---|---|---:|
| Day 0 (sprint baseline) | Sprint 45 close | 0.93 |
| Day 1 | C-04 ADR-0036 proposed (`f0d4805`) | 0.93 (no change — docs only) |
| Day 1 | ADR-0036 implementation (this commit) | **0.93** (+0.01 Safety, rounded composite same) |
| Day 2 | B-W1-001 feature flag (`AI_GOVERNANCE_V2` + helper) | **0.93** (no dimension change — pure infrastructure addition; default OFF preserves all existing behavior) |

---

## §3 — Day 2 entry: B-W1-001 feature flag

### 3.1 Context

V2 Wave 1 task B-W1-001 (size S — first dependency for B-W1-002 migration and B-W1-005 RBAC). Adds `AI_GOVERNANCE_V2` env var (strict enum `"true"|"false"`, default `"false"`) and `isAiGovernanceV2Enabled()` helper at `src/lib/flags/ai-governance.ts`. Mirrors the existing `phase-reorder.ts` pattern (single-helper, no `NEXT_PUBLIC_` exposure, server-only by env barrel boundary).

### 3.2 Per-dimension scoring delta

| Dimension | Day 1 | Day 2 | Δ | Reason |
|---|---:|---:|---:|---|
| Safety | 0.98 | 0.98 | 0 | No new attack surface; flag default OFF; strict enum crashes loud on invalid env (consistent with admin-only flag semantics, NOT graceful-fallback ADR-0036 contract — which is correct per SPEC-OPS §2.1). |
| Accuracy | 0.95 | 0.95 | 0 | Pure infrastructure; no data path change. |
| Performance | 0.82 | 0.82 | 0 | Helper is single-line `env.AI_GOVERNANCE_V2` read. Zero overhead. |
| UX | 0.95 | 0.95 | 0 | Default OFF — no UI change observable. |
| i18n | 0.93 | 0.93 | 0 | No i18n surface touched. |

### 3.3 Composite

Composite: **0.9310** (unchanged). Day 2 is a foundation layer — value emerges when downstream Wave 1 items consume the flag (B-W1-005 RBAC + B-W1-006 admin UI shell).

### 3.4 Per-wave note

V2 Wave 1 progress: 1 of 8 tasks complete (B-W1-001). Remaining: B-W1-002 (migration), B-W1-003 (seed), B-W1-004 (AuditLogService), B-W1-005 (RBAC), B-W1-006 (UI shell), B-W1-007 (health check), B-W1-008 (tests). Wave-scoped trust score will be computed at Day 5 Wave 1 gate.
