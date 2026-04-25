# security-specialist — Sprint 46 Batch Review

**Date:** 2026-04-25
**Mode:** Independent input (no cross-reading until synthesis).
**Scope:** 12 commits from `ce223f4` through `bfa2643`. Security lens (auth, RBAC, audit, secrets, threat surface).

## §1 — Scope reviewed

Security-relevant surfaces touched in the batch:

- **Env schema** (`src/lib/env.ts`): two new optional vars (`AI_GOVERNANCE_V2`, `GEMINI_TIMEOUT_MS`, `CLAUDE_TIMEOUT_MS`). Provider timeout vars have hard min/max clamps in resolvers.
- **AI providers** (`gemini.provider.ts`, `claude.provider.ts`): timeout configurability; security caveat from ADR-0036 §3.2 enforced.
- **Prisma schema**: 5 new models + 7 new fields. New FKs to `users.id` (cascade or SetNull rules per SPEC).
- **Audit log service** (`audit-log.service.ts`): append-only surface enforced at service shape.
- **RBAC helper** (`rbac.ts`): new role tier system (admin / admin-ai / admin-ai-approver).
- **Middleware** (`middleware.ts`): path-aware RBAC for `/admin/ia`.
- **Admin layout** (`admin/layout.tsx`): defense-in-depth path-aware RBAC.
- **Admin page** (`admin/ia/page.tsx`): server-side flag + RBAC gating.
- **Health endpoint** (`health/ai-config/route.ts`): public, read-only.

## §2 — Strengths observed

1. **Two-tier RBAC actually constrains blast radius.** `admin-ai` can read+edit but cannot promote prompts to production (SPEC §7.7). Compromised `admin-ai` credentials cannot push poisoned prompts live without a separate `admin-ai-approver` action. This is a real security benefit, not theater.

2. **Audit log immutability enforced at the service layer.** `AuditLogService` exposes only `append`. No `update` / `delete` / `clear` methods. A future code review miss can't accidentally introduce mutability — the service shape is the contract. SPEC §4.6's no-`updatedAt` invariant is reflected at three levels (schema, service, ADR).

3. **Cascade rules on `audit_logs.actor`** correctly model LGPD intent (per SPEC §4.6). When a user is deleted, their audit trail goes too. Alternative `SetNull` would have left orphaned audit rows linked to a deleted-user identifier — worse for compliance.

4. **No PII columns introduced in V2 schema.** Prompt content (`systemPrompt`, `userTemplate`) is the closest thing, and SPEC §7.4 calls out the `[REDACTED — see PromptVersion ${id}]` rule for log diffs. The `AuditLogService` JSDoc explicitly delegates redaction to caller — so the service can't silently leak; it forces callers to think.

5. **ADR-0036's clamp [5000ms, 55000ms] on env-driven timeouts** prevents both DoS-by-too-low (constant retry storms) and resource-exhaustion-by-too-high (Vercel-Hobby breach). Resolver enforces clamp + warn-log on invalid values — graceful, not silent. Caveat from §3.2 "MUST be implemented" is satisfied.

6. **`/admin/ia` page does server-side flag check (`notFound()` when OFF)**, not client-side. A user with `admin-ai` role hitting the route while flag is OFF gets a 404, not a "feature unavailable" client-rendered banner that could leak the route's existence.

## §3 — Concerns identified

### P1 — High concern

- **None.** No security-class issues that block Wave 1 close. Items below are P2/P3.

### P2 — Medium concern

- **API routes `/api/admin/ai/*` are NOT gated by middleware** (line 40 of `middleware.ts` returns early for `/api/*`). Wave 2+ API handlers MUST call `hasAiGovernanceAccess` / `hasAiGovernanceApproverAccess` themselves. Documented in `rbac.ts` JSDoc and B-W1-005 release notes. Risk: if a Wave 2 handler ships without calling the helper, the route is unprotected. **Mitigation needed**: a lint/codegen pattern or a per-handler test convention. Without one, this is a known foot-gun for Wave 2.

