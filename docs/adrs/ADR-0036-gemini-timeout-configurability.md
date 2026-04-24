# ADR-0036: Gemini AI Provider Timeout — Configurability Bridge

## Status

**Accepted** — 2026-04-24 Sprint 46 Day 1 (see §Sign-off for PO approval mode note)

**Supersedes:** none (amends ADR-028 with configurability mechanism; value unchanged)
**Superseded by:** none
**Related:** ADR-028 (AI Timeout Strategy for Vercel Hobby), ADR-031 (Gemini primary + Anthropic fallback), SPEC-ARCH-AI-GOVERNANCE-V2 (Wave 3 `AiConfigResolver`), RISK-ASSESSMENT-EDGE-RUNTIME

**Driver:** tech-lead (author), architect (design co-owner)
**Deciders:** tech-lead, architect, devops-engineer, security-specialist, finops-engineer
**Final approver:** product-owner (Volmar)
**Date:** 2026-04-24 (Sprint 46 Day 1, C-04)

---

## Context

### Current state (verified 2026-04-24)

| Thing | Value / location |
|---|---|
| `GEMINI_TIMEOUT_MS` | `30_000` (30s) — **hardcoded** at `src/server/services/providers/gemini.provider.ts:17` |
| `CLAUDE_TIMEOUT_MS` | `20_000` (20s) — hardcoded in `src/server/services/providers/claude.provider.ts` |
| Route `maxDuration` | `60` on `/api/ai/plan/stream` and `/api/ai/guide/stream` (both `runtime = "nodejs"`) |
| Fallback | `FallbackProvider` wrapping Gemini + Anthropic (`ai.service.ts:356-393`), gated via `AI_FALLBACK_PROVIDER` env |
| Hosting tier | Vercel Hobby (60s serverless cap — observed in routes) |
| Source-of-truth SPEC | **ADR-028** (2026-04-09, Accepted) set the current values with explicit rationale: 30s Gemini + 30s Vercel margin = 60s budget |

### Why a new ADR now

Sprint 46 execution plan §4 gated B-W2-001 (V2 Wave 2 API endpoints) on C-04's publication. V2 Wave 3 (`AiConfigResolver`) will land the DB-driven per-type timeout in Sprint 47. Two questions are open in the 6-week window between now and that Wave 3 landing:

1. **Should the timeout stay hardcoded through Sprint 46?** If so, any operational incident requiring a timeout tweak forces a redeploy.
2. **Should an env-var override bridge be added?** Adds a single line of change today, gives ops flexibility, and defines a well-typed contract that Wave 3's `AiConfigResolver` can continue to honor as a fallback when the DB is unavailable.

The Sprint 45 retrospective item `Stop St-05` ("deferring CI/infra fixes that fail silently") argues against leaving implicit operational levers disabled.

### Prior risk assessment (2026-04-10, 4 days after ADR-028)

`docs/RISK-ASSESSMENT-EDGE-RUNTIME.md` evaluated Edge migration as an alternative path and **recommended against it**, preferring plan A (Phase 5 streaming — ✅ done) + plan B (Anthropic fallback — ✅ done) + plan D (Vercel Pro upgrade — **pending FinOps call**). This ADR is consistent with that team recommendation: no Edge migration, no timeout value change, just a configurability bridge.

---

## 1. Matrix — options × 5 dimensions

### 1.1 Options

| ID | Option | Summary |
|---|---|---|
| **O1** | Status quo (no change) | Keep `GEMINI_TIMEOUT_MS = 30_000` hardcoded. Wait for V2 Wave 3 DB config in S47. |
| **O2** | Env-override bridge | Read `process.env.GEMINI_TIMEOUT_MS` in the module, default `30_000`. Same for `CLAUDE_TIMEOUT_MS`. No DB change. |
| **O3** | Skip bridge; wait for V2 Wave 3 | Same as O1 effectively, but with explicit documentation that timeout belongs in `AiConfigResolver` (S47). |
| **O4** | Upgrade to Vercel Pro ($20/mo) and raise timeout | Change `maxDuration = 300`, bump `GEMINI_TIMEOUT_MS` to 60-90s. FinOps-gated. Separate from env-override axis. |

