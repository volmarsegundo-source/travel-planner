-- ─── SPRINT 44: Phase Reorder (Option D — in-place big-bang) ─────────────────
-- Reorder expedition phases so AI dependency chain is coherent:
--   1 Inspiration → 2 Profile → 3 Guide → 4 Itinerary → 5 Logistics → 6 Checklist
-- Old → New mapping: 1→1, 2→2, 3→6, 4→5, 5→3, 6→4
--
-- PRECONDITIONS (operator must verify before running):
--   1. DB snapshot (pg_dump) taken and stored in backup bucket.
--   2. App in maintenance/read-only mode (banner active).
--   3. pre-migration-audit.sql reviewed; incoherent trips triaged by PO.
--   4. PHASE_REORDER_ENABLED env var is OFF in all app instances.
--
-- IDEMPOTENCY: This script is NOT idempotent. Running it twice double-swaps.
-- It is protected by the _phase_reorder_migration audit table (see step 0).
--
-- ROLLBACK: No SQL rollback path. Use the pre-migration DB snapshot.
-- Feature flag OFF + snapshot restore is the disaster-recovery path.
--
-- LOCK BEHAVIOR: UPDATE takes ROW EXCLUSIVE locks on affected rows.
-- Keep app in read-only mode for 30-60s during execution.
--
-- Spec ref: SPEC-ARCH-REORDER-PHASES §5.5
-- Spec ref: SPEC-ARCH-REORDER-PHASES §5.2 (pivot strategy)

BEGIN;

-- ── Step 0: Idempotency guard ──────────────────────────────────────────────────
-- Create audit table on first run; abort if migration was already applied.
CREATE TABLE IF NOT EXISTS _phase_reorder_migration (
  id          SERIAL PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by  TEXT,
  note        TEXT
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _phase_reorder_migration LIMIT 1) THEN
    RAISE EXCEPTION
      'Phase reorder migration has already been applied (% rows in _phase_reorder_migration). Aborting.',
      (SELECT COUNT(*) FROM _phase_reorder_migration);
  END IF;
END;
$$;

-- ── Step 1: Remap expedition_phases.phaseNumber via negative pivot ─────────────
-- Because (tripId, phaseNumber) is UNIQUE, we must avoid collisions.
-- Pivot: move old 3 and 4 to negative (-3, -4); free slots 3 and 4.
UPDATE expedition_phases
SET "phaseNumber" = -"phaseNumber"
WHERE "phaseNumber" IN (3, 4);
-- After: rows at -3 (old Checklist) and -4 (old Logistics). Slots 3,4 free.

-- Write incoming: old 5 (Guide) → new 3; old 6 (Itinerary) → new 4.
UPDATE expedition_phases
SET "phaseNumber" = CASE "phaseNumber"
  WHEN 5 THEN 3   -- old Guide      → new Phase 3
  WHEN 6 THEN 4   -- old Itinerary  → new Phase 4
  ELSE "phaseNumber"
END
WHERE "phaseNumber" IN (5, 6);
-- After: slots 5 and 6 are free.

-- Resolve negatives: old -3 (Checklist) → new 6; old -4 (Logistics) → new 5.
UPDATE expedition_phases
SET "phaseNumber" = CASE "phaseNumber"
  WHEN -3 THEN 6  -- old Checklist  → new Phase 6
  WHEN -4 THEN 5  -- old Logistics  → new Phase 5
  ELSE "phaseNumber"
END
WHERE "phaseNumber" IN (-3, -4);

-- ── Step 2: Remap phase_checklist_items.phaseNumber ───────────────────────────
-- Checklist items were in old phase 3; they belong to new phase 6.
-- No pivot needed — only one source value (old 3 is now gone from expedition_phases).
UPDATE phase_checklist_items
SET "phaseNumber" = 6
WHERE "phaseNumber" = 3;

-- ── Step 3: Remap trips.currentPhase via the same negative pivot ───────────────
UPDATE trips
SET "currentPhase" = -"currentPhase"
WHERE "currentPhase" IN (3, 4);

UPDATE trips
SET "currentPhase" = CASE "currentPhase"
  WHEN 5 THEN 3
  WHEN 6 THEN 4
  ELSE "currentPhase"
END
WHERE "currentPhase" IN (5, 6);

UPDATE trips
SET "currentPhase" = CASE "currentPhase"
  WHEN -3 THEN 6
  WHEN -4 THEN 5
  ELSE "currentPhase"
END
WHERE "currentPhase" IN (-3, -4);

-- ── Step 4: Re-coherence pass ─────────────────────────────────────────────────
-- For trips whose new currentPhase points at a LOCKED phase (because a
-- downstream phase was completed before its upstream dependency), pull
-- currentPhase back to the lowest non-completed phase.
UPDATE trips t
SET "currentPhase" = COALESCE(
  (
    SELECT MIN(ep."phaseNumber")
    FROM expedition_phases ep
    WHERE ep."tripId" = t.id AND ep."status" != 'completed'
  ),
  1
)
WHERE t.id IN (
  SELECT ep."tripId"
  FROM expedition_phases ep
  WHERE ep."status" = 'locked'
    AND ep."phaseNumber" < (
      SELECT MAX(ep2."phaseNumber")
      FROM expedition_phases ep2
      WHERE ep2."tripId" = ep."tripId" AND ep2."status" = 'completed'
    )
);

-- ── Step 5: Re-activate phases that point at the new currentPhase ─────────────
-- Set status = 'active' for phases that should be active under the new layout
-- but were still 'locked' (e.g., new Phase 3 Guide was 'locked' under old layout
-- because it was old Phase 5 and user was at old Phase 4).
UPDATE expedition_phases ep
SET "status" = 'active'
FROM trips t
WHERE ep."tripId" = t.id
  AND ep."phaseNumber" = t."currentPhase"
  AND ep."status" = 'locked';

-- ── Step 6: Record migration in audit table ────────────────────────────────────
INSERT INTO _phase_reorder_migration (applied_by, note)
VALUES (
  current_user,
  'Sprint 44 phase reorder: 1→1, 2→2, 3→6, 4→5, 5→3, 6→4. Spec: SPEC-ARCH-REORDER-PHASES'
);

COMMIT;
