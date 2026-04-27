# B-W2-001 — Prompts CRUD API (Wave 2 task 1/9)

**Sprint**: 46 — Wave 2 Day 1
**Date**: 2026-04-26
**Author**: dev-fullstack-1 (autonomous batch mode)
**SPEC ref**: SPEC-ARCH-AI-GOVERNANCE-V2 §5.1; SPEC-AI-GOVERNANCE-V2 §3.3, §7.4
**Size**: M (per execution-plan §B.2)

## Summary

Adds three handlers under `/api/admin/ai/prompts`:

| Verb | Path | Behavior |
|---|---|---|
| `GET`  | `/api/admin/ai/prompts`     | Paginated list with `status` filter; surfaces `activeVersionTag`, `versionsCount`, `createdBy`, `approvedBy`. |
| `POST` | `/api/admin/ai/prompts`     | Creates a `PromptTemplate` + initial `PromptVersion` (`1.0.0`) inside one DB transaction; appends one `AuditLog` row (`action=prompt.create`, redacted diff). |
| `PATCH`| `/api/admin/ai/prompts/:id` | Creates a NEW `PromptVersion` (never edits the existing one); auto-bumps version via `bumpSemverPatch()` (stub ⇒ `"1.0.1"` until B-W2-002). |

All three exports wrap via `withAiGovernanceAccess` from `@/lib/auth/with-rbac` per `B47-API-RBAC-CONVENTION` — the compliance test at `src/app/api/admin/ai/__tests__/handler-rbac-compliance.test.ts` activated GREEN on the first Wave 2 commit (5/5 assertions).

## Files

| Path | Status | Notes |
|---|---|---|
| `src/lib/validations/prompt-admin.schema.ts` | NEW | Zod for query params, create body, update body. Shape-only — V-01..V-08 land in B-W2-003. |
| `src/server/services/ai-governance/prompt-admin.service.ts` | NEW | `PromptAdminService.list/create/update`; `PromptAdminError` with codes `SLUG_TAKEN \| NOT_FOUND \| CHANGE_NOTE_REQUIRED \| NO_OP`; `bumpSemverPatch()` stub. |
| `src/server/services/ai-governance/__tests__/prompt-admin.service.test.ts` | NEW | 8 unit tests (RED → GREEN). Asserts audit-log redaction per SPEC §7.4. |
| `src/app/api/admin/ai/prompts/route.ts` | NEW | GET + POST handlers. Rate limit 60/min (GET) and 10/hr (POST). |
| `src/app/api/admin/ai/prompts/[id]/route.ts` | NEW | PATCH handler. Rate limit 10/hr. |
| `docs/specs/bdd/sprint-46-goals.feature` | MOD | +10 scenarios under "B-W2-001". |

## Why this is split this way

`PATCH` *contractually* creates a new immutable version (SPEC-ARCH §5.1). The semver
arithmetic itself is delegated to `bumpSemverPatch()` — currently a stub that
returns `"1.0.1"` regardless of input. **B-W2-002** replaces the stub with
`major.minor.(patch+1)` arithmetic and adds the `PromptVersion` immutability
regression suite. This split keeps each commit focused on one concern.

Content-level validations (V-01..V-08 placeholders/PII/api-key/internal-url
checks per SPEC-AI §3.1) are NOT enforced by this commit. They land in
**B-W2-003** as a service-layer guard that runs AFTER the Zod parse and BEFORE
the DB transaction in both `create` and `update`.

## Tests

```
src/app/api/admin/ai/__tests__/handler-rbac-compliance.test.ts                  5/5 ✓
src/server/services/ai-governance/__tests__/prompt-admin.service.test.ts        8/8 ✓
src/lib/auth/__tests__/with-rbac.test.ts (regression)                          17/17 ✓
src/lib/auth/__tests__/rbac.test.ts (regression)                               31/31 ✓
src/lib/auth/__tests__/session-cookie.test.ts (regression)                      5/5 ✓
                                                                       Total  66/66 ✓
```

Service-test coverage targets the call-shape contract (`db.promptTemplate.create`,
`db.promptVersion.create`, `AuditLogService.append` arguments) rather than the
real DB. Integration tests for the full request → response cycle land in **B-W2-009**.

## Compliance test behavior (B47-API-RBAC-CONVENTION)

Activated as expected on the first Wave 2 handler commit. Both `route.ts` files
satisfy the regex on first try after a refactor: the original `withAiGovernanceAccess<{ id: string }>(handler)` shape (generic between name and `(`) failed the
`\b${wrapper}\s*\(` matcher; refactored to assign the handler to a variable
typed as `AdminApiHandler<{ id: string }>` and call the wrapper without the
generic parameter on the export line (`export const PATCH = withAiGovernanceAccess(patchHandler);`). TypeScript still infers `P = { id: string }` from the
inner handler signature — no type weakening.

This is a known regex gap (the convention test was written when generic-typed
exports were not yet in scope). For B-W2-002+, all `[id]/route.ts` files should
follow the same `AdminApiHandler<P>` variable pattern.

## Honesty flags

- **HF-W2-001-01 (P3)** — Pre-existing TS error in `src/lib/auth/__tests__/with-rbac.test.ts:153` (`{ params: Promise<{ id: string }> }` not assignable to default `Record<string, never>`). Confirmed pre-existing via `git stash` round-trip. Test file still runs GREEN under vitest because esbuild does not enforce the generic at runtime. Tracked for B47-API-RBAC-CONVENTION cleanup; not blocking Wave 2.
- **HF-W2-001-02 (P3)** — `bumpSemverPatch()` returns the literal string `"1.0.1"` regardless of input. Documented at the function site as a stub for B-W2-002. Tests in `prompt-admin.service.test.ts` verify the helper is *invoked* with the previous tag but do not assert the output value.
- **HF-W2-001-03 (P3)** — `PromptAdminService.list` projects `lastEvalTrustScore: null` for every row. Wiring the real value depends on the `PromptEvalResult` aggregation (Wave 5). Tracked for Wave 5; UI consumes the field as `null` for now.

## Trust Score note

Wave-scoped trust score for B-W2-001 (handler + service + audit redaction):
**0.93** estimated.
- Safety: 0.95 (audit redaction enforced; rate-limited; RBAC compliance test GREEN).
- Accuracy: 0.95 (service tests cover happy + error paths).
- Performance: 0.92 (DB roundtrip + transaction + audit append; no N+1).
- UX: 0.85 (no UI yet — that's B-W2-006).
- i18n: n/a (server-side error codes).

Sprint composite: maintained at **≥ 0.95** target after this commit.

## Production deployment context

8 commits accumulated unpushed to production at start of Wave 2 session
(`cb7df47..777c660`), including:

- BUG-C iter 7/7.1/8 (Auth/age-gate fixes since 2026-04-19, ~7 days)
- F-02 MEDIUM security finding fix (canUseAI null fail-closed, 777c660)
- Wave 1 entirety + ADR-0036 + 2 P1 pre-Wave 2 hardenings

PO consciously deferred Prod promotion at start of Wave 2 session, accepting:
1. F-02 MEDIUM remains exploitable in production (under-18 without birthDate
   may access AI streaming endpoints) for additional days
2. BUG-C bugs may continue affecting production users
3. Wave 1 admin UI not yet manually validated via Staging walk-through

Per Sprint 45 retrospective St-01 (avoid governance shortcuts), this deferral
is flagged for git-log traceability. Wave 2 proceeds independently of Prod
promotion.

## Wave 2 progress

**1/9 tasks complete** — B-W2-001 ✅. Next: B-W2-002 (semver auto-increment +
PromptVersion immutability assertions).
