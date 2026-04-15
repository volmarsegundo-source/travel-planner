# DB Migration Scripts — Sprint 44 Phase Reorder

These standalone SQL scripts implement the **Option D in-place big-bang** migration
for the Sprint 44 phase reorder. They operate outside Prisma's migration system
because the reorder requires coordinated multi-table data remapping with negative-pivot
collision avoidance — something Prisma's `db push` / `migrate` cannot express.

## Phase Mapping (old → new)

| Old # | Old Name | New # | New Name |
|---|---|---|---|
| 1 | A Inspiração | 1 | A Inspiração (no change) |
| 2 | O Perfil | 2 | O Perfil (no change) |
| 3 | O Preparo (Checklist) | **6** | O Preparo |
| 4 | A Logística | **5** | A Logística |
| 5 | Guia do Destino | **3** | Guia do Destino |
| 6 | O Roteiro | **4** | O Roteiro |

## Files

| File | Purpose |
|---|---|
| `pre-migration-audit.sql` | Read-only diagnostic. Run in a ROLLBACK'd transaction to surface incoherent trips before migration. |
| `migrate-phase-reorder.sql` | The actual forward migration. Transactional, idempotent via `_phase_reorder_migration` audit table. |
| `reverse-phase-reorder.sql` | Emergency reversal. Use ONLY if a DB snapshot is unavailable. |

## Prerequisites (operator checklist)

Before running `migrate-phase-reorder.sql`:

- [ ] `pg_dump` of production DB taken and uploaded to backup bucket (30-day retention).
- [ ] App placed in **read-only maintenance mode** (banner active, write endpoints blocked).
- [ ] `pre-migration-audit.sql` executed and output reviewed by PO + QA.
  - Incoherent trips triaged: PO decides to accept as legacy state or reset manually.
- [ ] `PHASE_REORDER_ENABLED=off` in all app instances.
- [ ] No active AI generation jobs in flight (check queue depth).

## Execution

### Step 1 — Audit (ROLLBACK)

```bash
psql $DATABASE_URL << 'EOF'
BEGIN;
\i scripts/db/pre-migration-audit.sql
ROLLBACK;
EOF
```

Save output to `docs/runbooks/phase-reorder-audit-$(date +%Y-%m-%d).csv`.

### Step 2 — Triage

Review incoherent trips with PO. For each:
- Accept as legacy state (re-coherence pass in migration handles currentPhase).
- Or reset the offending phase to `pending` manually before migration.

### Step 3 — Forward Migration

```bash
psql $DATABASE_URL -f scripts/db/migrate-phase-reorder.sql
```

Expected runtime: < 5 seconds on Railway-class hardware.

### Step 4 — Verify

```bash
psql $DATABASE_URL -c "SELECT * FROM _phase_reorder_migration;"
psql $DATABASE_URL -c "SELECT \"phaseNumber\", COUNT(*) FROM expedition_phases GROUP BY 1 ORDER BY 1;"
psql $DATABASE_URL -c "SELECT \"currentPhase\", COUNT(*) FROM trips GROUP BY 1 ORDER BY 1;"
```

### Step 5 — Enable Feature Flag

Set `PHASE_REORDER_ENABLED=true` in all app instances and redeploy.

## Rollback Strategy

**Primary**: Restore the pre-migration DB snapshot (see `docs/runbooks/phase-reorder-rollback.md`).

1. Flip `PHASE_REORDER_ENABLED=off` immediately (stops new writes from using new-layout engine code).
2. If data corruption is confirmed, restore from the pg_dump snapshot.
3. The feature flag OFF ensures the restored v1 data is interpreted by v1 engine code.

**Emergency reversal** (`reverse-phase-reorder.sql`): Only if the snapshot is unavailable.
This script is NOT idempotent and does NOT cover all edge cases that the snapshot does.

## Spec References

- SPEC-ARCH-REORDER-PHASES §5 (full migration plan)
- SPEC-ARCH-REORDER-PHASES §5.2 (negative pivot strategy)
- SPEC-ARCH-REORDER-PHASES §5.3 (pre-migration audit)
- SPEC-ARCH-REORDER-PHASES §5.4 (re-coherence pass)
- SPEC-ARCH-REORDER-PHASES §5.6 (rollback strategy)