### 1.2 Tech dimension (tech-lead)

| Dim | O1 | O2 | O3 | O4 |
|---|---|---|---|---|
| Edge vs Node runtime impact | None | None | None | None (routes stay Node) |
| Auth.js v5-beta + Next.js 15 compat | ✅ | ✅ | ✅ | ✅ |
| Retry strategy interaction | Unchanged; FallbackProvider uses its own timeout | Unchanged | Unchanged | Unchanged; larger budget per retry |
| Propagation to AI Gateway + Prompt Registry | None (both S47 scope) | None in S46; Wave 3 reads env as fallback-when-DB-unavailable | None | None |
| Implementation cost | 0h | ~1h (module const → `parseInt(process.env... ?? 30000)`) + unit test | 0h | 0h code + tier change + validation |

### 1.3 Architectural dimension (architect)

| Dim | O1 | O2 | O3 | O4 |
|---|---|---|---|---|
| Coherence with SPEC-TECHLEAD-V2 Waves 1-3 | Neutral; no V2 impact | ✅ Env becomes the **HARDCODED_DEFAULTS** fallback that SPEC-ARCH §6.2 prescribes when DB is unavailable | Neutral | Orthogonal |
| `AiConfigResolver` shape (Wave 3) | Unchanged: resolver reads DB → fallback hardcoded | Unchanged: resolver reads DB → fallback env → fallback hardcoded (3 tiers, cleanly layered) | Unchanged | Unchanged |
| Timeout static vs dynamic | Static | Per-deploy dynamic (env) | Static | Static |
| Per-prompt / per-user-tier future | Blocked until Wave 3 | Blocked until Wave 3 | Blocked until Wave 3 | Blocked until Wave 3 |
| Schema migration required | No | No | No | No |

**Architect note**: O2 is the cleanest layering — it makes explicit the 3-tier resolution (DB → env → hardcoded) that SPEC-ARCH §6.2 already implies for Wave 3.

### 1.4 Infrastructure dimension (devops)

| Dim | O1 | O2 | O3 | O4 |
|---|---|---|---|---|
| Vercel function limit compatibility | ✅ 30s < 60s cap | ✅ Sane bounds enforced in code (reject > 55s) | ✅ | ✅ New cap 300s; requires Pro tier |
| Deploy mechanism | Hardcoded (requires PR+deploy for changes) | Env var change in Vercel dashboard = zero-redeploy change | Hardcoded | N/A — tier change, not timeout change |
| Rollback (if timeout proves wrong) | Revert commit + redeploy (~15-30 min) | Flip env var (~5 min) | Revert + redeploy | Revert tier change OR flip env var in combo with O2 |

### 1.5 Security dimension (security)

| Dim | O1 | O2 | O3 | O4 |
|---|---|---|---|---|
| Accidental DoS (short timeout → complex prompts fail) | Low — fallback catches it | Low — same fallback + ops can widen within minutes | Low | Lower — budget wider |
| Resource exhaustion (long timeout under load) | Low — rate-limit already gates | Low — env hard-cap at 55s enforced in code | Low | **Medium** — 300s budget is 5× the cap; rate-limit must tighten |
| User-tier differentiation vector | No (static) | No (env is system-wide) | No | No |
| Timeout log PII exposure | None (timeout logs carry AbortError + modelId only; no prompt content) | None | None | None |

**Security note**: O2 is the only option that gives ops the ability to **tighten** the timeout without deploy — useful if a security incident requires immediate budget contraction. O4 increases exposure surface (5× budget) without adding controls.

### 1.6 FinOps dimension (finops)

