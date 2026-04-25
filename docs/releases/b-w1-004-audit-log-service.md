# Release Notes — B-W1-004 AuditLogService (Sprint 46 Day 3)

**Date:** 2026-04-25
**Item:** B-W1-004 (V2 Wave 1 task 4/8, size M)
**Spec:** SPEC-ARCH-AI-GOVERNANCE-V2 §4.6 + §5.5
**Author:** release-manager (orchestration)

## TL;DR

`AuditLogService.append(input)` — append-only writes to `audit_logs`. Service shape enforces SPEC §4.6 immutability invariant (no `update`/`delete`/`clear` exported). Used by Wave 2+ admin actions; tables created in B-W1-002.

## Files

| File | Change |
|---|---|
| `src/server/services/audit-log.service.ts` (NEW) | `AuditLogService.append({ actorUserId, action, entityType, entityId, diffJson?, ip?, userAgent? })`. Returns the created `AuditLog` row. Errors propagate (audit failure is part of the trust boundary). |
| `src/server/services/__tests__/audit-log.service.test.ts` (NEW) | 6 GREEN tests (surface check, required fields forwarded, ip+userAgent verbatim, defaults, diffJson JSON shape, returns row). |
| `docs/specs/bdd/sprint-46-goals.feature` | +4 scenarios. |
| `docs/qa/sprint-46-trust-score.md` | +§7 Day 3 entry. |
| `docs/releases/b-w1-004-audit-log-service.md` (NEW) | This file. |

## Tests

- 6/6 GREEN in `audit-log.service.test.ts`
- `tsc --noEmit` clean
- No regression on prior commits

## Critical-path impact

Unblocks B-W2-007 (audit integration in Wave 2) and any Wave 1 admin action that needs to record events. V2 Wave 1: **4 of 8 tasks complete**.

## Behavior at deploy

Zero observable change. Service is unused until a Wave 2+ caller wires it. Tables exist (B-W1-002 schema); new rows only on actual admin action.

## Rollback

`git revert <hash>` removes the service file. Audit rows already written remain (immutable). < 5 min.

## References

- `docs/specs/sprint-46/SPEC-ARCH-AI-GOVERNANCE-V2.md` §4.6 (model) + §5.5 (read API future) + §7.4 (PII redaction caller responsibility)
- B-W1-002 commit `452ec7d` — schema/migration that created the table