- **Missing `x-pathname` header falls back to admin-only check** (B-W1-008 test #11). For an `admin-ai` user, this means: if the middleware ever fails to set `x-pathname` (Edge cold-start race? upstream config change?), the layout silently denies them access to `/admin/ia`. Better than silently allowing — but the failure mode is invisible. Suggest a warn log when `x-pathname` is unexpectedly null.

- **No automated test for the Auth.js `auth()` HOF wrapping behavior on the middleware.** B-W1-008 tests the layout (defense-in-depth proxy) but a malicious middleware change couldn't be detected by the layout test alone. Tech-lead's recommendation B47-MW-PURE-FN closes this.

### P3 — Low concern / observation

- **Health endpoint is public.** Per SPEC §5.6 — "endpoint público (sem auth)". Returns provider + modelId per phase. This is **partial information disclosure** (reveals which AI provider+model the platform uses) but is intended for ops monitoring and matches industry norms (e.g. /health endpoints commonly leak version info). Accept.

- **C-01 fix relaxes a CI assertion.** The fix is correct — test was wrong about CI environment. But the new test passes when `configureEnv()` returns `false` (any boolean). A future regression where `configureEnv` always returns `false` would not be caught. Not a security issue per se; flagged as test-quality concern.

- **Two cost models.** Not a security concern. Mentioning only because the heuristic could in theory mislead admin users about real cost — but admins aren't targets here, and the planned S47 transparency tile addresses it.

## §4 — Honesty flags consumed

| Origin | Flag | Security-lens assessment |
|---|---|---|
| `ce223f4` | ADR-0036 implementation deltas vs SPEC §5.1 (resolver location, log event name, Claude model param) | All three deltas are security-equivalent (clamp still enforced, log event still emitted). Acceptable. |
| `1c021db` | Middleware integration test deferred | ✅ Closed by `bfa2643` via layout-proxy. Acceptable for now (defense-in-depth still works). |
| `f188686` | `HARDCODED_FALLBACK` duplicates seed defaults | Not a security concern (no secrets). Tech-debt only. |
| `04d8d8e` | AdminNav not extended | Not a security concern (RBAC at layout + middleware). |

No security-relevant flags left open.

## §5 — Trust Score lens (Safety dimension + threat surface)

- **Safety: 0.99.** Earned by: two-tier RBAC, append-only audit log, schema cascade rules per LGPD, env clamps with graceful fallback, server-side flag gating. The 0.01 deduction stems from §3 P2 items (API handler RBAC not enforced at middleware; missing-`x-pathname` failure mode invisible).

- **Threat surface change**: net **smaller**, despite adding ~880 LOC. Why: every new surface (admin/ia route, RBAC helper, audit log service) is gated and append-only. The old admin/ai-governance V1 surface remains unchanged. Net new exploitable surface ≈ 0 until V2 flag is flipped to ON in production — and at that point, RBAC requires roles that don't exist in the production DB today.

## §6 — Recommendations for Sprint 47 backlog

| ID | Recommendation | Severity / Effort |
|---|---|---|
| B47-API-RBAC-CONVENTION | Establish + enforce a per-API-handler RBAC test convention (or a lint rule) so Wave 2 handlers can't ship without calling `hasAiGovernanceAccess`. **Critical** for Wave 2 safety. | 4-6h |
| B47-XPATH-WARN | Add a warn log when middleware fails to set `x-pathname` (visibility for an invisible failure mode). | 30min |
| B47-MW-PURE-FN | (Echoed from tech-lead + architect) Pure-function extraction of middleware decision → unit-testable from middleware itself. Closes the Auth-HOF-wrap test gap. | 2-3h |
| B47-SEC-AUDIT-WAVE1 | Run SPEC-SEC-AUDIT-001 walk on the Wave 1 surfaces specifically (RBAC helper, audit log service, admin layout, page). Even though Wave 1 looks clean, the methodology should be applied. | 4-6h |

## §7 — Review-specific honesty flags

- **I did not run penetration tests, fuzzing, or any active security probing.** This is a code review, not a security audit. SPEC-SEC-AUDIT-001 (Sprint 47) is the active probing pass.
- **The threat model assumes role assignment is operationally sound.** No role-assignment UI exists today; roles are added via direct DB edits. If an attacker compromises the DB, they can self-assign `admin-ai-approver`. The audit log would still record their actions (auditor cannot fully self-cover-tracks), but RBAC alone doesn't defeat a DB compromise. Out of scope for this batch but worth noting.
- **I am the same orchestrator who wrote the commits.** Same caveat as the other reviewers.