| Dim | O1 | O2 | O3 | O4 |
|---|---|---|---|---|
| Cost/request (Gemini 2.0 Flash) | ~$0.00479 per 3-phase expedition (ADR-031 cost table) | Same | Same | Same |
| Retry amplification (short timeout → more retries → more cost) | Baseline | Tunable in minutes | Baseline | Lower retry rate (larger budget absorbs spikes) |
| Vercel compute time billed | Baseline (60s cap) | Baseline | Baseline | **$20/mo Pro tier + longer fn exec = +$5-15/mo estimated** |
| Projected monthly impact at current volume | $0 | $0 code cost; ops time ~0.5h/mo review | $0 | **+$25-35/mo** |
| Beta-scale projection (10× traffic) | Retry rate could hurt; no lever to tune | ✅ Env lever to tune | Same as O1 | Best absorbs spikes |

**FinOps note**: O4 is a tier decision that belongs in a separate ADR (or a line item on the pre-Beta FinOps envelope). C-04 does NOT decide O4; it only notes the interaction.

---

## 2. Recommendation (tech-lead)

**Recommended: Option O2 — Env-override bridge.**

### 2.1 Why

1. **Preserves ADR-028's value (30s).** Production telemetry (referenced in `gemini.provider.ts:14-16` comment) confirms Gemini typically returns in 17-19s; 30s has working headroom. Changing the value would require fresh data, which we don't have.
2. **Unlocks operational response without deploy.** If Gemini latency drifts upward (API change, model update, regional issue), ops can adjust via Vercel dashboard env var in < 5 min instead of a full PR+CI+deploy cycle (~15-30 min). This is the fastest lever available without Vercel Pro.
3. **Formalises the 3-tier resolution** that SPEC-ARCH-AI-GOVERNANCE-V2 §6.2 prescribes for Wave 3 fallback (DB → env → hardcoded). When Wave 3 lands in S47, the env tier already exists — `AiConfigResolver` just consumes it as the middle fallback.
4. **Zero schema impact on V2 Waves 1-2.** `PromptVersion` model stays unchanged. B-W2-001 API endpoints stay unchanged. No Wave 2 rework risk — addresses PO's original concern for prioritising C-04.
5. **Cost: 1h dev + 1h test + 30 min code review**. Smallest intervention that provides the flexibility.

### 2.2 Trade-offs accepted

- **No runtime dynamic reconfiguration** — env changes require a dyno restart (Vercel redeploys on env var change automatically; observable as a ~30s propagation). This is acceptable because it's still 10-30× faster than a code deploy.
- **Env var precedence**: if `process.env.GEMINI_TIMEOUT_MS` is set to an invalid value (not a positive integer), code **must** fall back to the hardcoded 30_000 and log a warning. This is a new failure mode but bounded.
- **Value bounds**: code should reject `GEMINI_TIMEOUT_MS` ≥ 55_000 (Vercel Hobby margin protection) and ≤ 5_000 (floor to avoid killing successful slow responses). Hard-coded clamps.
- **Deferred**: per-type (plan / guide / checklist) timeout remains pinned to the same value until Wave 3. Reasonable — ADR-028 already treated them uniformly.

### 2.3 Review conditions

Revisit this ADR if any of the following fires:

- **R-01** Production volume exceeds **10 k requests/day** (SPEC-TECHLEAD V2 R-01 threshold for polling-DB-as-gargalo).
- **R-02** Gemini SDK **major version change** (e.g. v2 → v3) — API shape / timeout semantics may shift.
- **R-03** V2 Wave 3 ships (Sprint 47) — `AiConfigResolver` absorbs timeout as DB-driven; re-review the env tier's role as middle fallback.
- **R-04** FinOps decides on Vercel Pro upgrade — `maxDuration=300` allows significantly wider timeout budgets and this ADR must be updated.
- **R-05** Sentry (once wired via SPEC-OBSERVABILITY-SENTRY-001, B46-06) reports a **> 3% timeout rate** over any 24 h window — indicates current value is wrong for real traffic.

---

## 3. Cross-validation sign-offs

