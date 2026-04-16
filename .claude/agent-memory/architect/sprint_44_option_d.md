---
name: Sprint 44 Phase Reorder — Option D
description: PO-approved migration strategy for SPEC-ARCH-REORDER-PHASES (Sprint 44)
type: project
---

Sprint 44 phase reorder uses **Option D: in-place big-bang SQL remap**.

**Why:** PO decision 2026-04-15. Beta has a small dataset; a pre-migration
pg_dump + `NEXT_PUBLIC_PHASE_REORDER_ENABLED=false` fallback is simpler and safer
than carrying `phaseSchemaVersion` forever. Explicitly rejected: dual-write,
lazy migration, shadow columns, discriminator column.

**How to apply:**
- No Prisma schema change — pure data remap.
- Pivot via negative offset to avoid `(tripId, phaseNumber)` unique collisions.
- Rollback = DB snapshot restore + flag OFF (not reversible SQL).
- Feature flag is env-only boolean: `NEXT_PUBLIC_PHASE_REORDER_ENABLED` (client-exposed because it gates UI rendering paths).
- ADR-030 rewritten for Option D; ADR-031 (phaseSchemaVersion) removed.
- Analytics partition by `event.ts < DEPLOY_TS`, not by schema version column.
- PA ledger is content-based (Guide=50, Itinerary=80, Checklist=30) — no coupling to phase number.
- Badge `detalhista` tied to "Logística" phase name; rank `capitao` tied to Guide content.
- Shared AI context service: `src/server/services/expedition-ai-context.service.ts` (sole consumer of digest helpers at `src/lib/prompts/digest.ts`).

Spec status: Draft → **Approved** 2026-04-15.
