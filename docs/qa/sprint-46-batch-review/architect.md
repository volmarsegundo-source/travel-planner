# architect — Sprint 46 Batch Review

**Date:** 2026-04-25
**Mode:** Independent input (no cross-reading until synthesis).
**Scope:** 12 commits from `ce223f4` through `bfa2643`. Architectural lens.

## §1 — Scope reviewed

Same 12 commits as the tech-lead's review. Architectural focus areas:

- **System boundaries**: middleware (Edge) ↔ layout (Node) ↔ services (Node) ↔ DB.
- **V2 Wave 1 ↔ Wave 2/3 contract surface** (data model, service interfaces, configuration resolution).
- **ADR consistency** (ADR-028 superseded-by ADR-0036 chain; ADR-031 Gemini primary; SPEC-ARCH-AI-GOVERNANCE-V2 as the V2 anchor).
- **Edge runtime safety** (Auth.js v5-beta constraints from BUG-C).

## §2 — Strengths observed

1. **The 3-tier resolution layering (DB → env → hardcoded) is structurally sound and consistent.** ADR-0036's env-override bridge plugs cleanly into Wave 3's planned `AiConfigResolver`. Same model used for the V2 health endpoint's hardcoded fallback. One mental model, three implementation surfaces.

2. **PromptVersion's immutability is enforced at multiple layers.** Schema (no `updatedAt`), service (`AuditLogService.append` only — no update/delete exposed), SPEC (§4.6 explicit). Future engineers can't accidentally weaken it via routine review pass.

3. **The decision to keep `AiKillSwitch` intact (not migrate to `AiRuntimeConfig` in Wave 1)** preserves SPEC-TECHLEAD INC-09's planned migration window for Wave 3. Avoided a tempting "fix it now" detour.

4. **Edge-safe RBAC helper at `src/lib/auth/rbac.ts`.** Pure functions, no Node deps. Importable from middleware (Edge) AND layout/API handlers (Node). Same contract everywhere. This is the lesson BUG-C taught operationalized.

5. **ADR-0036's "implementation deltas vs SPEC" disclosure** in commit `ce223f4` (resolver location, log event name, Claude per-model handling) demonstrates the right discipline: when reality diverges from a SPEC, document the divergence in the implementing commit, not silently.

## §3 — Concerns identified

### P1 — High concern

- **None.** No architectural decisions in this batch are visibly wrong or undermined. The decisions that warrant follow-up (below) are P2.

### P2 — Medium concern

- **`/admin/ia` (V2) coexists with `/admin/ai-governance` (V1).** Two admin surfaces touching AI governance. PO will need to decide deprecation timing for V1 once V2 reaches feature parity (probably end of Wave 4 or Wave 5). If this drifts, admins juggle two UIs indefinitely.

- **Path-aware logic duplicated in middleware AND layout.** Tech-lead flagged this as P1 (testing); architecturally, it's a P2 because it's a known consequence of the Edge/Node split. The proposed fix (extract decision to a pure function) is the right architectural answer; the right time to do it is before Wave 3 ships its `AiConfigResolver`, since that resolver will likely want the same pattern.

- **Two cost models.** R-02-B documented this is intentional. Architecturally, the divergence is acceptable as long as future engineers know which model to consult for which question (heuristic for admin "profit" tile, per-token for FinOps tracking). The S47 transparency tile (`B47-COST-TILE`) makes the divergence visible to admins; that's the right architectural pressure to keep them aligned over time.

### P3 — Low concern / observation

- **Migration name divergence** (B-W1-002 used `20260424120000` instead of SPEC §8.1's `20260417000001`). Functionally identical; documentation explained it. This is the right kind of pragmatism — Prisma's chronological-ordering constraint trumps SPEC nicety. Don't standardize a "migration name strictly follows SPEC" rule that would have to be broken on every late-arriving SPEC.

- **i18n keys are flat per-namespace.** `admin.ia.dashboardEmptyTitle` vs nested `admin.ia.empty.dashboard.title`. Either is fine; current pattern matches the project's existing `admin.dashboard.*` shape.

- **Tab state in URL.** Architecturally lighter than client state for an admin-tool low-traffic surface. If Wave 4 adds expensive content per tab, may want to revisit.

## §4 — Honesty flags consumed

| Origin | Flag | Architecture-lens assessment |
|---|---|---|
| `f188686` | C-01 fix permissive when `.env.local` absent | Acceptable. CI hygiene fix; the broader bootstrap test surface is small. Not architectural. |
| `f188686` | `HARDCODED_FALLBACK` duplicates seed defaults | **Real architectural debt.** Two sources of truth for the same data. Should be one constants module. P2 above. |
| `04d8d8e` | AdminNav not extended with /admin/ia link | Coupling-minimization choice. Architecturally fine for Wave 1 → Wave 2 gap. |
| `bfa2643` | Layout-as-proxy for middleware test | Architectural debt. Defense-in-depth duplication is by design; the test surface duplication is a consequence. Pure-function extraction is the architectural fix. |

## §5 — Trust Score lens (Architectural fit + scalability)

- **Architectural fit: 0.97.** V2 Wave 1 commits sit cleanly inside SPEC-ARCH-AI-GOVERNANCE-V2's intended shape. No surprise abstractions, no unexplained services. ADR chain (028 → 0036) is coherent.
- **Scalability: 0.85.** Two flags concern future scale: (a) `HARDCODED_FALLBACK` divergence under SPEC change; (b) seed-not-auto-run requires a manual operations step that doesn't scale across many environments. Both are P2 follow-ups, not blockers.

## §6 — Recommendations for Sprint 47 backlog

| ID | Recommendation | Effort |
|---|---|---|
| B47-FALLBACK-CONST | Shared constants module for `HARDCODED_FALLBACK` and seed defaults (closes P2 architectural debt). | 1-2h |
| B47-MW-PURE-FN | Pure-function extraction of middleware/layout RBAC decision (architecturally sound; tech-lead also flagged). | 2-3h |
| B47-V1-V2-DEPRECATION-PLAN | Document deprecation roadmap for `/admin/ai-governance` V1 once V2 reaches feature parity. | 30min doc only |
| B47-SEED-AUTO | Decide whether to wire `npx prisma db seed` into the Vercel deploy step (today: manual). Consider risk + cost. | 1h decision + 1h impl if Yes |

## §7 — Review-specific honesty flags

- **I did not deeply read every line of the V2 SPECs.** I read the sections referenced by the commits I'm reviewing (§3, §4, §5.6, §7.7, §8). If a commit silently violates a SPEC section I didn't open, this review would miss it.
- **I am the same orchestrator who wrote the commits.** Same caveat as the tech-lead's review.
- **My §3 P1 says "None".** That could be motivated reasoning. The 4-agent synthesis should flag if other agents see P1 architecture issues I missed.