### 3.1 DevOps review

**Concerns considered**:
- Is env var change deployable without surprises? ✅ Vercel env var change triggers automatic redeploy; propagation ~30s. Documented.
- Is rollback clear? ✅ Flip env var back (or delete) → auto-redeploy → hardcoded fallback applies.
- Does O2 interact with existing deploy pipeline? ✅ `.env.example` gets a new commented line; `env.ts` Zod schema adds optional `GEMINI_TIMEOUT_MS` (coerced number, default undefined).

**Verdict**: **APPROVED** — devops-engineer (2026-04-24, Sprint 46 Day 1).

### 3.2 Security review

**Concerns considered**:
- Any vector the 5-dim matrix missed? Re-check: env var is system-wide; cannot be set per-user → no user-tier abuse. Hard-coded bounds (5s ≤ value ≤ 55s) prevent ops-side mistakes that would be security-adjacent.
- Logging: the env value itself is safe to log on startup (no secret); timeout-breach logs stay PII-free (the current `mapError` path already only surfaces AbortError + status, no prompt).
- The 3-tier resolution (DB → env → hardcoded) becomes a target for tampering only if DB is compromised (high bar) OR env exposure (same controls as AUTH_SECRET).

**Verdict**: **APPROVED-WITH-CAVEATS** — security-specialist (architect stand-in, 2026-04-24).
**Caveat**: implementation MUST include the 5s ≤ value ≤ 55s clamp. If the clamp is ever bypassed, this ADR is violated and a new review is required.

### 3.3 FinOps review

**Concerns considered**:
- Cost estimate sensitivity — the proposed change is $0/mo in code cost. Retry rate amplification is bounded by FallbackProvider's own single-retry-to-Anthropic contract (`ai.service.ts:356-393`), so worst-case is 2× calls on timeout edge, not unbounded.
- Sensitivity to volume — at 10× Beta volume, env tuning is the right escape hatch before tier upgrade.
- Does O2 block or accelerate O4 (Vercel Pro)? O2 is orthogonal; if O4 happens later, O2's env tier just allows wider values (up to the new cap).

**Verdict**: **APPROVED** — finops-engineer (2026-04-24).
**Note**: tier-upgrade decision (O4) deferred to a separate FinOps review tied to pre-Beta projections.

---

## 4. V2 Waves 1-3 impact analysis

| Wave | Item | Impact | Files | Action |
|---|---|---|---|---|
| Wave 1 | B-W1-002 migration (5 new Prisma models) | **None** — `AiRuntimeConfig` model remains per SPEC-ARCH §5.1. No timeout field added in Wave 1 scope (was always Wave 3). | `prisma/schema.prisma` Wave 1 migration | No change. |
| Wave 1 | B-W1-003 seed `AiRuntimeConfig` defaults | **None** — seed inserts existing defaults (kill-switches, cache TTL). Timeout not seeded in Wave 1. | `prisma/seed/ai-governance.ts` (per SPEC-ARCH §5.3.1) | No change. |
| Wave 2 | B-W2-001 Prompt CRUD API | **None** — `PromptVersion` schema unchanged; O2 is provider-level not prompt-level. | `/api/admin/ai/prompts` | No change. |
| Wave 2 | B-W2-003 validations V-01..V-08 | **None** — validations are content-level (PII, API key, placeholder), orthogonal to timeout. | Validators | No change. |
| Wave 3 | T-W3-* `AiConfigResolver` (S47) | **Positive** — O2's env tier becomes the middle fallback in the 3-tier resolution (DB → env → hardcoded). Simplifies implementation. | `src/server/services/ai-config-resolver.ts` (Wave 3 creates this) | **Additive** — Wave 3 implementation reads env as middle tier explicitly. ADR referenced in that file's header. |
| Wave 3 | T-W3-* `HARDCODED_DEFAULTS` (SPEC-ARCH §6.2) | **Clarified** — the env tier and hardcoded tier become distinct layers; documented here. | Same file | Reference this ADR. |

**Conclusion**: **Zero rework risk in V2 Waves 1-2.** O2 sits at the provider module level, not the data/API layer. The PO's original motivation for gating B-W2-001 on C-04 is satisfied: the selected option explicitly does not touch any Wave 1-2 schema or contract.

---

## 5. Decision

Adopt **Option O2 — Env-override bridge** with the following concrete contract:

### 5.1 Implementation contract

```ts
// src/server/services/providers/gemini.provider.ts
// Reads GEMINI_TIMEOUT_MS from env; falls back to 30_000.
// Clamps 5_000 ≤ value ≤ 55_000 (Vercel Hobby safety margin).
// Invalid values → warn + fallback.

const GEMINI_TIMEOUT_MS_DEFAULT = 30_000;
const GEMINI_TIMEOUT_MS_MIN = 5_000;
const GEMINI_TIMEOUT_MS_MAX = 55_000;

function resolveGeminiTimeoutMs(): number {
  const raw = process.env.GEMINI_TIMEOUT_MS;
  if (raw === undefined) return GEMINI_TIMEOUT_MS_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < GEMINI_TIMEOUT_MS_MIN || n > GEMINI_TIMEOUT_MS_MAX) {
    logger.warn("ai.provider.gemini.timeout.envInvalid", {
      raw,
      fallback: GEMINI_TIMEOUT_MS_DEFAULT,
    });
    return GEMINI_TIMEOUT_MS_DEFAULT;
  }
  return n;
}

const GEMINI_TIMEOUT_MS = resolveGeminiTimeoutMs();
```

Same pattern applied to `claude.provider.ts` (`CLAUDE_TIMEOUT_MS` env with 20_000 default; bounds 2_000 ≤ v ≤ 55_000).

### 5.2 Env schema

Add to `src/lib/env.ts` under server schema:

```ts
GEMINI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(55000).optional(),
CLAUDE_TIMEOUT_MS: z.coerce.number().int().min(2000).max(55000).optional(),
```

Add to `runtimeEnv` destructuring.

### 5.3 .env.example

```sh
# Optional — AI provider per-request timeout overrides (ms).
# Defaults: GEMINI 30000, CLAUDE 20000. Must satisfy provider-specific
# bounds. See docs/adrs/ADR-0036-gemini-timeout-configurability.md.
# GEMINI_TIMEOUT_MS=30000
# CLAUDE_TIMEOUT_MS=20000
```

### 5.4 Implementation scope

Implementation is **a separate commit** after this ADR is accepted. That commit:

- Modifies `gemini.provider.ts` + `claude.provider.ts` (resolver function).
- Modifies `env.ts` (Zod schema).
- Modifies `.env.example` (comment).
- Makes the RED tests in `src/server/services/providers/__tests__/gemini-timeout.test.ts` (added in this commit) GREEN.

---

## 6. Consequences

### 6.1 Positive

- **Ops flexibility restored** without Vercel Pro upgrade cost.
- **Sprint 45 retrospective Stop St-05** addressed (no more silent un-tunable infra).
- **Wave 3 simplified** — env tier is now a well-defined middle fallback.
- **Zero V2 Waves 1-2 rework**.
- **Logging clarity** when env is misconfigured (warn log, not silent fallback).

### 6.2 Negative

- **Two new env vars** (`GEMINI_TIMEOUT_MS`, `CLAUDE_TIMEOUT_MS`) — increases operational surface. Mitigated by keeping them optional with clear defaults.
- **Env-change redeploy** (Vercel auto-redeploys on env change) — still 30s+ propagation. Acceptable vs no lever at all.
- **Clamp values are somewhat arbitrary** — 5000/55000 chosen for safety. Review condition R-05 re-visits if data contradicts.

### 6.3 Neutral

- Production timeout value **unchanged at 30s**. ADR-028 stands.
- FallbackProvider behavior **unchanged** — it still retries on AbortError.

---

## 7. Alternatives Considered

### 7.1 Option O1 — Status quo (hardcoded 30s)

**Why not chosen**: leaves ops without any lever; Sprint 45 retrospective St-05 argues against.

### 7.2 Option O3 — Skip bridge, wait for V2 Wave 3 DB config

**Why not chosen**: identical effective state to O1 during S46; adds no value. V2 Wave 3 will benefit more from O2's explicit env tier than from starting with only DB-or-hardcoded.

### 7.3 Option O4 — Upgrade to Vercel Pro

**Why not chosen as part of C-04**: tier upgrade is a separate FinOps decision requiring pre-Beta traffic projections; $20/mo + ~$5-15/mo compute is a budget line item. C-04 scope is "timeout configuration mechanism", not "hosting tier". O4 can be taken in parallel; O2 remains correct regardless.

### 7.4 Option O5 (considered but not in prompt) — Per-type env vars (GEMINI_PLAN_TIMEOUT_MS etc.)

**Why not chosen**: premature. ADR-028 treats plan/guide/checklist uniformly; V2 Wave 3 will provide per-type config via DB. Adding per-type env vars now creates a messy 3-vector interim.

---

## References

- `docs/architecture.md` §ADR-028 — AI Timeout Strategy for Vercel Hobby (2026-04-09)
- `docs/architecture.md` §ADR-031 — Gemini primary + Anthropic fallback
- `docs/RISK-ASSESSMENT-EDGE-RUNTIME.md` — 2026-04-10 evaluation recommending A+B+D over Edge migration
- `docs/specs/sprint-46/SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` — Wave 3 `AiConfigResolver` scope
- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §6.2 — HARDCODED_DEFAULTS fallback pattern
- `docs/sprint-planning/sprint-46-execution-plan.md` §4 C-04 DoD
- `src/server/services/providers/gemini.provider.ts` — current implementation
- `src/server/services/providers/claude.provider.ts` — parallel timeout pattern
- `src/server/services/ai.service.ts:356-393` — FallbackProvider wiring

---

## Review Conditions (from §2.3)

Revisit this ADR if:

1. Production volume exceeds **10 k requests/day** (SPEC-TECHLEAD V2 R-01 threshold).
2. Gemini SDK **major version change**.
3. V2 Wave 3 ships (Sprint 47) — re-scope env tier's role.
4. FinOps decides on Vercel Pro upgrade — widen budgets.
5. Sentry reports **> 3% timeout rate** over any 24 h window.

---

## Sign-off

| Agent | Verdict | Signed at | Notes |
|---|---|---|---|
| tech-lead | APPROVED (author) | 2026-04-24 | Recommendation in §2 |
| architect | APPROVED | 2026-04-24 | §1.3 matrix + design cleanly layers onto SPEC-ARCH §6.2 |
| devops-engineer | APPROVED | 2026-04-24 | §3.1 — deploy + rollback paths clear |
| security-specialist (architect stand-in) | APPROVED-WITH-CAVEATS | 2026-04-24 | §3.2 — clamp MUST be implemented |
| finops-engineer | APPROVED | 2026-04-24 | §3.3 — $0 code cost; tier decision separate |
| **product-owner (Volmar)** | **APPROVED** | 2026-04-24 | **PO approval mode (transparency)**: PO approved this ADR based on the multi-agent Phase 3 sign-offs above (tech-lead + architect + devops + finops APPROVED; security APPROVED-WITH-CAVEATS requiring clamp enforcement). PO did NOT individually review the 340-line ADR document before approval. PO was alerted 3 times during the chat session about this deviation from the hybrid decision mode (read-before-approve); PO maintained the decision consciously. Per Sprint 45 retrospective Stop item St-01 (avoid governance shortcuts), this deviation is recorded here for git-log traceability. If ADR-0036 needs revisiting, the approval context is explicit. |

---

**Status promotion**: Proposed → Accepted on 2026-04-24. Implementation commit follows in same session.
